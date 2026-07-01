// =====================================
// Input
// =====================================

const keys = {};

// =====================================
// Mouse Input
// =====================================

canvas.addEventListener("mousemove", (e) => {

    const rect = canvas.getBoundingClientRect();

    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const dx =
        mouseX - (player.x + player.size / 2);

    const dy =
        mouseY - (player.y + player.size / 2);

    aimAngle = Math.atan2(dy, dx);

});

canvas.addEventListener("click", (e) => {

    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (Game.state) {

        case "menu":

            if (

                x > startButton.x &&
                x < startButton.x + startButton.width &&

                y > startButton.y &&
                y < startButton.y + startButton.height

            ) {

                startGame();

            }

            break;

        case "playing":

            swingSword();

            break;

        case "gameover":

            if (

                x > homeButton.x &&
                x < homeButton.x + homeButton.width &&

                y > homeButton.y &&
                y < homeButton.y + homeButton.height

            ) {

                resetGame();

            }

            break;

    }

});

// =====================================
// Keyboard
// =====================================

window.addEventListener("keydown", (e) => {

    keys[e.key.toLowerCase()] = true;

    if (

        e.code === "Space" &&
        Game.state === "playing"

    ) {

        e.preventDefault();

        dash();

    }

});

window.addEventListener("keyup", (e) => {

    keys[e.key.toLowerCase()] = false;

});