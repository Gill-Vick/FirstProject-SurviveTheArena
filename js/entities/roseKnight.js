// =====================================
// Rose Knight (Act II, waves 21+)
// =====================================
//
// The garden's own knight, and deliberately built on the castle
// Lancer's bones - same brace-thrust-charge shape, so a player
// who learned the Lancer already knows how to read this - then
// upgraded in the three ways that matter here:
//
//   REACH    a longer lance and a wider thrust
//   GUARD    petals that eat whole hits AND grow back, so the
//            shield is a window rather than a one-time tax
//   GROUND   the charge lays bramble the whole way, which is the
//            garden's whole thesis: the danger is where it has
//            been, not just where it is
//
// State machine, identical in shape to the Lancer's:
//
//   idle -> thrustWindup -> thrusting -> chargeWindup -> charging -> idle
//
// The thrust ALWAYS flows into the charge, guard up or not. That
// is the main thing that makes it a harder unit than the Lancer,
// which only chains once its shield is gone.
//
// Its body never damages the player. Only the lance, mid-thrust
// or mid-charge, and the thorns it plants - both drawn before
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

        // "idle" | "thrustWindup" | "thrusting" | "chargeWindup" | "charging"
        this.state = "idle";
        this.stateTimer = 0;

        // Staggered so four knights arriving together don't thrust
        // in unison - four simultaneous lances is one unreadable
        // event rather than four readable ones.
        this.thrustCooldown = cfg.THRUST_COOLDOWN * Math.random();

        this.attackAngle = 0;
        this.lanceExtension = 0;
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

            case "thrustWindup":
                this.updateThrustWindup();
                break;

            case "thrusting":
                this.updateThrusting();
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

        this.thrustCooldown -= Game.dt;

        if (this.thrustCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const target = getAggroSource(this);
        const dx = (target.x + target.size / 2) - cx;
        const dy = (target.y + target.size / 2) - cy;

        if (Math.hypot(dx, dy) > GARDEN.roseKnight.THRUST_RANGE)
            return;

        this.attackAngle = Math.atan2(dy, dx);
        this.state = "thrustWindup";
        this.stateTimer = GARDEN.roseKnight.THRUST_WINDUP_MS;

    }

    updateThrustWindup() {

        this.stateTimer -= Game.dt;

        if (this.stateTimer > 0)
            return;

        this.state = "thrusting";
        this.stateTimer = GARDEN.roseKnight.THRUST_MS;
        this.hitThisAttack = false;

    }

    updateThrusting() {

        const cfg = GARDEN.roseKnight;

        this.stateTimer -= Game.dt;

        // The lance visibly slides out and back, peaking halfway
        // through - so the frame that can hit you is the frame it
        // looks fully extended.
        const elapsed = cfg.THRUST_MS - this.stateTimer;
        const half = cfg.THRUST_MS / 2;

        this.lanceExtension =
            Math.max(0, 1 - Math.abs(elapsed - half) / half) * 26;

        this.checkLanceHit(cfg.THRUST_RANGE, cfg.THRUST_WIDTH);

        if (this.stateTimer > 0)
            return;

        this.lanceExtension = 0;

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

        this.checkLanceHit(this.size, GARDEN.roseKnight.CHARGE_WIDTH);

        if (this.stateTimer <= 0)
            this.endCharge();

    }

    endCharge() {

        // An elite finishes by bursting into a ring of thorns, so
        // the spot it stopped in punishes anyone who chased it.
        if (this.isElite)
            this.bloomThorns();

        this.state = "idle";
        this.thrustCooldown = GARDEN.roseKnight.THRUST_COOLDOWN;

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
    // The same rotated-rectangle test the Lancer uses, drawn with
    // the same numbers it is checked with - what you see is what
    // can hit you. Fires once per attack.

    checkLanceHit(length, width) {

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

        if (
            localX >= -pad &&
            localX <= length + pad &&
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

        this.drawLance(cx, cy);
        this.drawGuard(cx, cy);

    }

    drawTelegraphs(cx, cy) {

        const cfg = GARDEN.roseKnight;

        const zone = (length, width, alpha) => {

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.attackAngle);

            drawPixelRectZone(length, width, {
                color: "rgb(214, 51, 92)",
                alpha,
                unit: Math.max(3, Math.round(width * 0.12))
            });

            ctx.restore();

        };

        if (this.state === "thrustWindup") {

            // Fills in as the brace completes, so the windup
            // reads as a countdown rather than a flat warning.
            const t = 1 - this.stateTimer / cfg.THRUST_WINDUP_MS;
            zone(cfg.THRUST_RANGE, cfg.THRUST_WIDTH, 0.16 + t * 0.24);

        }

        if (this.state === "thrusting")
            zone(cfg.THRUST_RANGE, cfg.THRUST_WIDTH, 0.55);

        if (this.state === "chargeWindup") {

            const reach = cfg.CHARGE_SPEED * (cfg.CHARGE_MS / 16.7) + this.size;
            const pulse = 0.34 + Math.sin(Date.now() / 60) * 0.14;

            zone(reach, cfg.CHARGE_WIDTH, pulse);

        }

        if (this.state === "charging") {

            // Shrinks with the charge's remaining travel, so it
            // reads as "how much further this is still coming".
            const left = cfg.CHARGE_SPEED * (this.stateTimer / 16.7) + this.size;
            zone(left, cfg.CHARGE_WIDTH, 0.42);

        }

    }

    // A thorned lance with a rose at the head - the silhouette
    // that names the unit. Points wherever it is about to strike,
    // and at the player the rest of the time.
    drawLance(cx, cy) {

        const cfg = GARDEN.roseKnight;

        const bracing =
            this.state !== "idle";

        const target = getAggroSource(this);

        const angle = bracing
            ? this.attackAngle
            : Math.atan2(
                (target.y + target.size / 2) - cy,
                (target.x + target.size / 2) - cx
            );

        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));
        ctx.rotate(angle);

        const lx = Math.round(this.lanceExtension);
        const len = cfg.LANCE_LENGTH;

        // Shaft: a green stem rather than a steel pole.
        ctx.fillStyle = "#3f6b32";
        ctx.fillRect(lx, -3, len, 5);

        ctx.fillStyle = "#578f43";
        ctx.fillRect(lx, -3, len, 2);

        // Thorns down the stem, alternating sides.
        ctx.fillStyle = "#2c4a24";

        for (let i = 1; i * 12 < len - 12; i++) {

            const tx = lx + i * 12;
            const up = i % 2 === 0;

            ctx.fillRect(tx, up ? -6 : 2, 3, 4);

        }

        // The bloom at the head.
        const hx = lx + len;

        ctx.fillStyle = "#7d1d33";
        ctx.fillRect(hx - 4, -8, 12, 16);

        ctx.fillStyle = "#d6335c";
        ctx.fillRect(hx - 2, -6, 8, 12);

        ctx.fillStyle = "#ff6f92";
        ctx.fillRect(hx, -3, 4, 6);

        // Point.
        ctx.fillStyle = "#e8e0d0";
        ctx.beginPath();
        ctx.moveTo(hx + 16, 0);
        ctx.lineTo(hx + 8, -4);
        ctx.lineTo(hx + 8, 4);
        ctx.closePath();
        ctx.fill();

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
