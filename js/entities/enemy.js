// =====================================
// Enemy Base Class
// =====================================

// "#rrggbb" (or "#rgb") -> [r, g, b], or null for named CSS
// colors like "red"/"orange". Only the four bosses' colors are
// ever passed here and all of them are hex, so the null path
// just means "leave the color alone".

function parseHexColor(color) {

    if (typeof color !== "string" || color[0] !== "#")
        return null;

    let hex = color.slice(1);

    if (hex.length === 3)
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

    if (hex.length !== 6)
        return null;

    const value = parseInt(hex, 16);

    if (Number.isNaN(value))
        return null;

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];

}

// A set of jagged polylines in 0..1 local space, used as a
// boss's crack pattern (see Enemy.drawCracks). Each starts on
// a random edge and forks inward in short irregular steps.
// Rolled once per boss so the damage stays where it landed.

function buildCrackPaths() {

    const paths = [];

    for (let i = 0; i < 5; i++) {

        // Start somewhere on the perimeter.
        const edge = Math.floor(Math.random() * 4);
        const along = 0.15 + Math.random() * 0.7;

        let x = edge === 0 ? along : edge === 1 ? 1 : edge === 2 ? along : 0;
        let y = edge === 0 ? 0 : edge === 1 ? along : edge === 2 ? 1 : along;

        // Head roughly inward, wandering as it goes.
        let angle = Math.atan2(0.5 - y, 0.5 - x);

        const path = [[x, y]];

        const segments = 3 + Math.floor(Math.random() * 3);

        for (let s = 0; s < segments; s++) {

            angle += (Math.random() - 0.5) * 1.5;

            const step = 0.12 + Math.random() * 0.16;

            x = Math.max(0, Math.min(1, x + Math.cos(angle) * step));
            y = Math.max(0, Math.min(1, y + Math.sin(angle) * step));

            path.push([x, y]);

        }

        paths.push(path);

    }

    return paths;

}

class Enemy {

    constructor(x, y, stats) {

        this.x = x;
        this.y = y;

        this.size = stats.size;
        this.speed = stats.speed;

        // Game.enemyHpMultiplier is 1 everywhere except Endless
        // (see startWave), so this is a no-op in normal play.
        // Bosses that re-set maxHp after super() must mirror
        // this.hp, not their raw constant (see Magus/King).
        this.hp = Math.round(stats.hp * Game.enemyHpMultiplier);
        this.maxHp = this.hp;

        this.color = stats.color;

        this.hitThisSwing = false;

        this.knockbackX = 0;
        this.knockbackY = 0;

        this.flashTimer = 0;

        // Knight's Locket - see applyCharm(). 0 = not charmed.
        // charmImmune can be set true by subclasses (e.g. King)
        // to opt out entirely, same pattern as knockbackImmune.
        this.charmTimer = 0;

        // Blood Cleric heal channel - re-asserted every frame
        // by the channeling cleric, so it expires on its own
        // moments after the cleric dies or drops the tether.
        // While > 0 this enemy cannot be damaged.
        this.healShieldTimer = 0;

        // Flips true once this enemy has fully walked onto the
        // screen - see keepInArenaOnceEntered(), used by kiters.
        this.hasEnteredArena = false;

        // Chilled by the Mage's ice field - re-asserted every
        // frame while stood in one, so it lapses on its own
        // once the enemy walks clear. See update().
        this.chillTimer = 0;

    }

