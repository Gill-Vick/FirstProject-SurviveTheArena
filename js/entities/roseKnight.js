// =====================================
// Rose Knight (Act II, waves 21+)
// =====================================
//
// The garden's own knight, and deliberately built on the castle
// Lancer's BEHAVIOUR - same plant-strike-charge rhythm, so a
// player who learned the Lancer already knows how to read this -
// but armed as a gardener rather than a cavalryman. It carries a
// scythe, and the difference is not cosmetic:
//
//   ARC      the Lancer answers a line. This answers a quadrant,
//            so backing straight off stops working - you have to
//            get inside it or out of it
//   GUARD    petals that eat whole hits AND grow back, so the
//            shield is a window rather than a one-time tax
//   GROUND   the charge lays bramble the whole way, which is the
//            garden's whole thesis: the danger is where it has
//            been, not just where it is
//
// State machine:
//
//   idle -> cleaveWindup -> cleaving -> chargeWindup -> charging -> idle
//
// The cleave ALWAYS flows into the charge, guard up or not. That
// is the main thing that makes it a harder unit than the Lancer,
// which only chains once its shield is gone.
//
// Its body never damages the player. Only the blade, mid-cleave
// or mid-charge, and the thorns it plants - all drawn before
// they can land. Four of these arrive at once (see
// cornerGuardsForWave in wave.js); four bodies that hurt to touch
// would be a different game.

