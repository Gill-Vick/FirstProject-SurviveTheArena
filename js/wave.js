// =====================================
// Wave Manager
// =====================================

function startWave() {

    Game.waveActive = true;

    Game.waveTransition = false;

    Game.waveMessageTimer = 120;

    const gruntCount =
        WAVES.START_GRUNTS +
        Game.wave * WAVES.GRUNTS_PER_WAVE;

    const tankCount =
        Math.floor(Game.wave / WAVES.TANK_EVERY);

    Game.enemiesRemaining =
        gruntCount + tankCount;

    spawnWaveEnemies(
        gruntCount,
        tankCount
    );

}

// =====================================
// Spawn Wave
// =====================================

function spawnWaveEnemies(
    gruntCount,
    tankCount
) {

    // Spawn Grunts

    for (let i = 0; i < gruntCount; i++) {

        setTimeout(() => {

            if (Game.state === "playing") {

                spawnEnemy("grunt");

            }

        }, i * 400);

    }

    // Spawn Tanks

    for (let i = 0; i < tankCount; i++) {

        setTimeout(() => {

            if (Game.state === "playing") {

                spawnEnemy("tank");

            }

        },
        gruntCount * 400 + i * 700);

    }

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