// =====================================
// Ranger Class
// =====================================
//
// A kiting-focused class whose bow IS the primary attack -
// hold attack to fire arrows on cooldown, no purchase
// needed. Kit (see the Ranger section of SHOP_ITEMS):
//
//   - Bracelet line: -20%/-35%/-50% dash cooldown (Sylph's
//     Bracelet stage Knight-gated like the Bulwark shield)
//   - Talon Dagger line: close-range [E] stab (Shortsword
//     extends reach, Venom Blade injects venom)
//   - Emberweave Arrows: burn DoT on arrow hits
//   - Falcon Quiver / Swiftdraw Gloves (first-boss tier):
//     piercing arrows / faster fire rate
//   - Hunter's Mark / Gale Recurve (Knight tier): +50%
//     damage marks / 2-arrow fan
//   - Stormpiercer (King tier): 2 dmg arrows + right-click
//     storm lance
//
// Burns/venom are ticked player-side in updateDots() so
// enemy.js stays untouched.

class Ranger extends Player {

    constructor() {

        super();

        // Bow (class weapon - hold attack to fire)

        this.bowCooldown = 0;

        // Talon Dagger ([E] ability)

        this.daggerCooldown = 0;
        this.daggerSwing = false;
        this.daggerTimer = 0;
        this.daggerAngle = 0;

        // Stormpiercer storm lance (right-click ability)

        this.stormCooldown = 0;
        this.stormLaserTimer = 0;
        this.stormLaserAngle = 0;

        // Active damage-over-time effects (Emberweave burns,
        // Serpent Fang venom) - one entry per (enemy, type).
        this.dots = [];

    }

    // =====================================
    // Class Hooks
    // =====================================

    updateAbilities() {

        if (this.bowCooldown > 0)
            this.bowCooldown -= Game.dt;

        if (this.daggerCooldown > 0)
            this.daggerCooldown -= Game.dt;

        if (this.stormCooldown > 0)
            this.stormCooldown -= Game.dt;

        if (this.stormLaserTimer > 0)
            this.stormLaserTimer -= Game.dt;

        // Dagger swing is purely cosmetic - damage lands
        // instantly in daggerStrike(), this just times the
        // slash animation.
        if (this.daggerSwing) {

            this.daggerTimer -= Game.dt;

            if (this.daggerTimer <= 0)
                this.daggerSwing = false;

        }

        // Hold-to-fire, mirroring the Warrior's hold-to-swing.
        if (isMouseDown && Game.state === "playing")
            this.fireBow();

        this.updateDots();

    }

    getDashCooldown() {

        if (!Save.isEquipped("bracelet"))
            return DASH.COOLDOWN;

        const stage = Math.min(3, Save.equippedBraceletStage);

        return DASH.COOLDOWN * (1 - BRACELET.COOLDOWN_REDUCTION[stage]);

    }

    // Cyclone Veil - the dash releases an outward gust that
    // shoves nearby enemies back (respecting knockback immunity,
    // so heavy/anchored foes ignore it). Pure disengage, no
    // damage.
    onDash(dx, dy, startX, startY) {

        if (!Save.isEquipped("cycloneVeil"))
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > CYCLONE_VEIL.RADIUS)
                return;

