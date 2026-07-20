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
    SPEED: 3.5,
    COLOR: "lime",

    // Sprite sheet: 6 frames of a walk cycle, 256x256 each.
    // Frame index 2 (the 3rd frame) is the standing-still pose.
    SPRITE_FRAME_SIZE: 256,
    SPRITE_FRAME_COUNT: 6,
    SPRITE_IDLE_FRAME: 2,
    SPRITE_FRAME_DURATION: 129, // ms per frame while walking

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
    LENGTH: 130,
    DURATION: 21.4,
    ARC: Math.PI * 1.2,
    DAMAGE: 2,
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

    BASE_DAMAGE: 3,
    WETSTONE_BONUS: 1,

    // A bit longer than the base sword's 130px, nowhere near
    // the King's own 320px greatsword.
    LENGTH: 150,

    // Right-click laser ability
    LASER_COOLDOWN: 5714,
    LASER_DAMAGE: 5,
    LASER_DURATION: 286, // ms the beam is visible/active for
    LASER_WIDTH: 30,
    LASER_COLOR: "#00bfff"

};

// =====================================
// Bow (shop item)
// =====================================

const BOW = {
    COOLDOWN: 2857,
    DAMAGE: 2,
    SPEED: 9.8,
    SIZE: 6,
    COLOR: "#8b6914",
    FAN_SPREAD: 0.18
};

// =====================================
// Shield (shop item)
// =====================================

const SHIELD = {
    INVULN_MS: 1429,
    OUTLINE_COLOR: "#4da6ff",
    OUTLINE_WIDTH: 4,
    ONYX_DAMAGE: 5
};

// =====================================
// Warrior - Berserker Medallion (Castle Guard tier)
// =====================================
//
// The Warrior's damage passive, filling the same slot as the
// Thief's Master of the Blade: consecutive sword swings that
// connect build Rage, each stack adding flat sword damage.
// Rage fades if no swing lands within the window, so it
// rewards staying committed in melee - the Warrior's whole
// identity - rather than poking and running.

const RAGE = {
    BONUS_PER_STACK: 1,
    MAX_STACKS: 3,
    WINDOW_MS: 2857
};

// =====================================
// Warrior - Forgemaster's Sigil (Castle Guard tier)
// =====================================
//
// The Warrior's survivability passive: a broken shield
// reforges itself after a delay instead of staying gone for
// the rest of the run. Each reforged Onyx block still procs
// the nuke, so it doubles as slow-drip damage in long boss
// fights.

const FORGE_SIGIL = {
    REFORGE_MS: 11429
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
    DURATION_MS: 2143,
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
    { id: "ranger", name: "Ranger" },
    { id: "thief", name: "Thief" },
    { id: "mage", name: "Mage" }
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
    COOLDOWN: 714,
    DAMAGE: 1,
    SPEED: 9.8,
    SIZE: 6,
    COLOR: "#2e8b57",
    FAN_SPREAD: 0.14
};

// =====================================
// Ranger - Bracelet line (staged)
// =====================================
//
// The Ranger's dash-utility item: Iron -> Wind -> Sylph's
// Bracelet, each stage trimming down the shared dash's
// cooldown - 20% / 35% / 50% off, with the Sylph's Bracelet
// gated behind the Knight exactly like the Bulwark shield.

const BRACELET = {
    // Cooldown reduction, indexed by equipped bracelet stage
    // (index 0 = not owned/equipped).
    COOLDOWN_REDUCTION: [0, 0.2, 0.35, 0.5]
};

// =====================================
// Ranger - Dagger line (staged)
// =====================================
//
// Close-range panic button on [E] - the Ranger's version of
// the Warrior's purchasable bow (the second attack option
// outside the class weapon). Talon Dagger -> Shortsword
// (much longer reach) -> Venom Blade (stabs inject venom:
// 2 dmg every ~0.4s, 6 total).

const DAGGER = {
    RANGE: 95,
    SHORTSWORD_RANGE: 180, // stage 2+
    ARC: Math.PI * 1.1,
    DAMAGE: 2,
    COOLDOWN: 2143,
    SWING_MS: 214,
    VENOM_DAMAGE_PER_TICK: 2,
    VENOM_TICKS: 3,
    VENOM_TICK_MS: 429
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
    BURN_TICK_MS: 1143
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
    DURATION_MS: 5714,
    DAMAGE_MULTIPLIER: 1.5,
    COLOR: "gold"
};

const GALE_RECURVE = {
    ARROW_COUNT: 2
};

// =====================================
// Ranger - Stormfletch Arrows (Royal Magus tier)
// =====================================
//
// Splinters of the Magus' own lightning bound to the
// arrowheads. Every arrow hit arcs a bolt to the nearest
// OTHER enemy for a little damage - the swarm-clear the
// single-target bow lacks. If the struck target is under a
// Hunter's Mark, the bolt escalates into a small AOE strike
// on it instead (a payoff for the Knight-tier mark).

const STORMFLETCH = {
    CHAIN_DAMAGE: 1,
    CHAIN_RANGE: 230,
    STRIKE_DAMAGE: 2,
    STRIKE_RADIUS: 70,
    COLOR: "#bcd0ff"
};

// =====================================
// Ranger - Cyclone Veil (Royal Magus tier)
// =====================================
//
// The Magus' Wind Gust bottled into a charm. Dashing
// releases an outward gust that shoves nearby enemies away -
// the disengage a cornered kiter otherwise lacks. Pure
// displacement, no damage; anchored foes (tanks, casters,
// bosses - anything knockback-immune) plant their feet and
// ignore it.

const CYCLONE_VEIL = {
    RADIUS: 190,
    KNOCKBACK_FORCE: 20
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
    LASER_COOLDOWN: 5714,
    LASER_DAMAGE: 5,
    LASER_DURATION: 286, // ms the lance is visible/active for
    LASER_WIDTH: 26,
    LASER_COLOR: "#b19cd9",
    ARROW_COLOR: "#8e7cc3"
};

// =====================================
// Thief - Cloak (staged)
// =====================================
//
// Moved over from the Ranger, keeping its original effect -
// dashing "phases" the Thief, plain invulnerability frames
// granted off the shared dash. Tattered -> Shadow -> Phantom,
// with Phantom gated behind the Knight exactly like the
// Bulwark shield. Phantom also damages anything the dash
// passes through.

const CLOAK = {
    // Phase duration in real ms, indexed by equipped cloak
    // stage (index 0 = not owned/equipped).
    PHASE_MS: [0, 500, 857, 1286],
    DASH_DAMAGE: 3,
    DASH_HIT_WIDTH: 50,
    GLOW_COLOR: "#9b59b6"
};

