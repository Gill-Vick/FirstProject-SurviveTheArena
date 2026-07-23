// =====================================
// Fire Cast (warning → explosion → burn)
// =====================================

class FireCast {

    // scale > 1 for elite fire mages - grows both the blast
    // and the burning ground it leaves behind.
    constructor(x, y, scale = 1) {

        this.x = x;
        this.y = y;
        this.scale = scale;
        this.radius = HAZARD.FIRE_RADIUS * scale;
        this.timer = HAZARD.FIRE_WARNING;
        this.exploded = false;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer <= 0 && !this.exploded) {

            this.explode();

            this.exploded = true;

        }

    }

    explode() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - this.x;
        const dy = py - this.y;

        if (Math.sqrt(dx * dx + dy * dy) < this.radius)
            player.takeHit(ENEMY_LABELS.fireMage);

        Game.hazards.push(new BurningGround(this.x, this.y, this.scale));

        Particle.createHitBurst(this.x, this.y);

    }

    isDead() {

        return this.exploded;

    }

    draw() {

        const alpha = 0.35 + Math.sin(Date.now() / 80) * 0.15;

        // Pulsing pixel warning ring where the fire will land.
        drawPixelZone(this.x, this.y, this.radius, {
            fill: "#ff4400",
            rim: "#ff5a1a",
            fillAlpha: alpha * 0.35,
            rimAlpha: alpha + 0.2,
            glow: 8,
            glowColor: "#ff4400"
        });

    }

}

// =====================================
// Frost Zone (Frost Weaver)
// =====================================
//
// No damage at all - a patch of frozen ground that slows the
// player's movement and dash while they stand in it (see
// Player.getFrostMultiplier in player.js). Grows in over
// ZONE_GROW_TIME so it reads as being conjured, then holds
// for the rest of its life and fades out.

class FrostZone {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.life = ENEMY_TYPES.frostWeaver.ZONE_DURATION;
        this.age = 0;

        // Duck-typed flag read by Player.getFrostMultiplier -
        // avoids instanceof checks across load order.
        this.slowsPlayer = true;

    }

    getRadius() {

        const grow = Math.min(
            1,
            this.age / ENEMY_TYPES.frostWeaver.ZONE_GROW_TIME
        );

        return this.maxRadius * grow;

    }

    containsPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - this.x;
        const dy = py - this.y;

        return Math.sqrt(dx * dx + dy * dy) < this.getRadius();

    }

    update() {

        this.age += Game.dt;
        this.life -= Game.dt;

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const radius = this.getRadius();
        const fade = Math.min(1, this.life / 857);
        const shimmer = 0.75 + Math.sin(Date.now() / 200) * 0.1;

        // Frozen ground as a pixel patch.
        drawPixelZone(this.x, this.y, radius, {
            fill: "#96d7f0",
            rim: "#c8f0ff",
            fillAlpha: 0.22 * fade * shimmer,
            rimAlpha: 0.55 * fade
        });

        // Crystalline spokes drawn as short pixel runs, so it
        // reads as ice rather than a plain water disc.
        const unit = Math.max(2, Math.round(radius * 0.055));

        ctx.save();
        ctx.globalAlpha = 0.35 * fade;
        ctx.fillStyle = "#dcf5ff";

        for (let i = 0; i < 6; i++) {

            const a = (Math.PI / 3) * i + Math.PI / 12;

            for (let r = radius * 0.2; r < radius * 0.85; r += unit) {

                ctx.fillRect(
                    pxSnap(this.x + Math.cos(a) * r, unit),
                    pxSnap(this.y + Math.sin(a) * r, unit),
                    unit, unit
                );

            }

        }

        ctx.restore();
        ctx.globalAlpha = 1;

    }

}

// =====================================
// Keg Kill Zone
// =====================================
//
// Left behind by every powder keg explosion: the blast
// scorches its full radius into ground that stays lethal to
// the player for the REST OF THE WAVE - it only dies when the
// wave is cleared (or torn down by a custom-mode jump). Every
// keg that goes off permanently shrinks the safe area, so
// where you let kegs die becomes a wave-long decision.
// Player-only: enemies walk it freely.

class KegKillZone {

    // radius defaults to a full keg blast; elite cluster
    // bombs pass their own smaller footprint.
    constructor(x, y, radius = ENEMY_TYPES.powderKeg.EXPLOSION_RADIUS) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.tickTimer = 0;
        this.age = 0;