class RoseKnight extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.roseKnight;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "roseKnight";
        this.knockbackImmune = true;

        this.petals = this.maxPetals();
        this.regrow = this.regrowTime();

        // "idle" | "cleaveWindup" | "cleaving" | "chargeWindup" | "charging"
        this.state = "idle";
        this.stateTimer = 0;

        // Staggered so four knights arriving together don't swing
        // in unison - four simultaneous cleaves is one unreadable
        // event rather than four readable ones.
        this.cleaveCooldown = cfg.CLEAVE_COOLDOWN * Math.random();

        // Centre of the arc. The blade travels from one edge of
        // it to the other over CLEAVE_MS (see bladeAngle).
        this.attackAngle = 0;
        this.swingProgress = 0;
        this.hitThisAttack = false;

        this.chargeDX = 0;
        this.chargeDY = 0;
        this.sinceTrail = 0;

    }

    maxPetals() {

        return this.isElite
            ? GARDEN_ELITE.KNIGHT_GUARD_PETALS
            : GARDEN.roseKnight.GUARD_PETALS;

    }

    regrowTime() {

        return GARDEN.roseKnight.GUARD_REGROW_MS *
               (this.isElite ? GARDEN_ELITE.KNIGHT_GUARD_REGROW_MULT : 1);

    }

    // =====================================
    // Petal Guard
    // =====================================
    //
    // Each petal eats one whole hit, exactly like the Lancer's
    // shield studs - so the counter is hit COUNT, not damage, and
    // the fast classes get through it while the heavy hitters
    // waste their big swings on it.

    takeDamage(amount, crit = false) {

        if (this.petals > 0) {

            this.petals--;
            this.flashTimer = 7;

            // A petal torn off is worth seeing.
            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return;

        }

        super.takeDamage(amount, crit);

    }

    // =====================================
    // Movement
    // =====================================
    //
    // Travels under its own speed while idling, and under the
    // charge's speed while charging. Every bracing phase holds it
    // planted - the telegraph is only honest if the thing cannot
    // walk out from under it.

    move() {

        if (this.state === "charging") {

            this.advanceCharge();
            return;

        }

        if (this.state !== "idle")
            return;

        super.move();

    }

    advanceCharge() {

        const cfg = GARDEN.roseKnight;
        const step = Game.timeScale;

        this.x += this.chargeDX * step;
        this.y += this.chargeDY * step;

        // Thorns laid per distance travelled rather than per
        // frame, so the trail has the same density at any frame
        // rate. Same rule the boar's trail follows.
        this.sinceTrail += Math.hypot(this.chargeDX, this.chargeDY) * step;

        if (this.sinceTrail >= cfg.TRAIL_EVERY_PX) {

            this.sinceTrail = 0;
            this.plantThorn(this.x + this.size / 2, this.y + this.size / 2);

        }

        // Stops dead at the wall rather than sliding along it.
        const hitEdge =
            this.x <= 0 || this.y <= 0 ||
            this.x + this.size >= canvas.width ||
            this.y + this.size >= canvas.height;

        if (hitEdge)
            this.endCharge();

    }

    plantThorn(x, y) {

        Game.hazards.push(new BramblePatch(
            Math.max(16, Math.min(canvas.width - 16, x)),
            Math.max(16, Math.min(canvas.height - 16, y)),
            GARDEN.roseKnight.TRAIL_MS,
            ACT2_BOSSES.matron.THORN_SPROUT_MS
        ));

    }

    // =====================================
    // Attack State Machine
    // =====================================

    attack() {

        this.tickGuard();

        switch (this.state) {

            case "idle":
                this.updateIdle();
                break;

            case "cleaveWindup":
                this.updateCleaveWindup();
                break;

            case "cleaving":
                this.updateCleaving();
                break;

            case "chargeWindup":
                this.updateChargeWindup();
                break;

            case "charging":
                this.updateCharging();
                break;

        }

    }

    tickGuard() {

        if (this.petals >= this.maxPetals())
            return;

        this.regrow -= Game.dt;

        if (this.regrow > 0)
            return;

        this.petals++;
        this.regrow = this.regrowTime();

    }

    updateIdle() {

        this.cleaveCooldown -= Game.dt;

        if (this.cleaveCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const target = getAggroSource(this);
        const dx = (target.x + target.size / 2) - cx;
        const dy = (target.y + target.size / 2) - cy;

        if (Math.hypot(dx, dy) > GARDEN.roseKnight.CLEAVE_RANGE)
            return;

        this.attackAngle = Math.atan2(dy, dx);
        this.state = "cleaveWindup";
        this.stateTimer = GARDEN.roseKnight.CLEAVE_WINDUP_MS;

    }

    updateCleaveWindup() {

        this.stateTimer -= Game.dt;

        if (this.stateTimer > 0)
            return;

        this.state = "cleaving";
        this.stateTimer = GARDEN.roseKnight.CLEAVE_MS;
        this.swingProgress = 0;
        this.hitThisAttack = false;

    }

    updateCleaving() {

        const cfg = GARDEN.roseKnight;

        this.stateTimer -= Game.dt;

        // The blade travels the arc over the swing's life, and
        // the hitbox travels with it - so the frame it reaches
        // you is the frame it hits you, exactly as with the
        // Warrior's own sword.
        this.swingProgress =
            Math.min(1, 1 - this.stateTimer / cfg.CLEAVE_MS);

        this.checkCleaveHit();

        if (this.stateTimer > 0)
            return;

        // Always chains, guard or no guard. The Lancer waits for
        // a broken shield; this does not.
        const target = getAggroSource(this);

        this.attackAngle = Math.atan2(
            (target.y + target.size / 2) - (this.y + this.size / 2),
            (target.x + target.size / 2) - (this.x + this.size / 2)
        );

        this.state = "chargeWindup";
        this.stateTimer = cfg.CHARGE_WINDUP_MS;

    }

    updateChargeWindup() {

        const cfg = GARDEN.roseKnight;

        this.stateTimer -= Game.dt;

        if (this.stateTimer > 0)
            return;

        this.state = "charging";
        this.stateTimer = cfg.CHARGE_MS;
        this.hitThisAttack = false;
        this.sinceTrail = 0;

        this.chargeDX = Math.cos(this.attackAngle) * cfg.CHARGE_SPEED;
        this.chargeDY = Math.sin(this.attackAngle) * cfg.CHARGE_SPEED;

    }

    updateCharging() {

        this.stateTimer -= Game.dt;

        // The charge keeps a straight box: the blade is held out
        // ahead rather than swung, so a rectangle is the honest
        // shape for it.
        this.checkChargeHit();

        if (this.stateTimer <= 0)
            this.endCharge();

    }

    endCharge() {

        // An elite finishes by bursting into a ring of thorns, so
        // the spot it stopped in punishes anyone who chased it.
        if (this.isElite)
            this.bloomThorns();

        this.state = "idle";
        this.cleaveCooldown = GARDEN.roseKnight.CLEAVE_COOLDOWN;

    }

    bloomThorns() {

        const count = GARDEN_ELITE.KNIGHT_BLOOM_THORNS;
        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        for (let i = 0; i < count; i++) {

            const a = (i / count) * Math.PI * 2;

            this.plantThorn(
                cx + Math.cos(a) * GARDEN_ELITE.KNIGHT_BLOOM_RADIUS,
                cy + Math.sin(a) * GARDEN_ELITE.KNIGHT_BLOOM_RADIUS
            );

        }

    }

    // =====================================
    // Hitbox
    // =====================================
    //
    // Two shapes, because the knight does two different things:
    // the cleave is an arc the blade sweeps through, and the
    // charge is a straight box with the blade held out ahead.
    // Both are drawn with the same numbers they are checked
    // with - what you see is what can hit you. Each fires at
    // most once per attack.

    // Where the blade is right now: it travels from one edge of
    // the arc to the other across the swing. Shared by the hit
    // test and the drawn scythe, so they cannot disagree.
    bladeAngle() {

        const arc = GARDEN.roseKnight.CLEAVE_ARC;

        return this.attackAngle - arc / 2 + arc * this.swingProgress;

    }

    checkCleaveHit() {

        if (this.hitThisAttack)
            return;

        const cfg = GARDEN.roseKnight;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const dx = (player.x + player.size / 2) - cx;
        const dy = (player.y + player.size / 2) - cy;

        const pad = player.size / 2;

        if (Math.hypot(dx, dy) > cfg.CLEAVE_RANGE + pad)
            return;

        // Shortest angular distance to wherever the blade has
        // got to this frame.
        let diff = Math.atan2(dy, dx) - this.bladeAngle();

        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) > cfg.CLEAVE_BLADE)
            return;

        player.takeHit(ENEMY_LABELS.roseKnight);
        this.hitThisAttack = true;

    }

    checkChargeHit() {

        if (this.hitThisAttack)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const dx = (player.x + player.size / 2) - cx;
        const dy = (player.y + player.size / 2) - cy;

        const cos = Math.cos(-this.attackAngle);
        const sin = Math.sin(-this.attackAngle);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const pad = player.size / 2;
        const width = GARDEN.roseKnight.CHARGE_WIDTH;

        if (
            localX >= -pad &&
            localX <= this.size + pad &&
            Math.abs(localY) <= width / 2 + pad
        ) {

            player.takeHit(ENEMY_LABELS.roseKnight);
            this.hitThisAttack = true;

        }

    }

    // Body contact is harmless - see the header.
    checkPlayerCollision() {}

    // =====================================
    // Drawing
    // =====================================

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        this.drawTelegraphs(cx, cy);

        super.draw();

        this.drawScythe(cx, cy);
        this.drawGuard(cx, cy);

    }

    drawTelegraphs(cx, cy) {

        const cfg = GARDEN.roseKnight;

        // The charge is still a straight box - it travels in a
        // line, so a line is the honest warning for it.
        const box = (length, alpha) => {

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.attackAngle);

            drawPixelRectZone(length, cfg.CHARGE_WIDTH, {
                color: "rgb(214, 51, 92)",
                alpha,
                unit: Math.max(3, Math.round(cfg.CHARGE_WIDTH * 0.12))
            });

            ctx.restore();

        };

        if (this.state === "cleaveWindup") {

            // The WHOLE arc, filling in as the wind-up
            // completes - so the warning is "this entire wedge",
            // and the countdown is how solid it has got.
            const t = 1 - this.stateTimer / cfg.CLEAVE_WINDUP_MS;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.attackAngle);

            drawPixelSector(0, 0, cfg.CLEAVE_RANGE, 0, cfg.CLEAVE_ARC / 2, {
                color: "rgb(214, 51, 92)",
                alpha: 0.14 + t * 0.22,
                unit: 6
            });

            ctx.restore();

        }

        if (this.state === "cleaving") {

            // Only the part the blade has already passed
            // through, so the sweep is legible as a sweep.
            const arc = cfg.CLEAVE_ARC;
            const swept = Math.max(0.05, arc * this.swingProgress);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.attackAngle - arc / 2 + swept / 2);

            drawPixelSector(0, 0, cfg.CLEAVE_RANGE, 0, swept / 2, {
                color: "rgb(255, 111, 146)",
                alpha: 0.5,
                unit: 6
            });

            ctx.restore();

        }

        if (this.state === "chargeWindup") {

            const reach = cfg.CHARGE_SPEED * (cfg.CHARGE_MS / 16.7) + this.size;
            const pulse = 0.34 + Math.sin(Date.now() / 60) * 0.14;

            box(reach, pulse);

        }

        if (this.state === "charging") {

            // Shrinks with the charge's remaining travel, so it
            // reads as "how much further this is still coming".
            box(cfg.CHARGE_SPEED * (this.stateTimer / 16.7) + this.size, 0.42);

        }

    }

    // A gardener's scythe - a long thorned haft with the blade
    // running out off the end, and a rose bound where the two
    // meet.
    //
    // Only drawn while it is actually being used: the knight
    // carries it slung out of sight and brings it up to strike,
    // so a scythe on screen means an attack is happening.
    //
    // ORIENTATION MATTERS HERE. bladeAngle() increases across
    // the swing, and on a y-down canvas an increasing rotation
    // sweeps clockwise - so in the scythe's own local frame the
    // blade is travelling toward +y. That is the LEADING side,
    // and therefore where the cutting edge has to sit. Built on
    // the -y side it was being swung spine-first.
    drawScythe(cx, cy) {

        // Slung away between attacks.
        if (this.state === "idle")
            return;

        const cfg = GARDEN.roseKnight;

        // Wound back to the arc's starting edge while bracing,
        // so the swing visibly has somewhere to come FROM; the
        // live blade angle through the cleave itself; and the
        // charge's fixed heading while it runs.
        const angle =
            this.state === "cleaving" ? this.bladeAngle()
            : this.state === "cleaveWindup"
                ? this.attackAngle - cfg.CLEAVE_ARC / 2
            : this.attackAngle;

        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));
        ctx.rotate(angle);

        const len = cfg.SCYTHE_LENGTH;

        // Haft: a dark cut stem rather than a steel pole.
        ctx.fillStyle = "#3a2a1c";
        ctx.fillRect(-10, -3, len + 10, 5);

        ctx.fillStyle = "#5a4229";
        ctx.fillRect(-10, -3, len + 10, 2);

        // Thorns down the haft, alternating sides.
        ctx.fillStyle = "#2c4a24";

        for (let i = 1; i * 13 < len - 8; i++) {

            const tx = i * 13;

            ctx.fillRect(tx, i % 2 === 0 ? -6 : 2, 3, 4);

        }

        // The rose bound at the collar where blade meets haft.
        ctx.fillStyle = "#7d1d33";
        ctx.fillRect(len - 8, -7, 10, 14);
        ctx.fillStyle = "#d6335c";
        ctx.fillRect(len - 6, -5, 6, 10);
        ctx.fillStyle = "#ff6f92";
        ctx.fillRect(len - 4, -2, 3, 4);

        // Blade: long reach out past the haft with only a gentle
        // lean into the swing, drawn as stepped pixel blocks so
        // it keeps the game's look instead of a smooth curve.
        // [x, y, w, h] in blade-local space, running outward and
        // bending toward +y - the direction of travel.
        const blade = [
            [len - 2,  -3, 13, 12],
            [len + 10,  0, 13, 12],
            [len + 22,  4, 12, 12],
            [len + 33,  9, 12, 12],
            [len + 43, 16, 11, 11],
            [len + 51, 24, 10, 10],
            [len + 57, 33, 9, 9]
        ];

        ctx.fillStyle = "#8d99a0";
        blade.forEach(b => ctx.fillRect(b[0], b[1], b[2], b[3]));

        // Cutting edge along the LEADING face (+y) - the side
        // that arrives first, and the side that does the work.
        ctx.fillStyle = "#d8e2e6";
        blade.forEach(b => ctx.fillRect(b[0], b[1] + b[3] - 3, b[2], 3));

        // Dark spine along the back.
        ctx.fillStyle = "#4a5459";
        blade.forEach(b => ctx.fillRect(b[0], b[1], b[2], 2));

        ctx.restore();

    }

    // The guard, drawn as the petals it actually has left - so
    // "how many more hits does this eat" is answerable at a
    // glance, from across the arena, without a bar.
    drawGuard(cx, cy) {

        if (this.petals <= 0)
            return;

        const max = this.maxPetals();
        const r = this.size * 0.62;

        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));

        for (let i = 0; i < this.petals; i++) {

            const a = (i / max) * Math.PI * 2 - Math.PI / 2;

            const px = Math.round(Math.cos(a) * r);
            const py = Math.round(Math.sin(a) * r);

            ctx.fillStyle = "#7d1d33";
            ctx.fillRect(px - 5, py - 5, 10, 10);

            ctx.fillStyle = this.isElite ? "#ff9ab4" : "#d6335c";
            ctx.fillRect(px - 3, py - 3, 6, 6);

        }

        ctx.restore();

    }

}
