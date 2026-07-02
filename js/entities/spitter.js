// =====================================
// Spitter Enemy
// =====================================
//
// Overrides move() to hold a preferred
// range instead of chasing into melee, and
// overrides attack() to fire at the player
// on a cooldown.

class Spitter extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.spitter.SIZE,

            speed:
                ENEMY_TYPES.spitter.SPEED *
                Game.enemySpeedMultiplier,

            hp:
                (1 + Math.floor(Game.score / DIFFICULTY.HP_SCALE_TIME))
                * ENEMY_TYPES.spitter.HP_MULTIPLIER,

            color: ENEMY_TYPES.spitter.COLOR

        });

        this.type = "spitter";

        this.shootCooldown =
            ENEMY_TYPES.spitter.SHOOT_COOLDOWN;

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
            ENEMY_TYPES.spitter.PREFERRED_RANGE;

        if (distance < preferred - 20) {

            this.x -= (dx / distance) * this.speed;
            this.y -= (dy / distance) * this.speed;

        } else if (distance > preferred + 20) {

            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;

        }

    }

    // =====================================
    // Attack
    // =====================================

    attack() {

        if (this.shootCooldown > 0) {

            this.shootCooldown--;

            return;

        }

        this.shootAtPlayer();

        this.shootCooldown =
            ENEMY_TYPES.spitter.SHOOT_COOLDOWN;

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

                speed: ENEMY_TYPES.spitter.PROJECTILE_SPEED,
                color: ENEMY_TYPES.spitter.PROJECTILE_COLOR,

                size: 6,
                life: 150

            }

        ));

    }

}