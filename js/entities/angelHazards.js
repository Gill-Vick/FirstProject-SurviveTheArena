// =====================================
// Angel Hazards (Act III)
// =====================================
//
// Same duck-typed contract as every other hazard - update() /
// isDead() / draw(), pushed into Game.hazards.

// =====================================
// Light Bolt
// =====================================
//
// The Cherub's shot. Fast and straight; an elite's bursts into a
// cross on impact, so the safe spot after a dodge isn't.

class LightBolt {

    constructor(x, y, angle, elite, small = false) {

        this.x = x;
        this.y = y;

        const speed = ANGELS.cherub.BOLT_SPEED * (small ? 0.8 : 1);

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.elite = elite;
        this.small = small;

        this.dead = false;

    }

    update() {

        this.x += this.vx * Game.timeScale;
        this.y += this.vy * Game.timeScale;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - this.x, py - this.y) < player.size * 0.55) {

            this.dead = true;
            player.takeHit(ENEMY_LABELS.cherub);
            this.split();

            return;

        }

        if (this.x < -40 || this.y < -40 ||
            this.x > canvas.width + 40 || this.y > canvas.height + 40) {

            this.dead = true;
            this.split();

        }

    }

    split() {

        if (!this.elite || this.small)
            return;

        for (let i = 0; i < ANGEL_ELITE.CHERUB_SPLIT; i++)
            Game.hazards.push(new LightBolt(
                this.x, this.y,
                (i / ANGEL_ELITE.CHERUB_SPLIT) * Math.PI * 2,
                false, true
            ));

    }

    isDead() {

        return this.dead;

    }

    draw() {

        const s = this.small ? 4 : 6;

        ctx.save();

        // A short bright streak rather than a dot, so its
        // direction is readable at speed.
        const a = Math.atan2(this.vy, this.vx);

        for (let i = 0; i < 3; i++) {

            ctx.fillStyle = i === 0 ? "#ffffff" : "rgba(220, 235, 255, 0.5)";

            ctx.fillRect(
                Math.round(this.x - Math.cos(a) * i * 6) - s / 2,
                Math.round(this.y - Math.sin(a) * i * 6) - s / 2,
                s, s
            );

        }

        ctx.restore();

    }

}

// =====================================
// Judgement Mark
// =====================================
//
// The Scribe's mark. It follows the player, and when the fuse
// runs out it lands - UNLESS something solid is between the
// player and the Scribe that cast it.
//
// This is the only thing in the game that asks the player to use
// the arena's cover deliberately rather than incidentally, which
// is why the line to the Scribe is drawn the whole time: the
// counterplay has to be visible to be a counterplay.

class JudgementMark {

    constructor(caster, fuse) {

        this.caster = caster;

        this.life = fuse;
        this.maxLife = fuse;

        this.x = player.x + player.size / 2;
        this.y = player.y + player.size / 2;

        this.resolved = false;
        this.blocked = false;

    }

    // True when an occluder sits between the player and the
    // Scribe. Sampled along the line rather than solved
    // analytically - the occluders are rectangles of wildly
    // different shapes (pillars, tree canopies, stumps), and
    // getOccluderRect already answers "what does this cover" for
    // all of them.
    lineIsBlocked() {

        if (!this.caster || this.caster.isDead())
            return true;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const sx = this.caster.x + this.caster.size / 2;
        const sy = this.caster.y + this.caster.size / 2;

        const rects = (Arena.pillars ?? []).map(getOccluderRect);

        if (rects.length === 0)
            return false;

        const STEPS = 26;

        for (let i = 1; i < STEPS; i++) {

            const t = i / STEPS;
            const x = px + (sx - px) * t;
            const y = py + (sy - py) * t;

            for (const r of rects)
                if (x > r.x && x < r.x + r.width &&
                    y > r.y && y < r.y + r.height)
                    return true;

        }

        return false;

    }

    update() {

        // Rides the player until it resolves.
        this.x = player.x + player.size / 2;
        this.y = player.y + player.size / 2;

        this.life -= Game.dt;

        this.blocked = this.lineIsBlocked();

        if (this.life > 0 || this.resolved)
            return;

        this.resolved = true;

        if (this.blocked)
            return;

        Game.hazards.push(new JudgementStrike(this.x, this.y));

    }

    isDead() {

        return this.life <= -200;

    }

    draw() {

        if (this.resolved)
            return;

        const t = 1 - this.life / this.maxLife;

        ctx.save();

        // Colour says everything: gold and closing means it is
        // going to land, blue and open means you are safe.
        const col = this.blocked ? "120, 200, 255" : "255, 210, 120";

        ctx.strokeStyle = `rgba(${col}, ${this.blocked ? 0.5 : 0.55 + t * 0.4})`;
        ctx.lineWidth = 3;

        const r = ANGELS.scribe.MARK_RADIUS * (1 - t * 0.45);

        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // The sightline to the Scribe, so "get behind something"
        // is a visible instruction rather than a guess.
        if (this.caster && !this.caster.isDead()) {

            ctx.strokeStyle = `rgba(${col}, ${this.blocked ? 0.18 : 0.4})`;
            ctx.lineWidth = this.blocked ? 1 : 2;
            ctx.setLineDash([8, 8]);

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.caster.x + this.caster.size / 2,
                this.caster.y + this.caster.size / 2
            );
            ctx.stroke();

            ctx.setLineDash([]);

        }

        ctx.restore();

    }

}

// The mark landing. Brief, and it damages only on the frame it
// resolves - the mark was the warning, this is the verdict.

class JudgementStrike {

    constructor(x, y) {

        this.x = x;
        this.y = y;

        this.life = 420;
        this.maxLife = 420;

        this.struck = false;

        this.drawAbovePillars = true;

    }

    update() {

        this.life -= Game.dt;

        if (this.struck)
            return;

        this.struck = true;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - this.x, py - this.y) < ANGELS.scribe.MARK_RADIUS)
            player.takeHit(ENEMY_LABELS.scribe);

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = this.life / this.maxLife;
        const r = ANGELS.scribe.MARK_RADIUS;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
        g.addColorStop(0, `rgba(255, 245, 210, ${0.85 * fade})`);
        g.addColorStop(0.6, `rgba(255, 210, 120, ${0.4 * fade})`);
        g.addColorStop(1, "rgba(255, 190, 90, 0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();

        // A column of light, so the verdict reads from above.
        ctx.fillStyle = `rgba(255, 240, 200, ${0.5 * fade})`;
        ctx.fillRect(this.x - r * 0.28, 0, r * 0.56, this.y);

        ctx.restore();

    }

}
