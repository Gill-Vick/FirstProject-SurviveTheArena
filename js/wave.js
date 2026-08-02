// =====================================
// Wave Manager
// =====================================

const ENEMY_CLASSES = {

    grunt: Grunt,
    tank: Tank,
    archer: Archer,
    runner: Runner,
    boss: Boss,
    fireMage: FireMage,
    necromancer: Necromancer,
    skeleton: Skeleton,
    lancer: Lancer,
    shade: Shade,
    frostWeaver: FrostWeaver,
    powderKeg: PowderKeg,
    bloodCleric: BloodCleric,
    knight: Knight,
    royalMagus: RoyalMagus,
    prince: Prince,
    princess: Princess,
    king: King,

    // Act II - the grounds.
    boar: ThornbackBoar,
    hedgeWarden: HedgeWarden,
    rootHulk: RootHulk,
    brambleArcher: BrambleArcher,
    sporePuffer: SporePuffer,
    wisp: Wisp,
    pollenDrone: PollenDrone,
    gardenerShade: GardenerShade,
    vineWeaver: VineWeaver,
    roseKnight: RoseKnight,

    thornMatron: ThornMatron,
    greenwarden: Greenwarden,
    heartwood: Heartwood,
    herald: Herald,

    // Act III - the storm.
    cherub: Cherub,
    gateWarden: GateWarden,
    censer: Censer,
    scribe: Scribe,
    choir: Choir,
    seraphBlade: SeraphBlade

};

const SPAWN_GAP = {

    grunt: 400,
    tank: 700,
    archer: 600,
    runner: 500,
    boss: 500,
    fireMage: 650,
    necromancer: 800,
    lancer: 550,
    shade: 700,
    frostWeaver: 800,
    powderKeg: 350,
    bloodCleric: 900,
    knight: 500,
    royalMagus: 500,
    prince: 500,
    princess: 500,
    king: 500,

    // Act II units all arrive together (see spawnSquad), so
    // these only matter for the recap waves in the final band.
    boar: 400, hedgeWarden: 600, rootHulk: 600,
    brambleArcher: 450, sporePuffer: 500, wisp: 200,
    pollenDrone: 600, gardenerShade: 600, vineWeaver: 600,
    roseKnight: 600,

    thornMatron: 500, greenwarden: 500, heartwood: 500, herald: 500,

    cherub: 350, gateWarden: 600, censer: 500,
    scribe: 550, choir: 600, seraphBlade: 500

};

// Bosses never roll elite. (Kegs used to be excluded too,
// but elite kegs now have their own payoff - cluster bombs.)
const NO_ELITE = new Set([
    "boss", "knight", "royalMagus", "prince", "princess", "king",
    "thornMatron", "greenwarden", "heartwood", "herald"
]);

// Types that may appear at most N times as an ELITE in one wave.
//
// The elite Root Hulk's stomp covers the whole arena bar a pocket
// at its own feet. Two of those overlapping leaves nowhere at all
// to stand, which is not difficulty, it is a coin flip - so the
// budget hands out at most one.
const ELITE_CAP = {
    rootHulk: GARDEN_ELITE.HULK_MAX_PER_WAVE,
    roseKnight: GARDEN_ELITE.KNIGHT_MAX_PER_WAVE
};

// =====================================
// Boss Waves
// =====================================
//
// Every boss in the campaign, wave -> spawner.
//
// A table rather than the chain of ifs this used to be: adding a
// boss is now one line, and "is this a boss wave" is the same
// lookup as "which boss", so the two can't drift apart. They did
// drift - the sound cue read from a hand-maintained array that
// had to be kept in step with the dispatch below it.
//
// Safe to reference the spawners up here: they are function
// declarations further down this same file, so they are hoisted
// and already exist by the time this initialiser runs.

const BOSS_WAVE_SPAWNERS = {

    [WAVES.BOSS_WAVE]: startBossWave,
    [WAVES.KNIGHT_WAVE]: startKnightWave,
    [WAVES.MAGUS_WAVE]: startMagusWave,

    [WAVES.MATRON_WAVE]: startMatronWave,
    [WAVES.GREENWARDEN_WAVE]: startGreenwardenWave,
    [WAVES.HEARTWOOD_WAVE]: startHeartwoodWave,

    [WAVES.HERALD_WAVE]: startHeraldWave,
    [WAVES.SIBLINGS_WAVE]: startSiblingsWave,
    [WAVES.KING_WAVE]: startKingWave

};

const BOSS_WAVE_NUMBERS =
    Object.keys(BOSS_WAVE_SPAWNERS).map(Number).sort((a, b) => a - b);

