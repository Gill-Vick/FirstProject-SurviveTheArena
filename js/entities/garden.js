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

    beginCharge() {

        const target = getAggroSource(this);

        const dx = (target.x + target.size / 2) - (this.x + this.size / 2);
        const dy = (target.y + target.size / 2) - (this.y + this.size / 2);
        const d = Math.hypot(dx, dy) || 1;

        this.chargeX = dx / d;
        this.chargeY = dy / d;

        this.charging = true;
        this.sinceTrail = 0;

        // Elites bounce once off the first wall they meet, so the
        // angle you dodged is not the angle that comes back.
        this.ricochetsLeft = this.isElite ? GARDEN_ELITE.BOAR_RICOCHETS : 0;

    }

    advanceCharge() {

        const cfg = GARDEN.boar;
        const step = cfg.CHARGE_SPEED * Game.timeScale;

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

        if (this.ricochetsLeft > 0) {

            this.ricochetsLeft--;

            if (this.x <= 0 || this.x + this.size >= canvas.width)
                this.chargeX *= -1;

            if (this.y <= 0 || this.y + this.size >= canvas.height)
                this.chargeY *= -1;

            this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
            this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));

            return;

        }

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

    inCover() {

        // Elites carry their own cover with them.
        if (this.isElite && GARDEN_ELITE.WARDEN_REGROW_ANYWHERE)
            return true;

        const cfg = GARDEN.hedgeWarden;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        return (Arena.props ?? []).some(p =>
            p.kind === "bush" &&
            Math.hypot(p.x - cx, p.y - cy) < cfg.COVER_RADIUS
        );

    }

    move() {

        super.move();

        if (!this.inCover())
            return;

        const cfg = GARDEN.hedgeWarden;

        this.shieldHp = Math.min(
            cfg.SHIELD_MAX,
            this.shieldHp + cfg.REGROW_PER_SEC * (Game.dt / 1000)
        );

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
            this.telegraph = cfg.STOMP_TELEGRAPH_MS;
            this.stompCooldown = cfg.STOMP_COOLDOWN;
        }

    }

    erupt() {

        const cfg = GARDEN.rootHulk;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.hazards.push(new RootRing(cx, cy, cfg.RING_INNER, cfg.RING_OUTER));

        if (this.isElite)
            Game.hazards.push(new RootRing(
                cx, cy,
                GARDEN_ELITE.HULK_SECOND_RING_INNER,
                GARDEN_ELITE.HULK_SECOND_RING_OUTER
            ));

    }

    draw() {

        // Winding up: a ring on the ground showing exactly where
        // it is about to be dangerous, and where it is not.
        if (this.telegraph > 0) {

            const cfg = GARDEN.rootHulk;
            const t = 1 - this.telegraph / cfg.STOMP_TELEGRAPH_MS;

            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;

            ctx.save();
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

        Game.hazards.push(new RootArrow(cx, cy, angle, this.isElite));

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

        Game.hazards.push(new SporeCloud(
            target.x + target.size / 2,
            target.y + target.size / 2,
            cfg.CLOUD_RADIUS,
            cfg.CLOUD_MS,
            this.isElite ? GARDEN_ELITE.PUFFER_SPLIT_COUNT : 0
        ));

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
        const sway = Math.sin(this.wobble) * 0.55;

        this.x += ((dx / d) + nx * sway) * this.speed * Game.timeScale;
        this.y += ((dy / d) + ny * sway) * this.speed * Game.timeScale;

    }

    onDeath() {

        // An elite wisp doesn't die so much as divide: killing it
        // makes the swarm MORE numerous, so raw damage is the one
        // thing that doesn't solve it.
        if (!this.isElite)
            return;

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

        this.wardTimer = 0;

    }

    move() {

        holdRange(this, GARDEN.pollenDrone.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

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

        livingAllies(this).forEach(ally => {

            if (gardenDist(this, ally) > cfg.AURA_RADIUS)
                return;

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

    drawProtectAura() {

        const cfg = GARDEN.pollenDrone;

        const pulse = 0.5 + Math.sin(Date.now() / 420) * 0.5;

        ctx.save();

        // Translate to the drone and fill a cached local-space
        // gradient, rather than building one around it - see
        // auraGradient. globalAlpha carries the pulse, so the
        // cached object never has to change.
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.globalAlpha = 0.55 + pulse * 0.45;

        ctx.fillStyle = auraGradient("230, 199, 96", cfg.AURA_RADIUS, 0.2, 0.11);
        ctx.beginPath();
        ctx.arc(0, 0, cfg.AURA_RADIUS, 0, Math.PI * 2);
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

        this.replantCooldown = cfg.REPLANT_COOLDOWN;

        // Types this shade has watched die, in order.
        this.compost = [];

    }

    move() {

        holdRange(this, GARDEN.gardenerShade.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    // Called from onEnemyKilled - see game.js.
    noteDeath(type) {

        if (type !== "wisp" && GARDEN_REPLANTABLE.has(type))
            this.compost.push(type);

    }

    attack() {

        const cfg = GARDEN.gardenerShade;

        this.replantCooldown -= Game.dt;

        if (this.replantCooldown > 0 || this.compost.length === 0)
            return;

        this.replantCooldown = cfg.REPLANT_COOLDOWN;

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

    }

    move() {

        holdRange(this, GARDEN.vineWeaver.PREFERRED_RANGE);
        this.keepInArenaOnceEntered();

    }

    attack() {

        const cfg = GARDEN.vineWeaver;

        const want = this.isElite ? GARDEN_ELITE.WEAVER_TETHER_COUNT : 2;

        this.tethered = livingAllies(this)
            .filter(a => a.type !== "vineWeaver" &&
                         gardenDist(this, a) < cfg.TETHER_RANGE)
            .slice(0, want);

        // Every tethered ally points back at this weaver, so
        // Enemy.takeDamage can mirror a share of the hit onto
        // the others without knowing anything about weavers.
        this.tethered.forEach(a => { a.tetherSource = this; });

    }

    // Mirror a fraction of `amount` onto everything else on the
    // tether. Called from the damaged ally, via tetherSource.
    shareDamage(from, amount) {

        const cfg = GARDEN.vineWeaver;
        const share = Math.max(1, Math.round(amount * cfg.SHARE_FRACTION));

        this.tethered.forEach(a => {

            if (a === from || a.isDead())
                return;

            // Straight to hp: routing back through takeDamage
            // would bounce off this same tether and recurse.
            a.hp -= share;
            a.flashTimer = 4;

            if (a.hp <= 0)
                onEnemyKilled(a);

        });

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

class CreeperVine extends Enemy {

    constructor(x, y) {

        const cfg = GARDEN.creeperVine;

        super(x, y, {
            size: cfg.SIZE,
            speed: 0,
            hp: gardenHp(cfg),
            color: cfg.COLOR
        });

        this.type = "creeperVine";
        this.knockbackImmune = true;
        this.stunImmune = true;

        // Grows toward the middle from wherever it started.
        const dx = canvas.width / 2 - x;
        const dy = canvas.height / 2 - y;
        const d = Math.hypot(dx, dy) || 1;

        this.growX = dx / d;
        this.growY = dy / d;

        this.sinceSegment = 0;

    }

    move() {

        const cfg = GARDEN.creeperVine;
        const step = cfg.GROW_PER_SEC * (Game.dt / 1000);

        this.x += this.growX * step;
        this.y += this.growY * step;

        this.sinceSegment += step;

        if (this.sinceSegment < 52)
            return;

        this.sinceSegment = 0;

        Game.hazards.push(new BramblePatch(
            this.x + this.size / 2,
            this.y + this.size / 2,
            99000
        ));

    }

}

// Types the Gardener Shade is allowed to bring back. Bosses and
// the vine are excluded - a replanted boss would be a different
// fight, and a replanted vine would never stop.
const GARDEN_REPLANTABLE = new Set([
    "boar", "hedgeWarden", "rootHulk",
    "brambleArcher", "sporePuffer",
    "pollenDrone", "gardenerShade", "vineWeaver"
]);
