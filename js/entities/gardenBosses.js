// =====================================
// Act II / III Bosses
// =====================================
//
// Four bosses, each deliberately a different SHAPE from the five
// that came before. The castle's bosses are all, at bottom, a
// thing that comes at you: a brute, a dash-swordsman, a caster, a
// pair, and a summoner. By wave 20 the player is strong enough
// that "comes at you" has stopped being a threat on its own, so
// none of these are that.
//
//   Thorn Matron  punishes passivity, and kneels to reseed
//   Greenwarden   a disarm puzzle that staggers when solved
//   Heartwood     never moves; opens its core as a reward window
//   Herald        flies, and can only be fought when it lands
//
// Every one of them has a WINDOW - a moment where the right play
// pays off unusually well. That is the deliberate through-line,
// and it is what makes these fights feel fought rather than
// merely survived.
//
// The windows are deliberately TIGHT. An earlier pass made them
// generous on the theory that these bosses have no reward tier
// behind them yet, and the result was four fights you could win
// by standing still - so the windows are now short enough that
// you have to already be in position when they open, and every
// boss changes gear at half health on top (see bossPhase).
//
// Fix the stat blocks in ACT2_BOSSES; the shapes live here.

// Shared: a boss's HP scaled by how deep the run is, so Endless
// and Boss Rush stay meaningful past their campaign wave.
function actBossHp(cfg) {

    return cfg.HP_BASE + Math.floor(Game.wave / 5) * cfg.HP_PER_CYCLE;

}

// 1 above half health, 2 below it.
//
// Every one of these bosses genuinely changes gear at the
// threshold rather than only running hot in the enrage visual -
// cooldowns compress, attacks come in multiples, and the reward
// windows get meaner. A late-campaign boss that fights the same
// way at 10% as at 100% is a health bar, not a fight.
function bossPhase(boss) {

    return boss.hp / boss.maxHp <= ACT2_BOSSES.PHASE2_THRESHOLD ? 2 : 1;

}

// Cooldown multiplier for the boss's current phase.
function phaseRate(boss, cfg) {

    return bossPhase(boss) === 2 ? cfg.PHASE2_COOLDOWN_MULT : 1;

}

// Shared telegraph ring, used by everything below. Bosses this
// late live or die on whether the player can read them, so the
// windup marker is one function rather than four dialects.
function drawBossTelegraph(x, y, radius, progress, rgb) {

    ctx.save();

    ctx.strokeStyle = `rgba(${rgb}, ${0.3 + progress * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Filling clockwise as it closes, so "how long have I got"
    // is readable at a glance rather than guessed from a colour.
    ctx.strokeStyle = `rgba(${rgb}, 0.9)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.restore();

}

// =====================================
// The Thorn Matron (wave 20)
// =====================================
//
// She overgrows the arena, and her own output scales with how
// much of it she has taken. Fighting her from a corner is the
// losing line - she reseeds faster than a stationary player can
// matter, and every seed makes her lash harder.
//
// Her tell is that she must KNEEL to reseed, and she takes double
// damage while she does. The fight is a loop: let her plant, punish
// the planting, clear the ground, repeat.

// A point on a ring around (cx, cy) that is actually inside the
// arena.
//
// Both of the Matron's ring abilities are centred on the PLAYER,
// and a player hugging a wall would otherwise have half the
// pattern clamped into a heap in the scenery behind them - which
// turned cornering yourself into a way of DEFUSING her. Bouncing
// the angle to the opposite side of the ring keeps every point
// near the player and on playable ground, so the pattern stays
// worth the same wherever you stand.
//
// Returns null only if the ring cannot fit anywhere, which it
// always can at these radii.
function ringPointInArena(cx, cy, angle, radius, margin = 24) {

    const inside = (x, y) =>
        x >= margin && y >= margin &&
        x <= canvas.width - margin && y <= canvas.height - margin;

    for (const a of [angle, angle + Math.PI, angle + Math.PI / 2, angle - Math.PI / 2]) {

        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;

        if (inside(x, y))
            return { x, y };

    }

    return {
        x: Math.max(margin, Math.min(canvas.width - margin, cx + Math.cos(angle) * radius)),
        y: Math.max(margin, Math.min(canvas.height - margin, cy + Math.sin(angle) * radius))
    };

}

