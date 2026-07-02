// =====================================
// Boss Enemy
// =====================================
//
// Slow chase (inherited move()), but
// periodically fires a ring of projectiles
// outward. HP scales with wave number so
// later bosses are meaningfully tougher.

class Boss extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: BOSS.SIZE,

            speed:
                BOSS.SPEED *
                Game.enemySpeedMultiplier,

            hp:
                BOSS.BASE_HP +
                Game.wave * BOSS.HP_PER_WAVE,

            color: BOSS.COLOR

        });

        this.type = "boss";
        this.isBoss = true;

        this.attackCooldown = BOSS.ATTACK_COOLDOWN;

    }

    // =====================================
    // Attack
    // =====================================

    attack() {

        if (this.attackCooldown > 0) {

            this.attackCooldown--;

            return;

        }

        this.fireRadialBurst();

        this.attackCooldown = BOSS.ATTACK_COOLDOWN;

    }

    fireRadialBurst() {

        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;

        for (let i = 0; i < BOSS.PROJECTILE_COUNT; i++) {

            const angle =
                (Math.PI * 2 / BOSS.PROJECTILE_COUNT) * i;

            Game.projectiles.push(new Projectile(

                centerX,
                centerY,
                angle,

                {

                    speed: BOSS.PROJECTILE_SPEED,
                    color: BOSS.PROJECTILE_COLOR,

                    size: 8,
                    life: 120

                }

            ));

        }

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        super.draw();

        this.drawLabel();

    }

    drawLabel() {

        ctx.fillStyle = BOSS.COLOR;

        ctx.font = "bold 20px Arial";

        ctx.textAlign = "center";

        ctx.fillText(

            "BOSS",

            this.x + this.size / 2,

            this.y - 20

        );

    }

}