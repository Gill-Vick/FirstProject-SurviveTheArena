// =====================================
// Warrior Class
// =====================================
//
// The game's original kit - sword swing, the purchasable
// shortbow item, shield line, King's Blade laser, the
// Lightning Ring's dash-through paralyze. Everything that used
// to live directly on Player before playable classes were
// introduced.

class Warrior extends Player {

    constructor() {

        super();

        // Sword

        this.swordSwing = false;
        this.swordAngle = 0;
        this.swordTimer = 0;
        this.swingProgress = 0;

        this.shieldActive = Save.isEquipped("shield");

        // Bulwark stage (shieldStage 3) lets the shield block a
        // second hit before it breaks - each block still procs
        // the Onyx nuke individually (see absorbHit()).
        this.shieldCharges = this.shieldActive
            ? (Save.equippedShieldStage >= 3 ? 2 : 1)
            : 0;

        // Bow

        this.bowCooldown = 0;

        // Berserker Medallion rage - stacks build one per
        // connecting swing (not per enemy hit), fade together
        // when the window runs out without a landed swing.
        this.rageStacks = 0;
        this.rageTimer = 0;
        this.rageGainedThisSwing = false;

        // Twinblade Echo / Sibling's Resilience - every completed
        // swing increments this, same "every Nth swing" shape as
        // the Thief's Master of the Blade.
        this.swordSwingCount = 0;

        // Sibling's Resilience - Empowered window granted on
        // trigger, read live by getSwordDamage().
        this.empowerTimer = 0;

        // Forgemaster's Sigil reforge countdown (ms of Game.dt,
        // 0 = not currently reforging).
        this.reforgeTimer = 0;

        // King's Blade laser (right-click ability)

        this.kingsBladeCooldown = 0;
        this.kingsBladeLaserTimer = 0;
        this.kingsBladeLaserAngle = 0;

        // Heartbark Plate - a bark layer on its own clock,
        // entirely independent of the Shield (you can carry both,
        // or this without ever having bought one).
        this.barkReady = true;
        this.barkTimer = 0;

        // Blessing of Thorns plants once per connecting swing.
        // Arrows are unguarded - see onProjectileHit.
        this.plantedThisSwing = false;

        // Where the blade was drawn last frame, for motion blur
        // (see drawSwingBlur). null = no previous frame to blur
        // from, which is the case on the swing's first frame.
        this.lastSwordAngle = null;

    }

    // =====================================
    // Class Hooks
    // =====================================

    getSpeedMultiplier() {

        return Save.isEquipped("windrunnerAnklet")
            ? WINDRUNNER.SPEED_MULTIPLIER
            : 1;

    }

    getDashSlotCount() {

        return Save.isEquipped("hermesShoes") ? 2 : 1;

    }

    getDashDistanceMultiplier() {

        return Save.isEquipped("lightningRing")
            ? LIGHTNING_RING.DASH_DISTANCE_MULTIPLIER
            : 1;

    }

    updateAbilities() {

        this.updateBow();

        this.updateKingsBlade();

        this.updateRage();

        this.updateReforge();

        this.updateBark();

        this.updateDeeproot();

        if (this.empowerTimer > 0)
            this.empowerTimer -= Game.dt;

        // Hold-to-swing checking system triggers auto attacks safely
        if (isMouseDown && Game.state === "playing") {
            this.swingSword();
        }

        this.updateSword();

    }

    onAbilityKey() {

        this.fireBow();

    }

    onSecondaryFire() {

        this.fireKingsBladeLaser();

    }

    // An arrow connected. Blessing of Thorns grows a bed where
    // it landed, exactly as the sword does.
    //
    // EVERY arrow plants, including all three of a fan - so the
    // bow is the item's wide play, laying a spread of ground
    // across a whole line of enemies in one shot, where the
    // sword lays one bed on whatever it swung through.
    //
    // Deliberately not guarded per volley. A fan that all lands
    // on one target does stack beds on the same spot, but that
    // is a fair reward for putting three arrows into one thing
    // at point-blank rather than a bug to design around.
    onProjectileHit(enemy, damage) {

        if (!Save.isEquipped("blessingOfThorns"))
            return;

        Game.hazards.push(new ThornBed(
            enemy.x + enemy.size / 2,
            enemy.y + enemy.size / 2
        ));

    }

    onDash(dx, dy, startX, startY) {

        // Stormstep Sabatons - the LANDING is the attack, so it
        // fires from where the dash ended rather than along it.
        if (Save.isEquipped("stormstepSabatons")) {

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;

            Game.enemies.forEach(enemy => {

                if (enemy.isDead())
                    return;

                const ex = enemy.x + enemy.size / 2;
                const ey = enemy.y + enemy.size / 2;

                if (Math.hypot(ex - cx, ey - cy) > STORMSTEP_SABATONS.RADIUS)
                    return;

                enemy.takeDamage(STORMSTEP_SABATONS.DAMAGE);
                enemy.applyKnockback(cx, cy, STORMSTEP_SABATONS.KNOCKBACK);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            });

            Game.screenShake = Math.max(Game.screenShake ?? 0, 10);
            Game.hazards.push(new TwinbladeEchoFx(cx, cy));

        }

        if (!Save.isEquipped("lightningRing"))
            return;

        this.lightningStrike(dx, dy, startX, startY);

    }

    getBodyGlowColor() {

        return this.shieldActive ? SHIELD.OUTLINE_COLOR : null;

    }

