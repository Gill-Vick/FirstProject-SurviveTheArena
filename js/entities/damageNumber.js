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

        this.life = 35;
        this.maxLife = 35;

        this.vy = -1.2;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.y += this.vy;

        this.life--;

    }

    isDead() {

        return this.life <= 0;

    }

    // =====================================
    // Draw
    // =====================================

    draw() {

        ctx.save();

        ctx.globalAlpha = this.life / this.maxLife;

        ctx.font =
            this.crit
                ? "bold 28px Arial"
                : "bold 22px Arial";

        ctx.textAlign = "center";

        if (this.crit) {

            ctx.lineWidth = 3;
            ctx.strokeStyle = "gold";

            ctx.strokeText(
                this.damage,
                this.x,
                this.y
            );

            ctx.fillStyle = "white";

        }

        else {

            ctx.fillStyle = "#ff4444";

        }

        ctx.fillText(
            this.damage,
            this.x,
            this.y
        );

        ctx.restore();

    }

}