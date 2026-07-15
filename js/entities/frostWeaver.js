// =====================================
// Frost Weaver (Set 3)
// =====================================
//
// Pure crowd control - zero kill power of its own. Keeps its
// distance like the fire mage and drops FrostZone patches
// (see hazard.js) at the player's feet that slow movement and
// dash while stood in. Lethal only because of what ELSE is in
// the arena with you.

class FrostWeaver extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.frostWeaver.SIZE,

            speed:
                ENEMY_TYPES.frostWeaver.SPEED *
                Game.enemySpeedMultiplier,

            hp: 3 + Math.floor((Game.wave - 1) / 10),

            color: ENEMY_TYPES.frostWeaver.COLOR

        });

        this.type = "frostWeaver";
        this.knockbackImmune = true;
        this.castCooldown = ENEMY_TYPES.frostWeaver.CAST_COOLDOWN;

    }

    // Same keep-at-range drift as the fire mage.
    move() {

        // Royal Magus honor guard holds its wall post.
        if (this.moveTowardStation())
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred = ENEMY_TYPES.frostWeaver.PREFERRED_RANGE;

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

        if (this.castCooldown > 0) {

            this.castCooldown -= Game.dt;

            return;

        }

        const tx = player.x + player.size / 2;
        const ty = player.y + player.size / 2;

        // Elite weavers conjure noticeably bigger patches.
        const radius =
            ENEMY_TYPES.frostWeaver.ZONE_RADIUS *
            (this.isElite ? 1.4 : 1);

        Game.hazards.push(new FrostZone(tx, ty, radius));

        // castRateScale is only ever set on the Royal Magus'
        // honor guard (see spawnMagusEscort in wave.js).
        this.castCooldown =
            ENEMY_TYPES.frostWeaver.CAST_COOLDOWN *
            (this.castRateScale ?? 1);

    }

    draw() {

        super.draw();

        ctx.fillStyle = "#7fd4f0";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            "❄",
            this.x + this.size / 2,
            this.y - 8
        );

    }

}