    update() {

        this.x += this.knockbackX * Game.timeScale;
        this.y += this.knockbackY * Game.timeScale;

        // Exponential decay via Math.pow so knockback fades
        // out at the same real-world rate at any frame rate.
        // (0.87 ≈ the old 0.82-per-frame decay at the old 0.7
        // game speed, so shove arcs feel identical.)
        const knockbackDecay = Math.pow(0.87, Game.timeScale);
        this.knockbackX *= knockbackDecay;
        this.knockbackY *= knockbackDecay;

        if (Math.abs(this.knockbackX) < 0.035)
            this.knockbackX = 0;

        if (Math.abs(this.knockbackY) < 0.035)
            this.knockbackY = 0;

        if (this.flashTimer > 0)
            this.flashTimer -= Game.timeScale;

        if (this.charmTimer > 0)
            this.charmTimer -= Game.dt;

        if (this.healShieldTimer > 0)
            this.healShieldTimer -= Game.dt;

        if (this.chillTimer > 0)
            this.chillTimer -= Game.dt;

        // Chill scales down however far move() actually
        // travelled this frame. Doing it here rather than
        // inside each move() means it works on every enemy -
        // chases, kites, lunges, charges, lancer dashes -
        // without a single subclass knowing chill exists.
        // Knockback is applied above, so shoves stay full
        // strength.
        const preX = this.x;
        const preY = this.y;

        this.move();

        if (this.chillTimer > 0) {

            this.x = preX + (this.x - preX) * ELEMENTAL_PRISM.ICE_SLOW_FACTOR;
            this.y = preY + (this.y - preY) * ELEMENTAL_PRISM.ICE_SLOW_FACTOR;

        }

        // Charmed enemies can still move, but can't attack or
        // deal contact damage for the duration.
        if (this.charmTimer <= 0) {

            this.attack();

            this.checkPlayerCollision();

        }

    }

    // Rolled by the player's Knight's Locket on hit. No-op
    // against charm-immune enemies (King). Re-applying while
    // already charmed just refreshes to the fresh duration
    // rather than stacking.

    applyCharm(durationMs) {

        if (this.charmImmune)
            return;

        this.charmTimer = Math.max(this.charmTimer, durationMs);

    }

    // Boss-fight escort behavior (Royal Magus): an enemy with
    // a `station` point walks to its post, then holds it
    // forever - it never chases or kites. Returns true when it
    // has taken over movement, so a subclass's move() can bail
    // out early. Their ranged attacks are unaffected (fire
    // mages / frost weavers already cast at the player from
    // any distance).
    moveTowardStation() {

        if (!this.station)
            return false;

        const dx = this.station.x - this.x;
        const dy = this.station.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2)
            return true;

        const step = Math.min(dist, this.speed * Game.timeScale);

        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;

