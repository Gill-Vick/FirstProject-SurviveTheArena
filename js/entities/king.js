// =====================================
// King Boss (Wave 20)
// =====================================

class King extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: KING.SIZE,
            speed: KING.SPEED * Game.enemySpeedMultiplier,
            hp: KING.BASE_HP + Game.wave * KING.HP_PER_WAVE,
            color: KING.COLOR
        });

        this.type = "king";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.charmImmune = true;
        this.projectileRingRadius = BOSS_RING.RADIUS;
        // Mirror the (possibly Endless-scaled) hp set by super().
        this.maxHp = this.hp;

        // Sword
        this.slashCooldown = 0;
        this.slashing = false;
        this.slashTimer = 0;
        this.slashAngle = 0;
        this.slashProgress = 0;

        // Wall laser barrage - active WallLaser instances owned
        // by this King (see attack()/fireWallBarrage() below).
        // A short opening cooldown so the barrage can't hit the
        // player in the first instant of the fight.
        this.wallLaserCooldown = 1429;
        this.walls = [];

        this.summoned = false;

    }

    takeDamage(amount, crit = false) {

        super.takeDamage(amount, crit);

        if (!this.summoned && this.hp <= this.maxHp * KING.SUMMON_FRACTION) {

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
                714,

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

        if (this.wallLaserCooldown > 0)
            this.wallLaserCooldown -= Game.dt;

        if (this.slashCooldown > 0)
            this.slashCooldown -= Game.dt;

        // The walls keep telegraphing/firing/fading on their own
        // schedule even while a sword swing starts, so a barrage
        // never freezes mid-animation.
        this.walls.forEach(wall => wall.update());
        this.walls = this.walls.filter(wall => !wall.isDead());

        if (this.slashing) {

            this.slashTimer -= Game.timeScale;
            this.slashProgress = 1 - (this.slashTimer / KING.SLASH_DURATION);

            this.checkSlashHit();

            if (this.slashTimer <= 0)
                this.slashing = false;

            return;

        }

        if (this.wallLaserCooldown <= 0) {

            this.fireWallBarrage();
            this.wallLaserCooldown = KING.WALL_LASER_COOLDOWN;

        }

        if (this.slashCooldown <= 0) {

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;
            const dx = player.x + player.size / 2 - cx;
            const dy = player.y + player.size / 2 - cy;

            this.slashAngle = Math.atan2(dy, dx);
            this.slashing = true;
            this.slashTimer = KING.SLASH_DURATION;
            this.slashProgress = 0;
            this.slashCooldown = KING.SLASH_COOLDOWN;

        }

    }

    // =====================================
    // Wall Laser Barrage (bullet-hell)
    // =====================================
    //
    // Full-arena laser walls, not a beam tracking out from the
    // King's own position - each spawnWallPattern() call lays
    // down a set of parallel WallLaser lines (vertical,
    // horizontal, or diagonal) spanning the whole screen, with
    // one gap left in the wall to dodge through. Once the King
    // drops below half HP ("this.summoned"), a second wall
    // at a different angle follows shortly after, so the two
    // gaps have to be threaded together instead of just one.

    fireWallBarrage() {

        const patterns = ["vertical", "horizontal", "diagonalRight", "diagonalLeft"];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];

        this.spawnWallPattern(pattern);

        if (!this.summoned)
            return;

        const isDiagonal = pattern === "diagonalRight" || pattern === "diagonalLeft";

        const secondPattern = isDiagonal
            ? (pattern === "diagonalRight" ? "diagonalLeft" : "diagonalRight")
            : (pattern === "vertical" ? "horizontal" : "vertical");

        setTimeout(() => {

            if (isRunActive() && Game.enemies.includes(this))
                this.spawnWallPattern(secondPattern);

        }, KING.WALL_LASER_WAVE_GAP);

    }

    spawnWallPattern(pattern) {

        const spacing = KING.WALL_LASER_SPACING;
        const isDiagonal = pattern === "diagonalRight" || pattern === "diagonalLeft";

        const angle =
            pattern === "vertical" ? Math.PI / 2 :
            pattern === "horizontal" ? 0 :
            pattern === "diagonalRight" ? Math.PI / 4 :
            -Math.PI / 4;

        // Lines are stacked along the perpendicular axis to
        // `angle` - moving along it steps each line over from
        // the last, evenly covering the screen.
        const perpAngle = angle + Math.PI / 2;
        const perpX = Math.cos(perpAngle);
        const perpY = Math.sin(perpAngle);

        // Diagonal lines cover more screen per unit of
        // perpendicular offset, so they need the full diagonal
        // span rather than just width/height.
        const span = isDiagonal
            ? Math.hypot(canvas.width, canvas.height)
            : (pattern === "vertical" ? canvas.width : canvas.height);

        const lineCount = Math.ceil(span / spacing) + 2;
        const half = (lineCount - 1) / 2;

        // A run of consecutive lines is skipped entirely so
        // there's always a clean lane through the wall.
        const gapSize = Math.min(KING.WALL_LASER_GAP_COUNT, lineCount);
        const gapStart = Math.floor(Math.random() * (lineCount - gapSize + 1));

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < lineCount; i++) {

            if (i >= gapStart && i < gapStart + gapSize)
                continue;

            const offset = (i - half) * spacing;

            this.walls.push(new WallLaser(
                centerX + perpX * offset,
                centerY + perpY * offset,
                angle
            ));

        }

    }

    // =====================================
    // Sword (Parry)
    // =====================================

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

        drawPixelText(
            "KING",
            cx,
            this.y - 30,
            2,
            { color: "#c08cff", shadow: "rgba(0, 0, 0, 0.9)" }
        );

        // Walls draw last, on top of everything (including the
        // King himself), so the bullet-hell pattern reads
        // clearly no matter where on screen it crosses.
        this.walls.forEach(wall => wall.draw());

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