// =====================================
// Thief - Dual Daggers (class weapon)
// =====================================
//
// The Thief's primary attack, like the Ranger's bow - a much
// shorter, much faster version of the Warrior's sword swing:
// 60% of the sword's reach, and noticeably faster to swing
// (though eased back a smidge from a flat 2x). Base damage
// mirrors the Warrior's kit progression: 1 base, doubled by
// the Serrated Blade the same way Wet Stone bumps the sword.
//
// Visually the Thief wields two daggers, alternating sides
// each swing (left, then right) - SIDE_OFFSET is how far off
// the aim angle each blade is drawn.

const THIEF_DAGGER = {
    RANGE: Math.round(SWORD.LENGTH * 0.6),
    ARC: SWORD.ARC,
    DAMAGE: 1,
    SWING_DURATION: SWORD.DURATION * 0.6,
    SIDE_OFFSET: 0.18
};

// =====================================
// Thief - Throwing Knife line (staged)
// =====================================
//
// The Thief's ranged secondary on [E] - Throwing Knife (slow)
// -> Wind Knife (fast, +1 dmg) -> Heart Stealer (same speed/
// damage as Wind Knife, but pressing [E] again within the
// window below - without affecting the knife's own cooldown -
// blinks the Thief to wherever the knife ended up, with a
// half-second of invulnerability). Range is capped well short
// of arrow range - about half the screen - computed at throw
// time from the current canvas width (RANGE_FRACTION) rather
// than a fixed pixel value, so it scales with resolution.

const THROWING_KNIFE = {
    RANGE_FRACTION: 0.5,
    DAMAGE_BASE: 2,
    DAMAGE_UPGRADED: 3, // Wind Knife / Heart Stealer
    SPEED_SLOW: 4.9,
    SPEED_FAST: 14,
    COOLDOWN: 1571,
    SIZE: 5,
    COLOR: "#c0392b",
    TELEPORT_WINDOW_MS: 2857,
    TELEPORT_INVULN_MS: 429
};

// =====================================
// Thief - Thief's Wit
// =====================================
//
// A passive momentum reward: landing any hit (dagger or
// knife) grants a short burst of movement + attack speed,
// refreshed on every subsequent hit so staying aggressive
// keeps it topped up.

const THIEFS_WIT = {
    SPEED_BONUS: 0.3,
    ATTACK_SPEED_BONUS: 0.2,
    DURATION_MS: 2857
};

// =====================================
// Thief - Void Enchant (Castle Guard tier)
// =====================================
//
// Hitting an enemy marks it with a purple glow that stores
// every subsequent hit of damage it takes over the next
// ~1.4s, then detonates - dealing the stored total as AOE
// damage to everyone in a fire-mage-sized radius (see
// HAZARD.FIRE_RADIUS in thief.js's use of it).

const VOID_ENCHANT = {
    STORE_DURATION_MS: 1429,
    MARK_COLOR: "#8e44ad"
};

// =====================================
// Thief - Master of the Blade (Castle Guard tier)
// =====================================
//
// Every 3rd dagger swing unleashes a flurry in front of the
// Thief - 4 extra hits over ~0.6s (one every ~0.14s),
// independent of whether the triggering swing itself
// connected.

const MASTER_OF_BLADE = {
    TRIGGER_EVERY: 3,
    TICK_DAMAGE: 2,
    TICKS: 4,
    TICK_MS: 143
};

// =====================================
// Thief - Serrated Blade (Knight tier)
// =====================================
//
// The Thief's wetStone-equivalent - a flat damage bump to the
// dagger's base hit.

const SERRATED_BLADE = {
    BONUS_DAMAGE: 1
};

// =====================================
// Thief - Thief's Pocket Watch (Knight tier)
// =====================================
//
// Every landed hit (dagger, storm burst, knife, dash-through)
// shaves a little off whichever of the Thief's cooldowns are
// currently ticking - the knife's and the shared dash's.

const POCKET_WATCH = {
    COOLDOWN_REDUCTION_MS: 71
};

// =====================================
// Thief - Voltaic Fang (Royal Magus tier)
// =====================================
//
// The daggers are strung with the Magus' storm: EVERY dagger
// swing that connects fires a lightning chain from the struck
// foe, leaping through up to JUMPS more nearby enemies for
// CHAIN_DAMAGE each. No charge, no cooldown, no RNG - it goes
// off on every hit. Jumps only to OTHER enemies, so a lone
// boss gains it nothing (no single-target creep) while a
// packed wave melts.

const VOLTAIC_FANG = {
    JUMPS: 3,
    CHAIN_DAMAGE: 2,
    JUMP_RANGE: 175,
    COLOR: "#bcd0ff"
};

// =====================================
// Thief - Leyline Snare (Royal Magus tier)
// =====================================
//
// Etched onto the throwing knife: where it lands it tears
// open a short-lived gravity well that drags nearby enemies
// toward its heart, clustering the pack for a Void Enchant
// detonation, a dagger flurry, or a Heart Stealer blink into
// the middle of them. Bosses are too heavy to drag.

const LEYLINE_SNARE = {
    RADIUS: 155,
    PULL_STRENGTH: 1.6,
    DURATION_MS: 1286,
    COLOR: "#7b5cd6"
};

// =====================================
// Thief - Moonlight Daggers (King tier)
// =====================================
//
// The Thief's ultimate: +1 dagger damage (stacks with Serrated
// Blade), a second dash charge, and every dagger swing leaves
// a lingering purple flame patch at the point of attack -
// anyone standing in it takes a tick of damage every ~1.4s
// for as long as it lingers.

const MOONLIGHT_DAGGERS = {
    BONUS_DAMAGE: 1,
    TRAIL_RADIUS: 45,
    TRAIL_DURATION_MS: 4286,
    TRAIL_TICK_MS: 1429,
    TRAIL_TICK_DAMAGE: 1,
    TRAIL_COLOR: "#b967ff"
};

// =====================================
// Mage (4th class) - a Light-element, dashless zone-caster
// =====================================
//
// The Mage's whole identity: it has NO dash. Its only defense
// is the Halo ward. Its basic attack (Sunbeam) is not a
// projectile - it strikes light down at the CURSOR on a long,
// charge-based cooldown (like the dash's charges). Every item
// piles onto that cursor-cast or the [E] light orb. All Light-
// themed. Times are real ms (no GAME_SPEED); speeds are
// per-frame (×timeScale).

