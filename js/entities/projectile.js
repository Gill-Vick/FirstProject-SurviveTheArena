// =====================================
// Projectile Class
// =====================================

class Projectile {

    constructor(x, y, angle, options = {}) {

        this.x = x;
        this.y = y;

        this.angle = angle;

        this.speed = options.speed ?? 10;
        this.size = options.size ?? 6;
        this.damage = options.damage ?? 1;
        this.color = options.color ?? "yellow";

        this.life = options.life ?? 90;

        this.owner = options.owner ?? "enemy";
        this.isLaser = options.isLaser ?? false;

    }

    update() {

        this.x += Math.cos(this.angle) * this.speed * Game.timeScale;
        this.y += Math.sin(this.angle) * this.speed * Game.timeScale;

        this.life -= Game.timeScale;

        if (this.owner === "player")
            this.checkEnemyCollision();
        else
            this.checkPlayerCollision();

    }

    isDead() {

        return (

            this.life <= 0 ||

            this.x < 0 ||
            this.x > canvas.width ||

            this.y < 0 ||
            this.y > canvas.height

        );

    }

    checkPlayerCollision() {

        if (!player)
            return;

        const dx =
            this.x - (player.x + player.size / 2);

        const dy =
            this.y - (player.y + player.size / 2);

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + player.size / 2) {

            if (player.takeHit())
                this.life = 0;
            else
                this.life = 0;

        }

    }

    checkEnemyCollision() {

        const px = this.x;
        const py = this.y;

        for (const enemy of Game.enemies) {

            if (

                px > enemy.x - this.size &&
                px < enemy.x + enemy.size + this.size &&
                py > enemy.y - this.size &&
                py < enemy.y + enemy.size + this.size

            ) {

                enemy.takeDamage(this.damage);

                enemy.applyKnockback(px, py, 10);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

                this.life = 0;

                return;

            }

        }

    }

    draw() {

        if (this.owner === "player") {

            ctx.save();

            ctx.translate(this.x, this.y);

            ctx.rotate(this.angle);

            // Shaft
            ctx.fillStyle = "#5c4033";
            ctx.fillRect(-14, -1.5, 22, 3);

            // Arrowhead
            ctx.fillStyle = "#bdc3c7";
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(4, -4);
            ctx.lineTo(4, 4);
            ctx.closePath();
            ctx.fill();

            // Fletching
            ctx.fillStyle = "#8b0000";
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(-10, -4);
            ctx.lineTo(-10, 4);
            ctx.closePath();
            ctx.fill();

            ctx.restore();

            return;

        }

        if (this.isLaser) {

            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.shadowBlur = 18;
            ctx.shadowColor = this.color;
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.angle) * 40,
                this.y + Math.sin(this.angle) * 40
            );
            ctx.stroke();
            ctx.restore();
            return;

        }

        ctx.fillStyle = this.color;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}