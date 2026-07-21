// =====================================
// Mage Class (4th class) - Light zone-caster
// =====================================
//
// The defining twist: the Mage has NO dash (getDashSlotCount
// returns 0). Its only defense is the Halo ward. Its basic
// attack, Sunbeam, is not a projectile - it strikes light down
// at the CURSOR on a long, charge-based cooldown (the dash's
// charge pattern, reused). Every item piles onto that cursor-
// cast or the [E] light orb. All Light-themed. Kit:
//
//   - Halo (staged survivability, T3 Knight-gated): a ward
//     that blocks one hit then recharges. The whole defense.
//   - Sunburst (staged [E]): a lobbed orb of light, AOE burst.
//   - Sunstone (single): +Sunbeam damage & radius.
//   - Refraction / Solar Attunement (Castle Guard): a 2nd
//     Sunbeam charge / faster recharge.
//   - Radiant Overload / Radiant Bloom (Knight): every 3rd
//     cast overcharges / Sunbeam blooms into a sunflower.
//   - Sanctuary / Corona (Magus): Sunburst leaves a field /
//     a damaging aura keeps enemies off you.
//   - Sovereign's Scepter (King): +Sunbeam dmg + right-click
//     royal barrage of light beams.

// =====================================
// Late-Boss Resist
// =====================================
//
// Every point of damage the Mage deals - Sunbeam strikes,
// Prism burns and ice fields, Sunburst, Sanctuary, Corona,
// the Scepter barrage - is routed through here. Against the
// Royal Magus and the King it is scaled by
// MAGE.LATE_BOSS_DAMAGE_SCALE; against everything else it
// passes through untouched.
//
// Why those two specifically: the Mage's whole kit is
// persistent AREA damage, and a boss that is both huge and
// slow sits inside every zone at once, so all of it stacks on
// one target. Waves (the thing the zones are designed for)
// and the two smaller early bosses are unaffected.
//
// Floored at 1 so a 1-damage tick still lands rather than
// rounding away to nothing.

const MAGE_RESISTANT_BOSSES = new Set(["royalMagus", "king"]);

function mageDamageTo(enemy, amount) {

    if (!MAGE_RESISTANT_BOSSES.has(enemy.type))
        return amount;

    return Math.max(1, Math.round(amount * MAGE.LATE_BOSS_DAMAGE_SCALE));

}

class Mage extends Player {

    constructor() {

        super();

        // Sunbeam charges - same array pattern as the dash.
        // Slot 1 only exists once Refraction is equipped.
        this.sunbeamCooldowns = [0, 0];
        this.sunbeamCastCount = 0;

        // Elemental Prism: which element the CURRENT cast is
        // landing as ("fire" | "ice" | null), plus the active
        // burn stacks it has applied.
        this.castElement = null;
        this.burns = [];

        // Sunburst [E]
        this.sunburstCooldown = 0;

        // Halo ward - starts up, recharges on a timer once spent.
        this.wardReady = true;
        this.wardCooldown = 0;

        // Corona aura tick.
        this.coronaTimer = 0;

        // Sovereign's Scepter barrage.
        this.scepterCooldown = 0;
        this.scepterFlashTimer = 0;

    }

    // =====================================
    // Class Hooks
    // =====================================

    // The Mage's signature weakness: no dash at all.
    getDashSlotCount() { return 0; }

    getBodyGlowColor() {

        return (Save.isEquipped("halo") && this.wardReady)
            ? HALO.COLOR
            : null;

    }

    onAbilityKey() { this.castSunburst(); }

    onSecondaryFire() { this.fireBarrage(); }

    // The Halo ward soaks one hit, then goes on cooldown. This
    // is the Mage's entire survivability (no dodge, no phase).
    absorbHit() {

        if (!Save.isEquipped("halo") || !this.wardReady)
            return false;

        this.wardReady = false;
        this.wardCooldown = HALO.RECHARGE_MS[Save.equippedHaloStage] ?? HALO.RECHARGE_MS[1];
        this.invulnTimer = Math.max(this.invulnTimer, HALO.BLOCK_INVULN_MS);

        Sound.play("haloBreak");

        Game.screenShake = EFFECTS.SHAKE_ON_KILL;
        Particle.createHitBurst(this.x + this.size / 2, this.y + this.size / 2);

        return true;

    }

