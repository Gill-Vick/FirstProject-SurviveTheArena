// =====================================
// Grid
// =====================================
//
// Particle update/draw logic now lives in
// entities/particle.js as part of the
// Particle class. This file just handles
// the scrolling background grid.

// =====================================
// Grid (Inside effects.js)
// =====================================

function drawGrid() {

    // The castle entrance paints its own flagstone seams and
    // grass - a square grid over lawn would break the look.
    if (Arena.theme === "castle")
        return;

    ctx.strokeStyle = CANVAS.GRID_COLOR;
    ctx.lineWidth = 1;

    // Fixed at 0 so the floor stays completely locked to your cracks and rocks
    const offset = 0; 

    // Vertical Lines
    for (
        let x = 0;
        x < canvas.width;
        x += CANVAS.GRID_SIZE
    ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal Lines
    for (
        let y = 0;
        y < canvas.height;
        y += CANVAS.GRID_SIZE
    ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}