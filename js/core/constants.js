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
    OUTLINE_WIDTH: 4,
    ONYX_DAMAGE: 5
};

// =====================================
// Windrunner Anklet (shop item)
// =====================================
//
// Unlocked by defeating the Knight - a flat, always-on
// movement speed boost. Helps with kiting/repositioning
// around the King's laser sweeps and sword lunges.

const WINDRUNNER = {
    SPEED_MULTIPLIER: 1.2
};

// =====================================
// Knight's Locket (shop item)
// =====================================
//
// Also unlocked by defeating the Knight - each successful
// player hit (sword, bow, King's Blade laser) has a chance to
// charm the enemy it lands on, silencing its attack() for
// CHARM.DURATION_MS. Repeatable purchase, same idea as
// critRate: base chance on first purchase, +1% per upgrade
// after that, capped at CHARM.MAX. The King is immune (see
// King.charmImmune), same treatment as knockback immunity.

const CHARM = {
    DURATION_MS: 1500,
    BASE: 0.05,
    PER_UPGRADE: 0.01,
    MAX: 0.10
};

// =====================================
// Playable Classes
// =====================================
//
// Master list of playable classes, in the order the
// Armoury's arrows cycle through them. Each class file
// (entities/warrior.js, entities/ranger.js) registers its
// constructor in PLAYER_CLASSES (see game.js) under the same
// id. Adding a 3rd class = a new entry here, a new Player
// subclass file, and SHOP_ITEMS entries tagged with the new
// classId.

const CLASSES = [
    { id: "warrior", name: "Warrior" },
    { id: "ranger", name: "Ranger" }
];

// =====================================
// Ranger - Bow (class weapon)
// =====================================
//
// Unlike the Warrior's purchasable Shortbow item, this IS
// the Ranger's primary attack - hold attack to fire arrows
// on cooldown. Damage mirrors the sword's progression: 1
// base, doubled by the Stormpiercer the same way the King's
// Blade doubles the sword's base damage.

const RANGER_BOW = {
    COOLDOWN: 500,
    DAMAGE: 1,
    SPEED: 14,
    SIZE: 6,
    COLOR: "#2e8b57",
    FAN_SPREAD: 0.14
};

// =====================================
// Ranger - Shade Cloak (staged survivability)
// =====================================
//
// The Ranger's answer to the Warrior's shield line. Instead
// of blocking hits, dashing "phases" the Ranger - plain
// invulnerability frames granted off the shared dash.
// Tattered -> Shadow -> Phantom, with Phantom gated behind
// the Knight exactly like the Bulwark shield. Phantom also
// damages anything the dash passes through.

const CLOAK = {
    // Phase duration in real ms, indexed by equipped cloak
    // stage (index 0 = not owned/equipped).
    PHASE_MS: [0, 350, 600, 900],
    DASH_DAMAGE: 3,
    DASH_HIT_WIDTH: 50,
    GLOW_COLOR: "#9b59b6"
};

// =====================================
// Ranger - Dagger line (staged)
// =====================================
//
// Close-range panic button on [E] - the Ranger's version of
// the Warrior's purchasable bow (the second attack option
// outside the class weapon). Talon Dagger -> Shortsword
// (much longer reach) -> Venom Blade (stabs inject venom:
// 2 dmg every 0.3s, 6 total).

const DAGGER = {
    RANGE: 95,
    SHORTSWORD_RANGE: 180, // stage 2+
    ARC: Math.PI * 1.1,
    DAMAGE: 2,
    COOLDOWN: 1500,
    SWING_MS: 150,
    VENOM_DAMAGE_PER_TICK: 2,
    VENOM_TICKS: 3,
    VENOM_TICK_MS: 300
};

// =====================================
// Ranger - Emberweave Arrows
// =====================================
//
// The Ranger's wetStone-equivalent bow damage item: every
// arrow hit ignites the target for a short burn, roughly
// doubling an arrow's effective damage the way the wet
// stone doubles the sword's.