            enemy.applyKnockback(cx, cy, CYCLONE_VEIL.KNOCKBACK_FORCE);

        });

        Game.hazards.push(new CycloneBurst(cx, cy, CYCLONE_VEIL.RADIUS));

    }

    onAbilityKey() {

        this.daggerStrike();

    }

    onSecondaryFire() {

        this.fireStormLance();

    }

    onProjectileHit(enemy) {

        if (Save.isEquipped("emberArrows"))
            this.addDot(
                enemy,
                "burn",
                EMBER_ARROWS.BURN_TICKS,
                EMBER_ARROWS.BURN_TICK_MS,
                EMBER_ARROWS.BURN_DAMAGE_PER_TICK
            );

        if (Save.isEquipped("huntersMark"))
            enemy.hunterMarkUntil = Game.elapsedTime + HUNTERS_MARK.DURATION_MS;

        if (Save.isEquipped("stormfletch"))
            this.stormfletchProc(enemy);

    }

    getProjectileDamageMultiplier(enemy) {

        return this.isMarked(enemy)
            ? HUNTERS_MARK.DAMAGE_MULTIPLIER
            : 1;

    }

    hasAbilityButton() { return Save.isEquipped("dagger"); }
    getAbilityButtonLabel() { return "DAGGER"; }
    hasSecondaryButton() { return Save.isEquipped("stormpiercer"); }
    getSecondaryButtonLabel() { return "STORM"; }

    getHUDStatusLines() {

        const lines = [];

        if (Save.isEquipped("dagger")) {

            let daggerText = "READY [E]";
            if (this.daggerCooldown > 0) {
                const realDaggerSecs = (this.daggerCooldown / 1000).toFixed(1);
                daggerText = `${realDaggerSecs}s`;
            }

            lines.push({
                text: `Dagger: ${daggerText}`,
                color: "white"
            });

        }

        if (Save.isEquipped("stormpiercer")) {

            let stormText = "READY [RMB]";
            if (this.stormCooldown > 0) {
                const realStormSecs = (this.stormCooldown / 1000).toFixed(1);
                stormText = `${realStormSecs}s`;
            }

            lines.push({
                text: `Storm Lance: ${stormText}`,
                color: "white"
            });

        }

        return lines;

    }

    // =====================================
    // Hunter's Mark
    // =====================================
    //
    // Marks live as a plain expiry timestamp stamped onto the
    // enemy instance (no per-frame countdown needed, and
    // enemy.js stays untouched). Marked enemies take +50%
    // damage from every Ranger source, rounded up so 1-damage
    // arrows still gain a full point.

    isMarked(enemy) {

        return (enemy.hunterMarkUntil ?? 0) > Game.elapsedTime;

    }

    applyMark(damage, enemy) {

        if (!this.isMarked(enemy))
            return damage;

        return Math.ceil(damage * HUNTERS_MARK.DAMAGE_MULTIPLIER);

    }

    // =====================================
    // Bow
    // =====================================

    fireBow() {

        if (this.bowCooldown > 0)
            return;

        Sound.play("bowShot");

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const arrowCount = Save.isEquipped("galeRecurve")
            ? GALE_RECURVE.ARROW_COUNT
            : 1;

        const spread = RANGER_BOW.FAN_SPREAD;
        const startAngle = aimAngle - (arrowCount - 1) * spread / 2;

        const storm = Save.isEquipped("stormpiercer");

        const baseDamage = storm
            ? STORMPIERCER.BASE_DAMAGE
            : RANGER_BOW.DAMAGE;

        const pierce = Save.isEquipped("falconQuiver")
            ? FALCON_QUIVER.PIERCE
            : 1;

        for (let i = 0; i < arrowCount; i++) {

            const angle = startAngle + i * spread;

            const critical = Math.random() < Save.getEquippedCritChance();
            const damage = critical ? baseDamage * 2 : baseDamage;

            Game.projectiles.push(new Projectile(

                cx + Math.cos(angle) * 28,
                cy + Math.sin(angle) * 28,
                angle,

                {
                    owner: "player",
                    speed: RANGER_BOW.SPEED,
                    damage: damage,
                    size: RANGER_BOW.SIZE,
                    color: storm ? STORMPIERCER.ARROW_COLOR : RANGER_BOW.COLOR,
                    life: 171,
                    crit: critical,
                    isArrow: true,
                    pierce: pierce
                }

            ));

        }

        this.bowCooldown = RANGER_BOW.COOLDOWN * (
            Save.isEquipped("swiftdrawGloves")
                ? SWIFTDRAW.COOLDOWN_MULTIPLIER
                : 1
        );

    }

    // =====================================
    // Talon Dagger ([E] ability)
    // =====================================

    getDaggerRange() {

        return Save.equippedDaggerStage >= 2
            ? DAGGER.SHORTSWORD_RANGE
            : DAGGER.RANGE;

    }

    daggerStrike() {

        if (!Save.isEquipped("dagger"))
            return;

        if (this.daggerCooldown > 0)
            return;

        this.daggerCooldown = DAGGER.COOLDOWN;

        this.daggerSwing = true;
        this.daggerTimer = DAGGER.SWING_MS;
        this.daggerAngle = aimAngle;

        Sound.play("daggerSwing");

        // Stage 1 (Talon Dagger) is the base stab; stage 2
        // (Shortsword) extends the reach; stage 3 (Venom
        // Blade) keeps that reach and injects venom on top.
        const range = this.getDaggerRange();
        const venom = Save.equippedDaggerStage >= 3;

        const px = this.x + this.size / 2;
        const py = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            // Closest point on the enemy box, same hit test
            // as the Warrior's sword.
            const closestX = Math.max(enemy.x, Math.min(px, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(py, enemy.y + enemy.size));

            const dx = closestX - px;
            const dy = closestY - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > range)
                return;

            const angleToEnemy = Math.atan2(dy, dx);

            let angleDifference = Math.abs(angleToEnemy - this.daggerAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            if (angleDifference > DAGGER.ARC / 2)
                return;

            const critical = Math.random() < Save.getEquippedCritChance();
            const damage = critical ? DAGGER.DAMAGE * 2 : DAGGER.DAMAGE;

            enemy.takeDamage(this.applyMark(damage, enemy), critical);

            enemy.applyKnockback(px, py, 9.8);

            if (venom)
                this.addDot(
                    enemy,
                    "venom",
                    DAGGER.VENOM_TICKS,
                    DAGGER.VENOM_TICK_MS,
                    DAGGER.VENOM_DAMAGE_PER_TICK
                );

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

    }

    // =====================================
    // Stormpiercer Storm Lance (right-click ability)
    // =====================================
    //
    // Same instant line-hit shape as the Warrior's King's
    // Blade laser, recolored into a lightning lance.

    fireStormLance() {

        if (!Save.isEquipped("stormpiercer"))
            return;

        if (this.stormCooldown > 0)
            return;

        this.stormCooldown = STORMPIERCER.LASER_COOLDOWN;
        this.stormLaserAngle = aimAngle;
        this.stormLaserTimer = STORMPIERCER.LASER_DURATION;

        Sound.play("laser");

        const critical = Math.random() < Save.getEquippedCritChance();
        const damage = critical
            ? STORMPIERCER.LASER_DAMAGE * 2
            : STORMPIERCER.LASER_DAMAGE;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // Long enough to clear the map in any direction from
        // any position - same trick used by the King's beam.
        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const halfWidth = STORMPIERCER.LASER_WIDTH / 2;

        const cos = Math.cos(-this.stormLaserAngle);
        const sin = Math.sin(-this.stormLaserAngle);

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            const dx = ex - cx;
            const dy = ey - cy;

            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const pad = enemy.size / 2;

            if (

                localX >= -pad &&
                localX <= length + pad &&
                Math.abs(localY) <= halfWidth + pad

            ) {

                enemy.takeDamage(this.applyMark(damage, enemy), critical);

                enemy.applyKnockback(cx, cy, critical ? 11.2 : 8.4);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    // =====================================
    // Damage Over Time (burn/venom)
    // =====================================

    // One DoT entry per (enemy, type) - re-applying refreshes
    // the tick count instead of stacking, so the fast-firing
    // bow can't pile unbounded burns onto one target.
    addDot(enemy, type, ticks, tickMs, damagePerTick) {

        const existing = this.dots.find(
            dot => dot.enemy === enemy && dot.type === type
        );

        if (existing) {

            existing.ticksLeft = ticks;

            return;

        }

        this.dots.push({
            enemy,
            type,
            ticksLeft: ticks,
            tickTimer: tickMs,
            tickMs,
            damagePerTick
        });

    }

    updateDots() {

        this.dots = this.dots.filter(dot => {

            if (dot.enemy.isDead() || dot.ticksLeft <= 0)
                return false;

            dot.tickTimer -= Game.dt;

            if (dot.tickTimer <= 0) {

                dot.tickTimer += dot.tickMs;
                dot.ticksLeft--;

                dot.enemy.takeDamage(this.applyMark(dot.damagePerTick, dot.enemy));

                if (dot.enemy.isDead()) {

                    onEnemyKilled(dot.enemy);

                    return false;

                }

            }

            return true;

        });

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (this.stormLaserTimer > 0)
            this.drawStormLance();

        this.drawBody();

        this.drawBow();

        if (this.daggerSwing)
            this.drawDagger();

        this.drawMarkIndicators();

    }

    // A small recurve held out toward the aim direction.
    drawBow() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const storm = Save.isEquipped("stormpiercer");

        ctx.save();

        ctx.translate(cx, cy);
        ctx.rotate(aimAngle);

        if (storm) {

            ctx.shadowBlur = 10;
            ctx.shadowColor = STORMPIERCER.LASER_COLOR;

        }

        const bowX = this.size * 0.75 - 12;
        const limbRadius = 16;
        const limbArc = Math.PI / 2.4;

        // Limbs - an arc bowing away from the player
        ctx.strokeStyle = storm ? STORMPIERCER.ARROW_COLOR : "#8b5a2b";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(bowX, 0, limbRadius, -limbArc, limbArc);
        ctx.stroke();

        // String - a chord between the limb tips
        const tipX = bowX + Math.cos(limbArc) * limbRadius;
        const tipY = Math.sin(limbArc) * limbRadius;

        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tipX, -tipY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        ctx.restore();

    }

    drawDagger() {

        const progress = 1 - this.daggerTimer / DAGGER.SWING_MS;

        const arc = DAGGER.ARC;
        const angle = this.daggerAngle - arc / 2 + arc * progress;

        const venom = Save.equippedDaggerStage >= 3;

        // Shortsword/Venom Blade stages read visually longer,
        // roughly tracking the upgraded reach.
        const bladeTip = Save.equippedDaggerStage >= 2 ? 90 : 48;

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        ctx.rotate(angle);

        ctx.shadowBlur = 10;
        ctx.shadowColor = venom ? "#2ecc71" : "#dfe6e9";

        // Tapered blade
        ctx.fillStyle = venom ? "#a9dfbf" : "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(18, -3);
        ctx.lineTo(bladeTip, 0);
        ctx.lineTo(18, 3);
        ctx.closePath();
        ctx.fill();

        // Guard + wrapped grip
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#34495e";
        ctx.fillRect(15, -5, 3, 10);

        ctx.fillStyle = "#5c4033";
        ctx.fillRect(4, -2, 11, 4);

        ctx.restore();

    }

    drawStormLance() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const width = STORMPIERCER.LASER_WIDTH;

        const fade = Math.max(
            0,
            this.stormLaserTimer / STORMPIERCER.LASER_DURATION
        );

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.stormLaserAngle);

        ctx.shadowBlur = 18;
        ctx.shadowColor = STORMPIERCER.LASER_COLOR;

        drawPixelBeam(length, width, {
            color: STORMPIERCER.LASER_COLOR,
            coreColor: "#f2ecff",
            alpha: 0.95 * fade,
            unit: Math.max(3, Math.round(width * 0.2))
        });

        ctx.restore();

    }

    drawMarkIndicators() {

        if (!Save.isEquipped("huntersMark"))
            return;

        Game.enemies.forEach(enemy => {

            if (!this.isMarked(enemy))
                return;

            ctx.save();

            ctx.fillStyle = HUNTERS_MARK.COLOR;
            ctx.font = `${Math.max(14, enemy.size * 0.4)}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("▼", enemy.x + enemy.size / 2, enemy.y - 6);

            ctx.restore();

        });

    }

    // =====================================
    // Stormfletch Arrows
    // =====================================
    //
    // On each arrow hit, arc lightning to the nearest OTHER
    // enemy for a little damage. If the struck target is under
    // a Hunter's Mark, escalate into a small AOE strike centered
    // on it instead - the Knight-tier mark's payoff.

    stormfletchProc(hitEnemy) {

        const ex = hitEnemy.x + hitEnemy.size / 2;
        const ey = hitEnemy.y + hitEnemy.size / 2;

        if (this.isMarked(hitEnemy)) {

            Game.enemies.forEach(e => {

                // Bosses are lightning-immune (see boss ctors).
                if (e.isDead() || e.lightningImmune)
                    return;

                const cx = e.x + e.size / 2;
                const cy = e.y + e.size / 2;

                if (Math.hypot(cx - ex, cy - ey) > STORMFLETCH.STRIKE_RADIUS)
                    return;

                e.takeDamage(this.applyMark(STORMFLETCH.STRIKE_DAMAGE, e));

                if (e.isDead())
                    onEnemyKilled(e);

            });

            Game.hazards.push(new StormfletchZap(
                ex, ey - 170, ex, ey, STORMFLETCH.STRIKE_RADIUS
            ));

            Sound.playAt("lightningChain", ex, ey);

            return;

        }

        // Unmarked -> single chain to the nearest other enemy.
        let target = null;
        let best = STORMFLETCH.CHAIN_RANGE;

        Game.enemies.forEach(e => {

            // Bosses are lightning-immune, so lightning never
            // chains to them (see boss ctors).
            if (e === hitEnemy || e.isDead() || e.lightningImmune)
                return;

            const cx = e.x + e.size / 2;
            const cy = e.y + e.size / 2;
            const d = Math.hypot(cx - ex, cy - ey);

            if (d < best) {
                best = d;
                target = e;
            }

        });

        if (!target)
            return;

        const tx = target.x + target.size / 2;
        const ty = target.y + target.size / 2;

        Sound.playAt("lightningChain", tx, ty);

        target.takeDamage(this.applyMark(STORMFLETCH.CHAIN_DAMAGE, target));

        if (target.isDead())
            onEnemyKilled(target);

        Game.hazards.push(new StormfletchZap(ex, ey, tx, ty));

    }

}

// Register with the class selector (see PLAYER_CLASSES in
// game.js and CLASSES in constants.js).
PLAYER_CLASSES.ranger = Ranger;

// =====================================
// Stormfletch Arrows - lightning FX
// =====================================
//
// Visual only (damage is dealt in Ranger.stormfletchProc): a
// jagged bolt from (from) to (to), plus an optional AOE ring at
// the target for the marked-strike variant.

class StormfletchZap {

    constructor(fromX, fromY, toX, toY, radius = 0) {

        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.radius = radius;
        this.life = 10;
        this.maxLife = 10;

    }

    update() {
        this.life -= Game.timeScale;
    }

    isDead() {
        return this.life <= 0;
    }

    draw() {

        const fade = Math.max(0, this.life / this.maxLife);

        ctx.save();

        ctx.strokeStyle = `rgba(210, 225, 255, ${fade})`;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = STORMFLETCH.COLOR;

        ctx.beginPath();
        ctx.moveTo(this.fromX, this.fromY);

        const segs = 5;
        for (let i = 1; i < segs; i++) {

            const t = i / segs;

            ctx.lineTo(
                this.fromX + (this.toX - this.fromX) * t + (Math.random() - 0.5) * 16,
                this.fromY + (this.toY - this.fromY) * t + (Math.random() - 0.5) * 16
            );

        }

        ctx.lineTo(this.toX, this.toY);
        ctx.stroke();

        if (this.radius > 0) {

            ctx.fillStyle = `rgba(180, 205, 255, ${fade * 0.28})`;
            ctx.beginPath();
            ctx.arc(this.toX, this.toY, this.radius, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.restore();

    }

}

// =====================================
// Cyclone Veil - wind gust FX
// =====================================
//
// Visual only (the knockback is applied in Ranger.onDash): an
// expanding ring with a few swirl arcs so it reads as wind
// rather than a shockwave.

class CycloneBurst {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.life = 14;
        this.maxLife = 14;

    }

    update() {
        this.life -= Game.timeScale;
    }

    isDead() {
        return this.life <= 0;
    }

    draw() {

        const progress = 1 - this.life / this.maxLife;
        const fade = this.life / this.maxLife;
        const r = this.maxRadius * progress;

        ctx.save();

        ctx.strokeStyle = `rgba(220, 240, 255, ${0.6 * fade})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#daf0ff";

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 2;

        for (let i = 0; i < 4; i++) {

            const a = (Math.PI / 2) * i + progress * 2;

            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 0.7, a, a + 0.8);
            ctx.stroke();

        }

        ctx.restore();

    }

}
