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

    state: "menu",

    menuView: "main",

    bestiarySelected: null,

    shopCritDragging: false,

    shopLocketDragging: false,

    // Which staged item's stage picker is being dragged
    // (item id string), or null. See handleMenuMouseDown.
    shopStageDragging: null,

    // Armoury list scroll offset in logical px (0 = top).
    // Driven by the mouse wheel / touch drag in input.js.
    armouryScroll: 0,

    // Bestiary page: 0 = the creatures grid, 1..N = one
    // dedicated page per boss (see BESTIARY_BOSS_ORDER).
    bestiaryPage: 0,

    // Who/what killed the player, shown on the game over
    // screen (e.g. "a Grunt", "the King").
    killedBy: null,

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

    enemySpeedMultiplier: 1,

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

        ctx.save();

        ctx.strokeStyle = `rgba(255, 30, 30, ${pulse + 0.25})`;
        ctx.fillStyle = `rgba(255, 30, 30, ${pulse * 0.35})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();

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

    Game.wave = Game.bossRush ? WAVES.BOSS_WAVE : 1;

    Game.elapsedTime = 0;

    Game.waveActive = false;

    Game.waveSpawning = false;

    Game.waveTransition = false;

    Game.waveMessageTimer = 0;

    Game.enemySpeedMultiplier = 1;

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

function onEnemyKilled(enemy) {

    // One credit per corpse. Two damage sources can both see
    // the same enemy dead in a single frame (e.g. an AoE that
    // kills the Royal Magus, whose death then fells his guard
    // mid-loop) - the second call must not double-count.
    if (enemy.killCredited)
        return;

    enemy.killCredited = true;

    Game.enemiesRemaining--;

    const reward = COINS[enemy.type] ?? COINS.grunt;

    Save.addCoins(reward);

    if (enemy.type === "boss")
        Save.markFirstBossKilled();

    if (enemy.type === "knight")
        Save.markKnightKilled();

    if (enemy.type === "king")
        Save.markKingKilled();

    Save.markBestiaryKill(enemy.type);

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

    Game.menuView = "main";

    Game.mode = "campaign";

    Game.immortal = false;

    Game.runToken++;

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

    // No more wave-over-wave speed scaling - it's a flat
    // multiplier now, just nudged up 20% over the old
    // wave-1 baseline so combat still feels lively without
    // enemies snowballing into an unfair speed race by the
    // late waves.
    return 1.2;

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
    }

    ctx.restore();
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

    // 7. UI PASS: always on top, always readable

    Game.damageNumbers.forEach(number => number.draw());
    drawHUD();
    drawWaveMessages();

}