const EMBER_ARROWS = {
    BURN_DAMAGE_PER_TICK: 1,
    BURN_TICKS: 2,
    BURN_TICK_MS: 800
};

// =====================================
// Ranger - Falcon Quiver / Swiftdraw Gloves
// =====================================
//
// First-boss-tier power spikes for a kiting playstyle:
// arrows that punch through packed groups, and a flat bow
// fire-rate boost.

const FALCON_QUIVER = {
    // Total enemies one arrow can hit: pierces through the
    // first target into one more. (Was 3 - too much AOE.)
    PIERCE: 2
};

const SWIFTDRAW = {
    COOLDOWN_MULTIPLIER: 0.7
};

// =====================================
// Ranger - Hunter's Mark / Gale Recurve
// =====================================
//
// Knight-tier pair, same spirit as the Warrior's Locket +
// Anklet. Arrow hits mark the target for a few seconds;
// marked enemies take +50% damage (rounded up) from all of
// the Ranger's attacks. The Gale Recurve fans the bow into
// 2 arrows per shot.

const HUNTERS_MARK = {
    DURATION_MS: 4000,
    DAMAGE_MULTIPLIER: 1.5,
    COLOR: "gold"
};

const GALE_RECURVE = {
    ARROW_COUNT: 2
};

// =====================================
// Ranger - Stormpiercer (King-gated)
// =====================================
//
// The Ranger's King's Blade: upgrades base arrows to 2
// damage, and grants a right-click storm lance - an instant
// piercing line of lightning mirroring the King's Blade
// laser's numbers.

const STORMPIERCER = {
    BASE_DAMAGE: 2,
    LASER_COOLDOWN: 4000,
    LASER_DAMAGE: 5,
    LASER_DURATION: 200, // ms the lance is visible/active for
    LASER_WIDTH: 26,
    LASER_COLOR: "#b19cd9",
    ARROW_COLOR: "#8e7cc3"
};

// =====================================
// Coin Rewards
// =====================================

const COINS = {
    grunt: 1,
    tank: 2,
    archer: 2,
    runner: 3,
    boss: 50,
    fireMage: 3,
    necromancer: 4,
    skeleton: 1,
    lancer: 5,
    knight: 75,
    king: 150
};

// =====================================
// Armoury (Shop)
// =====================================
//
// Every item is tagged with the class whose kit it belongs
// to ("warrior" / "ranger"), or "shared" for the handful of
// global upgrades (crit). The Armoury only lists the
// currently selected class's items plus the shared ones.

// Items with a multi-stage purchase track (dedicated *Stage
// fields in Save instead of a plain inventory flag).
const STAGED_ITEM_IDS = ["shield", "bow", "cloak", "dagger"];

