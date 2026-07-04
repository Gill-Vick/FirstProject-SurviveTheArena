// =====================================
// King Boss (Wave 10)
// =====================================

class King extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: KING.SIZE,
            speed: KING.SPEED * Game.enemySpeedMultiplier,
            hp: KING.HP,
            color: KING.COLOR
        });

        this.type = "king";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.maxHp = KING.HP;

        this.laserCooldown = 0;
        this.slashCooldown = 0;

        this.slashing = false;
        this.slashTimer = 0;
        this.slashAngle = 0;
        this.slashProgress = 0;
        this.slashParried = false;

        this.summoned = false;

    }

    takeDamage(amount, crit = false) {

        super.takeDamage(amount, crit);

        if (!this.summoned && this.hp <= KING.SUMMON_THRESHOLD) {

            this.summonReinforcements();

            this.summoned = true;

        }

    }

    summonReinforcements() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const spawns = [
            { type: "lancer", x: cx - 120, y: cy - 80, elite: true },
            { type: "lancer", x: cx + 120, y: cy - 80, elite: true },
            { type: "fireMage", x: cx - 100, y: cy + 60, elite: true },
            { type: "necromancer", x: cx + 100, y: cy + 60, elite: true }
        ];

        spawns.forEach(s => {

            const EnemyClass = ENEMY_CLASSES[s.type];
            const enemy = new EnemyClass(s.x, s.y);

            if (s.elite)
                makeElite(enemy);

            Game.enemies.push(enemy);

            Game.enemiesRemaining++;

        });

    }

    move() {

        if (this.slashing)
            return;

        super.move();

    }

    attack() {

        if (this.laserCooldown > 0)
            this.laserCooldown -= Game.dt;

        if (this.slashCooldown > 0)
            this.slashCooldown -= Game.dt;

        if (this.slashing) {

            this.slashTimer -= Game.timeScale;
            this.slashProgress = 1 - (this.slashTimer / KING.SLASH_DURATION);

            if (player.swordSwing && this.checkParry())
                this.triggerParry();
            else
                this.checkSlashHit();

            if (this.slashTimer <= 0)
                this.slashing = false;

            return;

        }

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        if (this.laserCooldown <= 0) {

            const dx = player.x + player.size / 2 - cx;
            const dy = player.y + player.size / 2 - cy;
            const angle = Math.atan2(dy, dx);

            Game.projectiles.push(new Projectile(

                cx + Math.cos(angle) * 40,
                cy + Math.sin(angle) * 40,
                angle,

                {
                    speed: KING.LASER_SPEED,
                    damage: 1,
                    size: 8,
                    color: KING.LASER_COLOR,
                    life: 90,
                    isLaser: true,
                    sourceType: "king"
                }

            ));

            this.laserCooldown = KING.LASER_COOLDOWN;

        }

        if (this.slashCooldown <= 0) {

            const dx = player.x + player.size / 2 - cx;
            const dy = player.y + player.size / 2 - cy;

            this.slashAngle = Math.atan2(dy, dx);
            this.slashing = true;
            this.slashTimer = KING.SLASH_DURATION;
            this.slashProgress = 0;
            this.slashParried = false;
            this.slashCooldown = KING.SLASH_COOLDOWN;

        }

    }

    checkParry() {

        if (this.slashParried)
            return false;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const kx = this.x + this.size / 2;
        const ky = this.y + this.size / 2;
        const dx = px - kx;
        const dy = py - ky;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > KING.SLASH_LENGTH + 40)
            return false;

        const angleToPlayer = Math.atan2(dy, dx);
        const currentSlash =
            this.slashAngle -
            KING.SLASH_ARC / 2 +
            KING.SLASH_ARC * this.slashProgress;

        let diff = Math.abs(angleToPlayer - currentSlash);

        if (diff > Math.PI)
            diff = Math.PI * 2 - diff;

        if (diff > 0.55)
            return false;

        const playerSlash =
            player.swordAngle -
            SWORD.ARC / 2 +
            SWORD.ARC * player.swingProgress;

        let clash = Math.abs(playerSlash - currentSlash);

        if (clash > Math.PI)
            clash = Math.PI * 2 - clash;

        return clash < 0.7;

    }

    triggerParry() {

        this.slashParried = true;
        this.slashing = false;
        this.slashTimer = 0;
        this.slashCooldown = 2500;

        player.swordTimer = Math.floor(player.swordTimer / 2);

        Game.screenShake = EFFECTS.SHAKE_ON_KILL;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Particle.createHitBurst(cx, cy);

    }

    checkSlashHit() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const kx = this.x + this.size / 2;
        const ky = this.y + this.size / 2;
        const dx = px - kx;
        const dy = py - ky;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > KING.SLASH_LENGTH)
            return;

        const angleToPlayer = Math.atan2(dy, dx);
        const currentSlash =
            this.slashAngle -
            KING.SLASH_ARC / 2 +
            KING.SLASH_ARC * this.slashProgress;

        let diff = Math.abs(angleToPlayer - currentSlash);

        if (diff > Math.PI)
            diff = Math.PI * 2 - diff;

        if (diff < 0.5)
            player.takeHit(ENEMY_LABELS.king);

    }

    checkPlayerCollision() {

        if (this.slashing)
            return;

        super.checkPlayerCollision();

    }

    draw() {

        const cx = this.x + this.size / 2;

        ctx.save();

        ctx.fillStyle = "rgba(139, 0, 0, 0.85)";
        ctx.beginPath();
        ctx.moveTo(cx, this.y + this.size * 0.3);
        ctx.lineTo(this.x - 10, this.y + this.size);
        ctx.lineTo(this.x + this.size + 10, this.y + this.size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        super.draw();

        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.moveTo(cx - 18, this.y + 8);
        ctx.lineTo(cx, this.y - 14);
        ctx.lineTo(cx + 18, this.y + 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffd700";
        ctx.fillRect(cx - 4, this.y - 18, 8, 8);

        if (this.slashing)
            this.drawKingSlash();

        ctx.fillStyle = KING.COLOR;
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("KING", cx, this.y - 28);

    }

    drawKingSlash() {

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        const currentAngle =
            this.slashAngle -
            KING.SLASH_ARC / 2 +
            KING.SLASH_ARC * this.slashProgress;

        ctx.rotate(currentAngle);

        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffcc00";

        let grad = ctx.createLinearGradient(0, -4, KING.SLASH_LENGTH, 4);
        grad.addColorStop(0, "#bdc3c7");
        grad.addColorStop(1, "#ecf0f1");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(10, -4);
        ctx.lineTo(KING.SLASH_LENGTH, 0);
        ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

    }

}