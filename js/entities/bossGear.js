// =====================================
// Act II Boss Gear - shared effects
// =====================================
//
// Four boss tiers arrived at once (Thorn Matron, Greenwarden,
// Heartwood, Herald), two items per class each. Most of the
// thirty-two are a class hook plus a few lines; what they have
// in COMMON lives here, so a thorn bed planted by the Warrior's
// girdle, the Ranger's seed arrow and the Mage's prism is one
// object with one set of numbers rather than three that drift.
//
// Everything below is a Game.hazards citizen - update() /
// isDead() / draw() - the same duck-typed contract the enemy
// hazards use. They are player-owned and only ever damage
// enemies; the player walks through all of them.
//
// Tier identities, for anyone adding to these later:
//
//   MATRON      you leave the ground changed behind you
//   GREENWARDEN you take pieces off, and yours grow back
//   HEARTWOOD   you are rewarded for holding your ground
//   HERALD      you mark, and the sky answers

// =====================================
// Thorn Bed  (Matron tier)
// =====================================
//
// A patch of ground that hurts enemies standing in it. The
// player's side of the Matron's brambles, and the shared body
// of five separate items.

class ThornBed {

    constructor(x, y, radius = BOSS_GEAR.THORN_RADIUS) {

        this.x = x;
        this.y = y;
        this.radius = radius;

        this.life = BOSS_GEAR.THORN_LIFE_MS;
        this.tick = 0;

        // Rolled once so the petals don't crawl frame to frame -
        // same trick the enemy BramblePatch uses.
        this.seed = Math.random() * 1000;

    }

    update() {

        this.life -= Game.dt;
        this.tick -= Game.dt;

        if (this.tick > 0)
            return;

        this.tick = BOSS_GEAR.THORN_TICK_MS;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead() || enemy.isEmerging())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.x, ey - this.y) > this.radius + enemy.size / 2)
                return;

            enemy.takeDamage(BOSS_GEAR.THORN_TICK_DAMAGE);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = Math.min(1, this.life / 700);

        ctx.save();
        ctx.globalAlpha = 0.9 * fade;

        // Six blooms around the ring plus one in the middle.
        //
        // Cold blue, against the garden's pink-and-gold - see
        // BOSS_GEAR.THORN_*. Player thorns and enemy thorns end
        // up on the same floor constantly, and telling them
        // apart has to be instant.
        for (let i = 0; i < 7; i++) {

            const a = (i / 6) * Math.PI * 2 + this.seed;
            const r = i === 6 ? 0 : this.radius * 0.62;

            const px = Math.round(this.x + Math.cos(a) * r);
            const py = Math.round(this.y + Math.sin(a) * r);

            ctx.fillStyle = BOSS_GEAR.THORN_STEM;
            ctx.fillRect(px - 4, py - 4, 8, 8);

            ctx.fillStyle = BOSS_GEAR.THORN_PETAL;
            ctx.fillRect(px - 3, py - 3, 6, 6);

            ctx.fillStyle = BOSS_GEAR.THORN_CENTRE;
            ctx.fillRect(px - 1, py - 1, 2, 2);

        }

        ctx.restore();

    }

}

// =====================================
// Pollen Burst  (Matron tier, Mage)
// =====================================
//
// Slows rather than damages. Re-asserted every frame onto
// whatever is inside it, so it lapses on its own the instant an
// enemy steps clear - the same self-expiring shape the Pollen
// Drone's own aura uses.

class PollenBurst {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.life = BOSS_GEAR.POLLEN_LIFE_MS;

    }

    update() {

        this.life -= Game.dt;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.x, ey - this.y) > BOSS_GEAR.POLLEN_RADIUS)
                return;

            // One stack, refreshed - never enough on its own to
            // trip the cap into a snare.
            enemy.sapTimer = Math.max(enemy.sapTimer, 200);
            enemy.sapStacks = Math.max(enemy.sapStacks, 1);

        });

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const t = 1 - this.life / BOSS_GEAR.POLLEN_LIFE_MS;
        const r = BOSS_GEAR.POLLEN_RADIUS * (0.4 + t * 0.6);

        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.5;

        for (let i = 0; i < 14; i++) {

            const a = (i / 14) * Math.PI * 2 + t * 2;

            ctx.fillStyle = "#e6c760";
            ctx.fillRect(
                Math.round(this.x + Math.cos(a) * r) - 2,
                Math.round(this.y + Math.sin(a) * r) - 2,
                4, 4
            );

        }

        ctx.restore();

    }

}

// =====================================
// Grasping Root  (Heartwood tier)
// =====================================
//
// Holds one specific enemy still. The root is drawn between the
// ground it came out of and the thing it caught, and it keeps
// re-asserting the snare until it rots - so killing the target
// or having it die elsewhere just ends the effect quietly.

class GraspingRoot {

    constructor(x, y, target) {

        this.x = x;
        this.y = y;
        this.target = target;
        this.life = BOSS_GEAR.ROOT_HOLD_MS;

    }

    update() {

        this.life -= Game.dt;

        if (!this.target || this.target.isDead())
            return;

        this.target.applySnare(120);

    }

    isDead() {

        return this.life <= 0 || !this.target || this.target.isDead();

    }

