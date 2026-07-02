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

    player = new Player();

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
        Game.particles.filter(particle => !particle.isDead());

}

// =====================================
// Draw
// =====================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawGrid();

    ctx.save();

    if (Game.screenShake > 0) {

        const shakeX =
            (Math.random() - 0.5) *
            Game.screenShake;

        const shakeY =
            (Math.random() - 0.5) *
            Game.screenShake;

        ctx.translate(shakeX, shakeY);

        Game.screenShake *= 0.9;

    }

    switch (Game.state) {

        case "menu":

            drawMenu();

            break;

        case "playing":

            drawGame();

            break;

        case "gameover":

            drawGameOver();

            break;

    }

    ctx.restore();

}