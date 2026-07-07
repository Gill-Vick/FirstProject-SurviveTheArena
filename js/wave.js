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
    knight: 500,
    king: 500

};

const NO_ELITE = new Set([
    "boss", "knight", "king"
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

function getSpawnOrder() {

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

    if (Game.wave === WAVES.BOSS_WAVE) {

        startBossWave();

        return;

    }

    if (Game.wave === WAVES.KNIGHT_WAVE) {

        startKnightWave();

        return;

    }

    if (Game.wave === WAVES.KING_WAVE) {

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

function startNormalWave() {

    const set1 = getSet1Counts();
    const set2 = getSet2Counts();

    const counts = { ...set1, ...set2 };

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

    setTimeout(() => {

        if (Game.state !== "playing")
            return;

        spawnEnemy("knight");

        Game.waveSpawning = false;

    }, 600);

}

function startKingWave() {

    Game.enemiesRemaining = 1;

    setTimeout(() => {

        if (Game.state !== "playing")
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

                if (Game.state === "playing")
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

                if (Game.state === "playing")
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

    setTimeout(() => {

        if (Game.state !== "playing")
            return;

        Game.wave++;

        startWave();

    }, WAVES.TRANSITION_TIME);

}