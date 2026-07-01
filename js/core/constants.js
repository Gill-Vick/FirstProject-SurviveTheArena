// =====================================
// Canvas
// =====================================

const CANVAS = {
    BACKGROUND: "#111111",
    GRID_COLOR: "#1a1a1a",
    GRID_SIZE: 50
};

// =====================================
// Player
// =====================================

const PLAYER = {
    SIZE: 40,
    SPEED: 5,
    COLOR: "lime"
};

// =====================================
// Sword
// =====================================

const SWORD = {
    LENGTH: 110,
    DURATION: 15,
    ARC: Math.PI * 1.2,
    DAMAGE: 1
};

// =====================================
// Dash
// =====================================

const DASH = {
    DISTANCE: 120,
    COOLDOWN: 1000
};

// =====================================
// Enemy Types
// =====================================

const ENEMY_TYPES = {

    grunt: {

        SIZE: 40,
        SPEED: 2,
        COLOR: "red",
        HP_MULTIPLIER: 1
    },

    tank: {

        SIZE: 70,
        SPEED: 1,
        COLOR: "darkred",
        HP_MULTIPLIER: 4
    }

};

// =====================================
// Waves
// =====================================

const WAVES = {

    START_GRUNTS: 5,

    GRUNTS_PER_WAVE: 2,

    TANK_EVERY: 3,

    TRANSITION_TIME: 3000

};

// =====================================
// Difficulty
// =====================================

const DIFFICULTY = {

    HP_SCALE_TIME: 20,

    SPEED_SCALE: 0.02

};

// =====================================
// Effects
// =====================================

const EFFECTS = {

    PLAYER_GLOW: 20,

    ENEMY_GLOW: 20,

    SHAKE_ON_DEATH: 20,

    SHAKE_ON_KILL: 8

};