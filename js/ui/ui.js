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
// Menu
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
// Game
// =====================================
//
// Every entity draws itself now - no more
// drawEnemies()/drawParticles() functions.

function drawGame() {

    player.draw();

    Game.enemies.forEach(enemy => enemy.draw());

    Game.projectiles.forEach(projectile => projectile.draw());

    Game.particles.forEach(particle => particle.draw());

    Game.damageNumbers.forEach(number => number.draw());

    drawHUD();

    drawWaveMessages();

}

// =====================================
// HUD
// =====================================

function drawHUD() {

    ctx.fillStyle = "white";

    ctx.font = "bold 30px Arial";

    ctx.textAlign = "left";

    ctx.fillText(

        `Time: ${Game.score}`,

        20,

        40

    );

    ctx.fillText(

        `Wave: ${Game.wave}`,

        20,

        80

    );

    ctx.fillText(

        `Enemies: ${Game.enemiesRemaining}`,

        20,

        120

    );

    ctx.fillText(

        `Dash: ${player.dashCooldown <= 0 ? "READY" : "COOLDOWN"}`,

        20,

        160

    );

}

// =====================================
// Wave Messages
// =====================================

function drawWaveMessages() {

    if (Game.waveMessageTimer > 0) {

        Game.waveMessageTimer--;

        ctx.textAlign = "center";

        ctx.font = "60px Arial";

        ctx.fillStyle = "white";

        ctx.fillText(

            `WAVE ${Game.wave}`,

            canvas.width / 2,

            150

        );

    }

    if (Game.waveTransition) {

        ctx.textAlign = "center";

        ctx.font = "70px Arial";

        ctx.fillStyle = "gold";

        ctx.fillText(

            "WAVE COMPLETE",

            canvas.width / 2,

            canvas.height / 2

        );

    }

}

// =====================================
// Game Over
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

        `Survived: ${Game.score} Seconds`,

        canvas.width / 2,

        300

    );

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