    hasAbilityButton() { return Save.isEquipped("sunburst"); }
    getAbilityButtonLabel() { return "ORB"; }
    hasSecondaryButton() { return Save.isEquipped("sovereignScepter"); }
    getSecondaryButtonLabel() { return "BARRAGE"; }

    updateAbilities() {

        // Sunbeam charge recharge.
        for (let i = 0; i < this.sunbeamCooldowns.length; i++) {
            if (this.sunbeamCooldowns[i] > 0)
                this.sunbeamCooldowns[i] -= Game.dt;
        }

        if (this.sunburstCooldown > 0)
            this.sunburstCooldown -= Game.dt;

        if (this.scepterCooldown > 0)
            this.scepterCooldown -= Game.dt;

        if (this.scepterFlashTimer > 0)
            this.scepterFlashTimer -= Game.dt;

        // Elemental Prism burn stacks.
        this.updateBurns();

        // Halo ward recharge.
        if (Save.isEquipped("halo") && !this.wardReady) {

            this.wardCooldown -= Game.dt;

            if (this.wardCooldown <= 0)
                this.wardReady = true;

        }

        // Corona aura - periodic damage to anything nearby.
        if (Save.isEquipped("corona")) {

            this.coronaTimer -= Game.dt;

            if (this.coronaTimer <= 0) {

                this.coronaTimer = CORONA.TICK_MS;
                this.coronaTick();

            }

        }

        // Hold-to-cast, like the Warrior's hold-to-swing.
        if (isMouseDown && Game.state === "playing")
            this.castSunbeam();

    }

    // =====================================
    // Sunbeam (basic - cursor cast)
    // =====================================

    getSunbeamChargeCount() {

        return 1 + (Save.isEquipped("refraction") ? REFRACTION.EXTRA_CHARGES : 0);

    }

    getSunbeamCooldown() {

        return MAGE.SUNBEAM_COOLDOWN * (
            Save.isEquipped("solarAttunement")
                ? SOLAR_ATTUNEMENT.COOLDOWN_MULTIPLIER
                : 1
        );

    }

    getSunbeamDamage() {

        let d = MAGE.SUNBEAM_DAMAGE;

        if (Save.isEquipped("sunstone"))
            d += SUNSTONE.BONUS_DAMAGE;

        if (Save.isEquipped("sovereignScepter"))
            d += SOVEREIGN_SCEPTER.BONUS_DAMAGE;

        return d;

    }

    getSunbeamRadius() {

        return MAGE.SUNBEAM_RADIUS + (Save.isEquipped("sunstone") ? SUNSTONE.BONUS_RADIUS : 0);

    }

    // Cursor on desktop; a point along the aim direction on
    // touch devices (no cursor there).
    getCastTarget() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        if (typeof MobileInput !== "undefined" && MobileInput.active) {
            return {
                x: cx + Math.cos(aimAngle) * MAGE.SUNBEAM_CAST_DISTANCE,
                y: cy + Math.sin(aimAngle) * MAGE.SUNBEAM_CAST_DISTANCE
            };
        }

