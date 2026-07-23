// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuBackground = new Image();
menuBackground.src = "MainMenu.png";

const playerSprite = new Image();
playerSprite.src = "Player_Knight.png";

// =====================================
// Canvas Resolution
// =====================================
//
// Desktop: the canvas's logical resolution simply matches the
// window, 1:1.
//
// Touch devices: every entity (player, enemies, projectiles,
// hazards) is sized/moved in absolute logical pixels, so if
// the canvas resolution matched a phone's small viewport the
// entities would tower over the screen (a 40px player is ~4%
// of a desktop window's height but ~10% of a phone's). Fix:
// render at a fixed logical HEIGHT (with the width derived
// from the screen's real aspect ratio so nothing distorts)
// and stretch the canvas to the screen with CSS. Entities
// then occupy the same fraction of the screen as on a 720px
// desktop window, and getCanvasCoords() in input.js already
// maps clicks/taps between CSS size and logical resolution.
// The UI never notices - all of ui.js is laid out in
// percentages of canvas.width/height.

const MOBILE_LOGICAL_HEIGHT = 720;

function syncCanvasResolution() {

    const touch =
        ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

    if (touch) {

        const aspect = window.innerWidth / window.innerHeight;

        canvas.height = MOBILE_LOGICAL_HEIGHT;
        canvas.width = Math.round(MOBILE_LOGICAL_HEIGHT * aspect);

        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";

    } else {

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        canvas.style.width = "";
        canvas.style.height = "";

    }

    // Assigning canvas.width/height resets the 2d context's
    // state, including imageSmoothingEnabled - re-disable it
    // here (after sizing) so the pixel-art sprites stay crisp.
    ctx.imageSmoothingEnabled = false;

}

syncCanvasResolution();

// =====================================
// Main Game Object
// =====================================
//
// Game no longer stores raw enemy/particle
// data - it stores instances of classes that
// know how to update and draw themselves.

const Game = {

    // Real elapsed ms since last frame, and that same
    // duration expressed as "how many 60fps frames" -
    // set once per loop in main.js. See main.js for why.
    dt: 1000 / 60,
    timeScale: 1,

    // Remaining hit-stop freeze, in REAL ms - ticked down by
    // the raw frame delta in main.js (it must not scale
    // itself to zero). While positive, dt/timeScale are 0.
    hitStopTimer: 0,

    // True between the fatal hit and the game over screen -
    // the sim keeps running in slow motion so the killing
    // blow is actually seen. dyingTimer is REAL ms remaining;
    // finishPlayerDeath() (below) fires when it runs out.
    dying: false,
    dyingTimer: 0,

    state: "menu",

    menuView: "main",

    bestiarySelected: null,

    shopCritDragging: false,

    shopLocketDragging: false,

    // Which staged item's stage picker is being dragged
    // (item id string), or null. See handleMenuMouseDown.
    shopStageDragging: null,

    // Which pause-menu volume slider is being dragged (a Save
    // key: "masterVolume" | "sfxVolume" | "musicVolume"), or
    // null. See handlePauseMenuClick.
    volumeDragging: null,

    // Armoury list scroll offset in logical px (0 = top).
    // Driven by the mouse wheel / touch drag in input.js.
    armouryScroll: 0,

    // Bestiary page: 0 = the creatures grid, 1..N = one
    // dedicated page per boss (see BESTIARY_BOSS_ORDER).
    bestiaryPage: 0,

    // Who/what killed the player, shown on the game over
    // screen (e.g. "a Grunt", "the King").
    killedBy: null,

    // True when the run that just ended set a new Endless/Boss
    // Rush high score - read by the game-over screen.
    newBest: false,

    wave: 1,

    // Which mode the current/next run is playing:
    // "campaign" | "bossRush" | "custom". Custom plays like
    // campaign but unlocks the pause menu's cheats (wave
    // jumping, immortality).
    mode: "campaign",

    // True when the current/next run is Boss Rush mode -
    // waves jump straight from one boss fight to the next
    // (5, 10, 15, 20, ...) instead of playing the filler
    // waves in between. See startWave()/updateWave() in
    // wave.js.
    bossRush: false,

    // Custom-mode cheat: player.takeHit() is a no-op while
    // set. Toggled from the pause menu.
    immortal: false,

    // Bumped whenever the run's timeline is invalidated
    // (new run, back to menu, custom wave jump). Every
    // setTimeout-scheduled spawn captures the token at
    // schedule time and bails if it changed by fire time, so
    // stale spawns can't leak into a different run/wave.
    runToken: 0,

    // Real elapsed ms since the current run started (startGame()),
    // ticked up in update() using Game.dt - pauses with the
    // game, unlike Date.now().
    elapsedTime: 0,

    waveActive: false,

    // True from the moment a wave starts until every one
    // of its enemies has actually been pushed into
    // Game.enemies. Spawns are scheduled with setTimeout
    // (even a "0ms" one is asynchronous), so there's a
    // window right after starting a wave where enemies
    // list is still empty. updateWave() must not treat
    // that as "wave complete" - see wave.js.
    waveSpawning: false,

    waveTransition: false,

    waveMessageTimer: 0,

    enemiesRemaining: 0,

    // Coins earned in the current wave (wave-clear banner
    // tally) - reset by startWave.
    waveCoins: 0,

    // Deterministic elite-wave bookkeeping - set by startWave
    // / the spawners in wave.js, spent by spawnEnemy.
    eliteBudget: 0,
    eliteEligibleLeft: 0,

    enemySpeedMultiplier: 1,

    // Flat HP multiplier applied to every enemy at spawn (see
    // Enemy constructor). 1 in every mode except Endless, where
    // startWave ramps it up past wave 20.
    enemyHpMultiplier: 1,

    lastSpawn: 0,

    enemies: [],

    projectiles: [],

    particles: [],

    damageNumbers: [],

    hazards: [],

    // Red warning circles shown ~0.7s before a summoned enemy
    // (necromancer skeletons, king reinforcements) actually
    // appears - see SpawnWarning below.
    spawnTelegraphs: [],

    screenShake: 0

};

