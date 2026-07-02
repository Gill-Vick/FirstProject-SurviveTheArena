// =====================================
// Enemy Base Class
// =====================================
//
// This class only knows how to exist:
// position, stats, taking damage, colliding
// with the player, and drawing itself.
//
// Movement AI (move()) is left for subclasses
// to override. Grunt/Tank/Spitter/Runner will
// each chase, flee, or sprint differently.

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

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.move();

        this.attack();

        this.checkPlayerCollision();

    }

    // =====================================
    // Movement
    // =====================================
    //
    // Default behavior: walk straight at the
    // player. Override this in a subclass to
    // get different AI (e.g. Spitter keeping
    // its distance).

    move() {

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;

    }

    // =====================================
    // Attack
    // =====================================
    //
    // No-op by default. Grunt/Tank stay silent
    // (they just walk into you). Spitter fires
    // projectiles here, Runner triggers a charge,
    // Boss fires attack patterns - each subclass
    // decides what "attacking" means for itself.

    attack() {}

    // =====================================
    // Collision With Player
    // =====================================

    checkPlayerCollision() {

        if (

            player.x < this.x + this.size &&
            player.x + player.size > this.x &&

            player.y < this.y + this.size &&
            player.y + player.size > this.y

        ) {

            Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

            Game.state = "gameover";

        }

    }

    // =====================================
    // Combat
    // =====================================

    takeDamage(amount) {

        this.hp -= amount;

        Particle.createHitBurst(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

    }

    isDead() {

        return this.hp <= 0;

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (this.isElite)
            this.drawEliteRing();

        ctx.shadowBlur = EFFECTS.ENEMY_GLOW;
        ctx.shadowColor = this.color;

        ctx.fillStyle = this.color;

        ctx.fillRect(

            this.x,

            this.y,

            this.size,

            this.size

        );

        ctx.shadowBlur = 0;

        this.drawHealthBar();

    }

    // =====================================
    // Elite Ring
    // =====================================
    //
    // Purely visual - a pulsing gold outline
    // so an elite is recognizable at a glance,
    // regardless of its base type.

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