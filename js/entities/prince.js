// =====================================
// Prince Boss (Wave 20, half of the Siblings fight)
// =====================================
//
// Close-range brawler - half of a linked pair with the Princess
// (princess.js). His whole kit is two moves: a telegraphed
// leap-slam that both closes distance and lands an AOE burst
// (see Boss.dashCharge in boss.js for the charge/lock/execute
// shape this is modeled on), and a fast fist cleave once he's
// already up close (same angle-arc hit test as Knight's sword -
// see Knight.checkSwordHit - just shorter reach and quicker).
// Unlike the Knight, contact damage is always on (checkPlayerCollision
// is left at the Enemy base default) - he punishes standing near
// him, not just his telegraphed swings.
//
// If the Princess dies first (see triggerHeroTransformation(),
// called from onEnemyKilled in game.js), he transforms into
// Hero after a brief cutscene freeze - a real cost for denying
// her sustain by killing her before him, and a genuinely
// different fight rather than a numeric buff.

class Prince extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: PRINCE.SIZE,
            speed: PRINCE.SPEED * Game.enemySpeedMultiplier,
            hp: PRINCE.BASE_HP + Game.wave * PRINCE.HP_PER_WAVE,
            color: PRINCE.COLOR
        });

        this.type = "prince";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.lightningImmune = true;
        this.stunImmune = true;
        // Mirror the (possibly Endless-scaled) hp set by super().
        this.maxHp = this.hp;

        // Leap-slam
        this.leapCharge = 0;
        this.leaping = false;
        this.leapDX = 0;
        this.leapDY = 0;
        this.leapTimer = 0;
        this.leapCooldown = 0;

        // Fist cleave
        this.cleaving = false;
        this.cleaveAngle = 0;
        this.cleaveTimer = 0;
        this.cleaveProgress = 0;
        this.cleaveCooldown = 0;
        this.cleaveHitPlayer = false;
        this.cleaveIsFinisher = false;

        // Fury Combo - 2 cleaves landed within COMBO_WINDOW_MS
        // of each other turns the 3rd into a bigger Finisher.
        this.cleaveCombo = 0;
        this.comboTimer = 0;

        // Battle Roar - independent self-buff lane, parallel to
        // leap/cleave (same idea as Royal Magus running his
        // skill rotation alongside the lightning shower).
        this.roarCooldown = PRINCE.ROAR_COOLDOWN * 0.5;
        this.roarTimer = 0;

        // Quake Slam - AOE lane, usable regardless of range.
        // Telegraph ticks independently of his leap/cleave state
        // (it's a ground-crack building up, not a body
        // commitment), but only STARTS from the idle decision
        // zone in attack().
        this.quakeCooldown = PRINCE.QUAKE_COOLDOWN * 0.5;
        this.quakeTelegraph = null;

        // Royal Judgment - far-range lane, a fire-and-forget
        // telegraphed strike (see RoyalJudgmentStrike below).
        this.judgmentCooldown = PRINCE.JUDGMENT_COOLDOWN * 0.5;

        // Guard - shields the Princess. Exclusive: rooted for
        // the whole channel, same as the leap telegraph, and
        // only attempted from the idle decision zone so it never
        // interrupts a leap/cleave already in progress.
        this.guardCooldown = PRINCE.GUARD_COOLDOWN * 0.25;
        this.guarding = false;
        this.guardChannelTimer = 0;

        // Hero transformation - triggered once by the Princess's
        // death (see triggerHeroTransformation()), never reverts.
        // "transforming" covers the frozen cutscene window;
        // "isHero" flips true only once it completes.
        this.transforming = false;
        this.isHero = false;
        this.transformFreezeMs = 0;

        // Phase 2 - flipped once by the Princess's 50% sacrifice
        // (see enterPhase2(), checkPhaseTransition() in
        // princess.js). Also permanent, also never reverts.
        this.phase2 = false;

        // Princess's heal/buff window (see princess.js's heal
        // channel and applySiblingBuff() below) - a temporary
        // attack-speed/move-speed boost, unlike enrage's
        // permanent one.
        this.buffTimer = 0;

    }

    // Called by the Princess when her heal/buff channel
    // completes (see princess.js).
    applySiblingBuff() {

        this.buffTimer = PRINCESS.BUFF_DURATION_MS;

    }

    // Called once from onEnemyKilled when the Princess dies
    // first. Freezes the whole sim (applyHitStop - same
    // mechanism the boss-kill hit-stop uses, just far longer)
    // for a transformation beat, and cleanly cancels anything he
    // was mid-committed to so nothing carries into the new form.
    // completeHeroTransformation() (below) fires once the freeze
    // actually runs out - see attack()'s check at the top of the
    // state machine, since Game.hitStopTimer ticks on real time
    // and keeps counting down even while Game.dt is zeroed.
    triggerHeroTransformation() {

        if (this.transforming || this.isHero)
            return;

        this.transforming = true;
        this.transformFreezeMs = HERO.TRANSFORM_FREEZE_MS;

        this.leaping = false;
        this.leapCharge = 0;
        this.cleaving = false;
        this.guarding = false;
        this.guardChannelTimer = 0;
        this.quakeTelegraph = null;

        applyHitStop(HERO.TRANSFORM_FREEZE_MS);

        Game.screenShake = Math.max(Game.screenShake ?? 0, 20);
        Sound.play("bossSlam");

    }

    // Fires the instant the transformation freeze ends. A
    // permanent, one-time bump - same idea as phase2's speed
    // multiply directly on this.speed rather than a live-read
    // getter, since it never needs to revert.
    completeHeroTransformation() {

        this.transforming = false;
        this.isHero = true;

        this.color = HERO.COLOR;
        this.speed *= HERO.SPEED_MULT;

        Game.screenShake = Math.max(Game.screenShake ?? 0, 18);
        Particle.createHitBurst(this.x + this.size / 2, this.y + this.size / 2);
        Sound.play("haloBreak");

    }

    // Called once by the Princess's checkPhaseTransition() when
    // the siblings' combined hp crosses the 50% threshold. Same
    // one-time-mutation shape as enrage() - permanent, additive
    // with it if both happen to land.
    enterPhase2() {

        if (this.phase2)
            return;

        this.phase2 = true;
        this.speed *= SIBLINGS_PHASE2.PRINCE_SPEED_MULT;

    }

    getCooldownMultiplier() {

        let mult = 1;

        if (this.isHero)
            mult *= HERO.COOLDOWN_MULT;

        if (this.phase2)
            mult *= SIBLINGS_PHASE2.PRINCE_COOLDOWN_MULT;

        if (this.buffTimer > 0)
            mult *= PRINCESS.BUFF_COOLDOWN_MULT;

        if (this.roarTimer > 0)
            mult *= PRINCE.ROAR_COOLDOWN_MULT;

        return mult;

    }

    // Combined TEMPORARY speed multiplier (buff + roar) - unlike
    // enrage/phase2, these expire, so they can't just mutate
    // this.speed permanently; applied as a post-hoc scale on
    // however far move() actually travelled this frame (same
    // trick the base Enemy class uses for the chill slow).
    getTempSpeedMultiplier() {

        let mult = 1;

        if (this.buffTimer > 0)
            mult *= PRINCESS.BUFF_SPEED_MULT;

        if (this.roarTimer > 0)
            mult *= PRINCE.ROAR_SPEED_MULT;

        return mult;

    }

    // =====================================
    // Movement
    // =====================================

    move() {

        // Rooted for the whole transformation cutscene - the
        // global freeze already zeroes Game.dt/timeScale so this
        // is mostly belt-and-suspenders, but it keeps the intent
        // explicit alongside every other rooted state below.
        if (this.transforming)
            return;

        if (this.leaping) {

            this.x += this.leapDX * Game.timeScale;
            this.y += this.leapDY * Game.timeScale;

            this.leapTimer -= Game.timeScale;

            if (this.leapTimer <= 0) {

                this.leaping = false;
                this.resolveSlam();

            }

            return;

        }

        // Rooted during the leap telegraph - the crouch is the
        // tell, same as the Boss's dash charge-up.
        if (this.leapCharge > 0)
            return;

        // Rooted mid-cleave, same as the Knight during its
        // sword swing.
        if (this.cleaving)
            return;

        // Rooted for the whole Guard channel - "he can't move
        // when casting" is the whole point of its vulnerability.
        if (this.guarding)
            return;

        // Temporary buffs (Princess's heal-buff, his own Battle
        // Roar) scale however far the chase actually travelled
        // this frame - same after-the-fact trick the base Enemy
        // class uses for the chill slow, just scaling up instead
        // of down.
        const tempMult = this.getTempSpeedMultiplier();

        if (tempMult !== 1) {

            const preX = this.x;
            const preY = this.y;

            super.move();

            this.x = preX + (this.x - preX) * tempMult;
            this.y = preY + (this.y - preY) * tempMult;

            return;

        }

        super.move();

    }

    // =====================================
    // Attack State Machine
    // =====================================

    attack() {

        // The transformation freeze zeroes Game.dt globally, so
        // nothing below would actually progress anyway - but
        // Game.hitStopTimer itself ticks on real time regardless
        // (see main.js's gameLoop), so this is where the exact
        // frame the freeze ends gets caught and the new form
        // actually takes effect.
        if (this.transforming) {

            if (Game.hitStopTimer <= 0)
                this.completeHeroTransformation();

            return;

        }

        if (this.leapCooldown > 0)
            this.leapCooldown -= Game.dt;

        if (this.cleaveCooldown > 0)
            this.cleaveCooldown -= Game.dt;

        if (this.buffTimer > 0)
            this.buffTimer -= Game.dt;

        if (this.roarTimer > 0)
            this.roarTimer -= Game.dt;

        if (this.quakeCooldown > 0)
            this.quakeCooldown -= Game.dt;

        if (this.judgmentCooldown > 0)
            this.judgmentCooldown -= Game.dt;

        if (this.guardCooldown > 0)
            this.guardCooldown -= Game.dt;

        if (this.comboTimer > 0)
            this.comboTimer -= Game.dt;
        else
            this.cleaveCombo = 0;

        // Guard is a full commitment - rooted, and nothing else
        // (not even Roar) fires while he's channeling it.
        if (this.guarding) {

            this.updateGuardChannel();

            return;

        }

        // Quake Slam's telegraph ticks independently of the
        // leap/cleave state below (it's a ground-crack building
        // up, not a body commitment) - only STARTING a new one
        // is gated to the idle zone further down.
        this.updateQuakeTelegraph();

        // Battle Roar - an independent lane, off cooldown
        // whenever, regardless of the leap/cleave state machine
        // below (same "runs in parallel" idea as Royal Magus'
        // nova check).
        if (this.roarCooldown > 0) {

            this.roarCooldown -= Game.dt;

        } else {

            this.roarTimer = PRINCE.ROAR_DURATION_MS;
            this.roarCooldown = PRINCE.ROAR_COOLDOWN * this.getCooldownMultiplier();

            Game.screenShake = Math.max(Game.screenShake ?? 0, 10);
            Particle.createHitBurst(this.x + this.size / 2, this.y + this.size / 2);
            Sound.play("bossSlam");

        }

        // Royal Judgment - independent lane, fire-and-forget
        // (see RoyalJudgmentStrike below), usable at any range.
        if (this.judgmentCooldown <= 0) {

            this.castRoyalJudgment();
            this.judgmentCooldown = PRINCE.JUDGMENT_COOLDOWN * this.getCooldownMultiplier();

        }

        if (this.leapCharge > 0) {

            this.leapCharge -= Game.dt;

            if (this.leapCharge <= 0) {

                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                this.leapDX = (dx / dist) * PRINCE.LEAP_SPEED;
                this.leapDY = (dy / dist) * PRINCE.LEAP_SPEED;

                this.leaping = true;
                this.leapTimer = PRINCE.LEAP_DURATION;

            }

            return;

        }

        if (this.leaping)
            return;

        if (this.cleaving) {

            this.cleaveTimer -= Game.timeScale;

            this.cleaveProgress =
                1 - (this.cleaveTimer / PRINCE.CLEAVE_SWING_MS);

            this.checkCleaveHit();

            if (this.cleaveTimer <= 0)
                this.cleaving = false;

            return;

        }

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const dx = player.x + player.size / 2 - cx;
        const dy = player.y + player.size / 2 - cy;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        // In cleave range and off cooldown -> swing.
        if (
            this.cleaveCooldown <= 0 &&
            distance <= PRINCE.CLEAVE_RANGE + 20
        ) {

            // Fury Combo - the 3rd cleave within the window is a
            // bigger Finisher, then the count resets.
            this.cleaveCombo++;
            this.comboTimer = PRINCE.COMBO_WINDOW_MS;

            this.cleaveIsFinisher = this.cleaveCombo >= 3;

            if (this.cleaveIsFinisher)
                this.cleaveCombo = 0;

            this.cleaveAngle = Math.atan2(dy, dx);
            this.cleaving = true;
            this.cleaveTimer = PRINCE.CLEAVE_SWING_MS;
            this.cleaveProgress = 0;
            this.cleaveHitPlayer = false;
            this.cleaveCooldown =
                PRINCE.CLEAVE_COOLDOWN * this.getCooldownMultiplier();

            return;

        }

        // Too far for the cleave and off leap cooldown -> wind
        // up the leap.
        if (
            this.leapCooldown <= 0 &&
            distance > PRINCE.CLEAVE_RANGE + 20
        ) {

            this.leapCharge = PRINCE.LEAP_TELEGRAPH_MS;
            this.leapCooldown =
                PRINCE.LEAP_COOLDOWN * this.getCooldownMultiplier();

            return;

        }

        // Quake Slam - only STARTS from here (the idle decision
        // zone), so it never fires mid-leap/mid-cleave.
        if (this.quakeCooldown <= 0 && !this.quakeTelegraph) {

            this.quakeTelegraph = { timer: PRINCE.QUAKE_TELEGRAPH_MS };
            this.quakeCooldown = PRINCE.QUAKE_COOLDOWN * this.getCooldownMultiplier();

            return;

        }

        // Guard - same idea: only attempted while idle, so it
        // never interrupts a leap/cleave already committed to.
        // Once he's Hero, the Princess is dead - nothing left to
        // shield, so this lane just goes quiet instead of
        // endlessly retrying a no-op.
        if (!this.isHero && this.guardCooldown <= 0) {

            this.tryStartGuard();

        }

    }

    // Fires once when the leap's flight time runs out - an AOE
    // burst at wherever he actually landed, not a remembered
    // target point (so dodging mid-flight still matters).

    resolveSlam() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const radius = PRINCE.SLAM_RADIUS * (this.isHero ? HERO.RADIUS_MULT : 1);

        if (Math.hypot(px - cx, py - cy) <= radius)
            player.takeHit(ENEMY_LABELS.prince);

        Game.screenShake = Math.max(Game.screenShake ?? 0, 14);

        Particle.createHitBurst(cx, cy);

    }

    // Same rotating-arc test the Knight's own sword uses -
    // angleToPlayer compared against the current swing angle.

    checkCleaveHit() {

        if (this.cleaveHitPlayer)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dx = px - cx;
        const dy = py - cy;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > PRINCE.CLEAVE_RANGE)
            return;

        const angleToPlayer = Math.atan2(dy, dx);
        const arc = this.cleaveIsFinisher ? PRINCE.FINISHER_ARC : PRINCE.CLEAVE_ARC;

        const currentAngle =
            this.cleaveAngle - arc / 2 + arc * this.cleaveProgress;

        let diff = Math.abs(angleToPlayer - currentAngle);

        if (diff > Math.PI)
            diff = Math.PI * 2 - diff;

        if (diff < 0.5) {

            player.takeHit(ENEMY_LABELS.prince);
            this.cleaveHitPlayer = true;

        }

    }

    // =====================================
    // Quake Slam
    // =====================================
    //
    // A telegraphed AOE centered on himself - his answer to
    // being kited now that he's slow. Ticks down regardless of
    // his leap/cleave state (see attack()); resolves into a
    // single hit-test against wherever the player actually is
    // when the telegraph completes, same "dodge the tell" logic
    // as every other telegraphed attack in this fight.

    updateQuakeTelegraph() {

        if (!this.quakeTelegraph)
            return;

        this.quakeTelegraph.timer -= Game.dt;

        if (this.quakeTelegraph.timer > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const radius = PRINCE.QUAKE_RADIUS * (this.isHero ? HERO.RADIUS_MULT : 1);

        if (Math.hypot(px - cx, py - cy) <= radius)
            player.takeHit(ENEMY_LABELS.prince);

        Game.screenShake = Math.max(Game.screenShake ?? 0, 16);
        Particle.createHitBurst(cx, cy);

        this.quakeTelegraph = null;

    }

    // =====================================
    // Royal Judgment
    // =====================================
    //
    // Far-range answer - a telegraphed strike of light at the
    // player's position when cast (see RoyalJudgmentStrike
    // below), so standing at range isn't automatically safe just
    // because he's slow. Reads as royal/arcane rather than the
    // barbaric thrown-rock version this replaced.

    castRoyalJudgment() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const radius = PRINCE.JUDGMENT_RADIUS * (this.isHero ? HERO.RADIUS_MULT : 1);

        Game.hazards.push(new RoyalJudgmentStrike(px, py, radius));

        Sound.play("bossSlam");

    }

    // =====================================
    // Guard (shields the Princess)
    // =====================================
    //
    // A committed 2s channel - rooted (see move()) - that grants
    // the Princess a flat GUARD_SHIELD_HP shield (see the
    // generic shieldHp handling in Enemy.takeDamage). Only
    // starts if she's alive, not already shielded, and within
    // range; otherwise a short retry rather than burning the
    // full cooldown on a no-op.

    tryStartGuard() {

        const princess = Game.enemies.find(
            e => e.type === "princess" && !e.isDead()
        );

        if (!princess || princess.shieldHp > 0) {

            this.guardCooldown = PRINCE.GUARD_RETRY_MS;

            return;

        }

        const dist = Math.hypot(
            (princess.x + princess.size / 2) - (this.x + this.size / 2),
            (princess.y + princess.size / 2) - (this.y + this.size / 2)
        );

        if (dist > PRINCE.GUARD_CAST_RANGE) {

            this.guardCooldown = PRINCE.GUARD_RETRY_MS;

            return;

        }

        this.guarding = true;
        this.guardChannelTimer = PRINCE.GUARD_CHANNEL_MS;

    }

    updateGuardChannel() {

        this.guardChannelTimer -= Game.dt;

        if (this.guardChannelTimer > 0)
            return;

        this.guarding = false;
        this.guardCooldown = PRINCE.GUARD_COOLDOWN * this.getCooldownMultiplier();

        const princess = Game.enemies.find(
            e => e.type === "princess" && !e.isDead()
        );

        // She may have died mid-channel - the cast just fizzles.
        if (!princess)
            return;

        princess.shieldHp = PRINCE.GUARD_SHIELD_HP;

        Game.screenShake = Math.max(Game.screenShake ?? 0, 10);
        Particle.createHitBurst(
            princess.x + princess.size / 2,
            princess.y + princess.size / 2
        );
        Sound.play("haloBreak");

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (this.transforming) {

            this.drawTransformationCutscene();
            super.draw();
            this.drawLabel();

            return;

        }

        if (this.leapCharge > 0)
            this.drawLeapTelegraph();

        if (this.quakeTelegraph)
            this.drawQuakeTelegraph();

        if (this.guarding)
            this.drawGuardChannel();

        super.draw();

        if (this.cleaving)
            this.drawCleave();

        this.drawLabel();

    }

    // The frozen cutscene beat - an intensifying golden nova
    // centered on him (world-space, so it stays anchored to
    // wherever he actually is) plus a screen-centered banner
    // (canvas-absolute, so it reads regardless of his position).
    // Progress is read straight off Game.hitStopTimer rather than
    // a timer of its own: hitStopTimer already ticks on real time
    // even while this freeze zeroes Game.dt/timeScale for
    // everything else (see main.js's gameLoop), so it's the one
    // clock still actually running during the cutscene.

    drawTransformationCutscene() {

        const progress = 1 - Game.hitStopTimer / this.transformFreezeMs;
        const clamped = Math.max(0, Math.min(1, progress));

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const pulse = 0.5 + Math.sin(Date.now() / (140 - clamped * 80)) * 0.3;

        drawPixelZone(cx, cy, this.size * (0.6 + clamped * 1.3), {
            fill: HERO.COLOR,
            rim: HERO.GLOW_COLOR,
            fillAlpha: (0.15 + clamped * 0.3) * pulse,
            rimAlpha: 0.4 + clamped * 0.4
        });

        ctx.save();
        ctx.globalAlpha = Math.min(1, clamped * 2.5);

        drawPixelText(
            "THE PRINCE FALLS",
            canvas.width / 2,
            canvas.height / 2 - 34,
            3,
            { color: "#c9bda4", shadow: "rgba(0, 0, 0, 0.9)" }
        );

        drawPixelText(
            "HERO RISES",
            canvas.width / 2,
            canvas.height / 2 + 10,
            6,
            { color: HERO.COLOR, shadow: "rgba(0, 0, 0, 0.9)" }
        );

        ctx.restore();

    }

    drawLabel() {

        const tag = this.transforming
            ? "TRANSFORMING"
            : this.guarding
                ? "GUARDING"
                : this.isHero
                    ? null
                    : this.roarTimer > 0
                        ? "ROARING"
                        : this.buffTimer > 0
                            ? "BUFFED"
                            : null;

        const label = [
            this.isHero ? "HERO" : "PRINCE",
            (this.phase2 && !this.isHero) ? "PHASE 2" : null,
            tag
        ].filter(Boolean).join(" - ");

        const color = this.transforming
            ? HERO.COLOR
            : this.guarding
                ? PRINCE.GUARD_COLOR
                : this.isHero
                    ? HERO.COLOR
                    : this.roarTimer > 0
                        ? "#ff8a3d"
                        : this.buffTimer > 0
                            ? "#e8c84a"
                            : this.phase2
                                ? "#ff5a3d"
                                : "#e0a0c0";

        drawPixelText(
            label,
            this.x + this.size / 2,
            this.y - 22,
            2,
            { color, shadow: "rgba(0, 0, 0, 0.9)" }
        );

    }

    // Growing danger disc at the live-tracked landing point, so
    // the telegraph stays honest right up until he actually
    // leaps (mirrors MeteorStrike's telegraph-then-impact read).

    drawLeapTelegraph() {

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const travel = PRINCE.LEAP_SPEED * PRINCE.LEAP_DURATION;

        const lx = this.x + (dx / dist) * travel + this.size / 2;
        const ly = this.y + (dy / dist) * travel + this.size / 2;

        const progress = 1 - this.leapCharge / PRINCE.LEAP_TELEGRAPH_MS;
        const alpha = 0.25 + Math.sin(Date.now() / 60) * 0.1;

        drawPixelZone(lx, ly, PRINCE.SLAM_RADIUS * (0.4 + progress * 0.6), {
            fill: "#ff2d55",
            rim: "#ff6b8a",
            fillAlpha: alpha * 0.35,
            rimAlpha: alpha + 0.25
        });

    }

    // Ground cracks spreading out from under him as Quake Slam
    // builds - centered on his own position (unlike the leap's
    // telegraph, which tracks the player).

    drawQuakeTelegraph() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const progress = 1 - this.quakeTelegraph.timer / PRINCE.QUAKE_TELEGRAPH_MS;
        const alpha = 0.3 + Math.sin(Date.now() / 50) * 0.15;

        const radius = PRINCE.QUAKE_RADIUS * (this.isHero ? HERO.RADIUS_MULT : 1);

        drawPixelZone(cx, cy, radius * progress, {
            fill: PRINCE.QUAKE_COLOR,
            rim: "#ff8a5a",
            fillAlpha: alpha * 0.3,
            rimAlpha: alpha + 0.2
        });

    }

    // Golden ward gathering around him while he channels Guard -
    // reads as "committed" (matches the root) rather than a
    // quick cast.

    drawGuardChannel() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const progress = 1 - this.guardChannelTimer / PRINCE.GUARD_CHANNEL_MS;
        const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.25;

        drawPixelShield(cx, cy, this.size * (0.7 + progress * 0.3), {
            color: PRINCE.GUARD_COLOR,
            glowColor: PRINCE.GUARD_COLOR,
            glintColor: "#fff6d8",
            alpha: pulse,
            fillAlpha: 0.1
        });

    }

    // A wide claw-swipe wedge rather than a drawn blade -
    // visually distinct from the Knight's sword.

    drawCleave() {

        const arc = this.cleaveIsFinisher ? PRINCE.FINISHER_ARC : PRINCE.CLEAVE_ARC;
        const currentAngle =
            this.cleaveAngle - arc / 2 + arc * this.cleaveProgress;

        const halfWidth = this.cleaveIsFinisher ? 0.7 : 0.4;

        ctx.save();

        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);

        ctx.fillStyle = this.cleaveIsFinisher
            ? "rgba(255, 140, 60, 0.65)"
            : "rgba(255, 90, 130, 0.55)";
        ctx.shadowBlur = this.cleaveIsFinisher ? 18 : 10;
        ctx.shadowColor = this.cleaveIsFinisher ? "#ff8c3c" : "#ff5a82";

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0, 0,
            PRINCE.CLEAVE_RANGE,
            currentAngle - halfWidth,
            currentAngle + halfWidth
        );
        ctx.closePath();
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// Royal Judgment - telegraphed strike of light
// =====================================
//
// Same telegraph-then-impact shape as Royal Magus' MeteorStrike
// (see royalMagus.js), but themed as a descending column of
// radiant judgment rather than a thrown rock - a growing halo
// of light at the player's position when cast, resolving
// PRINCE.JUDGMENT_TELEGRAPH_MS later. Lives in Game.hazards like
// every other fire-and-forget attack in this game.

