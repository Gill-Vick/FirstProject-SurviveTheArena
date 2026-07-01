// =====================================
// Initialization
// =====================================

window.addEventListener("resize", () => {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

});

// =====================================
// Game Loop
// =====================================

function gameLoop() {

    update();

    draw();

    requestAnimationFrame(gameLoop);

}

// =====================================
// Start Engine
// =====================================

gameLoop();