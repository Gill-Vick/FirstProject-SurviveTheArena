// =====================================
// Lancer
// =====================================

class Lancer extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.lancer.SIZE,

            speed:
                ENEMY_TYPES.lancer.SPEED *
                Game.enemySpeedMultiplier,

            hp: 1 + Math.floor((Game.wave - 1) / 3),

            color: ENEMY_TYPES.lancer.COLOR

        });

        this.type = "lancer";
        this.shieldHits = ENEMY_TYPES.lancer.SHIELD_HITS;
        this.knockbackImmune = true;

        this.thrustCooldown = 0;
        this.thrusting = false;
        this.thrustTimer = 0;
        this.thrustAngle = 0;
        this.thrustWindup = 0; 
        this.lanceExtension = 0; // Visual forward slide distance for the lance

        this.dashCharge = 0;
        this.dashing = false;
        this.dashDX = 0;
        this.dashDY = 0;
        this.dashTimer = 0;
        this.dashSpeed = ENEMY_TYPES.lancer.DASH_SPEED;
        this.dashDuration = ENEMY_TYPES.lancer.DASH_DURATION;

    }

    takeDamage(amount, crit = false) {

        if (this.shieldHits > 0) {

            this.shieldHits--;
            this.flashTimer = 5;

            if (this.shieldHits <= 0)
                this.knockbackImmune = false;

            return;

        }

        super.takeDamage(amount, crit);

    }

    move() {

        if (this.dashing) {

            this.x += this.dashDX;
            this.y += this.dashDY;
            this.dashTimer--;

            if (this.dashTimer <= 0)
                this.dashing = false;

            return;

        }

        if (this.dashCharge > 0) {

            this.dashCharge--;

            if (this.dashCharge === 0) {

                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {

                    this.dashDX = (dx / dist) * this.dashSpeed;
                    this.dashDY = (dy / dist) * this.dashSpeed;
                    this.dashing = true;
                    this.dashTimer = this.dashDuration;

                }

            }

            return;

        }

        if (this.thrusting || this.thrustWindup > 0)
            return;

        super.move();

    }

    attack() {

        if (this.thrustCooldown > 0)
            this.thrustCooldown -= 16;

        if (this.thrustWindup > 0) {
            this.thrustWindup--;
            
            if (this.thrustWindup === 0) {
                this.thrusting = true;
                this.thrustTimer = ENEMY_TYPES.lancer.THRUST_DURATION;
                this.thrustCooldown = ENEMY_TYPES.lancer.THRUST_COOLDOWN;
                
                if (this.shieldHits <= 0)
                    this.dashCharge = 15; // 0.25 second dash charge wind-up
            }
            return;
        }

        if (this.thrusting) {

            this.thrustTimer--;

            // Calculate lance slide extension (peaks halfway through animation)
            const halfDuration = ENEMY_TYPES.lancer.THRUST_DURATION / 2;
            const progress = 1 - Math.abs(this.thrustTimer - halfDuration) / halfDuration;
            this.lanceExtension = progress * 24; // Moves forward by up to 24px

            this.checkThrustHit();

            if (this.thrustTimer <= 0) {
                this.thrusting = false;
                this.lanceExtension = 0;
            }

            return;

        }

        if (this.dashing || this.dashCharge > 0)
            return;

        if (this.thrustCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > ENEMY_TYPES.lancer.THURST_RANGE)
            return;

        this.thrustAngle = Math.atan2(dy, dx);
        this.thrustWindup = 15; // 0.25 second thrust wind-up at 60fps

    }

    checkThrustHit() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > ENEMY_TYPES.lancer.THRUST_RANGE)
            return;

        const angleToPlayer = Math.atan2(dy, dx);
        let diff = Math.abs(angleToPlayer - this.thrustAngle);

        if (diff > Math.PI)
            diff = Math.PI * 2 - diff;

        if (diff < 0.45)
            player.takeHit();

    }

    checkPlayerCollision() {
        return;
    }

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // =====================================
        // Telegraph Attack Line
        // =====================================
        if (this.thrusting || this.thrustWindup > 0) {
            ctx.save();
            ctx.strokeStyle = "rgba(231, 76, 60, 0.55)";
            ctx.lineWidth = this.thrustWindup > 0 ? 2 : 5;
            ctx.setLineDash(this.thrustWindup > 0 ? [10, 5] : []); 
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(this.thrustAngle) * ENEMY_TYPES.lancer.THURST_RANGE,
                cy + Math.sin(this.thrustAngle) * ENEMY_TYPES.lancer.THURST_RANGE
            );
            ctx.stroke();
            ctx.restore();
        }

        super.draw();

        ctx.save();
        ctx.translate(cx, cy);

        const angle = (this.thrusting || this.thrustWindup > 0)
            ? this.thrustAngle
            : Math.atan2(
                player.y + player.size / 2 - cy,
                player.x + player.size / 2 - cx
            );

        ctx.rotate(angle);

        if (this.shieldHits > 0) {

            ctx.fillStyle = "#95a5a6";
            ctx.fillRect(-8, -18, 6, 36);

        }

        // Apply lanceExtension to move forward along its local X axis
        const lx = this.lanceExtension;

        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(lx, -2, ENEMY_TYPES.lancer.LANCE_LENGTH, 4);
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH, 0);
        ctx.lineTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH - 12, -5);
        ctx.lineTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH - 12, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

    }

}