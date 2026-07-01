// =====================================
// Player
// =====================================

const player = {

    x: canvas.width / 2,
    y: canvas.height / 2,

    size: PLAYER.SIZE,

    speed: PLAYER.SPEED,

    color: PLAYER.COLOR

};

// =====================================
// Mouse
// =====================================

let mouseX = 0;
let mouseY = 0;

let aimAngle = 0;

// =====================================
// Sword
// =====================================

let swordSwing = false;

let swordAngle = 0;

let swordTimer = 0;

let swingProgress = 0;

// =====================================
// Dash
// =====================================

let dashCooldown = 0;

// =====================================
// Player Update
// =====================================

function updatePlayer() {

    updateMovement();

    updateDash();

    keepPlayerOnScreen();

}

// =====================================
// Movement
// =====================================

function updateMovement() {

    if (keys["w"])
        player.y -= player.speed;

    if (keys["s"])
        player.y += player.speed;

    if (keys["a"])
        player.x -= player.speed;

    if (keys["d"])
        player.x += player.speed;

}

// =====================================
// Dash
// =====================================

function updateDash() {

    if (dashCooldown > 0)
        dashCooldown -= 16;

}

function dash() {

    if (dashCooldown > 0)
        return;

    let dx = 0;
    let dy = 0;

    if (keys["w"]) dy = -1;
    if (keys["s"]) dy = 1;
    if (keys["a"]) dx = -1;
    if (keys["d"]) dx = 1;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0)
        return;

    dx /= distance;
    dy /= distance;

    player.x += dx * DASH.DISTANCE;
    player.y += dy * DASH.DISTANCE;

    dashCooldown = DASH.COOLDOWN;

    createDashParticles();

}

// =====================================
// Sword
// =====================================

function swingSword() {

    if (swordSwing)
        return;

    swordSwing = true;

    swordTimer = SWORD.DURATION;

    swingProgress = 0;

    swordAngle = aimAngle;

    Game.enemies.forEach(enemy => {

        enemy.hitThisSwing = false;

    });

}

function updateSword() {

    if (!swordSwing)
        return;

    swordTimer--;

    swingProgress = 1 - (swordTimer / SWORD.DURATION);

    attackEnemies();

    if (swordTimer <= 0)
        swordSwing = false;

}

// =====================================
// Combat
// =====================================

function attackEnemies() {

    Game.enemies.forEach((enemy, index) => {

        const enemyCenterX =
            enemy.x + enemy.size / 2;

        const enemyCenterY =
            enemy.y + enemy.size / 2;

        const dx =
            enemyCenterX -
            (player.x + player.size / 2);

        const dy =
            enemyCenterY -
            (player.y + player.size / 2);

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance > SWORD.LENGTH)
            return;

        const angleToEnemy =
            Math.atan2(dy, dx);

        const currentAngle =
            swordAngle -
            SWORD.ARC / 2 +
            SWORD.ARC * swingProgress;

        let angleDifference =
            Math.abs(angleToEnemy - currentAngle);

        if (angleDifference > Math.PI)
            angleDifference =
                Math.PI * 2 - angleDifference;

        if (
            angleDifference < 0.5 &&
            !enemy.hitThisSwing
        ) {

            enemy.hp -= SWORD.DAMAGE;

            enemy.hitThisSwing = true;

            createHitParticles(
                enemyCenterX,
                enemyCenterY
            );

            if (enemy.hp <= 0) {

                Game.enemiesRemaining--;

                Game.screenShake =
                    EFFECTS.SHAKE_ON_KILL;

                Game.enemies.splice(index, 1);

            }

        }

    });

}

// =====================================
// Helpers
// =====================================

function keepPlayerOnScreen() {

    player.x = Math.max(
        0,
        Math.min(
            canvas.width - player.size,
            player.x
        )
    );

    player.y = Math.max(
        0,
        Math.min(
            canvas.height - player.size,
            player.y
        )
    );

}

// =====================================
// Drawing
// =====================================

function drawPlayer() {

    ctx.shadowBlur = EFFECTS.PLAYER_GLOW;
    ctx.shadowColor = PLAYER.COLOR;

    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.size,
        player.size
    );

    ctx.shadowBlur = 0;

    drawSword();

    drawAimIndicator();

}

function drawSword() {

    if (!swordSwing)
        return;

    ctx.save();

    ctx.translate(
        player.x + player.size / 2,
        player.y + player.size / 2
    );

    const currentAngle =
        swordAngle -
        SWORD.ARC / 2 +
        SWORD.ARC * swingProgress;

    ctx.rotate(currentAngle);

    ctx.shadowBlur = 20;
    ctx.shadowColor = "white";

    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(SWORD.LENGTH - 25, 0);
    ctx.stroke();

    ctx.fillStyle = "cyan";

    ctx.beginPath();

    ctx.arc(
        SWORD.LENGTH - 25,
        0,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

}

function drawAimIndicator() {

    ctx.save();

    ctx.translate(
        player.x + player.size / 2,
        player.y + player.size / 2
    );

    ctx.rotate(aimAngle);

    ctx.globalAlpha = 0.4;

    ctx.strokeStyle = "cyan";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.lineTo(50, 0);

    ctx.stroke();

    ctx.restore();

    ctx.globalAlpha = 1;

}