// =====================================
// Spawn Warning
// =====================================
//
// A pulsing red circle that sits at a future spawn point for
// `delay` ms, then calls onSpawn() once and removes itself.
// Used so summoned enemies (necromancer skeletons, king
// reinforcements) can't just appear directly on top of the
// player with no way to react.

class SpawnWarning {

    constructor(x, y, radius, delay, onSpawn) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.timer = delay;
        this.onSpawn = onSpawn;
        this.triggered = false;

        // The warning circle is also the audio telegraph for
        // whatever is about to appear (minGap in the catalog
        // keeps a necromancer pack from stacking the sting).
        Sound.playAt("summon", x, y);

    }

    update() {

        if (this.triggered)
            return;

        this.timer -= Game.dt;

        if (this.timer <= 0) {

            this.triggered = true;
            this.onSpawn();

        }

    }

    isDead() {

        return this.triggered;

    }

    draw() {

        const pulse = 0.4 + Math.sin(Date.now() / 60) * 0.2;

        // Pulsing red pixel warning where a summon will appear.
        drawPixelZone(this.x, this.y, this.radius, {
            fill: "#ff1e1e",
            rim: "#ff1e1e",
            fillAlpha: pulse * 0.35,
            rimAlpha: pulse + 0.25,
            glow: 8,
            glowColor: "#ff1e1e"
        });

    }

}

// The player is created fresh each run inside
// startGame(). It doesn't exist yet on page load.

let player;

// Constructor registry for playable classes, keyed by the
// ids in CLASSES (constants.js). Each class file
// (entities/warrior.js, entities/ranger.js) registers
// itself here when it loads.

const PLAYER_CLASSES = {};

// =====================================
// Game Functions
// =====================================

function startGame(mode = "campaign") {

    Game.state = "playing";

    Game.mode = mode;

    Game.bossRush = mode === "bossRush";

    Game.immortal = false;

    Game.runToken++;

    Game.killedBy = null;

    Game.newBest = false;

    Game.hitStopTimer = 0;

    Game.dying = false;

    Game.dyingTimer = 0;

    Game.wave = Game.bossRush ? WAVES.BOSS_WAVE : 1;

    Game.elapsedTime = 0;

    Game.waveActive = false;

    Game.waveSpawning = false;

    Game.waveTransition = false;

    Game.waveMessageTimer = 0;

    Game.enemySpeedMultiplier = 1;

    Game.enemyHpMultiplier = 1;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

    Game.hazards = [];

    Game.spawnTelegraphs = [];

    // Whichever class the Armoury last showed is the class
    // this run plays as (see Save.selectedClass).
    const PlayerClass =
        PLAYER_CLASSES[Save.selectedClass] ?? PLAYER_CLASSES.warrior;

    player = new PlayerClass();

    generateArena();

    startWave();

}

// =====================================
// Hit-Stop / Death Slow-Mo
// =====================================
//
// Both bend time for the entire sim; the actual dt/timeScale
// enforcement lives in main.js, where the raw (unscaled)
// frame delta is available to tick these timers.

function applyHitStop(ms) {

    // Max, not sum - a multi-target swing lands one beat, not
    // a stutter per enemy hit.
    Game.hitStopTimer = Math.max(Game.hitStopTimer, ms);

}

// The fatal hit only STARTS the death (see Player.takeHit) -
// this runs when the slow-mo window ends and actually rolls
// the game over screen.