class RoyalJudgmentStrike {

    constructor(x, y, radius = PRINCE.JUDGMENT_RADIUS) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.timer = PRINCE.JUDGMENT_TELEGRAPH_MS;
        this.landed = false;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer <= 0 && !this.landed) {

            this.landed = true;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            if (Math.hypot(px - this.x, py - this.y) < this.radius)
                player.takeHit(ENEMY_LABELS.prince);

            Game.screenShake = Math.max(Game.screenShake ?? 0, 12);
            Particle.createHitBurst(this.x, this.y);

        }

    }

    isDead() {
        return this.landed;
    }

    draw() {

        const progress = 1 - this.timer / PRINCE.JUDGMENT_TELEGRAPH_MS;
        const alpha = 0.3 + Math.sin(Date.now() / 60) * 0.12;

        // Impact zone telegraph - a widening halo of light.
        drawPixelZone(this.x, this.y, this.radius, {
            fill: PRINCE.JUDGMENT_COLOR,
            rim: "#fff3c9",
            fillAlpha: alpha * 0.3,
            rimAlpha: alpha + 0.2
        });

        // A narrowing column of radiant light gathering overhead
        // rather than a falling shadow - brightens as it nears.
        drawPixelDisc(this.x, this.y, 30 - progress * 14, {
            color: "#fff3c9",
            alpha: 0.25 + progress * 0.5,
            unit: Math.max(3, Math.round(this.radius * 0.06)),
            dither: 0.3
        });

    }

}