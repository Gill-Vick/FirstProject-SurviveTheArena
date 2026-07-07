// =====================================
// Input
// =====================================

const keys = {};

// =====================================
// Mouse State
// =====================================

let mouseX = 0;
let mouseY = 0;

let aimAngle = 0;
let isMouseDown = false;

// =====================================
// Mouse Input
// =====================================

canvas.addEventListener("mousedown", (e) => {

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Left Click
    if (e.button === 0) {
        
        isMouseDown = true;

        switch (Game.state) {

            case "menu":
                handleMenuMouseDown(x, y);
                handleMenuClick(x, y);
                break;

            case "gameover":

                const homeBtn = getHomeButton();

                if (
                    x > homeBtn.x &&
                    x < homeBtn.x + homeBtn.width &&
                    y > homeBtn.y &&
                    y < homeBtn.y + homeBtn.height
                ) {
                    resetGame();
                }
                break;

        }
    }

    // Right Click (fires the King's Blade laser ability)
    if (e.button === 2) {

        if (Game.state !== "playing")
            return;

        player.fireKingsBladeLaser();
    }

});

canvas.addEventListener("mousemove", (e) => {

    const rect = canvas.getBoundingClientRect();

    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (Game.state === "menu")
        handleMenuMouseMove(mouseX, mouseY);

    // player doesn't exist until startGame() runs,
    // so skip aiming while on the menu screen.

    if (!player)
        return;

    const dx =
        mouseX - (player.x + player.size / 2);

    const dy =
        mouseY - (player.y + player.size / 2);

    aimAngle = Math.atan2(dy, dx);

});

window.addEventListener("mouseup", (e) => {

    if (e.button === 0) {
        isMouseDown = false;
        handleMenuMouseUp();
    }

});

// If the player tabs out or minimizes the window while holding click, 
// release the hold state to prevent infinite auto-attacking.
window.addEventListener("blur", () => {

    isMouseDown = false;
    handleMenuMouseUp();
    
    // Clear keyboard keys too just in case
    Object.keys(keys).forEach(key => keys[key] = false);

});

// Right-click fires the King's Blade laser ability. Prevent
// the browser's context menu from popping up over the canvas
// so right-click is free to use as a game input.

canvas.addEventListener("contextmenu", (e) => {

    e.preventDefault();

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

        player.dash();

    }

    if (

        e.key.toLowerCase() === "e" &&
        Game.state === "playing"

    ) {

        player.fireBow();

    }

});

window.addEventListener("keyup", (e) => {

    keys[e.key.toLowerCase()] = false;

});