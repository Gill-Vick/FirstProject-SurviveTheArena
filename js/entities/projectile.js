// =====================================
// Projectile Class
// =====================================

class Projectile {

    constructor(x, y, angle, options = {}) {

        this.x = x;
        this.y = y;

        this.angle = angle;

        this.speed = options.speed ?? 7;
        this.size = options.size ?? 6;
        this.damage = options.damage ?? 1;
        this.color = options.color ?? "yellow";

        this.life = options.life ?? 129;

        this.owner = options.owner ?? "enemy";
        this.isLaser = options.isLaser ?? false;
        this.sourceType = options.sourceType ?? null;
        this.crit = options.crit ?? false;
        this.isArrow = options.isArrow ?? false;
        this.isKnife = options.isKnife ?? false;

        // How many enemies this can hit before dying (>1 with
        // the Ranger's Falcon Quiver). Enemies already struck
        // are remembered so a pierced target isn't hit twice.
        this.pierce = options.pierce ?? 1;
        this.enemiesHit = null;

        // Fired exactly once, whenever this projectile stops
        // existing - whether it landed a killing/final hit or
        // simply ran out of life/left the screen. (enemy is
        // null on a whiff.) Used by the Thief's Heart Stealer
        // to know where to teleport once a knife resolves.
        this.onResolve = options.onResolve ?? null;
        this.resolved = false;

    }

    resolve(x, y, enemy) {

        if (this.resolved)
            return;

        this.resolved = true;

        this.onResolve?.(x, y, enemy);

    }

    update() {

        const prevX = this.x;
        const prevY = this.y;

        this.x += Math.cos(this.angle) * this.speed * Game.timeScale;
        this.y += Math.sin(this.angle) * this.speed * Game.timeScale;

        this.life -= Game.timeScale;

        if (this.owner === "player") {

            if (this.checkBossRing(prevX, prevY))
                return;

            this.checkEnemyCollision();

        } else {

            this.checkPlayerCollision();

        }

    }

    // Boss projectile ward: a player projectile that crosses
    // a boss's ring from the outside fizzles at the boundary.
    // Shots fired from inside the ring (already within it on
    // the previous frame) are unaffected, so getting in close
    // is how ranged classes land hits on bosses.

    checkBossRing(prevX, prevY) {

        for (const enemy of Game.enemies) {

            if (!enemy.projectileRingRadius || enemy.isDead())
                continue;

            const cx = enemy.x + enemy.size / 2;
            const cy = enemy.y + enemy.size / 2;
            const r = enemy.projectileRingRadius;

            const wasOutside = Math.hypot(prevX - cx, prevY - cy) > r;
            const nowInside = Math.hypot(this.x - cx, this.y - cy) <= r;

            if (wasOutside && nowInside) {

                this.life = 0;

                Particle.createHitBurst(this.x, this.y);

                this.resolve(this.x, this.y, null);

                return true;

            }

        }

        return false;

    }

    isDead() {

        const dead = (

            this.life <= 0 ||

            this.x < 0 ||
            this.x > canvas.width ||

            this.y < 0 ||
            this.y > canvas.height

        );

        // A projectile that expires without ever landing a
        // hit still needs to resolve (e.g. so the Thief's
        // Heart Stealer knows where the throw ended up).
        if (dead)
            this.resolve(this.x, this.y, null);

        return dead;

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

            player.takeHit(label);

            // Spent on contact whether the hit landed or was
            // absorbed (shield/i-frames).
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

                const dealt = Math.ceil(this.damage * multiplier);

                enemy.takeDamage(dealt, this.crit);

                enemy.applyKnockback(px, py, 7);

                // On-hit effects (Warrior charm rolls, Ranger
                // burns/marks, Thief's Wit/Void Enchant). Most
                // classes only need the enemy; `dealt` is there
                // for hooks that care how much landed (e.g. the
                // Thief's Void Enchant, which stores it).
                if (player)
                    player.onProjectileHit(enemy, dealt);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

                this.pierce--;

                if (this.pierce <= 0) {

                    this.life = 0;

                    this.resolve(px, py, enemy);

                    return;

                }

                (this.enemiesHit ??= new Set()).add(enemy);

            }

        }

    }

    draw() {

        if (this.isKnife) {

            ctx.save();

            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color || "#c0392b";

            // Diamond blade
            ctx.fillStyle = "#e8eaed";
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(1, -3);
            ctx.lineTo(-3, 0);
            ctx.lineTo(1, 3);
            ctx.closePath();
            ctx.fill();

            // Handle
            ctx.shadowBlur = 0;
            ctx.fillStyle = this.color || "#c0392b";
            ctx.fillRect(-9, -1.5, 7, 3);

            ctx.restore();

            return;

        }

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