    // Blue bulwark bubble while a shield charge is up.
    getShieldAura() {

        return this.shieldActive
            ? { color: "#4da6ff", glowColor: "#2f7dd6", glintColor: "#d6ecff" }
            : null;

    }

    hasAbilityButton() { return Save.isEquipped("bow"); }
    getAbilityButtonLabel() { return "BOW"; }
    hasSecondaryButton() { return Save.isEquipped("kingsBlade"); }
    getSecondaryButtonLabel() { return "LASER"; }

    getHUDStatusLines() {

        const lines = [];

        if (Save.isEquipped("bow")) {

            let bowText = "READY [E]";
            if (this.bowCooldown > 0) {
                const realBowSecs = (this.bowCooldown / 1000).toFixed(1);
                bowText = `${realBowSecs}s`;
            }

            const arrows = Save.getBowArrowCount();

            lines.push({
                text: `Bow (${arrows}): ${bowText}`,
                color: "white"
            });

        }

        if (Save.isEquipped("kingsBlade")) {

            let kbText = "READY [RMB]";
            if (this.kingsBladeCooldown > 0) {
                const realKbSecs = (this.kingsBladeCooldown / 1000).toFixed(1);
                kbText = `${realKbSecs}s`;
            }

            lines.push({
                text: `King's Blade: ${kbText}`,
                color: "white"
            });

        }

        if (Save.isEquipped("shield")) {

            const displayLabel = (Save.equippedShieldStage === 2) ? "Onyx Shield" : "Shield";

            let stateText = this.shieldActive ? "ACTIVE" : "USED";

            if (!this.shieldActive && this.reforgeTimer > 0) {
                const reforgeSecs = (this.reforgeTimer / 1000).toFixed(1);
                stateText = `REFORGING ${reforgeSecs}s`;
            }

            lines.push({
                text: `${displayLabel}: ${stateText}`,
                color: this.shieldActive
                    ? ((Save.equippedShieldStage === 2) ? "#b533ff" : "#44ffda")
                    : (this.reforgeTimer > 0 ? "#e67e22" : "#666")
            });

        }

        if (Save.isEquipped("berserkerMedallion")) {

            lines.push({
                text: this.rageStacks > 0
                    ? `Rage: +${this.getRageBonus()} dmg`
                    : "Rage: 0",
                color: this.rageStacks > 0 ? "#ff6b4a" : "#666"
            });

        }

        if (Save.isEquipped("siblingsResilience") && this.empowerTimer > 0) {

            lines.push({
                text: `Empowered: +${SIBLINGS_RESILIENCE.EMPOWER_DAMAGE_BONUS} dmg (${(this.empowerTimer / 1000).toFixed(1)}s)`,
                color: "#ffd700"
            });

        }

        return lines;

    }

    // =====================================
    // Shield
    // =====================================

    absorbHit() {

        if (!this.shieldActive)
            return this.absorbWithBark();

        // Matron's Seal - the block itself plants. Fired before
        // the charge is spent so it lands on every block, not
        // only the ones that leave a charge behind.
        if (Save.isEquipped("matronsSeal"))
            this.plantSealBeds();

        if (Save.getOnyxShieldActive()) {
            this.triggerNuke();
        }

        this.shieldCharges--;

        if (this.shieldCharges <= 0) {

            this.shieldActive = false;

            if (Save.isEquipped("forgeSigil"))
                this.reforgeTimer = FORGE_SIGIL.REFORGE_MS;

        }

        this.invulnTimer = SHIELD.INVULN_MS;

        Game.screenShake = EFFECTS.SHAKE_ON_KILL;

        Sound.play("shieldBlock");

        return true;

    }

    triggerNuke() {

        Sound.play("explosion");

        // Damage all enemies currently on screen and clear kill state correctly
        Game.enemies.forEach(enemy => {
            enemy.takeDamage(SHIELD.ONYX_DAMAGE);
            if (enemy.isDead()) {
                onEnemyKilled(enemy);
            }
        });
    }

    // =====================================
    // Lightning Ring
    // =====================================
    //
    // Fires once per dash while equipped - anything the
    // lengthened dash passes through takes a jolt of damage and
    // is paralyzed (see Enemy.applyStun), the same swept-rectangle
    // hit test as the Thief's Phantom Cloak dash-through.

    lightningStrike(dx, dy, startX, startY) {

        const cx = startX + this.size / 2;
        const cy = startY + this.size / 2;

        const length = Math.hypot(this.x - startX, this.y - startY);
        const halfWidth = LIGHTNING_RING.DASH_HIT_WIDTH / 2;

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

                enemy.takeDamage(LIGHTNING_RING.DASH_DAMAGE);
                enemy.applyStun(LIGHTNING_RING.STUN_MS);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    // =====================================
    // Act II boss gear
    // =====================================

    // Matron's Seal - a ring of thorn beds around the block.
    plantSealBeds() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        for (let i = 0; i < MATRONS_SEAL.BEDS; i++) {

            const a = (i / MATRONS_SEAL.BEDS) * Math.PI * 2;

            Game.hazards.push(new ThornBed(
                cx + Math.cos(a) * MATRONS_SEAL.SPREAD,
                cy + Math.sin(a) * MATRONS_SEAL.SPREAD
            ));

        }

    }

