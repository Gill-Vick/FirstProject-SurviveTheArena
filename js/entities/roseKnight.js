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
//   GROUND   Thornrise: it drives the blade into the earth and
//            grows rings of bramble outward across the field,
//            which is the garden's whole thesis - the danger is
//            the ground, not the body standing on it
//
// Two abilities on two independent cooldowns:
//
//   idle -> cleaveWindup -> cleaving   -> idle    (in melee only)
//   idle -> thornWindup   -> thornRise -> idle    (at ANY range)
//
// Splitting them rather than chaining is what makes the unit
// work without a gap-closer: a knight on the far side of the
// arena is still doing something to you, and simply outranging
// it is no longer an answer.
//
// Its body never damages the player. Only the blade mid-cleave,
// and the thorns - which sprout visibly before they bite. Four
// of these arrive at once (see cornerGuardsForWave in wave.js);
// four bodies that hurt to touch would be a different game.

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

        // "idle" | "cleaveWindup" | "cleaving" | "thornWindup" | "thornRise"
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

        // Thornrise runs on its own clock, staggered the same
        // way, so four knights don't carpet the arena in one go.
        this.thornCooldown = cfg.THORN_COOLDOWN * Math.random();

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
    // Only ever travels while idling. Every windup and every
    // strike holds it planted - a telegraph is only honest if
    // the thing cannot walk out from under it.

    move() {

        if (this.state !== "idle")
            return;

        super.move();

    }

    plantThorn(x, y) {

        Game.hazards.push(new BramblePatch(
            Math.max(16, Math.min(canvas.width - 16, x)),
            Math.max(16, Math.min(canvas.height - 16, y)),
            GARDEN.roseKnight.THORN_LIFE_MS,
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

            case "thornWindup":
                this.updateThornWindup();
                break;

            case "thornRise":
                this.updateThornRise();
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
        this.thornCooldown -= Game.dt;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const target = getAggroSource(this);
        const dx = (target.x + target.size / 2) - cx;
        const dy = (target.y + target.size / 2) - cy;

        // The blade first when it can reach - Thornrise is the
        // fallback for a player who won't come inside the arc,
        // and it would be a strange knight that seeded the
        // ground while something stood next to it.
        if (
            this.cleaveCooldown <= 0 &&
            Math.hypot(dx, dy) <= GARDEN.roseKnight.CLEAVE_RANGE
        ) {

            this.attackAngle = Math.atan2(dy, dx);
            this.state = "cleaveWindup";
            this.stateTimer = GARDEN.roseKnight.CLEAVE_WINDUP_MS;

            return;

        }

        if (this.thornCooldown > 0)
            return;

        // No range check at all: this is the whole point of it.
        this.attackAngle = Math.atan2(dy, dx);
        this.state = "thornWindup";
        this.stateTimer = GARDEN.roseKnight.THORN_WINDUP_MS;

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

        this.state = "idle";
        this.cleaveCooldown = cfg.CLEAVE_COOLDOWN;

    }

    // =====================================
    // Thornrise
    // =====================================
    //
    // Drives the scythe into the earth and grows bramble outward
    // in rings. The windup is long and drawn as an expanding
    // ring on the floor, so the ground it is about to claim is
    // readable before any of it exists - and the patches
    // themselves still sprout harmlessly for a beat after that
    // (see BramblePatch's sprout phase), which is what stops a
    // ring landing under your feet from being an unavoidable
    // hit.

    updateThornWindup() {

        this.stateTimer -= Game.dt;

        if (this.stateTimer > 0)
            return;

        this.state = "thornRise";
        this.stateTimer = GARDEN.roseKnight.THORN_WINDUP_MS * 0.35;

        this.growThorns();

    }

    updateThornRise() {

        this.stateTimer -= Game.dt;

        if (this.stateTimer > 0)
            return;

        this.state = "idle";
        this.thornCooldown = GARDEN.roseKnight.THORN_COOLDOWN;

    }

    // Every ring the cast plants, elite bonus included. One
    // place, so the windup telegraph can size itself off exactly
    // what is coming rather than a number kept in step by hand.
    thornRings() {

        const rings = GARDEN.roseKnight.THORN_RINGS;

        return this.isElite
            ? rings.concat(GARDEN_ELITE.KNIGHT_THORN_EXTRA_RING)
            : rings;

    }

    thornReach() {

        return Math.max(...this.thornRings().map(r => r.radius));

    }

    growThorns() {

        const cfg = GARDEN.roseKnight;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.screenShake = Math.max(Game.screenShake ?? 0, 7);
        Particle.createHitBurst(cx, cy);

        this.thornRings().forEach((ring, index) => {

            // Each ring is rotated off the last so the patches
            // don't line up into spokes.
            const offset = index * 0.4;

            for (let i = 0; i < ring.count; i++) {

                const a = offset + (i / ring.count) * Math.PI * 2;

                const r = ring.radius +
                    (Math.random() - 0.5) * cfg.THORN_JITTER;

                this.plantThorn(
                    cx + Math.cos(a) * r,
                    cy + Math.sin(a) * r
                );

            }

        });

    }

    // =====================================
    // Hitbox
    // =====================================
    //
    // One shape: the arc the blade sweeps through. Drawn with
    // the same numbers it is checked with - what you see is what
    // can hit you - and it fires at most once per swing.

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

    // Body contact is harmless - see the header. Thornrise has
    // no hitbox of its own either: everything it does to you is
    // done by the bramble it leaves, which sprouts in plain
    // sight first.
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

        // Thornrise: a ring on the floor growing out to exactly
        // the reach the cast will cover, so the ground it is
        // about to claim is legible before any of it exists.
        // Sized off thornReach(), which is the same list the
        // cast itself plants from - elite third ring included.
        if (this.state === "thornWindup") {

            const t = 1 - this.stateTimer / cfg.THORN_WINDUP_MS;
            const reach = this.thornReach();

            drawPixelDashedRing(cx, cy, reach * t, {
                color: "rgb(255, 95, 162)",
                alpha: 0.25 + t * 0.45,
                unit: 5
            });

            // A second, inner ring so the pattern reads as
            // rings rather than one expanding circle.
            if (t > 0.4) {

                drawPixelDashedRing(cx, cy, cfg.THORN_RINGS[0].radius * t, {
                    color: "rgb(255, 95, 162)",
                    alpha: 0.3,
                    unit: 5
                });

            }

        }

        // The moment it lands: a flash out to full reach.
        if (this.state === "thornRise") {

            drawPixelRing(cx, cy, this.thornReach(), {
                color: "rgb(255, 111, 146)",
                alpha: 0.4 * (this.stateTimer / (cfg.THORN_WINDUP_MS * 0.35)),
                thickness: 6,
                unit: 5
            });

        }

    }

    // A war scythe - the blade turned up to run IN LINE with the
    // haft rather than hooked off it at a right angle, which is
    // the whole difference between a farm tool and a polearm.
    // A long single-edged blade continuing the line of the shaft,
    // with only a slight forward curve, and the rose bound at the
    // collar where the two are lashed together.
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

        // Thornrise drives the blade into the earth: the whole
        // weapon is pulled back toward the knight as it plants,
        // rather than held out at reach.
        const planted =
            this.state === "thornWindup" || this.state === "thornRise";

        ctx.save();
        ctx.translate(Math.round(cx), Math.round(cy));
        ctx.rotate(angle);

        if (planted)
            ctx.scale(0.66, 0.66);

        const len = cfg.SCYTHE_LENGTH;

        // Haft: a dark cut stem rather than a steel pole.
        ctx.fillStyle = "#3a2a1c";
        ctx.fillRect(-14, -3, len + 14, 5);

        ctx.fillStyle = "#5a4229";
        ctx.fillRect(-14, -3, len + 14, 2);

        // Thorns down the haft, alternating sides.
        ctx.fillStyle = "#2c4a24";

        for (let i = 1; i * 13 < len - 10; i++) {

            const tx = i * 13;

            ctx.fillRect(tx, i % 2 === 0 ? -6 : 2, 3, 4);

        }

        // Blade: carries straight on from the haft, broad at the
        // collar and tapering to a point, drifting a little
        // toward +y so it leans into the swing. [x, y, w, h] in
        // blade-local space.
        //
        // It runs out to exactly CLEAVE_RANGE from the knight's
        // centre, so the drawn weapon is honest about the reach
        // the hitbox actually checks.
        const blade = [
            [len - 2,  -7, 14, 15],
            [len + 11, -6, 14, 14],
            [len + 24, -5, 13, 13],
            [len + 36, -3, 13, 12],
            [len + 47, -1, 12, 11],
            [len + 57,  2, 11,  9],
            [len + 66,  5,  8,  7],
            [len + 72,  8,  6,  5]
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

        // The rose bound at the collar, over the lashing - drawn
        // last so it sits on top of the join rather than under
        // the blade's root.
        ctx.fillStyle = "#7d1d33";
        ctx.fillRect(len - 10, -8, 11, 16);
        ctx.fillStyle = "#d6335c";
        ctx.fillRect(len - 8, -6, 7, 12);
        ctx.fillStyle = "#ff6f92";
        ctx.fillRect(len - 6, -2, 4, 4);

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
