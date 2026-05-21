const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =====================================
// Game State
// =====================================

let gameOver = false;

// =====================================
// Player
// =====================================

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 5,
    color: "lime"
};

// =====================================
// Enemies
// =====================================

const enemies = [];

// Spawn enemy every second

setInterval(() => {

    if (!gameOver) {
        spawnEnemy();
    }

}, 1000);

function spawnEnemy() {

    let x;
    let y;

    const size = 40;

    // Random side spawning

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        // Top
        x = Math.random() * canvas.width;
        y = -size;
    }

    else if (side === 1) {
        // Bottom
        x = Math.random() * canvas.width;
        y = canvas.height + size;
    }

    else if (side === 2) {
        // Left
        x = -size;
        y = Math.random() * canvas.height;
    }

    else {
        // Right
        x = canvas.width + size;
        y = Math.random() * canvas.height;
    }

    enemies.push({
        x,
        y,
        size,
        speed: 2,
        color: "red"
    });
}

// =====================================
// Keyboard Input
// =====================================

const keys = {};

window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// =====================================
// Update
// =====================================

function update() {

    if (gameOver) {
        return;
    }

    // =========================
    // Player Movement
    // =========================

    if (keys["w"]) {
        player.y -= player.speed;
    }

    if (keys["s"]) {
        player.y += player.speed;
    }

    if (keys["a"]) {
        player.x -= player.speed;
    }

    if (keys["d"]) {
        player.x += player.speed;
    }

    // =========================
    // Keep Player On Screen
    // =========================

    if (player.x < 0) {
        player.x = 0;
    }

    if (player.y < 0) {
        player.y = 0;
    }

    if (player.x + player.size > canvas.width) {
        player.x = canvas.width - player.size;
    }

    if (player.y + player.size > canvas.height) {
        player.y = canvas.height - player.size;
    }

    // =========================
    // Enemy AI
    // =========================

    enemies.forEach((enemy) => {

        // Direction toward player

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        // Distance

        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize direction

        const velocityX = dx / distance;
        const velocityY = dy / distance;

        // Move enemy

        enemy.x += velocityX * enemy.speed;
        enemy.y += velocityY * enemy.speed;

        // =========================
        // Collision Detection
        // =========================

        if (
            player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y
        ) {

            gameOver = true;
        }

    });
}

// =====================================
// Draw
// =====================================

function draw() {

    // Clear Screen

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // =========================
    // Draw Player
    // =========================

    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.size,
        player.size
    );

    // =========================
    // Draw Enemies
    // =========================

    enemies.forEach((enemy) => {

        ctx.fillStyle = enemy.color;

        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.size,
            enemy.size
        );

    });

    // =========================
    // Game Over Text
    // =========================

    if (gameOver) {

        ctx.fillStyle = "white";

        ctx.font = "60px Arial";

        ctx.textAlign = "center";

        ctx.fillText(
            "GAME OVER",
            canvas.width / 2,
            canvas.height / 2
        );
    }
}

// =====================================
// Game Loop
// =====================================

function gameLoop() {

    update();

    draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();