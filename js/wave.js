// =====================================
// Enemy Registry
// =====================================
//
// Adding a future enemy is:
//
//   1. Create entities/<name>.js
//   2. Add <name>: <ClassName> below
//   3. Add a <script> tag in index.html
//
// No other file needs to change.

const ENEMY_CLASSES = {

    grunt: Grunt,

    tank: Tank,

    spitter: Spitter,

    runner: Runner,

    boss: Boss

};

// =====================================
// Wave Manager
// =====================================

function startWave() {

    Game.waveActive = true;

    Game.waveTransition = false;

    Game.waveMessageTimer = 120;

    if (Game.wave % WAVES.BOSS_EVERY === 0) {

        startBossWave();

        return;

    }

    startNormalWave();

}

// =====================================
// Normal Wave
// =====================================

function startNormalWave() {

    const gruntCount =
        WAVES.START_GRUNTS +
        Game.wave * WAVES.GRUNTS_PER_WAVE;

    const tankCount =
        Math.floor(Game.wave / WAVES.TANK_EVERY);

    const spitterCount =
        Game.wave >= WAVES.SPITTER_UNLOCK_WAVE
            ? Math.floor(Game.wave / WAVES.SPITTER_EVERY)
            : 0;

    const runnerCount =
        Game.wave >= WAVES.RUNNER_UNLOCK_WAVE
            ? Math.floor(Game.wave / WAVES.RUNNER_EVERY)
            : 0;

    Game.enemiesRemaining =
        gruntCount +
        tankCount +
        spitterCount +
        runnerCount;

    spawnWaveEnemies({

        grunt: gruntCount,
        tank: tankCount,
        spitter: spitterCount,
        runner: runnerCount

    });

}

// =====================================
// Boss Wave
// =====================================

function startBossWave() {

    Game.enemiesRemaining =
        1 + WAVES.BOSS_ESCORT_GRUNTS;

    spawnWaveEnemies({

        boss: 1,
        grunt: WAVES.BOSS_ESCORT_GRUNTS

    });

}

// =====================================
// Spawn Wave
// =====================================
//
// Takes a { type: count } map and staggers
// spawns so the arena doesn't fill instantly.
// Each type gets its own gap between spawns,
// and groups are queued one after another.

const SPAWN_GAP = {

    grunt: 400,
    tank: 700,
    spitter: 600,
    runner: 500,
    boss: 500

};

function spawnWaveEnemies(counts) {

    let delay = 0;

    Object.keys(counts).forEach(type => {

        const count = counts[type];

        const gap = SPAWN_GAP[type] || 400;

        for (let i = 0; i < count; i++) {

            const spawnTime = delay + i * gap;

            setTimeout(() => {

                if (Game.state === "playing") {

                    spawnEnemy(type);

                }

            }, spawnTime);

        }

        delay += count * gap;

    });

}

// =====================================
// Spawn Enemy
// =====================================

function spawnEnemy(type = "grunt") {

    const size =
        type === "boss"
            ? BOSS.SIZE
            : ENEMY_TYPES[type].SIZE;

    let x;
    let y;

    const side =
        Math.floor(Math.random() * 4);

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

    const EnemyClass =
        ENEMY_CLASSES[type] || Grunt;

    const enemy = new EnemyClass(x, y);

    // Bosses are already special - only regular
    // enemies can roll as elite.

    if (

        type !== "boss" &&
        Game.wave >= ELITE.UNLOCK_WAVE &&
        Math.random() < ELITE.CHANCE

    ) {

        makeElite(enemy);

    }

    Game.enemies.push(enemy);

}

// =====================================
// Update Wave
// =====================================

function updateWave() {

    if (!Game.waveActive)
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