// The next boss wave strictly after `from`, for Boss Rush.
//
// It used to just add BOSS_WAVE (5) each time, which worked only
// while every boss sat on a multiple of five. The campaign's last
// band is ten waves long - nine recap waves then the King at 50 -
// so a flat +5 would drop Boss Rush on wave 45, which has no boss
// on it at all.
function nextBossWave(from) {

    return BOSS_WAVE_NUMBERS.find(w => w > from)
        ?? (from + WAVES.BOSS_WAVE);

}

// =====================================
// Elite Waves
// =====================================
//
// Elites are deterministic, not a per-spawn gamble: within
// each 5-wave block ending in a boss (1-5, 6-10, ...), the
// 2nd and 3rd waves of the block are elite waves (e.g. waves
// 2-3, then 7-8, 12-13, 17-18, 22-23...). Boss waves land on
// wave % 5 == 0, so they can never be elite waves.

function isEliteWave(wave) {

    const posInBlock = wave % WAVES.BOSS_WAVE;

    return posInBlock === 2 || posInBlock === 3;

}

// How many elites this wave carries. 0 on non-elite waves.
// The count ramps every elite wave: START_COUNT on the first
// (wave 2), then +PER_WAVE_STEP each elite wave after it, by
// counting how many elite waves have come before this one.
//
//   wave 2  -> 1st elite wave -> 2
//   wave 3  -> 2nd elite wave -> 3
//   wave 7  -> 3rd elite wave -> 4
//   wave 8  -> 4th elite wave -> 5   ...and so on.

function eliteCountForWave(wave) {

    if (!isEliteWave(wave))
        return 0;

    // Two elite waves per 5-wave block; within a block the
    // pos-2 wave is the earlier of the pair, pos-3 the later.
    const block = Math.floor((wave - 1) / WAVES.BOSS_WAVE);
    const eliteWaveIndex = block * 2 + (wave % WAVES.BOSS_WAVE === 3 ? 1 : 0);

    return ELITE.START_COUNT + eliteWaveIndex * ELITE.PER_WAVE_STEP;

}

// =====================================
// Spawn Order
// =====================================
//
// Grunts are excluded from these lists on purpose - they
// spawn on their own continuous drip (see spawnWaveEnemies)
// rather than taking a slot in the sequence below. Everything
// else spawns strictly in this order, one type finishing
// completely before the next type begins.

const WAVE_ORDER_SET1 = ["tank", "archer", "runner"];

const WAVE_ORDER_SET2 = [
    "tank", "necromancer", "fireMage", "lancer", "runner", "archer"
];

// Set 3 spawns in GROUPS, not a strict one-type-at-a-time
// sequence: every type in a group starts spawning together
// (each on its own cadence), and the next group begins once
// the longest spawner in the current one has finished. Any
// set-3 type not listed here joins the final group. See
// spawnWaveEnemiesGrouped().
const SET3_SPAWN_GROUPS = [
    ["tank", "grunt"],
    ["lancer", "powderKeg", "bloodCleric"],
    ["necromancer", "fireMage", "frostWeaver"],
    ["shade", "runner", "archer"]
];

function getSpawnOrder() {

    return Game.wave >= WAVES.SET2_START
        ? WAVE_ORDER_SET2
        : WAVE_ORDER_SET1;

}

function startWave() {

    Game.waveActive = true;
    Game.waveSpawning = true;
    Game.waveTransition = false;
    // Frames the "WAVE n" banner holds for (ticked down once
    // per draw in drawWaveMessages). Was 120 - a full two
    // seconds of a big banner sitting over the arena while the
    // wave was already spawning in behind it.
    Game.waveMessageTimer = 45;

    // Coins earned this wave, tallied by onEnemyKilled and
    // shown on the wave-clear banner.
    Game.waveCoins = 0;

    // Elite budget for this wave (ramps every elite wave -
    // see eliteCountForWave). eliteEligibleLeft is filled in
    // by the spawners once the wave's counts are known;
    // spawnEnemy() then hands the budget out at exact odds.
    Game.eliteBudget = eliteCountForWave(Game.wave);
    Game.eliteEligibleLeft = 0;
    Game.eliteTypeCounts = {};

    updateArenaForWave();

    // Endless ramps enemy HP once past the King (wave 20); every
    // other mode leaves it at 1 (a no-op in the Enemy ctor).
    Game.enemyHpMultiplier =
        (Game.mode === "endless" && Game.wave > ENDLESS.RAMP_START)
            ? Math.min(
                ENDLESS.HP_MAX,
                1 + (Game.wave - ENDLESS.RAMP_START) * ENDLESS.HP_PER_WAVE
            )
            : 1;

    // Boss Rush skips straight from one boss fight to the next
    // (Game.wave goes 5, 10, 15, 20, 25, ...); Endless and Custom
    // play every wave but want the bosses to recur too. All
    // three fold onto the same 1-25 cycle Campaign uses so they
    // keep landing on BOSS_WAVE/KNIGHT_WAVE/MAGUS_WAVE/
    // SIBLINGS_WAVE/KING_WAVE (with HP still scaling off the
    // real Game.wave). Campaign uses the wave as-is, so it stops
    // having bosses after the King at 25.
    const cycleWave =
        (Game.bossRush || Game.mode === "endless" || Game.mode === "custom")
            ? ((Game.wave - 1) % WAVES.KING_WAVE) + 1
            : Game.wave;

    const spawner = BOSS_WAVE_SPAWNERS[cycleWave];

    Sound.play(spawner ? "bossSpawn" : "waveStart");

    if (spawner) {

        spawner();

        return;

    }

    startNormalWave();

}

