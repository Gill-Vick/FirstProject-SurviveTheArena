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
    COLOR: "lime",

    // Sprite sheet: 6 frames of a walk cycle, 256x256 each.
    // Frame index 2 (the 3rd frame) is the standing-still pose.
    SPRITE_FRAME_SIZE: 256,
    SPRITE_FRAME_COUNT: 6,
    SPRITE_IDLE_FRAME: 2,
    SPRITE_FRAME_DURATION: 90, // ms per frame while walking

    // The artwork's "forward" direction points toward the top
    // of the sheet. aimAngle=0 means "facing right", so we
    // need to rotate the drawn sprite by +90 degrees to line
    // its forward direction up with the aim direction. Nudge
    // this in 90-degree steps (Math.PI/2) if it looks off.
    SPRITE_ROTATION_OFFSET: Math.PI / 2,

    // The sprite is drawn bigger than the actual hitbox so it
    // reads clearly, without changing collision/combat feel.
    VISUAL_SCALE: 1.8
};

// =====================================
// Sword
// =====================================

const SWORD = {
    LENGTH: 110,
    DURATION: 15,
    ARC: Math.PI * 1.2,
    DAMAGE: 1,
    WETSTONE_BONUS: 1
};

// =====================================
// King's Blade (shop item)
// =====================================
//
// A stronger sword unlocked by defeating the King. Same
// swing mechanic as the base sword (still affected by Circle
// Strike, wet stone, crit rate) but hits harder and reaches
// a bit further, plus a right-click laser ability - a scaled
// down, single-shot version of the King's own beam attack.

const KINGS_BLADE = {

    BASE_DAMAGE: 2,
    WETSTONE_BONUS: 1,

    // A bit longer than the base sword's 110px, nowhere near
    // the King's own 320px greatsword.
    LENGTH: 140,

    // Right-click laser ability
    LASER_COOLDOWN: 4000,
    LASER_DAMAGE: 5,
    LASER_DURATION: 200, // ms the beam is visible/active for
    LASER_WIDTH: 30,
    LASER_COLOR: "#00bfff"

};

// =====================================
// Bow (shop item)
// =====================================

const BOW = {
    COOLDOWN: 2000,
    DAMAGE: 2,
    SPEED: 14,
    SIZE: 6,
    COLOR: "#8b6914",
    FAN_SPREAD: 0.18
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
    boss: 50,
    fireMage: 3,
    necromancer: 4,
    skeleton: 1,
    lancer: 5,
    king: 150
};

// =====================================
// Shop
// =====================================

