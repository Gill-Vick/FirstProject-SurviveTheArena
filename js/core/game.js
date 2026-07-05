// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuBackground = new Image();
menuBackground.src = "MainMenu.png";

const playerSprite = new Image();
playerSprite.src = "Player_Knight.png";

ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

    // Who/what killed the player, shown on the game over
    // screen (e.g. "a Grunt", "the King").
    killedBy: null,

    wave: 1,

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

    // Red warning circles shown 0.5s before a summoned enemy
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

// =====================================
// Game Functions
// =====================================

function startGame() {

    Game.state = "playing";

    Game.killedBy = null;

    Game.wave = 1;

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

    player = new Player();

    generateArena();

    startWave();

}

function onEnemyKilled(enemy) {

    Game.enemiesRemaining--;

    const reward = COINS[enemy.type] ?? COINS.grunt;

    Save.addCoins(reward);

    if (enemy.type === "boss")
        Save.markFirstBossKilled();

    Game.screenShake = EFFECTS.SHAKE_ON_KILL;

}

function resetGame() {

    Game.state = "menu";

    Game.menuView = "main";

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

    return 1 + (Game.wave - 1) * 0.08;

}

// =====================================
// Update
// =====================================

function update() {

    if (Game.state !== "playing")
        return;

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
        Game.screenShake *= Math.pow(0.9, Game.timeScale);
    }

    switch (Game.state) {
        case "menu":
            drawMenu();
            break;

        case "playing":

            // 4. LIGHTING PASS: floor-only. Everything drawn
            // after this is fully opaque and unaffected by it.

            drawLightingSystem();

            Game.hazards.forEach(hazard => hazard.draw());

            Game.spawnTelegraphs.forEach(telegraph => telegraph.draw());

            player.draw();
            Game.enemies.forEach(enemy => enemy.draw());
            Game.projectiles.forEach(projectile => projectile.draw());
            Game.particles.forEach(particle => particle.draw());

            // 6. FOREGROUND OBJECT PASS: pillars occlude characters
            // that walk behind them

            drawPillars();
            drawTorches();

            // 7. UI PASS: always on top, always readable

            Game.damageNumbers.forEach(number => number.draw());
            drawHUD();
            drawWaveMessages();
            break;

        case "gameover":
            drawGameOver();
            break;
    }

    ctx.restore();
}