// =====================================
// Angel Roster (Act III, waves 31-40)
// =====================================
//
// See the ANGELS block in constants.js for the premise. In short:
// the castle came at you, the garden took the ground, and the
// angels judge you. Every one of these punishes one specific
// mistake and is close to harmless if you don't make it.
//
// That is deliberate for the last stretch of a campaign. By wave
// 31 the player has a complete kit and wants a test with right
// answers, not a longer grind - so these hit hard, telegraph
// clearly, and always leave a correct play on the table.

// =====================================
// Cherub
// =====================================
//
// The rank and file. Holds formation at range and fires light
// bolts. Individually trivial; the point is that a line of them
// covers a lot of the arena at once.

class Cherub extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.cherub;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "cherub";
        this.knockbackImmune = true;

        this.shootCooldown = cfg.SHOOT_COOLDOWN * Math.random();

        // Its slot in the line, so a flight spreads out instead
        // of stacking on one point.
        this.slot = (Math.random() - 0.5) * 260;

    }

    move() {

        const cfg = ANGELS.cherub;
        const target = getAggroSource(this);

        // Holds range, but offset sideways by its own slot - the
        // formation is what makes a flight cover ground.
        const dx = (target.x + this.slot) - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;

        const step = this.speed * Game.timeScale;

        if (d < cfg.PREFERRED_RANGE - 30) {
            this.x -= (dx / d) * step;
            this.y -= (dy / d) * step;
        } else if (d > cfg.PREFERRED_RANGE + 30) {
            this.x += (dx / d) * step;
            this.y += (dy / d) * step;
        }

        this.keepInArenaOnceEntered();

    }

    attack() {

        const cfg = ANGELS.cherub;

        this.shootCooldown -= Game.dt;

        if (this.shootCooldown > 0)
            return;

        this.shootCooldown = cfg.SHOOT_COOLDOWN;

        const target = getAggroSource(this);

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.hazards.push(new LightBolt(
            cx, cy,
            Math.atan2(
                (target.y + target.size / 2) - cy,
                (target.x + target.size / 2) - cx
            ),
            this.isElite
        ));

    }

}

// =====================================
// Gate Warden
// =====================================
//
// Blocks almost everything arriving at its front, and nothing
// arriving at its back. The only angel that flatly ignores raw
// damage - by wave 31 the player has plenty of that, and a wall
// they have to walk around is a better question than a wall they
// have to out-damage.

class GateWarden extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.gateWarden;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "gateWarden";
        this.knockbackImmune = true;

        this.facing = 0;

    }

    move() {

        const target = getAggroSource(this);

        this.facing = Math.atan2(
            (target.y + target.size / 2) - (this.y + this.size / 2),
            (target.x + target.size / 2) - (this.x + this.size / 2)
        );

        super.move();

    }

    // Damage from within the shielded arc mostly bounces. Worked
    // out from where the PLAYER is standing rather than from the
    // projectile, because the question the fight is asking is
    // "have you moved?", and that stays true for melee, arrows
    // and beams alike without any of them knowing about shields.
    takeDamage(amount, crit = false) {

        const cfg = ANGELS.gateWarden;

        const toPlayer = Math.atan2(
            (player.y + player.size / 2) - (this.y + this.size / 2),
            (player.x + player.size / 2) - (this.x + this.size / 2)
        );

        let delta = Math.abs(toPlayer - this.facing);

        if (delta > Math.PI)
            delta = Math.PI * 2 - delta;

        const covered = this.isElite && ANGEL_ELITE.WARDEN_FULL_ARC
            ? true
            : delta < cfg.SHIELD_ARC / 2;

        if (covered) {

            // Not zero - a blocked hit still has to feel like a
            // hit, or the player reads it as a bug rather than as
            // "wrong angle".
            super.takeDamage(Math.max(1, Math.round(amount * cfg.SHIELD_LEAK)), crit);

            return;

        }

        super.takeDamage(amount, crit);

    }

    draw() {

        const cfg = ANGELS.gateWarden;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const r = this.size * 0.9;

        const arc = this.isElite && ANGEL_ELITE.WARDEN_FULL_ARC
            ? Math.PI * 2
            : cfg.SHIELD_ARC;

        // The shield is drawn as an arc in front of it, so which
        // side is safe is never a guess.
        ctx.save();
        ctx.strokeStyle = "rgba(180, 205, 255, 0.72)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, this.facing - arc / 2, this.facing + arc / 2);
        ctx.stroke();
        ctx.restore();

        super.draw();

    }

}

