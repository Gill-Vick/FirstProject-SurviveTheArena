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

    particles: [],

    screenShake: 0

};

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

    Game.particles = [];

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;

    startWave();

}

function resetGame() {

    Game.state = "menu";

    Game.score = 0;

    Game.wave = 1;

    Game.waveActive = false;

    Game.waveTransition = false;

    Game.enemies = [];

    Game.particles = [];

}

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

    updatePlayer();

    updateEnemies();

    updateParticles();

    updateSword();

    updateWave();

}

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