function getSet1Counts() {

    const w = Game.wave;
    const scale =
        (w > WAVES.SET1_END ? WAVES.SET1_SCALE_AFTER : 1) *
        WAVES.SPAWN_SCALE;

    const gruntCount = Math.max(
        1,
        Math.floor(
            (WAVES.START_GRUNTS + w * WAVES.GRUNTS_PER_WAVE) * scale
        )
    );

    const tankCount = Math.floor(
        (Math.floor(w / WAVES.TANK_EVERY)) * scale
    );

    const archerCount = Math.floor(
        (w >= WAVES.ARCHER_UNLOCK_WAVE
            ? Math.floor(w / WAVES.ARCHER_EVERY)
            : 0) * scale
    );

    const runnerCount = Math.floor(
        (w >= WAVES.RUNNER_UNLOCK_WAVE
            ? Math.floor(w / WAVES.RUNNER_EVERY)
            : 0) * WAVES.SPAWN_SCALE
    );

    return { grunt: gruntCount, tank: tankCount, archer: archerCount, runner: runnerCount };

}

function getSet2Counts() {

    if (Game.wave < WAVES.SET2_START)
        return { fireMage: 0, necromancer: 0, lancer: 0 };

    const tier = Game.wave - WAVES.SET2_START + 1;

    // Difficulty pass: bumped every set-2 unit up significantly -
    // more fire mages, necromancers, and lancers per tier. Then
    // scaled back down by SPAWN_SCALE for the overall "easier
    // game" pass - floored at 1 so a unit that's unlocked doesn't
    // get scaled away to nothing.
    return {
        fireMage: Math.max(1, Math.floor((2 + Math.floor(tier * 1.5)) * WAVES.SPAWN_SCALE)),
        necromancer: Math.max(1, Math.floor(Math.max(2, tier) * WAVES.SPAWN_SCALE)),
        lancer: Math.max(1, Math.floor((2 + Math.floor(tier * 1.5)) * WAVES.SPAWN_SCALE))
    };

}

// Set 3 (waves 11+): hand-tuned counts per wave rather than a
// formula - the full roster is present from 11, with each
// wave shifting which unit dominates. Waves past 14 reuse the
// wave-14 row (15 is the Royal Magus, 20 the King; the filler
// waves between them just repeat the wave-14 mix).

const SET3_WAVE_COUNTS = {
    11: { powderKeg: 2, frostWeaver: 1, shade: 1, bloodCleric: 1 },
    12: { powderKeg: 2, frostWeaver: 2, shade: 1, bloodCleric: 2 },
    13: { powderKeg: 1, frostWeaver: 1, shade: 3, bloodCleric: 3 },
    14: { powderKeg: 3, frostWeaver: 3, shade: 1, bloodCleric: 3 }
};

function getSet3Counts() {

    if (Game.wave < WAVES.SET3_START)
        return {};

    return { ...(SET3_WAVE_COUNTS[Game.wave] ?? SET3_WAVE_COUNTS[14]) };

}

// =====================================
// Squads (Act II, waves 16-30)
// =====================================
//
// The garden does not spawn a stream of enemies from the screen
// edge. It spawns ONE squad, all at once, erupting out of cover
// inside the arena.
//
// Both halves of that matter. Arriving together is what makes a
// wave read as a small elite force rather than a queue - six
// units with roles, not twenty of the same thing. And arriving
// INSIDE is what stops the whole wave being deleted at the
// border before it has a chance to be a fight, which was the
// specific failure the edge spawns had: a strong player just
// stood at the top of the screen and killed everything as it
// walked on.
//
// Compositions are hand-written rather than rolled, because the
// point is the mix. Every squad has at least one support, so
// every wave has a correct kill order.

