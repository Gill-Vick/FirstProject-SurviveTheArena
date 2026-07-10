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
        this.sourceType = options.sourceType ?? null;
        this.crit = options.crit ?? false;
        this.isArrow = options.isArrow ?? false;

        // How many enemies this can hit before dying (>1 with
        // the Ranger's Falcon Quiver). Enemies already struck
        // are remembered so a pierced target isn't hit twice.
        this.pierce = options.pierce ?? 1;
        this.enemiesHit = null;

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

            const label =
                ENEMY_LABELS[this.sourceType] ?? "an enemy projectile";

            if (player.takeHit(label))
                this.life = 0;
            else
                this.life = 0;

        }

    }

    checkEnemyCollision() {

        const px = this.x;
        const py = this.y;

        for (const enemy of Game.enemies) {

            if (this.enemiesHit && this.enemiesHit.has(enemy))
                continue;

            if (

                px > enemy.x - this.size &&
                px < enemy.x + enemy.size + this.size &&
                py > enemy.y - this.size &&
                py < enemy.y + enemy.size + this.size

            ) {

                // Class-specific per-target bonuses (e.g. the
                // Ranger's Hunter's Mark). Warrior damage is
                // always integer × 1, so the ceil is a no-op
                // for the original kit.
                const multiplier = player
                    ? player.getProjectileDamageMultiplier(enemy)
                    : 1;

                enemy.takeDamage(Math.ceil(this.damage * multiplier), this.crit);

                enemy.applyKnockback(px, py, 10);

                // On-hit effects (Warrior charm rolls, Ranger
                // burns/marks).
                if (player)
                    player.onProjectileHit(enemy);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

                this.pierce--;

                if (this.pierce <= 0) {

                    this.life = 0;

                    return;

                }

                (this.enemiesHit ??= new Set()).add(enemy);

            }

        }

    }

    draw() {

        if (this.owner === "player" || this.isArrow) {

            ctx.save();

            ctx.translate(this.x, this.y);

            ctx.rotate(this.angle);

            // Shaft
            ctx.fillStyle = this.color || "#5c4033";
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