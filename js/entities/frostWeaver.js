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

        // Elite weavers don't drop a patch - they lay a full
        // ROW of ice from themselves through the player (a
        // King's-Blade-style line that slows instead of
        // damaging). Normal weavers keep the single patch.
        if (this.isElite)
            this.castIceRow(tx, ty);
        else
            Game.hazards.push(new FrostZone(
                tx, ty,
                ENEMY_TYPES.frostWeaver.ZONE_RADIUS
            ));

        // castRateScale is only ever set on the Royal Magus'
        // honor guard (see spawnMagusEscort in wave.js).
        this.castCooldown =
            ENEMY_TYPES.frostWeaver.CAST_COOLDOWN *
            (this.castRateScale ?? 1);

    }

    // A trail of overlapping frost patches marching from the
    // weaver through the player's position and beyond, capped
    // at ROW_LENGTH. Each link is a normal FrostZone (radius =
    // half ROW_WIDTH), so the slow logic, grow-in, and fade
    // all come for free.
    castIceRow(tx, ty) {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy) || 1;

        const dirX = dx / dist;
        const dirY = dy / dist;

        const radius = ELITE.WEAVER_ROW_WIDTH / 2;
        const spacing = ELITE.WEAVER_ROW_SPACING;

        for (
            let d = spacing;
            d <= ELITE.WEAVER_ROW_LENGTH;
            d += spacing
        ) {

            const zx = cx + dirX * d;
            const zy = cy + dirY * d;

            // Stop once the row leaves the arena - no point
            // simulating ice nobody can stand on.
            if (
                zx < -radius || zx > canvas.width + radius ||
                zy < -radius || zy > canvas.height + radius
            )
                break;

            Game.hazards.push(new FrostZone(zx, zy, radius));

        }

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
