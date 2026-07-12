// =====================================
// Fire Mage
// =====================================

class FireMage extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.fireMage.SIZE,

            speed:
                ENEMY_TYPES.fireMage.SPEED *
                Game.enemySpeedMultiplier,

            hp: 1 + Math.floor((Game.wave - 1) / 10),

            color: ENEMY_TYPES.fireMage.COLOR

        });

        this.type = "fireMage";
        this.knockbackImmune = true;
        this.castCooldown = ENEMY_TYPES.fireMage.CAST_COOLDOWN;

    }

    move() {

        // Royal Magus honor guard holds its wall post.
        if (this.moveTowardStation())
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred = ENEMY_TYPES.fireMage.PREFERRED_RANGE;

        if (distance < preferred - 30) {

            this.x -= (dx / distance) * this.speed * Game.timeScale;
            this.y -= (dy / distance) * this.speed * Game.timeScale;

        } else if (distance > preferred + 30) {

            this.x += (dx / distance) * this.speed * Game.timeScale;
            this.y += (dy / distance) * this.speed * Game.timeScale;

        }

    }

    attack() {

        if (this.castCooldown > 0) {

            this.castCooldown -= Game.dt;

            return;

        }

        const tx = player.x + player.size / 2;
        const ty = player.y + player.size / 2;

        Game.hazards.push(new FireCast(tx, ty));

        // castRateScale is only ever set on the Royal Magus'
        // honor guard (see spawnMagusEscort in wave.js).
        this.castCooldown =
            ENEMY_TYPES.fireMage.CAST_COOLDOWN *
            (this.castRateScale ?? 1);

    }

    draw() {

        super.draw();

        ctx.fillStyle = "#ff4500";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "🔥",
            this.x + this.size / 2,
            this.y - 8
        );

    }

}