class ThornMatron extends Enemy {

    constructor(x, y) {

        const cfg = ACT2_BOSSES.matron;

        super(x, y, {
            size: 82,
            speed: ACT2_BOSSES.matron.SPEED * Game.enemySpeedMultiplier,
            hp: actBossHp(cfg),
            color: "#a8446b"
        });

        this.type = "thornMatron";
        this.isBoss = true;

        this.knockbackImmune = true;
        this.stunImmune = true;

        // The one boss lightning CAN touch.
        //
        // Set explicitly rather than left off, because every
        // other boss in the game turns this on and a missing
        // line here would read as an oversight. It isn't: she is
        // a garden overgrown with wet green growth, and being
        // the fight where Stormfletch and the Voltaic Fang
        // actually pay off gives those items somewhere to shine.
        //
        // It only affects lightning DAMAGE and chaining - the
        // paralyze rides on stunImmune, which stays on, so she
        // still can't be locked down.
        this.lightningImmune = false;

        this.seedCooldown = cfg.SEED_COOLDOWN;
        this.lashCooldown = cfg.LASH_COOLDOWN;

        // Short fuse on the first set - see BLOOM_OPENING_MS.
        this.bloomCooldown = cfg.BLOOM_OPENING_MS;

        // Health gates still ahead of her, highest first. Shifted
        // off as they are crossed, so each fires exactly once.
        this.bloomGates = cfg.BLOOM_HP_GATES.slice();

        // How many sets she has actually put out. The gates
        // compare against this rather than firing blind, which
        // is what keeps them a FLOOR instead of a bonus - see
        // the gate check in attack().
        this.bloomsFired = 0;

        this.kneeling = 0;

    }

    // 0..1 - how much of the arena she has overgrown. Read off
    // the live bramble count rather than tracked separately, so
    // clearing ground is felt immediately.
    overgrowth() {

        return Math.min(
            1,
            Game.hazards.filter(h => h instanceof BramblePatch).length / 26
        );

    }

    // Kneeling is the reward window, and it has to be worth
    // crossing the arena for.
    takeDamage(amount, crit = false) {

        if (this.kneeling > 0)
            amount = Math.round(amount * ACT2_BOSSES.matron.KNEEL_VULN_MULT);

        super.takeDamage(amount, crit);

    }

    move() {

        if (this.kneeling > 0)
            return;

        super.move();

    }

    attack() {

        const cfg = ACT2_BOSSES.matron;

        if (this.kneeling > 0) {

            this.kneeling -= Game.dt;

            if (this.kneeling <= 0)
                this.reseed();

            return;

        }

        const rate = phaseRate(this, cfg);

        this.seedCooldown -= Game.dt;
        this.lashCooldown -= Game.dt;
        this.bloomCooldown -= Game.dt;

        // Burst valve.
        //
        // The gates are a FLOOR on how many sets a given chunk of
        // her health is worth, not a bonus on top of the timer.
        // Crossing one only blooms if the clock hasn't already
        // paid out that many - so a long fight, where the
        // cooldown is firing steadily anyway, never triggers a
        // single gate, and a burst kill that would have outrun
        // the timer entirely gets dragged back up to the same
        // number of sets.
        //
        // Wisps end up priced in HER HEALTH rather than in
        // seconds, which is the whole point: killing her faster
        // stops being a way to skip the fight.
        if (
            this.bloomGates.length > 0 &&
            this.hp / this.maxHp <= this.bloomGates[0]
        ) {

            const crossed = cfg.BLOOM_HP_GATES.length - this.bloomGates.length + 1;

            this.bloomGates.shift();

            // +1 for the opening set every fight gets.
            if (this.bloomsFired < crossed + 1) {

                this.bloomCooldown = cfg.BLOOM_COOLDOWN * rate;
                this.bloom();

                return;

            }

        }

        if (this.seedCooldown <= 0) {

            this.seedCooldown = cfg.SEED_COOLDOWN * rate;
            this.kneeling = cfg.KNEEL_MS;

            return;

        }

        // Bloom: a pair of wisps torn off the hedges. Adds
        // pressure without adding another thing to dodge, so the
        // fight stays legible.
        if (this.bloomCooldown <= 0) {

            this.bloomCooldown = cfg.BLOOM_COOLDOWN * rate;
            this.bloom();

            return;

        }

        if (this.lashCooldown <= 0) {

            // Comes faster the more overgrown the arena is, so
            // ignoring the thorns is what actually kills you.
            this.lashCooldown = Math.max(
                cfg.LASH_MIN_COOLDOWN,
                cfg.LASH_COOLDOWN - this.overgrowth() * 1200
            ) * rate;

            this.lash();

            // Below half she throws a second fan, offset, so the
            // gap you stepped into closes behind you.
            if (bossPhase(this) === 2)
                this.lash(0.12);

        }

    }