        // Bound to the wave it was born in.
        this.wave = Game.wave;

        // Ember positions rolled once so they smolder in
        // place instead of teleporting every frame.
        this.embers = [];

        for (let i = 0; i < 9; i++) {

            const a = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * this.radius * 0.8;

            this.embers.push({
                x: this.x + Math.cos(a) * r,
                y: this.y + Math.sin(a) * r,
                phase: Math.random() * Math.PI * 2
            });

        }

    }

    update() {

        this.age += Game.dt;
        this.tickTimer -= Game.dt;

        if (this.tickTimer <= 0) {

            this.tickTimer = ENEMY_TYPES.powderKeg.KILL_ZONE_TICK;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (Math.hypot(px - this.x, py - this.y) < this.radius)
                player.takeHit(ENEMY_LABELS.powderKeg);

        }

    }

    isDead() {

        // Dies with its wave: cleared, or replaced by a jump.
        return !Game.waveActive || this.wave !== Game.wave;

    }

    draw() {

        const grow = Math.min(1, this.age / 429);
        const flicker = 0.85 + Math.sin(Date.now() / 110) * 0.15;
        const radius = this.radius * grow;

        // Scorched crater as a dark pixel disc with a smoldering
        // rim marking the lethal edge.
        drawPixelZone(this.x, this.y, radius, {
            fill: "#3c1408",
            rim: "#ff5a14",
            fillAlpha: 0.45,
            rimAlpha: 0.4 * flicker,
            dither: 0.7
        });

        // Embers glowing in the ash - single lit cells.
        ctx.save();

        this.embers.forEach(e => {

            const glow = 0.35 + Math.sin(Date.now() / 160 + e.phase) * 0.3;

            ctx.globalAlpha = Math.max(0, glow);
            ctx.fillStyle = "#ff781e";
            ctx.fillRect(pxSnap(e.x, 3), pxSnap(e.y, 3), 3, 3);

        });

        ctx.restore();
        ctx.globalAlpha = 1;

    }

}

// =====================================
// Mage Ice Field (Elemental Prism)
// =====================================
//
// Left by the ice half of the Mage's Sunbeam rotation. Unlike
// the Frost Weaver's zone (which slows the PLAYER and deals no
// damage), this is the mirror image: it damages enemies on a
// tick and drags them to a crawl while they stand in it. The
// chill is re-asserted every frame onto whatever is inside, so
// it lapses on its own the moment an enemy walks clear (see
// chillTimer in enemy.js). Bosses take the damage but shrug
// off the slow.

class MageIceField {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.life = ELEMENTAL_PRISM.ICE_DURATION_MS;
        this.age = 0;
        this.tickTimer = ELEMENTAL_PRISM.ICE_TICK_MS;

    }

    getRadius() {

        // Quick grow-in so it reads as ice spreading out from
        // the impact rather than popping into place.
        return this.maxRadius * Math.min(1, this.age / 200);

    }

    update() {

        this.age += Game.dt;
        this.life -= Game.dt;

        const radius = this.getRadius();

        this.tickTimer -= Game.dt;

        const ticking = this.tickTimer <= 0;

        if (ticking)
            this.tickTimer += ELEMENTAL_PRISM.ICE_TICK_MS;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.x, ey - this.y) > radius + enemy.size / 2)
                return;

            // Re-asserted every frame; expires ~immediately
            // after the enemy leaves the field.
            if (!enemy.isBoss)
                enemy.chillTimer = 100;

            if (ticking) {

                enemy.takeDamage(
                    mageDamageTo(enemy, ELEMENTAL_PRISM.ICE_DAMAGE)
                );

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const radius = this.getRadius();
        const fade = Math.min(1, this.life / 800);
        const shimmer = 0.8 + Math.sin(Date.now() / 180) * 0.12;

        drawPixelZone(this.x, this.y, radius, {
            fill: "#8cdcff",
            rim: "#c8f0ff",
            fillAlpha: 0.2 * fade * shimmer,
            rimAlpha: 0.6 * fade,
            glow: 10,
            glowColor: ELEMENTAL_PRISM.ICE_COLOR
        });

        // Denser frost shards than the weaver's patch, so the
        // Prism's ice reads as jagged rather than smooth.
        const unit = Math.max(2, Math.round(radius * 0.05));

        ctx.save();
        ctx.globalAlpha = 0.4 * fade;
        ctx.fillStyle = "#e1f8ff";

        for (let i = 0; i < 8; i++) {

            const a = (Math.PI / 4) * i + Math.PI / 16;

            for (let r = radius * 0.25; r < radius * 0.9; r += unit) {

                ctx.fillRect(
                    pxSnap(this.x + Math.cos(a) * r, unit),
                    pxSnap(this.y + Math.sin(a) * r, unit),
                    unit, unit
                );

            }

        }

        ctx.restore();
        ctx.globalAlpha = 1;

    }

}