const MAGE = {

    // Sunbeam - the free basic. A radiant strike placed at the
    // aimed point. Long per-charge recharge (heavy artillery,
    // not spam); charge-based like the dash. Refraction adds a
    // 2nd charge (see below), Hermes-Shoes style.
    SUNBEAM_COOLDOWN: 2000,
    SUNBEAM_DAMAGE: 2,
    SUNBEAM_RADIUS: 60,

    // On touch devices there's no cursor, so the strike lands
    // this far along the aim direction instead.
    SUNBEAM_CAST_DISTANCE: 300,

    COLOR: "#fff3b0"

};

// Halo - staged survivability ward. Blocks one hit, then
// recharges over RECHARGE_MS[stage]. Stage 3 (Radiant Halo)
// is Knight-gated and recharges fastest. Because the Mage has
// no dash, this is its entire defensive kit.
const HALO = {
    RECHARGE_MS: [0, 8000, 5500, 4000],  // indexed by stage
    BLOCK_INVULN_MS: 500,
    COLOR: "#fff0b0"
};

// Sunburst - staged [E]: a lobbed orb of light that bursts in
// a big AOE where it lands.
const SUNBURST = {
    COOLDOWN: 3000,
    DAMAGE: [0, 6, 9, 12],   // indexed by stage
    RADIUS: [0, 90, 110, 130],

    // Snappy travel so it isn't dead time - and aiming at your
    // own feet means ~zero travel, turning it into an instant
    // panic nova. That shove is the point: it's the only way a
    // dashless Mage makes space.
    TRAVEL_SPEED: 16,
    KNOCKBACK: 22,

    COLOR: "#ffe066"
};

// Sunstone - single unlocked passive: bolsters every Sunbeam.
const SUNSTONE = {
    BONUS_DAMAGE: 2,
    BONUS_RADIUS: 18
};

// Refraction (Castle Guard) - a 2nd Sunbeam charge, exactly
// like Hermes Shoes granting a 2nd dash. Fire two casts back
// to back, each recharging on its own timer.
const REFRACTION = {
    EXTRA_CHARGES: 1
};

// Solar Attunement (Castle Guard) - faster Sunbeam recharge.
const SOLAR_ATTUNEMENT = {
    COOLDOWN_MULTIPLIER: 0.7
};

// Radiant Overload (Knight) - every 3rd Sunbeam overcharges
// into a much bigger, harder strike.
const RADIANT_OVERLOAD = {
    EVERY: 3,
    DAMAGE_MULT: 2,
    RADIUS_MULT: 1.8
};

// Radiant Bloom (Knight) - Sunbeam becomes a sunflower: the
// main strike at the cursor plus a ring of PETALS smaller
// strikes around it.
const RADIANT_BLOOM = {
    PETALS: 6,
    PETAL_DISTANCE: 72,
    PETAL_DAMAGE_MULT: 0.5,
    PETAL_RADIUS_MULT: 0.6
};

// Sanctuary (Magus) - the Sunburst [E] leaves a lingering
// radiant field that denies that ground.
const SANCTUARY = {
    DURATION_MS: 2500,
    TICK_MS: 800,
    TICK_DAMAGE: 1
};

// Corona (Magus) - a radiant aura that burns enemies who get
// close. Keep-away for the immobile caster + passive clear.
const CORONA = {
    RADIUS: 95,
    TICK_MS: 800,
    TICK_DAMAGE: 1,
    COLOR: "#ffd24d"
};

// Sovereign's Scepter (King) - +Sunbeam damage, and a right-
// click royal barrage: a radial burst of light beams, the
// King's own laser-wall turned against him.
const SOVEREIGN_SCEPTER = {
    BONUS_DAMAGE: 1,
    BARRAGE_COOLDOWN: 10000,
    BARRAGE_DURATION: 286,   // ms the beams are visible/active
    BARRAGE_DAMAGE: 3,
    BEAM_COUNT: 6,
    BEAM_WIDTH: 26,
    COLOR: "#ffe066"
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
    shade: 6,
    frostWeaver: 7,
    powderKeg: 4,
    bloodCleric: 8,
    knight: 75,
    royalMagus: 110,
    king: 150
};

// =====================================
// Armoury (Shop)
// =====================================
//
// Every item is tagged with the class whose kit it belongs
// to (a CLASSES id), or "shared" for the handful of
// global upgrades (crit). The Armoury only lists the
// currently selected class's items plus the shared ones.

// Items with a multi-stage purchase track (dedicated *Stage
// fields in Save instead of a plain inventory flag).
const STAGED_ITEM_IDS = ["shield", "bow", "cloak", "dagger", "throwingKnife", "bracelet", "halo", "sunburst"];