const GARDEN_SQUADS = [

    // 16 - introduces the frontline and one support, so the
    // "kill the drone first" lesson lands while it is cheap.
    ["boar", "boar", "hedgeWarden", "brambleArcher", "pollenDrone"],

    // 17 - ranged denial arrives.
    ["boar", "rootHulk", "sporePuffer", "brambleArcher", "pollenDrone"],

    // 18 - the swarm, with a weaver binding what's left of it.
    ["hedgeWarden", "wisp", "wisp", "wisp", "wisp", "brambleArcher", "vineWeaver"],

    // 19 - two supports at once; this is where order starts to
    // really cost you.
    ["boar", "rootHulk", "brambleArcher", "gardenerShade", "pollenDrone"],

    // 21-24 escalate by adding, never by replacing.
    ["rootHulk", "rootHulk", "hedgeWarden", "sporePuffer", "vineWeaver", "pollenDrone"],
    ["boar", "boar", "rootHulk", "sporePuffer", "brambleArcher", "gardenerShade"],
    ["hedgeWarden", "rootHulk", "wisp", "wisp", "wisp", "wisp", "sporePuffer", "vineWeaver"],
    ["boar", "rootHulk", "brambleArcher", "sporePuffer", "gardenerShade", "pollenDrone"],

    // 26-29 - the full force.
    ["boar", "boar", "hedgeWarden", "rootHulk", "brambleArcher", "pollenDrone", "vineWeaver"],
    ["rootHulk", "hedgeWarden", "boar", "sporePuffer", "brambleArcher", "gardenerShade"],
    ["boar", "wisp", "wisp", "wisp", "wisp", "sporePuffer", "pollenDrone", "vineWeaver", "rootHulk"],
    ["boar", "hedgeWarden", "rootHulk", "brambleArcher", "sporePuffer",
     "pollenDrone", "gardenerShade", "vineWeaver"]

];

// Act III squads. Smaller than the garden's and far more
// pointed: every one of these is a question with a right answer
// (flank the warden, break line of sight on the scribe, step off
// the blade's line, kill the choir first), so the last stretch
// tests the player rather than grinding them.

const ANGEL_SQUADS = [

    // 31 - one of each idea, cheaply.
    ["cherub", "cherub", "gateWarden", "scribe"],

    // 32 - the blade arrives.
    ["cherub", "censer", "seraphBlade", "scribe"],

    // 33 - the choir, so kill order starts mattering again.
    ["gateWarden", "censer", "cherub", "choir"],

    // 34 - two questions at once.
    ["seraphBlade", "gateWarden", "scribe", "cherub", "choir"],

    // 36-39, in the storm grove, with the trees making the
    // scribe's mark genuinely survivable.
    ["censer", "censer", "cherub", "cherub", "scribe"],
    ["gateWarden", "seraphBlade", "scribe", "choir"],
    ["cherub", "cherub", "cherub", "censer", "gateWarden", "choir"],
    ["seraphBlade", "seraphBlade", "scribe", "gateWarden", "choir"]

];

// Which squad this wave fields. Boss waves never reach here, so
// the list is walked in order across the non-boss waves of each
// band, wrapping if the campaign is extended.
function squadForWave(wave) {

    const angels = wave >= WAVES.STORM_START;

    const start = angels ? WAVES.STORM_START : WAVES.GARDEN_START;
    const list = angels ? ANGEL_SQUADS : GARDEN_SQUADS;

    const bandIndex = wave - start;
    const bossesPassed = Math.floor(bandIndex / WAVES.BOSS_WAVE);

    const index = bandIndex - bossesPassed;

    return list[index % list.length];

}

// A spot inside the arena to erupt from - in cover if there is
// any, and never on top of the player.
function emergencePoint() {

    const margin = 70;

    // Bushes and hedges first: a squad coming out of the planting
    // is the whole fiction, and the garden arenas are full of it.
    const cover = (Arena.props ?? []).filter(p => p.kind === "bush");

    for (let attempt = 0; attempt < 24; attempt++) {

        let x;
        let y;

        if (cover.length > 0 && attempt < 16) {

            const p = cover[Math.floor(Math.random() * cover.length)];

            x = p.x + (Math.random() - 0.5) * 60;
            y = p.y + (Math.random() - 0.5) * 60;

        } else {

            x = margin + Math.random() * (canvas.width - margin * 2);
            y = margin + Math.random() * (canvas.height - margin * 2);

        }

        x = Math.max(margin, Math.min(canvas.width - margin, x));
        y = Math.max(margin, Math.min(canvas.height - margin, y));

        const d = Math.hypot(
            (player.x + player.size / 2) - x,
            (player.y + player.size / 2) - y
        );

        if (d >= GARDEN.EMERGE_MIN_PLAYER_DIST)
            return { x, y };

    }

    // Nowhere far enough from the player - push to the opposite
    // corner rather than giving up and erupting in their lap.
    return {
        x: player.x < canvas.width / 2 ? canvas.width - margin : margin,
        y: player.y < canvas.height / 2 ? canvas.height - margin : margin
    };

}

