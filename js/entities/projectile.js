// =====================================
// Projectile Class
// =====================================
//
// Nothing spawns these yet - this is the
// class Spitter (and any future ranged
// weapon) will push into Game.projectiles.
// The game loop already updates/draws
// Game.projectiles, so hooking this up
// later is just:
//
//   Game.projectiles.push(
//       new Projectile(x, y, angle, { ... })
//   );

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

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        this.life--;

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

    // =====================================
    // Collision With Player
    // =====================================
    //
    // Same "one touch = game over" rule the
    // player already lives by against enemies.

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

            Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

            Game.state = "gameover";

            this.life = 0;

        }

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

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