const SHOP_ITEMS = {

    // ----- Warrior -----

    shield: {
        classId: "warrior",
        get price() {
            return [25, 60, 360][Save.shieldStage] ?? 0;
        },
        get name() {
            if (Save.equippedShieldStage >= 3) return "Bulwark Shield";
            if (Save.equippedShieldStage === 2) return "Onyx Shield";
            return "Wooden Shield";
        },
        get desc() {
            if (Save.equippedShieldStage >= 3) return "Blocks 2 hits, 1.4s invuln + AOE Nuke (5 dmg) each";
            if (Save.equippedShieldStage >= 1) return "Blocks 1 hit, 1.4s invuln + AOE Nuke (5 dmg)";
            return "Blocks 1 hit + 1.4s invuln";
        },
        equippable: true
    },

    bow: {
        classId: "warrior",
        equippable: true,
        get price() {
            return [25, 60, 120][Save.bowStage] ?? 0;
        },
        get name() {
            if (Save.equippedBowStage >= 3) return "Multishot II";
            if (Save.equippedBowStage === 2) return "Multishot I";
            return "Shortbow";
        },
        get desc() {
            if (Save.equippedBowStage >= 3) return "Bow fires 3 arrows in a fan";
            if (Save.equippedBowStage === 2) return "Bow fires 2 arrows in a fan";
            return "Press E — 2 dmg arrow (2.9s cd)";
        }
    },

    wetStone: {
        classId: "warrior",
        price: 30,
        name: "Wet Stone",
        desc: "Sword deals +1 damage",
        equippable: true
    },

    circleStrike: {
        classId: "warrior",
        price: 150,
        name: "Circle Strike",
        desc: "Sword goes around you",
        requiresFirstBoss: true,
        equippable: true
    },

    hermesShoes: {
        classId: "warrior",
        price: 160,
        name: "Hermes Shoes",
        desc: "Second dash charge",
        requiresFirstBoss: true,
        equippable: true
    },

    berserkerMedallion: {
        classId: "warrior",
        price: 240,
        name: "Berserker Medallion",
        desc: "Sword hits build Rage — +1 sword dmg per stack (max +3), fades after ~2.9s",
        requiresKnightKilled: true,
        equippable: true
    },

    forgeSigil: {
        classId: "warrior",
        price: 240,
        name: "Forgemaster's Sigil",
        desc: "A broken shield reforges itself after ~11.4s",
        requiresKnightKilled: true,
        equippable: true
    },

    kingsBlade: {
        classId: "warrior",
        price: 750,
        name: "King's Blade",
        desc: "3 dmg sword + right-click laser (5 dmg, 5.7s cd)",
        requiresKingKilled: true,
        equippable: true
    },

    knightLocket: {
        classId: "warrior",
        get price() {
            return 120 + Save.knightLocketLevel * 60;
        },
        get name() {
            return "Knight's Locket";
        },
        get desc() {
            return `${Math.round(Save.getCharmChance() * 100)}% chance to charm enemies for ~2.1s (silences their attack)`;
        },
        requiresKnightKilled: true,
        repeatable: true
    },

    windrunnerAnklet: {
        classId: "warrior",
        price: 220,
        name: "Windrunner Anklet",
        desc: "+20% movement speed",
        requiresKnightKilled: true,
        equippable: true
    },

    // ----- Ranger -----

    bracelet: {
        classId: "ranger",
        get price() {
            return [25, 60, 360][Save.braceletStage] ?? 0;
        },
        get name() {
            if (Save.equippedBraceletStage >= 3) return "Sylph's Bracelet";
            if (Save.equippedBraceletStage === 2) return "Wind Bracelet";
            return "Iron Bracelet";
        },
        get desc() {
            if (Save.equippedBraceletStage >= 3) return "-50% dash cooldown";
            if (Save.equippedBraceletStage === 2) return "-35% dash cooldown";
            return "-20% dash cooldown";
        },
        equippable: true
    },

    dagger: {
        classId: "ranger",
        equippable: true,
        get price() {
            return [25, 60, 120][Save.daggerStage] ?? 0;
        },
        get name() {
            if (Save.equippedDaggerStage >= 3) return "Venom Blade";
            if (Save.equippedDaggerStage === 2) return "Shortsword";
            return "Talon Dagger";
        },
        get desc() {
            if (Save.equippedDaggerStage >= 3) return "Stabs inject venom — 2 dmg every ~0.4s (6 total)";
            if (Save.equippedDaggerStage === 2) return "Much longer reach on the stab";
            return "Press E — 2 dmg close-range stab (2.1s cd)";
        }
    },

    emberArrows: {
        classId: "ranger",
        price: 30,
        name: "Emberweave Arrows",
        desc: "Arrow hits ignite enemies — 2 burn dmg over ~2.3s",
        equippable: true
    },

    falconQuiver: {
        classId: "ranger",
        price: 150,
        name: "Falcon Quiver",
        desc: "Arrows pierce through 1 enemy",
        requiresFirstBoss: true,
        equippable: true
    },

    swiftdrawGloves: {
        classId: "ranger",
        price: 150,
        name: "Swiftdraw Gloves",
        desc: "Bow fires ~43% faster",
        requiresFirstBoss: true,
        equippable: true
    },

    huntersMark: {
        classId: "ranger",
        price: 240,
        name: "Hunter's Mark",
        desc: "Arrow hits mark enemies — marked take +50% damage for ~5.7s",
        requiresKnightKilled: true,
        equippable: true
    },

    galeRecurve: {
        classId: "ranger",
        price: 220,
        name: "Gale Recurve",
        desc: "Bow fires 2 arrows in a fan",
        requiresKnightKilled: true,
        equippable: true
    },

    stormfletch: {
        classId: "ranger",
        price: 400,
        name: "Stormfletch Arrows",
        desc: "Arrow hits arc lightning to a nearby enemy; marked targets take a small AOE strike",
        requiresMagusKilled: true,
        equippable: true
    },

    cycloneVeil: {
        classId: "ranger",
        price: 380,
        name: "Cyclone Veil",
        desc: "Dashing shoves nearby (non-heavy) enemies away",
        requiresMagusKilled: true,
        equippable: true
    },

    stormpiercer: {
        classId: "ranger",
        price: 750,
        name: "Stormpiercer",
        desc: "2 dmg arrows + right-click storm lance (5 dmg, 5.7s cd)",
        requiresKingKilled: true,
        equippable: true
    },

    // ----- Thief -----

    cloak: {
        classId: "thief",
        get price() {
            return [25, 60, 360][Save.cloakStage] ?? 0;
        },
        get name() {
            if (Save.equippedCloakStage >= 3) return "Phantom Cloak";
            if (Save.equippedCloakStage === 2) return "Shadow Cloak";
            return "Tattered Cloak";
        },
        get desc() {
            if (Save.equippedCloakStage >= 3) return "Dash phases 1.3s + deals 3 dmg to enemies dashed through";
            if (Save.equippedCloakStage === 2) return "Dash phases 0.9s (untouchable while phasing)";
            return "Dash phases 0.5s (untouchable while phasing)";
        },
        equippable: true
    },

    throwingKnife: {
        classId: "thief",
        equippable: true,
        get price() {
            return [25, 60, 120][Save.throwingKnifeStage] ?? 0;
        },
        get name() {
            if (Save.equippedThrowingKnifeStage >= 3) return "Heart Stealer";
            if (Save.equippedThrowingKnifeStage === 2) return "Wind Knife";
            return "Throwing Knife";
        },
        get desc() {
            if (Save.equippedThrowingKnifeStage >= 3) return "Press E again within ~2.9s to blink to the knife";
            if (Save.equippedThrowingKnifeStage === 2) return "3 dmg, much faster throw";
            return "Press E — 2 dmg slow knife toss";
        }
    },

    thiefsWit: {
        classId: "thief",
        price: 30,
        name: "Thief's Wit",
        desc: "Hits grant +30% move speed, +20% attack speed for ~2.9s",
        equippable: true
    },

    voidEnchant: {
        classId: "thief",
        price: 160,
        name: "Void Enchant",
        desc: "Hits mark enemies - stored damage explodes in an AOE after ~1.4s",
        requiresFirstBoss: true,
        equippable: true
    },

    masterOfBlade: {
        classId: "thief",
        price: 160,
        name: "Master of the Blade",
        desc: "Every 3rd dagger swing unleashes 4 cuts (2 dmg each) in ~0.6s",
        requiresFirstBoss: true,
        equippable: true
    },

    serratedBlade: {
        classId: "thief",
        price: 220,
        name: "Serrated Blade",
        desc: "Dagger deals 1 more base damage",
        requiresKnightKilled: true,
        equippable: true
    },

    pocketWatch: {
        classId: "thief",
        price: 220,
        name: "Thief's Pocket Watch",
        desc: "Landing a hit shaves 0.07s off your active cooldowns",
        requiresKnightKilled: true,
        equippable: true
    },

    voltaicFang: {
        classId: "thief",
        price: 400,
        name: "Voltaic Fang",
        desc: "Every dagger hit chains lightning through up to 3 nearby enemies (2 dmg each)",
        requiresMagusKilled: true,
        equippable: true
    },

    leylineSnare: {
        classId: "thief",
        price: 380,
        name: "Leyline Snare",
        desc: "Your thrown knife tears a vortex that pulls enemies together",
        requiresMagusKilled: true,
        equippable: true
    },

    moonlightDaggers: {
        classId: "thief",
        price: 750,
        name: "Moonlight Daggers",
        desc: "+1 dagger dmg, a 2nd dash charge, and swings leave a flame trail (1 dmg per ~1.4s)",
        requiresKingKilled: true,
        equippable: true
    },

    // ----- Mage -----

    halo: {
        classId: "mage",
        get price() {
            return [25, 60, 360][Save.haloStage] ?? 0;
        },
        get name() {
            if (Save.equippedHaloStage >= 3) return "Radiant Halo";
            if (Save.equippedHaloStage === 2) return "Bright Halo";
            return "Dim Halo";
        },
        get desc() {
            if (Save.equippedHaloStage >= 3) return "Blocks a hit, recharges in ~4s";
            if (Save.equippedHaloStage === 2) return "Blocks a hit, recharges in ~5.5s";
            return "A ring of light blocks one hit, recharges in ~8s";
        },
        equippable: true
    },

    sunburst: {
        classId: "mage",
        equippable: true,
        get price() {
            return [25, 60, 120][Save.sunburstStage] ?? 0;
        },
        get name() {
            if (Save.equippedSunburstStage >= 3) return "Solar Flare";
            if (Save.equippedSunburstStage === 2) return "Sunburst";
            return "Glimmer";
        },
        get desc() {
            if (Save.equippedSunburstStage >= 3) return "Press E — huge light blast (12 dmg AOE) that hurls enemies back";
            if (Save.equippedSunburstStage === 2) return "Press E — bigger light blast (9 dmg AOE) that hurls enemies back";
            return "Press E — orb of light bursts (6 dmg AOE) and blasts enemies away";
        }
    },

    sunstone: {
        classId: "mage",
        price: 30,
        name: "Sunstone",
        desc: "Sunbeam hits harder and strikes a wider area",
        equippable: true
    },

    refraction: {
        classId: "mage",
        price: 150,
        name: "Refraction",
        desc: "A 2nd Sunbeam charge — cast two strikes before recharging",
        requiresFirstBoss: true,
        equippable: true
    },

    solarAttunement: {
        classId: "mage",
        price: 150,
        name: "Solar Attunement",
        desc: "Sunbeam recharges ~30% faster",
        requiresFirstBoss: true,
        equippable: true
    },

    radiantOverload: {
        classId: "mage",
        price: 240,
        name: "Radiant Overload",
        desc: "Every 3rd Sunbeam overcharges — 2x damage and a huge radius",
        requiresKnightKilled: true,
        equippable: true
    },

    radiantBloom: {
        classId: "mage",
        price: 240,
        name: "Radiant Bloom",
        desc: "Sunbeam blooms like a sunflower — a ring of smaller strikes around the main one",
        requiresKnightKilled: true,
        equippable: true
    },

    sanctuary: {
        classId: "mage",
        price: 400,
        name: "Sanctuary",
        desc: "Your Sunburst leaves a lingering radiant field that burns the ground it lands on",
        requiresMagusKilled: true,
        equippable: true
    },

    corona: {
        classId: "mage",
        price: 380,
        name: "Corona",
        desc: "A radiant aura burns enemies that close in on you (keep-away)",
        requiresMagusKilled: true,
        equippable: true
    },

    sovereignScepter: {
        classId: "mage",
        price: 750,
        name: "Sovereign's Scepter",
        desc: "+1 Sunbeam dmg + right-click royal barrage of light beams (3 dmg, 10s cd)",
        requiresKingKilled: true,
        equippable: true
    },

    // ----- Shared -----

    critRate: {
        classId: "shared",
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
    COOLDOWN: 3571
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
        SPEED: 1.4,
        COLOR: "red",
        HP_MULTIPLIER: 1
    },

    tank: {

        SIZE: 70,
        SPEED: 0.7,
        COLOR: "darkred",
        HP_MULTIPLIER: 1.5,

        // How much faster (and for how long, in ms) a tank
        // moves right after spawning in, so it can actually
        // reach the player and start tanking hits instead of
        // lagging behind the rest of the wave.
        ENTRY_BOOST_MULTIPLIER: 2.75,
        ENTRY_BOOST_DURATION: 2857

    },

    archer: {

        SIZE: 36,
        SPEED: 1.12,
        COLOR: "#8B4513",
        HP_MULTIPLIER: 0.5,

        // Distance (px) it tries to hold from the player

        PREFERRED_RANGE: 260,

        SHOOT_COOLDOWN: 129,

        PROJECTILE_SPEED: 4.9,
        PROJECTILE_COLOR: "#5c4033"

    },

    runner: {

        SIZE: 30,
        SPEED: 2.1,
        COLOR: "orange",
        HP_MULTIPLIER: 0.5,

        CHARGE_COOLDOWN: 214,
        CHARGE_DURATION: 57,
        CHARGE_MULTIPLIER: 3

    },

    fireMage: {

        SIZE: 38,
        SPEED: 0.98,
        COLOR: "#c0392b",
        PREFERRED_RANGE: 280,
        CAST_COOLDOWN: 2714

    },

    necromancer: {

        SIZE: 42,
        SPEED: 0.63,
        COLOR: "#4a235a",
        SUMMON_COOLDOWN: 2857

    },

    skeleton: {

        SIZE: 32,
        SPEED: 2.24,
        COLOR: "#d5d8dc"

    },

    lancer: {

        SIZE: 44,
        SPEED: 1.4,
        COLOR: "#566573",
        SHIELD_HITS: 2,

        // Thrust attack (short poke)
        THRUST_COOLDOWN: 1714,
        THRUST_WINDUP: 14,
        THRUST_DURATION: 21,
        THRUST_RANGE: 160,
        THRUST_WIDTH: 50,
        LANCE_LENGTH: 90,

        // Dash attack (shield-broken lunge)
        DASH_WINDUP: 14,
        DASH_SPEED: 14,
        DASH_DURATION: 13,
        DASH_WIDTH: 60

    },

    // ---- Set 3 (waves 11+) ----

    shade: {

        SIZE: 38,
        SPEED: 1.12,
        COLOR: "#1a1025",

        // Teleport cycle: walk → vanish → reappear behind the
        // player → windup (telegraph) → lunge → recover.
        TELEPORT_COOLDOWN: 5714,
        VANISH_DURATION: 714,
        WINDUP_DURATION: 857,
        LUNGE_SPEED: 7.7,
        LUNGE_DURATION: 18.6,
        RECOVER_DURATION: 1429,

        // How far behind the player it reappears.
        BLINK_DISTANCE: 120

    },

    frostWeaver: {

        SIZE: 42,
        SPEED: 0.84,
        COLOR: "#aee3f5",
        PREFERRED_RANGE: 340,
        CAST_COOLDOWN: 4000,

        // Frost zone (see FrostZone in hazard.js): no damage,
        // just slows the player while inside.
        ZONE_RADIUS: 120,
        ZONE_DURATION: 5714,
        ZONE_GROW_TIME: 571,
        SLOW_FACTOR: 0.6

    },

    powderKeg: {

        SIZE: 44,
        SPEED: 1.82,
        COLOR: "#5d5348",

        // Fuse starts at TRIGGER_RANGE from the player OR when
        // its 1 HP runs out; explosion hurts the player AND
        // other enemies (bait it into the horde).
        TRIGGER_RANGE: 90,
        FUSE_TIME: 786,
        EXPLOSION_RADIUS: 110,
        EXPLOSION_ENEMY_DAMAGE: 3,

        // The blast scorches the ground into a kill zone that
        // stays lethal to the player until the wave is over -
        // every keg that goes off permanently (for the wave)
        // shrinks the safe area.
        KILL_ZONE_TICK: 714

    },

    bloodCleric: {

        SIZE: 46,
        SPEED: 0.7,
        COLOR: "#e8e0d0",
        PREFERRED_RANGE: 300,

        // Heal channel: picks the most-injured non-boss ally,
        // tethers to it for CHANNEL_TIME, then heals it. If
        // nobody's hurt, wards a nearby ally with a 1-hit
        // shield instead. The channel target is invincible
        // while the tether holds (see healShieldTimer in
        // enemy.js) - kill the cleric to break it.
        HEAL_COOLDOWN: 1143,
        CHANNEL_TIME: 500,
        RETRY_BEAT: 571,
        HEAL_AMOUNT: 2,
        ELITE_HEAL_AMOUNT: 3,
        WARD_RANGE: 250

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
    shade: "a Shade",
    frostWeaver: "a Frost Weaver",
    powderKeg: "a Powder Keg",
    bloodCleric: "a Blood Cleric",
    knight: "the Knight",
    royalMagus: "the Royal Magus",
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
// Boss Projectile Ward
// =====================================
//
// Every boss projects a large ward ring around itself that
// stops the player's projectiles at the boundary - shots
// fired from outside the ring fizzle on it, so ranged
// classes have to step inside the ring to land hits. Shots
// fired from within (and sword swings) pass freely.

const BOSS_RING = {

    RADIUS: 300,
    COLOR: "#9b6cff"

};

// =====================================
// Boss
// =====================================

const BOSS = {

    SIZE: 120,
    SPEED: 0.84,
    COLOR: "#8b0000",
    DISPLAY_NAME: "Castle Guard",

    BASE_HP: 30,
    HP_PER_WAVE: 2.5,

    ATTACK_COOLDOWN: 143,

    PROJECTILE_COUNT: 12,
    PROJECTILE_SPEED: 5.6,
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
    SPEED: 2.1,
    COLOR: "#34495e",

    BASE_HP: 70,
    HP_PER_WAVE: 4,

    // Sword - same swing shape as the player's (angle, arc,
    // progress-driven hitbox), just longer and slower to
    // wind down so it reads as a heavier weapon
    SWORD_LENGTH: 130,
    SWORD_ARC: Math.PI * 1.2,
    SWING_DURATION: 28.6,
    SWING_COOLDOWN: 1643,

    // Dashes in from range like the player's own dash
    DASH_TRIGGER_RANGE: 130,
    DASH_SPEED: 8.4,
    DASH_DURATION: 20,
    DASH_COOLDOWN: 2714,

    // Bow - the player's own shortbow
    BOW_ARROW_COUNT: 7,
    BOW_SPREAD: 0.26,
    BOW_COOLDOWN: 3571,
    BOW_SPEED: 7,
    BOW_SIZE: 6,
    BOW_COLOR: "#8b6914"

};

// =====================================
// Royal Magus (Wave 15 Boss)
// =====================================
//
// The court's archmage. Fights from mid-range under a
// never-ending lightning shower and cycles through three
// elemental skills (see royalMagus.js): meteor, earth wall,
// wind gust. Spawns with an honor guard of stationed frost
// weavers (left wall) and fire mages (right wall).

const MAGUS = {

    SIZE: 110,
    SPEED: 0.63,
    COLOR: "#3d5af1",

    // Same wave-scaling scheme as the Castle Guard / Knight:
    // 40 + 15 x 4 = 100 on his debut wave, growing every cycle
    // he recurs in Boss Rush / Endless / Custom.
    BASE_HP: 40,
    HP_PER_WAVE: 4,

    // Keep-at-range drift, same scheme as the fire mage.
    PREFERRED_RANGE: 380,

    // Skills fire on a fixed rotation: wall -> wind ->
    // meteor. One shared cooldown between casts, plus a
    // grace period at the start of the fight. (Lightning is
    // no longer part of the rotation - see below.)
    OPENING_COOLDOWN: 2143,
    SKILL_COOLDOWN: 2857,

    // Arcane Nova - his close-range defense. Getting inside
    // TRIGGER_RANGE sets off a short charge-up, then a blast
    // that damages and shoves the player back out. Separate
    // cooldown from the skill rotation.
    NOVA_TRIGGER_RANGE: 190,
    NOVA_COOLDOWN: 3714,
    NOVA_CHARGE: 500,
    NOVA_RADIUS: 210,
    NOVA_PUSH: 9.8,
    NOVA_PUSH_DURATION: 400,

    // Lightning Shower - strikes scattered across the whole
    // arena like rain, each with its own telegraph circle.
    // Has NO cooldown: the moment one shower finishes, the
    // next begins, so lightning rains for the entire fight,
    // in parallel with the skill rotation above.
    LIGHTNING_COUNT: 16,
    LIGHTNING_SPAN: 3714,
    LIGHTNING_TELEGRAPH: 1071,
    LIGHTNING_RADIUS: 46,

    // Meteor - big telegraphed impact on the player's position
    // that leaves a huge firestorm denying that ground.
    METEOR_TELEGRAPH: 1857,
    METEOR_RADIUS: 230,
    METEOR_BURN_DURATION: 8571,
    METEOR_BURN_TICK: 714,

    // Earth Wall - a full-span stone wall raised just behind
    // the player; they cannot move (or dash) past it while it
    // stands.
    WALL_THICKNESS: 36,
    WALL_DURATION: 5714,
    WALL_GAP_FROM_PLAYER: 55,

    // Wind Gust - arena-wide, undodgeable, deals no damage.
    // Just shoves the player along the gust direction.
    WIND_TELEGRAPH: 1000,
    WIND_DURATION: 1571,
    WIND_PUSH: 4.55,

    // Honor guard entrance - one weaver + one mage walk in
    // together, a new pair every ESCORT_GAP ms. (Real ms -
    // these drive setTimeout in wave.js, not Game.dt.)
    ESCORT_PER_SIDE: 4,
    ESCORT_GAP: 1000,

    // The Magus drives his guard harder than they'd cast on
    // their own - multiplier on the weavers'/mages' cast
    // cooldowns during this fight only.
    ESCORT_COOLDOWN_SCALE: 0.55

};

// =====================================
// King (Wave 20 Boss)
// =====================================

const KING = {

    SIZE: 130,
    SPEED: 0.56,
    COLOR: "#6a0dad",

    // Same wave-scaling scheme as the Castle Guard / Knight:
    // 30 + 20 x 5 = 130 on his debut wave, growing every cycle
    // he recurs in Boss Rush / Endless / Custom.
    BASE_HP: 30,
    HP_PER_WAVE: 5,

    // Reinforcements arrive at this fraction of his max HP
    // (half), whatever that max scaled to this run.
    SUMMON_FRACTION: 0.5,

    // Wall Laser Barrage - bullet-hell style. Instead of a
    // single beam tracking out from the King's own position,
    // full-length laser lines telegraph in from fixed lanes
    // across the whole arena (vertical/horizontal/diagonal),
    // leaving one gap in the wall for the player to dodge
    // through. See fireWallBarrage()/spawnWallPattern() in
    // king.js.
    LASER_COLOR: "#00bfff",
    WALL_LASER_COOLDOWN: 4571,
    WALL_LASER_TELEGRAPH: 1071,
    WALL_LASER_DURATION: 643,
    WALL_LASER_WIDTH: 46,
    WALL_LASER_SPACING: 100,

    // How many consecutive lane slots are left empty to form
    // the dodge lane through each wall.
    WALL_LASER_GAP_COUNT: 2,

    // Once the King drops below SUMMON_FRACTION, every barrage
    // layers a second, differently-angled wall shortly after
    // the first - e.g. vertical + horizontal, or both
    // diagonals - so the two independent gaps have to be
    // threaded together instead of just one. (Real ms - this
    // drives a setTimeout in king.js, not Game.dt.)
    WALL_LASER_WAVE_GAP: 550,

    // Sword - a much longer, heavier greatsword swing than
    // the old 120px reach. No longer parriable, and swings a
    // bit faster/more often than before.
    SLASH_COOLDOWN: 5714,
    SLASH_DURATION: 22.9,
    SLASH_ARC: Math.PI * 0.9,
    SLASH_LENGTH: 320

};

// =====================================
// Hazards
// =====================================

const HAZARD = {

    FIRE_RADIUS: 55,
    FIRE_WARNING: 857,
    BURN_RADIUS: 50,
    BURN_DURATION: 4286,
    BURN_TICK: 714

};

// =====================================
// Waves
// =====================================

const WAVES = {

    SET1_END: 5,
    SET2_START: 6,
    SET2_END: 19,

    // Waves 11+ move into the throne approach - the red
    // carpet arena leading up to the King (see
    // generateThroneRoom in arena.js).
    SET3_START: 11,

    // Set-1/set-2 units keep spawning during set-3 waves,
    // thinned by this multiplier so the arena isn't
    // overcrowded on top of the new roster.
    SET3_OLD_UNIT_SCALE: 0.6,

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
    MAGUS_WAVE: 15,
    KING_WAVE: 20,
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
// Endless Mode
// =====================================
//
// A menu-only survival mode: play the normal wave progression
// (bosses recur every 5 waves via a modulo-20 cycle - see
// startWave in wave.js) but there is no victory. Past the King
// (wave 20) the difficulty ramps: every wave beyond 20 adds a
// little enemy HP and speed, and elites roll far more often, so
// how far you get is the score. RAMP_START is WAVES.KING_WAVE.

const ENDLESS = {

    RAMP_START: 20,

    // Enemy HP multiplier: +HP_PER_WAVE per wave past 20, on top
    // of the normal per-wave HP formulas, capped at HP_MAX.
    HP_PER_WAVE: 0.06,
    HP_MAX: 4.0,

    // Enemy speed: added to the flat 1.2 combat multiplier per
    // wave past 20, capped at SPEED_MAX.
    SPEED_PER_WAVE: 0.015,
    SPEED_MAX: 1.9,

    // Elites roll much more often than the normal 15%.
    ELITE_CHANCE: 0.28

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
    "fireMage", "necromancer", "skeleton", "lancer",
    "shade", "frostWeaver", "powderKeg", "bloodCleric"
];

const BESTIARY_BOSS_ORDER = ["boss", "knight", "royalMagus", "king"];

const BESTIARY = {

    grunt: {
        name: "Grunt",
        color: "red",
        size: 40,
        isBoss: false,
        desc: "The arena's cannon fodder. Slow-witted but relentless.",
        behavior: "Walks straight toward you for a melee hit.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 6); },
        hpScale: "2 + floor((wave - 1) / 6)",
        baseSpeed: ENEMY_TYPES.grunt.SPEED
    },

    tank: {
        name: "Tank",
        color: "darkred",
        size: 70,
        isBoss: false,
        desc: "A hulking bruiser that soaks up punishment.",
        behavior: "Slow chase. Immune to knockback.",
        hpAtWave(w) { return 4 + Math.floor((w - 1) / 3); },
        hpScale: "4 + floor((wave - 1) / 3)",
        baseSpeed: ENEMY_TYPES.tank.SPEED
    },

    archer: {
        name: "Archer",
        color: "#8B4513",
        size: 36,
        isBoss: false,
        desc: "Keeps its distance and peppers you with arrows.",
        behavior: "Kites at range, firing arrows on cooldown.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 10); },
        hpScale: "2 + floor((wave - 1) / 10)",
        baseSpeed: ENEMY_TYPES.archer.SPEED
    },

    runner: {
        name: "Runner",
        color: "orange",
        size: 30,
        isBoss: false,
        desc: "Fast and fragile — closes gaps in a blink.",
        behavior: "Chases you, then periodically triples speed in a charge.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 10); },
        hpScale: "2 + floor((wave - 1) / 10)",
        baseSpeed: ENEMY_TYPES.runner.SPEED
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
        baseSpeed: BOSS.SPEED
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
        baseSpeed: KNIGHT.SPEED
    },

    fireMage: {
        name: "Fire Mage",
        color: "#c0392b",
        size: 38,
        isBoss: false,
        emoji: "🔥",
        desc: "A pyromancer who turns the floor into lava.",
        behavior: "Holds range and casts burning ground hazards at you.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 10); },
        hpScale: "2 + floor((wave - 1) / 10)",
        baseSpeed: ENEMY_TYPES.fireMage.SPEED
    },

    necromancer: {
        name: "Necromancer",
        color: "#4a235a",
        size: 42,
        isBoss: false,
        emoji: "☠",
        desc: "Raises the dead to overwhelm you.",
        behavior: "Summons skeleton minions on cooldown.",
        hpAtWave(w) { return 3 + Math.floor((w - 1) / 10); },
        hpScale: "3 + floor((wave - 1) / 10)",
        baseSpeed: ENEMY_TYPES.necromancer.SPEED
    },

    skeleton: {
        name: "Skeleton",
        color: "#d5d8dc",
        size: 32,
        isBoss: false,
        emoji: "💀",
        desc: "Undead fodder summoned by necromancers.",
        behavior: "Rushes the player quickly but dies easily.",
        hpAtWave(w) { return Math.max(1, Math.floor((2 + Math.floor((w - 1) / 6)) / 2)) + 1; },
        hpScale: "max(1, floor(grunt HP / 2)) + 1",
        baseSpeed: ENEMY_TYPES.skeleton.SPEED
    },

    lancer: {
        name: "Lancer",
        color: "#566573",
        size: 44,
        isBoss: false,
        desc: "A disciplined knight with shield and lance.",
        behavior: "Blocks hits with a shield, then thrusts or lunges.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 6); },
        hpScale: "2 + floor((wave - 1) / 6)",
        baseSpeed: ENEMY_TYPES.lancer.SPEED
    },

    shade: {
        name: "Shade",
        color: "#1a1025",
        size: 38,
        isBoss: false,
        emoji: "🗡",
        desc: "A living shadow that strikes from behind.",
        behavior: "Vanishes, reappears behind you, then lunges after a telegraph.",
        hpAtWave(w) { return 3 + Math.floor((w - 1) / 8); },
        hpScale: "3 + floor((wave - 1) / 8)",
        baseSpeed: ENEMY_TYPES.shade.SPEED
    },

    frostWeaver: {
        name: "Frost Weaver",
        color: "#aee3f5",
        size: 42,
        isBoss: false,
        emoji: "❄",
        desc: "Freezes the ground beneath your feet.",
        behavior: "Casts frost zones that slow your movement and dash.",
        hpAtWave(w) { return 3 + Math.floor((w - 1) / 10); },
        hpScale: "3 + floor((wave - 1) / 10)",
        baseSpeed: ENEMY_TYPES.frostWeaver.SPEED
    },

    powderKeg: {
        name: "Powder Keg",
        color: "#5d5348",
        size: 44,
        isBoss: false,
        emoji: "💣",
        desc: "A walking bomb with a lit fuse.",
        behavior: "Chases you and explodes up close or on death - the blast hurts enemies too.",
        hpAtWave(w) { return 2; },
        hpScale: "2 (fixed)",
        baseSpeed: ENEMY_TYPES.powderKeg.SPEED
    },

    bloodCleric: {
        name: "Blood Cleric",
        color: "#e8e0d0",
        size: 46,
        isBoss: false,
        emoji: "✚",
        desc: "A field medic for the arena's horrors.",
        behavior: "Stays back and heals injured allies, or shields healthy ones.",
        hpAtWave(w) { return 4 + Math.floor((w - 1) / 8); },
        hpScale: "4 + floor((wave - 1) / 8)",
        baseSpeed: ENEMY_TYPES.bloodCleric.SPEED
    },

    royalMagus: {
        name: "Royal Magus",
        color: "#3d5af1",
        size: 110,
        isBoss: true,
        desc: "The wave 15 gatekeeper - the court's archmage.",
        behavior: "Cycles lightning showers, meteors, earth walls, and gale-force winds while stationed mages bombard from both walls.",
        lore: "Court wizard to three kings, and poisoner of at least two of them. The crown keeps him not out of trust but out of terror — no one else can command the storm, split the earth, or call fire from the sky. He duels from the center of the arena like a conductor, his honor guard of weavers and pyromancers chained to the walls by oaths only he can break.",
        hpAtWave(w) { return MAGUS.BASE_HP + w * MAGUS.HP_PER_WAVE; },
        hpScale: `${MAGUS.BASE_HP} + wave × ${MAGUS.HP_PER_WAVE}`,
        baseSpeed: MAGUS.SPEED
    },

    king: {
        name: "King",
        color: "#6a0dad",
        size: 130,
        isBoss: true,
        desc: "The arena's ruler. A multi-phase nightmare.",
        behavior: "Laser wall barrages, greatsword slashes, and elite summons at half HP.",
        lore: "The mad monarch who turned his own throne room into an arena for his amusement. Wave after wave he watches from above, bored of victories bought with other men's blood. Those his soldiers cannot break, he descends to break himself — greatsword in hand, crown ablaze.",
        hpAtWave(w) { return KING.BASE_HP + w * KING.HP_PER_WAVE; },
        hpScale: `${KING.BASE_HP} + wave × ${KING.HP_PER_WAVE}`,
        baseSpeed: KING.SPEED
    }

};