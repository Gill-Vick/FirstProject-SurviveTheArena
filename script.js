const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// =====================================
// Game State
// =====================================

let gameState = "menu";
// menu
// playing
// gameover

// =====================================
// Score
// =====================================

let score = 0;
let startTime = 0;

let enemySpawnRate = 1000;
let enemySpeedMultiplier = 1;

// Dash

let dashCooldown = 0;
const dashCooldownTime = 1000;

const dashDistance = 120;

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

let enemies = [];

let particles = [];

let screenShake = 0;

let lastSpawn = 0;

// =====================================
// Buttons
// =====================================

const startButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2,
    width: 200,
    height: 70
};

const homeButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 + 100,
    width: 200,
    height: 70
};

// =====================================
// Mouse Input
// =====================================

canvas.addEventListener("click", (e) => {

    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // =========================
    // Start Button
    // =========================

    if (gameState === "menu") {

        if (
            mouseX > startButton.x &&
            mouseX < startButton.x + startButton.width &&
            mouseY > startButton.y &&
            mouseY < startButton.y + startButton.height
        ) {

            startGame();
        }
    }

    // =========================
    // Home Button
    // =========================

    if (gameState === "gameover") {

        if (
            mouseX > homeButton.x &&
            mouseX < homeButton.x + homeButton.width &&
            mouseY > homeButton.y &&
            mouseY < homeButton.y + homeButton.height
        ) {

            resetGame();
        }
    }

});

// =====================================
// Start Game
// =====================================

function startGame() {

    gameState = "playing";

    startTime = Date.now();

    enemies = [];

    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
}

// =====================================
// Reset Game
// =====================================

function resetGame() {

    gameState = "menu";

    enemies = [];

    score = 0;
}

// =====================================
// Enemy Spawning
// =====================================

function spawnEnemy() {

    let x;
    let y;

    const size = 40;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -size;
    }

    else if (side === 1) {
        x = Math.random() * canvas.width;
        y = canvas.height + size;
    }

    else if (side === 2) {
        x = -size;
        y = Math.random() * canvas.height;
    }

    else {
        x = canvas.width + size;
        y = Math.random() * canvas.height;
    }

    enemies.push({
        x,
        y,
        size,
        speed: 2 * enemySpeedMultiplier,
        color: "red"
    });
}

// =====================================
// Keyboard Input
// =====================================

const keys = {};

window.addEventListener("keydown", (e) => {

    keys[e.key] = true;

    // =========================
    // Dash
    // =========================

    if (
        e.code === "Space" &&
        dashCooldown <= 0 &&
        gameState === "playing"
    ) {

        let dx = 0;
        let dy = 0;

        if (keys["w"]) dy = -1;
        if (keys["s"]) dy = 1;
        if (keys["a"]) dx = -1;
        if (keys["d"]) dx = 1;

        // Prevent divide by zero

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {

            dx /= distance;
            dy /= distance;

            player.x += dx * dashDistance;
            player.y += dy * dashDistance;

            for (let i = 0; i < 20; i++) {

                particles.push({
                    x: player.x + player.size / 2,
                    y: player.y + player.size / 2,
                    size: Math.random() * 6 + 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    life: 30,
                    color: "cyan"
                });
            
            }

            dashCooldown = dashCooldownTime;
        }
    }

});

window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// =====================================
// Update
// =====================================

function update() {

    if (gameState !== "playing") {
        return;
    }

    // =========================
    // Score Timer
    // =========================

    score = ((Date.now() - startTime) / 1000).toFixed(1);

    const survivalTime = (Date.now() - startTime) / 1000;

    // Increase difficulty over time

    enemySpawnRate = Math.max(250, 1000 - survivalTime * 20);

    enemySpeedMultiplier = 1 + survivalTime * 0.02;

    if (Date.now() - lastSpawn > enemySpawnRate) {

        spawnEnemy();
    
        lastSpawn = Date.now();
    }

    // =========================
    // Player Movement
    // =========================

    if (dashCooldown > 0) {
        dashCooldown -= 16;
    }

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
    // Screen Boundaries
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

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        const velocityX = dx / distance;
        const velocityY = dy / distance;

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

            screenShake = 20;

            gameState = "gameover";
        }

    });

    particles.forEach((particle, index) => {

        particle.x += particle.vx;
        particle.y += particle.vy;
    
        particle.life--;
    
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    
    });

}

