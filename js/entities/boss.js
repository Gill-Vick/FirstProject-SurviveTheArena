// =====================================
// Boss Enemy
// =====================================

class Boss extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: BOSS.SIZE,
            speed: BOSS.SPEED * Game.enemySpeedMultiplier,
            hp: BOSS.BASE_HP + Game.wave * BOSS.HP_PER_WAVE,
            color: BOSS.COLOR
        });

        this.type = "boss";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.projectileRingRadius = BOSS_RING.RADIUS;
        this.attackCooldown = BOSS.ATTACK_COOLDOWN;

        // Dash Attack Setup
        this.dashCharge = 0;
        this.dashing = false;
        this.dashDX = 0;
        this.dashDY = 0;
        this.dashTimer = 0;

        // NEW CONFIGS: Tweaked to make the dash distance significantly longer!
        this.dashSpeed = 8.4;
        this.dashDuration = 57;
        // Total dash distance: 8.4 * 57 = ~480px
    }

    // =====================================
    // Attack
    // =====================================

    move() {

        // Dash movement
        if (this.dashing) {
            this.x += this.dashDX * Game.timeScale;
            this.y += this.dashDY * Game.timeScale;
            this.dashTimer -= Game.timeScale;
    
            if (this.dashTimer <= 0)
                this.dashing = false;
    
            return;
        }
    
        // Charging dash
        if (this.dashCharge > 0) {
            this.dashCharge -= Game.timeScale;
    
            if (this.dashCharge <= 0) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                // Uses synchronized dash variables
                this.dashDX = (dx / distance) * this.dashSpeed;
                this.dashDY = (dy / distance) * this.dashSpeed;
                this.dashing = true;
                this.dashTimer = this.dashDuration;
            }
            return;
        }
    
        super.move();
    }

    attack() {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= Game.timeScale;
            return;
        }

        this.fireRadialBurst();
        this.dashCharge = 64;
        this.attackCooldown = BOSS.ATTACK_COOLDOWN;
    }

    fireRadialBurst() {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;

        for (let i = 0; i < BOSS.PROJECTILE_COUNT; i++) {
            const angle = (Math.PI * 2 / BOSS.PROJECTILE_COUNT) * i;
            Game.projectiles.push(new Projectile(
                centerX,
                centerY,
                angle,
                {
                    speed: BOSS.PROJECTILE_SPEED,
                    color: BOSS.PROJECTILE_COLOR,
                    size: 8,
                    life: 171,
                    sourceType: "boss"
                }
            ));
        }
    }

    // =====================================
    // Drawing
    // =====================================

    draw() {
        super.draw();
        if (this.dashCharge > 0)
            this.drawDashIndicator();
        this.drawLabel();
    }

    drawLabel() {
        drawPixelText(
            BOSS.DISPLAY_NAME,
            this.x + this.size / 2,
            this.y - 22,
            2,
            { color: "#ff6b5a", shadow: "rgba(0, 0, 0, 0.9)" }
        );
    }

    drawDashIndicator() {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;
    
        const dx = player.x + player.size / 2 - centerX;
    
        const dy =
            player.y + player.size / 2 - centerY;
    
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        const dirX = dx / distance;
        const dirY = dy / distance;
    
        const alpha = 0.3 + Math.sin(Date.now() / 60) * 0.2;

        // The charge lane as a run of red pixel blocks from the
        // Guard to the exact end of its dash. A cached solid
        // dashed-line bitmap (dashOff: 0) rotated onto the
        // player's direction each frame, instead of a live
        // per-frame fillRect loop.
        const exactDashDistance = this.dashSpeed * this.dashDuration;
        const angle = Math.atan2(dirY, dirX);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        drawPixelDashedLine(exactDashDistance, {
            color: "#ff2020",
            alpha,
            unit: 6,
            dashOn: 1,
            dashOff: 0,
            glow: 6,
            glowColor: "#ff0000"
        });

        ctx.restore();
    }
}