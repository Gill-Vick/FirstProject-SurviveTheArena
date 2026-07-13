// =====================================
// Archer Enemy
// =====================================
//
// Overrides move() to hold a preferred
// range instead of chasing into melee, and
// overrides attack() to fire at the player
// on a cooldown.

class Archer extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.archer.SIZE,

            speed:
                ENEMY_TYPES.archer.SPEED *
                Game.enemySpeedMultiplier,

            hp: 2 + Math.floor((Game.wave - 1) / 10),

            color: ENEMY_TYPES.archer.COLOR

        });

        this.type = "archer";

        this.knockbackImmune = true;

        this.shootCooldown =
            ENEMY_TYPES.archer.SHOOT_COOLDOWN;

    }

    // =====================================
    // Movement
    // =====================================
    //
    // Too close -> back away.
    // Too far    -> close in.
    // In range   -> hold position and shoot.

    move() {

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred =
            ENEMY_TYPES.archer.PREFERRED_RANGE;

        if (distance < preferred - 20) {

            this.x -= (dx / distance) * this.speed * Game.timeScale;
            this.y -= (dy / distance) * this.speed * Game.timeScale;

        } else if (distance > preferred + 20) {

            this.x += (dx / distance) * this.speed * Game.timeScale;
            this.y += (dy / distance) * this.speed * Game.timeScale;

        }

    }

    // =====================================
    // Attack
    // =====================================

    attack() {

        if (this.shootCooldown > 0) {

            this.shootCooldown -= Game.timeScale;

            return;

        }

        this.shootAtPlayer();

        this.shootCooldown =
            ENEMY_TYPES.archer.SHOOT_COOLDOWN;

    }

    shootAtPlayer() {

        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;

        const dx =
            (player.x + player.size / 2) - centerX;

        const dy =
            (player.y + player.size / 2) - centerY;

        const angle = Math.atan2(dy, dx);

        Game.projectiles.push(new Projectile(

            centerX,
            centerY,
            angle,

            {

                speed: ENEMY_TYPES.archer.PROJECTILE_SPEED,
                color: ENEMY_TYPES.archer.PROJECTILE_COLOR,

                size: 6,
                life: 214,
                sourceType: "archer",
                isArrow: true

            }

        ));

    }

}