// =====================================
// Censer
// =====================================
//
// Swings a burning censer on a chain. It does not aim - it
// simply makes the ring around itself lethal, and walks at you.
// You fight it from outside the chain or not at all.

class Censer extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.censer;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "censer";
        this.knockbackImmune = true;

        this.spin = Math.random() * Math.PI * 2;
        this.hitCooldown = 0;

    }

    attack() {

        const cfg = ANGELS.censer;

        this.spin += (Math.PI * 2) * (Game.dt / cfg.SPIN_MS);

        if (this.hitCooldown > 0)
            this.hitCooldown -= Game.dt;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const heads = this.isElite && ANGEL_ELITE.CENSER_SECOND_CHAIN ? 2 : 1;

        for (let i = 0; i < heads; i++) {

            const a = this.spin + (i / heads) * Math.PI * 2;

            const hx = cx + Math.cos(a) * cfg.CHAIN_RADIUS;
            const hy = cy + Math.sin(a) * cfg.CHAIN_RADIUS;

            const d = Math.hypot(
                (player.x + player.size / 2) - hx,
                (player.y + player.size / 2) - hy
            );

            if (d < 34 && this.hitCooldown <= 0) {

                this.hitCooldown = 700;
                player.takeHit(ENEMY_LABELS.censer);

            }

        }

    }

    draw() {

        const cfg = ANGELS.censer;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const heads = this.isElite && ANGEL_ELITE.CENSER_SECOND_CHAIN ? 2 : 1;

        ctx.save();

        for (let i = 0; i < heads; i++) {

            const a = this.spin + (i / heads) * Math.PI * 2;

            const hx = cx + Math.cos(a) * cfg.CHAIN_RADIUS;
            const hy = cy + Math.sin(a) * cfg.CHAIN_RADIUS;

            // Chain first, then the burning head - the chain is
            // what tells you the radius before it reaches you.
            ctx.strokeStyle = "rgba(230, 200, 130, 0.45)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(hx, hy);
            ctx.stroke();

            ctx.fillStyle = "#ffb347";
            ctx.fillRect(Math.round(hx) - 7, Math.round(hy) - 7, 14, 14);

            ctx.fillStyle = "#fff0c0";
            ctx.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 6, 6);

        }

        ctx.restore();

        super.draw();

    }

}

// =====================================
// Scribe
// =====================================
//
// Marks you, and the mark lands unless you put something solid
// between you and the Scribe before the fuse runs out. The one
// enemy in the game that makes the arenas' cover load-bearing.