    draw() {

        if (!this.target || this.target.isDead())
            return;

        const tx = this.target.x + this.target.size / 2;
        const ty = this.target.y + this.target.size / 2;

        ctx.save();
        ctx.strokeStyle = "#6b4a2a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.strokeStyle = "#8a6238";
        ctx.lineWidth = 2;
        ctx.stroke();

        // The grip itself.
        ctx.fillStyle = "#6b4a2a";
        ctx.fillRect(Math.round(tx) - 7, Math.round(ty) - 7, 14, 14);
        ctx.fillStyle = "#8a6238";
        ctx.fillRect(Math.round(tx) - 4, Math.round(ty) - 4, 8, 8);

        ctx.restore();

    }

}

// =====================================
// Judgement Pillar  (Herald tier)
// =====================================
//
// Telegraphs, then falls. Deliberately the Herald's own weapon
// pointed the other way: a ring on the floor, a beat to read it,
// then a column of light and everything under it takes the hit.
//
// The delay is the whole item. A pillar that landed instantly
// would just be extra damage; one you can watch arrive is a
// threat the wave has to move around.

class JudgementPillar {

    constructor(x, y, damage = BOSS_GEAR.PILLAR_DAMAGE,
                radius = BOSS_GEAR.PILLAR_RADIUS) {

        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = radius;

        this.warn = BOSS_GEAR.PILLAR_WARN_MS;
        this.flash = 0;
        this.struck = false;

        Sound.playAt("summon", x, y);

    }

    update() {

        if (this.struck) {

            this.flash -= Game.dt;
            return;

        }

        this.warn -= Game.dt;

        if (this.warn > 0)
            return;

        this.strike();

    }

    strike() {

        this.struck = true;
        this.flash = BOSS_GEAR.PILLAR_FLASH_MS;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead() || enemy.isEmerging())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.x, ey - this.y) > this.radius + enemy.size / 2)
                return;

            enemy.takeDamage(this.damage);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        Game.screenShake = Math.max(Game.screenShake ?? 0, 9);
        Particle.createHitBurst(this.x, this.y);

        Sound.play("explosion");

    }

    isDead() {

        return this.struck && this.flash <= 0;

    }

    // Drawn above the scenery: a column of light occluded by a
    // hedge would be a column of light you cannot see.
    get drawAbovePillars() {

        return true;

    }

    draw() {

        ctx.save();

        if (!this.struck) {

            // Closing ring, so the beat before it lands is a
            // countdown rather than a flat warning.
            const t = 1 - this.warn / BOSS_GEAR.PILLAR_WARN_MS;

            drawPixelDashedRing(
                this.x, this.y,
                this.radius * (1.35 - t * 0.35),
                { color: "rgb(223, 230, 245)", alpha: 0.3 + t * 0.45, unit: 4 }
            );

            ctx.restore();
            return;

        }

        const fade = this.flash / BOSS_GEAR.PILLAR_FLASH_MS;

        // The column, drawn as stacked bands from the top of the
        // screen down to the impact - reads as something that
        // came from above rather than a ring that lit up.
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = "#dfe6f5";

        const half = Math.round(this.radius * 0.55);

        ctx.fillRect(Math.round(this.x) - half, 0, half * 2, Math.round(this.y));

        ctx.globalAlpha = fade * 0.9;
        ctx.fillRect(Math.round(this.x) - Math.round(half * 0.4), 0,
                     Math.round(half * 0.8), Math.round(this.y));

        drawPixelDisc(this.x, this.y, this.radius, {
            color: "rgb(255, 255, 255)",
            alpha: fade * 0.7,
            unit: 4
        });

        ctx.restore();

    }

}

// =====================================
// Shared helpers
// =====================================

// The living enemy nearest to (x, y), optionally skipping one.
// Used by the Thief's Verdict chain and the Sapwell's grab.
function nearestEnemyTo(x, y, skip = null) {

    let best = null;
    let bestDist = Infinity;

    Game.enemies.forEach(enemy => {

        if (enemy === skip || enemy.isDead() || enemy.isEmerging())
            return;

        const d = Math.hypot(
            enemy.x + enemy.size / 2 - x,
            enemy.y + enemy.size / 2 - y
        );

        if (d < bestDist) {
            bestDist = d;
            best = enemy;
        }

    });

    return best;

}

// Damage everything within `radius` of (x, y). The shape half
// the new offensive items share - the Warrior's thorn burst, the
// Thief's rosethorn bloom, the Mage's pruning detonation.
function bossGearBurst(x, y, radius, damage, skip = null) {

    Game.enemies.forEach(enemy => {

        if (enemy === skip || enemy.isDead() || enemy.isEmerging())
            return;

        const ex = enemy.x + enemy.size / 2;
        const ey = enemy.y + enemy.size / 2;

        if (Math.hypot(ex - x, ey - y) > radius + enemy.size / 2)
            return;

        enemy.takeDamage(damage);

        if (enemy.isDead())
            onEnemyKilled(enemy);

    });

}

// True when the player has held their ground long enough to
// count as rooted. Three Heartwood-tier items ask this, and they
// all have to agree on what "standing still" means.
function isPlayerRooted(player, ms) {

    return player.stillTimer >= ms;

}
