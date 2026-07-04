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

        this.timer -= 16;

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
            player.takeHit();

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

        this.life -= 16;
        this.tickTimer -= 16;

        if (this.tickTimer <= 0) {

            this.tickTimer = HAZARD.BURN_TICK;

            const px = player.x + player.size / 2;
            const py = player.y + player.size / 2;
            const dx = px - this.x;
            const dy = py - this.y;

            if (Math.sqrt(dx * dx + dy * dy) < this.radius)
                player.takeHit();

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
