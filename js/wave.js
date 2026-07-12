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
    king: King

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
    king: 500

};

// An elite 1-HP bomb is just noise, so kegs stay normal.
const NO_ELITE = new Set([
    "boss", "knight", "king", "powderKeg"
]);

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

// Clerics arrive right behind the tanks they want to heal;
// kegs trickle in late, during the chaos.
const WAVE_ORDER_SET3 = [
    "tank", "bloodCleric", "frostWeaver", "necromancer",
    "fireMage", "shade", "lancer", "powderKeg",
    "runner", "archer"
];

function getSpawnOrder() {

    if (Game.wave >= WAVES.SET3_START)
        return WAVE_ORDER_SET3;

    return Game.wave >= WAVES.SET2_START
        ? WAVE_ORDER_SET2
        : WAVE_ORDER_SET1;

}

function startWave() {

    Game.waveActive = true;
    Game.waveSpawning = true;
    Game.waveTransition = false;
    Game.waveMessageTimer = 120;

    updateArenaForWave();

    // Boss Rush skips straight from one boss fight to the
    // next (Game.wave goes 5, 10, 15, 20, ...) - fold it back
    // onto the same 1-15 cycle Campaign uses so it keeps
    // landing on BOSS_WAVE/KNIGHT_WAVE/KING_WAVE and just
    // repeats (with HP still scaling off the real Game.wave).
    const cycleWave = Game.bossRush
        ? ((Game.wave - 1) % WAVES.KING_WAVE) + 1
        : Game.wave;

    if (cycleWave === WAVES.BOSS_WAVE) {

        startBossWave();

        return;

    }

    if (cycleWave === WAVES.KNIGHT_WAVE) {

        startKnightWave();

        return;

    }

    if (cycleWave === WAVES.KING_WAVE) {

        startKingWave();

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
// wave-14 row (wave 15 is the King anyway).

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

function startNormalWave() {

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

    spawnWaveEnemies(counts);

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

function spawnWaveEnemies(counts) {

    const totalCount = Object.values(counts)
        .reduce((a, b) => a + b, 0);

    if (totalCount === 0) {

        Game.waveSpawning = false;

        return;

    }

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

    if (type === "boss")
        return BOSS.SIZE;

    if (type === "knight")
        return KNIGHT.SIZE;

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

    const EnemyClass = ENEMY_CLASSES[type] || Grunt;
    const enemy = new EnemyClass(x, y);

    if (

        !NO_ELITE.has(type) &&
        Game.wave >= ELITE.UNLOCK_WAVE &&
        Math.random() < ELITE.CHANCE

    ) {

        makeElite(enemy);

    }

    Game.enemies.push(enemy);

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

    const token = Game.runToken;

    setTimeout(() => {

        if (Game.runToken !== token || !isRunActive())
            return;

        // Boss Rush jumps a full 5-wave cycle at a time so the
        // next wave lands on the next boss instead of a filler
        // wave.
        Game.wave += Game.bossRush ? WAVES.BOSS_WAVE : 1;

        startWave();

    }, WAVES.TRANSITION_TIME);

}