// =====================================
// Cluster Bomb (elite Powder Keg)
// =====================================
//
// Scattered by an elite keg's death blast: sits armed for
// KEG_CLUSTER_FUSE ms under a pulsing warning circle, then
// explodes - hurting the player, damaging enemies, and
// scorching its own (smaller) kill zone. The scatter turns
// one elite keg death into a minefield.

class ClusterBomb {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = ELITE.KEG_CLUSTER_RADIUS;
        this.timer = ELITE.KEG_CLUSTER_FUSE;
        this.exploded = false;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer <= 0 && !this.exploded) {

            this.exploded = true;

            this.explode();

        }

    }

    explode() {

        Sound.playAt("explosion", this.x, this.y);

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - this.x, py - this.y) < this.radius + player.size / 2)
            player.takeHit(ENEMY_LABELS.powderKeg);

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.x, ey - this.y) < this.radius + enemy.size / 2) {

                enemy.takeDamage(ENEMY_TYPES.powderKeg.EXPLOSION_ENEMY_DAMAGE);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

        Particle.createHitBurst(this.x, this.y);

        Game.screenShake = Math.max(Game.screenShake, 6);

        Game.hazards.push(new KegKillZone(this.x, this.y, this.radius));

    }

    isDead() {

        return this.exploded;

    }

    draw() {

        const urgency = 1 - this.timer / ELITE.KEG_CLUSTER_FUSE;
        const pulse = 0.25 + Math.sin(Date.now() / 40) * 0.15;

        // Blast-radius warning, same pixel language as the keg's
        // own fuse circle.
        drawPixelZone(this.x, this.y, this.radius, {
            fill: "#ff5014",
            rim: "#ff3c14",
            fillAlpha: pulse * 0.3,
            rimAlpha: pulse + urgency * 0.35
        });

        // The bomblet itself, flashing faster as it arms.
        const flashing =
            Math.floor(Date.now() / (100 - urgency * 65)) % 2 === 0;

        ctx.save();
        ctx.fillStyle = flashing ? "#ffcf4d" : "#5d5348";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "orange";

        const u = 3;
        ctx.fillRect(pxSnap(this.x - u * 2, u), pxSnap(this.y - u, u), u * 4, u * 3);
        ctx.fillRect(pxSnap(this.x - u, u), pxSnap(this.y - u * 2, u), u * 3, u * 5);

        ctx.restore();

    }

}

// =====================================
// Burning Ground
// =====================================

class BurningGround {

    constructor(x, y, scale = 1) {

        this.x = x;
        this.y = y;
        this.radius = HAZARD.BURN_RADIUS * scale;
        this.life = HAZARD.BURN_DURATION;
        this.tickTimer = 0;

    }

    update() {

        this.life -= Game.dt;
        this.tickTimer -= Game.dt;

        if (this.tickTimer <= 0) {

            this.tickTimer = HAZARD.BURN_TICK;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;
            const dx = px - this.x;
            const dy = py - this.y;

            if (Math.sqrt(dx * dx + dy * dy) < this.radius)
                player.takeHit(ENEMY_LABELS.fireMage);

        }

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = Math.min(1, this.life / HAZARD.BURN_DURATION);

        // Lingering scorched fire as a pixel patch. A faint
        // flicker on the fill sells the flames without an
        // expensive per-cell animation.
        const flicker = 0.85 + Math.sin(Date.now() / 90) * 0.15;

        drawPixelZone(this.x, this.y, this.radius, {
            fill: "#ff5a00",
            rim: "#ffa000",
            fillAlpha: 0.35 * fade * flicker,
            rimAlpha: 0.5 * fade,
            glow: 6,
            glowColor: "#ff6a00"
        });

    }

}