// The Rose Knights that hold the corners of a wave, on top of
// whatever squad it was already fielding.
//
// From the hedge maze on - which is to say from the wave after
// the Thorn Matron - every non-boss wave gets four of them, one
// per corner. This is a flat difficulty increase by design: the
// squads are unchanged, the knights are extra.
function cornerGuardsForWave(wave) {

    if (wave < WAVES.ARENA_MAZE_START)
        return [];

    return ["roseKnight", "roseKnight", "roseKnight", "roseKnight"];

}

// The four corners, inset far enough that a knight's charge
// telegraph is fully on screen before it starts moving.
function cornerPoints() {

    const m = 96;

    return [
        { x: m, y: m },
        { x: canvas.width - m, y: m },
        { x: m, y: canvas.height - m },
        { x: canvas.width - m, y: canvas.height - m }
    ];

}

// `guards` land at fixed corners rather than at emergence points
// - four knights erupting out of random bushes would read as
// more of the squad, and the whole point is that they close in
// from the edges of a fight already in progress.
function spawnSquad(types, guards = []) {

    Game.enemiesRemaining = types.length + guards.length;

    Game.eliteEligibleLeft =
        types.concat(guards).filter(t => !NO_ELITE.has(t)).length;

    const token = Game.runToken;

    const corners = cornerPoints();

    guards.forEach((type, i) => {

        const at = corners[i % corners.length];
        const size = getEnemySize(type);

        Game.spawnTelegraphs.push(new SpawnWarning(
            at.x, at.y, size, GARDEN.EMERGE_MS,
            () => {

                if (Game.runToken !== token || !isRunActive())
                    return;

                spawnEnemyAt(type, at.x - size / 2, at.y - size / 2);

            }
        ));

    });

    types.forEach(type => {

        const at = emergencePoint();
        const size = getEnemySize(type);

        // The warning marker IS the arrival window - reusing the
        // same telegraph the necromancer's skeletons and the
        // King's reinforcements already use, so an eruption reads
        // exactly like every other "something is about to appear
        // here" in the game.
        //
        // Nothing exists to be shot at until it fires, which is
        // the cleanest possible version of "you cannot delete the
        // wave before it arrives": not an invulnerable enemy, no
        // enemy.
        Game.spawnTelegraphs.push(new SpawnWarning(
            at.x, at.y, size, GARDEN.EMERGE_MS,
            () => {

                if (Game.runToken !== token || !isRunActive())
                    return;

                spawnEnemyAt(type, at.x - size / 2, at.y - size / 2);

            }
        ));

    });

    // Every telegraph is already queued, so nothing else is
    // coming - the wave is "done spawning" even though the units
    // themselves land a beat later.
    Game.waveSpawning = false;

}

// =====================================
// Act II / III Boss Waves
// =====================================

function startSoloBossWave(type) {

    Game.enemiesRemaining = 1;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemyAt(
            type,
            canvas.width / 2 - getEnemySize(type) / 2,
            canvas.height * 0.22
        );

        Game.waveSpawning = false;

    }, 400);

}

function startMatronWave() {

    startSoloBossWave("thornMatron");

}

function startGreenwardenWave() {

    startSoloBossWave("greenwarden");

}

function startHeartwoodWave() {

    // The Heartwood never moves, so it is placed dead centre -
    // the arena is the fight, and it is the middle of it.
    Game.enemiesRemaining = 1;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemyAt("heartwood", canvas.width / 2 - 65, canvas.height / 2 - 65);

        Game.waveSpawning = false;

    }, 400);

}

function startHeraldWave() {

    startSoloBossWave("herald");

}

