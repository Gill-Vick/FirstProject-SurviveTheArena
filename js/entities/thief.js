// =====================================
// Thief Class
// =====================================
//
// A fast, aggressive melee class - dual daggers (hold attack)
// are a short, quick version of the Warrior's sword swing:
// 70% of its reach, noticeably faster attack speed. Kit (see
// the Thief section of SHOP_ITEMS):
//
//   - Cloak line: dashing grants phase i-frames (Tattered/
//     Shadow/Phantom, moved over from the Ranger keeping its
//     original effect); Phantom stage also damages anything
//     the dash passes through, Knight-gated like the Bulwark
//     shield
//   - Throwing Knife line: [E] ranged option - Throwing Knife
//     (slow) -> Wind Knife (fast, +1 dmg) -> Heart Stealer
//     (same knife, but a second [E] press within a short
//     window blinks the Thief to where it landed)
//   - Thief's Wit: hits grant a short move/attack speed buff
//   - Void Enchant / Master of the Blade (Castle Guard tier)
//   - Shadowreach Blades / Thief's Pocket Watch (Knight tier):
//     +1 dagger damage & range / hits shave time off cooldowns
//   - Moonlight Daggers (King tier): +1 dagger damage, a 2nd
//     dash charge, and a lingering flame trail on every swing

class Thief extends Player {

    constructor() {

        super();

        // Dual daggers (class weapon - hold attack to swing)

        this.daggerSwing = false;
        this.daggerAngle = 0;
        this.daggerTimer = 0;
        this.swingProgress = 0;

        // Every completed swing increments this - Master of
        // the Blade triggers on every 3rd one.
        this.daggerSwingCount = 0;

        // Which side the next swing draws its blade from -
        // alternates -1 (left) / 1 (right) each swing.
        this.daggerSide = -1;

        // Throwing Knife ([E] ability)

        this.knifeCooldown = 0;

        // Heart Stealer's re-press-to-teleport window. `ready`
        // flips true once the in-flight knife has resolved
        // (hit or expired) and we know where to blink to.
        this.pendingTeleport = null;

        // Thief's Wit - refreshed on every landed hit.
        this.witTimer = 0;

        // Void Enchant marks - one entry per marked enemy,
        // storing damage taken until it detonates.
        this.voidMarks = [];

        // Master of the Blade flurries currently ticking.
        this.stormBursts = [];

        // Moonlight Daggers' flame trail patches, one per
        // swing while equipped.
        this.flameTrails = [];

        this.initBossGear();

    }

    // =====================================
    // Class Hooks
    // =====================================

    // Act II boss gear state. Split out of the constructor
    // (which calls it) purely so the block reads as one unit.
    initBossGear() {

        // Rosethorn Edge - seeds on a fuse, one per target.
        this.rosethorns = [];

        // Briar Cloak / Sapwell - their own beats.
        this.briarTick = 0;
        this.sapwellTimer = SAPWELL.INTERVAL_MS;

        // Ascendant Cloak - milliseconds of guaranteed crit
        // left after coming out of a dash.
        this.ascendantTimer = 0;

    }

    getCurrentSpeed() {

        return this.speed * this.getWitSpeedMultiplier();

    }

    getDashSlotCount() {

        return Save.isEquipped("moonlightDaggers") ? 2 : 1;

    }

    getBodyGlowColor() {

        // Phase glow while the cloak's dash i-frames are live.
        return this.invulnTimer > 0 && Save.isEquipped("cloak")
            ? CLOAK.GLOW_COLOR
            : null;

    }

    // Purple phantom bubble during the cloak's phase window -
    // pulses faster than the others, so it reads as a fleeting
    // dodge state rather than a standing shield.
    getShieldAura() {

        return this.invulnTimer > 0 && Save.isEquipped("cloak")
            ? {
                color: "#b06ae0",
                glowColor: CLOAK.GLOW_COLOR,
                glintColor: "#ead4ff",
                pulseMs: 130
            }
            : null;

    }

    updateAbilities() {

        this.updateBossGear();

        if (this.knifeCooldown > 0)
            this.knifeCooldown -= Game.dt;

        if (this.witTimer > 0)
            this.witTimer -= Game.dt;

        this.updatePendingTeleport();

        // Dagger swing is purely cosmetic timing - damage
        // lands instantly in swingDaggers(), this just runs
        // the slash animation and (via the "hold" check below)
        // chains the next swing once it finishes.
        if (this.daggerSwing) {

            this.daggerTimer -= Game.timeScale;

            this.swingProgress =
                1 - (this.daggerTimer / this.getSwingDuration());

            if (this.daggerTimer <= 0)
                this.daggerSwing = false;

        }

        if (isMouseDown && Game.state === "playing")
            this.swingDaggers();

        this.updateVoidMarks();

        this.updateStormBursts();

        this.updateFlameTrails();

    }

    onAbilityKey() {

        // Heart Stealer: a second [E] press within the window
        // teleports instead of throwing a fresh knife.
        if (this.pendingTeleport) {

            this.tryTeleport();

            return;

        }

        this.throwKnife();

    }

    onProjectileHit(enemy, damage) {

        this.onHitLanded(enemy, damage);

    }