        return { x: mouseX, y: mouseY };

    }

    castSunbeam() {

        const slots = this.getSunbeamChargeCount();

        let idx = -1;
        for (let i = 0; i < slots; i++) {
            if (this.sunbeamCooldowns[i] <= 0) { idx = i; break; }
        }

        if (idx === -1)
            return;

        const t = this.getCastTarget();

        this.sunbeamCastCount++;

        Sound.play("sunbeam");

        // Locked in before the strike so every branch of this
        // cast (strike FX, burn, ice field) agrees on it.
        this.castElement = this.getCastElement();

        const overloaded =
            Save.isEquipped("radiantOverload") &&
            (this.sunbeamCastCount % RADIANT_OVERLOAD.EVERY === 0);

        this.fireSunbeamAt(t.x, t.y, overloaded);

        this.sunbeamCooldowns[idx] = this.getSunbeamCooldown();

    }

    fireSunbeamAt(tx, ty, overloaded) {

        const dmg = this.getSunbeamDamage() * (overloaded ? RADIANT_OVERLOAD.DAMAGE_MULT : 1);
        const rad = this.getSunbeamRadius() * (overloaded ? RADIANT_OVERLOAD.RADIUS_MULT : 1);

        // Elemental Prism splits the light into fire and ice on
        // alternating casts (null = plain radiant strike when
        // the Prism isn't equipped). castElement() is decided
        // per cast in castSunbeam().
        this.strikeAt(tx, ty, dmg, rad, overloaded, this.castElement);

    }

    // Which element THIS cast lands as: "fire", "ice", or null
    // when the Elemental Prism isn't equipped. Alternates every
    // cast off the same counter that drives Radiant Overload.
    getCastElement() {

        if (!Save.isEquipped("elementalPrism"))
            return null;

        return (this.sunbeamCastCount % 2 === 1) ? "fire" : "ice";

    }

    // One strike: AOE damage everything within `radius` of the
    // point, plus a light-pillar FX. `element` layers the
    // Elemental Prism's payload on top - a burn on everything
    // caught (fire), or a lingering field on the ground (ice).
    strikeAt(x, y, damage, radius, big, element = null) {

        const crit = Math.random() < Save.getEquippedCritChance();
        const dealt = Math.max(1, Math.round(crit ? damage * 2 : damage));

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - x, ey - y) > radius)
                return;

            enemy.takeDamage(mageDamageTo(enemy, dealt), crit);

            if (enemy.isDead()) {

                onEnemyKilled(enemy);

                return;

            }

            // Fire: everything the strike caught burns. The
            // payoff scales with how many enemies were in the
            // zone, so a packed wave takes far more total
            // damage than a lone boss.
            if (element === "fire")
                this.addBurn(enemy);

        });

        Game.hazards.push(new SunbeamStrike(x, y, radius, big, element));

        // Ice: the ground itself freezes over, denying the
        // space and dragging anything in it to a crawl.
        if (element === "ice") {

            Game.hazards.push(new MageIceField(
                x, y,
                radius * ELEMENTAL_PRISM.ICE_RADIUS_MULT
            ));

        }

    }

    // =====================================
    // Elemental Prism - burns
    // =====================================
    //
    // Same shape as the Ranger's DoT list: one entry per
    // burning enemy, re-applying just refreshes the stack
    // rather than doubling it up.

    addBurn(enemy) {

        const existing = this.burns.find(b => b.enemy === enemy);

        if (existing) {

            existing.ticksLeft = ELEMENTAL_PRISM.BURN_TICKS;

            return;

        }

        this.burns.push({
            enemy,
            ticksLeft: ELEMENTAL_PRISM.BURN_TICKS,
            tickTimer: ELEMENTAL_PRISM.BURN_TICK_MS
        });

    }

    updateBurns() {

        this.burns = this.burns.filter(burn => {

            if (burn.enemy.isDead() || burn.ticksLeft <= 0)
                return false;

            burn.tickTimer -= Game.dt;

            if (burn.tickTimer <= 0) {

                burn.tickTimer += ELEMENTAL_PRISM.BURN_TICK_MS;
                burn.ticksLeft--;

                burn.enemy.takeDamage(
                    mageDamageTo(burn.enemy, ELEMENTAL_PRISM.BURN_DAMAGE)
                );

                if (burn.enemy.isDead()) {

                    onEnemyKilled(burn.enemy);

                    return false;

                }

            }

            return true;

        });

    }

    // =====================================
    // Sunburst ([E] - lobbed light orb)
    // =====================================

    castSunburst() {

        if (!Save.isEquipped("sunburst") || this.sunburstCooldown > 0)
            return;

        this.sunburstCooldown = SUNBURST.COOLDOWN;

        Sound.play("sunburst");

        const stage = Save.equippedSunburstStage;
        const t = this.getCastTarget();

        Game.hazards.push(new SunburstOrb(
            this.x + this.size / 2,
            this.y + this.size / 2,
            t.x, t.y,
            SUNBURST.DAMAGE[stage],
            SUNBURST.RADIUS[stage],
            Save.isEquipped("sanctuary")
        ));

    }

    // =====================================
    // Corona (aura)
    // =====================================

    coronaTick() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > CORONA.RADIUS)
                return;

            enemy.takeDamage(mageDamageTo(enemy, CORONA.TICK_DAMAGE));

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

    }

    // =====================================
    // Sovereign's Scepter (right-click barrage)
    // =====================================

    fireBarrage() {

        if (!Save.isEquipped("sovereignScepter") || this.scepterCooldown > 0)
            return;

        this.scepterCooldown = SOVEREIGN_SCEPTER.BARRAGE_COOLDOWN;
        this.scepterFlashTimer = SOVEREIGN_SCEPTER.BARRAGE_DURATION;

        Sound.play("laser");

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const crit = Math.random() < Save.getEquippedCritChance();
        const dmg = crit ? SOVEREIGN_SCEPTER.BARRAGE_DAMAGE * 2 : SOVEREIGN_SCEPTER.BARRAGE_DAMAGE;

        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const half = SOVEREIGN_SCEPTER.BEAM_WIDTH / 2;

        // Radial beams. An enemy is hit once even if it sits in
        // two overlapping beams near the center.
        const hit = new Set();

        for (let b = 0; b < SOVEREIGN_SCEPTER.BEAM_COUNT; b++) {

            const ang = (Math.PI * 2 / SOVEREIGN_SCEPTER.BEAM_COUNT) * b;
            const cos = Math.cos(-ang);
            const sin = Math.sin(-ang);

            Game.enemies.forEach(enemy => {

                if (enemy.isDead() || hit.has(enemy))
                    return;

                const dx = enemy.x + enemy.size / 2 - cx;
                const dy = enemy.y + enemy.size / 2 - cy;

                const lx = dx * cos - dy * sin;
                const ly = dx * sin + dy * cos;

                const pad = enemy.size / 2;

                if (lx >= -pad && lx <= length + pad && Math.abs(ly) <= half + pad) {

                    enemy.takeDamage(mageDamageTo(enemy, dmg), crit);
                    hit.add(enemy);

                    if (enemy.isDead())
                        onEnemyKilled(enemy);

                }

            });

        }

        Game.screenShake = Math.max(Game.screenShake, 10);

    }

    // =====================================
    // HUD
    // =====================================

    getHUDStatusLines() {

        const lines = [];

        const slots = this.getSunbeamChargeCount();
        let ready = 0;
        for (let i = 0; i < slots; i++)
            if (this.sunbeamCooldowns[i] <= 0) ready++;

        lines.push({
            text: `Sunbeam: ${ready}/${slots}`,
            color: ready > 0 ? "white" : "#888"
        });

        // Elemental Prism - which element the NEXT cast lands
        // as, so the rotation can actually be played around.
        if (Save.isEquipped("elementalPrism")) {

            const next = (this.sunbeamCastCount % 2 === 0) ? "Fire" : "Ice";

            lines.push({
                text: `Prism: ${next}`,
                color: next === "Fire"
                    ? ELEMENTAL_PRISM.FIRE_COLOR
                    : ELEMENTAL_PRISM.ICE_COLOR
            });

        }

        if (Save.isEquipped("sunburst")) {
            lines.push({
                text: `Sunburst: ${this.sunburstCooldown > 0 ? (this.sunburstCooldown / 1000).toFixed(1) + "s" : "READY [E]"}`,
                color: "white"
            });
        }

        if (Save.isEquipped("halo")) {
            lines.push({
                text: `Halo: ${this.wardReady ? "UP" : (this.wardCooldown / 1000).toFixed(1) + "s"}`,
                color: this.wardReady ? "#ffe98a" : "#888"
            });
        }

        if (Save.isEquipped("sovereignScepter")) {
            lines.push({
                text: `Barrage: ${this.scepterCooldown > 0 ? (this.scepterCooldown / 1000).toFixed(1) + "s" : "READY [RMB]"}`,
                color: "white"
            });
        }

        return lines;

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (Save.isEquipped("corona"))
            this.drawCorona();

        this.drawBody();

        this.drawStaff();

        if (Save.isEquipped("halo") && this.wardReady)
            this.drawWard();

        if (this.scepterFlashTimer > 0)
            this.drawBarrage();

    }

    drawStaff() {

        const sx = this.x + this.size + 4;
        const topY = this.y - 8;
        const bottomY = this.y + this.size + 2;

        ctx.save();

        ctx.strokeStyle = "#6b5a3a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx - 5, bottomY);
        ctx.lineTo(sx + 3, topY);
        ctx.stroke();

        const pulse = 0.7 + Math.sin(Date.now() / 200) * 0.25;

        ctx.shadowBlur = 16;
        ctx.shadowColor = MAGE.COLOR;
        ctx.fillStyle = `rgba(255, 245, 180, ${pulse})`;
        ctx.beginPath();
        ctx.arc(sx + 4, topY - 8, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(sx + 2, topY - 10, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

    drawWard() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulse = 0.5 + Math.sin(Date.now() / 160) * 0.2;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 240, 170, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = HALO.COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, this.size * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

    }

    drawCorona() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulse = 0.4 + Math.sin(Date.now() / 220) * 0.12;

        ctx.save();

        const grad = ctx.createRadialGradient(cx, cy, CORONA.RADIUS * 0.3, cx, cy, CORONA.RADIUS);
        grad.addColorStop(0, `rgba(255, 210, 90, ${0.12 * pulse})`);
        grad.addColorStop(1, "rgba(255, 210, 90, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, CORONA.RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 220, 120, ${0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, CORONA.RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

    }

    drawBarrage() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const fade = Math.max(0, this.scepterFlashTimer / SOVEREIGN_SCEPTER.BARRAGE_DURATION);
        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const width = SOVEREIGN_SCEPTER.BEAM_WIDTH;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.shadowBlur = 20;
        ctx.shadowColor = SOVEREIGN_SCEPTER.COLOR;

        for (let b = 0; b < SOVEREIGN_SCEPTER.BEAM_COUNT; b++) {

            const ang = (Math.PI * 2 / SOVEREIGN_SCEPTER.BEAM_COUNT) * b;

            ctx.save();
            ctx.rotate(ang);

            const grad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
            grad.addColorStop(0, "rgba(255, 224, 102, 0)");
            grad.addColorStop(0.5, `rgba(255, 250, 210, ${0.9 * fade})`);
            grad.addColorStop(1, "rgba(255, 224, 102, 0)");

            ctx.fillStyle = grad;
            ctx.fillRect(0, -width / 2, length, width);

            ctx.restore();

        }

        ctx.restore();

    }

}