function startNormalWave() {

    // Act II fields squads instead of streams - see spawnSquad.
    if (Game.wave >= WAVES.GARDEN_START && Game.wave < WAVES.STORM_START) {

        spawnSquad(squadForWave(Game.wave), cornerGuardsForWave(Game.wave));

        return;

    }

    // Act III and the final band keep the garden roster and add
    // the castle's back in for the recap, so the last stretch is
    // everything the run has fought.
    if (Game.wave >= WAVES.STORM_START) {

        const squad = squadForWave(Game.wave).slice();

        // The last band is the recap: castle, garden and angels
        // all at once, so the run ends against everything it has
        // taught you.
        if (Game.wave >= WAVES.ARENA_FINAL_START)
            squad.push(
                "tank", "lancer", "shade", "bloodCleric",
                "boar", "rootHulk", "pollenDrone"
            );

        spawnSquad(squad, cornerGuardsForWave(Game.wave));

        return;

    }

    const set1 = getSet1Counts();
    const set2 = getSet2Counts();
    const set3 = getSet3Counts();

    // During set-3 waves the older units keep coming, just
    // thinned out so the arena isn't overcrowded on top of
    // the new roster.
    if (Game.wave >= WAVES.SET3_START) {

        [set1, set2].forEach(set => {

            Object.keys(set).forEach(type => {

                set[type] = Math.floor(
                    set[type] * WAVES.SET3_OLD_UNIT_SCALE
                );

            });

        });

    }

    const counts = { ...set1, ...set2, ...set3 };

    Game.enemiesRemaining = Object.values(counts)
        .reduce((a, b) => a + b, 0);

    if (Game.wave >= WAVES.SET3_START)
        spawnWaveEnemiesGrouped(counts);
    else
        spawnWaveEnemies(counts);

}

// Set-3 spawner: walks SET3_SPAWN_GROUPS in order. All types
// in a group spawn concurrently (interleaved on their own
// SPAWN_GAP cadences); the next group starts after the
// current group's slowest spawner finishes, plus the usual
// transition beat. Unlisted types are folded into the last
// group.

function spawnWaveEnemiesGrouped(counts) {

    const totalCount = Object.values(counts)
        .reduce((a, b) => a + b, 0);

    if (totalCount === 0) {

        Game.waveSpawning = false;

        return;

    }

    countEliteEligible(counts);

    const token = Game.runToken;

    let pending = totalCount;

    function finishOne() {

        pending--;

        if (pending <= 0)
            Game.waveSpawning = false;

    }

    const listed = new Set(SET3_SPAWN_GROUPS.flat());

    const extras = Object.keys(counts)
        .filter(type => !listed.has(type) && counts[type] > 0);

    const groups = SET3_SPAWN_GROUPS.map((group, i) =>
        i === SET3_SPAWN_GROUPS.length - 1
            ? [...group, ...extras]
            : group
    );

    let groupStart = 0;

    groups.forEach(group => {

        let groupSpan = 0;

        group.forEach(type => {

            const count = counts[type] || 0;

            if (count === 0)
                return;

            const gap = SPAWN_GAP[type] || 400;

            for (let i = 0; i < count; i++) {

                setTimeout(() => {

                    if (Game.runToken !== token)
                        return;

                    if (isRunActive())
                        spawnEnemy(type);

                    finishOne();

                }, groupStart + i * gap);

            }

            groupSpan = Math.max(groupSpan, count * gap);

        });

        if (groupSpan > 0)
            groupStart += groupSpan + WAVES.TYPE_TRANSITION_GAP;

    });

}

function startBossWave() {

    Game.enemiesRemaining = 1 + WAVES.BOSS_ESCORT_GRUNTS;

    spawnWaveEnemies({
        boss: 1,
        tank: WAVES.BOSS_ESCORT_TANKS,
        grunt: WAVES.BOSS_ESCORT_GRUNTS
    });

}

function startKnightWave() {

    Game.enemiesRemaining = 1;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemy("knight");

        Game.waveSpawning = false;

    }, 600);

}

// =====================================
// Royal Magus (wave 15)
// =====================================
//
// The Magus walks in like the other bosses, then his honor
// guard files in behind him: a frost weaver on the left wall
// and a fire mage on the right, one pair per ESCORT_GAP ms.
// Escorts are given a `station` post (see moveTowardStation
// in enemy.js) so they walk to the wall and hold it for the
// whole fight - and since both types already cast at the
// player from any distance, holding the wall doesn't blunt
// them at all.

function startMagusWave() {

    Game.enemiesRemaining = 1 + MAGUS.ESCORT_PER_SIDE * 2;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemy("royalMagus");

    }, 600);

    for (let i = 0; i < MAGUS.ESCORT_PER_SIDE; i++) {

        const frac = (i + 1) / (MAGUS.ESCORT_PER_SIDE + 1);
        const isLast = i === MAGUS.ESCORT_PER_SIDE - 1;

        setTimeout(() => {

            if (Game.runToken !== token || !isRunActive())
                return;

            spawnMagusEscort("frostWeaver", -1, frac);
            spawnMagusEscort("fireMage", 1, frac);

            if (isLast)
                Game.waveSpawning = false;

        }, 1200 + i * MAGUS.ESCORT_GAP);

    }

}

// side -1 = left wall, +1 = right wall. Spawns just off that
// edge and stations the enemy a step inside it, at `frac` of
// the arena's height.

