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
//
// Each subclass in entities/ reads its own
// stats from here. Adding a new enemy type
// later just means adding a new entry.

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
    },

    spitter: {

        SIZE: 36,
        SPEED: 1.6,
        COLOR: "purple",
        HP_MULTIPLIER: 1.5,

        // Distance (px) it tries to hold from the player

        PREFERRED_RANGE: 260,

        SHOOT_COOLDOWN: 90,

        PROJECTILE_SPEED: 7,
        PROJECTILE_COLOR: "violet"

    },

    runner: {

        SIZE: 30,
        SPEED: 3,
        COLOR: "orange",
        HP_MULTIPLIER: 0.75,

        CHARGE_COOLDOWN: 150,
        CHARGE_DURATION: 40,
        CHARGE_MULTIPLIER: 3

    }

};

// =====================================
// Elite Modifier
// =====================================
//
// Elites aren't a new class - makeElite()
// in entities/elite.js buffs an existing
// enemy instance and flags it. Applies to
// grunt/tank/spitter/runner, not the boss.

const ELITE = {

    HP_MULTIPLIER: 3,
    SIZE_MULTIPLIER: 1.3,
    SPEED_MULTIPLIER: 1.15,

    GLOW_COLOR: "gold",

    UNLOCK_WAVE: 3,
    CHANCE: 0.15

};

// =====================================
// Boss
// =====================================

const BOSS = {

    SIZE: 120,
    SPEED: 0.8,
    COLOR: "#8b0000",

    BASE_HP: 80,
    HP_PER_WAVE: 25,

    ATTACK_COOLDOWN: 150,

    PROJECTILE_COUNT: 10,
    PROJECTILE_SPEED: 6,
    PROJECTILE_COLOR: "#ff4500"

};

// =====================================
// Waves
// =====================================

const WAVES = {

    START_GRUNTS: 5,

    GRUNTS_PER_WAVE: 2,

    TANK_EVERY: 3,

    SPITTER_UNLOCK_WAVE: 2,
    SPITTER_EVERY: 2,

    RUNNER_UNLOCK_WAVE: 3,
    RUNNER_EVERY: 4,

    BOSS_EVERY: 5,
    BOSS_ESCORT_GRUNTS: 3,

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