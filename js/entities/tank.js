// =====================================
// Tank Enemy
// =====================================
//
// Slow, tanky - the speed/HP difference from
// Grunt comes entirely from stats below, so
// it also uses Enemy's default chase movement.
// Override move() here later if Tank ever
// needs unique behavior (e.g. a charge attack).

class Tank extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.tank.SIZE,

            speed:
                ENEMY_TYPES.tank.SPEED *
                Game.enemySpeedMultiplier,

            hp: 3 + Math.floor((Game.wave - 1) / 3) * 2,

            color: ENEMY_TYPES.tank.COLOR

        });

        this.type = "tank";
        this.knockbackImmune = true;

        // Entry Speed Boost
        //
        // Tanks are slow by design, but that means they often
        // arrive to the fight too late to actually "tank" hits
        // for the player. On spawn, give them a temporary speed
        // multiplier that decays back to normal after a couple
        // seconds, so they close the gap and get in position.
        this.baseSpeed = this.speed;
        this.speed = this.baseSpeed * ENEMY_TYPES.tank.ENTRY_BOOST_MULTIPLIER;
        this.entryBoostTimer = ENEMY_TYPES.tank.ENTRY_BOOST_DURATION;

    }

    move() {

        if (this.entryBoostTimer > 0) {

            this.entryBoostTimer -= Game.dt;

            if (this.entryBoostTimer <= 0)
                this.speed = this.baseSpeed;

        }

        super.move();

    }

}