function spawnMagusEscort(type, side, frac) {

    const size = getEnemySize(type);

    const y = canvas.height * frac - size / 2;
    const x = side < 0 ? -size * 2 : canvas.width + size;

    const EnemyClass = ENEMY_CLASSES[type];
    const enemy = new EnemyClass(x, y);

    // Shielded by their master: untouchable while the Magus
    // lives, and they fall the instant he does (see
    // RoyalMagus.takeDamage / Enemy.takeDamage).
    enemy.magusGuard = true;
    enemy.damageImmune = true;

    // Driven harder by their master - faster casts for this
    // fight only.
    enemy.castRateScale = MAGUS.ESCORT_COOLDOWN_SCALE;

    // Stationed just inside the pillar clusters at the arena
    // edges - any closer to the wall and the foreground
    // pillars would draw over them.
    const inset = canvas.width * 0.115;

    enemy.station = {
        x: side < 0 ? inset : canvas.width - size - inset,
        y
    };

    Game.enemies.push(enemy);

}

// =====================================
// The Prince & Princess (wave 20)
// =====================================
//
// A linked pair rather than a single boss - both spawn together,
// each rolling its own random edge (see spawnEnemy()), so they
// don't stack on top of each other. The wave itself needs no
// special "both must die" handling: updateWave() already waits
// for Game.enemies to empty, and both-must-die's ONLY other job -
// gating the requiresSiblingsKilled shop tier - lives in
// onEnemyKilled (game.js).

function startSiblingsWave() {

    Game.enemiesRemaining = 2;
    Game.siblingsPhase = 1;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemy("prince");
        spawnEnemy("princess");

        Game.waveSpawning = false;

    }, 600);

}

function startKingWave() {

    Game.enemiesRemaining = 1;

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        spawnEnemy("king");

        Game.waveSpawning = false;

    }, 600);

}

// How many of this wave's scheduled spawns can roll elite -
// spawnEnemy() uses it to hand out Game.eliteBudget at exact
// odds (budget/remaining per eligible spawn).

function countEliteEligible(counts) {

    Game.eliteEligibleLeft = Object.keys(counts)
        .filter(type => !NO_ELITE.has(type))
        .reduce((sum, type) => sum + counts[type], 0);

}

function spawnWaveEnemies(counts) {

    const totalCount = Object.values(counts)
        .reduce((a, b) => a + b, 0);

    if (totalCount === 0) {

        Game.waveSpawning = false;

        return;

    }

    countEliteEligible(counts);

    // Captured at schedule time: if the run/wave is torn down
    // (menu, restart, custom wave jump) before a timer fires,
    // the stale callback must not spawn into - or touch the
    // bookkeeping of - whatever replaced it.
    const token = Game.runToken;

    let pending = totalCount;

    function finishOne() {

        pending--;

        if (pending <= 0)
            Game.waveSpawning = false;

    }

    // Grunts don't take a slot in the ordered sequence below -
    // they trickle in continuously on their own, alongside
    // whatever else is spawning in order.
    const gruntCount = counts.grunt || 0;

    const orderedTypes = getSpawnOrder()
        .filter(type => counts[type] > 0);

    // Anything not covered by the explicit order (e.g. a boss
    // wave's "boss" type) still gets spawned, just tacked on
    // after the explicitly ordered types.
    const explicit = new Set([...orderedTypes, "grunt"]);

    const remainderTypes = Object.keys(counts)
        .filter(type => !explicit.has(type) && counts[type] > 0);

    const finalOrder = [...orderedTypes, ...remainderTypes];

    // Ordered types: strictly sequential, one type finishing
    // completely before the next one starts. A small extra
    // pause (TYPE_TRANSITION_GAP) is inserted between types so
    // each one reads as its own distinct beat - e.g. tanks
    // charge in and get their entry speed boost, THEN a beat
    // later archers start taking their turn, etc.
    let delay = 0;

    finalOrder.forEach((type, index) => {

        const count = counts[type];

        const gap = SPAWN_GAP[type] || 400;

        for (let i = 0; i < count; i++) {

            const spawnTime = delay + i * gap;

            setTimeout(() => {

                if (Game.runToken !== token)
                    return;

                if (isRunActive())
                    spawnEnemy(type);

                finishOne();

            }, spawnTime);

        }

        delay += count * gap;

        if (index < finalOrder.length - 1)
            delay += WAVES.TYPE_TRANSITION_GAP;

    });

    // Grunts: spread evenly across the full span of the
    // ordered sequence above, so they keep trickling in the
    // whole time tanks/archers/runners/etc are taking their
    // turn. If nothing else is spawning this wave, fall back
    // to their own normal cadence.
    if (gruntCount > 0) {

        const gruntGap = delay > 0
            ? delay / gruntCount
            : (SPAWN_GAP.grunt || 400);

        for (let i = 0; i < gruntCount; i++) {

            const spawnTime = i * gruntGap;

            setTimeout(() => {

                if (Game.runToken !== token)
                    return;

                if (isRunActive())
                    spawnEnemy("grunt");

                finishOne();

            }, spawnTime);

        }

    }

}

