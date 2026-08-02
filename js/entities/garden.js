// =====================================
// Garden Roster (Act II, waves 16-30)
// =====================================
//
// The castle roster stops spawning at wave 16 and this takes
// over. See the GARDEN block in constants.js for the premise:
// by this point every class out-damages anything that simply
// walks at them, so these fight over GROUND and over each other
// instead of over health bars.
//
// Three groups, and the split is the whole design:
//
//   FRONTLINE  boar / hedge warden / root hulk - deny space
//   RANGED     bramble archer / spore puffer / wisp swarm
//   SUPPORT    pollen drone / gardener shade / vine weaver
//
// The supports are what make a squad more than the sum of its
// members, and what gives every wave a correct kill order. A
// squad fought in the wrong order is a much longer fight than
// the same squad fought in the right one.

// Cached aura gradients.
//
// A radial gradient built per frame is a fresh object per frame,
// and the support units draw one every frame for as long as they
// live - which measurably doubled the cost of a garden frame the
// moment a Pollen Drone walked into it. Same trap the pixel-fx
// primitives carry a rule about.
//
// Built ONCE in local space (centred on 0,0) and reused by
// translating the context to the entity instead of rebuilding
// the gradient around it. Keyed by colour and radius, so a
// handful of objects cover every aura in the game.
const AURA_GRADIENT_CACHE = new Map();

function auraGradient(rgb, radius, innerFrac, peakAlpha) {

    const key = `${rgb}|${radius}|${innerFrac}|${peakAlpha}`;

    let g = AURA_GRADIENT_CACHE.get(key);

    if (g)
        return g;

    g = ctx.createRadialGradient(0, 0, radius * innerFrac, 0, 0, radius);
    g.addColorStop(0, `rgba(${rgb}, ${peakAlpha})`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);

    AURA_GRADIENT_CACHE.set(key, g);

    return g;

}

// Is (px, py) within `pad` of the line segment (ax,ay)-(bx,by)?
//
// Standard point-to-segment projection, clamped to the segment so
// a point beyond either end measures to that end rather than to
// the infinite line. Used for the elite Vine Weaver's web, which
// is a set of segments rather than a shape with an area.
function pointNearSegment(px, py, ax, ay, bx, by, pad) {

    const dx = bx - ax;
    const dy = by - ay;

    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0)
        return Math.hypot(px - ax, py - ay) < pad;

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));

    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)) < pad;

}

// Distance between two entities' centres.
function gardenDist(a, b) {

    const ax = a.x + a.size / 2;
    const ay = a.y + a.size / 2;
    const bx = b.x + b.size / 2;
    const by = b.y + b.size / 2;

    return Math.hypot(bx - ax, by - ay);

}

// Wave-scaled HP from a GARDEN stat block, so every member of
// the roster scales off one formula instead of eleven.
function gardenHp(cfg) {

    return cfg.HP_BASE +
           Math.floor(Math.max(0, Game.wave - WAVES.GARDEN_START) / cfg.HP_EVERY);

}

// Living squadmates, for anything that reads the rest of its
// own side (supports, the weaver's tether, the shade's replant).
function livingAllies(self) {

    return Game.enemies.filter(
        e => e !== self && !e.isDead() && !e.isEmerging()
    );

}

// Hold a preferred range from the target: back off if too close,
// close in if too far, otherwise stand and work.
//
// Archer already had this shape inline; the garden's four
// ranged/support units all want it too, so it lives here rather
// than being written out five times.
function holdRange(self, preferred, band = 24) {

    const target = getAggroSource(self);

    const dx = target.x - self.x;
    const dy = target.y - self.y;
    const d = Math.hypot(dx, dy);

    if (d === 0)
        return;

    const step = self.speed * Game.timeScale;

    if (d < preferred - band) {
        self.x -= (dx / d) * step;
        self.y -= (dy / d) * step;
    } else if (d > preferred + band) {
        self.x += (dx / d) * step;
        self.y += (dy / d) * step;
    }

}

// =====================================
// Thornback Boar
// =====================================
//
// Charges in a straight line and keeps going until it hits
// scenery, laying bramble behind it. It is not trying to hit
// you so much as to cut the arena into smaller pieces - which
// is why it stays a threat to a player who could kill it in two
// hits.

