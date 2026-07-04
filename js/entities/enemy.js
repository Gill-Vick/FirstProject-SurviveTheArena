// =====================================
// Enemy Base Class
// =====================================

class Enemy {

    constructor(x, y, stats) {

        this.x = x;
        this.y = y;

        this.size = stats.size;
        this.speed = stats.speed;

        this.hp = stats.hp;
        this.maxHp = stats.hp;

        this.color = stats.color;

        this.hitThisSwing = false;

        this.knockbackX = 0;
        this.knockbackY = 0;

        this.flashTimer = 0;

    }

    update() {

        this.x += this.knockbackX * Game.timeScale;
        this.y += this.knockbackY * Game.timeScale;

        // Exponential decay via Math.pow so knockback fades
        // out at the same real-world rate at any frame rate.
        const knockbackDecay = Math.pow(0.82, Game.timeScale);
        this.knockbackX *= knockbackDecay;
        this.knockbackY *= knockbackDecay;

        if (Math.abs(this.knockbackX) < 0.05)
            this.knockbackX = 0;

        if (Math.abs(this.knockbackY) < 0.05)
            this.knockbackY = 0;

        if (this.flashTimer > 0)
            this.flashTimer -= Game.timeScale;

        this.move();

        this.attack();

        this.checkPlayerCollision();

    }

    move() {

        if (this.knockbackX !== 0 || this.knockbackY !== 0)
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.x += (dx / distance) * this.speed * Game.timeScale;
        this.y += (dy / distance) * this.speed * Game.timeScale;

    }

    attack() {}

    checkPlayerCollision() {

        if (

            player.x < this.x + this.size &&
            player.x + player.size > this.x &&

            player.y < this.y + this.size &&
            player.y + player.size > this.y

        ) {

            player.takeHit(ENEMY_LABELS[this.type] ?? "an enemy");

        }

    }

    takeDamage(amount, crit = false) {

        this.hp -= amount;

        this.flashTimer = 5;

        const centerX =
            this.x + this.size / 2;

        const centerY =
            this.y + this.size / 2;

        Particle.createHitBurst(
            centerX,
            centerY
        );

        Game.damageNumbers.push(

            new DamageNumber(

                centerX,

                centerY - 10,

                amount,

                crit

            )

        );

    }

    applyKnockback(fromX, fromY, force = 12) {

        if (this.knockbackImmune)
            return;

        const dx = this.x + this.size / 2 - fromX;
        const dy = this.y + this.size / 2 - fromY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.knockbackX += (dx / distance) * force;
        this.knockbackY += (dy / distance) * force;

    }

    isDead() {

        return this.hp <= 0;

    }

    draw() {

        if (this.isElite)
            this.drawEliteRing();

        ctx.shadowBlur = EFFECTS.ENEMY_GLOW;
        ctx.shadowColor = this.color;

        ctx.fillStyle =
            this.flashTimer > 0
                ? "white"
                : this.color;

        ctx.fillRect(

            this.x,

            this.y,

            this.size,

            this.size

        );

        ctx.shadowBlur = 0;

        this.drawHealthBar();

    }

    drawEliteRing() {

        ctx.save();

        ctx.strokeStyle = ELITE.GLOW_COLOR;
        ctx.lineWidth = 3;

        ctx.shadowBlur = 15;
        ctx.shadowColor = ELITE.GLOW_COLOR;

        ctx.strokeRect(

            this.x - 4,

            this.y - 4,

            this.size + 8,

            this.size + 8

        );

        ctx.restore();

    }

    drawHealthBar() {

        ctx.fillStyle = "black";

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size,

            6

        );

        ctx.fillStyle = "lime";

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size * (this.hp / this.maxHp),

            6

        );

    }

}