function getEnemySize(type) {

    // Act II / III units all declare SIZE in one place.
    if (GARDEN[type])
        return GARDEN[type].SIZE;

    if (ANGELS[type])
        return ANGELS[type].SIZE;

    if (type === "wisp")
        return GARDEN.wispSwarm.SIZE;

    if (type === "thornMatron") return 82;
    if (type === "greenwarden") return 96;
    if (type === "heartwood") return 130;
    if (type === "herald") return 76;

    if (type === "boss")
        return BOSS.SIZE;

    if (type === "knight")
        return KNIGHT.SIZE;

    if (type === "royalMagus")
        return MAGUS.SIZE;

    if (type === "prince")
        return PRINCE.SIZE;

    if (type === "princess")
        return PRINCESS.SIZE;

    if (type === "king")
        return KING.SIZE;

    return ENEMY_TYPES[type]?.SIZE ?? 40;

}

function spawnEnemy(type = "grunt") {

    const size = getEnemySize(type);

    let x;
    let y;

    const side = Math.floor(Math.random() * 4);

    switch (side) {

        case 0:
            x = Math.random() * canvas.width;
            y = -size;
            break;

        case 1:
            x = Math.random() * canvas.width;
            y = canvas.height + size;
            break;

        case 2:
            x = -size;
            y = Math.random() * canvas.height;
            break;

        default:
            x = canvas.width + size;
            y = Math.random() * canvas.height;

    }

    return spawnEnemyAt(type, x, y);

}

// Place one enemy at an exact point, with all the elite-budget
// and boss-flourish bookkeeping spawnEnemy used to do inline.
//
// Split out because the garden squads erupt INSIDE the arena
// rather than walking in from an edge (see spawnSquad); the edge
// picker above is now just one caller of this.
function spawnEnemyAt(type, x, y) {

    const EnemyClass = ENEMY_CLASSES[type] || Grunt;
    const enemy = new EnemyClass(x, y);

    // Deterministic elite waves (see isEliteWave): exactly
    // eliteBudget elites land somewhere random among this
    // wave's eligible spawns. Giving each eligible spawn
    // budget/remaining odds distributes them uniformly while
    // guaranteeing the exact count.
    const capped =
        ELITE_CAP[type] !== undefined &&
        (Game.eliteTypeCounts?.[type] ?? 0) >= ELITE_CAP[type];

    if (!NO_ELITE.has(type) && Game.eliteBudget > 0 && !capped) {

        const odds =
            Game.eliteBudget / Math.max(1, Game.eliteEligibleLeft);

        if (Math.random() < odds) {

            makeElite(enemy);

            Game.eliteBudget--;

            Game.eliteTypeCounts ??= {};
            Game.eliteTypeCounts[type] = (Game.eliteTypeCounts[type] ?? 0) + 1;

        }

    }

    if (!NO_ELITE.has(type))
        Game.eliteEligibleLeft--;

    // A boss arriving gets an arena-appropriate flourish - a
    // lightning strike in the storm ruin, a burst of petals in the
    // rose court, and so on (see triggerArenaFlourish in
    // arena.js). Hooked here rather than in each start*Wave()
    // because every boss, in every mode, comes through this one
    // function.
    if (enemy.isBoss)
        triggerArenaFlourish();

    Game.enemies.push(enemy);

    return enemy;

}

function updateWave() {

    if (!Game.waveActive)
        return;

    // Enemies for this wave may still be scheduled via
    // setTimeout and not pushed into Game.enemies yet -
    // don't mistake that gap for "all dead already".
    if (Game.waveSpawning)
        return;

    // A necromancer/king could still have summons queued up
    // behind a red warning circle that haven't actually
    // spawned into Game.enemies yet.
    if (Game.spawnTelegraphs.length > 0)
        return;

    if (Game.enemies.length > 0)
        return;

    if (Game.waveTransition)
        return;

    Game.waveTransition = true;
    Game.waveActive = false;

    Sound.play("waveClear");

    // The breather beat: clearing a wave refunds the dash so
    // every wave starts with your mobility ready to answer.
    if (player)
        player.dashCooldowns = player.dashCooldowns.map(() => 0);

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        // Boss Rush jumps straight to the next wave that actually
        // has a boss on it, rather than adding a fixed five - see
        // nextBossWave.
        Game.wave = Game.bossRush
            ? nextBossWave(Game.wave)
            : Game.wave + 1;

        startWave();

    }, WAVES.TRANSITION_TIME);

}