// Register with the class selector (see PLAYER_CLASSES in
// game.js and CLASSES in constants.js).
PLAYER_CLASSES.mage = Mage;

// =====================================
// Sunbeam Strike - FX
// =====================================
//
// Visual only (damage lands in Mage.strikeAt / SunburstOrb): a
// radiant ground ring plus a shaft of light falling from above.

class SunbeamStrike {

    // element: "fire" | "ice" | null (plain radiant light) -
    // recolors the whole strike so the Prism's rotation reads
    // at a glance.
    constructor(x, y, radius, big, element = null) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.big = big;
        this.element = element;
        this.life = 12;
        this.maxLife = 12;

    }

    update() { this.life -= Game.timeScale; }

    isDead() { return this.life <= 0; }

    // [fill, ring, shaft] rgb triplets for this strike's
    // element.
    getPalette() {

        if (this.element === "fire")
            return ["255, 150, 60", "255, 110, 40", "255, 140, 60"];

        if (this.element === "ice")
            return ["180, 235, 255", "140, 220, 255", "170, 230, 255"];

        return ["255, 250, 210", "255, 240, 160", "255, 245, 180"];

    }

    draw() {

        const fade = Math.max(0, this.life / this.maxLife);
        const [fill, ring, shaft] = this.getPalette();

        ctx.save();

        ctx.fillStyle = `rgba(${fill}, ${0.28 * fade})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${ring}, ${fade})`;
        ctx.lineWidth = this.big ? 5 : 3;
        ctx.shadowBlur = 16;
        ctx.shadowColor =
            this.element === "fire" ? ELEMENTAL_PRISM.FIRE_COLOR :
            this.element === "ice" ? ELEMENTAL_PRISM.ICE_COLOR :
            MAGE.COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Shaft of light dropping in from above.
        const grad = ctx.createLinearGradient(this.x, this.y - 280, this.x, this.y);
        grad.addColorStop(0, `rgba(${shaft}, 0)`);
        grad.addColorStop(1, `rgba(${shaft}, ${0.5 * fade})`);

        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.radius * 0.5, this.y - 280, this.radius, 280);

        ctx.restore();

    }

}

