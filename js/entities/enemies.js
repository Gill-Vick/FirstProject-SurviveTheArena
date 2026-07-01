// =====================================
// Enemy Factory
// =====================================

function createGrunt(x, y) {

    const hp =
        (1 + Math.floor(Game.score / DIFFICULTY.HP_SCALE_TIME))
        * ENEMY_TYPES.grunt.HP_MULTIPLIER;

    return {

        type: "grunt",

        x,
        y,

        size: ENEMY_TYPES.grunt.SIZE,

        speed:
            ENEMY_TYPES.grunt.SPEED *
            Game.enemySpeedMultiplier,

        color: ENEMY_TYPES.grunt.COLOR,

        hp,
        maxHp: hp,

        hitThisSwing: false

    };

}

function createTank(x, y) {

    const hp =
        (1 + Math.floor(Game.score / DIFFICULTY.HP_SCALE_TIME))
        * ENEMY_TYPES.tank.HP_MULTIPLIER;

    return {

        type: "tank",

        x,
        y,

        size: ENEMY_TYPES.tank.SIZE,

        speed:
            ENEMY_TYPES.tank.SPEED *
            Game.enemySpeedMultiplier,

        color: ENEMY_TYPES.tank.COLOR,

        hp,
        maxHp: hp,

        hitThisSwing: false

    };

}

// =====================================
// Spawn Enemy
// =====================================

function spawnEnemy(type = "grunt") {

    let x;
    let y;

    let size =
        ENEMY_TYPES[type].SIZE;

    const side =
        Math.floor(Math.random() * 4);

    switch (side) {

        case 0:

            x = Math.random() * canvas.width;
            y = -size;

            break;

        case 1:

            x = Math.random() * canvas.width;
            y = canvas.height + size;

            break;

        case 2:

            x = -size;
            y = Math.random() * canvas.height;

            break;

        default:

            x = canvas.width + size;
            y = Math.random() * canvas.height;

    }

    switch (type) {

        case "tank":

            Game.enemies.push(
                createTank(x, y)
            );

            break;

        default:

            Game.enemies.push(
                createGrunt(x, y)
            );

    }

}

// =====================================
// Enemy Update
// =====================================

function updateEnemies() {

    Game.enemies.forEach(enemy => {

        updateEnemyMovement(enemy);

        checkEnemyCollision(enemy);

    });

}

// =====================================
// Movement
// =====================================

function updateEnemyMovement(enemy) {

    const dx =
        player.x - enemy.x;

    const dy =
        player.y - enemy.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    if (distance === 0)
        return;

    enemy.x +=
        (dx / distance) * enemy.speed;

    enemy.y +=
        (dy / distance) * enemy.speed;

}

// =====================================
// Collision
// =====================================

function checkEnemyCollision(enemy) {

    if (

        player.x <
        enemy.x + enemy.size &&

        player.x + player.size >
        enemy.x &&

        player.y <
        enemy.y + enemy.size &&

        player.y + player.size >
        enemy.y

    ) {

        Game.screenShake =
            EFFECTS.SHAKE_ON_DEATH;

        Game.state = "gameover";

    }

}

// =====================================
// Drawing
// =====================================

function drawEnemies() {

    Game.enemies.forEach(enemy => {

        ctx.shadowBlur =
            EFFECTS.ENEMY_GLOW;

        ctx.shadowColor =
            enemy.color;

        ctx.fillStyle =
            enemy.color;

        ctx.fillRect(

            enemy.x,

            enemy.y,

            enemy.size,

            enemy.size

        );

        ctx.shadowBlur = 0;

        drawEnemyHealth(enemy);

    });

}

function drawEnemyHealth(enemy) {

    ctx.fillStyle = "black";

    ctx.fillRect(

        enemy.x,

        enemy.y - 12,

        enemy.size,

        6

    );

    ctx.fillStyle = "lime";

    ctx.fillRect(

        enemy.x,

        enemy.y - 12,

        enemy.size *
        (enemy.hp / enemy.maxHp),

        6

    );

}