    hasAbilityButton() { return Save.isEquipped("throwingKnife"); }
    getAbilityButtonLabel() { return "KNIFE"; }

    getHUDStatusLines() {

        const lines = [];

        if (Save.isEquipped("throwingKnife")) {

            let knifeText = "READY [E]";
            if (this.knifeCooldown > 0) {
                const realKnifeSecs = (this.knifeCooldown / 1000).toFixed(1);
                knifeText = `${realKnifeSecs}s`;
            }

            lines.push({
                text: `Knife: ${knifeText}`,
                color: "white"
            });

        }

        if (this.pendingTeleport) {

            lines.push({
                text: "Heart Stealer: [E] to blink!",
                color: "#e056fd"
            });

        }

        if (this.witTimer > 0) {

            lines.push({
                text: "Thief's Wit: ACTIVE",
                color: "#f1c40f"
            });

        }

        return lines;

    }

    // =====================================
    // Cloak
    // =====================================
    //
    // The dash itself is the survivability tool - phasing is
    // just invuln frames granted on dash, so the base class's
    // existing invuln handling (timer, hit immunity, sprite
    // flicker) does all the heavy lifting.

    onDash(dx, dy, startX, startY) {

        if (Save.isEquipped("cloak")) {

            const stage = Math.min(3, Save.equippedCloakStage);

            if (stage >= 1) {

                this.invulnTimer = Math.max(this.invulnTimer, CLOAK.PHASE_MS[stage]);

                if (stage >= 3)
                    this.phantomStrike(dx, dy, startX, startY);

            }

        }

        // Ascendant Cloak - come down out of the dash and the
        // next blow is certain.
        if (Save.isEquipped("ascendantCloak"))
            this.ascendantTimer = ASCENDANT_CLOAK.WINDOW_MS;

        // Mirror Cloak - an independent item, not a Cloak stage:
        // every dash also leaves a decoy at the start point (see
        // MirrorDecoy below).
        if (Save.isEquipped("mirrorCloak")) {

            // Centered on the same footprint the Thief just
            // stood in, even though the decoy itself is smaller.
            Game.hazards.push(new MirrorDecoy(
                startX + (this.size - MIRROR_CLOAK.SIZE) / 2,
                startY + (this.size - MIRROR_CLOAK.SIZE) / 2
            ));

        }

    }

