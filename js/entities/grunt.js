// =====================================
// Grunt Enemy
// =====================================
//
// Basic enemy - uses Enemy's default chase
// movement, so no move() override needed.

class Grunt extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.grunt.SIZE,

            speed:
                ENEMY_TYPES.grunt.SPEED *
                Game.enemySpeedMultiplier,

            hp:
                (1 + Math.floor(Game.score / DIFFICULTY.HP_SCALE_TIME))
                * ENEMY_TYPES.grunt.HP_MULTIPLIER,

            color: ENEMY_TYPES.grunt.COLOR

        });

        this.type = "grunt";

    }

}