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

            hp: 3 + Math.floor((Game.wave - 1) / 10),

            color: ENEMY_TYPES.necromancer.COLOR

        });

        this.type = "necromancer";
        this.knockbackImmune = true;
        this.summonCooldown = ENEMY_TYPES.necromancer.SUMMON_COOLDOWN;

    }

    // Normal necromancers march straight at the player
    // (default chase). Elites hang back at range like an
    // archer, forcing you to push through their skeletons to
    // reach them.
    move() {

        if (!this.isElite) {

            super.move();

            return;

        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred = ELITE.NECRO_KITE_RANGE;

        if (distance < preferred - 30) {

            this.x -= (dx / distance) * this.speed * Game.timeScale;
            this.y -= (dy / distance) * this.speed * Game.timeScale;

        } else if (distance > preferred + 30) {

            this.x += (dx / distance) * this.speed * Game.timeScale;
            this.y += (dy / distance) * this.speed * Game.timeScale;

        }

        this.keepInArenaOnceEntered();

    }

    attack() {

        if (this.summonCooldown > 0) {

            this.summonCooldown -= Game.dt;

            return;

        }

        this.summonSkeletons();

        this.summonCooldown = ENEMY_TYPES.necromancer.SUMMON_COOLDOWN;

    }

    summonSkeletons() {

        const offsets = [-55, 55];

        offsets.forEach(offset => {

            const sx = this.x + offset;
            const sy = this.y;
            const size = ENEMY_TYPES.skeleton.SIZE;

            Game.spawnTelegraphs.push(new SpawnWarning(

                sx + size / 2,
                sy + size / 2,
                size / 2 + 12,
                714,

                () => {

                    const sk = new Skeleton(sx, sy);

                    // An elite master raises elite minions -
                    // faster, warded, and dagger-armed (see
                    // skeleton.js / makeElite).
                    if (this.isElite)
                        makeElite(sk);

                    Game.enemies.push(sk);

                    Game.enemiesRemaining++;

                }

            ));

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