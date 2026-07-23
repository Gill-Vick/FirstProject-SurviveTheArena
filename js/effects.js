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

    // Intentionally empty. Every arena floor is now a baked
    // pixel texture with its own flagstone seams (see
    // ensureFloorTexture in arena.js), so the old thin square
    // grid would just clash on top of it. Kept as a no-op so
    // the draw pass in game.js doesn't need to change.

}