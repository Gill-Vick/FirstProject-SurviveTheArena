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

    }

}