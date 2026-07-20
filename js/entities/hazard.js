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

        ctx.save();

        ctx.strokeStyle = `rgba(255, 40, 0, ${alpha})`;
        ctx.fillStyle = `rgba(255, 60, 0, ${alpha * 0.35})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

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

        ctx.save();

        ctx.fillStyle = `rgba(150, 215, 240, ${0.22 * fade * shimmer})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(200, 240, 255, ${0.55 * fade})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crystalline spokes so it reads as ice, not water.
        ctx.strokeStyle = `rgba(220, 245, 255, ${0.3 * fade})`;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 6; i++) {

            const a = (Math.PI / 3) * i + Math.PI / 12;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(a) * radius * 0.85,
                this.y + Math.sin(a) * radius * 0.85
            );
            ctx.stroke();

        }

        ctx.restore();

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

        ctx.save();

        // Scorched crater.
        let scorch = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.15,
            this.x, this.y, this.radius * grow
        );
        scorch.addColorStop(0, "rgba(30, 12, 6, 0.55)");
        scorch.addColorStop(0.65, "rgba(60, 20, 8, 0.4)");
        scorch.addColorStop(1, "rgba(90, 30, 10, 0.12)");

        ctx.fillStyle = scorch;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * grow, 0, Math.PI * 2);
        ctx.fill();

        // Smoldering rim so the lethal edge reads clearly.
        ctx.strokeStyle = `rgba(255, 90, 20, ${0.4 * flicker})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * grow, 0, Math.PI * 2);
        ctx.stroke();

        // Embers glowing in the ash.
        this.embers.forEach(e => {

            const glow = 0.35 + Math.sin(Date.now() / 160 + e.phase) * 0.3;

            ctx.fillStyle = `rgba(255, 120, 30, ${Math.max(0, glow)})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
            ctx.fill();

        });

        ctx.restore();

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

        ctx.save();

        // Blast-radius warning, same language as the keg's own
        // fuse circle.
        ctx.strokeStyle = `rgba(255, 60, 20, ${pulse + urgency * 0.35})`;
        ctx.fillStyle = `rgba(255, 80, 20, ${pulse * 0.3})`;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // The bomblet itself, flashing faster as it arms.
        const flashing =
            Math.floor(Date.now() / (100 - urgency * 65)) % 2 === 0;

        ctx.fillStyle = flashing ? "#ffcf4d" : "#5d5348";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "orange";

        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();

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

        ctx.save();

        ctx.fillStyle = `rgba(255, 90, 0, ${0.35 * fade})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 160, 0, ${0.5 * fade})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

    }

}