// =====================================
// Wall Laser (King bullet-hell barrage)
// =====================================
//
// A single full-length laser line anchored at a fixed point in
// the arena, extending in both directions along `angle` -
// unlike a beam shot from an enemy's position, this is a lane
// in a wall pattern. Telegraphs (thin warning line) then fires
// solid for a beat, same rotate-into-local-space rectangle hit
// test the old tracking beam used, just centered on the wall's
// own anchor point instead of the King.

class WallLaser {

    constructor(x, y, angle) {

        this.x = x;
        this.y = y;
        this.angle = angle;

        this.state = "telegraph";
        this.timer = KING.WALL_LASER_TELEGRAPH;
        this.hitRegistered = false;

    }

    update() {

        if (this.state === "telegraph") {

            this.timer -= Game.dt;

            if (this.timer <= 0) {

                this.state = "firing";
                this.timer = KING.WALL_LASER_DURATION;

            }

            return;

        }

        if (this.state === "firing") {

            this.timer -= Game.dt;

            this.checkHit();

            if (this.timer <= 0)
                this.state = "done";

        }

    }

    isDead() {

        return this.state === "done";

    }

    // Long enough that the line clears the arena in either
    // direction from any anchor point on screen.
    getLength() {

        return Math.hypot(canvas.width, canvas.height) * 1.2;

    }

    checkHit() {

        if (this.hitRegistered)
            return;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dx = px - this.x;
        const dy = py - this.y;

        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const pad = player.size / 2;
        const halfLength = this.getLength() / 2 + pad;
        const halfWidth = KING.WALL_LASER_WIDTH / 2 + pad;

        if (

            Math.abs(localX) <= halfLength &&
            Math.abs(localY) <= halfWidth

        ) {

            player.takeHit(ENEMY_LABELS.king);
            this.hitRegistered = true;

        }

    }

    draw() {

        const length = this.getLength();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.state === "telegraph") {

            const pulse = 0.45 + Math.sin(Date.now() / 50) * 0.25;
            const width = KING.WALL_LASER_WIDTH;

            // Faint pixel preview of the full danger zone, then a
            // brighter dashed centre line through it. Both are
            // cached bitmaps now (with glow baked in), not live
            // per-frame fillRect loops - this pair used to be
            // one of the worst offenders during the King fight
            // since several walls can be telegraphing at once.
            ctx.translate(-length / 2, 0);

            drawPixelRectZone(length, width, {
                color: KING.LASER_COLOR,
                alpha: pulse * 0.16,
                unit: Math.max(3, Math.round(width * 0.16))
            });

            drawPixelDashedLine(length, {
                color: KING.LASER_COLOR,
                alpha: pulse,
                unit: 6,
                dashOn: 2,
                dashOff: 2,
                phase: Math.floor(Date.now() / 60),
                glow: 8,
                glowColor: KING.LASER_COLOR
            });

        } else if (this.state === "firing") {

            const width = KING.WALL_LASER_WIDTH;
            const fade = Math.max(0, this.timer / KING.WALL_LASER_DURATION);

            ctx.translate(-length / 2, 0);
            drawPixelBeam(length, width, {
                color: KING.LASER_COLOR,
                coreColor: "#eaffff",
                alpha: 0.95 * fade,
                unit: Math.max(3, Math.round(width * 0.18)),
                glow: 20,
                glowColor: KING.LASER_COLOR
            });

        }

        ctx.restore();

    }

}