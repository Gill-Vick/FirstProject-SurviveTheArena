// =====================================
// Garden Hazards (Act II)
// =====================================
//
// Everything the garden roster leaves on the floor. They all
// follow the same duck-typed contract the existing hazards use -
// update() / isDead() / draw(), pushed into Game.hazards - so
// none of the game loop had to learn about them.
//
// A note on why there are so many of these: the garden's whole
// premise is that a strong player can be pressured by GROUND
// rather than by damage. Almost every unit's real output is a
// hazard, not a hit.

// Ground that hurts on contact, with a shared "am I standing in
// it" test. Base for bramble and root rings.
class GardenGroundHazard {

    constructor(x, y, life) {

        this.x = x;
        this.y = y;

        this.life = life;
        this.maxLife = life;

        this.hitCooldown = 0;

    }

    update() {

        this.life -= Game.dt;

        if (this.hitCooldown > 0)
            this.hitCooldown -= Game.dt;

        if (this.hitCooldown <= 0 && this.touchesPlayer()) {

            // A shared cooldown rather than an instant kill on
            // touch: these are area denial, and a player who
            // clips a corner should be shoved out of it, not
            // deleted by it.
            this.hitCooldown = 600;
            player.takeHit(this.label ?? "the garden");

        }

    }

    isDead() {

        return this.life <= 0;

    }

    touchesPlayer() {

        return false;

    }

}

// =====================================
// Bramble Patch
// =====================================
//
// Laid by a charging Thornback Boar and by the Creeper Vine.
// Individually trivial; a fight's worth of them carves the arena
// into corridors, which is the point.

class BramblePatch extends GardenGroundHazard {

    constructor(x, y, life) {

        super(x, y, life);

        this.radius = 26;
        this.label = "a bramble";

        // Rolled once so the patch doesn't crawl frame to frame.
        this.seed = Math.random() * 1000;

    }

    touchesPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        return Math.hypot(px - this.x, py - this.y) < this.radius;

    }

    draw() {

        // Fades out over its last second rather than blinking
        // away, so the arena visibly re-opens.
        const fade = Math.min(1, this.life / 900);

        ctx.save();
        ctx.globalAlpha = 0.75 * fade;

        for (let i = 0; i < 7; i++) {

            const a = stormHash(this.seed + i) * Math.PI * 2;
            const r = 6 + stormHash(this.seed + i + 40) * this.radius * 0.8;

            const bx = Math.round(this.x + Math.cos(a) * r);
            const by = Math.round(this.y + Math.sin(a) * r);

            ctx.fillStyle = i % 2 ? "#3d5a2a" : "#2c4420";
            ctx.fillRect(bx - 3, by - 3, 6, 6);

            ctx.fillStyle = "#7a2f42";
            ctx.fillRect(bx - 1, by - 1, 2, 2);

        }

        ctx.restore();

    }

}

// Cached ring gradients, keyed by the inner/outer pair.
//
// The bosses only use a handful of distinct ring sizes, so a few
// objects cover every ring in the game. Built at full alpha and
// faded with globalAlpha, so the cached object never changes.
const RING_GRADIENT_CACHE = new Map();

function ringGradient(inner, outer) {

    const key = `${inner}|${outer}`;

    let g = RING_GRADIENT_CACHE.get(key);

    if (g)
        return g;

    g = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
    g.addColorStop(0, "rgba(120, 70, 30, 0.7)");
    g.addColorStop(0.5, "rgba(150, 95, 40, 0.55)");
    g.addColorStop(1, "rgba(90, 60, 25, 0)");

    RING_GRADIENT_CACHE.set(key, g);

    return g;

}

// =====================================
// Root Ring
// =====================================
//
// The Root Hulk's stomp. Dangerous BETWEEN two radii, safe at
// the hulk's own feet - the inversion is the whole trick, so the
// safe pocket is drawn as clearly as the danger.

class RootRing extends GardenGroundHazard {

    constructor(x, y, inner, outer) {

        super(x, y, 520);

        this.inner = inner;
        this.outer = outer;
        this.label = "a root hulk";

    }

    touchesPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;
        const d = Math.hypot(px - this.x, py - this.y);

        return d > this.inner && d < this.outer;

    }

    draw() {

        const t = 1 - this.life / this.maxLife;
        const fade = 1 - t;

        ctx.save();

        // Cached in local space and reused by translating, the
        // same way the support auras are - see auraGradient.
        //
        // This one matters more than it looks: the Act II/III
        // bosses throw rings constantly, and the Heartwood alone
        // can have twenty-odd on the floor at once. A gradient
        // rebuilt per ring per frame put that fight at half the
        // frame budget on its own.
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = fade;

        ctx.fillStyle = ringGradient(this.inner, this.outer);
        ctx.beginPath();
        ctx.arc(0, 0, this.outer, 0, Math.PI * 2);
        ctx.arc(0, 0, this.inner, 0, Math.PI * 2, true);
        ctx.fill();

        // Individual roots thrown up around the ring. Still in
        // the translated space from above, so these are relative
        // to the ring's centre rather than to the canvas.
        ctx.fillStyle = "rgba(96, 62, 28, 0.85)";

        for (let i = 0; i < 16; i++) {

            const a = (i / 16) * Math.PI * 2;
            const r = this.inner + (this.outer - this.inner) * (0.3 + (i % 3) * 0.22);

            ctx.fillRect(
                Math.round(Math.cos(a) * r) - 4,
                Math.round(Math.sin(a) * r) - 4,
                8, 8
            );

        }

        ctx.restore();

    }

}

