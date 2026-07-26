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
// Enrages if the Princess dies first (see enrage(), called from
// onEnemyKilled in game.js) - a real cost for denying her sustain
// by killing her before him.

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

        // Enrage - flipped once, never reverts (see enrage()).
        this.enraged = false;

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
    // first. A permanent, one-time bump - same idea as the
    // Blood Cleric's ward-haste multiplying this.speed directly
    // rather than routing through a live-read getter, since it
    // never needs to revert.
    enrage() {

        if (this.enraged)
            return;

        this.enraged = true;
        this.speed *= PRINCE.ENRAGE_SPEED_MULT;

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

        if (this.enraged)
            mult *= PRINCE.ENRAGE_COOLDOWN_MULT;

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

        if (this.leapCooldown > 0)
            this.leapCooldown -= Game.dt;

        if (this.cleaveCooldown > 0)
            this.cleaveCooldown -= Game.dt;

        if (this.buffTimer > 0)
            this.buffTimer -= Game.dt;

        if (this.roarTimer > 0)
            this.roarTimer -= Game.dt;

        if (this.comboTimer > 0)
            this.comboTimer -= Game.dt;
        else
            this.cleaveCombo = 0;

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

        if (Math.hypot(px - cx, py - cy) <= PRINCE.SLAM_RADIUS)
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
    // Drawing
    // =====================================

    draw() {

        if (this.leapCharge > 0)
            this.drawLeapTelegraph();

        super.draw();

        if (this.cleaving)
            this.drawCleave();

        this.drawLabel();

    }

    drawLabel() {

        const tag = this.enraged
            ? "ENRAGED"
            : this.roarTimer > 0
                ? "ROARING"
                : this.buffTimer > 0
                    ? "BUFFED"
                    : null;

        const label = [
            "PRINCE",
            this.phase2 ? "PHASE 2" : null,
            tag
        ].filter(Boolean).join(" - ");

        const color = this.enraged
            ? "#ff5a3d"
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