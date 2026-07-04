// =====================================
// Wave Manager
// =====================================

const ENEMY_CLASSES = {

    grunt: Grunt,
    tank: Tank,
    spitter: Spitter,
    runner: Runner,
    boss: Boss,
    fireMage: FireMage,
    necromancer: Necromancer,
    skeleton: Skeleton,
    lancer: Lancer,
    king: King

};

const SPAWN_GAP = {

    grunt: 400,
    tank: 700,
    spitter: 600,
    runner: 500,
    boss: 500,
    fireMage: 650,
    necromancer: 800,
    lancer: 550,
    king: 500

};

const NO_ELITE = new Set([
    "boss", "king", "skeleton"
]);

function startWave() {

    Game.waveActive = true;
    Game.waveSpawning = true;
    Game.waveTransition = false;
    Game.waveMessageTimer = 120;

    updateArenaForWave();

    if (Game.wave === WAVES.KING_WAVE) {

        startKingWave();

        return;

    }

    if (Game.wave === WAVES.BOSS_WAVE) {

        startBossWave();

        return;

    }

    startNormalWave();

}

function getSet1Counts() {

    const w = Game.wave;
    const scale =
        w > WAVES.SET1_END ? WAVES.SET1_SCALE_AFTER : 1;

    const gruntCount = Math.max(
        1,
        Math.floor(
            (WAVES.START_GRUNTS + w * WAVES.GRUNTS_PER_WAVE) * scale
        )
    );

    const tankCount = Math.floor(
        (Math.floor(w / WAVES.TANK_EVERY)) * scale
    );

    const spitterCount = Math.floor(
        (w >= WAVES.SPITTER_UNLOCK_WAVE
            ? Math.floor(w / WAVES.SPITTER_EVERY)
            : 0) * scale
    );

    const runnerCount =
        w >= WAVES.RUNNER_UNLOCK_WAVE
            ? Math.floor(w / WAVES.RUNNER_EVERY)
            : 0;

    return { grunt: gruntCount, tank: tankCount, spitter: spitterCount, runner: runnerCount };

}

function getSet2Counts() {

    if (Game.wave < WAVES.SET2_START)
        return { fireMage: 0, necromancer: 0, lancer: 0 };

    const tier = Game.wave - WAVES.SET2_START + 1;

    return {
        fireMage: 1 + tier,
        necromancer: Math.max(1, Math.floor(tier / 2)),
        lancer: 1 + Math.floor(tier * 0.8)
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
        grunt: WAVES.BOSS_ESCORT_GRUNTS
    });

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

    let delay = 0;

    let pending = Object.values(counts)
        .reduce((a, b) => a + b, 0);

    if (pending === 0) {

        Game.waveSpawning = false;

        return;

    }

    Object.keys(counts).forEach(type => {

        const count = counts[type];

        if (!count)
            return;

        const gap = SPAWN_GAP[type] || 400;

        for (let i = 0; i < count; i++) {

            const spawnTime = delay + i * gap;

            setTimeout(() => {

                if (Game.state === "playing")
                    spawnEnemy(type);

                pending--;

                if (pending <= 0)
                    Game.waveSpawning = false;

            }, spawnTime);

        }

        delay += count * gap;

    });

}

function getEnemySize(type) {

    if (type === "boss")
        return BOSS.SIZE;

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