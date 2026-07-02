// =====================================
// Player Class
// =====================================

class Player {

    constructor() {

        this.x = canvas.width / 2;
        this.y = canvas.height / 2;

        this.size = PLAYER.SIZE;
        this.speed = PLAYER.SPEED;
        this.color = PLAYER.COLOR;

        // Sword

        this.swordSwing = false;
        this.swordAngle = 0;
        this.swordTimer = 0;
        this.swingProgress = 0;

        // Dash

        this.dashCooldown = 0;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.updateMovement();

        this.updateDash();

        this.updateSword();

        this.keepOnScreen();

    }

    // =====================================
    // Movement
    // =====================================

    updateMovement() {

        if (keys["w"])
            this.y -= this.speed;

        if (keys["s"])
            this.y += this.speed;

        if (keys["a"])
            this.x -= this.speed;

        if (keys["d"])
            this.x += this.speed;

    }

    keepOnScreen() {

        this.x = Math.max(
            0,
            Math.min(
                canvas.width - this.size,
                this.x
            )
        );

        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.size,
                this.y
            )
        );

    }

    // =====================================
    // Dash
    // =====================================

    updateDash() {

        if (this.dashCooldown > 0)
            this.dashCooldown -= 16;

    }

    dash() {

        if (this.dashCooldown > 0)
            return;

        let dx = 0;
        let dy = 0;

        if (keys["w"]) dy = -1;
        if (keys["s"]) dy = 1;
        if (keys["a"]) dx = -1;
        if (keys["d"]) dx = 1;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        dx /= distance;
        dy /= distance;

        this.x += dx * DASH.DISTANCE;
        this.y += dy * DASH.DISTANCE;

        this.dashCooldown = DASH.COOLDOWN;

        Particle.createDashBurst(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

    }

    // =====================================
    // Sword
    // =====================================

    swingSword() {

        if (this.swordSwing)
            return;

        this.swordSwing = true;

        this.swordTimer = SWORD.DURATION;

        this.swingProgress = 0;

        this.swordAngle = aimAngle;

        Game.enemies.forEach(enemy => {

            enemy.hitThisSwing = false;

        });

    }

    updateSword() {

        if (!this.swordSwing)
            return;

        this.swordTimer--;

        this.swingProgress =
            1 - (this.swordTimer / SWORD.DURATION);

        this.attackEnemies();

        if (this.swordTimer <= 0)
            this.swordSwing = false;

    }

    // =====================================
    // Combat
    // =====================================
    //
    // No more manual splice() here - a hit
    // enemy is just flagged dead via takeDamage().
    // Game.cleanupEntities() removes it after
    // the update pass, so nothing gets skipped.

    attackEnemies() {

        Game.enemies.forEach(enemy => {

            if (enemy.hitThisSwing)
                return;

            const enemyCenterX =
                enemy.x + enemy.size / 2;

            const enemyCenterY =
                enemy.y + enemy.size / 2;

            const dx =
                enemyCenterX -
                (this.x + this.size / 2);

            const dy =
                enemyCenterY -
                (this.y + this.size / 2);

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            if (distance > SWORD.LENGTH)
                return;

            const angleToEnemy =
                Math.atan2(dy, dx);

            const currentAngle =
                this.swordAngle -
                SWORD.ARC / 2 +
                SWORD.ARC * this.swingProgress;

            let angleDifference =
                Math.abs(angleToEnemy - currentAngle);

            if (angleDifference > Math.PI)
                angleDifference =
                    Math.PI * 2 - angleDifference;

            if (angleDifference < 0.5) {

                enemy.takeDamage(SWORD.DAMAGE);

                enemy.hitThisSwing = true;

                if (enemy.isDead()) {

                    Game.enemiesRemaining--;

                    Game.screenShake =
                        EFFECTS.SHAKE_ON_KILL;

                }

            }

        });

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        ctx.shadowBlur = EFFECTS.PLAYER_GLOW;
        ctx.shadowColor = PLAYER.COLOR;

        ctx.fillStyle = this.color;

        ctx.fillRect(
            this.x,
            this.y,
            this.size,
            this.size
        );

        ctx.shadowBlur = 0;

        this.drawSword();

        this.drawAimIndicator();

    }

    drawSword() {

        if (!this.swordSwing)
            return;

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        const currentAngle =
            this.swordAngle -
            SWORD.ARC / 2 +
            SWORD.ARC * this.swingProgress;

        ctx.rotate(currentAngle);

        ctx.shadowBlur = 20;
        ctx.shadowColor = "white";

        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 10;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        ctx.strokeStyle = "white";
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(SWORD.LENGTH - 25, 0);
        ctx.stroke();

        ctx.fillStyle = "cyan";

        ctx.beginPath();

        ctx.arc(
            SWORD.LENGTH - 25,
            0,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();

    }

    drawAimIndicator() {

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        ctx.rotate(aimAngle);

        ctx.globalAlpha = 0.4;

        ctx.strokeStyle = "cyan";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(0, 0);

        ctx.lineTo(50, 0);

        ctx.stroke();

        ctx.restore();

        ctx.globalAlpha = 1;

    }

}