function finishPlayerDeath() {

    Game.dying = false;
    Game.dyingTimer = 0;

    Game.state = "gameover";

    // Log the run's distance for the score modes (no-op in
    // Campaign/Custom); remember if it was a new record.
    Game.newBest = Save.recordRunWave(Game.mode, Game.wave);

}

function onEnemyKilled(enemy) {

    // One credit per corpse. Two damage sources can both see
    // the same enemy dead in a single frame (e.g. an AoE that
    // kills the Royal Magus, whose death then fells his guard
    // mid-loop) - the second call must not double-count.
    if (enemy.killCredited)
        return;

    enemy.killCredited = true;

    Game.enemiesRemaining--;

    // Bosses go down with a slam; everything else with the
    // stock death blip. (No coin chime here on purpose - one
    // per kill turned into constant jingling, and the death
    // sound already marks the payout moment.)
    Sound.playAt(
        enemy.isBoss ? "bossSlam" : "enemyDeath",
        enemy.x + enemy.size / 2,
        enemy.y + enemy.size / 2
    );

    // Death pop: a burst of the enemy's own color plus an
    // expanding ring, so kills read as an event instead of a
    // disappearance. Bosses also get the big hit-stop beat,
    // whatever weapon landed the kill.
    Particle.createDeathBurst(enemy);

    if (enemy.isBoss)
        applyHitStop(HITSTOP.BOSS_KILL_MS);

    const reward = COINS[enemy.type] ?? COINS.grunt;

    Save.addCoins(reward);

    Game.waveCoins += reward;

    if (enemy.type === "boss")
        Save.markFirstBossKilled();

    if (enemy.type === "knight")
        Save.markKnightKilled();

    if (enemy.type === "royalMagus")
        Save.markMagusKilled();

    if (enemy.type === "king") {

        Save.markKingKilled();

        // Beating the King clears Campaign - roll the Victory
        // screen. Boss Rush loops and Endless never ends, so
        // they just carry on. (Custom is a sandbox, no win.)
        if (Game.mode === "campaign")
            Game.state = "victory";

    }

    // Elites have their own bestiary page (they play nothing
    // like their base form), so they unlock separately -
    // killing a plain Grunt never reveals the Elite Grunt.
    Save.markBestiaryKill(
        enemy.isElite
            ? eliteBestiaryKey(enemy.type)
            : enemy.type
    );

    Game.screenShake = EFFECTS.SHAKE_ON_KILL;

}

// True while a run exists on screen - playing OR paused.
// setTimeout-scheduled spawns use this instead of checking
// for "playing" directly, so pausing doesn't swallow enemies
// whose spawn timers fire mid-pause (they spawn frozen).

function isRunActive() {

    return Game.state === "playing" || Game.state === "paused";

}

function togglePause() {

    if (Game.state === "playing")
        Game.state = "paused";

    else if (Game.state === "paused")
        Game.state = "playing";

    // Music dims while paused instead of stopping - see
    // AUDIO.PAUSE_DUCK.
    Sound.setPaused(Game.state === "paused");

}

// Custom-mode cheat: tear down the current wave completely
// and restart at `targetWave`. The runToken bump strands any
// spawns the old wave still had scheduled.

function jumpToWave(targetWave) {

    Game.runToken++;

    Game.wave = Math.max(1, targetWave);

    Game.enemies = [];
    Game.projectiles = [];
    Game.hazards = [];
    Game.spawnTelegraphs = [];
    Game.damageNumbers = [];

    Game.waveActive = false;
    Game.waveSpawning = false;
    Game.waveTransition = false;
    Game.enemiesRemaining = 0;

    startWave();

}

function resetGame() {

    Game.state = "menu";

    // Quitting straight out of a paused run would otherwise
    // leave the menu music ducked.
    Sound.setPaused(false);

    Game.menuView = "main";

    Game.mode = "campaign";

    Game.immortal = false;

    Game.runToken++;

    Game.hitStopTimer = 0;

    Game.dying = false;

    Game.dyingTimer = 0;

    Game.bestiarySelected = null;

    Game.bestiaryPage = 0;

    Game.armouryScroll = 0;

    Game.shopCritDragging = false;

    Game.bossRush = false;

    Game.wave = 1;

    Game.waveActive = false;

    Game.waveSpawning = false;

    Game.waveTransition = false;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

    Game.hazards = [];

    Game.spawnTelegraphs = [];

}

function getWaveSpeedMultiplier() {

    // Flat 1.2 over the old wave-1 baseline for every mode -
    // except Endless, where enemies speed up a little each wave
    // past the King (wave 20), capped so it never becomes an
    // unplayable race.
    let mult = 1.2;

    if (Game.mode === "endless" && Game.wave > ENDLESS.RAMP_START) {

        mult = Math.min(
            ENDLESS.SPEED_MAX,
            mult + (Game.wave - ENDLESS.RAMP_START) * ENDLESS.SPEED_PER_WAVE
        );

    }

    return mult;

}

