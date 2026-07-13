// =====================================
// Royal Magus (Wave 15 Boss)
// =====================================
//
// The court's archmage. Keeps to mid-range like his mages.
// A Lightning Shower - telegraphed strikes raining down
// across the entire arena - runs with NO cooldown for the
// whole fight (a fresh shower starts the moment the last one
// ends), while he cycles through three elemental skills on a
// fixed rotation in parallel:
//
//   1. Earth Wall - a full-span stone wall raised just
//      behind the player; can't be moved or dashed past.
//   2. Wind Gust  - arena-wide, no damage, shoves the
//      player along the gust for its duration.
//   3. Meteor     - huge telegraphed impact that leaves
//      a firestorm denying a big chunk of the map.
//
// His honor guard (4 frost weavers on the left wall, 4 fire
// mages on the right) is spawned by startMagusWave() in
// wave.js using the stationed-enemy behavior in enemy.js.

class RoyalMagus extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: MAGUS.SIZE,
            speed: MAGUS.SPEED * Game.enemySpeedMultiplier,
            hp: MAGUS.HP,
            color: MAGUS.COLOR
        });

        this.type = "royalMagus";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.charmImmune = true;
        this.maxHp = MAGUS.HP;

        this.skillCooldown = MAGUS.OPENING_COOLDOWN;
        this.skillIndex = 0;

        // The perpetual storm - see checkLightning().
        this.lightningShower = null;

        // Close-range defense - see checkNova()/ArcaneNova.
        this.novaCooldown = 0;

        this.projectileRingRadius = BOSS_RING.RADIUS;

        // Brief staff-raise glow whenever a skill is cast.
        this.castFlash = 0;

    }

    // The honor guard's shield is HIS magic - when he falls,
    // it fails, and the oath that binds them takes them down
    // with him. Killed through the normal onEnemyKilled path
    // so coins and the wave counter stay correct.

    takeDamage(amount, crit = false) {

        super.takeDamage(amount, crit);

        if (this.hp > 0)
            return;

        Game.enemies.forEach(e => {

            if (!e.magusGuard || e.isDead())
                return;

            e.damageImmune = false;
            e.hp = 0;

            Particle.createHitBurst(
                e.x + e.size / 2,
                e.y + e.size / 2
            );

            onEnemyKilled(e);

        });

    }

    // Same keep-at-range drift as his fire mages.
    move() {

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred = MAGUS.PREFERRED_RANGE;

        if (distance < preferred - 30) {

            this.x -= (dx / distance) * this.speed * Game.timeScale;
            this.y -= (dy / distance) * this.speed * Game.timeScale;

        } else if (distance > preferred + 30) {

            this.x += (dx / distance) * this.speed * Game.timeScale;
            this.y += (dy / distance) * this.speed * Game.timeScale;

        }

    }

    // Close-range defense: anyone who gets inside
    // NOVA_TRIGGER_RANGE sets off an Arcane Nova - charge-up,
    // then a blast that damages and shoves the player back
    // out. Runs on its own cooldown, independent of (and in
    // parallel with) the skill rotation.

    checkNova() {

        if (this.novaCooldown > 0) {

            this.novaCooldown -= Game.dt;

            return;

        }

        const dx = player.x + player.size / 2 - (this.x + this.size / 2);
        const dy = player.y + player.size / 2 - (this.y + this.size / 2);

        if (Math.hypot(dx, dy) > MAGUS.NOVA_TRIGGER_RANGE)
            return;

        Game.hazards.push(new ArcaneNova(this));

        this.novaCooldown = MAGUS.NOVA_COOLDOWN;
        this.castFlash = 429;

    }

    // Lightning has no cooldown at all: the instant the
    // current shower finishes spawning its strikes, the next
    // one begins, so the storm never lets up for the whole
    // fight. Runs alongside (never instead of) the skill
    // rotation and the nova.

    checkLightning() {

        if (this.lightningShower && !this.lightningShower.isDead())
            return;

        this.lightningShower = new LightningShower();

        Game.hazards.push(this.lightningShower);

    }

    attack() {

        if (this.castFlash > 0)
            this.castFlash -= Game.dt;

        this.checkNova();

        this.checkLightning();

        if (this.skillCooldown > 0) {

            this.skillCooldown -= Game.dt;

            return;

        }

        const rotation = ["wall", "wind", "meteor"];
        const skill = rotation[this.skillIndex % rotation.length];

        this.skillIndex++;
        this.skillCooldown = MAGUS.SKILL_COOLDOWN;
        this.castFlash = 571;

        if (skill === "wall")
            Game.hazards.push(new EarthWall(this));

        else if (skill === "wind")
            Game.hazards.push(new WindGust());

        else
            Game.hazards.push(new MeteorStrike(
                player.x + player.size / 2,
                player.y + player.size / 2
            ));

    }

    // =====================================
    // Drawing - robe, wizard hat, staff
    // =====================================

    draw() {

        const cx = this.x + this.size / 2;

        // Royal blue robe flaring out beneath him, same idea
        // as the King's red cape.
        ctx.save();

        ctx.fillStyle = "rgba(30, 45, 140, 0.85)";
        ctx.beginPath();
        ctx.moveTo(cx, this.y + this.size * 0.3);
        ctx.lineTo(this.x - 10, this.y + this.size);
        ctx.lineTo(this.x + this.size + 10, this.y + this.size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        super.draw();

        this.drawStaff();
        this.drawHat();

        ctx.fillStyle = MAGUS.COLOR;
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText("ROYAL MAGUS", cx, this.y - 28);

    }

    drawHat() {

        const cx = this.x + this.size / 2;
        const brimY = this.y + 6;

        ctx.save();

        // Wide brim.
        ctx.fillStyle = "#1e2a78";
        ctx.beginPath();
        ctx.ellipse(cx, brimY, 34, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tall cone with a crooked, folded tip.
        ctx.fillStyle = "#27358f";
        ctx.beginPath();
        ctx.moveTo(cx - 20, brimY);
        ctx.lineTo(cx + 20, brimY);
        ctx.lineTo(cx + 6, brimY - 34);
        ctx.lineTo(cx + 16, brimY - 44);
        ctx.lineTo(cx - 2, brimY - 38);
        ctx.closePath();
        ctx.fill();

        // Gold band where the cone meets the brim.
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(cx - 17, brimY - 8, 34, 5);

        // A couple of stars on the cone.
        ctx.fillStyle = "#ffe98a";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("★", cx - 6, brimY - 14);
        ctx.fillText("★", cx + 7, brimY - 24);

        ctx.restore();

    }

    drawStaff() {

        const sx = this.x + this.size + 6;
        const topY = this.y - 6;
        const bottomY = this.y + this.size + 4;

        ctx.save();

        // Wooden shaft, slightly angled outward.
        ctx.strokeStyle = "#5a3d1e";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sx - 6, bottomY);
        ctx.lineTo(sx + 4, topY);
        ctx.stroke();

        // Glowing orb at the tip - brighter mid-cast.
        const glow = this.castFlash > 0 ? 26 : 14;
        const pulse = 0.7 + Math.sin(Date.now() / 180) * 0.2;

        ctx.shadowBlur = glow;
        ctx.shadowColor = "#7fd4ff";

        ctx.fillStyle = `rgba(140, 215, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(sx + 5, topY - 8, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(sx + 3, topY - 10, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// Arcane Nova
// =====================================
//
// The Magus' answer to melee pressure. A short charge-up
// (rings converging on him), then a blast centered on
// wherever he is at detonation: damages the player if
// they're still inside NOVA_RADIUS and shoves them back
// outward for NOVA_PUSH_DURATION regardless of i-frames -
// the shove IS the defense, the damage is just the sting.

class ArcaneNova {

    constructor(magus) {

        this.magus = magus;
        this.state = "charge";
        this.timer = MAGUS.NOVA_CHARGE;

        this.pushing = false;
        this.pushAngle = 0;

    }

    center() {

        return {
            x: this.magus.x + this.magus.size / 2,
            y: this.magus.y + this.magus.size / 2
        };

    }

    update() {

        this.timer -= Game.dt;

        if (this.state === "charge") {

            if (this.timer <= 0) {

                this.state = "blast";
                this.timer = MAGUS.NOVA_PUSH_DURATION;

                const c = this.center();
                const dx = player.x + player.size / 2 - c.x;
                const dy = player.y + player.size / 2 - c.y;
                const dist = Math.hypot(dx, dy);

                if (dist < MAGUS.NOVA_RADIUS + player.size / 2) {

                    player.takeHit(ENEMY_LABELS.royalMagus);

                    this.pushing = true;
                    this.pushAngle = dist === 0
                        ? Math.random() * Math.PI * 2
                        : Math.atan2(dy, dx);

                }

                Game.screenShake = 8;

                Particle.createHitBurst(c.x, c.y);

            }

            return;

        }

        if (this.state === "blast") {

            if (this.pushing) {

                player.x += Math.cos(this.pushAngle) * MAGUS.NOVA_PUSH * Game.timeScale;
                player.y += Math.sin(this.pushAngle) * MAGUS.NOVA_PUSH * Game.timeScale;

                player.keepOnScreen();

            }

            if (this.timer <= 0)
                this.state = "done";

        }

    }

    isDead() {

        return this.state === "done";

    }

    draw() {

        const c = this.center();

        ctx.save();

        if (this.state === "charge") {

            // Rings converging inward as he gathers the blast.
            const progress = 1 - this.timer / MAGUS.NOVA_CHARGE;
            const radius = MAGUS.NOVA_RADIUS * (1 - progress * 0.75);

            ctx.strokeStyle = `rgba(140, 170, 255, ${0.3 + progress * 0.5})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#3d5af1";

            ctx.beginPath();
            ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Danger area preview.
            ctx.fillStyle = `rgba(120, 150, 255, ${0.08 + progress * 0.08})`;
            ctx.beginPath();
            ctx.arc(c.x, c.y, MAGUS.NOVA_RADIUS, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.state === "blast") {

            // Shockwave ring expanding out to full radius.
            const progress = 1 - this.timer / MAGUS.NOVA_PUSH_DURATION;
            const radius = MAGUS.NOVA_RADIUS * progress;
            const fade = 1 - progress;

            ctx.strokeStyle = `rgba(200, 220, 255, ${0.85 * fade})`;
            ctx.lineWidth = 8 * fade + 2;
            ctx.shadowBlur = 25;
            ctx.shadowColor = "#7fa0ff";

            ctx.beginPath();
            ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(120, 150, 255, ${0.4 * fade})`;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(c.x, c.y, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();

        }

        ctx.restore();

    }

}

// =====================================
// Lightning Shower
// =====================================
//
// Controller hazard: scatters LightningStrike hazards across
// the arena over LIGHTNING_SPAN ms, so the skill reads as a
// rolling storm rather than one simultaneous volley. Driven
// by Game.dt (not setTimeout) so it pauses with the game.

class LightningShower {

    constructor() {

        this.spawned = 0;
        this.timer = 0;
        this.gap = MAGUS.LIGHTNING_SPAN / MAGUS.LIGHTNING_COUNT;

    }

    update() {

        this.timer -= Game.dt;

        while (this.timer <= 0 && this.spawned < MAGUS.LIGHTNING_COUNT) {

            const x = 30 + Math.random() * (canvas.width - 60);
            const y = 30 + Math.random() * (canvas.height - 60);

            Game.hazards.push(new LightningStrike(x, y));

            this.spawned++;
            this.timer += this.gap;

        }

    }

    isDead() {

        return this.spawned >= MAGUS.LIGHTNING_COUNT;

    }

    draw() {}

}

// One telegraphed strike: warning circle, then a bolt flash
// that damages anyone inside the circle at the moment it hits.

class LightningStrike {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = MAGUS.LIGHTNING_RADIUS;
        this.timer = MAGUS.LIGHTNING_TELEGRAPH;
        this.struck = false;
        this.flash = 0;

        // Jagged bolt shape is rolled once so it doesn't
        // rearrange itself every frame of the flash.
        this.joltOffsets = [0, 1, 2, 3].map(() => (Math.random() - 0.5) * 30);

    }

    update() {

        if (!this.struck) {

            this.timer -= Game.dt;

            if (this.timer <= 0) {

                this.struck = true;
                this.flash = 229;

                const px = player.x + player.size / 2;
                const py = player.y + player.size / 2;

                if (Math.hypot(px - this.x, py - this.y) < this.radius)
                    player.takeHit(ENEMY_LABELS.royalMagus);

                Particle.createHitBurst(this.x, this.y);

            }

            return;

        }

        this.flash -= Game.dt;

    }

    isDead() {

        return this.struck && this.flash <= 0;

    }

    draw() {

        ctx.save();

        if (!this.struck) {

            // Warning circle with an inner disc that shrinks
            // as the strike gets closer.
            const progress = 1 - this.timer / MAGUS.LIGHTNING_TELEGRAPH;
            const alpha = 0.35 + Math.sin(Date.now() / 60) * 0.15;

            ctx.strokeStyle = `rgba(255, 235, 120, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 235, 120, ${alpha * 0.35})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * progress, 0, Math.PI * 2);
            ctx.fill();

        } else {

            const fade = Math.max(0, this.flash / 229);

            // Scorch pool at the impact point.
            ctx.fillStyle = `rgba(255, 250, 200, ${0.5 * fade})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // The bolt: a jagged line dropping in from above.
            ctx.strokeStyle = `rgba(255, 255, 240, ${fade})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#ffee88";

            ctx.beginPath();
            ctx.moveTo(this.x + this.joltOffsets[0], this.y - 170);
            ctx.lineTo(this.x + this.joltOffsets[1], this.y - 115);
            ctx.lineTo(this.x + this.joltOffsets[2], this.y - 60);
            ctx.lineTo(this.x + this.joltOffsets[3], this.y - 25);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();

        }

        ctx.restore();

    }

}

