// =====================================
// Damage Number
// =====================================
//
// Floating combat text.
//
// Spawned whenever an enemy takes damage.
//
// Normal hit:
//      red
//
// Critical hit:
//      yellow outline
//
// Automatically fades upward until dead.

class DamageNumber {

    constructor(x, y, damage, crit = false) {

        this.x = x;
        this.y = y;

        this.damage = damage;
        this.crit = crit;

        this.life = 50;
        this.maxLife = 50;

        this.vy = -0.84;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.y += this.vy * Game.timeScale;

        this.life -= Game.timeScale;

    }

    isDead() {

        return this.life <= 0;

    }

    // =====================================
    // Draw
    // =====================================

    // How far through its life this number is, 0 -> 1.
    getAge() {

        return 1 - this.life / this.maxLife;

    }

    // Spawn pop: numbers punch in oversized and settle to their
    // real size over the first few frames. Crits overshoot
    // harder and further, so a crit reads as a crit from the
    // motion alone, before you've even parsed the colour.
    getScale() {

        const overshoot = this.crit ? 0.85 : 0.35;
        const settleAt = this.crit ? 0.22 : 0.14;

        const age = this.getAge();

        if (age >= settleAt)
            return 1;

        // Ease out - fast at first, easing into its final size.
        const t = age / settleAt;

        return 1 + overshoot * (1 - t) * (1 - t);

    }

    draw() {

        ctx.save();

        ctx.globalAlpha = this.life / this.maxLife;
        ctx.textAlign = "center";

        // Crits are half again the size of a normal hit, on top
        // of the pop - the size difference is what makes stacked
        // crit rate visibly pay off mid-fight.
        const baseSize = this.crit
            ? DAMAGE_NUMBER.CRIT_SIZE
            : DAMAGE_NUMBER.SIZE;

        // Scale about the number's own position so the pop
        // grows from where the hit landed.
        ctx.translate(this.x, this.y);
        ctx.scale(this.getScale(), this.getScale());

        ctx.font = `bold ${baseSize}px Arial`;

        if (this.crit) {

            ctx.lineWidth = 3;
            ctx.strokeStyle = "gold";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(255, 200, 40, 0.9)";

            ctx.strokeText(this.damage, 0, 0);

            ctx.shadowBlur = 0;
            ctx.fillStyle = "white";

        }

        else {

            ctx.fillStyle = "#ff4444";

        }

        ctx.fillText(this.damage, 0, 0);

        ctx.restore();

    }

}