    // She seeds the ground around YOU, wherever that is (see
    // SEED_RING_MIN/MAX). A ring rather than a disc, so it takes
    // away the ground you were about to run to rather than the
    // ground you are already standing on.
    reseed() {

        const cfg = ACT2_BOSSES.matron;

        const count = 4 + Math.floor(this.overgrowth() * 3) +
                      (bossPhase(this) === 2 ? cfg.PHASE2_SEED_BONUS : 0);

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const band = cfg.SEED_RING_MAX - cfg.SEED_RING_MIN;

        for (let i = 0; i < count; i++) {

            const a = (i / count) * Math.PI * 2 + Math.random();
            const r = cfg.SEED_RING_MIN + Math.random() * band;

            const at = ringPointInArena(px, py, a, r);

            Game.hazards.push(new BramblePatch(
                at.x, at.y, 8500, cfg.THORN_SPROUT_MS,
                ENEMY_LABELS[this.type]
            ));

        }

    }

    bloom() {

        const cfg = ACT2_BOSSES.matron;
        const count = cfg.BLOOM_COUNT;
        const size = GARDEN.wispSwarm.SIZE;

        this.bloomsFired++;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        // Ringed around the PLAYER, evenly, with the ring itself
        // rotated at random so the openings are never in the
        // same place twice.
        //
        // They used to fan out in front of HER, which put them
        // stacked on her own body in the exact line a ranged
        // player was already firing down - so they died to the
        // shots aimed at the boss and never became a threat.
        // Out here they have to be turned to face.
        const spin = Math.random() * Math.PI * 2;

        for (let i = 0; i < count; i++) {

            const a = spin + (i / count) * Math.PI * 2;

            const r = cfg.BLOOM_RING_RADIUS +
                (Math.random() - 0.5) * cfg.BLOOM_RING_JITTER;

            const at = ringPointInArena(px, py, a, r, size + 24);

            const x = at.x - size / 2;
            const y = at.y - size / 2;

            // Warned first, exactly like the necromancer's
            // skeletons and the King's reinforcements. Nothing
            // exists to be hit - or to hit you - until it fires,
            // which is the cleanest form the warning can take,
            // and it replaces the old emerge timer that only
            // started once the wisp was already standing there.
            Game.spawnTelegraphs.push(new SpawnWarning(

                x + size / 2,
                y + size / 2,
                size / 2 + 12,
                cfg.BLOOM_WARN_MS,

                () => {

                    Game.enemies.push(new Wisp(x, y));
                    Game.enemiesRemaining++;

                }

            ));

        }

    }

    lash(skew = 0) {

        const target = getAggroSource(this);

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const base = Math.atan2(
            (target.y + target.size / 2) - cy,
            (target.x + target.size / 2) - cx
        );

        const arms = 3 + Math.round(this.overgrowth() * 2);

        for (let i = 0; i < arms; i++)
            Game.hazards.push(new RootArrow(
                cx, cy,
                base + skew + (i - (arms - 1) / 2) * 0.24,
                false
            ));

    }

    draw() {

        if (this.kneeling > 0) {

            const cfg = ACT2_BOSSES.matron;

            drawBossTelegraph(
                this.x + this.size / 2,
                this.y + this.size / 2,
                this.size * 0.95,
                1 - this.kneeling / cfg.KNEEL_MS,
                "255, 220, 120"
            );

        }

        super.draw();

    }

}

// =====================================
// The Greenwarden (wave 25)
// =====================================
//
// A topiary golem with three limbs, each powering one attack.
// Break a limb and that attack stops - but it regrows one every
// so often, so the fight is a race between disarming it and it
// rebuilding itself.
//
// Break all three and it STAGGERS: several seconds of standing
// there doing nothing while you hit it. That payoff is what
// makes the puzzle worth engaging with rather than ignoring in
// favour of hitting the core.

