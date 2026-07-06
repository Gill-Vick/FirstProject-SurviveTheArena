// =====================================
// Knight Boss (Wave 10)
// =====================================
//
// A boss-tier mirror of the player: same core kit (a sword
// swing built the same way as Player's - angle + arc +
// swing progress - and a gap-closing dash) but built to be
// relentless. It alternates between two states:
//
//   too far  -> charge in with a dash
//   in range -> wind up and swing its sword
//
// Note on naming: this.hitThisSwing is already used by the
// base Enemy class to track whether the *player's* sword
// has hit this enemy during the player's current swing (see
// Player.attackEnemies() / enemy.hitThisSwing resets). The
// Knight's own swing needs a separate flag - hence
// this.attackHitPlayer below - so the two don't stomp on
// each other.

class Knight extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: KNIGHT.SIZE,
            speed: KNIGHT.SPEED * Game.enemySpeedMultiplier,
            hp: KNIGHT.BASE_HP + Game.wave * KNIGHT.HP_PER_WAVE,
            color: KNIGHT.COLOR
        });

        this.type = "knight";
        this.isBoss = true;
        this.knockbackImmune = true;

        // Sword
        this.swordSwing = false;
        this.swordAngle = 0;
        this.swordTimer = 0;
        this.swingProgress = 0;
        this.swingCooldown = 0;
        this.attackHitPlayer = false;

        // Dash
        this.dashing = false;
        this.dashCooldown = 0;
        this.dashDX = 0;
        this.dashDY = 0;
        this.dashTimer = 0;

    }

    // =====================================
    // Movement
    // =====================================
    //
    // Rooted in place while mid-swing (bracing for the hit,
    // same as the lancer during its thrust). Dash travel is
    // handled directly here since it overrides normal chase
    // movement for its duration.

    move() {

        if (this.dashing) {

            this.x += this.dashDX * Game.timeScale;
            this.y += this.dashDY * Game.timeScale;

            this.dashTimer -= Game.timeScale;

            if (this.dashTimer <= 0)
                this.dashing = false;

            return;

        }

        if (this.swordSwing)
            return;

        super.move();

    }

    // =====================================
    // Attack State Machine
    // =====================================

    attack() {

        if (this.dashCooldown > 0)
            this.dashCooldown -= Game.dt;

        if (this.swingCooldown > 0)
            this.swingCooldown -= Game.dt;

        if (this.swordSwing) {

            this.swordTimer -= Game.timeScale;

            this.swingProgress =
                1 - (this.swordTimer / KNIGHT.SWING_DURATION);

            this.checkSwordHit();

            if (this.swordTimer <= 0)
                this.swordSwing = false;

            return;

        }

        if (this.dashing)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const dx = player.x + player.size / 2 - cx;
        const dy = player.y + player.size / 2 - cy;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        // Too far out and off cooldown -> charge in.
        if (

            this.dashCooldown <= 0 &&
            distance > KNIGHT.DASH_TRIGGER_RANGE

        ) {

            this.dashDX = (dx / distance) * KNIGHT.DASH_SPEED;
            this.dashDY = (dy / distance) * KNIGHT.DASH_SPEED;

            this.dashing = true;
            this.dashTimer = KNIGHT.DASH_DURATION;
            this.dashCooldown = KNIGHT.DASH_COOLDOWN;

            return;

        }

        // In range and off cooldown -> swing.
        if (

            this.swingCooldown <= 0 &&
            distance <= KNIGHT.SWORD_LENGTH + 40

        ) {

            this.swordAngle = Math.atan2(dy, dx);
            this.swordSwing = true;
            this.swordTimer = KNIGHT.SWING_DURATION;
            this.swingProgress = 0;
            this.attackHitPlayer = false;
            this.swingCooldown = KNIGHT.SWING_COOLDOWN;

        }

    }

    // Same rotating-arc test the player's own sword and the
    // King's greatsword both use - angleToPlayer compared
    // against the current sweep angle.

    checkSwordHit() {

        if (this.attackHitPlayer)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dx = px - cx;
        const dy = py - cy;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > KNIGHT.SWORD_LENGTH)
            return;

        const angleToPlayer = Math.atan2(dy, dx);
        const arc = KNIGHT.SWORD_ARC;

        const currentAngle =
            this.swordAngle -
            arc / 2 +
            arc * this.swingProgress;

        let diff = Math.abs(angleToPlayer - currentAngle);

        if (diff > Math.PI)
            diff = Math.PI * 2 - diff;

        if (diff < 0.5) {

            player.takeHit(ENEMY_LABELS.knight);

            this.attackHitPlayer = true;

        }

    }

    // Body contact only hurts mid-dash (the charge itself is
    // the threat) - not while it's just standing there
    // winding up or resetting, same idea as the lancer only
    // damaging via its lance rather than its body.

    checkPlayerCollision() {

        if (this.swordSwing)
            return;

        super.checkPlayerCollision();

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        super.draw();

        this.drawSword();

        this.drawLabel();

    }

    drawLabel() {

        ctx.fillStyle = KNIGHT.COLOR;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "Knight",
            this.x + this.size / 2,
            this.y - 20
        );

    }

    drawSword() {

        if (!this.swordSwing)
            return;

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        const arc = KNIGHT.SWORD_ARC;

        const currentAngle =
            this.swordAngle -
            arc / 2 +
            arc * this.swingProgress;

        ctx.rotate(currentAngle);

        ctx.shadowBlur = 12;
        ctx.shadowColor = "#7f8c8d";

        let grad = ctx.createLinearGradient(0, -6, 0, 6);
        grad.addColorStop(0, "#ecf0f1");
        grad.addColorStop(0.5, "#7f8c8d");
        grad.addColorStop(1, "#2c3e50");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.lineTo(KNIGHT.SWORD_LENGTH - 14, -3);
        ctx.lineTo(KNIGHT.SWORD_LENGTH, 0);
        ctx.lineTo(KNIGHT.SWORD_LENGTH - 14, 3);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#34495e";
        ctx.fillRect(10, -9, 6, 18);

        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, -3, 10, 6);

        ctx.restore();

    }

}