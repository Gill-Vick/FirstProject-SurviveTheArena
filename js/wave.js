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
    royalMagus: 500,
    king: 500

};

// An elite 1-HP bomb is just noise, so kegs stay normal.
const NO_ELITE = new Set([
    "boss", "knight", "royalMagus", "king", "powderKeg"
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
    Game.waveMessageTimer = 120;

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
    // (Game.wave goes 5, 10, 15, 20, ...); Endless plays every
    // wave but wants the bosses to recur too. Both fold onto the
    // same 1-20 cycle Campaign uses so they keep landing on
    // BOSS_WAVE/KNIGHT_WAVE/MAGUS_WAVE/KING_WAVE (with HP still
    // scaling off the real Game.wave). Campaign uses the wave
    // as-is, so it stops having bosses after the King at 20.
    const cycleWave = (Game.bossRush || Game.mode === "endless")
        ? ((Game.wave - 1) % WAVES.KING_WAVE) + 1
        : Game.wave;

    const bossWaves = [
        WAVES.BOSS_WAVE, WAVES.KNIGHT_WAVE,
        WAVES.MAGUS_WAVE, WAVES.KING_WAVE
    ];

    Sound.play(bossWaves.includes(cycleWave) ? "bossSpawn" : "waveStart");

    if (cycleWave === WAVES.BOSS_WAVE) {

        startBossWave();

        return;

    }

    if (cycleWave === WAVES.KNIGHT_WAVE) {

        startKnightWave();

        return;

    }

    if (cycleWave === WAVES.MAGUS_WAVE) {

        startMagusWave();

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

    if (type === "royalMagus")
        return MAGUS.SIZE;

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

    const eliteChance =
        Game.mode === "endless" ? ENDLESS.ELITE_CHANCE : ELITE.CHANCE;

    if (

        !NO_ELITE.has(type) &&
        Game.wave >= ELITE.UNLOCK_WAVE &&
        Math.random() < eliteChance

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

    Sound.play("waveClear");

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