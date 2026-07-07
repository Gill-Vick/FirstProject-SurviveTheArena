// =====================================
// Lancer
// =====================================
//
// Attack state machine:
//
//   idle -> thrustWindup -> thrusting -> [ idle
//                                          OR (shield broken) dashWindup -> dashing -> idle ]
//
// The lance only ever has an active hitbox during
// "thrusting" and "dashing" - never while idling or
// winding up. That hitbox is a rectangle projecting out
// from the lancer's center along its attack angle, and
// it is drawn (as a telegraph) using the exact same
// rectangle math, so what you see is what can hit you -
// same idea as the fire mage's circular hazard.

class Lancer extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.lancer.SIZE,

            speed:
                ENEMY_TYPES.lancer.SPEED *
                Game.enemySpeedMultiplier,

            hp: 1 + Math.floor((Game.wave - 1) / 6),

            color: ENEMY_TYPES.lancer.COLOR

        });

        this.type = "lancer";
        this.shieldHits = ENEMY_TYPES.lancer.SHIELD_HITS;
        this.knockbackImmune = true;

        // "idle" | "thrustWindup" | "thrusting" | "dashWindup" | "dashing"
        this.state = "idle";

        this.thrustCooldown = 0;
        this.stateTimer = 0;

        this.attackAngle = 0;

        this.lanceExtension = 0; // visual forward slide of the lance tip
        this.hitThisAttack = false;

        this.dashDX = 0;
        this.dashDY = 0;

    }

    takeDamage(amount, crit = false) {

        if (this.shieldHits > 0) {

            this.shieldHits--;
            this.flashTimer = 5;

            if (this.shieldHits <= 0)
                this.knockbackImmune = false;

            return;

        }

        super.takeDamage(amount, crit);

    }

    // =====================================
    // Movement
    // =====================================
    //
    // The lancer only actually travels under its own
    // speed while idling (normal chase) or dashing
    // (the charge attack). Every windup/thrust phase
    // holds it planted in place - it's bracing, not
    // walking.

    move() {

        if (this.state === "dashing") {

            this.x += this.dashDX * Game.timeScale;
            this.y += this.dashDY * Game.timeScale;

            return;

        }

        if (this.state !== "idle")
            return;

        super.move();

    }

    // =====================================
    // Attack State Machine
    // =====================================

    attack() {

        if (this.thrustCooldown > 0)
            this.thrustCooldown -= Game.dt;

        switch (this.state) {

            case "idle":
                this.tryStartThrust();
                break;

            case "thrustWindup":
                this.updateThrustWindup();
                break;

            case "thrusting":
                this.updateThrusting();
                break;

            case "dashWindup":
                this.updateDashWindup();
                break;

            case "dashing":
                this.updateDashing();
                break;

        }

    }

    tryStartThrust() {

        if (this.thrustCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > ENEMY_TYPES.lancer.THURST_RANGE)
            return;

        this.attackAngle = Math.atan2(dy, dx);
        this.state = "thrustWindup";
        this.stateTimer = ENEMY_TYPES.lancer.THRUST_WINDUP;

    }

    updateThrustWindup() {

        this.stateTimer -= Game.timeScale;

        if (this.stateTimer <= 0) {

            this.state = "thrusting";
            this.stateTimer = ENEMY_TYPES.lancer.THRUST_DURATION;
            this.hitThisAttack = false;

        }

    }

    updateThrusting() {

        this.stateTimer -= Game.timeScale;

        const duration = ENEMY_TYPES.lancer.THRUST_DURATION;
        const elapsed = duration - this.stateTimer;
        const halfDuration = duration / 2;
        const progress =
            1 - Math.abs(elapsed - halfDuration) / halfDuration;

        // Lance visually slides forward, peaking mid-thrust
        this.lanceExtension = Math.max(0, progress) * 24;

        this.checkLanceHit(
            ENEMY_TYPES.lancer.THURST_RANGE,
            ENEMY_TYPES.lancer.THRUST_WIDTH
        );

        if (this.stateTimer <= 0) {

            this.lanceExtension = 0;

            // Shield still up -> that's the whole attack,
            // back to cooldown/chase.
            if (this.shieldHits > 0) {

                this.state = "idle";
                this.thrustCooldown = ENEMY_TYPES.lancer.THRUST_COOLDOWN;
                return;

            }

            // Shield broken -> the thrust flows straight
            // into a charging lunge.
            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;
            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;

            this.attackAngle = Math.atan2(py - cy, px - cx);
            this.state = "dashWindup";
            this.stateTimer = ENEMY_TYPES.lancer.DASH_WINDUP;

        }

    }

    updateDashWindup() {

        this.stateTimer -= Game.timeScale;

        if (this.stateTimer <= 0) {

            this.state = "dashing";
            this.stateTimer = ENEMY_TYPES.lancer.DASH_DURATION;
            this.hitThisAttack = false;

            this.dashDX =
                Math.cos(this.attackAngle) * ENEMY_TYPES.lancer.DASH_SPEED;

            this.dashDY =
                Math.sin(this.attackAngle) * ENEMY_TYPES.lancer.DASH_SPEED;

        }

    }

    updateDashing() {

        this.stateTimer -= Game.timeScale;

        this.checkLanceHit(
            this.size,
            ENEMY_TYPES.lancer.DASH_WIDTH
        );

        if (this.stateTimer <= 0) {

            this.state = "idle";
            this.thrustCooldown = ENEMY_TYPES.lancer.THRUST_COOLDOWN;

        }

    }

    // =====================================
    // Hitbox
    // =====================================
    //
    // A rectangle projecting `length` px out from the
    // lancer's center along attackAngle, `width` px wide.
    // The player's center point is rotated into the
    // lance's local space so the test is a simple
    // axis-aligned box check - padded by half the
    // player's size so it isn't a pixel-perfect dodge.
    //
    // Only ever called from "thrusting"/"dashing", and
    // fires once per attack via hitThisAttack.

    checkLanceHit(length, width) {

        if (this.hitThisAttack)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dx = px - cx;
        const dy = py - cy;

        const cos = Math.cos(-this.attackAngle);
        const sin = Math.sin(-this.attackAngle);

        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const pad = player.size / 2;
        const halfWidth = width / 2 + pad;

        if (

            localX >= -pad &&
            localX <= length + pad &&
            Math.abs(localY) <= halfWidth

        ) {

            player.takeHit(ENEMY_LABELS.lancer);
            this.hitThisAttack = true;

        }

    }

    // Body contact never damages the player by itself - only
    // the lance does, and only mid-thrust or mid-dash.

    // =====================================
    // Drawing
    // =====================================

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        this.drawTelegraphs(cx, cy);

        super.draw();

        this.drawLance(cx, cy);

    }

    drawTelegraphs(cx, cy) {

        if (this.state === "thrustWindup") {

            this.drawRectTelegraph(
                cx, cy, this.attackAngle,
                ENEMY_TYPES.lancer.THURST_RANGE,
                ENEMY_TYPES.lancer.THRUST_WIDTH,
                "rgba(231, 76, 60, 0.32)",
                true
            );

        }

        if (this.state === "thrusting") {

            this.drawRectTelegraph(
                cx, cy, this.attackAngle,
                ENEMY_TYPES.lancer.THURST_RANGE,
                ENEMY_TYPES.lancer.THRUST_WIDTH,
                "rgba(231, 76, 60, 0.55)",
                false
            );

        }

        if (this.state === "dashWindup") {

            const reach =
                ENEMY_TYPES.lancer.DASH_SPEED *
                ENEMY_TYPES.lancer.DASH_DURATION +
                this.size;

            const pulse = 0.35 + Math.sin(Date.now() / 60) * 0.15;

            this.drawRectTelegraph(
                cx, cy, this.attackAngle,
                reach,
                ENEMY_TYPES.lancer.DASH_WIDTH,
                `rgba(255, 60, 60, ${pulse})`,
                true
            );

        }

        if (this.state === "dashing") {

            // Shrinks as the dash burns through its
            // remaining travel time, so it reads as "how
            // much further this thing is still going".
            const remainingReach =
                ENEMY_TYPES.lancer.DASH_SPEED * this.stateTimer +
                this.size;

            this.drawRectTelegraph(
                cx, cy, this.attackAngle,
                remainingReach,
                ENEMY_TYPES.lancer.DASH_WIDTH,
                "rgba(255, 130, 0, 0.45)",
                false
            );

        }

    }

    drawRectTelegraph(cx, cy, angle, length, width, fill, dashed) {

        ctx.save();

        ctx.translate(cx, cy);
        ctx.rotate(angle);

        ctx.fillStyle = fill;
        ctx.strokeStyle = fill.replace(/[\d.]+\)$/, "0.9)");
        ctx.lineWidth = 2;

        if (dashed)
            ctx.setLineDash([10, 6]);

        ctx.beginPath();
        ctx.rect(0, -width / 2, length, width);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

    }

    drawLance(cx, cy) {

        ctx.save();
        ctx.translate(cx, cy);

        const attacking =
            this.state === "thrustWindup" ||
            this.state === "thrusting" ||
            this.state === "dashWindup" ||
            this.state === "dashing";

        const angle = attacking
            ? this.attackAngle
            : Math.atan2(
                player.y + player.size / 2 - cy,
                player.x + player.size / 2 - cx
            );

        ctx.rotate(angle);

        if (this.shieldHits > 0) {

            ctx.fillStyle = "#95a5a6";
            ctx.fillRect(-8, -18, 6, 36);

        }

        const lx = this.lanceExtension;

        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(lx, -2, ENEMY_TYPES.lancer.LANCE_LENGTH, 4);
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.moveTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH, 0);
        ctx.lineTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH - 12, -5);
        ctx.lineTo(lx + ENEMY_TYPES.lancer.LANCE_LENGTH - 12, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

    }

}