class Greenwarden extends Enemy {

    constructor(x, y) {

        const cfg = ACT2_BOSSES.greenwarden;

        super(x, y, {
            size: 96,
            speed: ACT2_BOSSES.greenwarden.SPEED * Game.enemySpeedMultiplier,
            hp: actBossHp(cfg),
            color: "#3f7a3c"
        });

        this.type = "greenwarden";
        this.isBoss = true;

        this.knockbackImmune = true;
        this.lightningImmune = true;
        this.stunImmune = true;

        // Limbs live on the boss rather than as separate entities,
        // so the boss bar, x-ray and shadow passes all still work
        // without knowing this fight is different.
        this.limbs = [
            { name: "flail", hp: cfg.LIMB_HP, max: cfg.LIMB_HP, cd: cfg.FLAIL_COOLDOWN },
            { name: "rake", hp: cfg.LIMB_HP, max: cfg.LIMB_HP, cd: cfg.RAKE_COOLDOWN },
            { name: "seeder", hp: cfg.LIMB_HP, max: cfg.LIMB_HP, cd: cfg.SEED_COOLDOWN }
        ];

        this.regrowTimer = cfg.REGROW_MS;
        this.stagger = 0;

    }

    livingLimbs() {

        return this.limbs.filter(l => l.hp > 0);

    }

    // Damage splits between the nearest living limb and the core,
    // so a player who ignores the limbs still makes progress -
    // just slower, and under everything the limbs can throw.
    takeDamage(amount, crit = false) {

        const living = this.livingLimbs();

        if (living.length > 0 && this.stagger <= 0) {

            const toLimb = Math.max(1, Math.round(amount * 0.5));
            const limb = living[0];

            limb.hp = Math.max(0, limb.hp - toLimb);

            if (limb.hp === 0 && this.livingLimbs().length === 0)
                this.stagger = ACT2_BOSSES.greenwarden.STAGGER_MS;

            amount = Math.max(1, amount - toLimb);

        }

        super.takeDamage(amount, crit);

    }

    move() {

        if (this.stagger > 0)
            return;

        super.move();

    }

    attack() {

        const cfg = ACT2_BOSSES.greenwarden;

        // Fully disarmed: it stands there and takes it.
        if (this.stagger > 0) {

            this.stagger -= Game.dt;

            // Everything grows back at once when it recovers -
            // the stagger is the reward, not a permanent win.
            if (this.stagger <= 0) {

                this.limbs.forEach(l => { l.hp = l.max; });
                this.regrowTimer = cfg.REGROW_MS;

            }

            return;

        }

        if (this.livingLimbs().length < this.limbs.length) {

            this.regrowTimer -= Game.dt;

            if (this.regrowTimer <= 0) {

                this.regrowTimer = cfg.REGROW_MS * phaseRate(this, cfg);

                // Below half it grows them back in PAIRS, so
                // holding it fully disarmed stops being possible
                // and the stagger becomes something you set up
                // for rather than something you maintain.
                const pairs = bossPhase(this) === 2 && cfg.PHASE2_REGROW_PAIRS ? 2 : 1;

                for (let i = 0; i < pairs; i++) {

                    const broken = this.limbs.find(l => l.hp <= 0);

                    if (broken)
                        broken.hp = broken.max;

                }

            }

        }

        this.limbs.forEach(limb => {

            if (limb.hp <= 0)
                return;

            limb.cd -= Game.dt;

            if (limb.cd > 0)
                return;

            const rate = phaseRate(this, cfg);

            if (limb.name === "flail") {
                limb.cd = cfg.FLAIL_COOLDOWN * rate;
                this.flail();
            } else if (limb.name === "rake") {
                limb.cd = cfg.RAKE_COOLDOWN * rate;
                this.rake();
            } else {
                limb.cd = cfg.SEED_COOLDOWN * rate;
                this.seed();
            }

        });

    }

    flail() {

        // Reaches further below half, so the "just stand outside
        // it" answer stops working at exactly the point the fight
        // gets busy.
        Game.hazards.push(new RootRing(
            this.x + this.size / 2,
            this.y + this.size / 2,
            0, bossPhase(this) === 2 ? 220 : 165
        ));

    }