const SHOP_ITEMS = {

    shield: {
        price: 100,
        name: "Wooden Shield",
        desc: "Blocks 1 hit + 1s invuln",
        equippable: true
    },

    bow: {
        equippable: true,
        get price() {
            if (Save.bowStage === 1) return 200;
            if (Save.bowStage === 2) return 400;
            return 100;
        },
        get name() {
            if (Save.bowStage === 1) return "Multishot I";
            if (Save.bowStage === 2) return "Multishot II";
            return "Shortbow";
        },
        get desc() {
            if (Save.bowStage === 1) return "Bow fires 2 arrows in a fan";
            if (Save.bowStage === 2) return "Bow fires 3 arrows in a fan";
            return "Press E — 2 dmg arrow (2s cd)";
        }
    },

    wetStone: {
        price: 250,
        name: "Wet Stone",
        desc: "Sword deals 2 damage",
        equippable: true
    },

    circleStrike: {
        price: 350,
        name: "Circle Strike",
        desc: "Sword goes around you",
        requiresFirstBoss: true,
        equippable: true
    },

    hermesShoes: {
        price: 600,
        name: "Hermes Shoes",
        desc: "Second dash charge",
        requiresFirstBoss: true,
        equippable: true
    },

    kingsBlade: {
        price: 2500,
        name: "King's Blade",
        desc: "2 dmg sword + right-click laser (5 dmg, 4s cd)",
        requiresKingKilled: true,
        equippable: true
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
    PER_UPGRADE: 0.01,
    MAX: 1.0

};

// =====================================
// Dash
// =====================================

const DASH = {
    DISTANCE: 120,
    COOLDOWN: 2500
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
        HP_MULTIPLIER: 1.5
    },

    spitter: {

        SIZE: 36,
        SPEED: 1.6,
        COLOR: "#8B4513",
        HP_MULTIPLIER: 0.5,

        // Distance (px) it tries to hold from the player

        PREFERRED_RANGE: 260,

        SHOOT_COOLDOWN: 90,

        PROJECTILE_SPEED: 7,
        PROJECTILE_COLOR: "#5c4033"

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
        CAST_COOLDOWN: 1900

    },

    necromancer: {

        SIZE: 42,
        SPEED: 0.9,
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
        SPEED: 2,
        COLOR: "#566573",
        SHIELD_HITS: 2,

        // Thrust attack (short poke)
        THRUST_COOLDOWN: 1200,
        THRUST_WINDUP: 10,
        THRUST_DURATION: 15,
        THURST_RANGE: 160,
        THRUST_WIDTH: 50,
        LANCE_LENGTH: 90,

        // Dash attack (shield-broken lunge)
        DASH_WINDUP: 10,
        DASH_SPEED: 20,
        DASH_DURATION: 9,
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
    spitter: "an Archer",
    runner: "a Runner",
    boss: "the Castle Guard",
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
    CHANCE: 0.15

};

// =====================================
// Boss
// =====================================

const BOSS = {

    SIZE: 120,
    SPEED: 1.2,
    COLOR: "#8b0000",
    DISPLAY_NAME: "Castle Guard",

    BASE_HP: 30,
    HP_PER_WAVE: 5,

    ATTACK_COOLDOWN: 100,

    PROJECTILE_COUNT: 12,
    PROJECTILE_SPEED: 8,
    PROJECTILE_COLOR: "#ff4500"

};

// =====================================
// King (Wave 10 Boss)
// =====================================

const KING = {

    SIZE: 130,
    SPEED: 0.8,
    COLOR: "#6a0dad",
    HP: 130,

    SUMMON_THRESHOLD: 65,

    // Laser - a continuous beam, not a bullet. It telegraphs
    // (thin warning line) then fires as a full beam that
    // spans clear across the map. Fires as a 3-round burst,
    // re-aiming at the player between each pulse.
    LASER_COOLDOWN: 2400,
    LASER_TELEGRAPH: 350,
    LASER_DURATION: 250,
    LASER_BURST_COUNT: 3,
    LASER_BURST_GAP: 200,
    LASER_WIDTH: 55,
    LASER_COLOR: "#00bfff",

    // Sword - a much longer, heavier greatsword swing than
    // the old 120px reach. No longer parriable, and swings a
    // bit faster/more often than before.
    SLASH_COOLDOWN: 4000,
    SLASH_DURATION: 16,
    SLASH_ARC: Math.PI * 0.9,
    SLASH_LENGTH: 320

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
    BOSS_ESCORT_GRUNTS: 20,
    BOSS_ESCORT_TANKS: 5,

    TRANSITION_TIME: 1500

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

// =====================================
// Bestiary
// =====================================

const BESTIARY_ORDER = [
    "grunt", "tank", "spitter", "runner", "boss",
    "fireMage", "necromancer", "skeleton", "lancer", "king"
];

const BESTIARY = {

    grunt: {
        name: "Grunt",
        color: "red",
        size: 40,
        isBoss: false,
        desc: "The arena's cannon fodder. Slow-witted but relentless.",
        behavior: "Walks straight toward you for a melee hit.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 3); },
        hpScale: "1 + floor((wave - 1) / 3)",
        baseSpeed: 2
    },

    tank: {
        name: "Tank",
        color: "darkred",
        size: 70,
        isBoss: false,
        desc: "A hulking bruiser that soaks up punishment.",
        behavior: "Slow chase. Immune to knockback.",
        hpAtWave(w) { return 3 + Math.floor((w - 1) / 3) * 2; },
        hpScale: "3 + floor((wave - 1) / 3) × 2",
        baseSpeed: 1
    },

    spitter: {
        name: "Archer",
        color: "#8B4513",
        size: 36,
        isBoss: false,
        desc: "Keeps its distance and peppers you with arrows.",
        behavior: "Kites at range, firing arrows on cooldown.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 5); },
        hpScale: "1 + floor((wave - 1) / 5)",
        baseSpeed: 1.6
    },

    runner: {
        name: "Runner",
        color: "orange",
        size: 30,
        isBoss: false,
        desc: "Fast and fragile — closes gaps in a blink.",
        behavior: "Chases you, then periodically triples speed in a charge.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 5); },
        hpScale: "1 + floor((wave - 1) / 5)",
        baseSpeed: 3
    },

    boss: {
        name: "Castle Guard",
        color: "#8b0000",
        size: 120,
        isBoss: true,
        desc: "The wave 5 gatekeeper. Fights up close and at range.",
        behavior: "Fires a radial burst, then dashes at the player.",
        hpAtWave(w) { return BOSS.BASE_HP + w * BOSS.HP_PER_WAVE; },
        hpScale: `${BOSS.BASE_HP} + wave × ${BOSS.HP_PER_WAVE}`,
        baseSpeed: 1.2
    },

    fireMage: {
        name: "Fire Mage",
        color: "#c0392b",
        size: 38,
        isBoss: false,
        emoji: "🔥",
        desc: "A pyromancer who turns the floor into lava.",
        behavior: "Holds range and casts burning ground hazards at you.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 5); },
        hpScale: "1 + floor((wave - 1) / 5)",
        baseSpeed: 1.4
    },

    necromancer: {
        name: "Necromancer",
        color: "#4a235a",
        size: 42,
        isBoss: false,
        emoji: "☠",
        desc: "Raises the dead to overwhelm you.",
        behavior: "Summons skeleton minions on cooldown.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 5); },
        hpScale: "2 + floor((wave - 1) / 5)",
        baseSpeed: 0.9
    },

    skeleton: {
        name: "Skeleton",
        color: "#d5d8dc",
        size: 32,
        isBoss: false,
        emoji: "💀",
        desc: "Undead fodder summoned by necromancers.",
        behavior: "Rushes the player quickly but dies easily.",
        hpAtWave(w) { return Math.max(1, Math.floor((1 + Math.floor((w - 1) / 3)) / 2)); },
        hpScale: "max(1, floor(grunt HP / 2))",
        baseSpeed: 3.2
    },

    lancer: {
        name: "Lancer",
        color: "#566573",
        size: 44,
        isBoss: false,
        desc: "A disciplined knight with shield and lance.",
        behavior: "Blocks hits with a shield, then thrusts or lunges.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 3); },
        hpScale: "1 + floor((wave - 1) / 3)",
        baseSpeed: 2
    },

    king: {
        name: "King",
        color: "#6a0dad",
        size: 130,
        isBoss: true,
        desc: "The arena's ruler. A multi-phase nightmare.",
        behavior: "Laser bursts, greatsword slashes, and elite summons at half HP.",
        hpAtWave(w) { return KING.HP; },
        hpScale: `${KING.HP} (fixed)`,
        baseSpeed: 0.8
    }

};