// =====================================
// Root Arrow
// =====================================
//
// The Bramble Archer's shot. Roots the player briefly instead of
// dealing real damage - the threat is what else is on the screen
// while they cannot move.

class RootArrow {

    constructor(x, y, angle, elite) {

        this.x = x;
        this.y = y;

        const speed = GARDEN.brambleArcher.PROJECTILE_SPEED;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.elite = elite;
        this.dead = false;

    }

    update() {

        this.x += this.vx * Game.timeScale;
        this.y += this.vy * Game.timeScale;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - this.x, py - this.y) < player.size * 0.6) {

            this.land(true);
            return;

        }

        if (this.x < -40 || this.y < -40 ||
            this.x > canvas.width + 40 || this.y > canvas.height + 40)
            this.land(false);

    }

    land(hit) {

        this.dead = true;

        if (hit)
            Game.hazards.push(new SnarePatch(
                this.x, this.y,
                GARDEN.brambleArcher.ROOT_MS,
                32
            ));

        // An elite's arrow snares the GROUND whether it connects
        // or not, so dodging it still costs you the space.
        else if (this.elite)
            Game.hazards.push(new SnarePatch(
                this.x, this.y,
                GARDEN_ELITE.ARCHER_SNARE_MS,
                GARDEN_ELITE.ARCHER_SNARE_RADIUS
            ));

    }

    isDead() {

        return this.dead;

    }

    draw() {

        ctx.save();
        ctx.fillStyle = "#7f9c46";

        const a = Math.atan2(this.vy, this.vx);

        for (let i = 0; i < 4; i++) {

            ctx.fillRect(
                Math.round(this.x - Math.cos(a) * i * 5) - 2,
                Math.round(this.y - Math.sin(a) * i * 5) - 2,
                4, 4
            );

        }

        ctx.restore();

    }

}

// =====================================
// Snare Patch
// =====================================
//
// Where a root arrow landed. Slows rather than damages - it
// reuses the same slowsPlayer flag the Frost Weaver's zone uses,
// so Player.getFrostMultiplier picked it up for free.

class SnarePatch {

    constructor(x, y, life, radius) {

        this.x = x;
        this.y = y;

        this.life = life;
        this.maxLife = life;

        this.maxRadius = radius;

        this.slowsPlayer = true;

    }

    update() {

        this.life -= Game.dt;

    }

    isDead() {

        return this.life <= 0;

    }

    getRadius() {

        return this.maxRadius;

    }

    containsPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        return Math.hypot(px - this.x, py - this.y) < this.maxRadius;

    }

    draw() {

        const fade = Math.min(1, this.life / 700);

        ctx.save();
        ctx.globalAlpha = 0.6 * fade;
        ctx.strokeStyle = "#6f8f3f";
        ctx.lineWidth = 3;

        for (let i = 0; i < 6; i++) {

            const a = (i / 6) * Math.PI * 2 + this.maxRadius;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(a) * this.maxRadius,
                this.y + Math.sin(a) * this.maxRadius
            );
            ctx.stroke();

        }

        ctx.restore();

    }

}

// =====================================
// Spore Cloud
// =====================================
//
// Blocks sight and space. Deliberately drawn ABOVE the entities
// (drawAbovePillars) - a cloud you can see through is not a
// cloud, and hiding what is inside it is the entire point.

class SporeCloud {

    constructor(x, y, radius, life, splits) {

        this.x = x;
        this.y = y;

        this.radius = radius;
        this.life = life;
        this.maxLife = life;

        this.splits = splits;

        this.slowsPlayer = true;
        this.drawAbovePillars = true;

        this.seed = Math.random() * 1000;

    }

    update() {

        this.life -= Game.dt;

        if (this.life > 0 || this.splits <= 0)
            return;

        // Elite clouds break into smaller ones as they die, so
        // the ground they deny outlives the puffer that made it.
        for (let i = 0; i < this.splits; i++) {

            const a = (i / this.splits) * Math.PI * 2;

            Game.hazards.push(new SporeCloud(
                this.x + Math.cos(a) * this.radius * 0.7,
                this.y + Math.sin(a) * this.radius * 0.7,
                this.radius * 0.55,
                this.maxLife * 0.6,
                0
            ));

        }

        this.splits = 0;

    }

    isDead() {

        return this.life <= 0;

    }

    getRadius() {

        return this.radius;

    }

    containsPlayer() {

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        return Math.hypot(px - this.x, py - this.y) < this.radius;

    }

    draw() {

        // Grows in quickly, holds, then thins out.
        const age = 1 - this.life / this.maxLife;
        const grow = Math.min(1, age * 5);
        const fade = Math.min(1, this.life / 900);

        const r = this.radius * grow;
        const now = Date.now();

        ctx.save();
        ctx.globalAlpha = 0.5 * fade;

        for (let i = 0; i < 9; i++) {

            const a = stormHash(this.seed + i) * Math.PI * 2 + now / 3000;
            const d = stormHash(this.seed + i + 30) * r * 0.62;

            const g = ctx.createRadialGradient(
                this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 0,
                this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, r * 0.55
            );

            g.addColorStop(0, "rgba(176, 162, 208, 0.75)");
            g.addColorStop(1, "rgba(140, 126, 176, 0)");

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, r * 0.55, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.restore();

    }

}