// =====================================
// Meteor
// =====================================
//
// Big telegraphed impact on the player's position. On landing
// it hits anyone inside, shakes the screen, and leaves a
// MagusFirestorm - a huge burning zone that denies that part
// of the arena for several seconds.

class MeteorStrike {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = MAGUS.METEOR_RADIUS;
        this.timer = MAGUS.METEOR_TELEGRAPH;
        this.landed = false;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer <= 0 && !this.landed) {

            this.landed = true;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (Math.hypot(px - this.x, py - this.y) < this.radius)
                player.takeHit(ENEMY_LABELS.royalMagus);

            Game.screenShake = 18;

            Particle.createHitBurst(this.x, this.y);

            Game.hazards.push(new MagusFirestorm(this.x, this.y));

        }

    }

    isDead() {

        return this.landed;

    }

    draw() {

        const progress = 1 - this.timer / MAGUS.METEOR_TELEGRAPH;
        const alpha = 0.3 + Math.sin(Date.now() / 70) * 0.12;

        ctx.save();

        ctx.strokeStyle = `rgba(255, 80, 0, ${alpha + 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 90, 0, ${alpha * 0.3})`;
        ctx.fill();

        // The meteor's shadow growing as it falls.
        ctx.fillStyle = `rgba(60, 20, 0, ${0.25 + progress * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30 + progress * 60, 0, Math.PI * 2);
        ctx.fill();

        // Incoming streak, steepening toward impact.
        const streak = 1 - progress;

        ctx.strokeStyle = `rgba(255, 160, 60, ${0.5 + progress * 0.4})`;
        ctx.lineWidth = 6 + progress * 8;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff7020";

        ctx.beginPath();
        ctx.moveTo(this.x + streak * 300 + 40, this.y - streak * 420 - 60);
        ctx.lineTo(this.x + streak * 60, this.y - streak * 90);
        ctx.stroke();

        ctx.restore();

    }

}

// The zone the meteor leaves behind. Same idea as
// BurningGround but far larger, longer-lived, and attributed
// to the Magus.

class MagusFirestorm {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = MAGUS.METEOR_RADIUS;
        this.life = MAGUS.METEOR_BURN_DURATION;
        this.tickTimer = 0;

    }

    update() {

        this.life -= Game.dt;
        this.tickTimer -= Game.dt;

        if (this.tickTimer <= 0) {

            this.tickTimer = MAGUS.METEOR_BURN_TICK;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (Math.hypot(px - this.x, py - this.y) < this.radius)
                player.takeHit(ENEMY_LABELS.royalMagus);

        }

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = Math.min(1, this.life / 1429);
        const flicker = 0.85 + Math.sin(Date.now() / 90) * 0.15;

        ctx.save();

        let heat = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.1,
            this.x, this.y, this.radius
        );
        heat.addColorStop(0, `rgba(255, 170, 40, ${0.45 * fade * flicker})`);
        heat.addColorStop(0.6, `rgba(255, 90, 0, ${0.35 * fade})`);
        heat.addColorStop(1, `rgba(180, 40, 0, ${0.15 * fade})`);

        ctx.fillStyle = heat;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 140, 0, ${0.55 * fade})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Licks of flame around the rim.
        ctx.fillStyle = `rgba(255, 200, 80, ${0.5 * fade * flicker})`;

        for (let i = 0; i < 10; i++) {

            const a = (Math.PI * 2 * i) / 10 + Date.now() / 900;
            const fx = this.x + Math.cos(a) * this.radius * 0.85;
            const fy = this.y + Math.sin(a) * this.radius * 0.85;

            ctx.beginPath();
            ctx.ellipse(fx, fy, 6, 14, a + Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.restore();

    }

}

// =====================================
// Earth Wall
// =====================================
//
// A full-span stone wall raised just behind the player - on
// whichever side of them faces away from the Magus, along the
// dominant axis. While it stands the player's position is
// clamped to the Magus' side of it every frame, which blocks
// walking AND dashing through (a dash that jumps the line is
// snapped back the same frame). Enemies ignore it - it's
// earth magic aimed at you.

class EarthWall {

    constructor(magus) {

        const pcx = player.x + player.size / 2;
        const pcy = player.y + player.size / 2;
        const mcx = magus.x + magus.size / 2;
        const mcy = magus.y + magus.size / 2;

        const dx = pcx - mcx;
        const dy = pcy - mcy;

        // Wall goes across the dominant escape axis.
        this.vertical = Math.abs(dx) >= Math.abs(dy);

        const gap = MAGUS.WALL_GAP_FROM_PLAYER;
        const thickness = MAGUS.WALL_THICKNESS;

        if (this.vertical) {

            // side +1: wall to the player's right, blocks
            // moving further right. side -1: mirrored.
            this.side = dx >= 0 ? 1 : -1;

            this.pos = this.side > 0
                ? player.x + player.size + gap
                : player.x - gap - thickness;

        } else {

            this.side = dy >= 0 ? 1 : -1;

            this.pos = this.side > 0
                ? player.y + player.size + gap
                : player.y - gap - thickness;

        }

        this.life = MAGUS.WALL_DURATION;
        this.age = 0;

        // Rubble pattern rolled once at spawn.
        this.blocks = [];

        const span = this.vertical ? canvas.height : canvas.width;

        for (let s = 0; s < span; s += 34) {

            this.blocks.push({
                s,
                jitter: (Math.random() - 0.5) * 8,
                shade: 0.8 + Math.random() * 0.4
            });

        }

    }

    update() {

        this.life -= Game.dt;
        this.age += Game.dt;

        const thickness = MAGUS.WALL_THICKNESS;

        // Hard position clamp - the wall is solid to the
        // player no matter how they crossed the line.
        if (this.vertical) {

            if (this.side > 0 && player.x + player.size > this.pos)
                player.x = this.pos - player.size;

            if (this.side < 0 && player.x < this.pos + thickness)
                player.x = this.pos + thickness;

        } else {

            if (this.side > 0 && player.y + player.size > this.pos)
                player.y = this.pos - player.size;

            if (this.side < 0 && player.y < this.pos + thickness)
                player.y = this.pos + thickness;

        }

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const thickness = MAGUS.WALL_THICKNESS;

        // Rises out of the ground over the first 250ms, then
        // crumbles (fades) over its last 500ms.
        const rise = Math.min(1, this.age / 357);
        const fade = Math.min(1, this.life / 714);
        const alpha = rise * fade;

        ctx.save();

        this.blocks.forEach(b => {

            const shade = b.shade;

            ctx.fillStyle = `rgba(${Math.round(110 * shade)}, ${Math.round(88 * shade)}, ${Math.round(60 * shade)}, ${alpha})`;

            if (this.vertical)
                ctx.fillRect(this.pos + b.jitter * 0.3, b.s, thickness, 32);
            else
                ctx.fillRect(b.s, this.pos + b.jitter * 0.3, 32, thickness);

        });

        // Cracked highlight along the top edge.
        ctx.fillStyle = `rgba(200, 175, 130, ${0.35 * alpha})`;

        if (this.vertical)
            ctx.fillRect(this.pos, 0, 4, canvas.height);
        else
            ctx.fillRect(0, this.pos, canvas.width, 4);

        ctx.restore();

    }

}

// =====================================
// Wind Gust
// =====================================
//
// Arena-wide and effectively unavoidable, but deals no damage
// at all - it just shoves the player along the gust direction
// for WIND_DURATION, on top of whatever they're doing. Streak
// lines telegraph the direction before the push begins.

class WindGust {

    constructor() {

        this.angle = Math.random() * Math.PI * 2;
        this.state = "telegraph";
        this.timer = MAGUS.WIND_TELEGRAPH;

        // Parallel streak lines rolled once, animated in draw.
        this.streaks = [];

        for (let i = 0; i < 22; i++) {

            this.streaks.push({
                offset: Math.random(),
                lane: Math.random(),
                length: 60 + Math.random() * 120
            });

        }

    }

    update() {

        this.timer -= Game.dt;

        if (this.state === "telegraph") {

            if (this.timer <= 0) {

                this.state = "pushing";
                this.timer = MAGUS.WIND_DURATION;

            }

            return;

        }

        if (this.state === "pushing") {

            player.x += Math.cos(this.angle) * MAGUS.WIND_PUSH * Game.timeScale;
            player.y += Math.sin(this.angle) * MAGUS.WIND_PUSH * Game.timeScale;

            player.keepOnScreen();

            if (this.timer <= 0)
                this.state = "done";

        }

    }

    isDead() {

        return this.state === "done";

    }

    draw() {

        const strength = this.state === "telegraph" ? 0.35 : 0.7;

        // Streaks travel along the gust direction; each lane
        // is offset perpendicular to it, covering the screen.
        const diag = Math.hypot(canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const dirX = Math.cos(this.angle);
        const dirY = Math.sin(this.angle);
        const perpX = -dirY;
        const perpY = dirX;

        // Faster scroll once the push is live.
        const scroll = (Date.now() / (this.state === "telegraph" ? 900 : 350));

        ctx.save();

        ctx.strokeStyle = `rgba(220, 240, 255, ${strength * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";

        this.streaks.forEach(s => {

            const along = (((s.offset + scroll) % 1) - 0.5) * diag * 1.2;
            const lane = (s.lane - 0.5) * diag;

            const x = cx + dirX * along + perpX * lane;
            const y = cy + dirY * along + perpY * lane;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dirX * s.length, y + dirY * s.length);
            ctx.stroke();

        });

        ctx.restore();

    }

}
