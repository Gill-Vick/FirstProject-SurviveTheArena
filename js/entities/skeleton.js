// =====================================
// Skeleton (Necromancer minion)
// =====================================

class Skeleton extends Enemy {

    constructor(x, y) {

        const gruntHp = 1 + Math.floor((Game.wave - 1) / 6);

        super(x, y, {

            size: ENEMY_TYPES.skeleton.SIZE,

            speed:
                ENEMY_TYPES.skeleton.SPEED *
                Game.enemySpeedMultiplier,

            hp: Math.max(1, Math.floor(gruntHp / 2)),

            color: ENEMY_TYPES.skeleton.COLOR

        });

        this.type = "skeleton";
        this.knockbackImmune = true;
        this.isMinion = true;

    }

    draw() {

        super.draw();

        ctx.fillStyle = "#ddd";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "💀",
            this.x + this.size / 2,
            this.y + this.size / 2 + 5
        );

    }

}