    rake() {

        const target = getAggroSource(this);

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const base = Math.atan2(
            (target.y + target.size / 2) - cy,
            (target.x + target.size / 2) - cx
        );

        const arms = bossPhase(this) === 2 ? 9 : 6;

        for (let i = 0; i < arms; i++)
            Game.hazards.push(new RootArrow(
                cx, cy, base + (i - (arms - 1) / 2) * 0.17, false
            ));

    }

    seed() {

        const target = getAggroSource(this);

        Game.hazards.push(new SporeCloud(
            target.x + target.size / 2,
            target.y + target.size / 2,
            105, 4600, 0
        ));

    }

    draw() {

        super.draw();

        const cx = this.x + this.size / 2;

        // Limb pips over the boss, so the disarm state is readable
        // from the fight itself rather than inferred from which
        // attacks have stopped happening.
        this.limbs.forEach((limb, i) => {

            const x = cx - 30 + i * 21;

            ctx.fillStyle = limb.hp > 0
                ? `rgba(120, 220, 110, ${0.35 + (limb.hp / limb.max) * 0.65})`
                : "rgba(70, 58, 46, 0.7)";

            ctx.fillRect(Math.round(x), Math.round(this.y - 18), 15, 7);

        });

        if (this.stagger <= 0)
            return;

        // Staggered: say so, loudly. This is the window the whole
        // fight is built around.
        drawBossTelegraph(
            cx, this.y + this.size / 2, this.size * 0.8,
            1 - this.stagger / ACT2_BOSSES.greenwarden.STAGGER_MS,
            "255, 240, 150"
        );

    }

}

// =====================================
// The Heartwood (wave 30)
// =====================================
//
// Does not move. At all. It sits in the centre of the grove and
// fights entirely through the arena - roots erupting under the
// player, canopy dropping, saplings pushing up, sap surging out
// in rings.
//
// The change of pace is the point: every other boss in this game
// is a duel, and this one is a room that wants you dead. Its core
// opens on a timer for a few seconds at a time, taking double
// damage, which gives a stationary fight a rhythm.

class Heartwood extends Enemy {

    constructor(x, y) {

        const cfg = ACT2_BOSSES.heartwood;

        super(x, y, {
            size: 130,
            speed: 0,
            hp: actBossHp(cfg),
            color: "#6b4a2a"
        });

        this.type = "heartwood";
        this.isBoss = true;

        this.knockbackImmune = true;
        this.lightningImmune = true;
        this.stunImmune = true;

        this.rootCooldown = cfg.ROOT_COOLDOWN;
        this.canopyCooldown = cfg.CANOPY_COOLDOWN;
        this.saplingCooldown = cfg.SAPLING_COOLDOWN;
        this.surgeCooldown = cfg.SURGE_COOLDOWN;

        this.coreTimer = cfg.CORE_OPEN_EVERY;
        this.coreOpen = 0;

        // Where the next root is going to come up. Held for the
        // telegraph's duration so the marker doesn't chase the
        // player - a warning that follows you is not a warning.
        this.rootAim = null;
        this.rootTelegraph = 0;

    }

    move() {}

    takeDamage(amount, crit = false) {

        if (this.coreOpen > 0)
            amount = Math.round(amount * ACT2_BOSSES.heartwood.CORE_DAMAGE_MULT);

        super.takeDamage(amount, crit);

    }

