// =====================================
// Thief Class
// =====================================
//
// A fast, aggressive melee class - dual daggers (hold attack)
// are a short, quick version of the Warrior's sword swing:
// 60% of its reach, but twice the attack speed. Kit (see the
// Thief section of SHOP_ITEMS):
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
//   - Serrated Blade / Thief's Pocket Watch (Knight tier):
//     +1 dagger damage / hits shave time off active cooldowns
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

    }

    // =====================================
    // Class Hooks
    // =====================================

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

    updateAbilities() {

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

        if (!Save.isEquipped("cloak"))
            return;

        const stage = Math.min(3, Save.equippedCloakStage);

        if (stage < 1)
            return;

        this.invulnTimer = Math.max(this.invulnTimer, CLOAK.PHASE_MS[stage]);

        if (stage >= 3)
            this.phantomStrike(dx, dy, startX, startY);

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

        if (Save.isEquipped("serratedBlade"))
            damage += SERRATED_BLADE.BONUS_DAMAGE;

        if (Save.isEquipped("moonlightDaggers"))
            damage += MOONLIGHT_DAGGERS.BONUS_DAMAGE;

        return damage;

    }

    swingDaggers() {

        if (this.daggerSwing)
            return;

        this.daggerSwing = true;
        this.daggerTimer = this.getSwingDuration();
        this.swingProgress = 0;
        this.daggerAngle = aimAngle;

        this.daggerSwingCount++;

        // Two daggers, alternating sides - left on odd swings,
        // right on even ones.
        this.daggerSide = -this.daggerSide;

        const px = this.x + this.size / 2;
        const py = this.y + this.size / 2;

        if (Save.isEquipped("moonlightDaggers"))
            this.spawnFlameTrail(px, py);

        let landedHit = false;

        Game.enemies.forEach(enemy => {

            const closestX = Math.max(enemy.x, Math.min(px, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(py, enemy.y + enemy.size));

            const dx = closestX - px;
            const dy = closestY - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > THIEF_DAGGER.RANGE)
                return;

            const angleToEnemy = Math.atan2(dy, dx);

            let angleDifference = Math.abs(angleToEnemy - this.daggerAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            if (angleDifference > THIEF_DAGGER.ARC / 2)
                return;

            const critical = Math.random() < Save.getEquippedCritChance();
            const base = this.getDaggerDamage();
            const damage = critical ? base * 2 : base;

            enemy.takeDamage(damage, critical);

            enemy.applyKnockback(px, py, critical ? 11.2 : 8.4);

            landedHit = true;

            this.onHitLanded(enemy, damage);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

        if (landedHit)
            this.refreshWit();

        // Master of the Blade - every 3rd swing (whether it
        // connected or not) unleashes a separate flurry.
        if (
            Save.isEquipped("masterOfBlade") &&
            this.daggerSwingCount % MASTER_OF_BLADE.TRIGGER_EVERY === 0
        ) {
            this.triggerStormBurst();
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

                onResolve: heartStealer
                    ? (x, y, enemy) => this.armTeleport(x, y, enemy)
                    : null
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

    onHitLanded(enemy, damage) {

        this.refreshWit();

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

        Game.enemies.forEach(enemy => {

            const closestX = Math.max(enemy.x, Math.min(px, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(py, enemy.y + enemy.size));

            const dx = closestX - px;
            const dy = closestY - py;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > THIEF_DAGGER.RANGE)
                return;

            const angleToEnemy = Math.atan2(dy, dx);

            let angleDifference = Math.abs(angleToEnemy - angle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            if (angleDifference > THIEF_DAGGER.ARC / 2)
                return;

            enemy.takeDamage(MASTER_OF_BLADE.TICK_DAMAGE);

            this.onHitLanded(enemy, MASTER_OF_BLADE.TICK_DAMAGE);

            if (enemy.isDead())
                onEnemyKilled(enemy);

        });

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

                    const distance = Math.hypot(ex - trail.x, ey - trail.y);

                    if (distance > MOONLIGHT_DAGGERS.TRAIL_RADIUS + enemy.size / 2)
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

        const bladeLength = THIEF_DAGGER.RANGE;

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

            ctx.save();

            ctx.globalAlpha = 0.5 * fade;
            ctx.shadowBlur = 12;
            ctx.shadowColor = MOONLIGHT_DAGGERS.TRAIL_COLOR;
            ctx.fillStyle = MOONLIGHT_DAGGERS.TRAIL_COLOR;

            ctx.beginPath();
            ctx.arc(trail.x, trail.y, MOONLIGHT_DAGGERS.TRAIL_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

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