class ThornbackBoar extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.boar;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "boar";

        // It weighs what it weighs - nothing shoves it.
        this.knockbackImmune = true;

        this.chargeCooldown = cfg.CHARGE_COOLDOWN * Math.random();
        this.windup = 0;
        this.charging = false;

        this.chargeX = 0;
        this.chargeY = 0;

        this.sinceTrail = 0;
        this.ricochetsLeft = 0;

    }

    move() {

        const cfg = GARDEN.boar;

        if (this.windup > 0) {

            // Locked in place while it paws the ground - the
            // telegraph is the whole counterplay.
            this.windup -= Game.dt;

            if (this.windup <= 0)
                this.beginCharge();

            return;

        }

        if (this.charging) {

            this.advanceCharge();
            return;

        }

        super.move();

        this.chargeCooldown -= Game.dt;

        if (this.chargeCooldown <= 0) {
            this.windup = cfg.CHARGE_WINDUP_MS;
            this.chargeCooldown = cfg.CHARGE_COOLDOWN;
        }

    }

    // An elite mid-charge shatters anything shot at it, so the
    // ranged answer stops working exactly when it matters. Only
    // WHILE charging - stood still it is as shootable as anything
    // else, which keeps a counter on the table.
    breaksProjectiles() {

        return this.isElite &&
               GARDEN_ELITE.BOAR_BREAKS_PROJECTILES &&
               this.charging;

    }

    beginCharge() {

        const target = getAggroSource(this);

        const dx = (target.x + target.size / 2) - (this.x + this.size / 2);
        const dy = (target.y + target.size / 2) - (this.y + this.size / 2);
        const d = Math.hypot(dx, dy) || 1;

        this.chargeX = dx / d;
        this.chargeY = dy / d;

        this.charging = true;
        this.sinceTrail = 0;

    }

    advanceCharge() {

        const cfg = GARDEN.boar;

        // Elites come in appreciably faster, which is most of
        // what makes their charge a different problem.
        const step = cfg.CHARGE_SPEED * Game.timeScale *
            (this.isElite ? GARDEN_ELITE.BOAR_CHARGE_SPEED_MULT : 1);

        this.x += this.chargeX * step;
        this.y += this.chargeY * step;

        // Bramble laid at fixed distance intervals, not per
        // frame, so the trail is the same density at any frame
        // rate.
        this.sinceTrail += step;

        if (this.sinceTrail >= cfg.TRAIL_EVERY_PX) {

            this.sinceTrail = 0;

            Game.hazards.push(new BramblePatch(
                this.x + this.size / 2,
                this.y + this.size / 2,
                cfg.TRAIL_MS
            ));

        }

        const hitEdge =
            this.x <= 0 || this.y <= 0 ||
            this.x + this.size >= canvas.width ||
            this.y + this.size >= canvas.height;

        if (!hitEdge)
            return;

        this.charging = false;

    }

}

// =====================================
// Hedge Warden
// =====================================
//
// Slow, heavy, and regrows a shield whenever it is standing in
// cover. The counterplay is positional rather than numeric: pull
// it into the open, or kill it where it can't heal.