        return true;

    }

    // Kiting enemies (archer, fire mage, frost weaver, Royal
    // Magus) back away from the player and would otherwise
    // reverse straight off the map. Clamp them to the arena -
    // but only ONCE they've fully entered it, so their walk-in
    // from off-screen at spawn still reads instead of popping to
    // the edge. Call at the end of a kiting move().
    keepInArenaOnceEntered() {

        if (!this.hasEnteredArena) {

            if (
                this.x >= 0 &&
                this.x <= canvas.width - this.size &&
                this.y >= 0 &&
                this.y <= canvas.height - this.size
            ) {
                this.hasEnteredArena = true;
            }

            return;

        }

        this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));

    }

    move() {

        if (this.knockbackX !== 0 || this.knockbackY !== 0)
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.x += (dx / distance) * this.speed * Game.timeScale;
        this.y += (dy / distance) * this.speed * Game.timeScale;

    }

    attack() {}

    checkPlayerCollision() {

        if (

            player.x < this.x + this.size &&
            player.x + player.size > this.x &&

            player.y < this.y + this.size &&
            player.y + player.size > this.y

        ) {

            player.takeHit(ENEMY_LABELS[this.type] ?? "an enemy");

        }

    }

    takeDamage(amount, crit = false) {

        // A scaled-down tick can round to nothing (see
        // mageDamageTo) - that's a non-event, not a hit: no
        // number, no spark, and no ward burned on it.
        if (amount <= 0)
            return;

        // Royal Magus honor guard (untouchable while their
        // master lives - see RoyalMagus.takeDamage), Blood
        // Cleric heal targets (invincible while the tether
        // holds), and anything inside an elite tank's
        // protective aura (see isAuraProtected in elite.js).
        // Hits still spark so the player can feel them bounce
        // off.
        if (
            this.damageImmune ||
            this.healShieldTimer > 0 ||
            isAuraProtected(this)
        ) {

            this.flashTimer = 4;

            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return;

        }

        // Blood Cleric ward - a 1-hit shield that eats one
        // full instance of damage, whatever its size. Breaking
        // it also strips an elite cleric's haste (the speed
        // was granted alongside the ward - see bloodCleric.js).
        if (this.wardShield) {

            this.wardShield = false;
            this.flashTimer = 7;

            if (this.wardHaste) {

                this.wardHaste = false;
                this.speed /= ELITE.CLERIC_HASTE;

            }

            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return;

        }

        this.hp -= amount;

        this.flashTimer = 7;

        // One central hit sound for every damage source, faded
        // by distance. Crits ring out brighter.
        Sound.playAt(
            crit ? "critHit" : "enemyHit",
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        const centerX =
            this.x + this.size / 2;

        const centerY =
            this.y + this.size / 2;

        Particle.createHitBurst(
            centerX,
            centerY
        );

        Game.damageNumbers.push(

            new DamageNumber(

                centerX,

                centerY - 10,

                amount,

                crit

            )

        );

    }

    applyKnockback(fromX, fromY, force = 8.4) {

        if (this.knockbackImmune)
            return;

        const dx = this.x + this.size / 2 - fromX;
        const dy = this.y + this.size / 2 - fromY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.knockbackX += (dx / distance) * force;
        this.knockbackY += (dy / distance) * force;

    }

    isDead() {

        return this.hp <= 0;

    }

    draw() {

        if (this.projectileRingRadius)
            this.drawProjectileRing();

        if (this.protectsAllies)
            this.drawProtectAura();

        if (this.isElite)
            this.drawEliteRing();

        if (this.charmTimer > 0)
            this.drawCharmIndicator();

        if (this.wardShield)
            this.drawWardShield();

        if (this.damageImmune)
            this.drawImmuneRing();

        // Chilled enemies glaze over in the ice field's blue so
        // the slow is visible rather than just felt.
        const chilled = this.chillTimer > 0;

        // Wounded bosses run hot and pulse (see getEnrage).
        const enrage = this.getEnrage();

        // Body colour: white hit-flash, else ice / enrage / base.
        const bodyColor =
            this.flashTimer > 0
                ? "#ffffff"
                : chilled
                    ? ELEMENTAL_PRISM.ICE_COLOR
                    : enrage
                        ? enrage.color
                        : this.color;

        const glowColor = chilled
            ? ELEMENTAL_PRISM.ICE_COLOR
            : enrage
                ? "rgb(255, 90, 40)"
                : this.color;

        const midX = this.x + this.size / 2;
        const midY = this.y + this.size / 2;

        // Enrage pulse rides BEHIND the body as a cheap pulsing
        // disc rather than an animated shadowBlur - a cached
        // sprite can't animate its own glow, so the throb lives
        // in a separate aura the body then sits on top of.
        if (enrage) {

            drawPixelDisc(
                midX,
                midY,
                this.size * (0.65 + enrage.pulse * 0.3),
                {
                    color: "rgb(255, 90, 40)",
                    alpha: 0.2 + enrage.pulse * 0.3,
                    unit: Math.max(3, Math.round(this.size / 12))
                }
            );

        }

        // The old smooth fillRect + soft shadowBlur is now a
        // baked pixel sprite (hard outline, bevel, grain). Its
        // glow is baked in and tighter than the old blur so the
        // pixel edges stay crisp.
        drawPixelBody(
            midX,
            midY,
            this.size,
            {
                color: bodyColor,
                glow: EFFECTS.ENEMY_GLOW * 0.4,
                glowColor
            }
        );

        if (enrage)
            this.drawCracks(enrage);

        this.drawHealthBar();

    }

    // Boss projectile ward - the big ring every boss projects
    // that stops player projectiles fired from outside it
    // (see Projectile.checkBossRing). Drawn as a slowly
    // pulsing dashed circle so it reads as a standing barrier
    // rather than an attack telegraph.

    drawProjectileRing() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulse = 0.35 + Math.sin(Date.now() / 400) * 0.12;

        // Faint pixel fill marking the protected zone.
        drawPixelDisc(cx, cy, this.projectileRingRadius, {
            color: BOSS_RING.COLOR,
            alpha: pulse * 0.1,
            unit: 6,
            dither: 0.5
        });

        // Rotating dashed pixel rim - a couple of pixels deep so
        // it reads as a standing barrier, not a hairline. This
        // used to be a live loop of ~750 individually-shadowed
        // fillRects EVERY FRAME (it's on screen for a boss's
        // entire fight) - drawPixelDashedRing bakes the handful
        // of distinct march positions once and just blits.
        drawPixelDashedRing(cx, cy, this.projectileRingRadius, {
            color: BOSS_RING.COLOR,
            alpha: pulse + 0.3,
            unit: 3,
            thickness: 2,
            dashOn: 3,
            dashOff: 2,
            phase: Math.floor(Date.now() / 60),
            glow: 10,
            glowColor: BOSS_RING.COLOR
        });

    }

    // Arcane shield around a damage-immune enemy (the Royal
    // Magus' honor guard) - HIS blue protection.

    drawImmuneRing() {

        const pulse = 0.6 + Math.sin(Date.now() / 170) * 0.25;

        drawPixelShield(
            this.x + this.size / 2,
            this.y + this.size / 2,
            this.size * 0.85,
            {
                color: "#5f7dff",
                glowColor: "#3d5af1",
                glintColor: "#c8d4ff",
                alpha: pulse,
                fillAlpha: 0.14
            }
        );

    }

    // Pale 1-hit ward bubble (Blood Cleric's shield, elite
    // grunt/skeleton/lancer wards) - pulses so it reads as
    // active magic about to pop.

    drawWardShield() {

        const pulse = 0.6 + Math.sin(Date.now() / 150) * 0.25;

        drawPixelShield(
            this.x + this.size / 2,
            this.y + this.size / 2,
            this.size * 0.8,
            {
                color: "#ffeccb",
                glowColor: "#ffe8c8",
                glintColor: "#ffffff",
                alpha: pulse,
                fillAlpha: 0.12
            }
        );

    }

    // Small heart icon above the enemy while charmed - offset
    // to the upper-right corner rather than dead-center so it
    // doesn't collide with boss name labels drawn there.

    drawCharmIndicator() {

        ctx.save();

        ctx.fillStyle = "#ff69b4";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "💗",
            this.x + this.size + 6,
            this.y - 2
        );

        ctx.restore();

    }

    // =====================================
    // Boss Enrage (visual only)
    // =====================================
    //
    // Null for anything that isn't a boss under
    // BOSS_ENRAGE.THRESHOLD health. Otherwise returns the
    // hot-shifted body color and a 0..1 pulse that beats
    // faster the closer the boss is to dying - so a long
    // scaled-HP fight visibly escalates instead of just
    // draining a bar.

    getEnrage() {

        if (!this.isBoss || this.maxHp <= 0)
            return null;

        const fraction = Math.max(0, this.hp / this.maxHp);

        if (fraction > BOSS_ENRAGE.THRESHOLD)
            return null;

        // 0 at the threshold -> 1 at death.
        const intensity = 1 - fraction / BOSS_ENRAGE.THRESHOLD;

        const period =
            BOSS_ENRAGE.PULSE_SLOW_MS +
            (BOSS_ENRAGE.PULSE_FAST_MS - BOSS_ENRAGE.PULSE_SLOW_MS) * intensity;

        const pulse = 0.5 + Math.sin(Date.now() / period) * 0.5;

        return {
            intensity,
            pulse,
            color: this.getHotColor(intensity, pulse)
        };

    }

    // Body color blended toward BOSS_ENRAGE.HOT_COLOR, with
    // the pulse riding on top so it visibly throbs.
    getHotColor(intensity, pulse) {

        const base = parseHexColor(this.color);

        if (!base)
            return this.color;

        const mix =
            BOSS_ENRAGE.MAX_TINT * intensity * (0.65 + pulse * 0.35);

        const blend = (from, to) =>
            Math.round(from + (to - from) * mix);

        return `rgb(${blend(base[0], BOSS_ENRAGE.HOT_COLOR[0])}, ` +
               `${blend(base[1], BOSS_ENRAGE.HOT_COLOR[1])}, ` +
               `${blend(base[2], BOSS_ENRAGE.HOT_COLOR[2])})`;

    }

    // Jagged fissures across the boss's plate, glowing from
    // within. Rolled ONCE per boss and cached in local 0..1
    // space, so they stay put on the body instead of skittering
    // every frame; more of them surface as it weakens.

    drawCracks(enrage) {

        if (!this.crackPaths)
            this.crackPaths = buildCrackPaths();

        const count = Math.max(
            1,
            Math.round(this.crackPaths.length * enrage.intensity)
        );

        ctx.save();

        ctx.lineCap = "round";
        ctx.shadowBlur = 6 + enrage.pulse * 8;
        ctx.shadowColor = BOSS_ENRAGE.CRACK_GLOW;

        for (let i = 0; i < count; i++) {

            const path = this.crackPaths[i];

            // Dark fissure with a hot core drawn over it.
            for (const pass of [
                { color: BOSS_ENRAGE.CRACK_COLOR, width: this.size * 0.035 },
                { color: BOSS_ENRAGE.CRACK_GLOW, width: this.size * 0.016 }
            ]) {

                ctx.strokeStyle = pass.color;
                ctx.lineWidth = Math.max(1, pass.width);
                ctx.globalAlpha = pass.color === BOSS_ENRAGE.CRACK_GLOW
                    ? 0.35 + enrage.pulse * 0.45
                    : 1;

                ctx.beginPath();

                path.forEach((point, index) => {

                    const px = this.x + point[0] * this.size;
                    const py = this.y + point[1] * this.size;

                    if (index === 0)
                        ctx.moveTo(px, py);
                    else
                        ctx.lineTo(px, py);

                });

                ctx.stroke();

            }

        }

        ctx.restore();

        ctx.globalAlpha = 1;

    }

    // Elite tank's protective aura - a broad gold dome so
    // "everything in here is unkillable, kill the tank" reads
    // at a glance.

    drawProtectAura() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulse = 0.3 + Math.sin(Date.now() / 300) * 0.1;

        // Broad blocky gold dome - filled disc for the zone plus
        // a marching dashed pixel rim.
        drawPixelDisc(cx, cy, this.auraRadius, {
            color: "#ffc83c",
            alpha: pulse * 0.14,
            unit: 6,
            dither: 0.5
        });

        drawPixelDashedRing(cx, cy, this.auraRadius, {
            color: "#ffd250",
            alpha: pulse + 0.25,
            unit: 4,
            dashOn: 3,
            dashOff: 2,
            phase: Math.floor(Date.now() / 50),
            glow: 8,
            glowColor: "#ffb020"
        });

    }

    drawEliteRing() {

        ctx.save();

        ctx.strokeStyle = ELITE.GLOW_COLOR;
        ctx.lineWidth = 3;

        ctx.shadowBlur = 15;
        ctx.shadowColor = ELITE.GLOW_COLOR;

        ctx.strokeRect(

            this.x - 4,

            this.y - 4,

            this.size + 8,

            this.size + 8

        );

        ctx.restore();

    }

    drawHealthBar() {

        ctx.fillStyle = "black";

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size,

            6

        );

        ctx.fillStyle = "lime";

        // Clamp the fill fraction to [0, 1] - an overkill hit
        // drives hp negative, and units that linger past that
        // (e.g. a fusing Powder Keg, whose isDead() is tied to
        // its explosion, not its hp) would otherwise draw a
        // negative-width bar extending off to the left.
        const hpFraction = Math.max(0, Math.min(1, this.hp / this.maxHp));

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size * hpFraction,

            6

        );

    }

}