    // Phantom Cloak - anything the dash passed through takes
    // damage.
    phantomStrike(dx, dy, startX, startY) {

        const cx = startX + this.size / 2;
        const cy = startY + this.size / 2;

        const length = Math.hypot(this.x - startX, this.y - startY);
        const halfWidth = CLOAK.DASH_HIT_WIDTH / 2;

        const angle = Math.atan2(dy, dx);
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            const relX = ex - cx;
            const relY = ey - cy;

            const localX = relX * cos - relY * sin;
            const localY = relX * sin + relY * cos;

            const pad = enemy.size / 2;

            if (

                localX >= -pad &&
                localX <= length + pad &&
                Math.abs(localY) <= halfWidth + pad

            ) {

                enemy.takeDamage(CLOAK.DASH_DAMAGE);

                this.onHitLanded(enemy, CLOAK.DASH_DAMAGE);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    // =====================================
    // Dual Daggers
    // =====================================

    getSwingDuration() {

        return this.witTimer > 0
            ? THIEF_DAGGER.SWING_DURATION / (1 + THIEFS_WIT.ATTACK_SPEED_BONUS)
            : THIEF_DAGGER.SWING_DURATION;

    }

    getDaggerDamage() {

        let damage = THIEF_DAGGER.DAMAGE;

        if (Save.isEquipped("shadowreachBlades"))
            damage += SHADOWREACH.BONUS_DAMAGE;

        if (Save.isEquipped("moonlightDaggers"))
            damage += MOONLIGHT_DAGGERS.BONUS_DAMAGE;

        return damage;

    }

    // Reach of the dagger swing. Routed through one method so
    // the hit test, the Master of the Blade flurry, and the
    // drawn blade all agree - what you see is what you hit.
    getDaggerRange() {

        return THIEF_DAGGER.RANGE + (
            Save.isEquipped("shadowreachBlades")
                ? SHADOWREACH.BONUS_RANGE
                : 0
        );

    }

    swingDaggers() {

        if (this.daggerSwing)
            return;

        this.daggerSwing = true;
        this.daggerTimer = this.getSwingDuration();
        this.swingProgress = 0;
        this.daggerAngle = aimAngle;

        this.daggerSwingCount++;

        Sound.play("daggerSwing");

        // Two daggers, alternating sides - left on odd swings,
        // right on even ones.
        this.daggerSide = -this.daggerSide;

        const px = this.x + this.size / 2;
        const py = this.y + this.size / 2;

        if (Save.isEquipped("moonlightDaggers"))
            this.spawnFlameTrail(px, py);

        let landedHit = false;
        let firstHit = null;

        Game.enemies.forEach(enemy => {

            const closestX = Math.max(enemy.x, Math.min(px, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(py, enemy.y + enemy.size));

            const dx = closestX - px;
            const dy = closestY - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.getDaggerRange())
                return;

            const angleToEnemy = Math.atan2(dy, dx);

            let angleDifference = Math.abs(angleToEnemy - this.daggerAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            if (angleDifference > THIEF_DAGGER.ARC / 2)
                return;

            // Ascendant Cloak - the first blow off a dash is
            // certain. Consumed by the swing, not by the enemy,
            // so a flurry doesn't get four guaranteed crits.
            const ascendant = this.ascendantTimer > 0;

            const critical = ascendant ||
                Math.random() < Save.getEquippedCritChance();

            const base = this.getDaggerDamage();

            const damage = this.bossGearDamage(
                enemy, critical ? base * 2 : base
            );

            if (ascendant)
                this.ascendantTimer = 0;

            enemy.takeDamage(damage, critical);

            enemy.applyKnockback(px, py, critical ? 11.2 : 8.4);

            landedHit = true;

            if (!firstHit)
                firstHit = enemy;

            this.onHitLanded(enemy, damage);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        if (landedHit)
            this.refreshWit();

        // Voltaic Fang - one lightning chain per connecting
        // swing, leaping out from the first foe struck.
        if (firstHit && Save.isEquipped("voltaicFang"))
            this.arcFang(firstHit);

        // Master of the Blade - every 3rd swing (whether it
        // connected or not) unleashes a separate flurry.
        if (
            Save.isEquipped("masterOfBlade") &&
            this.daggerSwingCount % MASTER_OF_BLADE.TRIGGER_EVERY === 0
        ) {
            this.triggerStormBurst();
        }

        // Shadow Twin - every 3rd swing (whether it connected or
        // not) erupts a clone at the mirrored point behind the
        // Thief, independently hitting anyone caught there.
        if (
            Save.isEquipped("shadowTwin") &&
            this.daggerSwingCount % SHADOW_TWIN.TRIGGER_EVERY === 0
        ) {
            this.triggerShadowTwin();
        }

    }

    // =====================================
    // Throwing Knife ([E] ability)
    // =====================================

    throwKnife() {

        if (!Save.isEquipped("throwingKnife"))
            return;

        if (this.knifeCooldown > 0)
            return;

        Sound.play("knifeThrow");

        const upgraded = Save.equippedThrowingKnifeStage >= 2;
        const heartStealer = Save.equippedThrowingKnifeStage >= 3;

        const damage = upgraded
            ? THROWING_KNIFE.DAMAGE_UPGRADED
            : THROWING_KNIFE.DAMAGE_BASE;

        const speed = upgraded
            ? THROWING_KNIFE.SPEED_FAST
            : THROWING_KNIFE.SPEED_SLOW;

        // Range is a fraction of the current screen width,
        // converted to a projectile lifespan (Projectile.life
        // ticks down in Game.timeScale units, and moves
        // speed*timeScale per unit - so life = range / speed
        // makes the knife run out of life exactly at range).
        const range = canvas.width * THROWING_KNIFE.RANGE_FRACTION;
        const life = range / speed;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const critical = Math.random() < Save.getEquippedCritChance();
        const finalDamage = critical ? damage * 2 : damage;

        const knife = new Projectile(

            cx + Math.cos(aimAngle) * 24,
            cy + Math.sin(aimAngle) * 24,
            aimAngle,

            {
                owner: "player",
                speed: speed,
                damage: finalDamage,
                size: THROWING_KNIFE.SIZE,
                color: THROWING_KNIFE.COLOR,
                life: life,
                crit: critical,
                isKnife: true,

                // Always routed through onKnifeResolve so a
                // single knife can both arm a Heart Stealer blink
                // AND drop a Leyline Snare vortex if both are
                // equipped.
                onResolve: (x, y, enemy) => this.onKnifeResolve(x, y, enemy)
            }

        );

        Game.projectiles.push(knife);

        this.knifeCooldown = THROWING_KNIFE.COOLDOWN / this.getAttackSpeedMultiplier();

        // Heart Stealer's window starts the moment the knife
        // is thrown - separate from (and doesn't affect) the
        // cooldown above.
        if (heartStealer) {

            this.pendingTeleport = {
                ready: false,
                timer: THROWING_KNIFE.TELEPORT_WINDOW_MS,
                x: cx,
                y: cy
            };

        }

    }

    getAttackSpeedMultiplier() {

        return this.witTimer > 0
            ? 1 + THIEFS_WIT.ATTACK_SPEED_BONUS
            : 1;

    }

    // =====================================
    // Heart Stealer Teleport
    // =====================================

    // Fired once when a thrown knife resolves (hit or expired).
    // Handles both knife-tier effects that key off the landing
    // point: Heart Stealer's blink arming and Leyline Snare's
    // gravity vortex.
    onKnifeResolve(x, y, enemy) {

        if (this.pendingTeleport)
            this.armTeleport(x, y, enemy);

        // Regrowth Sigil - a knife that killed comes straight
        // back. Checked on resolve, which is the one place that
        // knows both "this was the knife" and "what it hit".
        if (
            Save.isEquipped("regrowthSigil") &&
            enemy && enemy.isDead()
        ) {
            this.knifeCooldown = 0;
        }

        if (Save.isEquipped("leylineSnare")) {

            const vx = enemy ? enemy.x + enemy.size / 2 : x;
            const vy = enemy ? enemy.y + enemy.size / 2 : y;

            Game.hazards.push(new LeylineVortex(vx, vy));

        }

    }

    // Called from the thrown knife's Projectile once it
    // resolves (hit or expired) - captures where to blink to.
    armTeleport(x, y, enemy) {

        if (!this.pendingTeleport)
            return;

        this.pendingTeleport.x = enemy ? enemy.x + enemy.size / 2 : x;
        this.pendingTeleport.y = enemy ? enemy.y + enemy.size / 2 : y;
        this.pendingTeleport.ready = true;

    }

    updatePendingTeleport() {

        if (!this.pendingTeleport)
            return;

        this.pendingTeleport.timer -= Game.dt;

        if (this.pendingTeleport.timer <= 0)
            this.pendingTeleport = null;

    }

    tryTeleport() {

        if (!this.pendingTeleport || !this.pendingTeleport.ready)
            return;

        this.x = this.pendingTeleport.x - this.size / 2;
        this.y = this.pendingTeleport.y - this.size / 2;

        this.keepOnScreen();

        this.invulnTimer = Math.max(this.invulnTimer, THROWING_KNIFE.TELEPORT_INVULN_MS);

        this.pendingTeleport = null;

    }

    // =====================================
    // Thief's Wit
    // =====================================

    refreshWit() {

        if (!Save.isEquipped("thiefsWit"))
            return;

        this.witTimer = THIEFS_WIT.DURATION_MS;

    }

    getWitSpeedMultiplier() {

        return this.witTimer > 0
            ? 1 + THIEFS_WIT.SPEED_BONUS
            : 1;

    }

    // =====================================
    // On-Hit Effects (Void Enchant, Wit)
    // =====================================
    //
    // Shared entry point for every damage instance the Thief
    // lands (dagger swings, storm bursts, knives) - keeps the
    // Wit refresh and Void Enchant marking in one place.

    // =====================================
    // Act II boss gear
    // =====================================

    updateBossGear() {

        if (this.ascendantTimer > 0)
            this.ascendantTimer -= Game.dt;

        this.updateRosethorns();
        this.updateBriars();
        this.updateSapwell();

    }

    // Rosethorn Edge - a seed left in the target that opens a
    // beat later, around wherever it has got to by then. The
    // delay is the item: it pays out on a foe that stayed in the
    // crowd, and misses on one that ran.
    updateRosethorns() {

        this.rosethorns = this.rosethorns.filter(seed => {

            if (seed.enemy.isDead())
                return false;

            seed.fuse -= Game.dt;

            if (seed.fuse > 0)
                return true;

            const ex = seed.enemy.x + seed.enemy.size / 2;
            const ey = seed.enemy.y + seed.enemy.size / 2;

            bossGearBurst(ex, ey, ROSETHORN_EDGE.RADIUS, ROSETHORN_EDGE.DAMAGE);

            Particle.createHitBurst(ex, ey);

            return false;

        });

    }

    // Briar Cloak - the Thief's one reason to ever stand still.
    updateBriars() {

        if (!Save.isEquipped("briarCloak"))
            return;

        if (!isPlayerRooted(this, BRIAR_CLOAK.GROW_MS)) {

            this.briarTick = 0;
            return;

        }

        this.briarTick -= Game.dt;

        if (this.briarTick > 0)
            return;

        this.briarTick = BRIAR_CLOAK.TICK_MS;

        bossGearBurst(
            this.x + this.size / 2,
            this.y + this.size / 2,
            BRIAR_CLOAK.RADIUS,
            BRIAR_CLOAK.TICK_DAMAGE
        );

    }

    // Sapwell - a root on a fixed beat, grabbing whatever is
    // nearest. Free control the Thief doesn't have to aim.
    updateSapwell() {

        if (!Save.isEquipped("sapwell"))
            return;

        this.sapwellTimer -= Game.dt;

        if (this.sapwellTimer > 0)
            return;

        this.sapwellTimer = SAPWELL.INTERVAL_MS;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const target = nearestEnemyTo(cx, cy);

        if (!target)
            return;

        const d = Math.hypot(
            target.x + target.size / 2 - cx,
            target.y + target.size / 2 - cy
        );

        if (d > SAPWELL.RANGE)
            return;

        Game.hazards.push(new GraspingRoot(cx, cy, target));

    }

    // Rootfang - double against anything already pinned. Asked
    // BEFORE the hit lands, so a hit that itself applies the
    // control doesn't get to benefit from it in the same frame.
    bossGearDamage(enemy, damage) {

        return Save.isEquipped("rootfang") && enemy.isHeld()
            ? damage * ROOTFANG.DAMAGE_MULT
            : damage;

    }

    // Herald's Verdict - every kill passes sentence along.
    onKill(enemy) {

        if (!Save.isEquipped("heraldsVerdict"))
            return;

        const ex = enemy.x + enemy.size / 2;
        const ey = enemy.y + enemy.size / 2;

        const next = nearestEnemyTo(ex, ey, enemy);

        if (!next)
            return;

        const nx = next.x + next.size / 2;
        const ny = next.y + next.size / 2;

        if (Math.hypot(nx - ex, ny - ey) > HERALDS_VERDICT.CHAIN_RANGE)
            return;

        Game.hazards.push(new JudgementPillar(nx, ny));

    }

    onHitLanded(enemy, damage) {

        this.refreshWit();

        // Rosethorn Edge - one live seed per target, refreshed
        // rather than stacked, so a flurry doesn't detonate six
        // blooms on one enemy.
        if (Save.isEquipped("rosethornEdge")) {

            const existing = this.rosethorns.find(seed => seed.enemy === enemy);

            if (existing)
                existing.fuse = ROSETHORN_EDGE.FUSE_MS;
            else
                this.rosethorns.push({ enemy, fuse: ROSETHORN_EDGE.FUSE_MS });

        }

        // Limbtaker - keep hitting the same thing and eventually
        // a limb comes off with it.
        if (Save.isEquipped("limbtaker")) {

            enemy.limbHits = (enemy.limbHits ?? 0) + 1;

            if (enemy.limbHits % LIMBTAKER.HITS_TO_TAKE === 0) {

                enemy.applyDisarm(LIMBTAKER.DISARM_MS);
                Particle.createHitBurst(
                    enemy.x + enemy.size / 2,
                    enemy.y + enemy.size / 2
                );

            }

        }


        if (Save.isEquipped("voidEnchant"))
            this.addVoidDamage(enemy, damage);

        if (Save.isEquipped("pocketWatch"))
            this.reduceCooldowns(POCKET_WATCH.COOLDOWN_REDUCTION_MS);

    }

    // Thief's Pocket Watch - shaves time off whichever of the
    // Thief's cooldowns are currently ticking (the knife's and
    // the shared dash's charges).
    reduceCooldowns(amountMs) {

        if (this.knifeCooldown > 0)
            this.knifeCooldown = Math.max(0, this.knifeCooldown - amountMs);

        for (let i = 0; i < this.dashCooldowns.length; i++) {

            if (this.dashCooldowns[i] > 0)
                this.dashCooldowns[i] = Math.max(0, this.dashCooldowns[i] - amountMs);

        }

    }

    // =====================================
    // Void Enchant
    // =====================================

    addVoidDamage(enemy, damage) {

        let mark = this.voidMarks.find(m => m.enemy === enemy);

        if (!mark) {

            mark = {
                enemy,
                stored: 0,
                timer: VOID_ENCHANT.STORE_DURATION_MS,
                x: enemy.x + enemy.size / 2,
                y: enemy.y + enemy.size / 2
            };

            this.voidMarks.push(mark);

        }

        mark.stored += damage;

    }

    updateVoidMarks() {

        this.voidMarks = this.voidMarks.filter(mark => {

            // Track the enemy's position while it's alive so
            // the detonation lands where it currently stands,
            // not where it was originally marked.
            if (!mark.enemy.isDead()) {

                mark.x = mark.enemy.x + mark.enemy.size / 2;
                mark.y = mark.enemy.y + mark.enemy.size / 2;

            }

            mark.timer -= Game.dt;

            if (mark.timer > 0)
                return true;

            this.detonateVoidMark(mark);

            return false;

        });

    }

    detonateVoidMark(mark) {

        if (mark.stored <= 0)
            return;

        // Same AOE footprint as a fire mage's ground hazard.
        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            const distance = Math.hypot(ex - mark.x, ey - mark.y);

            if (distance > HAZARD.FIRE_RADIUS)
                return;

            enemy.takeDamage(mark.stored);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

    }

    // =====================================
    // Master of the Blade
    // =====================================

    triggerStormBurst() {

        this.stormBursts.push({
            ticksLeft: MASTER_OF_BLADE.TICKS,
            tickTimer: MASTER_OF_BLADE.TICK_MS,
            angle: this.daggerAngle
        });

    }

    updateStormBursts() {

        this.stormBursts = this.stormBursts.filter(burst => {

            burst.tickTimer -= Game.dt;

            if (burst.tickTimer > 0)
                return true;

            burst.tickTimer += MASTER_OF_BLADE.TICK_MS;
            burst.ticksLeft--;

            this.applyStormTick(burst.angle);

            return burst.ticksLeft > 0;

        });

    }

    applyStormTick(angle) {

        const px = this.x + this.size / 2;
        const py = this.y + this.size / 2;

        let firstHit = null;

        Game.enemies.forEach(enemy => {

            const closestX = Math.max(enemy.x, Math.min(px, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(py, enemy.y + enemy.size));

            const dx = closestX - px;
            const dy = closestY - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.getDaggerRange())
                return;

            const angleToEnemy = Math.atan2(dy, dx);

            let angleDifference = Math.abs(angleToEnemy - angle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            if (angleDifference > THIEF_DAGGER.ARC / 2)
                return;

            enemy.takeDamage(MASTER_OF_BLADE.TICK_DAMAGE);

            this.onHitLanded(enemy, MASTER_OF_BLADE.TICK_DAMAGE);

            if (!firstHit)
                firstHit = enemy;

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        if (firstHit && Save.isEquipped("voltaicFang"))
            this.arcFang(firstHit);

    }

    // =====================================
    // Shadow Twin
    // =====================================
    //
    // Every 3rd swing, a clone erupts at the point mirrored
    // behind the Thief (opposite the swing's facing angle) and
    // slashes a wide burst of its own - real added coverage
    // (whatever the live swing missed, standing behind you),
    // not just a repeated hit on the same target.

    triggerShadowTwin() {

        const px = this.x + this.size / 2;
        const py = this.y + this.size / 2;

        const angle = this.daggerAngle + Math.PI;

        const cx = px + Math.cos(angle) * SHADOW_TWIN.MIRROR_DISTANCE;
        const cy = py + Math.sin(angle) * SHADOW_TWIN.MIRROR_DISTANCE;

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > SHADOW_TWIN.RADIUS)
                return;

            const critical = Math.random() < Save.getEquippedCritChance();
            const damage = critical ? SHADOW_TWIN.DAMAGE * 2 : SHADOW_TWIN.DAMAGE;

            enemy.takeDamage(damage, critical);
            enemy.applyKnockback(cx, cy, critical ? 11.2 : 8.4);

            this.onHitLanded(enemy, damage);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        Sound.play("daggerSwing");
        Game.hazards.push(new ShadowTwinFx(cx, cy, angle));

    }

    // =====================================
    // Voltaic Fang
    // =====================================
    //
    // Fired on every connecting dagger swing (and Master of the
    // Blade flurry tick): a lightning chain that starts at the
    // struck enemy and leaps to the nearest fresh enemy up to
    // JUMPS times, dealing CHAIN_DAMAGE at each hop. Consistent
    // per-swing AOE - and since it only jumps to OTHER enemies,
    // a lone boss gains nothing from it.

    arcFang(originEnemy) {

        const visited = new Set([originEnemy]);

        let cx = originEnemy.x + originEnemy.size / 2;
        let cy = originEnemy.y + originEnemy.size / 2;

        for (let j = 0; j < VOLTAIC_FANG.JUMPS; j++) {

            let next = null;
            let best = VOLTAIC_FANG.JUMP_RANGE;

            Game.enemies.forEach(e => {

                // Bosses are lightning-immune, so the arc never
                // hops to them (see boss ctors).
                if (visited.has(e) || e.isDead() || e.lightningImmune)
                    return;

                const ex = e.x + e.size / 2;
                const ey = e.y + e.size / 2;
                const d = Math.hypot(ex - cx, ey - cy);

                if (d < best) {
                    best = d;
                    next = e;
                }

            });

            if (!next)
                break;

            const nx = next.x + next.size / 2;
            const ny = next.y + next.size / 2;

            next.takeDamage(VOLTAIC_FANG.CHAIN_DAMAGE);

            if (next.isDead())
                onEnemyKilled(next);

            Game.hazards.push(new VoltaicArc(cx, cy, nx, ny));

            Sound.playAt("lightningChain", nx, ny);

            visited.add(next);
            cx = nx;
            cy = ny;

        }

    }

    // =====================================
    // Moonlight Daggers - Flame Trail
    // =====================================
    //
    // Every dagger swing drops a lingering patch at the point
    // of attack (the player's position at swing time) -
    // anyone standing inside it takes a tick of damage once a
    // second for as long as it lasts.

    spawnFlameTrail(x, y) {

        this.flameTrails.push({
            x,
            y,
            timer: MOONLIGHT_DAGGERS.TRAIL_DURATION_MS,
            tickTimer: MOONLIGHT_DAGGERS.TRAIL_TICK_MS
        });

    }

    updateFlameTrails() {

        this.flameTrails = this.flameTrails.filter(trail => {

            trail.timer -= Game.dt;

            if (trail.timer <= 0)
                return false;

            trail.tickTimer -= Game.dt;

            if (trail.tickTimer <= 0) {

                trail.tickTimer += MOONLIGHT_DAGGERS.TRAIL_TICK_MS;

                Game.enemies.forEach(enemy => {

                    const ex = enemy.x + enemy.size / 2;
                    const ey = enemy.y + enemy.size / 2;

                    // Square footprint, not circular - matches
                    // the patch drawn in drawFlameTrails. A
                    // Chebyshev (max-axis) check against the
                    // patch's half-width is the AABB test for
                    // "is this enemy's center inside the box".
                    const dx = Math.abs(ex - trail.x);
                    const dy = Math.abs(ey - trail.y);
                    const half = MOONLIGHT_DAGGERS.TRAIL_RADIUS + enemy.size / 2;

                    if (dx > half || dy > half)
                        return;

                    enemy.takeDamage(MOONLIGHT_DAGGERS.TRAIL_TICK_DAMAGE);

                    this.onHitLanded(enemy, MOONLIGHT_DAGGERS.TRAIL_TICK_DAMAGE);

                    if (enemy.isDead())
                        onEnemyKilled(enemy);

                });

            }

            return true;

        });

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        this.drawFlameTrails();

        this.drawBody();

        this.drawVoidMarks();

        if (this.daggerSwing)
            this.drawDaggers();

    }

    drawDaggers() {

        const arc = THIEF_DAGGER.ARC;
        const currentAngle = this.daggerAngle - arc / 2 + arc * this.swingProgress;

        const bladeLength = this.getDaggerRange();

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        // Only the blade on the swing's current side is drawn -
        // dual daggers strike one at a time, alternating left
        // and right each swing (see this.daggerSide).
        ctx.save();
        ctx.rotate(currentAngle + this.daggerSide * THIEF_DAGGER.SIDE_OFFSET);

        ctx.shadowBlur = 8;
        ctx.shadowColor = "#dfe6e9";

        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(10, -2.5);
        ctx.lineTo(bladeLength, 0);
        ctx.lineTo(10, 2.5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#3a2a20";
        ctx.fillRect(0, -2.5, 10, 5);

        ctx.restore();

        ctx.restore();

    }

    drawFlameTrails() {

        this.flameTrails.forEach(trail => {

            const fade = Math.min(1, trail.timer / MOONLIGHT_DAGGERS.TRAIL_DURATION_MS);

            // A square pixel burn patch (matching the square
            // hit-test above) rather than a circle - and a
            // cached bitmap blit rather than a live arc fill.
            drawPixelSquare(trail.x, trail.y, MOONLIGHT_DAGGERS.TRAIL_RADIUS, {
                color: MOONLIGHT_DAGGERS.TRAIL_COLOR,
                alpha: 0.5 * fade,
                unit: 4,
                dither: 0.5,
                glow: 12,
                glowColor: MOONLIGHT_DAGGERS.TRAIL_COLOR
            });

        });

    }

    drawVoidMarks() {

        this.voidMarks.forEach(mark => {

            ctx.save();

            ctx.shadowBlur = 10;
            ctx.shadowColor = VOID_ENCHANT.MARK_COLOR;
            ctx.fillStyle = VOID_ENCHANT.MARK_COLOR;
            ctx.globalAlpha = 0.75;

            ctx.beginPath();
            ctx.arc(mark.x, mark.y, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

        });

    }

}

// Register with the class selector (see PLAYER_CLASSES in
// game.js and CLASSES in constants.js).
PLAYER_CLASSES.thief = Thief;

// =====================================
// Voltaic Fang - lightning arc FX
// =====================================
//
// Visual only (damage is dealt in Thief.arcFang): a jagged
// bolt drawn along one hop of the chain, from one enemy to the
// next.

class VoltaicArc {

    constructor(fromX, fromY, toX, toY) {

        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.life = 9;
        this.maxLife = 9;

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
        ctx.shadowBlur = 14;
        ctx.shadowColor = VOLTAIC_FANG.COLOR;

        ctx.beginPath();
        ctx.moveTo(this.fromX, this.fromY);

        const segs = 4;
        for (let i = 1; i < segs; i++) {

            const t = i / segs;

            ctx.lineTo(
                this.fromX + (this.toX - this.fromX) * t + (Math.random() - 0.5) * 14,
                this.fromY + (this.toY - this.fromY) * t + (Math.random() - 0.5) * 14
            );

        }

        ctx.lineTo(this.toX, this.toY);
        ctx.stroke();

        ctx.restore();

    }

}

// =====================================
// Leyline Snare - gravity vortex
// =====================================
//
// A short-lived well dropped where a thrown knife lands. Each
// frame it drags nearby non-boss enemies toward its center,
// clustering the pack. No damage - it's pure setup.

class LeylineVortex {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = LEYLINE_SNARE.RADIUS;
        this.life = LEYLINE_SNARE.DURATION_MS;
        this.maxLife = LEYLINE_SNARE.DURATION_MS;

    }

    update() {

        this.life -= Game.dt;

        Game.enemies.forEach(enemy => {

            if (enemy.isBoss || enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            const dx = this.x - ex;
            const dy = this.y - ey;
            const d = Math.hypot(dx, dy);

            if (d > this.radius || d < 1)
                return;

            enemy.x += (dx / d) * LEYLINE_SNARE.PULL_STRENGTH * Game.timeScale;
            enemy.y += (dy / d) * LEYLINE_SNARE.PULL_STRENGTH * Game.timeScale;

        });

    }

    isDead() {
        return this.life <= 0;
    }

    // The 3-armed swirl bitmap, baked ONCE per (radius, unit)
    // pair - the pattern only ever needs redrawing because the
    // vortex rotates, and a rotation is just a canvas transform
    // at blit time, not a reason to re-rasterise anything. This
    // replaces 3 live shadowed stroke() spiral paths per frame
    // with a single cached blit.
    static getSwirlBitmap(radius) {

        const unit = Math.max(2, Math.round(radius * 0.045));
        const r = Math.round(radius);
        const pad = unit + 6;
        const size = r * 2 + pad * 2;

        const key = `leyline|${r}|${unit}`;

        return _getPixelShape(key, size, size, (c) => {

            const b = pad + r;

            c.fillStyle = "#a57dff";
            c.shadowBlur = 6;
            c.shadowColor = LEYLINE_SNARE.COLOR;

            for (let i = 0; i < 3; i++) {

                const a0 = i * (Math.PI * 2 / 3);

                for (let s = 0; s <= 40; s++) {

                    const rr = r * (s / 40);
                    const aa = a0 + s * 0.175;

                    c.fillRect(
                        pxSnap(b + Math.cos(aa) * rr, unit),
                        pxSnap(b + Math.sin(aa) * rr, unit),
                        unit, unit
                    );

                }

            }

        });

    }

    draw() {

        const fade = Math.min(1, this.life / 300);
        const spin = Date.now() / 200;

        // Pull field - a cached pixel disc.
        drawPixelDisc(this.x, this.y, this.radius, {
            color: "#7b5cd6",
            alpha: 0.12 * fade,
            unit: Math.max(2, Math.round(this.radius * 0.06)),
            dither: 0.4
        });

        // Swirl arms: cached bitmap, rotated onto the current
        // spin via a canvas transform rather than re-baked.
        const unit = Math.max(2, Math.round(this.radius * 0.045));
        const r = Math.round(this.radius);
        const pad = unit + 6;
        const bmp = LeylineVortex.getSwirlBitmap(this.radius);

        ctx.save();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.55 * fade;
        ctx.translate(this.x, this.y);
        ctx.rotate(spin);
        ctx.drawImage(bmp, -(r + pad), -(r + pad));
        ctx.restore();
        ctx.globalAlpha = 1;

    }

}

// =====================================
// Mirror Cloak - decoy detonation
// =====================================
//
// Left at the dash's start point (see Thief.onDash). Ticks down
// silently, then bursts - damaging and briefly paralyzing
// (Enemy.applyStun) anything still nearby. Same Game.hazards
// lifecycle shape as MeteorStrike's telegraph-then-impact (see
// royalMagus.js), just without needing a falling-object visual
// since it's already sitting where it will go off.

class MirrorDecoy {

    // x, y are top-left, same convention as the player - so
    // getAggroSource() can hand this straight to any enemy's
    // targeting code in place of `player` with no shape
    // mismatch.
    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.size = MIRROR_CLOAK.SIZE;
        this.timer = MIRROR_CLOAK.TAUNT_MS;
        this.detonated = false;

        // Every non-boss enemy's move()/attack() now sees THIS
        // instead of the real player (see getAggroSource in
        // enemy.js) for as long as it's the active decoy.
        Game.tauntDecoy = this;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer > 0 || this.detonated)
            return;

        this.detonated = true;

        if (Game.tauntDecoy === this)
            Game.tauntDecoy = null;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > MIRROR_CLOAK.RADIUS)
                return;

            enemy.takeDamage(MIRROR_CLOAK.DAMAGE);
            enemy.applyStun(MIRROR_CLOAK.STUN_MS);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        Game.screenShake = Math.max(Game.screenShake ?? 0, 10);
        Particle.createHitBurst(cx, cy);

    }

    isDead() {

        return this.detonated;

    }

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const progress = 1 - this.timer / MIRROR_CLOAK.TAUNT_MS;
        const alpha = 0.3 + Math.sin(Date.now() / 50) * 0.15;

        // A ghostly standing silhouette, a little smaller than
        // the player, that brightens as the detonation nears.
        drawPixelBody(cx, cy, this.size, {
            color: MIRROR_CLOAK.COLOR,
            glow: 10 + progress * 14,
            glowColor: MIRROR_CLOAK.COLOR
        });

        // Blast radius telegraph, filling in as it charges.
        drawPixelZone(cx, cy, MIRROR_CLOAK.RADIUS * (0.3 + progress * 0.7), {
            fill: MIRROR_CLOAK.COLOR,
            rim: "#ead4ff",
            fillAlpha: alpha * 0.2,
            rimAlpha: alpha * 0.5
        });

    }

}

// =====================================
// Shadow Twin - clone burst FX
// =====================================
//
// Visual only (damage is dealt in Thief.triggerShadowTwin): a
// dark clone silhouette flashes in at the mirrored point and
// slashes a wide arc, then dissolves. Same brief one-shot
// lifecycle as VoltaicArc.

class ShadowTwinFx {

    constructor(x, y, angle) {

        this.x = x;
        this.y = y;
        this.angle = angle;
        this.life = SHADOW_TWIN.FX_DURATION_MS;
        this.maxLife = SHADOW_TWIN.FX_DURATION_MS;

    }

    update() {
        this.life -= Game.dt;
    }

    isDead() {
        return this.life <= 0;
    }

    draw() {

        const fade = Math.max(0, this.life / this.maxLife);
        const progress = 1 - fade;

        ctx.save();
        ctx.globalAlpha = fade;

        // Clone silhouette - reuses the player-sized pixel body
        // blitter, tinted shadow-purple.
        drawPixelBody(this.x, this.y, PLAYER.SIZE, {
            color: SHADOW_TWIN.COLOR,
            glow: 16,
            glowColor: SHADOW_TWIN.COLOR
        });

        // Wide slash wedge, sweeping out as it fades.
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = `rgba(201, 166, 255, ${0.6 * fade})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = SHADOW_TWIN.COLOR;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, SHADOW_TWIN.RADIUS * (0.5 + progress * 0.5), -0.9, 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1;

    }

}