class HedgeWarden extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.hedgeWarden;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "hedgeWarden";
        this.knockbackImmune = true;

    }

    // Standing in greenery it simply cannot be killed. Bushes
    // and trees both count - the whole border of every green
    // arena is cover, which is what makes dragging it out into
    // the middle the only play.
    inCover() {

        const cfg = GARDEN.hedgeWarden;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const nearBush = (Arena.props ?? []).some(p =>
            p.kind === "bush" &&
            Math.hypot(p.x - cx, p.y - cy) < cfg.COVER_RADIUS
        );

        if (nearBush)
            return true;

        return (Arena.pillars ?? []).some(t =>
            Math.hypot(t.x - cx, (t.y + 40) - cy) < cfg.COVER_RADIUS + t.width * 0.3
        );

    }

    takeDamage(amount, crit = false) {

        // Immortal in cover, not merely tough. Damage numbers
        // still show so the player learns the rule quickly rather
        // than concluding their build is broken.
        if (this.inCover()) {

            Game.damageNumbers.push(new DamageNumber(
                this.x + this.size / 2,
                this.y,
                0,
                false
            ));

            this.flashTimer = 3;

            return;

        }

        super.takeDamage(amount, crit);

    }

    attack() {

        // The elite hands its cover out: a flat shield to
        // everything nearby, refreshed while it lives.
        if (!this.isElite)
            return;

        // Arena-wide, same as the drone's pollen. Splitting the
        // squad up no longer strips the shields off half of it.
        livingAllies(this).forEach(ally => {

            if (ally.isBoss)
                return;

            ally.shieldHp = Math.max(ally.shieldHp, GARDEN_ELITE.WARDEN_SHIELD_ALLIES);

        });

    }

    draw() {

        // A visible thicket around it while it is untouchable -
        // the rule has to be legible from across the arena.
        if (this.inCover()) {

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;
            const pulse = 0.5 + Math.sin(Date.now() / 260) * 0.5;

            ctx.save();
            ctx.strokeStyle = `rgba(120, 220, 120, ${0.4 + pulse * 0.35})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, this.size * 0.82, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

        }

        super.draw();

    }

}

// =====================================
// Root Hulk
// =====================================
//
// Telegraphs a stomp that erupts in a RING around itself, with a
// safe pocket at its own feet. Every other slow bruiser in this
// game has taught the player to back away from a windup; this
// one punishes that specific reflex.

class RootHulk extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.rootHulk;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "rootHulk";
        this.knockbackImmune = true;

        this.stompCooldown = cfg.STOMP_COOLDOWN * Math.random();
        this.telegraph = 0;

    }

    // Elites wind up much longer, because what follows covers the
    // whole arena.
    telegraphMs() {

        return this.isElite && GARDEN_ELITE.HULK_FULL_ARENA
            ? GARDEN_ELITE.HULK_FULL_TELEGRAPH_MS
            : GARDEN.rootHulk.STOMP_TELEGRAPH_MS;

    }

    move() {

        // Roots itself to stomp.
        if (this.telegraph > 0)
            return;

        super.move();

    }

    attack() {

        const cfg = GARDEN.rootHulk;

        if (this.telegraph > 0) {

            this.telegraph -= Game.dt;

            if (this.telegraph <= 0)
                this.erupt();

            return;

        }

        this.stompCooldown -= Game.dt;

        if (this.stompCooldown <= 0) {
            this.telegraph = this.telegraphMs();
            this.stompCooldown = cfg.STOMP_COOLDOWN;
        }

    }

    erupt() {

        const cfg = GARDEN.rootHulk;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // The elite's stomp takes the ENTIRE arena bar a wide
        // pocket at its own feet. It completely inverts the
        // fight: for a moment the safest place on the map is
        // pressed up against the thing that's attacking.
        if (this.isElite && GARDEN_ELITE.HULK_FULL_ARENA) {

            Game.hazards.push(new RootRing(
                cx, cy,
                GARDEN_ELITE.HULK_SAFE_RADIUS,
                canvas.width + canvas.height
            ));

            return;

        }

        Game.hazards.push(new RootRing(cx, cy, cfg.RING_INNER, cfg.RING_OUTER));

    }

    draw() {

        // Winding up: a ring on the ground showing exactly where
        // it is about to be dangerous, and where it is not.
        if (this.telegraph > 0) {

            const cfg = GARDEN.rootHulk;
            const t = 1 - this.telegraph / this.telegraphMs();

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;

            const full = this.isElite && GARDEN_ELITE.HULK_FULL_ARENA;

            ctx.save();

            if (full) {

                // Shade everything that is about to erupt, and
                // leave the safe pocket clear. With the whole
                // arena going up, showing the DANGER is useless -
                // the player needs to see the one place to stand.
                ctx.fillStyle = `rgba(150, 60, 30, ${0.1 + t * 0.22})`;
                ctx.beginPath();
                ctx.rect(0, 0, canvas.width, canvas.height);
                ctx.arc(cx, cy, GARDEN_ELITE.HULK_SAFE_RADIUS, 0, Math.PI * 2, true);
                ctx.fill();

                ctx.strokeStyle = `rgba(160, 255, 150, ${0.5 + t * 0.45})`;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(cx, cy, GARDEN_ELITE.HULK_SAFE_RADIUS, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();

                super.draw();

                return;

            }

            ctx.strokeStyle = `rgba(150, 90, 40, ${0.35 + t * 0.45})`;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(cx, cy, cfg.RING_INNER, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, cfg.RING_OUTER, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

        }

        super.draw();

    }

}

// =====================================
// Bramble Archer
// =====================================
//
// Roots rather than hurts. The arrow itself is nearly harmless;
// the danger is whatever else is on screen while you cannot
// move.

class BrambleArcher extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.brambleArcher;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "brambleArcher";
        this.knockbackImmune = true;

        this.shootCooldown = cfg.SHOOT_COOLDOWN * Math.random();

    }

    move() {

        holdRange(this, GARDEN.brambleArcher.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    attack() {

        const cfg = GARDEN.brambleArcher;

        this.shootCooldown -= Game.dt;

        if (this.shootCooldown > 0)
            return;

        this.shootCooldown = cfg.SHOOT_COOLDOWN;

        const target = getAggroSource(this);

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const angle = Math.atan2(
            (target.y + target.size / 2) - cy,
            (target.x + target.size / 2) - cx
        );

        // A spread of three rather than one. Sidestepping a
        // single arrow was trivial; sidestepping the fan means
        // committing to a direction.
        for (let i = 0; i < cfg.ARROWS; i++)
            Game.hazards.push(new RootArrow(
                cx, cy,
                angle + (i - (cfg.ARROWS - 1) / 2) * cfg.ARROW_SPREAD,
                this.isElite
            ));

    }

}

// =====================================
// Spore Puffer
// =====================================
//
// Lobs clouds that block space rather than deal damage. On its
// own it is nearly harmless; next to anything melee it is the
// reason you got caught.

class SporePuffer extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.sporePuffer;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "sporePuffer";

        this.shootCooldown = cfg.SHOOT_COOLDOWN * Math.random();

    }

    move() {

        holdRange(this, GARDEN.sporePuffer.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    attack() {

        const cfg = GARDEN.sporePuffer;

        this.shootCooldown -= Game.dt;

        if (this.shootCooldown > 0)
            return;

        this.shootCooldown = cfg.SHOOT_COOLDOWN;

        const target = getAggroSource(this);

        const extra = this.isElite ? GARDEN_ELITE.PUFFER_EXTRA_CLOUDS : 0;

        // The first cloud lands on the player; an elite's extras
        // are thrown around them, so the ground you'd retreat to
        // goes as well.
        for (let i = 0; i <= extra; i++) {

            const a = (i / (extra + 1)) * Math.PI * 2;
            const r = i === 0 ? 0 : cfg.CLOUD_RADIUS * 1.1;

            Game.hazards.push(new SporeCloud(
                target.x + target.size / 2 + Math.cos(a) * r,
                target.y + target.size / 2 + Math.sin(a) * r,
                cfg.CLOUD_RADIUS,
                cfg.CLOUD_MS,
                this.isElite ? GARDEN_ELITE.PUFFER_SPLIT_COUNT : 0
            ));

        }

    }

}

// =====================================
// Wisp
// =====================================
//
// Fast, fragile, and comes in fours. Killing one makes the rest
// faster, so a swarm gets harder to hit as it gets smaller - a
// dodge check that ignores how much damage the player has.

class Wisp extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.wispSwarm;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: Math.max(1, Math.round(gardenHp(cfg) / cfg.MEMBERS)),
            color: cfg.COLOR
        });

        this.type = "wisp";

        this.baseSpeed = this.speed;
        this.wobble = Math.random() * Math.PI * 2;

    }

    move() {

        const cfg = GARDEN.wispSwarm;

        // Every wisp already dead makes the survivors quicker.
        const alive = Game.enemies.filter(e => e.type === "wisp" && !e.isDead()).length;
        const lost = Math.max(0, cfg.MEMBERS - alive);

        this.speed = this.baseSpeed * (1 + lost * cfg.SPEED_PER_LOSS);

        // Drifts rather than beelines, so a swarm can't be
        // out-walked in a straight line.
        this.wobble += Game.dt / 240;

        const target = getAggroSource(this);

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;

        const nx = -dy / d;
        const ny = dx / d;

        // Weaves hard across its own approach - eight of these
        // arriving in a straight line would just be a wall, and
        // the sway is what makes a swarm a dodging problem rather
        // than a damage one.
        const sway = Math.sin(this.wobble) * cfg.SWAY;

        this.x += ((dx / d) + nx * sway) * this.speed * Game.timeScale;
        this.y += ((dy / d) + ny * sway) * this.speed * Game.timeScale;

    }

    onDeath() {

        // An elite wisp doesn't die so much as divide: killing it
        // makes the swarm MORE numerous, so raw damage is the one
        // thing that doesn't solve it. Its death also whips the
        // rest of the squad into a sprint.
        if (!this.isElite)
            return;

        livingAllies(this).forEach(ally => {
            ally.wispHasteTimer = GARDEN_ELITE.WISP_DEATH_HASTE_MS;
        });

        for (let i = 0; i < GARDEN_ELITE.WISP_SPLIT_COUNT; i++) {

            const child = new Wisp(
                this.x + (i - 0.5) * 26,
                this.y + (i - 0.5) * 26
            );

            child.maxHp = Math.max(1, Math.round(this.maxHp * 0.3));
            child.hp = child.maxHp;
            child.size = Math.round(this.size * 0.7);

            Game.enemies.push(child);
            Game.enemiesRemaining++;

        }

    }

}

// =====================================
// Pollen Drone
// =====================================
//
// No attack at all. It hastes and heals everything near it, and
// hangs back behind the line it is buffing. The squad's single
// clearest "kill this first" - and the elite version turns that
// from advice into a rule by handing out shields as well.

class PollenDrone extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.pollenDrone;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "pollenDrone";
        this.protectsAllies = true;
        this.knockbackImmune = true;

        this.wardTimer = 0;

        // Its own place on the perimeter circuit, so several
        // drones don't fly in formation.
        this.orbitPhase = Math.random() * Math.PI * 2;

    }

    // Flies a fixed circuit around the edge of the arena and
    // ignores the player completely.
    //
    // A support that kites the player is a support the player
    // bumps into; one that patrols the rim is one you have to
    // deliberately leave the fight to go and kill, which is a far
    // better decision to put in front of them.
    move() {

        const cfg = GARDEN.pollenDrone;

        this.orbitPhase += (Math.PI * 2) * (Game.dt / cfg.ORBIT_PERIOD_MS);

        const insetX = canvas.width * cfg.ORBIT_INSET;
        const insetY = canvas.height * cfg.ORBIT_INSET;

        const tx = canvas.width / 2 + Math.cos(this.orbitPhase) * (canvas.width / 2 - insetX);
        const ty = canvas.height / 2 + Math.sin(this.orbitPhase) * (canvas.height / 2 - insetY);

        const dx = tx - (this.x + this.size / 2);
        const dy = ty - (this.y + this.size / 2);
        const d = Math.hypot(dx, dy) || 1;

        const step = Math.min(d, this.speed * Game.timeScale);

        this.x += (dx / d) * step;
        this.y += (dy / d) * step;

    }

    attack() {

        const cfg = GARDEN.pollenDrone;

        this.wardTimer -= Game.dt;

        const grantWard =
            this.isElite &&
            GARDEN_ELITE.DRONE_GRANTS_WARD &&
            this.wardTimer <= 0;

        if (grantWard)
            this.wardTimer = GARDEN_ELITE.DRONE_WARD_REFRESH_MS;

        // No range check at all - the pollen reaches everything
        // on the field. There is nowhere to stand that is out of
        // its reach, so the only answer is to go and kill it.
        livingAllies(this).forEach(ally => {

            // Re-asserted every frame and never cleared here, so
            // it lapses on its own the moment the drone dies or
            // the ally walks out - same self-expiring shape as
            // the chill and the cleric's heal shield.
            ally.pollenTimer = 120;

            if (ally.hp < ally.maxHp)
                ally.hp = Math.min(
                    ally.maxHp,
                    ally.hp + cfg.HEAL_PER_SEC * (Game.dt / 1000)
                );

            if (grantWard)
                ally.wardShield = true;

        });

    }

    // A glow on the DRONE, not a ring around it.
    //
    // The aura used to be drawn as a big circle, which was honest
    // while it had a radius. Now that the pollen reaches the
    // whole arena, a circle would be actively misleading - it
    // would read as a boundary you could stand outside. So the
    // drone just burns brightly, and the allies it is feeding
    // carry the tell instead (see Enemy.draw).
    drawProtectAura() {

        const cfg = GARDEN.pollenDrone;

        const pulse = 0.5 + Math.sin(Date.now() / 420) * 0.5;

        ctx.save();

        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.globalAlpha = 0.55 + pulse * 0.45;

        ctx.fillStyle = auraGradient("230, 199, 96", cfg.AURA_GLOW_RADIUS, 0.15, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, cfg.AURA_GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// Gardener Shade
// =====================================
//
// Replants the squad's dead as weaker seedlings. Makes kill
// ORDER matter: clear the shade and your kills stay dead.

class GardenerShade extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.gardenerShade;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "gardenerShade";

        this.knockbackImmune = true;
        this.stunImmune = true;

        this.replantCooldown = cfg.REPLANT_COOLDOWN;

        // Counts down while it is visible, mid-replant.
        this.revealTimer = 0;

        // Types this shade has watched die, in order.
        this.compost = [];

    }

    // Stands still, out at the edge, and stays invisible unless
    // it is actually raising something.
    //
    // It can always be HIT, though - a stray shot or an AoE will
    // find it, and damage numbers popping out of empty air are
    // how you learn where it is standing. What protects it is the
    // size of its health pool, not invulnerability: killing it is
    // a decision you commit to rather than something that happens
    // while you're aiming at something else.
    move() {}

    isHidden() {

        return this.revealTimer <= 0;

    }

    // Unseen, and unseen properly: no body, no contact shadow and
    // no x-ray outline. See Enemy.isConcealed.
    //
    // Returning nothing from draw() is NOT enough on its own -
    // drawEntityShadows was still painting an ellipse under it
    // and drawOccludedOutlines still drew its silhouette through
    // the trees, either of which gives the position away just as
    // completely as a body would.
    isConcealed() {

        return this.isHidden();

    }

    // No physical attack whatsoever - you walk straight through
    // it. Everything it does to you, it does through what it puts
    // back on the field.
    checkPlayerCollision() {}

    draw() {

        // Nothing at all while hidden.
        if (this.isHidden())
            return;

        // Mid-replant it is fully visible, and ringed, so the one
        // moment it is findable is unmistakable.
        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        ctx.save();
        ctx.strokeStyle = `rgba(190, 160, 255, ${0.5 + Math.sin(Date.now() / 120) * 0.3})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, this.size * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        super.draw();

    }

    // Called from onEnemyKilled - see game.js.
    noteDeath(type) {

        if (type !== "wisp" && GARDEN_REPLANTABLE.has(type))
            this.compost.push(type);

    }

    attack() {

        const cfg = GARDEN.gardenerShade;

        if (this.revealTimer > 0)
            this.revealTimer -= Game.dt;

        this.replantCooldown -= Game.dt;

        if (this.replantCooldown > 0 || this.compost.length === 0)
            return;

        this.replantCooldown = cfg.REPLANT_COOLDOWN;
        this.revealTimer = cfg.REVEAL_MS;

        const type = this.compost.shift();
        const Cls = ENEMY_CLASSES[type];

        if (!Cls)
            return;

        const seedling = new Cls(this.x, this.y);

        // Comes back diminished - unless this shade is elite, in
        // which case the kill simply did not count.
        if (!(this.isElite && GARDEN_ELITE.SHADE_FULL_REPLANT)) {

            seedling.maxHp = Math.max(
                1,
                Math.round(seedling.maxHp * cfg.SEEDLING_HP_FRACTION)
            );
            seedling.hp = seedling.maxHp;
            seedling.size = Math.round(seedling.size * 0.8);

        }

        seedling.emergeTimer = GARDEN.EMERGE_MS;

        Game.enemies.push(seedling);
        Game.enemiesRemaining++;

    }

}

