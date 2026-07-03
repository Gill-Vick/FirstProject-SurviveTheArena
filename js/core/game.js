// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

    state: "menu",

    score: 0,

    startTime: 0,

    wave: 1,

    waveActive: false,

    waveTransition: false,

    waveMessageTimer: 0,

    enemiesRemaining: 0,

    enemySpeedMultiplier: 1,

    lastSpawn: 0,

    enemies: [],

    projectiles: [],

    particles: [],

    damageNumbers: [],

    screenShake: 0

};

// The player is created fresh each run inside
// startGame(). It doesn't exist yet on page load.

let player;

// =====================================
// Game Functions
// =====================================

function startGame() {

    Game.state = "playing";

    Game.score = 0;

    Game.startTime = Date.now();

    Game.wave = 1;

    Game.waveActive = false;

    Game.waveTransition = false;

    Game.waveMessageTimer = 0;

    Game.enemySpeedMultiplier = 1;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

    player = new Player();

    generateArena();

    startWave();

}

function resetGame() {

    Game.state = "menu";

    Game.score = 0;

    Game.wave = 1;

    Game.waveActive = false;

    Game.waveTransition = false;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

}

// =====================================
// Update
// =====================================

function update() {

    if (Game.state !== "playing")
        return;

    Game.score = (
        (Date.now() - Game.startTime) / 1000
    ).toFixed(1);

    const survivalTime =
        (Date.now() - Game.startTime) / 1000;

    Game.enemySpeedMultiplier =
        1 + survivalTime * DIFFICULTY.SPEED_SCALE;

    // Every entity updates itself now.

    player.update();

    Game.enemies.forEach(enemy => enemy.update());

    Game.projectiles.forEach(projectile => projectile.update());

    Game.particles.forEach(particle => particle.update());

    Game.damageNumbers.forEach(number => number.update());

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

    // 1. FLOOR LEVEL: Flat stone floor base

    ctx.fillStyle = "#2b2927"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. DECORATION LEVEL: Floor grid lines

    drawGrid();

    // 3. GROUND SHADOW LEVEL: Pillar shadows on the floor

    drawPillarShadows();

    ctx.save();

    // Screen shake matrix calculation

    if (Game.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * Game.screenShake;
        const shakeY = (Math.random() - 0.5) * Game.screenShake;
        ctx.translate(shakeX, shakeY);
        Game.screenShake *= 0.9;
    }

    switch (Game.state) {
        case "menu":
            drawMenu();
            break;

        case "playing":

            // 4. LIGHTING PASS: floor-only. Everything drawn
            // after this is fully opaque and unaffected by it.

            drawLightingSystem();

            // 5. ENTITIES PASS: always fully visible

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