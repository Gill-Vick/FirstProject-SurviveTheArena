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

            hp: 2 + Math.floor((Game.wave - 1) / 6),

            color: ENEMY_TYPES.grunt.COLOR

        });

        this.type = "grunt";

    }

}