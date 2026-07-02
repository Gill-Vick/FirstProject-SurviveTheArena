// =====================================
// Grid
// =====================================
//
// Particle update/draw logic now lives in
// entities/particle.js as part of the
// Particle class. This file just handles
// the scrolling background grid.

function drawGrid() {

    ctx.strokeStyle = CANVAS.GRID_COLOR;
    ctx.lineWidth = 1;

    const offset =
        (Date.now() * 0.02) %
        CANVAS.GRID_SIZE;

    // Vertical

    for (
        let x = -CANVAS.GRID_SIZE;
        x < canvas.width + CANVAS.GRID_SIZE;
        x += CANVAS.GRID_SIZE
    ) {

        ctx.beginPath();

        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);

        ctx.stroke();

    }

    // Horizontal

    for (
        let y = -CANVAS.GRID_SIZE;
        y < canvas.height + CANVAS.GRID_SIZE;
        y += CANVAS.GRID_SIZE
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);

        ctx.stroke();

    }

}