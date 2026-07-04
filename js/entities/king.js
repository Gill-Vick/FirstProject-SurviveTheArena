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

        // Sword
        this.slashCooldown = 0;
        this.slashing = false;
        this.slashTimer = 0;
        this.slashAngle = 0;
        this.slashProgress = 0;
        this.slashParried = false;

        // Laser - "idle" | "telegraph" | "firing" | "gap"
        this.laserCooldown = 0;
        this.laserState = "idle";
        this.laserTimer = 0;
        this.laserAngle = 0;
        this.laserHitRegistered = false;
        this.laserBurstsRemaining = 0;

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
            { type: "fireMage", x: cx - 220, y: cy + 10, elite: true },
            { type: "fireMage", x: cx + 220, y: cy + 10, elite: true },
            { type: "necromancer", x: cx + 100, y: cy + 60, elite: true },
            { type: "necromancer", x: cx, y: cy + 150, elite: true }
        ];

        spawns.forEach(s => {

            const size = getEnemySize(s.type);

            Game.spawnTelegraphs.push(new SpawnWarning(

                s.x + size / 2,
                s.y + size / 2,
                size / 2 + 14,
                500,

                () => {

                    const EnemyClass = ENEMY_CLASSES[s.type];
                    const enemy = new EnemyClass(s.x, s.y);

                    if (s.elite)
                        makeElite(enemy);

                    Game.enemies.push(enemy);

                    Game.enemiesRemaining++;

                }

            ));

        });

    }

    move() {

        if (this.slashing)
            return;

        super.move();

    }

    // =====================================
    // Attack
    // =====================================

    attack() {

        if (this.laserCooldown > 0)
            this.laserCooldown -= Game.dt;

        if (this.slashCooldown > 0)
            this.slashCooldown -= Game.dt;

        // The laser telegraph/firing cycle keeps running even
        // while a sword swing starts, so the beam never freezes
        // mid-animation.
        this.updateLaser();

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

        if (this.laserState === "idle" && this.laserCooldown <= 0) {

            const dx = player.x + player.size / 2 - cx;
            const dy = player.y + player.size / 2 - cy;

            this.laserAngle = Math.atan2(dy, dx);
            this.laserState = "telegraph";
            this.laserTimer = KING.LASER_TELEGRAPH;
            this.laserBurstsRemaining = KING.LASER_BURST_COUNT;

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

    // =====================================
    // Laser (continuous beam)
    // =====================================

    updateLaser() {

        if (this.laserState === "telegraph") {

            this.laserTimer -= Game.dt;

            if (this.laserTimer <= 0) {

                this.laserState = "firing";
                this.laserTimer = KING.LASER_DURATION;
                this.laserHitRegistered = false;

            }

            return;

        }

        if (this.laserState === "firing") {

            this.laserTimer -= Game.dt;

            this.checkLaserHit();

            if (this.laserTimer <= 0) {

                this.laserBurstsRemaining--;

                if (this.laserBurstsRemaining > 0) {

                    this.laserState = "gap";
                    this.laserTimer = KING.LASER_BURST_GAP;

                } else {

                    this.laserState = "idle";
                    this.laserCooldown = KING.LASER_COOLDOWN;

                }

            }

            return;

        }

        if (this.laserState === "gap") {

            this.laserTimer -= Game.dt;

            if (this.laserTimer <= 0) {

                // Re-aim for the next pulse in the burst so it
                // still tracks where the player is now.
                const cx = this.x + this.size / 2;
                const cy = this.y + this.size / 2;
                const dx = player.x + player.size / 2 - cx;
                const dy = player.y + player.size / 2 - cy;

                this.laserAngle = Math.atan2(dy, dx);
                this.laserState = "telegraph";
                this.laserTimer = KING.LASER_TELEGRAPH;

            }

        }

    }

    // The beam is a rectangle projecting out from the king's
    // center along laserAngle, long enough to clear the map in
    // any direction from any position, and a little wider than
    // the player. Same rotate-into-local-space rectangle test
    // used by the lancer's lance hitbox.

    getLaserLength() {

        return Math.hypot(canvas.width, canvas.height) * 1.2;

    }

    checkLaserHit() {

        if (this.laserHitRegistered)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dx = px - cx;
        const dy = py - cy;

        const cos = Math.cos(-this.laserAngle);
        const sin = Math.sin(-this.laserAngle);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const pad = player.size / 2;
        const halfWidth = KING.LASER_WIDTH / 2 + pad;

        if (

            localX >= -pad &&
            localX <= this.getLaserLength() + pad &&
            Math.abs(localY) <= halfWidth

        ) {

            player.takeHit(ENEMY_LABELS.king);
            this.laserHitRegistered = true;

        }

    }

    // =====================================
    // Sword (Parry)
    // =====================================

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

    // =====================================
    // Drawing
    // =====================================

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // Beam draws first (underneath) so the king's body
        // still reads clearly near its point of origin.
        if (this.laserState === "telegraph")
            this.drawLaserTelegraph(cx, cy);

        if (this.laserState === "firing")
            this.drawLaserBeam(cx, cy);

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

    drawLaserTelegraph(cx, cy) {

        const length = this.getLaserLength();
        const pulse = 0.45 + Math.sin(Date.now() / 50) * 0.25;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.laserAngle);

        ctx.strokeStyle = `rgba(0, 191, 255, ${pulse})`;
        ctx.lineWidth = 4;
        ctx.setLineDash([14, 10]);
        ctx.shadowBlur = 10;
        ctx.shadowColor = KING.LASER_COLOR;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();

        // Faint preview of the beam's width so it's clear
        // exactly how wide the danger zone will be.
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(0, 191, 255, ${pulse * 0.12})`;
        ctx.fillRect(0, -KING.LASER_WIDTH / 2, length, KING.LASER_WIDTH);

        ctx.restore();

    }

    drawLaserBeam(cx, cy) {

        const length = this.getLaserLength();
        const width = KING.LASER_WIDTH;

        // Fades out over its own duration so it doesn't just
        // vanish instantly.
        const fade = Math.max(0, this.laserTimer / KING.LASER_DURATION);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.laserAngle);

        ctx.shadowBlur = 30;
        ctx.shadowColor = KING.LASER_COLOR;

        const grad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
        grad.addColorStop(0, "rgba(0, 191, 255, 0)");
        grad.addColorStop(0.5, `rgba(200, 245, 255, ${0.95 * fade})`);
        grad.addColorStop(1, "rgba(0, 191, 255, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, -width / 2, length, width);

        // Bright hot core running through the middle
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
        ctx.fillRect(0, -width * 0.12, length, width * 0.24);

        ctx.restore();

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

        const length = KING.SLASH_LENGTH;

        // Motion trail sweeping behind the blade tip, same
        // idea as the player's sword trail.
        const trailLag = 0.18;
        const prevProgress = Math.max(0, this.slashProgress - trailLag);
        const previousAngle =
            this.slashAngle -
            KING.SLASH_ARC / 2 +
            KING.SLASH_ARC * prevProgress;
        const angleDiff = currentAngle - previousAngle;

        if (angleDiff > 0) {

            ctx.save();
            ctx.rotate(currentAngle);

            const trailGrad = ctx.createRadialGradient(
                0, 0, length * 0.35,
                0, 0, length
            );
            trailGrad.addColorStop(0, "rgba(255, 204, 0, 0)");
            trailGrad.addColorStop(0.85, "rgba(255, 204, 0, 0.18)");
            trailGrad.addColorStop(1, "rgba(255, 240, 200, 0.4)");

            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.moveTo(length - 8, 0);
            ctx.arc(0, 0, length - 8, 0, -angleDiff, true);
            ctx.lineTo(length - 60, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

        }

        ctx.rotate(currentAngle);

        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffcc00";

        // Long, heavy greatsword blade - wide at the base,
        // tapering to a sharp point far out at `length`.
        let grad = ctx.createLinearGradient(0, -12, 0, 12);
        grad.addColorStop(0, "#f7f2e0");
        grad.addColorStop(0.25, "#e0d29a");
        grad.addColorStop(0.5, "#8b0000");
        grad.addColorStop(0.75, "#e0d29a");
        grad.addColorStop(1, "#2c2416");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(34, -12);
        ctx.lineTo(length - 40, -6);
        ctx.lineTo(length, 0);
        ctx.lineTo(length - 40, 6);
        ctx.lineTo(34, 12);
        ctx.closePath();
        ctx.fill();

        // Center ridge for depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(length - 20, 0);
        ctx.stroke();

        // Gold crossguard
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(24, -24, 10, 48);

        // Wrapped hilt
        ctx.fillStyle = "#3a1a1a";
        ctx.fillRect(0, -7, 24, 14);

        // Pommel jewel
        ctx.fillStyle = "#8b0000";
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}