// =====================================
// Draw Menu
// =====================================

function drawMenu() {

    ctx.fillStyle = "white";

    ctx.font = "70px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "SURVIVE THE ARENA",
        canvas.width / 2,
        200
    );

    // Start Button

    ctx.fillStyle = "lime";

    ctx.fillRect(
        startButton.x,
        startButton.y,
        startButton.width,
        startButton.height
    );

    ctx.fillStyle = "black";

    ctx.font = "35px Arial";

    ctx.fillText(
        "START",
        canvas.width / 2,
        startButton.y + 47
    );
}

// =====================================
// Draw Game
// =====================================

function drawGame() {

    // Player
    ctx.shadowBlur = 20;
    ctx.shadowColor = "lime";

    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.size,
        player.size
    );

    ctx.shadowBlur = 0;

    // Enemies

    enemies.forEach((enemy) => {

        ctx.shadowBlur = 20;
        ctx.shadowColor = "red";

        ctx.fillStyle = enemy.color;

        ctx.fillRect(
            enemy.x,
            enemy.y,
            enemy.size,
            enemy.size
        );

        ctx.shadowBlur = 0;

    });

    // Score

    ctx.fillStyle = "white";

    ctx.font = "bold 30px Arial";

    ctx.textAlign = "left";

    ctx.shadowBlur = 10;
    ctx.shadowColor = "white";

    ctx.fillText(
        `Time: ${score}`,
        20,
        40
    );

    ctx.fillText(
        `Dash: ${dashCooldown <= 0 ? "READY" : "COOLDOWN"}`,
        20,
        80
    );

    ctx.shadowBlur = 0;

    particles.forEach((particle) => {

        ctx.fillStyle = particle.color;
    
        ctx.globalAlpha = particle.life / 30;
    
        ctx.beginPath();
    
        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );
    
        ctx.fill();
    
        ctx.globalAlpha = 1;
    
    });
}

// =====================================
// Draw Game Over
// =====================================

function drawGameOver() {

    ctx.fillStyle = "white";

    ctx.font = "80px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
        "GAME OVER",
        canvas.width / 2,
        220
    );

    ctx.font = "40px Arial";

    ctx.fillText(
        `Survived: ${score} Seconds`,
        canvas.width / 2,
        300
    );

    // Home Button

    ctx.fillStyle = "lime";

    ctx.fillRect(
        homeButton.x,
        homeButton.y,
        homeButton.width,
        homeButton.height
    );

    ctx.fillStyle = "black";

    ctx.font = "28px Arial";

    ctx.fillText(
        "RETURN HOME",
        canvas.width / 2,
        homeButton.y + 45
    );
}

// =====================================
// Draw
// =====================================

function drawGrid() {

    const gridSize = 50;

    ctx.strokeStyle = "#1a1a1a";

    ctx.lineWidth = 1;

    const offset = Date.now() * 0.02 % gridSize;

    // Vertical lines

    for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {

        ctx.beginPath();

        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);

        ctx.stroke();
    }

    // Horizontal lines

    for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {

        ctx.beginPath();

        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);

        ctx.stroke();
    }
}

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    ctx.save();

    if (screenShake > 0) {

        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;

        ctx.translate(shakeX, shakeY);

        screenShake *= 0.9;
    }

    if (gameState === "menu") {
        drawMenu();
    }

    else if (gameState === "playing") {
        drawGame();
    }

    else if (gameState === "gameover") {
        drawGameOver();
    }

    ctx.restore();
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