const SHOP_ITEMS = {

    // ----- Warrior -----

    shield: {
        classId: "warrior",
        get price() {
            return 0;
        },
        get name() {
            if (Save.shieldStage >= 3) return "Bulwark Shield";
            if (Save.shieldStage >= 1) return "Onyx Shield";
            return "Wooden Shield";
        },
        get desc() {
            if (Save.shieldStage >= 3) return "Blocks 2 hits, 1s invuln + AOE Nuke (5 dmg) each";
            if (Save.shieldStage >= 1) return "Blocks 1 hit, 1s invuln + AOE Nuke (5 dmg)";
            return "Blocks 1 hit + 1s invuln";
        },
        equippable: true
    },

    bow: {
        classId: "warrior",
        equippable: true,
        get price() {
            if (Save.bowStage === 1) return 0;
            if (Save.bowStage === 2) return 0;
            return 0;
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
        classId: "warrior",
        price: 0,
        name: "Wet Stone",
        desc: "Sword deals 2 damage",
        equippable: true
    },

    circleStrike: {
        classId: "warrior",
        price: 0,
        name: "Circle Strike",
        desc: "Sword goes around you",
        requiresFirstBoss: false,
        equippable: true
    },

    hermesShoes: {
        classId: "warrior",
        price: 0,
        name: "Hermes Shoes",
        desc: "Second dash charge",
        requiresFirstBoss: false,
        equippable: true
    },

    kingsBlade: {
        classId: "warrior",
        price: 0,
        name: "King's Blade",
        desc: "2 dmg sword + right-click laser (5 dmg, 4s cd)",
        requiresKingKilled: false,
        equippable: true
    },

    knightLocket: {
        classId: "warrior",
        price: 0,
        get name() {
            return "Knight's Locket";
        },
        get desc() {
            return `${Math.round(Save.getCharmChance() * 100)}% chance to charm enemies for 1.5s (silences their attack)`;
        },
        requiresKnightKilled: false,
        repeatable: true
    },

    windrunnerAnklet: {
        classId: "warrior",
        price: 0,
        name: "Windrunner Anklet",
        desc: "+20% movement speed",
        requiresKnightKilled: false,
        equippable: true
    },

    // ----- Ranger -----

    cloak: {
        classId: "ranger",
        get price() {
            return 0;
        },
        get name() {
            if (Save.cloakStage >= 3) return "Phantom Cloak";
            if (Save.cloakStage >= 1) return "Shadow Cloak";
            return "Tattered Cloak";
        },
        get desc() {
            if (Save.cloakStage >= 3) return "Dash phases 0.9s + deals 3 dmg to enemies dashed through";
            if (Save.cloakStage >= 1) return "Dash phases 0.6s (untouchable while phasing)";
            return "Dash phases 0.35s (untouchable while phasing)";
        },
        equippable: true
    },

    dagger: {
        classId: "ranger",
        equippable: true,
        get price() {
            return 0;
        },
        get name() {
            if (Save.daggerStage === 1) return "Shortsword";
            if (Save.daggerStage === 2) return "Venom Blade";
            return "Talon Dagger";
        },
        get desc() {
            if (Save.daggerStage === 1) return "Much longer reach on the stab";
            if (Save.daggerStage === 2) return "Stabs inject venom — 2 dmg every 0.3s (6 total)";
            return "Press E — 2 dmg close-range stab (1.5s cd)";
        }
    },

    emberArrows: {
        classId: "ranger",
        price: 0,
        name: "Emberweave Arrows",
        desc: "Arrow hits ignite enemies — 2 burn dmg over ~1.5s",
        equippable: true
    },

    falconQuiver: {
        classId: "ranger",
        price: 0,
        name: "Falcon Quiver",
        desc: "Arrows pierce through 1 enemy",
        requiresFirstBoss: true,
        equippable: true
    },

    swiftdrawGloves: {
        classId: "ranger",
        price: 0,
        name: "Swiftdraw Gloves",
        desc: "Bow fires ~40% faster",
        requiresFirstBoss: true,
        equippable: true
    },

    huntersMark: {
        classId: "ranger",
        price: 0,
        name: "Hunter's Mark",
        desc: "Arrow hits mark enemies — marked take +50% damage for 4s",
        requiresKnightKilled: true,
        equippable: true
    },

    galeRecurve: {
        classId: "ranger",
        price: 0,
        name: "Gale Recurve",
        desc: "Bow fires 2 arrows in a fan",
        requiresKnightKilled: true,
        equippable: true
    },

    stormpiercer: {
        classId: "ranger",
        price: 0,
        name: "Stormpiercer",
        desc: "2 dmg arrows + right-click storm lance (5 dmg, 4s cd)",
        requiresKingKilled: true,
        equippable: true
    },

    // ----- Shared -----

    critRate: {
        classId: "shared",
        price: 0,
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
        HP_MULTIPLIER: 1.5,

        // How much faster (and for how long, in ms) a tank
        // moves right after spawning in, so it can actually
        // reach the player and start tanking hits instead of
        // lagging behind the rest of the wave.
        ENTRY_BOOST_MULTIPLIER: 2.75,
        ENTRY_BOOST_DURATION: 2000

    },

    archer: {

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
    archer: "an Archer",
    runner: "a Runner",
    boss: "the Castle Guard",
    fireMage: "a Fire Mage",
    necromancer: "a Necromancer",
    skeleton: "a Skeleton",
    lancer: "a Lancer",
    knight: "the Knight",
    king: "the King"

};

// =====================================
// Elite Modifier
// =====================================
//
// Elites aren't a new class - makeElite()
// in entities/elite.js buffs an existing
// enemy instance and flags it. Applies to
// grunt/tank/archer/runner, not the boss.

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
    HP_PER_WAVE: 2.5,

    ATTACK_COOLDOWN: 100,

    PROJECTILE_COUNT: 12,
    PROJECTILE_SPEED: 8,
    PROJECTILE_COLOR: "#ff4500"

};

// =====================================
// Knight (Wave 10 Boss)
// =====================================
//
// A mirror match - a boss-tier version of the player
// himself. Same core kit as the player (sword swing, a
// gap-closing dash) but built to be relentless rather than
// fair: hits harder, and doesn't wait around for an opening
// once it's in range.

const KNIGHT = {

    SIZE: 50,
    SPEED: 3,
    COLOR: "#34495e",

    BASE_HP: 70,
    HP_PER_WAVE: 4,

    // Sword - same swing shape as the player's (angle, arc,
    // progress-driven hitbox), just longer and slower to
    // wind down so it reads as a heavier weapon
    SWORD_LENGTH: 130,
    SWORD_ARC: Math.PI * 1.2,
    SWING_DURATION: 20,
    SWING_COOLDOWN: 1150,

    // Dashes in from range like the player's own dash
    DASH_TRIGGER_RANGE: 130,
    DASH_SPEED: 12,
    DASH_DURATION: 14,
    DASH_COOLDOWN: 1900,

    // Bow - the player's own shortbow
    BOW_ARROW_COUNT: 7,
    BOW_SPREAD: 0.26,
    BOW_COOLDOWN: 2500,
    BOW_SPEED: 10,
    BOW_SIZE: 6,
    BOW_COLOR: "#8b6914"

};

// =====================================
// King (Wave 20 Boss)
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
    SET2_END: 19,

    // Previously dampened tank/archer/runner counts back down
    // after wave 5 (0.35x). Difficulty pass: no more dampening -
    // every non-grunt type keeps scaling up past wave 5.
    SET1_SCALE_AFTER: 1,

    START_GRUNTS: 5,
    GRUNTS_PER_WAVE: 2,

    // Global spawn-count dial. 1.0 = original counts, 0.4 =
    // ~60% fewer enemies per wave. Applied in getSet1Counts()
    // and getSet2Counts() in wave.js.
    SPAWN_SCALE: 0.4,

    // Lower "every N waves" divisors = more of that unit per
    // wave. Tightened across the board for a much harder ramp.
    TANK_EVERY: 1.5,

    ARCHER_UNLOCK_WAVE: 2,
    ARCHER_EVERY: 1,

    RUNNER_UNLOCK_WAVE: 3,
    RUNNER_EVERY: 2,

    BOSS_WAVE: 5,
    KNIGHT_WAVE: 10,
    KING_WAVE: 15,
    BOSS_ESCORT_GRUNTS: 8,
    BOSS_ESCORT_TANKS: 4,

    TRANSITION_TIME: 1500,

    // Small pause after one enemy type finishes its spawn
    // sequence and before the next type starts, so waves read
    // as distinct "tanks, then archers, then runners" beats
    // instead of one continuous blur.
    TYPE_TRANSITION_GAP: 700

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
//
// Page 0 of the bestiary is a grid of the normal enemies;
// every boss then gets its own dedicated page (with lore),
// flipped through with arrows like the Armoury's class
// selector.

const BESTIARY_NORMAL_ORDER = [
    "grunt", "tank", "archer", "runner",
    "fireMage", "necromancer", "skeleton", "lancer"
];

const BESTIARY_BOSS_ORDER = ["boss", "knight", "king"];

const BESTIARY = {

    grunt: {
        name: "Grunt",
        color: "red",
        size: 40,
        isBoss: false,
        desc: "The arena's cannon fodder. Slow-witted but relentless.",
        behavior: "Walks straight toward you for a melee hit.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 6); },
        hpScale: "1 + floor((wave - 1) / 6)",
        baseSpeed: 2
    },

    tank: {
        name: "Tank",
        color: "darkred",
        size: 70,
        isBoss: false,
        desc: "A hulking bruiser that soaks up punishment.",
        behavior: "Slow chase. Immune to knockback.",
        hpAtWave(w) { return 3 + Math.floor((w - 1) / 3); },
        hpScale: "3 + floor((wave - 1) / 3)",
        baseSpeed: 1
    },

    archer: {
        name: "Archer",
        color: "#8B4513",
        size: 36,
        isBoss: false,
        desc: "Keeps its distance and peppers you with arrows.",
        behavior: "Kites at range, firing arrows on cooldown.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 10); },
        hpScale: "1 + floor((wave - 1) / 10)",
        baseSpeed: 1.6
    },

    runner: {
        name: "Runner",
        color: "orange",
        size: 30,
        isBoss: false,
        desc: "Fast and fragile — closes gaps in a blink.",
        behavior: "Chases you, then periodically triples speed in a charge.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 10); },
        hpScale: "1 + floor((wave - 1) / 10)",
        baseSpeed: 3
    },

    boss: {
        name: "Castle Guard",
        color: "#8b0000",
        size: 120,
        isBoss: true,
        desc: "The wave 5 gatekeeper. Fights up close and at range.",
        behavior: "Fires a radial burst, then dashes at the player.",
        lore: "Sworn to hold the arena gate long after the kingdom that built it crumbled to dust. He no longer remembers what he is guarding — only that no one may pass. The rusted weapons of a hundred fallen challengers litter the ground before his post.",
        hpAtWave(w) { return BOSS.BASE_HP + w * BOSS.HP_PER_WAVE; },
        hpScale: `${BOSS.BASE_HP} + wave × ${BOSS.HP_PER_WAVE}`,
        baseSpeed: 1.2
    },

    knight: {
        name: "Knight",
        color: "#34495e",
        size: 50,
        isBoss: true,
        desc: "The wave 10 gatekeeper - a boss-tier mirror of yourself.",
        behavior: "Dashes to close distance, then swings a heavy sword.",
        lore: "The arena's first champion, knighted by the King himself for surviving every wave. When he knelt and begged leave to rest, the King refused. Now he fights on without end — a mirror held up to every challenger who dreams the same dream he once did.",
        hpAtWave(w) { return KNIGHT.BASE_HP + w * KNIGHT.HP_PER_WAVE; },
        hpScale: `${KNIGHT.BASE_HP} + wave × ${KNIGHT.HP_PER_WAVE}`,
        baseSpeed: 3
    },

    fireMage: {
        name: "Fire Mage",
        color: "#c0392b",
        size: 38,
        isBoss: false,
        emoji: "🔥",
        desc: "A pyromancer who turns the floor into lava.",
        behavior: "Holds range and casts burning ground hazards at you.",
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 10); },
        hpScale: "1 + floor((wave - 1) / 10)",
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
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 10); },
        hpScale: "2 + floor((wave - 1) / 10)",
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
        hpAtWave(w) { return Math.max(1, Math.floor((1 + Math.floor((w - 1) / 6)) / 2)); },
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
        hpAtWave(w) { return 1 + Math.floor((w - 1) / 6); },
        hpScale: "1 + floor((wave - 1) / 6)",
        baseSpeed: 2
    },

    king: {
        name: "King",
        color: "#6a0dad",
        size: 130,
        isBoss: true,
        desc: "The arena's ruler. A multi-phase nightmare.",
        behavior: "Laser bursts, greatsword slashes, and elite summons at half HP.",
        lore: "The mad monarch who turned his own throne room into an arena for his amusement. Wave after wave he watches from above, bored of victories bought with other men's blood. Those his soldiers cannot break, he descends to break himself — greatsword in hand, crown ablaze.",
        hpAtWave(w) { return KING.HP; },
        hpScale: `${KING.HP} (fixed)`,
        baseSpeed: 0.8
    }

};