// =====================================
// Runner Enemy
// =====================================
//
// Chases normally most of the time, but
// periodically winds up and sprints at the
// player for a short burst.

class Runner extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.runner.SIZE,

            speed:
                ENEMY_TYPES.runner.SPEED *
                Game.enemySpeedMultiplier,

            hp:
                (1 + Math.floor(Game.score / DIFFICULTY.HP_SCALE_TIME))
                * ENEMY_TYPES.runner.HP_MULTIPLIER,

            color: ENEMY_TYPES.runner.COLOR

        });

        this.type = "runner";

        this.chargeCooldown =
            ENEMY_TYPES.runner.CHARGE_COOLDOWN;

        this.charging = false;
        this.chargeTimer = 0;

    }

    // =====================================
    // Movement
    // =====================================

    move() {

        if (this.charging) {

            this.sprintTowardPlayer();

            return;

        }

        // Normal chase (inherited behavior)

        super.move();

    }

    sprintTowardPlayer() {

        this.chargeTimer--;

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {

            this.x +=
                (dx / distance) *
                this.speed *
                ENEMY_TYPES.runner.CHARGE_MULTIPLIER;

            this.y +=
                (dy / distance) *
                this.speed *
                ENEMY_TYPES.runner.CHARGE_MULTIPLIER;

        }

        if (this.chargeTimer <= 0)
            this.charging = false;

    }

    // =====================================
    // Attack (triggers the charge)
    // =====================================

    attack() {

        if (this.charging)
            return;

        if (this.chargeCooldown > 0) {

            this.chargeCooldown--;

            return;

        }

        this.charging = true;

        this.chargeTimer =
            ENEMY_TYPES.runner.CHARGE_DURATION;

        this.chargeCooldown =
            ENEMY_TYPES.runner.CHARGE_COOLDOWN;

    }

}