// =====================================
// Sunburst Orb - lobbed [E]
// =====================================
//
// Flies from the Mage to the aimed point, then bursts in an
// AOE. With Sanctuary equipped it leaves a lingering field.

class SunburstOrb {

    constructor(sx, sy, tx, ty, damage, radius, leavesField) {

        this.x = sx;
        this.y = sy;
        this.tx = tx;
        this.ty = ty;
        this.damage = damage;
        this.radius = radius;
        this.leavesField = leavesField;
        this.exploded = false;

        const dx = tx - sx;
        const dy = ty - sy;
        this.dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / this.dist) * SUNBURST.TRAVEL_SPEED;
        this.vy = (dy / this.dist) * SUNBURST.TRAVEL_SPEED;
        this.traveled = 0;

    }

    update() {

        if (this.exploded)
            return;

        this.x += this.vx * Game.timeScale;
        this.y += this.vy * Game.timeScale;
        this.traveled += SUNBURST.TRAVEL_SPEED * Game.timeScale;

        if (this.traveled >= this.dist)
            this.explode();

    }

    explode() {

        this.exploded = true;

        const crit = Math.random() < Save.getEquippedCritChance();
        const dealt = crit ? this.damage * 2 : this.damage;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - this.tx, ey - this.ty) > this.radius)
                return;

            enemy.takeDamage(mageDamageTo(enemy, dealt), crit);

            // The shove is the point - it's the only way a
            // dashless Mage makes space. Anchored foes (tanks,
            // casters, bosses) are knockback-immune and ignore
            // it, same as every other knockback in the game.
            enemy.applyKnockback(this.tx, this.ty, SUNBURST.KNOCKBACK);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        Game.screenShake = Math.max(Game.screenShake, 6);

        Particle.createHitBurst(this.tx, this.ty);
        Game.hazards.push(new SunbeamStrike(this.tx, this.ty, this.radius, true));

        if (this.leavesField)
            Game.hazards.push(new SanctuaryField(this.tx, this.ty, this.radius));

    }

    isDead() { return this.exploded; }

    draw() {

        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = SUNBURST.COLOR;

        ctx.fillStyle = SUNBURST.COLOR;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// Sanctuary Field - lingering radiant zone
// =====================================

class SanctuaryField {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.life = SANCTUARY.DURATION_MS;
        this.tickTimer = 0;

    }

    update() {

        this.life -= Game.dt;
        this.tickTimer -= Game.dt;

        if (this.tickTimer <= 0) {

            this.tickTimer = SANCTUARY.TICK_MS;

            Game.enemies.forEach(enemy => {

                if (enemy.isDead())
                    return;

                const ex = enemy.x + enemy.size / 2;
                const ey = enemy.y + enemy.size / 2;

                if (Math.hypot(ex - this.x, ey - this.y) > this.radius)
                    return;

                enemy.takeDamage(mageDamageTo(enemy, SANCTUARY.TICK_DAMAGE));

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            });

        }

    }

    isDead() { return this.life <= 0; }

    draw() {

        const fade = Math.min(1, this.life / 800);
        const flicker = 0.8 + Math.sin(Date.now() / 130) * 0.15;

        ctx.save();

        const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.1, this.x, this.y, this.radius);
        grad.addColorStop(0, `rgba(255, 240, 170, ${0.35 * fade * flicker})`);
        grad.addColorStop(1, "rgba(255, 210, 90, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 235, 150, ${0.5 * fade})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

    }

}