// =====================================
// Vine Weaver
// =====================================
//
// Tethers allies together and shares damage between them, so
// focusing one target quietly wastes half of it. The tether is
// live: it re-picks its ends every frame as things die.

// (see the class above for why it is drawn this way)
class VineWeaver extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.vineWeaver;

        super(x, y, {
            size: cfg.SIZE,
            speed: cfg.SPEED * Game.enemySpeedMultiplier,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "vineWeaver";

        this.tethered = [];
        this.vineHitCooldown = 0;

    }

    move() {

        holdRange(this, GARDEN.vineWeaver.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    attack() {

        // Everything on the field, at any range - the weaver is
        // a squad-wide effect rather than a local one now.
        //
        // The Gardener Shade is deliberately excluded: it spends
        // the fight invisible, and a vine running off to it would
        // point straight at where it is standing.
        this.tethered = livingAllies(this).filter(a =>
            a.type !== "vineWeaver" &&
            a.type !== "gardenerShade" &&
            !a.isBoss
        );

        // Every tethered ally points back at this weaver, so
        // Enemy.takeDamage can mirror a share of the hit onto
        // the others without knowing anything about weavers.
        this.tethered.forEach(a => { a.tetherSource = this; });

        this.burnPlayerOnVines();

    }

    // An elite's vines hurt to cross.
    //
    // This was declared in GARDEN_ELITE and then never actually
    // implemented - the constant was read nowhere, so the elite's
    // whole signature did nothing. The web was drawn and that was
    // all it did.
    burnPlayerOnVines() {

        if (!this.isElite || !GARDEN_ELITE.WEAVER_VINE_DAMAGE)
            return;

        if (this.vineHitCooldown > 0) {

            this.vineHitCooldown -= Game.dt;

            return;

        }

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const ax = this.x + this.size / 2;
        const ay = this.y + this.size / 2;

        const touching = this.tethered.some(t => {

            if (t.isDead())
                return false;

            return pointNearSegment(
                px, py,
                ax, ay,
                t.x + t.size / 2, t.y + t.size / 2,
                GARDEN_ELITE.WEAVER_VINE_THICKNESS
            );

        });

        if (!touching)
            return;

        // A cooldown rather than a hit per frame per vine: the web
        // spans the whole arena, so without one a single step into
        // it would land several hits at once.
        this.vineHitCooldown = GARDEN_ELITE.WEAVER_VINE_HIT_COOLDOWN;

        player.takeHit(ENEMY_LABELS.vineWeaver);

    }

    // Mirror a fraction of `amount` onto everything else on the
    // tether. Called from the damaged ally, via tetherSource.
    // Damage is DIVIDED across the vine, not copied along it.
    //
    // Six damage into a chain of six is one each - so a big hit
    // on a tethered target is close to wasted, and the weaver has
    // to come off the board before focused damage means anything
    // again. The old version mirrored a share onto each ally,
    // which made the weaver a damage AMPLIFIER for the player
    // rather than a problem.
    shareDamage(from, amount) {

        const alive = this.tethered.filter(a => !a.isDead());

        if (alive.length === 0)
            return;

        // The struck target is one of the ends, so it counts too.
        const ends = alive.includes(from) ? alive.length : alive.length + 1;
        const share = Math.max(1, Math.floor(amount / ends));

        alive.forEach(a => {

            if (a === from)
                return;

            // Straight to hp: routing back through takeDamage
            // would bounce off this same tether and recurse.
            a.hp -= share;
            a.flashTimer = 4;

            if (a.hp <= 0)
                onEnemyKilled(a);

        });

    }

    // What the struck target should actually take, given how many
    // ends the vine has. Read by Enemy.takeDamage.
    incomingFraction() {

        const alive = this.tethered.filter(a => !a.isDead()).length;

        return alive === 0 ? 1 : 1 / (alive + 1);

    }

    draw() {

        const now = Date.now();

        this.tethered.forEach(a => {

            if (a.isDead())
                return;

            ctx.save();
            ctx.strokeStyle = this.isElite
                ? `rgba(120, 220, 150, ${0.55 + Math.sin(now / 200) * 0.15})`
                : "rgba(80, 160, 120, 0.5)";
            ctx.lineWidth = this.isElite ? 4 : 2.5;

            ctx.beginPath();
            ctx.moveTo(this.x + this.size / 2, this.y + this.size / 2);
            ctx.lineTo(a.x + a.size / 2, a.y + a.size / 2);
            ctx.stroke();
            ctx.restore();

        });

        super.draw();

    }

}

// =====================================
// Creeper Vine
// =====================================
//
// Not really a combatant: it grows in from the arena edge and
// keeps growing, putting a soft clock on the wave. Ignore it and
// the room gets smaller.

// Types the Gardener Shade is allowed to bring back. Bosses are
// excluded - a replanted boss would be a different fight - and so
// is the Rose Knight, which arrives four at a time already.
const GARDEN_REPLANTABLE = new Set([
    "boar", "hedgeWarden", "rootHulk",
    "brambleArcher", "sporePuffer",
    "pollenDrone", "gardenerShade", "vineWeaver"
]);