    attack() {

        const cfg = ACT2_BOSSES.heartwood;

        // --- core window ---
        if (this.coreOpen > 0)
            this.coreOpen -= Game.dt;
        else {

            this.coreTimer -= Game.dt;

            if (this.coreTimer <= 0) {
                this.coreTimer = cfg.CORE_OPEN_EVERY;
                this.coreOpen = cfg.CORE_OPEN_MS;
            }

        }

        // --- roots, telegraphed where the player WAS ---
        if (this.rootTelegraph > 0) {

            this.rootTelegraph -= Game.dt;

            if (this.rootTelegraph <= 0 && this.rootAim) {

                Game.hazards.push(new RootRing(this.rootAim.x, this.rootAim.y, 0, 104));

                // Below half a second root erupts alongside the
                // first, offset - so the sidestep that solved it
                // now has to be the RIGHT sidestep.
                if (bossPhase(this) === 2 && cfg.PHASE2_DOUBLE_ROOTS) {

                    const a = Math.random() * Math.PI * 2;

                    Game.hazards.push(new RootRing(
                        this.rootAim.x + Math.cos(a) * 120,
                        this.rootAim.y + Math.sin(a) * 120,
                        0, 104
                    ));

                }

                this.rootAim = null;

            }

        } else {

            this.rootCooldown -= Game.dt;

            if (this.rootCooldown <= 0) {

                this.rootCooldown = cfg.ROOT_COOLDOWN * phaseRate(this, cfg);
                this.rootTelegraph = cfg.ROOT_TELEGRAPH_MS;

                this.rootAim = {
                    x: player.x + player.size / 2,
                    y: player.y + player.size / 2
                };

            }

        }

        this.canopyCooldown -= Game.dt;
        this.saplingCooldown -= Game.dt;
        this.surgeCooldown -= Game.dt;

        // --- canopy: a ring well out from the trunk, herding the
        // player back in toward it ---
        if (this.canopyCooldown <= 0) {

            this.canopyCooldown = cfg.CANOPY_COOLDOWN * phaseRate(this, cfg);

            for (let i = 0; i < 8; i++) {

                const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
                const r = canvas.height * 0.36;

                Game.hazards.push(new BramblePatch(
                    this.x + this.size / 2 + Math.cos(a) * r,
                    this.y + this.size / 2 + Math.sin(a) * r,
                    4800,
                    0,
                    ENEMY_LABELS[this.type]
                ));

            }

        }

        // --- sap surge: an expanding ring from the trunk, which
        // pushes the player OUT, against the canopy pushing in ---
        if (this.surgeCooldown <= 0) {

            this.surgeCooldown = cfg.SURGE_COOLDOWN * phaseRate(this, cfg);

            Game.hazards.push(new RootRing(
                this.x + this.size / 2,
                this.y + this.size / 2,
                140, 260
            ));

            // A second, wider surge below half - the safe band
                // between the canopy and the trunk narrows to a
            // corridor.
            if (bossPhase(this) === 2)
                Game.hazards.push(new RootRing(
                    this.x + this.size / 2,
                    this.y + this.size / 2,
                    320, 430
                ));

        }

        if (this.saplingCooldown <= 0) {

            this.saplingCooldown = cfg.SAPLING_COOLDOWN * phaseRate(this, cfg);

            for (let i = 0; i < cfg.SAPLING_COUNT; i++) {

                const a = Math.random() * Math.PI * 2;
                const r = 190 + Math.random() * 110;

                const sapling = new ThornbackBoar(
                    Math.max(20, Math.min(canvas.width - 60, this.x + Math.cos(a) * r)),
                    Math.max(20, Math.min(canvas.height - 60, this.y + Math.sin(a) * r))
                );

                sapling.emergeTimer = GARDEN.EMERGE_MS;

                Game.enemies.push(sapling);
                Game.enemiesRemaining++;

            }

        }

    }