// =====================================
// Update
// =====================================

function update() {

    if (Game.state !== "playing")
        return;

    Game.elapsedTime += Game.dt;

    Game.enemySpeedMultiplier = getWaveSpeedMultiplier();

    // Every entity updates itself now.

    player.update();

    Game.enemies.forEach(enemy => enemy.update());

    Game.projectiles.forEach(projectile => projectile.update());

    Game.particles.forEach(particle => particle.update());

    Game.damageNumbers.forEach(number => number.update());

    Game.hazards.forEach(hazard => hazard.update());

    Game.spawnTelegraphs.forEach(telegraph => telegraph.update());

    cleanupEntities();

    updateWave();

}

// =====================================
// Cleanup
// =====================================
//
// Dead entities are removed here, once per
// frame, after everything has updated. This
// replaces the old splice-during-forEach
// pattern that could skip entities.

function cleanupEntities() {

    Game.enemies =
        Game.enemies.filter(enemy => !enemy.isDead());

    Game.projectiles =
        Game.projectiles.filter(projectile => !projectile.isDead());

    Game.particles =
        Game.particles.filter(
            particle => !particle.isDead()
        );

    Game.damageNumbers =
        Game.damageNumbers.filter(
            number => !number.isDead()
        );

    Game.hazards =
        Game.hazards.filter(
            hazard => !hazard.isDead()
        );

    Game.spawnTelegraphs =
        Game.spawnTelegraphs.filter(
            telegraph => !telegraph.isDead()
        );

}

// =====================================
// Draw
// =====================================
//
// IMPORTANT ORDERING FIX:
//
// drawLightingSystem() used to run AFTER
// entities were drawn, meaning the dark
// overlay + light glow painted directly on
// top of the player/enemies - dimming and
// washing them out. It's now drawn BEFORE
// entities, so it only tints the floor.
// Entities render fully opaque on top and
// stay readable no matter how dramatic the
// lighting gets. Pillars still draw AFTER
// entities so they keep occluding characters
// that walk behind them.

function draw() {

    // The bestiary's notes field is an HTML overlay, so it has
    // to be told when its page is no longer on screen. Cleared
    // here and re-set by the page's own draw, then synced at
    // the end of the frame - whatever the state does in
    // between.
    clearBestiaryNotesArea();

    // 1. FLOOR

    drawArenaFloor();

    // 2. DECORATION

    drawGrid();

    // 3. GROUND SHADOWS

    drawPillarShadows();

    ctx.save();

    // Screen shake matrix calculation

    if (Game.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * Game.screenShake;
        const shakeY = (Math.random() - 0.5) * Game.screenShake;
        ctx.translate(shakeX, shakeY);
        // Exponential decay via Math.pow so the shake dies
        // out at the same real-world rate regardless of fps.
        Game.screenShake *= Math.pow(0.93, Game.timeScale);
    }

    switch (Game.state) {
        case "menu":
            drawMenu();
            break;

        case "playing":
            drawPlayingScene();
            break;

        case "paused":

            // The frozen scene stays visible under the menu.
            drawPlayingScene();
            drawPauseMenu();
            break;

        case "gameover":
            drawGameOver();
            break;

        case "victory":
            drawVictory();
            break;
    }

    ctx.restore();

    syncBestiaryNotesField();
}

function drawPlayingScene() {

    // 4. LIGHTING PASS: floor-only. Everything drawn
    // after this is fully opaque and unaffected by it.

    drawLightingSystem();

    Game.hazards.forEach(hazard => hazard.draw());

    Game.spawnTelegraphs.forEach(telegraph => telegraph.draw());

    player.draw();
    Game.enemies.forEach(enemy => enemy.draw());
    Game.projectiles.forEach(projectile => projectile.draw());
    Game.particles.forEach(particle => particle.draw());

    // 5.5 NIGHT VEIL (night arena only): darkness drawn over
    // entities with holes around the torches, so characters
    // fade into the dark away from the light.

    drawNightVeil();

    // 6. FOREGROUND OBJECT PASS: pillars occlude characters
    // that walk behind them

    drawPillars();
    drawTorches();

    // 6.5 X-RAY PASS: entities hidden behind a pillar are shown
    // as a colored outline over it (red enemies / blue player)
    // so nothing can hide or ambush from behind a column.

    drawOccludedOutlines();

    // 7. UI PASS: always on top, always readable

    Game.damageNumbers.forEach(number => number.draw());
    drawHUD();
    drawWaveMessages();

}