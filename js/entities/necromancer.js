// =====================================
// Necromancer
// =====================================

class Necromancer extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.necromancer.SIZE,

            speed:
                ENEMY_TYPES.necromancer.SPEED *
                Game.enemySpeedMultiplier,

            hp: 2 + Math.floor((Game.wave - 1) / 5),

            color: ENEMY_TYPES.necromancer.COLOR

        });

        this.type = "necromancer";
        this.knockbackImmune = true;
        this.summonCooldown = ENEMY_TYPES.necromancer.SUMMON_COOLDOWN;

    }

    attack() {

        if (this.summonCooldown > 0) {

            this.summonCooldown -= 16;

            return;

        }

        this.summonSkeletons();

        this.summonCooldown = ENEMY_TYPES.necromancer.SUMMON_COOLDOWN;

    }

    summonSkeletons() {

        const offsets = [-55, 55];

        offsets.forEach(offset => {

            const sk = new Skeleton(this.x + offset, this.y);

            Game.enemies.push(sk);

            Game.enemiesRemaining++;

        });

    }

    draw() {

        super.draw();

        ctx.fillStyle = "#9b59b6";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "☠",
            this.x + this.size / 2,
            this.y - 8
        );

    }

}
