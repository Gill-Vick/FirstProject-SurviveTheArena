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
//
// FRAME-RATE INDEPENDENCE
//
// Every update() call used to assume it was being
// called at a fixed 60fps (e.g. moving `speed` px
// per call, or ticking a cooldown down by 1 per
// call). On a 30fps or 144fps machine that made the
// whole game run at a different real-world speed.
//
// Fix: measure the real elapsed time between frames
// (deltaTime, in ms) and derive:
//
//   Game.dt         - real elapsed ms since last frame
//                      (clamped so a lag spike/tab-switch
//                      doesn't cause a huge catch-up jump)
//
//   Game.timeScale  - how many "60fps frames" that dt
//                      represents (1.0 at exactly 60fps,
//                      2.0 at 30fps, 0.5 at 120fps, etc.)
//
// Anything that used to do `this.x += this.speed` now
// does `this.x += this.speed * Game.timeScale`, and
// anything that used to do `this.timer--` now does
// `this.timer -= Game.timeScale`. Anything that was
// already counting down in milliseconds
// (`cooldown -= 16`) now does `cooldown -= Game.dt`,
// which is the correct real-time version of what that
// code was already trying to do.

let lastFrameTime = performance.now();

// Cap the simulated frame time (i.e. don't let a single
// update think more than a few frames' worth of time
// passed at once). This prevents a dropped frame / tab
// switch from launching an enemy dash across the whole
// map or letting the player skip through a wall.

const MAX_FRAME_TIME = 1000 / 15;

// Global speed dial. 1.0 = normal. 0.75 = 25% slower,
// 1.25 = 25% faster. Since every movement speed, cooldown,
// and animation timer in the game reads off Game.dt /
// Game.timeScale, changing this one number slows or speeds
// up literally everything at once - player, enemies,
// projectiles, particles, cooldowns, all of it.
const GAME_SPEED = 0.6;

function gameLoop(currentTime) {

    let delta = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (delta > MAX_FRAME_TIME)
        delta = MAX_FRAME_TIME;

    if (delta < 0)
        delta = 0;

    delta *= GAME_SPEED;

    Game.dt = delta;
    Game.timeScale = delta / (1000 / 60);

    update();

    draw();

    requestAnimationFrame(gameLoop);

}

// =====================================
// Start Engine
// =====================================

requestAnimationFrame((t) => {

    lastFrameTime = t;

    requestAnimationFrame(gameLoop);

});