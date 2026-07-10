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
// Coordinate Mapping
// =====================================
//
// canvas.width/height (its internal drawing resolution, and
// therefore the coordinate space every game system computes
// against) doesn't necessarily match canvas.getBoundingClientRect()
// (its actual on-screen CSS size) - on desktop those are the
// same thing so this is a 1:1 no-op, but on mobile the canvas
// is deliberately displayed smaller/letterboxed than its fixed
// logical resolution (see mobile.js). Scaling by the ratio
// between the two keeps clicks/taps landing exactly where
// they visually appear regardless of that difference.

function getCanvasCoords(e) {

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };

}

// =====================================
// Mouse Input
// =====================================

canvas.addEventListener("mousedown", (e) => {

    const { x, y } = getCanvasCoords(e);

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

    // Right Click - the class's secondary ability (Warrior:
    // King's Blade laser, Ranger: storm lance)
    if (e.button === 2) {

        if (Game.state !== "playing")
            return;

        player.onSecondaryFire();
    }

});

canvas.addEventListener("mousemove", (e) => {

    const coords = getCanvasCoords(e);

    mouseX = coords.x;
    mouseY = coords.y;

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

// =====================================
// Armoury Scrolling
// =====================================
//
// Desktop: mouse wheel. Mobile: dragging a finger over the
// list. Taps still register as clicks - the touchstart isn't
// prevented, we only hijack the gesture once the finger
// actually moves.

canvas.addEventListener("wheel", (e) => {

    if (Game.state === "menu" && Game.menuView === "shop") {

        e.preventDefault();

        scrollArmoury(e.deltaY);

    }

}, { passive: false });

let armouryTouchY = null;

canvas.addEventListener("touchstart", (e) => {

    if (Game.state === "menu" && Game.menuView === "shop")
        armouryTouchY = e.touches[0].clientY;

});

canvas.addEventListener("touchmove", (e) => {

    if (armouryTouchY === null)
        return;

    if (Game.state !== "menu" || Game.menuView !== "shop") {
        armouryTouchY = null;
        return;
    }

    e.preventDefault();

    // Touch positions are CSS px - convert the drag distance
    // into the canvas's logical coordinate space (they differ
    // on mobile, see getCanvasCoords()).
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;

    const touchY = e.touches[0].clientY;

    scrollArmoury((armouryTouchY - touchY) * scaleY);

    armouryTouchY = touchY;

}, { passive: false });

window.addEventListener("touchend", () => {

    armouryTouchY = null;

});

// Right-click fires the class's secondary ability. Prevent
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

        (e.code === "Space" || e.code === "ShiftLeft") &&
        Game.state === "playing"

    ) {

        e.preventDefault();

        player.dash();

    }

    // [E] - the class's ability key (Warrior: shortbow,
    // Ranger: dagger)
    if (

        e.key.toLowerCase() === "e" &&
        Game.state === "playing"

    ) {

        player.onAbilityKey();

    }

});

window.addEventListener("keyup", (e) => {

    keys[e.key.toLowerCase()] = false;

});