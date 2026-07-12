// =====================================
// Fire Cast (warning → explosion → burn)
// =====================================

class FireCast {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = HAZARD.FIRE_RADIUS;
        this.timer = HAZARD.FIRE_WARNING;
        this.exploded = false;

    }

    update() {

        this.timer -= Game.dt;

        if (this.timer <= 0 && !this.exploded) {

            this.explode();

            this.exploded = true;

        }

    }

    explode() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - this.x;
        const dy = py - this.y;

        if (Math.sqrt(dx * dx + dy * dy) < this.radius)
            player.takeHit(ENEMY_LABELS.fireMage);

        Game.hazards.push(new BurningGround(this.x, this.y));

        Particle.createHitBurst(this.x, this.y);

    }

    isDead() {

        return this.exploded;

    }

    draw() {

        const alpha = 0.35 + Math.sin(Date.now() / 80) * 0.15;

        ctx.save();

        ctx.strokeStyle = `rgba(255, 40, 0, ${alpha})`;
        ctx.fillStyle = `rgba(255, 60, 0, ${alpha * 0.35})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

    }

}

// =====================================
// Frost Zone (Frost Weaver)
// =====================================
//
// No damage at all - a patch of frozen ground that slows the
// player's movement and dash while they stand in it (see
// Player.getFrostMultiplier in player.js). Grows in over
// ZONE_GROW_TIME so it reads as being conjured, then holds
// for the rest of its life and fades out.

class FrostZone {

    constructor(x, y, radius) {

        this.x = x;
        this.y = y;
        this.maxRadius = radius;
        this.life = ENEMY_TYPES.frostWeaver.ZONE_DURATION;
        this.age = 0;

        // Duck-typed flag read by Player.getFrostMultiplier -
        // avoids instanceof checks across load order.
        this.slowsPlayer = true;

    }

    getRadius() {

        const grow = Math.min(
            1,
            this.age / ENEMY_TYPES.frostWeaver.ZONE_GROW_TIME
        );

        return this.maxRadius * grow;

    }

    containsPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const dx = px - this.x;
        const dy = py - this.y;

        return Math.sqrt(dx * dx + dy * dy) < this.getRadius();

    }

    update() {

        this.age += Game.dt;
        this.life -= Game.dt;

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const radius = this.getRadius();
        const fade = Math.min(1, this.life / 600);
        const shimmer = 0.75 + Math.sin(Date.now() / 200) * 0.1;

        ctx.save();

        ctx.fillStyle = `rgba(150, 215, 240, ${0.22 * fade * shimmer})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(200, 240, 255, ${0.55 * fade})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crystalline spokes so it reads as ice, not water.
        ctx.strokeStyle = `rgba(220, 245, 255, ${0.3 * fade})`;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 6; i++) {

            const a = (Math.PI / 3) * i + Math.PI / 12;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(a) * radius * 0.85,
                this.y + Math.sin(a) * radius * 0.85
            );
            ctx.stroke();

        }

        ctx.restore();

    }

}

// =====================================
// Burning Ground
// =====================================

class BurningGround {

    constructor(x, y) {

        this.x = x;
        this.y = y;
        this.radius = HAZARD.BURN_RADIUS;
        this.life = HAZARD.BURN_DURATION;
        this.tickTimer = 0;

    }

    update() {

        this.life -= Game.dt;
        this.tickTimer -= Game.dt;

        if (this.tickTimer <= 0) {

            this.tickTimer = HAZARD.BURN_TICK;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;
            const dx = px - this.x;
            const dy = py - this.y;

            if (Math.sqrt(dx * dx + dy * dy) < this.radius)
                player.takeHit(ENEMY_LABELS.fireMage);

        }

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = Math.min(1, this.life / HAZARD.BURN_DURATION);

        ctx.save();

        ctx.fillStyle = `rgba(255, 90, 0, ${0.35 * fade})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 160, 0, ${0.5 * fade})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();

    }

}