class Scribe extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.scribe;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "scribe";

        this.markCooldown = cfg.MARK_COOLDOWN * Math.random();

    }

    move() {

        holdRange(this, ANGELS.scribe.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    attack() {

        const cfg = ANGELS.scribe;

        this.markCooldown -= Game.dt;

        if (this.markCooldown > 0)
            return;

        this.markCooldown = cfg.MARK_COOLDOWN;

        Game.hazards.push(new JudgementMark(this, cfg.MARK_FUSE_MS));

    }

}

// =====================================
// Choir
// =====================================
//
// Sings the fallen back up. Never attacks. It is the roster's
// single clearest priority target, and the elite version makes
// ignoring it unwinnable rather than merely slow.

class Choir extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.choir;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "choir";
        this.protectsAllies = true;

        this.reviveCooldown = cfg.REVIVE_COOLDOWN;

        // Types this choir has watched fall, waiting to be sung
        // back. Filled by noteDeath from onEnemyKilled.
        this.fallen = [];

    }

    move() {

        holdRange(this, ANGELS.choir.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    noteDeath(type) {

        if (ANGEL_REVIVABLE.has(type))
            this.fallen.push(type);

    }

    attack() {

        const cfg = ANGELS.choir;

        this.reviveCooldown -= Game.dt;

        if (this.reviveCooldown > 0 || this.fallen.length === 0)
            return;

        this.reviveCooldown = cfg.REVIVE_COOLDOWN;

        const type = this.fallen.shift();
        const Cls = ENEMY_CLASSES[type];

        if (!Cls)
            return;

        const raised = new Cls(this.x, this.y);

        if (!(this.isElite && ANGEL_ELITE.CHOIR_UNLIMITED)) {

            raised.maxHp = Math.max(
                1,
                Math.round(raised.maxHp * cfg.REVIVE_HP_FRACTION)
            );
            raised.hp = raised.maxHp;

        }

        raised.emergeTimer = ANGELS.EMERGE_MS;

        Game.enemies.push(raised);
        Game.enemiesRemaining++;

    }

    drawProtectAura() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const pulse = 0.5 + Math.sin(Date.now() / 340) * 0.5;
        const r = 150;

        ctx.save();

        // Cached local-space gradient - see auraGradient.
        ctx.translate(cx, cy);
        ctx.globalAlpha = 0.45 + pulse * 0.55;

        ctx.fillStyle = auraGradient("255, 233, 168", r, 0.15, 0.11);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// Seraph Blade
// =====================================
//
// Draws a line across the whole arena, holds it long enough to
// be read, then crosses it at speed. Never chases - stepping off
// the line always works, and out-running it never does.

class SeraphBlade extends Enemy {

    constructor(x, y) {

        const cfg = ANGELS.seraphBlade;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "seraphBlade";
        this.knockbackImmune = true;

        this.dashCooldown = cfg.DASH_COOLDOWN * Math.random();
        this.telegraph = 0;
        this.dashing = false;

        this.dirX = 0;
        this.dirY = 0;

        this.passesLeft = 0;

    }

    move() {

        const cfg = ANGELS.seraphBlade;

        if (this.telegraph > 0) {

            this.telegraph -= Game.dt;

            if (this.telegraph <= 0) {
                this.dashing = true;
                this.passesLeft =
                    this.isElite && ANGEL_ELITE.BLADE_RETURN_PASS ? 1 : 0;
            }

            return;

        }

        if (this.dashing) {

            const step = cfg.DASH_SPEED * Game.timeScale;

            this.x += this.dirX * step;
            this.y += this.dirY * step;

            const out =
                this.x < -this.size * 2 || this.y < -this.size * 2 ||
                this.x > canvas.width + this.size * 2 ||
                this.y > canvas.height + this.size * 2;

            if (!out)
                return;

            if (this.passesLeft > 0) {

                // Comes back across on the reverse line rather
                // than vanishing - the elite's whole addition is
                // that the dodge has to be held, not just timed.
                this.passesLeft--;
                this.dirX *= -1;
                this.dirY *= -1;

                return;

            }

            this.dashing = false;
            this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
            this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));

            return;

        }

        super.move();

        this.dashCooldown -= Game.dt;

        if (this.dashCooldown <= 0) {

            this.dashCooldown = cfg.DASH_COOLDOWN;
            this.telegraph = cfg.TELEGRAPH_MS;

            const target = getAggroSource(this);

            const dx = (target.x + target.size / 2) - (this.x + this.size / 2);
            const dy = (target.y + target.size / 2) - (this.y + this.size / 2);
            const d = Math.hypot(dx, dy) || 1;

            this.dirX = dx / d;
            this.dirY = dy / d;

        }

    }

    draw() {

        // The line, drawn the full width of the arena while it
        // winds up. This is the entire counterplay, so it is the
        // loudest thing the enemy does.
        if (this.telegraph > 0) {

            const cfg = ANGELS.seraphBlade;
            const t = 1 - this.telegraph / cfg.TELEGRAPH_MS;

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;
            const reach = canvas.width + canvas.height;

            ctx.save();
            ctx.strokeStyle = `rgba(159, 216, 255, ${0.25 + t * 0.5})`;
            ctx.lineWidth = 6 + t * 10;
            ctx.beginPath();
            ctx.moveTo(cx - this.dirX * reach, cy - this.dirY * reach);
            ctx.lineTo(cx + this.dirX * reach, cy + this.dirY * reach);
            ctx.stroke();
            ctx.restore();

        }

        super.draw();

    }

}

// Angels a Choir will sing back up. Bosses excluded, and the
// Choir itself excluded so a pair can't hold each other up
// forever.
const ANGEL_REVIVABLE = new Set([
    "cherub", "gateWarden", "censer", "scribe", "seraphBlade"
]);