    // Heartbark Plate - the second, slower line of defence. Only
    // consulted once the Shield has nothing left (see absorbHit).
    absorbWithBark() {

        if (!Save.isEquipped("heartbarkPlate") || !this.barkReady)
            return false;

        this.barkReady = false;
        this.barkTimer = HEARTBARK_PLATE.REGROW_MS;

        this.invulnTimer = Math.max(this.invulnTimer, HEARTBARK_PLATE.INVULN_MS);

        Game.screenShake = EFFECTS.SHAKE_ON_KILL;
        Particle.createHitBurst(this.x + this.size / 2, this.y + this.size / 2);

        Sound.play("shieldBlock");

        return true;

    }

    updateBark() {

        if (this.barkReady || !Save.isEquipped("heartbarkPlate"))
            return;

        this.barkTimer -= Game.dt;

        if (this.barkTimer <= 0)
            this.barkReady = true;

    }

    // Deeproot Greaves - hold your ground and the ground holds
    // back: nothing shifts you, and everything near you wades.
    updateDeeproot() {

        if (!Save.isEquipped("deeprootGreaves"))
            return;

        if (!isPlayerRooted(this, DEEPROOT_GREAVES.ROOT_MS))
            return;

        // Rooted by choice beats rooted by a boss.
        this.rootTimer = 0;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            if (enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > DEEPROOT_GREAVES.RADIUS)
                return;

            // Re-asserted every frame and never stacked past 1,
            // so it lapses the moment they leave or you move.
            enemy.sapTimer = Math.max(enemy.sapTimer, 200);
            enemy.sapStacks = Math.max(enemy.sapStacks, 1);

        });

    }

    // Heartwood Maul - flat damage for held ground, stepped so
    // the payoff is countable rather than a smooth ramp.
    getHeartwoodBonus() {

        if (!Save.isEquipped("heartwoodMaul"))
            return 0;

        const steps = Math.min(
            HEARTWOOD_MAUL.MAX_STEPS,
            Math.floor(this.stillTimer / HEARTWOOD_MAUL.STEP_MS)
        );

        return steps * HEARTWOOD_MAUL.DAMAGE_PER_STEP;

    }

    // Everything the new gear does to an enemy the sword just
    // hit. Kept out of attackEnemies so the hit loop stays
    // readable.
    onSwordHit(enemy) {

        const ex = enemy.x + enemy.size / 2;
        const ey = enemy.y + enemy.size / 2;

        // Blessing of Thorns - thorns sprout where the blade
        // landed.
        //
        // Guarded to once per swing rather than once per enemy:
        // a wide arc through a crowd would otherwise carpet the
        // floor in a single action, and the beds already overlap
        // at this radius.
        if (Save.isEquipped("blessingOfThorns") && !this.plantedThisSwing) {

            this.plantedThisSwing = true;
            Game.hazards.push(new ThornBed(ex, ey));

        }

        // Warden's Cleaver - three blows to the same foe take a
        // limb off it: staggered, and primed for a double.
        if (Save.isEquipped("wardensCleaver")) {

            enemy.cleaverHits = (enemy.cleaverHits ?? 0) + 1;

            if (enemy.cleaverHits % WARDENS_CLEAVER.HITS_TO_SEVER === 0) {

                enemy.applyStun(WARDENS_CLEAVER.STAGGER_MS);
                enemy.cleaverPrimed = true;

                Particle.createHitBurst(ex, ey);

            }

        }

        // Heraldic Brand - three brands and the sky answers.
        if (Save.isEquipped("heraldicBrand")) {

            const now = Game.elapsedTime;

            // Brands lapse if you leave the target alone, so
            // this rewards focus rather than total hits taken.
            if ((enemy.brandUntil ?? 0) < now)
                enemy.brandCount = 0;

            enemy.brandCount = (enemy.brandCount ?? 0) + 1;
            enemy.brandUntil = now + HERALDIC_BRAND.BRAND_MS;

            if (enemy.brandCount >= HERALDIC_BRAND.BRANDS_TO_CALL) {

                enemy.brandCount = 0;
                Game.hazards.push(new JudgementPillar(ex, ey));

            }

        }

    }

    getSwordDamage() {

        const base = Save.isEquipped("kingsBlade")
            ? KINGS_BLADE.BASE_DAMAGE
            : SWORD.DAMAGE;

        const wetstoneBonus = Save.isEquipped("wetStone")
            ? (Save.isEquipped("kingsBlade") ? KINGS_BLADE.WETSTONE_BONUS : SWORD.WETSTONE_BONUS)
            : 0;

        const empowerBonus = this.empowerTimer > 0
            ? SIBLINGS_RESILIENCE.EMPOWER_DAMAGE_BONUS
            : 0;

        return base + wetstoneBonus + this.getRageBonus() + empowerBonus +
               this.getHeartwoodBonus();

    }

    // =====================================
    // Berserker Medallion (rage)
    // =====================================

    getRageBonus() {

        return Save.isEquipped("berserkerMedallion")
            ? this.rageStacks * RAGE.BONUS_PER_STACK
            : 0;

    }

    // Called from attackEnemies() when a swing connects - one
    // stack per swing no matter how many enemies it clips.
    gainRage() {

        if (!Save.isEquipped("berserkerMedallion"))
            return;

        if (this.rageGainedThisSwing)
            return;

        this.rageGainedThisSwing = true;

        this.rageStacks = Math.min(
            RAGE.MAX_STACKS,
            this.rageStacks + 1
        );

        this.rageTimer = RAGE.WINDOW_MS;

    }

    updateRage() {

        if (this.rageTimer <= 0)
            return;

        this.rageTimer -= Game.dt;

        if (this.rageTimer <= 0)
            this.rageStacks = 0;

    }

    // =====================================
    // Forgemaster's Sigil (shield reforge)
    // =====================================

    updateReforge() {

        if (this.reforgeTimer <= 0)
            return;

        this.reforgeTimer -= Game.dt;

        if (this.reforgeTimer > 0)
            return;

        // Unequipping mid-run isn't possible, but stay safe.
        if (!Save.isEquipped("shield"))
            return;

        this.shieldActive = true;

        this.shieldCharges =
            Save.equippedShieldStage >= 3 ? 2 : 1;

    }

    getSwordLength() {

        const base = Save.isEquipped("kingsBlade")
            ? KINGS_BLADE.LENGTH
            : SWORD.LENGTH;

        // Blessing of Thorns reforges the blade longer. Read here
        // rather than baked into a constant, so the swing arc,
        // the hit test, the drawn blade and the slash wake all
        // pick it up from the one place that already agrees.
        return base + (Save.isEquipped("blessingOfThorns")
            ? BLESSING_OF_THORNS.BONUS_LENGTH
            : 0);

    }

    getSwordArc() {

        return Save.isEquipped("circleStrike")
            ? Math.PI * 2
            : SWORD.ARC;

    }

    // =====================================
    // Bow
    // =====================================

    updateBow() {

        if (this.bowCooldown > 0)
            this.bowCooldown -= Game.dt;

    }

    fireBow() {

        if (!Save.isEquipped("bow"))
            return;

        if (this.bowCooldown > 0)
            return;

        Sound.play("bowShot");

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const arrowCount = Save.getBowArrowCount();
        const spread = BOW.FAN_SPREAD;
        const startAngle = aimAngle - (arrowCount - 1) * spread / 2;

        for (let i = 0; i < arrowCount; i++) {

            const angle = startAngle + i * spread;

            const critical = Math.random() < Save.getEquippedCritChance();
            const damage = critical ? BOW.DAMAGE * 2 : BOW.DAMAGE;

            Game.projectiles.push(new Projectile(

                cx + Math.cos(angle) * 28,
                cy + Math.sin(angle) * 28,
                angle,

                {
                    owner: "player",
                    speed: BOW.SPEED,
                    damage: damage,
                    size: BOW.SIZE,
                    color: BOW.COLOR,
                    life: 171,
                    crit: critical,
                    isArrow: true
                }

            ));

        }

        this.bowCooldown = BOW.COOLDOWN;

    }

    // =====================================
    // King's Blade Laser (right-click ability)
    // =====================================

    updateKingsBlade() {

        if (this.kingsBladeCooldown > 0)
            this.kingsBladeCooldown -= Game.dt;

        if (this.kingsBladeLaserTimer > 0)
            this.kingsBladeLaserTimer -= Game.dt;

    }

    fireKingsBladeLaser() {

        if (!Save.isEquipped("kingsBlade"))
            return;

        if (this.kingsBladeCooldown > 0)
            return;

        this.kingsBladeCooldown = KINGS_BLADE.LASER_COOLDOWN;
        this.kingsBladeLaserAngle = aimAngle;
        this.kingsBladeLaserTimer = KINGS_BLADE.LASER_DURATION;

        Sound.play("laser");

        const critical = Math.random() < Save.getEquippedCritChance();
        const damage = critical
            ? KINGS_BLADE.LASER_DAMAGE * 2
            : KINGS_BLADE.LASER_DAMAGE;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // Long enough to clear the map in any direction from
        // any position - same trick used by the King's beam.
        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const halfWidth = KINGS_BLADE.LASER_WIDTH / 2;

        const cos = Math.cos(-this.kingsBladeLaserAngle);
        const sin = Math.sin(-this.kingsBladeLaserAngle);

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

                enemy.takeDamage(damage, critical);

                enemy.applyKnockback(cx, cy, critical ? 11.2 : 8.4);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    // =====================================
    // Sword
    // =====================================

    swingSword() {

        if (this.swordSwing)
            return;

        this.swordSwing = true;

        this.swordTimer = SWORD.DURATION;

        this.swingProgress = 0;

        this.swordAngle = aimAngle;

        Sound.play("swordSwing");

        this.rageGainedThisSwing = false;
        this.plantedThisSwing = false;

        // A fresh swing has no previous frame to smear from -
        // without this it would blur across from wherever the
        // last swing happened to finish.
        this.lastSwordAngle = null;

        this.swordSwingCount++;

        Game.enemies.forEach(enemy => {

            enemy.hitThisSwing = false;

        });

    }

    updateSword() {

        if (!this.swordSwing)
            return;

        this.swordTimer -= Game.timeScale;

        // Eased rather than linear.
        //
        // A constant-rate sweep is the other half of "clunky" -
        // a real swing loads, whips through the middle and
        // settles. This is a smoothstep on the raw timer, so the
        // blade accelerates into the arc and eases out of it.
        //
        // The HITBOX reads the same eased value (see
        // attackEnemies), so what you see is still exactly what
        // hits: same arc, same coverage, just not at a
        // metronome's pace. Peak rate stays well inside the hit
        // test's angular tolerance, so nothing can be swept past
        // between frames.
        const raw = Math.max(0, Math.min(1, 1 - this.swordTimer / SWORD.DURATION));

        this.swingProgress = raw * raw * (3 - 2 * raw);

        this.attackEnemies();

        if (this.swordTimer <= 0)
            this.swordSwing = false;

    }

    // =====================================
    // Combat
    // =====================================
    //
    // No more manual splice() here - a hit
    // enemy is just flagged dead via takeDamage().
    // Game.cleanupEntities() removes it after
    // the update pass, so nothing gets skipped.

    attackEnemies() {

        let landedHit = false;

        Game.enemies.forEach(enemy => {
            if (enemy.hitThisSwing)
                return;

            // Player Center
            const playerCenterX = this.x + this.size / 2;
            const playerCenterY = this.y + this.size / 2;

            // Find the closest point on the enemy box to the player
            const closestX = Math.max(enemy.x, Math.min(playerCenterX, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(playerCenterY, enemy.y + enemy.size));

            // Calculate vector and distance to that closest point
            const dx = closestX - playerCenterX;
            const dy = closestY - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If the sword tip doesn't reach the closest edge/corner, it's a miss
            if (distance > this.getSwordLength())
                return;

            // Use the angle to this closest intersection point for the arc calculation
            const angleToEnemy = Math.atan2(dy, dx);

            const arc = this.getSwordArc();

            const currentAngle =
                this.swordAngle -
                arc / 2 +
                arc * this.swingProgress;

            let angleDifference = Math.abs(angleToEnemy - currentAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            // Check if the sword arc overlaps our target angle
            if (angleDifference < 0.5) {
                const critical = Math.random() < Save.getEquippedCritChance();
                const base = this.getSwordDamage();
                let damage = critical ? base * 2 : base;

                // A severed foe eats the next blow double (see
                // onSwordHit / Warden's Cleaver). Consumed here
                // so it is spent on ONE swing rather than held.
                if (enemy.cleaverPrimed) {
                    damage *= WARDENS_CLEAVER.NEXT_HIT_MULT;
                    enemy.cleaverPrimed = false;
                }

                enemy.takeDamage(damage, critical);

                enemy.applyKnockback(
                    playerCenterX,
                    playerCenterY,
                    critical ? 12.6 : 8.4
                );

                enemy.hitThisSwing = true;

                this.onSwordHit(enemy);

                this.gainRage();

                landedHit = true;

                if (enemy.isDead())
                    onEnemyKilled(enemy);
            }
        });

        if (!landedHit)
            return;

        // Twinblade Echo - every 2nd connecting swing detonates
        // a full shockwave around the Warrior, hitting EVERY
        // nearby enemy (not just whoever the live swing already
        // connected with).
        if (
            Save.isEquipped("twinbladeEcho") &&
            this.swordSwingCount % TWINBLADE_ECHO.TRIGGER_EVERY === 0
        ) {
            this.triggerTwinbladeEcho();
        }

        // Sibling's Resilience - every 2nd connecting swing
        // grants a solid invulnerability window and empowers the
        // next few swings.
        if (
            Save.isEquipped("siblingsResilience") &&
            this.swordSwingCount % SIBLINGS_RESILIENCE.TRIGGER_EVERY === 0
        ) {

            this.invulnTimer = Math.max(
                this.invulnTimer,
                SIBLINGS_RESILIENCE.INVULN_MS
            );

            this.empowerTimer = SIBLINGS_RESILIENCE.EMPOWER_MS;

        }

    }

    // Twinblade Echo shockwave - a full nova centered on the
    // Warrior, independent of the sword's own arc/range, so it
    // reliably catches anything crowding him regardless of which
    // way he's facing.
    triggerTwinbladeEcho() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) > TWINBLADE_ECHO.ECHO_RADIUS)
                return;

            enemy.takeDamage(TWINBLADE_ECHO.ECHO_DAMAGE);
            enemy.applyKnockback(cx, cy, 10);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        Game.screenShake = Math.max(Game.screenShake ?? 0, 12);
        Particle.createHitBurst(cx, cy);

        Game.hazards.push(new TwinbladeEchoFx(cx, cy));

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (this.kingsBladeLaserTimer > 0)
            this.drawKingsBladeLaser();

        this.drawBody();

        this.drawSword();

    }

    drawSword() {
        if (!this.swordSwing)
            return;

        ctx.save();

        // Move origin to the player's center
        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        // Shorter tail than it used to carry. The old 0.15 of the
        // arc was ~32 degrees of solid smear hanging off the
        // blade, which read as a lump being dragged rather than
        // as a swing.
        const trailLag = 0.11;
        const prevProgress = Math.max(0, this.swingProgress - trailLag);

        const arc = this.getSwordArc();
        const currentAngle = this.swordAngle - arc / 2 + arc * this.swingProgress;
        const previousAngle = this.swordAngle - arc / 2 + arc * prevProgress;
        const angleDiff = currentAngle - previousAngle;

        const bladeLength = this.getSwordLength();
        const kingsBlade = Save.isEquipped("kingsBlade");

        // =====================================
        // 1. THE SLASH ARC
        // =====================================
        //
        // A single ribbon that hugs the blade's outer edge and
        // TAPERS to nothing behind it, rather than the old filled
        // pie wedge anchored at the player's feet.
        //
        // The wedge was the "clunky" part: a wide slab of colour
        // that stayed the same thickness all the way back to the
        // hilt, so every frame of the swing looked like a
        // duplicate of the blade left behind it. A ribbon that
        // thins as it trails reads as one continuous motion -
        // which is what a swing actually is.
        if (angleDiff > 0) {

            ctx.save();
            ctx.rotate(currentAngle);

            this.drawSlashArc(bladeLength, angleDiff, kingsBlade);

            ctx.restore();

        }

        // Fill in the gap the blade crossed since last frame,
        // BEFORE the solid blade goes down on top.
        this.drawSwingBlur(bladeLength, currentAngle, kingsBlade);

        // Rotate to current angle for the physical sword
        ctx.rotate(currentAngle);

        if (kingsBlade)
            this.drawKingsBladeBlade(bladeLength);
        else
            this.drawBaseSwordBlade(bladeLength);

        ctx.restore();

        this.lastSwordAngle = currentAngle;
    }

    // Motion blur across the gap between frames.
    //
    // The swing covers 216 degrees in about 21 frames, so the
    // blade jumps 10-15 degrees between one frame and the next.
    // A thin bright object teleporting that far reads as several
    // separate swords at once - which is the "afterimages" that
    // survived deleting every trailing effect, because it was
    // never a drawn effect at all. It is the eye filling in a
    // strobe.
    //
    // The fix is the opposite of removing things: draw the blade
    // at small steps ACROSS that gap so there is no gap left to
    // strobe. Copies 15 degrees apart at full alpha are ghosts;
    // the same blade at 2-degree steps and a tenth of the alpha
    // is one continuous blur. Same reason a film camera's
    // shutter smears a fast object instead of stuttering it.
    //
    // Silhouettes only - no gradients, no glow, no hilt - so the
    // whole thing costs a handful of flat polygons, and so the
    // blur reads as a shape rather than as legible sword sprites.
    drawSwingBlur(bladeLength, currentAngle, kingsBlade) {

        if (this.lastSwordAngle === null)
            return;

        const gap = currentAngle - this.lastSwordAngle;

        // Nothing meaningful to fill on a near-still frame.
        if (Math.abs(gap) < 0.02)
            return;

        // One sample per ~2 degrees, so the step is always small
        // regardless of how fast this particular frame moved.
        const steps = Math.min(14, Math.max(3, Math.round(Math.abs(gap) / 0.035)));

        ctx.save();

        ctx.fillStyle =
            Save.isEquipped("blessingOfThorns") ? "rgba(255, 190, 215, 0.085)"
            : kingsBlade ? "rgba(255, 226, 140, 0.085)"
            : "rgba(210, 240, 245, 0.085)";

        for (let i = 0; i < steps; i++) {

            // Skip i = steps (that is where the solid blade
            // lands), and start just off the previous frame's
            // position so the two frames' blurs butt together
            // rather than double up.
            const f = (i + 0.5) / steps;

            ctx.save();
            ctx.rotate(this.lastSwordAngle + gap * f);

            ctx.beginPath();
            ctx.moveTo(20, -4);
            ctx.lineTo(bladeLength - 14, -2);
            ctx.lineTo(bladeLength, 0);
            ctx.lineTo(bladeLength - 14, 2);
            ctx.lineTo(20, 4);
            ctx.closePath();
            ctx.fill();

            ctx.restore();

        }

        ctx.restore();

    }

    // The slash: air displaced along the WHOLE blade.
    //
    // Two things were wrong before this.
    //
    // The wind sat at 1.00/0.90/0.79 of the blade's reach - the
    // outer fifth - so it clung to the tip while the rest of the
    // blade cut nothing. Every point along an edge displaces air
    // as it sweeps; the wake is a fan down the whole length, not
    // a tuft on the end.
    //
    // And it was far too solid. Stacked layers peaking at 0.85
    // made a painted-on shape instead of a suggestion of speed.
    //
    // So: streaks spanning hilt to tip, each one's LENGTH and
    // OPACITY scaled by how far out it sits - because a point
    // near the hilt travels a fraction of the distance the tip
    // does in the same instant, and so disturbs far less air.
    // That gradient is the whole reason it reads as a swing
    // rather than a decal.
    //
    // Nothing here is ever a copy of the blade; every mark is a
    // single continuous stroke.
    drawSlashArc(bladeLength, angleDiff, kingsBlade) {

        const outer = bladeLength - 4;

        // Alpha at the leading edge, fading to nothing along
        // whatever span this particular streak covers.
        // Rose Tinted Blade turns the whole wake pink and carries
        // petals on it. Gated on the item, so the stock sword is
        // untouched cyan and the King's Blade untouched gold.
        const rose = Save.isEquipped("blessingOfThorns");

        const grad = (peak, span) => {

            const g = ctx.createLinearGradient(
                outer, 0,
                Math.cos(-angleDiff * span) * outer,
                Math.sin(-angleDiff * span) * outer
            );

            if (rose) {
                g.addColorStop(0, `rgba(255, 214, 232, ${peak})`);
                g.addColorStop(0.4, `rgba(255, 122, 172, ${peak * 0.55})`);
                g.addColorStop(1, "rgba(214, 51, 92, 0)");
            } else if (kingsBlade) {
                g.addColorStop(0, `rgba(255, 244, 214, ${peak})`);
                g.addColorStop(0.4, `rgba(255, 204, 0, ${peak * 0.5})`);
                g.addColorStop(1, "rgba(255, 204, 0, 0)");
            } else {
                g.addColorStop(0, `rgba(235, 255, 255, ${peak})`);
                g.addColorStop(0.4, `rgba(120, 245, 255, ${peak * 0.5})`);
                g.addColorStop(1, "rgba(0, 235, 255, 0)");
            }

            return g;

        };

        ctx.save();
        ctx.lineCap = "round";

        // Seven streaks from just past the crossguard out to the
        // tip. Inner ones are short, faint and thin; outer ones
        // run long and a little brighter.
        const COUNT = 7;

        for (let i = 0; i < COUNT; i++) {

            // 0 at the hilt end of the sweep, 1 at the tip.
            const f = i / (COUNT - 1);

            const r = outer * (0.22 + f * 0.76);

            const span = 0.35 + f * 1.45;
            const peak = 0.05 + f * 0.13;

            ctx.strokeStyle = grad(peak, span);
            ctx.lineWidth = 1 + f * 1.6;

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, -angleDiff * span, true);
            ctx.stroke();

            // Petals riding this particular gust.
            //
            // Pinned TO the streak - same radius, along its
            // length - so they travel with the wind rather than
            // floating loose behind the blade. That is the whole
            // difference between petals and the ghost-sword
            // scatter this replaced: these are small, they are
            // on the airflow, and there are never two at the
            // same radius to line up into a false silhouette.
            if (rose && i % 2 === 1)
                this.drawWindPetals(r, angleDiff * span, f);

        }

        // One edge highlight along the tip's path - the brightest
        // thing in the wake, and still well under half opaque so
        // it stays a glint rather than a painted band.
        ctx.strokeStyle = grad(0.3, 1.0);
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.arc(0, 0, outer - 3, 0, -angleDiff, true);
        ctx.stroke();

        ctx.restore();

    }

    // Two small blooms carried along one gust of the wake.
    //
    // Drawn as a four-petal cross rather than a square blob, so
    // at this size they still read as flowers instead of as
    // pixels of a sword. Alpha follows the streak they sit on,
    // which means the ones near the hilt are barely there and
    // the ones out by the tip carry the look.
    drawWindPetals(radius, span, along) {

        // Rolled off the swing counter so a given swing is
        // stable, and successive swings differ.
        const jitter = ((this.swordSwingCount * 41) % 17) / 17;

        for (let n = 0; n < 2; n++) {

            const t = 0.25 + n * 0.42 + jitter * 0.2;

            if (t > 1)
                continue;

            const a = -span * t;

            const px = Math.round(Math.cos(a) * radius);
            const py = Math.round(Math.sin(a) * radius);

            // Fades along the gust, and the whole set is fainter
            // near the hilt where the air barely moves.
            ctx.globalAlpha = (0.25 + along * 0.5) * (1 - t * 0.7);

            // Leaf-green pip on the trailing one, rose on the
            // rest - a garden's worth of colour rather than one
            // flat pink.
            const green = n === 1 && along < 0.7;

            ctx.fillStyle = green ? "#79b25a" : "#d6335c";

            ctx.fillRect(px - 3, py - 1, 6, 2);
            ctx.fillRect(px - 1, py - 3, 2, 6);

            ctx.fillStyle = green ? "#a8d98a" : "#ffc2d4";
            ctx.fillRect(px - 1, py - 1, 2, 2);

        }

        ctx.globalAlpha = 1;

    }

    // The original sword: cyan energy-core shortsword - or, with
    // Blessing of Thorns equipped, a katana.
    drawBaseSwordBlade(bladeLength) {

        // Blessing of Thorns lives ON the weapon rather than in
        // its wake. It used to shed petals along the arc, which
        // is precisely the ghosting the trail rewrite existed to
        // get rid of - so the flourish moved onto the blade,
        // where it travels with the sword and cannot smear.
        if (Save.isEquipped("blessingOfThorns")) {

            this.drawThornKatana(bladeLength);
            return;

        }

        // =====================================
        // 2. THE ENERGY GLOW (Rendered underneath)
        // =====================================
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
        ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
        ctx.beginPath();
        // A sleek, thin energy core running down the blade
        ctx.moveTo(20, -1);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.lineTo(20, 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // =====================================
        // 3. HIGH-QUALITY METAL BLADE (Tapered & Sharp)
        // =====================================
        // Metallic sleek gradient
        const wet = Save.isEquipped("wetStone");

        let metalGrad = ctx.createLinearGradient(0, -6, 0, 6);
        metalGrad.addColorStop(0, wet ? "#d5e8f0" : "#ffffff");
        metalGrad.addColorStop(0.3, wet ? "#7eb8c9" : "#bdc3c7");
        metalGrad.addColorStop(0.5, wet ? "#4a90a4" : "#95a5a6");
        metalGrad.addColorStop(1, wet ? "#2c5f6e" : "#7f8c8d");

        ctx.fillStyle = metalGrad;
        ctx.beginPath();
        ctx.moveTo(20, -5);               // Base top
        ctx.lineTo(bladeLength - 15, -2); // Tapering top
        ctx.lineTo(bladeLength, 0);       // Ultra-sharp point tip
        ctx.lineTo(bladeLength - 15, 2);  // Tapering bottom
        ctx.lineTo(20, 5);                // Base bottom
        ctx.closePath();
        ctx.fill();

        // Center blade ridge line for 3D depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.stroke();

        // =====================================
        // 4. THE CROSSGUARD & HILT
        // =====================================
        // Sleek metallic crossguard
        ctx.fillStyle = "#34495e";
        ctx.fillRect(16, -10, 5, 20);

        // Leather wrapped handle
        ctx.fillStyle = "#5c4033";
        ctx.fillRect(0, -3, 16, 6);

        // Steel Pommel (end cap)
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

    }

    // Blessing of Thorns: a katana rather than a longsword.
    //
    // Single-edged and far narrower than the stock blade - a
    // straight back with the taper carried entirely on the
    // cutting side, and a long angled tip. It reads as SHARP
    // where the longsword reads as heavy, which is the point of
    // reforging it.
    //
    // The steel is tinted rose rather than painted pink: the
    // gradient runs pale-rose to a deep wine in the shadow, so
    // it still looks like metal that was grown through with
    // roses instead of a pink crayon.
    drawThornKatana(bladeLength) {

        const wet = Save.isEquipped("wetStone");

        // --- blade
        const grad = ctx.createLinearGradient(0, -5, 0, 5);
        grad.addColorStop(0, wet ? "#ffe6f0" : "#fff2f6");
        grad.addColorStop(0.35, wet ? "#e5b7c9" : "#f0c6d6");
        grad.addColorStop(0.62, wet ? "#b07f96" : "#c98fa8");
        grad.addColorStop(1, wet ? "#5e3243" : "#7d4256");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(24, -4);                  // back edge, at the guard
        ctx.lineTo(bladeLength - 20, -5);    // back edge holds its width
        ctx.lineTo(bladeLength, -1);         // kissaki - the long angled tip
        ctx.lineTo(bladeLength - 18, 3);     // cutting edge sweeping back
        ctx.lineTo(24, 3);
        ctx.closePath();
        ctx.fill();

        // Hamon: the temper line following the cutting edge. The
        // single detail that makes a narrow blade read as a
        // katana rather than as a stick.
        ctx.strokeStyle = "rgba(255, 235, 245, 0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(28, 1.5);
        ctx.lineTo(bladeLength - 22, 0.5);
        ctx.stroke();

        // A bright line right along the edge itself.
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.beginPath();
        ctx.moveTo(26, 3);
        ctx.lineTo(bladeLength - 18, 3);
        ctx.stroke();

        // --- tsuba: a small round guard, not a wide crossguard
        ctx.fillStyle = "#3a2233";
        ctx.fillRect(20, -7, 4, 14);
        ctx.fillStyle = "#7d1d33";
        ctx.fillRect(21, -5, 2, 10);

        // --- tsuka: a longer wrapped grip, in rose cord
        ctx.fillStyle = "#2c1a24";
        ctx.fillRect(-2, -3, 22, 6);

        ctx.fillStyle = "#d6335c";

        for (let i = 0; i < 4; i++)
            ctx.fillRect(1 + i * 5, -3, 2, 6);

        // --- kashira: the end cap
        ctx.fillStyle = "#7d1d33";
        ctx.fillRect(-4, -4, 4, 8);

        // One bloom bound at the guard, so the item still reads
        // as the garden's even at a glance.
        ctx.fillStyle = "#2c4a24";
        ctx.fillRect(14, -9, 6, 3);

        ctx.fillStyle = "#d6335c";
        ctx.fillRect(13, -13, 7, 6);
        ctx.fillStyle = "#ff9ab4";
        ctx.fillRect(15, -11, 3, 3);

    }

    drawKingsBladeBlade(bladeLength) {

        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffcc00";

        let grad = ctx.createLinearGradient(0, -6, 0, 6);
        grad.addColorStop(0, "#f7f2e0");
        grad.addColorStop(0.25, "#e0d29a");
        grad.addColorStop(0.5, "#8b0000");
        grad.addColorStop(0.75, "#e0d29a");
        grad.addColorStop(1, "#2c2416");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.lineTo(bladeLength - 18, -3);
        ctx.lineTo(bladeLength, 0);
        ctx.lineTo(bladeLength - 18, 3);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Center ridge for depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.stroke();

        // Gold crossguard
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(11, -11, 5, 22);

        // Wrapped hilt
        ctx.fillStyle = "#3a1a1a";
        ctx.fillRect(0, -3, 11, 6);

        // Pommel jewel
        ctx.fillStyle = "#8b0000";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

    drawKingsBladeLaser() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const width = KINGS_BLADE.LASER_WIDTH;

        const fade = Math.max(
            0,
            this.kingsBladeLaserTimer / KINGS_BLADE.LASER_DURATION
        );

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.kingsBladeLaserAngle);

        ctx.shadowBlur = 18;
        ctx.shadowColor = KINGS_BLADE.LASER_COLOR;

        drawPixelBeam(length, width, {
            color: KINGS_BLADE.LASER_COLOR,
            coreColor: "#eaffff",
            alpha: 0.95 * fade,
            unit: Math.max(3, Math.round(width * 0.2))
        });

        ctx.restore();

    }

}

// Register with the class selector (see PLAYER_CLASSES in
// game.js and CLASSES in constants.js).
PLAYER_CLASSES.warrior = Warrior;

// =====================================
// Twinblade Echo - shockwave FX
// =====================================
//
// Visual only (damage is dealt in Warrior.triggerTwinbladeEcho):
// an expanding ring that rushes out to ECHO_RADIUS and fades.

class TwinbladeEchoFx {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.life = 260;
        this.maxLife = 260;

    }

    update() {
        this.life -= Game.dt;
    }

    isDead() {
        return this.life <= 0;
    }

    draw() {

        const progress = 1 - this.life / this.maxLife;
        const fade = Math.max(0, this.life / this.maxLife);
        const radius = TWINBLADE_ECHO.ECHO_RADIUS * progress;

        drawPixelRing(this.x, this.y, radius, {
            color: TWINBLADE_ECHO.COLOR,
            alpha: fade,
            unit: Math.max(2, Math.round(radius * 0.05)),
            glow: 14,
            glowColor: "#ff5a82"
        });

    }

}
