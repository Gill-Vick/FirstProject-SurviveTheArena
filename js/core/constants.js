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
    DAMAGE: 1,
    DAMAGE_UPGRADED: 2
};

// =====================================
// Bow (shop item)
// =====================================

const BOW = {
    COOLDOWN: 2000,
    DAMAGE: 2,
    SPEED: 14,
    SIZE: 6,
    COLOR: "#8b6914"
};

// =====================================
// Shield (shop item)
// =====================================

const SHIELD = {
    INVULN_MS: 1000,
    OUTLINE_COLOR: "#4da6ff",
    OUTLINE_WIDTH: 4
};

// =====================================
// Coin Rewards
// =====================================

const COINS = {
    grunt: 1,
    tank: 2,
    spitter: 2,
    runner: 3,
    boss: 20,
    fireMage: 3,
    necromancer: 4,
    skeleton: 1,
    lancer: 5,
    king: 50
};

// =====================================
// Shop
// =====================================

const SHOP_ITEMS = {

    shield: {
        price: 75,
        name: "Wooden Shield",
        desc: "Blocks 1 hit + 1s invuln"
    },

    bow: {
        price: 100,
        name: "Shortbow",
        desc: "Press E — 2 dmg arrow (2s cd)"
    },

    wetStone: {
        price: 200,
        name: "Wet Stone",
        desc: "Sword deals 2 damage"
    },

    hermesShoes: {
        price: 500,
        name: "Hermes Shoes",
        desc: "Second dash charge",
        requiresFirstBoss: true
    },

    critRate: {
        price: 100,
        name: "Critical Training",
        desc: "Permanently +1% crit chance",
        repeatable: true
    }

};

// =====================================
// Critical Hits
// =====================================

const CRIT = {

    BASE: 0.05,
    PER_UPGRADE: 0.01

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
        HP_MULTIPLIER: 1
    },

    spitter: {

        SIZE: 36,
        SPEED: 1.6,
        COLOR: "purple",
        HP_MULTIPLIER: 0.5,

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
        HP_MULTIPLIER: 0.5,

        CHARGE_COOLDOWN: 150,
        CHARGE_DURATION: 40,
        CHARGE_MULTIPLIER: 3

    },

    fireMage: {

        SIZE: 38,
        SPEED: 1.4,
        COLOR: "#c0392b",
        PREFERRED_RANGE: 280,
        CAST_COOLDOWN: 2200

    },

    necromancer: {

        SIZE: 42,
        SPEED: 1.2,
        COLOR: "#4a235a",
        SUMMON_COOLDOWN: 2000

    },

    skeleton: {

        SIZE: 32,
        SPEED: 3.2,
        COLOR: "#d5d8dc"

    },

    lancer: {

        SIZE: 44,
        SPEED: 1.8,
        COLOR: "#566573",
        SHIELD_HITS: 2,

        // Thrust attack (short poke)
        THRUST_COOLDOWN: 2000,
        THRUST_WINDUP: 15,
        THRUST_DURATION: 18,
        THURST_RANGE: 160,
        THRUST_WIDTH: 50,
        LANCE_LENGTH: 90,

        // Dash attack (shield-broken lunge)
        DASH_WINDUP: 20,
        DASH_SPEED: 9,
        DASH_DURATION: 18,
        DASH_WIDTH: 60

    }

};

// =====================================
// Enemy Display Labels
// =====================================
//
// Used for the "You were slain by ___"
// game over message.

const ENEMY_LABELS = {

    grunt: "a Grunt",
    tank: "a Tank",
    spitter: "a Spitter",
    runner: "a Runner",
    boss: "the Boss",
    fireMage: "a Fire Mage",
    necromancer: "a Necromancer",
    skeleton: "a Skeleton",
    lancer: "a Lancer",
    king: "the King"

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

    HP_MULTIPLIER: 2,
    SIZE_MULTIPLIER: 1.2,
    SPEED_MULTIPLIER: 1.3,

    GLOW_COLOR: "gold",

    UNLOCK_WAVE: 3,
    CHANCE: 0.10

};

// =====================================
// Boss
// =====================================

const BOSS = {

    SIZE: 120,
    SPEED: 0.8,
    COLOR: "#8b0000",

    BASE_HP: 20,
    HP_PER_WAVE: 5,

    ATTACK_COOLDOWN: 120,

    PROJECTILE_COUNT: 10,
    PROJECTILE_SPEED: 7,
    PROJECTILE_COLOR: "#ff4500"

};

// =====================================
// King (Wave 10 Boss)
// =====================================

const KING = {

    SIZE: 130,
    SPEED: 0.7,
    COLOR: "#6a0dad",
    HP: 100,

    SUMMON_THRESHOLD: 50,

    LASER_COOLDOWN: 3000,
    LASER_SPEED: 16,
    LASER_COLOR: "#00bfff",

    SLASH_COOLDOWN: 5000,
    SLASH_DURATION: 20,
    SLASH_ARC: Math.PI * 0.9,
    SLASH_LENGTH: 120

};

// =====================================
// Hazards
// =====================================

const HAZARD = {

    FIRE_RADIUS: 55,
    FIRE_WARNING: 600,
    BURN_RADIUS: 50,
    BURN_DURATION: 3000,
    BURN_TICK: 500

};

// =====================================
// Waves
// =====================================

const WAVES = {

    SET1_END: 5,
    SET2_START: 6,
    SET2_END: 10,

    SET1_SCALE_AFTER: 0.35,

    START_GRUNTS: 5,
    GRUNTS_PER_WAVE: 2,

    TANK_EVERY: 3,

    SPITTER_UNLOCK_WAVE: 2,
    SPITTER_EVERY: 2,

    RUNNER_UNLOCK_WAVE: 3,
    RUNNER_EVERY: 4,

    BOSS_WAVE: 5,
    KING_WAVE: 10,
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

    SHAKE_ON_KILL: 4

};