    draw() {

        const cfg = ACT2_BOSSES.heartwood;

        // Root windup, drawn on the floor where it will erupt.
        if (this.rootTelegraph > 0 && this.rootAim)
            drawBossTelegraph(
                this.rootAim.x, this.rootAim.y, 96,
                1 - this.rootTelegraph / cfg.ROOT_TELEGRAPH_MS,
                "180, 110, 50"
            );

        super.draw();

        if (this.coreOpen <= 0)
            return;

        // The open core: a hot split down the trunk. The one time
        // in the fight it is worth being close.
        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const pulse = 0.6 + Math.sin(Date.now() / 90) * 0.4;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.size * 0.5);
        g.addColorStop(0, `rgba(255, 210, 120, ${0.75 * pulse})`);
        g.addColorStop(1, "rgba(255, 140, 60, 0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}

// =====================================
// The Herald (wave 35)
// =====================================
//
// The first of the angels. It flies, and while airborne melee
// simply cannot reach it - so the fight happens in the windows
// when it comes down, and everything before that is positioning.
//
// Deliberately built AWAY from the Hero five waves later: he
// already owns sweeping lasers and Royal Judgment, so the Herald
// is about height, about a mark you break line of sight on, and
// about the moment it lands.

class Herald extends Enemy {

    constructor(x, y) {

        const cfg = ACT2_BOSSES.herald;

        super(x, y, {
            size: 76,
            speed: ACT2_BOSSES.herald.SPEED * Game.enemySpeedMultiplier,
            hp: actBossHp(cfg),
            color: "#dfe6f5"
        });

        this.type = "herald";
        this.isBoss = true;

        this.knockbackImmune = true;
        this.lightningImmune = true;
        this.stunImmune = true;

        this.airborne = true;
        this.airTimer = cfg.AIR_MS;

        this.pillarCooldown = cfg.PILLAR_COOLDOWN;
        this.markCooldown = cfg.MARK_COOLDOWN;

        this.landingShock = 0;

    }

    // Untouchable in the air. Its landing is the whole fight, and
    // everything else is spent setting up for it.
    takeDamage(amount, crit = false) {

        if (this.airborne)
            return;

        super.takeDamage(amount, crit);

    }

    move() {

        if (!this.airborne) {

            super.move();
            return;

        }

        // Circles above the player rather than closing - it is
        // waiting, not hunting.
        const t = Date.now() / 1400;
        const r = 210;

        const tx = player.x + Math.cos(t) * r;
        const ty = player.y + Math.sin(t) * r;

        const dx = tx - this.x;
        const dy = ty - this.y;
        const d = Math.hypot(dx, dy) || 1;

        this.x += (dx / d) * this.speed * Game.timeScale;
        this.y += (dy / d) * this.speed * Game.timeScale;

    }

    attack() {

        const cfg = ACT2_BOSSES.herald;

        this.airTimer -= Game.dt;

        if (this.airTimer <= 0) {

            this.airborne = !this.airborne;

            // Below half it barely touches down at all - the one
            // window the fight gives you gets shorter exactly
            // when you most need it.
            this.airTimer = this.airborne
                ? cfg.AIR_MS
                : cfg.GROUND_MS * (bossPhase(this) === 2 ? cfg.PHASE2_GROUND_MULT : 1);

            // Coming down is itself an attack, so the transition
            // is never a free hit for either side.
            if (!this.airborne) {

                this.landingShock = 400;

                Game.hazards.push(new RootRing(
                    this.x + this.size / 2,
                    this.y + this.size / 2,
                    0, cfg.LANDING_SHOCK_RADIUS
                ));

                Game.screenShake = Math.max(Game.screenShake ?? 0, 12);

            }

        }

        if (this.landingShock > 0)
            this.landingShock -= Game.dt;

        this.pillarCooldown -= Game.dt;
        this.markCooldown -= Game.dt;

        // Pillars of light, in a short line ahead of the player -
        // its bread-and-butter pressure while airborne.
        if (this.pillarCooldown <= 0) {

            this.pillarCooldown = (this.airborne
                ? cfg.PILLAR_COOLDOWN
                : cfg.PILLAR_COOLDOWN * 1.6) * phaseRate(this, cfg);

            const pillars = bossPhase(this) === 2
                ? cfg.PHASE2_PILLAR_COUNT
                : cfg.PILLAR_COUNT;

            for (let i = 0; i < pillars; i++) {

                const a = Math.random() * Math.PI * 2;
                const r = i * 90;

                Game.hazards.push(new RootRing(
                    player.x + player.size / 2 + Math.cos(a) * r,
                    player.y + player.size / 2 + Math.sin(a) * r,
                    0, 92
                ));

            }

        }

        // The mark - the same judgement the Scribes use, which is
        // the point: the Herald teaches the mechanic its whole
        // roster is built on five waves before they arrive.
        if (this.markCooldown <= 0) {

            this.markCooldown = cfg.MARK_COOLDOWN * phaseRate(this, cfg);

            // The fuse tightens below half, so breaking line of
            // sight has to be planned rather than reacted to.
            Game.hazards.push(new JudgementMark(
                this,
                ANGELS.scribe.MARK_FUSE_MS * (bossPhase(this) === 2 ? 0.65 : 1)
            ));

        }

    }

    draw() {

        if (!this.airborne) {

            super.draw();
            return;

        }

        // Airborne: a shadow on the ground and the body lifted, so
        // "you cannot reach this yet" needs no explanation.
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.size / 2,
            this.y + this.size * 0.9,
            this.size * 0.4, this.size * 0.16,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        const lift = 26;

        this.y -= lift;
        super.draw();
        this.y += lift;

    }

}
