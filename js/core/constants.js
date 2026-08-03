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

// =====================================
// Warrior - Siblings tier (Prince & Princess-gated)
// =====================================
//
// Twinblade Echo (offense) / Sibling's Resilience (survival) -
// twin-motif pair, one tier below King's Blade.

// Twinblade Echo - every 2nd connecting swing detonates a full
// phantom shockwave around the Warrior, hitting EVERY nearby
// enemy (not just whoever the live swing already connected
// with) for solid damage - a real AOE nova, not a quiet tack-on.
const TWINBLADE_ECHO = {
    TRIGGER_EVERY: 2,
    ECHO_DAMAGE: 3,
    ECHO_RADIUS: 130,
    COLOR: "#7a1f3d"
};

// Sibling's Resilience - every 2nd connecting swing grants a
// solid invulnerability window AND a burst of Empowered damage
// on top of it - resilience earned through pressing the attack,
// since this game has no HP pool to lifesteal into.
const SIBLINGS_RESILIENCE = {
    TRIGGER_EVERY: 2,
    INVULN_MS: 600,
    EMPOWER_MS: 2500,
    EMPOWER_DAMAGE_BONUS: 3
};

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
// Unlocked by defeating the Royal Magus - a flat, always-on
// movement speed boost. Helps with kiting/repositioning
// around the King's laser sweeps and sword lunges.

const WINDRUNNER = {
    SPEED_MULTIPLIER: 1.2
};

// =====================================
// Lightning Ring (shop item)
// =====================================
//
// Replaces the old Knight's Locket, and moved up a tier
// alongside it - also Royal-Magus-gated. Charges the Warrior's
// dash with the Magus' own lightning: the dash travels further,
// and anything it passes through takes a jolt of damage and is
// paralyzed for a moment, unable to move or attack. The King and
// the Royal Magus shrug it off (see King/RoyalMagus.stunImmune),
// same treatment as knockback/lightning immunity.

const LIGHTNING_RING = {
    DASH_DISTANCE_MULTIPLIER: 1.4,
    DASH_DAMAGE: 1,
    STUN_MS: 1000,
    DASH_HIT_WIDTH: 50,
    COLOR: "#8fd6ff"
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
    BURN_TICKS: 3,
    BURN_TICK_MS: 950
};

// =====================================
// Ranger - Falcon Quiver / Swiftdraw Gloves
// =====================================
//
// First-boss-tier power spikes for a kiting playstyle:
// arrows that punch through packed groups, and a flat bow
// fire-rate boost.

const FALCON_QUIVER = {
    // Total enemies one arrow can hit. Went 3 -> 2 in an
    // earlier pass, back to 3 here: the Ranger's problem in
    // the set-3 waves (11-14) is being buried by volume, and
    // piercing is the cleanest answer that doesn't touch its
    // single-target boss damage at all.
    PIERCE: 3
};

const SWIFTDRAW = {
    COOLDOWN_MULTIPLIER: 0.6
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
    ARROW_COUNT: 3
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
// Ranger - Siblings tier (Prince & Princess-gated)
// =====================================
//
// Royal Volley (offense) / Princess's Favor (survival) -
// twin-motif pair, one tier below Stormpiercer.

// Royal Volley - every 4th shot is replaced by a full burst
// volley: a wide fan of arrows launched at once, not just the
// usual single (or Gale-Recurve-fanned) shot. Distinct from Gale
// Recurve's permanent small fan - this is an occasional, much
// bigger spread that reads as a real "special" going off.
const ROYAL_VOLLEY = {
    TRIGGER_EVERY: 4,
    BURST_COUNT: 7,
    BURST_SPREAD: Math.PI * 0.5
};

const PRINCESS_FAVOR = {
    // Ground slows (Frost Weaver zones, the Princess's own zone)
    // are 40% less severe while standing in one - there's no
    // timed "slow debuff" in this game to shorten (the slow is
    // purely positional - see Player.getFrostMultiplier), so
    // this is the equivalent defensive trade: less severe rather
    // than shorter.
    SLOW_RESIST: 0.4
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
    // stage (index 0 = not owned/equipped). Nudged up across
    // the board - the phase window is the Thief's whole
    // survival answer to a crowded arena, and half a second
    // wasn't clearing a set-3 pack.
    PHASE_MS: [0, 700, 1100, 1600],
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
// 70% of the sword's reach, and noticeably faster to swing.
// Base damage mirrors the Warrior's kit progression: 1 base,
// +1 from Shadowreach Blades the same way Wet Stone bumps the
// sword.
//
// Was 60% reach / 60% swing duration, but that buried the
// Thief specifically against the Castle Guard (wave 5) and
// the Knight (wave 10) - both fights land before Shadowreach
// Blades even unlocks (it's Knight-gated), so the base kit had
// to actually close a 120-130px hitbox with a 78px blade and
// below-Warrior DPS. Nudged both up so the early daggers-only
// kit can hold its own before any reach/damage upgrade exists.
const THIEF_DAGGER = {
    RANGE: Math.round(SWORD.LENGTH * 0.7),
    ARC: SWORD.ARC,
    DAMAGE: 1,
    SWING_DURATION: SWORD.DURATION * 0.55,
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
    SPEED_BONUS: 0.35,
    ATTACK_SPEED_BONUS: 0.2,
    DURATION_MS: 3400
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
// Every 2nd dagger swing unleashes a flurry in front of the
// Thief - 4 extra hits over ~0.6s (one every ~0.14s),
// independent of whether the triggering swing itself
// connected.
//
// Was every 3rd swing. This is the Thief's only real crowd
// tool before the Magus tier, so its uptime is what decides
// whether he can hold a line in the set-3 waves - and the
// flurry inherits the Shadowreach range bonus too.

const MASTER_OF_BLADE = {
    TRIGGER_EVERY: 2,
    TICK_DAMAGE: 2,
    TICKS: 4,
    TICK_MS: 143
};

// =====================================
// Thief - Shadowreach Blades (Knight tier)
// =====================================
//
// The Thief's wetStone-equivalent, but it buys REACH as well
// as damage. The dagger's 78px range is the shortest weapon in
// the game, which is exactly what buries the Thief in the
// set-3 waves (11-14): every hit means stepping inside a pack
// that can kill in one touch. Longer blades let him cut the
// front rank without committing his whole body to it.
//
// The bonus applies to the swing hitbox, the Master of the
// Blade flurry, AND the drawn blade (see getDaggerRange in
// thief.js) - what you see is what you hit.

const SHADOWREACH = {
    BONUS_DAMAGE: 1,
    BONUS_RANGE: 30
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
// Thief - Siblings tier (Prince & Princess-gated)
// =====================================
//
// Twinstrike Daggers (offense) / Mirror Cloak (utility) - twin-
// motif pair, one tier below Moonlight Daggers.

// Shadow Twin - replaces the old Twinstrike Daggers (a flat
// "hit the same target twice" proc, which read as weak and
// invisible). Every 3rd swing, a shadow clone erupts at the
// mirrored point behind the Thief and slashes a wide independent
// burst of its own - real added coverage (catches whatever the
// live swing didn't), not just doubled damage on one target.
const SHADOW_TWIN = {
    TRIGGER_EVERY: 3,
    DAMAGE: 2,
    RADIUS: 100,
    MIRROR_DISTANCE: 70,
    FX_DURATION_MS: 260,
    COLOR: "#c9a6ff"
};

const MIRROR_CLOAK = {
    // A real decoy left at the dash's start point - every
    // non-boss enemy paths/aims at it instead of the real player
    // for as long as it stands (see getAggroSource() in
    // enemy.js), then it detonates: damages and briefly
    // paralyzes anything still nearby. Bosses always see
    // through it (a decoy trick trivializing a boss fight would
    // undercut the point of the fight).
    SIZE: 30, // a little smaller than the player (PLAYER.SIZE 40)
    TAUNT_MS: 1400,
    RADIUS: 90,
    DAMAGE: 2,
    STUN_MS: 500,
    COLOR: "#b06ae0"
};

// =====================================
// Thief - Moonlight Daggers (King tier)
// =====================================
//
// The Thief's ultimate: +1 dagger damage (stacks with Serrated
// Blade), a second dash charge, and every dagger swing leaves
// a lingering purple flame patch (a square scorch, not a
// circle) at the point of attack - anyone standing in it takes
// a tick of damage every ~1.4s for as long as it lingers.

const MOONLIGHT_DAGGERS = {
    BONUS_DAMAGE: 1,
    // Half the side length of the square burn patch.
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
    //
    // Balance pass: the strike is a wide zone rather than a
    // pinpoint, and comes back faster. The Mage's damage is
    // meant to come from covering ground (a whole clump caught
    // per cast), NOT from stacking multipliers onto one target
    // - see ELEMENTAL_PRISM for the other half of that trade.
    SUNBEAM_COOLDOWN: 1600,
    SUNBEAM_DAMAGE: 2,
    SUNBEAM_RADIUS: 82,

    // On touch devices there's no cursor, so the strike lands
    // this far along the aim direction instead.
    SUNBEAM_CAST_DISTANCE: 300,

    // How much of the Mage's damage each boss actually takes
    // (see mageDamageTo in mage.js). The Mage's kit is all
    // persistent zone damage - wide strikes, burns, fields,
    // auras - which is the point against a wave, but against
    // one big slow target every source lands at once, so the
    // late bosses need to shrug most of it off.
    //
    // Anything not listed takes FULL damage: all trash, and
    // the Castle Guard (wave 5, where the Mage has barely any
    // kit assembled yet).
    BOSS_DAMAGE_SCALE: {
        knight: 0.75,      // 25% less
        royalMagus: 0.25,  // 75% less
        king: 0.25         // 75% less
    },

    COLOR: "#fff3b0"

};

// Halo - staged survivability ward. Blocks one hit, then
// comes back after RECHARGE_WAVES[stage] waves. Stage 3
// (Radiant Halo) is Knight-gated and returns every wave.
// Because the Mage has no dash, this is its entire defensive
// kit - and it is deliberately scarce.
const HALO = {

    // Recharges in WAVES, not seconds - indexed by stage.
    //
    // A seconds-based timer meant the Mage could trade a hit
    // every few beats and just keep walking, which made the
    // dashless class the safest in the game. Spending the ward
    // now costs you for the rest of the ROUND (and several
    // rounds at low stages), so the Mage plays on a knife edge:
    // one mistake is banked, not refunded. Fully upgraded it
    // comes back every wave - one hit per round, no more.
    //
    //   stage 1 - every 5 waves
    //   stage 2 - every 3 waves
    //   stage 3 - every wave
    RECHARGE_WAVES: [0, 5, 3, 1],

    BLOCK_INVULN_MS: 700,
    COLOR: "#fff0b0"
};

// Sunburst - staged [E]: a lobbed orb of light that bursts in
// a big AOE where it lands.
const SUNBURST = {
    COOLDOWN: 2200,
    DAMAGE: [0, 6, 9, 12],   // indexed by stage
    RADIUS: [0, 110, 132, 155],

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
    BONUS_RADIUS: 24
};

// Refraction (Castle Guard) - the Mage's recharge item.
//
// It used to grant a 2nd charge (Hermes-Shoes style). Two
// charges made the Mage bursty and fiddly: both casts came out
// at once unless you deliberately tapped slowly to hold one
// back, so the "skill" was rationing charges rather than
// aiming. It now cuts the recharge instead - same sustained
// output, none of the burst.
//
// It briefly carried the full reduction of both old recharge
// items (0.5 x 0.7 = 0.35, ~65% faster), which made the
// Sunbeam come back faster than the class was ever meant to
// sustain. Pulled back to 40% faster. Solar Attunement became
// the Amberlight Field below, so the two Castle Guard picks
// aren't the same upgrade twice.
const REFRACTION = {
    COOLDOWN_MULTIPLIER: 0.6
};

// Amberlight Field (Castle Guard) - replaces Solar Attunement.
//
// A wide aura of thickened light around the Mage. Enemy shots
// crossing it are dragged down to SPEED_FACTOR of their normal
// speed for as long as they're inside it. It does NOT block,
// destroy or deflect anything - it buys reaction time, not
// safety, which is exactly what a dashless caster lacks
// against archer/fire-mage crossfire it can't sidestep.
const AMBERLIGHT = {
    RADIUS: 260,
    SPEED_FACTOR: 0.5,
    COLOR: "#ffd98a"
};

// Radiant Overload (Knight) - every 3rd Sunbeam overcharges
// into a much bigger, harder strike.
const RADIANT_OVERLOAD = {
    EVERY: 3,
    DAMAGE_MULT: 2,
    RADIUS_MULT: 1.8
};

// Elemental Prism (Knight) - replaces the old Radiant Bloom.
//
// Bloom ringed the cursor with 6 half-power petals. Against a
// wave that was fine, but against a BOSS every petal landed on
// the same huge hitbox, so one cast dealt ~4x damage to a
// single target and boss fights melted. The Prism keeps the
// power but moves it off burst and onto area + time:
//
//   Fire cast - everything caught by the strike burns
//               (BURN_DAMAGE per tick, BURN_TICKS times).
//   Ice cast  - the strike freezes the ground it hit into a
//               field that damages and slows (see MageIceField
//               in hazard.js).
//
// Casts alternate fire -> ice -> fire. Both scale with how
// MANY enemies the strike caught, so a packed wave takes far
// more total damage than a lone boss ever does.

const ELEMENTAL_PRISM = {

    // Fire half.
    BURN_DAMAGE: 2,
    BURN_TICKS: 3,
    BURN_TICK_MS: 700,
    FIRE_COLOR: "#ff8a3d",

    // Ice half. The field outlives the strike, denying that
    // ground and dragging anything standing in it to
    // SLOW_FACTOR of its normal speed (bosses shrug it off,
    // same as knockback/stun).
    ICE_RADIUS_MULT: 1.15,
    ICE_DURATION_MS: 4000,
    ICE_TICK_MS: 700,
    ICE_DAMAGE: 1,
    ICE_SLOW_FACTOR: 0.55,
    ICE_COLOR: "#8fe3ff"

};

// Arcane Step (Magus) - replaces the old Sanctuary. The Mage's
// whole answer to having no dash at all (see getDashSlotCount):
// an aim-directed teleport on its own short cooldown, bound to
// the same dash key every other class uses (see Mage.dash()).
// Unlocked at the Magus tier (not the Siblings tier) so it's
// already in hand well before the Prince fight, which is
// exactly the matchup that exposed how badly a dashless class
// needs an escape tool.
const ARCANE_STEP = {
    DISTANCE: 220,
    COOLDOWN: 5000
};

// Corona (Magus) - a radiant aura that burns enemies who get
// close. Keep-away for the immobile caster + passive clear.
const CORONA = {
    RADIUS: 190,
    TICK_MS: 800,
    TICK_DAMAGE: 2,
    COLOR: "#ffd24d"
};

// Mage - Siblings tier (Prince & Princess-gated). Twincast
// Prism (offense) / Sibling's Grace (survival) - twin-motif
// pair, one tier below the Sovereign's Scepter.
const TWINCAST_PRISM = {
    // Every 3rd Sunbeam also fires a second beam mirrored to
    // the opposite side of the cast point.
    EVERY: 3
};

// Sibling's Grace grants the Halo a 2nd hit before it breaks -
// same shape as the Warrior's Bulwark shield stage, not a dash
// charge (the Mage has no dash at all - see getDashSlotCount).

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
    prince: 70,
    princess: 55,
    king: 150,

    // Act II. Worth more than castle units of the same bulk -
    // there are far fewer of them per wave, so per-kill value
    // has to carry the wave's payout.
    boar: 9,
    hedgeWarden: 11,
    rootHulk: 10,
    brambleArcher: 8,
    sporePuffer: 8,
    wisp: 3,
    pollenDrone: 12,
    gardenerShade: 12,
    vineWeaver: 11,
    roseKnight: 16,

    thornMatron: 130,
    greenwarden: 150,
    heartwood: 175,
    herald: 200,

    // Act III.
    cherub: 10,
    gateWarden: 14,
    censer: 12,
    scribe: 13,
    choir: 16,
    seraphBlade: 13
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

// =====================================
// Act II Boss Gear (waves 20 / 25 / 30 / 35)
// =====================================
//
// Four tiers, two items per class each, slotted between the
// Royal Magus's tier and the Siblings' in every class's list.
// The shared effects they all reach for live in bossGear.js.
//
// Each tier is one idea, answered four different ways:
//
//   MATRON       thorns: you leave the ground changed
//   GREENWARDEN  limbs: you take pieces off, and yours grow back
//   HEARTWOOD    roots: you are paid for holding your ground
//   HERALD       judgement: you mark, and the sky answers
//
// Numbers here are a first pass and expected to move.

const BOSS_GEAR = {

    // --- Shared control effects (see Enemy.applySap etc.) ---
    SAP_SLOW_PER_STACK: 0.3,
    SAP_MAX_STACKS: 3,
    SAP_CAP_SNARE_MS: 900,

    // --- Thorn bed (Matron tier, five items) ---
    THORN_RADIUS: 46,
    THORN_LIFE_MS: 4200,
    THORN_TICK_MS: 420,
    THORN_TICK_DAMAGE: 2,

    // --- Pollen burst (Matron tier, Mage) ---
    POLLEN_RADIUS: 130,
    POLLEN_LIFE_MS: 2600,

    // --- Grasping root (Heartwood tier) ---
    ROOT_HOLD_MS: 1400,

    // --- Judgement pillar (Herald tier, three items) ---
    PILLAR_WARN_MS: 620,
    PILLAR_FLASH_MS: 260,
    PILLAR_RADIUS: 92,
    PILLAR_DAMAGE: 14

};

// ----- Thorn Matron tier -----

// Warrior. Struck enemies sprout thorns that hurt whatever is
// standing next to them, so a packed wave damages itself.
const THORN_GIRDLE = {
    RADIUS: 78,
    DAMAGE: 3
};

// Warrior. A blocked hit erupts into a thorn bed underfoot -
// the shield stops being purely defensive.
const MATRONS_SEAL = {
    BEDS: 3,
    SPREAD: 54
};

// Ranger. Every Nth arrow is a seed.
const SEEDSHOT_QUIVER = {
    EVERY: 4
};

// Ranger. The dash lays thorns along the line it travelled.
const BRAMBLESTRIDE = {
    SPACING_PX: 52
};

// Thief. A seed planted in the target, blooming on a fuse.
const ROSETHORN_EDGE = {
    FUSE_MS: 1100,
    RADIUS: 74,
    DAMAGE: 8
};

// Thief. Briars grow while you hold still and bite what is
// adjacent - the Thief's one reason ever to stop moving.
const BRIAR_CLOAK = {
    GROW_MS: 500,
    RADIUS: 74,
    TICK_MS: 400,
    TICK_DAMAGE: 3
};

// Mage. Every Sunbeam impact leaves a bed behind it.
const BLOOMSIGHT_PRISM = {
    EVERY: 1
};

// Mage. Enemies dying near you burst into slowing pollen.
const SPORE_VEIL = {
    TRIGGER_RADIUS: 200
};

// ----- Greenwarden tier -----

// Warrior. Three hits on one enemy sever it: staggered, and the
// next blow lands double.
const WARDENS_CLEAVER = {
    HITS_TO_SEVER: 3,
    STAGGER_MS: 900,
    NEXT_HIT_MULT: 2
};

// Warrior. A bark plate on its own clock, independent of the
// Shield - it regrows whether or not you ever bought one.
const HEARTBARK_PLATE = {
    REGROW_MS: 18000,
    INVULN_MS: 620
};

// Ranger. Arrows cripple; three stacks and the leg goes.
const SEVERING_BROADHEADS = {
    SAP_MS: 2600
};

// Ranger. A kill regrows a dash charge outright.
const SECOND_GROWTH = {
    REFUND_ALL: true
};

// Thief. Every Nth hit on the same enemy takes a limb.
const LIMBTAKER = {
    HITS_TO_TAKE: 5,
    DISARM_MS: 2200
};

// Thief. A knife that kills comes straight back.
const REGROWTH_SIGIL = {
    REFUND_ALL: true
};

// Mage. A beam onto something already burning finishes the burn
// on the spot - the whole remaining DoT, at once.
const PRUNING_LIGHT = {
    DAMAGE_PER_TICK_LEFT: 3
};

// Mage. A broken ward grows back on a timer rather than waiting
// on the wave counter.
const HEDGEWARD_BLOOM = {
    REGROW_MS: 14000
};

// ----- Heartwood tier -----

// Warrior. The longer you hold your ground, the harder it hits.
const HEARTWOOD_MAUL = {
    STEP_MS: 1000,
    DAMAGE_PER_STEP: 1,
    MAX_STEPS: 4
};

// Warrior. Stand still and the ground takes hold: nothing shifts
// you, and everything near you wades.
const DEEPROOT_GREAVES = {
    ROOT_MS: 600,
    RADIUS: 170
};

// Ranger. Arrows root what they hit.
const TAPROOT_ARROWS = {
    SNARE_MS: 700
};

// Ranger. Held ground buys one arrow that goes through
// everything (see Projectile.pierce).
const GROVEWALKER = {
    ROOT_MS: 1000
};

// Thief. Anything pinned takes double - the payoff for a kit
// that is already covered in slows and stuns.
const ROOTFANG = {
    DAMAGE_MULT: 2
};

// Thief. A root comes up under you on a beat and grabs whatever
// is closest.
const SAPWELL = {
    INTERVAL_MS: 8000,
    RANGE: 320
};

// Mage. Cast twice from the same spot and the second lands as
// something much larger.
const COREWOOD_FOCUS = {
    MOVE_TOLERANCE: 26,
    DAMAGE_MULT: 2.2,
    RADIUS_MULT: 1.7
};

// Mage. The Sunburst orb drags roots behind it.
const ROOTCAGE = {
    SNARE_MS: 900
};

// ----- Herald tier -----

// Warrior. Brands stack on one target; the third calls the sky.
const HERALDIC_BRAND = {
    BRANDS_TO_CALL: 3,
    BRAND_MS: 5000
};

// Warrior. The dash lands like the Herald's own descent.
const STORMSTEP_SABATONS = {
    RADIUS: 150,
    DAMAGE: 6,
    KNOCKBACK: 13
};

// Ranger. Every Nth arrow calls a pillar where it lands.
const JUDGEMENT_ARROW = {
    EVERY: 6
};

// Ranger. The dash carries you over the ground entirely - no
// hazard, no slow, no root touches you while you are up.
const SKYWARD_TALONS = {
    AIRBORNE_MS: 700
};

// Thief. A kill passes judgement to the next thing along.
const HERALDS_VERDICT = {
    CHAIN_RANGE: 420
};

// Thief. Come down out of a dash and the first blow is certain.
const ASCENDANT_CLOAK = {
    WINDOW_MS: 1400
};

// Mage. Every Nth Sunbeam arrives as a pillar instead: slower,
// far bigger, and telegraphed.
const PILLAR_OF_JUDGEMENT = {
    EVERY: 4,
    DAMAGE: 26,
    RADIUS: 128
};

// Mage. A second Arcane Step charge.
const HERALDS_WINGS = {
    CHARGES: 2
};

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

    thornGirdle: {
        classId: "warrior",
        price: 440,
        name: "Thorn Girdle",
        desc: "Struck enemies sprout thorns that damage everything crowding them",
        requiresMatronKilled: true,
        equippable: true
    },

    matronsSeal: {
        classId: "warrior",
        price: 420,
        name: "Matron's Seal",
        desc: "A blocked hit erupts into a bed of thorns underfoot",
        requiresMatronKilled: true,
        equippable: true
    },

    wardensCleaver: {
        classId: "warrior",
        price: 480,
        name: "Warden's Cleaver",
        desc: "3 hits on one foe sever it - staggered, and your next blow lands double",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    heartbarkPlate: {
        classId: "warrior",
        price: 460,
        name: "Heartbark Plate",
        desc: "A bark plate that soaks one hit and regrows every 18s, on its own",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    heartwoodMaul: {
        classId: "warrior",
        price: 520,
        name: "Heartwood Maul",
        desc: "+1 sword damage for every second you hold your ground, up to +4",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    deeprootGreaves: {
        classId: "warrior",
        price: 500,
        name: "Deeproot Greaves",
        desc: "Stand still and you can't be moved - and everything near you wades",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    heraldicBrand: {
        classId: "warrior",
        price: 560,
        name: "Heraldic Brand",
        desc: "Sword hits brand; the 3rd brand calls a pillar of light onto the target",
        requiresHeraldKilled: true,
        equippable: true
    },

    stormstepSabatons: {
        classId: "warrior",
        price: 540,
        name: "Stormstep Sabatons",
        desc: "Your dash lands like a descent - damage and knockback where you arrive",
        requiresHeraldKilled: true,
        equippable: true
    },

    twinbladeEcho: {
        classId: "warrior",
        price: 620,
        name: "Twinblade Echo",
        desc: "Every 2nd sword hit detonates a 3 dmg phantom shockwave around you",
        requiresSiblingsKilled: true,
        equippable: true
    },

    siblingsResilience: {
        classId: "warrior",
        price: 580,
        name: "Sibling's Resilience",
        desc: "Every 2nd sword hit grants invulnerability + empowers your next swings (+3 dmg)",
        requiresSiblingsKilled: true,
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

    lightningRing: {
        classId: "warrior",
        price: 400,
        name: "Lightning Ring",
        desc: "Dash goes further - passes through enemies for 1 dmg + a brief paralyze",
        requiresMagusKilled: true,
        equippable: true
    },

    windrunnerAnklet: {
        classId: "warrior",
        price: 380,
        name: "Windrunner Anklet",
        desc: "+20% movement speed",
        requiresMagusKilled: true,
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
        desc: "Arrow hits ignite enemies — 3 burn dmg over ~2.9s",
        equippable: true
    },

    falconQuiver: {
        classId: "ranger",
        price: 150,
        name: "Falcon Quiver",
        desc: "Arrows pierce through 2 enemies",
        requiresFirstBoss: true,
        equippable: true
    },

    swiftdrawGloves: {
        classId: "ranger",
        price: 150,
        name: "Swiftdraw Gloves",
        desc: "Bow fires ~67% faster",
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
        desc: "Bow fires 3 arrows in a fan",
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

    seedshotQuiver: {
        classId: "ranger",
        price: 440,
        name: "Seedshot Quiver",
        desc: "Every 4th arrow is a seed - it plants a bed of thorns where it lands",
        requiresMatronKilled: true,
        equippable: true
    },

    bramblestride: {
        classId: "ranger",
        price: 420,
        name: "Bramblestride",
        desc: "Your dash lays a trail of thorns along the ground you crossed",
        requiresMatronKilled: true,
        equippable: true
    },

    severingBroadheads: {
        classId: "ranger",
        price: 480,
        name: "Severing Broadheads",
        desc: "Arrows cripple. Three stacks and the leg goes - the target is rooted",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    secondGrowth: {
        classId: "ranger",
        price: 460,
        name: "Second Growth",
        desc: "Every kill regrows a dash charge outright",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    taprootArrows: {
        classId: "ranger",
        price: 520,
        name: "Taproot Arrows",
        desc: "Every arrow roots what it hits in place for a moment",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    grovewalker: {
        classId: "ranger",
        price: 500,
        name: "Grovewalker",
        desc: "Hold your ground 1s and your next arrow pierces everything in its path",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    judgementArrow: {
        classId: "ranger",
        price: 560,
        name: "Judgement Arrow",
        desc: "Every 6th arrow calls a pillar of light down where it lands",
        requiresHeraldKilled: true,
        equippable: true
    },

    skywardTalons: {
        classId: "ranger",
        price: 540,
        name: "Skyward Talons",
        desc: "Your dash carries you above the ground - no hazard, slow or root touches you",
        requiresHeraldKilled: true,
        equippable: true
    },

    royalVolley: {
        classId: "ranger",
        price: 620,
        name: "Royal Volley",
        desc: "Every 4th shot unleashes a 7-arrow burst volley instead",
        requiresSiblingsKilled: true,
        equippable: true
    },

    princessFavor: {
        classId: "ranger",
        price: 580,
        name: "Princess's Favor",
        desc: "Ground slows affect you 40% less",
        requiresSiblingsKilled: true,
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
            if (Save.equippedCloakStage >= 3) return "Dash phases 1.6s + deals 3 dmg to enemies dashed through";
            if (Save.equippedCloakStage === 2) return "Dash phases 1.1s (untouchable while phasing)";
            return "Dash phases 0.7s (untouchable while phasing)";
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
        desc: "Hits grant +35% move speed, +20% attack speed for ~3.4s",
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
        desc: "Every 2nd dagger swing unleashes 4 cuts (2 dmg each) in ~0.6s",
        requiresFirstBoss: true,
        equippable: true
    },

    shadowreachBlades: {
        classId: "thief",
        price: 220,
        name: "Shadowreach Blades",
        desc: "Dagger deals 1 more base damage and strikes noticeably further",
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

    rosethornEdge: {
        classId: "thief",
        price: 440,
        name: "Rosethorn Edge",
        desc: "Dagger hits plant a seed that blooms for heavy damage around the target",
        requiresMatronKilled: true,
        equippable: true
    },

    briarCloak: {
        classId: "thief",
        price: 420,
        name: "Briar Cloak",
        desc: "Hold still and briars grow around you, biting anything adjacent",
        requiresMatronKilled: true,
        equippable: true
    },

    limbtaker: {
        classId: "thief",
        price: 480,
        name: "Limbtaker",
        desc: "Every 5th hit on a foe takes a limb - it can't attack for 2.2s",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    regrowthSigil: {
        classId: "thief",
        price: 460,
        name: "Regrowth Sigil",
        desc: "A knife that kills comes straight back - the cooldown resets",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    rootfang: {
        classId: "thief",
        price: 520,
        name: "Rootfang",
        desc: "Dagger hits land double against anything rooted, slowed, chilled or stunned",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    sapwell: {
        classId: "thief",
        price: 500,
        name: "Sapwell",
        desc: "Every 8s a root comes up under you and grabs the nearest enemy",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    heraldsVerdict: {
        classId: "thief",
        price: 560,
        name: "Herald's Verdict",
        desc: "Every kill passes judgement - a pillar falls on the next foe along",
        requiresHeraldKilled: true,
        equippable: true
    },

    ascendantCloak: {
        classId: "thief",
        price: 540,
        name: "Ascendant Cloak",
        desc: "Come out of a dash and your next strike is a guaranteed critical",
        requiresHeraldKilled: true,
        equippable: true
    },

    shadowTwin: {
        classId: "thief",
        price: 620,
        name: "Shadow Twin",
        desc: "Every 3rd swing, a shadow clone erupts behind you in a 2 dmg AOE burst",
        requiresSiblingsKilled: true,
        equippable: true
    },

    mirrorCloak: {
        classId: "thief",
        price: 580,
        name: "Mirror Cloak",
        desc: "Dashing leaves a decoy that detonates a beat later (2 dmg + brief stun)",
        requiresSiblingsKilled: true,
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
            if (Save.equippedHaloStage >= 3) return "Blocks a hit, returns every wave";
            if (Save.equippedHaloStage === 2) return "Blocks a hit, returns after 3 waves";
            return "A ring of light blocks one hit, returns after 5 waves";
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
        desc: "Sunbeam recharges 40% faster",
        requiresFirstBoss: true,
        equippable: true
    },

    amberlightField: {
        classId: "mage",
        price: 150,
        name: "Amberlight Field",
        desc: "Thickened light around you — enemy shots crossing it travel at half speed",
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

    elementalPrism: {
        classId: "mage",
        price: 240,
        name: "Elemental Prism",
        desc: "Sunbeam alternates — fire scorches everything hit (2 dmg x3), then ice leaves a freezing field",
        requiresKnightKilled: true,
        equippable: true
    },

    arcaneStep: {
        classId: "mage",
        price: 400,
        name: "Arcane Step",
        desc: "Teleport toward your cursor/aim - the Mage's only dash, 5s cooldown",
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

    bloomsightPrism: {
        classId: "mage",
        price: 440,
        name: "Bloomsight Prism",
        desc: "Every Sunbeam impact leaves a bed of thorns behind it",
        requiresMatronKilled: true,
        equippable: true
    },

    sporeVeil: {
        classId: "mage",
        price: 420,
        name: "Spore Veil",
        desc: "Enemies dying near you burst into pollen that slows everything caught",
        requiresMatronKilled: true,
        equippable: true
    },

    pruningLight: {
        classId: "mage",
        price: 480,
        name: "Pruning Light",
        desc: "A beam onto a burning foe finishes the burn on the spot, all at once",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    hedgewardBloom: {
        classId: "mage",
        price: 460,
        name: "Hedgeward Bloom",
        desc: "A broken ward grows back after 14s instead of waiting on the wave",
        requiresGreenwardenKilled: true,
        equippable: true
    },

    corewoodFocus: {
        classId: "mage",
        price: 520,
        name: "Corewood Focus",
        desc: "Cast twice from the same spot and the second lands far larger",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    rootcage: {
        classId: "mage",
        price: 500,
        name: "Rootcage",
        desc: "Your Sunburst orb drags roots behind it, pinning everything it passes",
        requiresHeartwoodKilled: true,
        equippable: true
    },

    pillarOfJudgement: {
        classId: "mage",
        price: 560,
        name: "Pillar of Judgement",
        desc: "Every 4th Sunbeam arrives as a telegraphed pillar - slower, far bigger",
        requiresHeraldKilled: true,
        equippable: true
    },

    heraldsWings: {
        classId: "mage",
        price: 540,
        name: "Herald's Wings",
        desc: "Arcane Step gains a second charge",
        requiresHeraldKilled: true,
        equippable: true
    },

    twincastPrism: {
        classId: "mage",
        price: 620,
        name: "Twincast Prism",
        desc: "Every 3rd Sunbeam also fires a second, mirrored beam",
        requiresSiblingsKilled: true,
        equippable: true
    },

    siblingsGrace: {
        classId: "mage",
        price: 580,
        name: "Sibling's Grace",
        desc: "Halo blocks a 2nd hit before breaking",
        requiresSiblingsKilled: true,
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
    COOLDOWN: 3571,

    // Brief invulnerability granted by every dash (all
    // classes) - just enough grace that dashing INTO a
    // projectile you were dodging doesn't feel like a cheap
    // death. The Thief's cloak phase stacks on top.
    GRACE_MS: 100,

    // Ghost images left along the dash line so the teleport
    // reads as movement. Count is how many ghosts, life is
    // how long each takes to fade (60fps frames).
    AFTERIMAGE_COUNT: 4,
    AFTERIMAGE_LIFE: 14
};

// =====================================
// Hit-Stop
// =====================================
//
// A full-sim freeze applied via applyHitStop() (game.js) and
// enforced in the main loop by zeroing Game.dt/timeScale
// while the timer (real ms, NOT scaled) runs down.
//
// Deliberately ONLY used for boss kills: per-swing hit-stop
// was tried and cut - with this game's constant hit rate it
// read as lag, not weight. Don't re-add it to regular melee.

const HITSTOP = {

    // Any boss kill, melee or ranged - the big punctuation
    // mark.
    BOSS_KILL_MS: 220

};

// =====================================
// Death Slow-Mo
// =====================================
//
// A fatal hit no longer cuts straight to the game over
// screen - the sim runs at TIME_SCALE for DURATION_MS (real
// ms) first, so the player actually sees the blow that
// killed them land. See Player.takeHit / finishPlayerDeath.

const DEATH_SLOWMO = {

    DURATION_MS: 600,
    TIME_SCALE: 0.2

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

// =====================================
// Garden Roster (Act II, waves 16-30)
// =====================================
//
// From wave 16 the castle units stop spawning entirely and this
// roster takes over. It is built on a different premise from the
// castle's: by wave 16 every class is strong enough that "more
// enemies with more HP" stops being a threat, so almost nothing
// here tries to out-damage the player. They deny ground, break up
// position, and multiply each other - which stays dangerous no
// matter how big the player's numbers get.
//
// They are also roughly twice the castle roster's bulk, and
// arrive as one squad rather than a stream (see spawnSquad in
// wave.js), so a wave is six or seven real decisions instead of
// twenty identical ones.

const GARDEN = {

    // Shared arrival window - see Enemy.emergeTimer.
    EMERGE_MS: 620,

    // Squad members erupt no closer than this to the player, so
    // an arrival can never be an ambush the player had no chance
    // to react to.
    EMERGE_MIN_PLAYER_DIST: 220,

    boar: {
        SIZE: 46, SPEED: 1.05, COLOR: "#7a5230",
        HP_BASE: 14, HP_EVERY: 2,
        CHARGE_SPEED: 6.2,
        CHARGE_WINDUP_MS: 620,
        CHARGE_COOLDOWN: 3400,
        TRAIL_MS: 5200,
        TRAIL_EVERY_PX: 46
    },

    hedgeWarden: {
        SIZE: 64, SPEED: 0.62, COLOR: "#3f6b3a",
        HP_BASE: 22, HP_EVERY: 2,
        // It is not shielded near greenery - it is UNKILLABLE
        // near greenery. The only answer is to pull it into the
        // open, which is a positional problem no amount of damage
        // solves.
        COVER_RADIUS: 110
    },

    rootHulk: {
        SIZE: 60, SPEED: 1.05, COLOR: "#5c4a2e",
        HP_BASE: 30, HP_EVERY: 2,
        STOMP_COOLDOWN: 4200,
        STOMP_TELEGRAPH_MS: 780,
        RING_INNER: 78,
        RING_OUTER: 168
    },

    brambleArcher: {
        SIZE: 38, SPEED: 1.1, COLOR: "#6b7f3a",
        HP_BASE: 9, HP_EVERY: 3,
        PREFERRED_RANGE: 300,
        SHOOT_COOLDOWN: 2100,
        PROJECTILE_SPEED: 5.2,
        // A full stop, not a slow. The arrow still barely hurts;
        // being unable to move for a beat while the rest of the
        // squad closes is the entire threat.
        ARROWS: 3,
        ARROW_SPREAD: 0.18,
        ROOT_MS: 700
    },

    sporePuffer: {
        SIZE: 42, SPEED: 0.85, COLOR: "#8a7fb0",
        HP_BASE: 10, HP_EVERY: 3,
        PREFERRED_RANGE: 260,
        SHOOT_COOLDOWN: 3000,
        CLOUD_RADIUS: 128,
        CLOUD_MS: 4600
    },

    wispSwarm: {
        SIZE: 26, SPEED: 2.6, COLOR: "#cfe6a0",
        HP_BASE: 16, HP_EVERY: 3,
        SPEED_PER_LOSS: 0.16,
        MEMBERS: 8,
        // How hard they weave across their own approach line.
        SWAY: 1.35
    },

    pollenDrone: {
        SIZE: 36, SPEED: 1.9, COLOR: "#e6c760",
        HP_BASE: 11, HP_EVERY: 3,
        // Presentation only. The heal and the haste reach the
        // whole field - this is just how big the glow around the
        // drone itself is drawn.
        AURA_GLOW_RADIUS: 120,
        AURA_SPEED_MULT: 1.28,
        HEAL_PER_SEC: 1.1,
        // It patrols the perimeter on a fixed circuit and never
        // reacts to the player at all - so it is always somewhere
        // you have to go OUT of your way to reach.
        ORBIT_INSET: 0.14,
        ORBIT_PERIOD_MS: 16000
    },

    gardenerShade: {
        SIZE: 40, SPEED: 0, COLOR: "#4a3f6b",
        // Enormous, because the point is that it cannot be killed
        // by accident. You have to go and deal with it.
        HP_BASE: 70, HP_EVERY: 1,
        // Works fast. It is invisible, harmless to touch and very
        // hard to kill, so all the pressure it applies has to
        // come from how quickly the dead come back.
        REPLANT_COOLDOWN: 4200,
        SEEDLING_HP_FRACTION: 0.45,
        // Only visible while it is actually raising something.
        REVEAL_MS: 1400,
        ORBIT_INSET: 0.09
    },

    vineWeaver: {
        SIZE: 38, SPEED: 0.9, COLOR: "#3f7f6b",
        HP_BASE: 12, HP_EVERY: 3,
        PREFERRED_RANGE: 320
    },

    // Rose Knight. The garden's answer to the castle's Lancer,
    // and a straight upgrade on it: longer reach, a guard that
    // grows back, and a charge that leaves the lane it crossed
    // full of bramble.
    //
    // Four of these arrive at the corners of every wave from the
    // hedge maze on (see cornerGuardsForWave), on top of whatever
    // squad the wave was already fielding - so they are meant to
    // be fought as a pressure the arena is under rather than as
    // four more things in the pile.
    //
    // Like the Lancer, its body is harmless. Everything it can do
    // to you happens under the scythe or in the thorns it plants,
    // both of which are drawn before they land. Four units with
    // always-on contact damage in a one-hit-death game would be a
    // different and much worse thing.
    roseKnight: {
        SIZE: 44, SPEED: 1.35, COLOR: "#b5304c",
        HP_BASE: 26, HP_EVERY: 2,

        // Petal guard. Soaks whole hits like the Lancer's shield,
        // but grows a petal back on a timer, so chipping it once
        // and walking away doesn't work.
        GUARD_PETALS: 3,
        GUARD_REGROW_MS: 5200,

        // Cleave: plant, wind the scythe back, then sweep it
        // through. An arc rather than a line - the reach is
        // shorter than a lance's but it covers a whole quadrant,
        // so backing straight off no longer answers it.
        CLEAVE_RANGE: 132,
        CLEAVE_ARC: 1.9,
        // How wide the blade itself is as it travels through
        // that arc - the same idea as the Warrior's 0.5.
        CLEAVE_BLADE: 0.44,
        CLEAVE_WINDUP_MS: 520,
        CLEAVE_MS: 300,
        CLEAVE_COOLDOWN: 2100,

        // Charge: the thrust always flows into it, and it lays
        // thorns the whole way.
        CHARGE_WINDUP_MS: 420,
        CHARGE_MS: 380,
        CHARGE_SPEED: 9.4,
        CHARGE_WIDTH: 46,
        TRAIL_EVERY_PX: 46,
        TRAIL_MS: 5200,

        SCYTHE_LENGTH: 54
    }

};

// Elite signature twists for the garden roster, mirroring the
// castle roster's (see ELITE). Generic elite buffs - x2 HP, x1.2
// size, x1.3 speed, the gold ring - are applied on top by
// makeElite; these are the changes that make an elite a different
// PROBLEM rather than a bigger one.

const GARDEN_ELITE = {

    // Boar: charges faster, and shrugs off anything shot at it
    // mid-charge - so the ranged answer stops working at exactly
    // the moment you need it.
    BOAR_CHARGE_SPEED_MULT: 1.55,
    BOAR_BREAKS_PROJECTILES: true,

    // Hedge Warden: still unkillable in cover, and now hands a
    // flat shield to everything around it as well.
    // Arena-wide, like the drone's aura. There is no radius
    // here on purpose.
    WARDEN_SHIELD_ALLIES: 8,

    // Root Hulk: one long windup, then the WHOLE arena erupts
    // except the ring at its feet. It inverts the fight
    // completely - the only safe place is right next to it.
    //
    // Capped at one per wave, because two overlapping
    // whole-arena stomps leave nowhere to stand at all.
    HULK_FULL_ARENA: true,
    HULK_FULL_TELEGRAPH_MS: 2100,
    // Doubled. The stomp is meant to relocate the player, not to
    // demand pixel-perfect placement - at half this the pocket
    // was small enough that reaching it at all was the whole
    // challenge, rather than deciding to.
    HULK_SAFE_RADIUS: 300,
    HULK_MAX_PER_WAVE: 1,

    // Bramble Archer: a missed arrow still snares the ground.
    ARCHER_SNARE_MS: 3200,
    ARCHER_SNARE_RADIUS: 62,

    // Spore Puffer: two extra clouds per throw, and each splits
    // again as it dies.
    PUFFER_EXTRA_CLOUDS: 2,
    PUFFER_SPLIT_COUNT: 2,

    // Wisp: splits on death AND hastens the whole squad, so
    // killing them is actively counterproductive.
    WISP_SPLIT_COUNT: 2,
    WISP_DEATH_HASTE_MS: 3000,
    WISP_DEATH_HASTE_MULT: 1.35,

    // Pollen Drone: refreshing one-hit ward on top of the aura.
    DRONE_GRANTS_WARD: true,
    DRONE_WARD_REFRESH_MS: 4200,

    // Gardener Shade: replants at full strength.
    SHADE_FULL_REPLANT: true,

    // Vine Weaver: the vines themselves hurt to cross.
    WEAVER_VINE_DAMAGE: true,
    WEAVER_VINE_THICKNESS: 14,
    // The web spans the arena, so a hit-per-frame-per-vine would
    // be several hits for one step into it.
    WEAVER_VINE_HIT_COOLDOWN: 900,

    // Rose Knight: the guard is the fight, so the elite's guard
    // grows back faster than an unfocused player can break it -
    // you have to burst it down inside one window or you never
    // get through at all. And its charge finishes by bursting
    // into a ring of thorns, so the place it stopped is not
    // somewhere you want to have followed it to.
    KNIGHT_GUARD_PETALS: 5,
    KNIGHT_GUARD_REGROW_MULT: 0.42,
    KNIGHT_BLOOM_THORNS: 8,
    KNIGHT_BLOOM_RADIUS: 74,
    // Four knights arrive every wave. Four of them with guards
    // that outpace your damage is not a harder wave, it is a
    // wall - so at most this many of the four roll elite.
    KNIGHT_MAX_PER_WAVE: 2

};


// =====================================
// Act II / III Boss Tuning
// =====================================
//
// One block for all four, because they were written together and
// have to be balanced against each other.
//
// Deliberately on the generous side. Every earlier boss in this
// game is gated behind a shop tier bought with the previous
// boss's coins, and these four have no such tier yet - there is
// no Thorn Matron reward to help with the Greenwarden. Until
// there is, they are tuned to be readable and dramatic rather
// than punishing: long telegraphs, one threat at a time, and a
// real reward window in every fight.
//
// The windows are the important part. Each of these bosses opens
// itself up for a few seconds if the player does the right thing
// - that is what makes a fight feel fought rather than survived.

const ACT2_BOSSES = {

    // Half health is the turn. Every one of these bosses changes
    // gear there rather than merely looking angrier - see
    // bossPhase() in gardenBosses.js.
    PHASE2_THRESHOLD: 0.5,

    matron: {
        HP_BASE: 520, HP_PER_CYCLE: 55,
        SPEED: 1.15,
        SEED_COOLDOWN: 3000,
        // She still has to kneel to reseed, and it is still the
        // punish window - but it is now brief enough that you have
        // to already be on her, not merely notice and start
        // running.
        KNEEL_MS: 800,
        KNEEL_VULN_MULT: 1.6,
        LASH_COOLDOWN: 1700,
        LASH_MIN_COOLDOWN: 850,
        BLOOM_COOLDOWN: 6500,
        BLOOM_COUNT: 3,
        // Warning before each wisp lands, and before each thorn
        // patch becomes dangerous. She seeds a lot of ground at
        // once from across the arena, so both need to announce
        // themselves - damage appearing under the player's feet
        // with no tell is the one thing a telegraphed boss must
        // never do.
        BLOOM_WARN_MS: 750,
        THORN_SPROUT_MS: 650,
        // Spawn telegraphs draw under the cast, so the wisps go
        // out on an arc wide enough to clear her own body -
        // otherwise she stands on top of her own warning.
        BLOOM_ARC_RADIUS: 118,
        BLOOM_ARC_SPREAD: 1.15,
        // Below half: the fan doubles up and the thorns come
        // thicker.
        PHASE2_COOLDOWN_MULT: 0.62,
        PHASE2_SEED_BONUS: 4
    },

    greenwarden: {
        HP_BASE: 620, HP_PER_CYCLE: 62,
        SPEED: 0.85,
        // Meaningfully harder to disarm, and it rebuilds itself
        // less than half as slowly as it used to.
        LIMB_HP: 55,
        REGROW_MS: 11000,
        // The stagger survives as a reward, but it is a window
        // now rather than a holiday.
        STAGGER_MS: 1800,
        FLAIL_COOLDOWN: 1900,
        RAKE_COOLDOWN: 2300,
        SEED_COOLDOWN: 3400,
        // Below half it regrows limbs in PAIRS, so disarming it
        // completely stops being something you can hold.
        PHASE2_COOLDOWN_MULT: 0.6,
        PHASE2_REGROW_PAIRS: true
    },

    heartwood: {
        HP_BASE: 780, HP_PER_CYCLE: 78,
        ROOT_COOLDOWN: 1400,
        ROOT_TELEGRAPH_MS: 480,
        CANOPY_COOLDOWN: 4200,
        SAPLING_COOLDOWN: 5200,
        SAPLING_COUNT: 3,
        SURGE_COOLDOWN: 5600,
        // The core still opens - it is the only way to fight a
        // thing that never moves - but far less often, for less
        // time, and for less payoff.
        CORE_OPEN_EVERY: 13000,
        CORE_OPEN_MS: 1800,
        CORE_DAMAGE_MULT: 1.7,
        // Below half: roots come in pairs and the surge doubles.
        PHASE2_COOLDOWN_MULT: 0.55,
        PHASE2_DOUBLE_ROOTS: true
    },

    herald: {
        HP_BASE: 900, HP_PER_CYCLE: 90,
        SPEED: 1.9,
        // Longer out of reach, and a much shorter window on the
        // ground. You get one good opening per cycle and have to
        // take all of it.
        AIR_MS: 7500,
        GROUND_MS: 3200,
        PILLAR_COOLDOWN: 1500,
        PILLAR_COUNT: 3,
        MARK_COOLDOWN: 4000,
        LANDING_SHOCK_RADIUS: 210,
        // Below half: five pillars at a time, and it barely
        // touches down.
        PHASE2_COOLDOWN_MULT: 0.6,
        PHASE2_PILLAR_COUNT: 5,
        PHASE2_GROUND_MULT: 0.7
    }

};


// =====================================
// Angel Roster (Act III, waves 31-40)
// =====================================
//
// The third and last roster, and deliberately a different kind
// of pressure again.
//
//   The castle came AT you.       Melee and volume.
//   The garden took the GROUND.   Denial and attrition.
//   The angels JUDGE you.         Precision and consequence.
//
// Almost nothing here mills around. They telegraph hard, commit
// hard, and punish a specific mistake - standing in the open,
// attacking from the front, ignoring a mark. Fights are short
// exchanges with clear right answers, which is the correct shape
// for the last stretch of a run where the player is at their
// strongest and wants to be tested rather than ground down.

const ANGELS = {

    EMERGE_MS: 620,

    cherub: {
        SIZE: 34, SPEED: 1.45, COLOR: "#f2efe0",
        HP_BASE: 12, HP_EVERY: 3,
        // Flies in a fixed formation offset from its flightmates
        // instead of converging, so a squad arrives as a line.
        PREFERRED_RANGE: 250,
        SHOOT_COOLDOWN: 2000,
        BOLT_SPEED: 6.4
    },

    gateWarden: {
        SIZE: 66, SPEED: 0.72, COLOR: "#cfd6e8",
        HP_BASE: 26, HP_EVERY: 2,
        // Blocks damage arriving within this arc of its facing.
        // The counterplay is a flank, not a bigger number - which
        // is why it is the one angel that ignores raw damage.
        SHIELD_ARC: Math.PI * 0.62,
        SHIELD_LEAK: 0.15
    },

    censer: {
        SIZE: 48, SPEED: 0.95, COLOR: "#e8c168",
        HP_BASE: 20, HP_EVERY: 2,
        // A burning censer swung on a chain - a ring of hurt that
        // moves with it, so it denies the space it occupies
        // rather than aiming at anything.
        CHAIN_RADIUS: 96,
        SPIN_MS: 2600
    },

    scribe: {
        SIZE: 40, SPEED: 1.0, COLOR: "#b7a6e8",
        HP_BASE: 16, HP_EVERY: 3,
        PREFERRED_RANGE: 330,
        MARK_COOLDOWN: 6200,
        // How long you have to break line of sight before the
        // mark lands. The arenas are full of occluders; this is
        // what they are for.
        MARK_FUSE_MS: 2400,
        MARK_RADIUS: 118
    },

    choir: {
        SIZE: 38, SPEED: 0.9, COLOR: "#ffe9a8",
        HP_BASE: 18, HP_EVERY: 3,
        PREFERRED_RANGE: 360,
        // While a Choir lives, the first angel to fall gets back
        // up once. THE kill-order unit of the roster.
        REVIVE_COOLDOWN: 7000,
        REVIVE_HP_FRACTION: 0.5
    },

    seraphBlade: {
        SIZE: 44, SPEED: 1.15, COLOR: "#9fd8ff",
        HP_BASE: 19, HP_EVERY: 2,
        // Telegraphs a line clean across the arena, then crosses
        // it. Dodgeable by stepping off the line - never by
        // out-running it.
        DASH_COOLDOWN: 4200,
        TELEGRAPH_MS: 900,
        DASH_SPEED: 11
    }

};

// Elite signature twists, same contract as ELITE/GARDEN_ELITE:
// generic buffs on top, these are what make it a different
// problem rather than a bigger one.

const ANGEL_ELITE = {

    // Cherub: bolts split into a cross on impact.
    CHERUB_SPLIT: 4,

    // Gate Warden: the shield covers its whole body, so there is
    // no flank - only breaking it by attacking while it swings.
    WARDEN_FULL_ARC: true,

    // Censer: two chains at opposite ends, so the safe gap is
    // halved and moves.
    CENSER_SECOND_CHAIN: true,

    // Scribe: the mark chains to where you were, so simply
    // running does not reset it.
    SCRIBE_ECHO_MARK: true,

    // Choir: revives everything, repeatedly, until it is dead.
    CHOIR_UNLIMITED: true,

    // Seraph Blade: crosses back on a second line.
    BLADE_RETURN_PASS: true

};

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
    prince: "the Prince",
    princess: "the Princess",
    hero: "the Hero",
    king: "the King",

    // Act II - the grounds.
    boar: "a Thornback Boar",
    hedgeWarden: "a Hedge Warden",
    rootHulk: "a Root Hulk",
    brambleArcher: "a Bramble Archer",
    sporePuffer: "a Spore Puffer",
    wisp: "a Wisp",
    pollenDrone: "a Pollen Drone",
    gardenerShade: "a Gardener Shade",
    vineWeaver: "a Vine Weaver",
    roseKnight: "a Rose Knight",

    thornMatron: "the Thorn Matron",
    greenwarden: "the Greenwarden",
    heartwood: "the Heartwood",
    herald: "the Herald",

    // Act III - the storm.
    cherub: "a Cherub",
    gateWarden: "a Gate Warden",
    censer: "a Censer",
    scribe: "a Scribe",
    choir: "a Choir",
    seraphBlade: "a Seraph Blade"

};

// =====================================
// Elite Modifier
// =====================================
//
// Elites aren't a new class - makeElite() in
// entities/elite.js buffs an existing enemy instance, flags
// it, and layers on a per-type twist (see the switch there).
// Bosses are excluded.
//
// SPAWNING is deterministic, not a per-spawn gamble: within
// each 5-wave block ending in a boss (1-5, 6-10, ...), the
// 2nd and 3rd waves of the block (wave % 5 == 2 or 3) are
// "elite waves". The count ramps every elite wave: START_COUNT
// on the first one (wave 2), then +PER_WAVE_STEP on each
// subsequent elite wave (wave 3 = 3, wave 7 = 4, wave 8 = 5,
// ...). Those elites are distributed randomly across the
// wave's eligible spawns. See eliteCountForWave()/spawnEnemy()
// in wave.js.

const ELITE = {

    HP_MULTIPLIER: 2,
    SIZE_MULTIPLIER: 1.2,
    SPEED_MULTIPLIER: 1.3,

    GLOW_COLOR: "gold",

    // Elites on the very first elite wave, and how much the
    // count grows on each elite wave after it.
    START_COUNT: 2,
    PER_WAVE_STEP: 1,

    // --- Per-type twists (see makeElite) ---

    // Tank: aura that makes every OTHER enemy inside it
    // damage-immune (the elite tank itself stays hittable) -
    // "kill the tank first" pressure.
    TANK_AURA_RADIUS: 170,

    // Archer: 3-arrow fan per shot.
    ARCHER_FAN_COUNT: 3,
    ARCHER_FAN_SPREAD: 0.2,

    // Fire Mage: multiplier on the fire cast's area (the
    // burning ground it leaves scales with it).
    FIRE_AREA_SCALE: 1.6,

    // Necromancer: kites at range like an archer instead of
    // marching into melee, and its summons come out elite.
    NECRO_KITE_RANGE: 300,

    // Elite skeleton dagger - a short telegraphed swing that
    // extends its kill reach beyond plain body contact.
    SKELETON_DAGGER_RANGE: 80,
    SKELETON_DAGGER_WINDUP: 300,
    SKELETON_DAGGER_SWING: 160,
    SKELETON_DAGGER_COOLDOWN: 1300,

    // Lancer: tougher shield, dashes without needing the
    // shield broken first, and periodically wards nearby
    // allies with 1-hit shields.
    LANCER_SHIELD_HITS: 3,
    LANCER_WARD_RADIUS: 220,
    LANCER_WARD_INTERVAL: 4000,

    // Shade: a smaller, faster blink-assassin. TEMPO scales
    // vanish/windup down (dash "happens faster"), LUNGE
    // scales the dash speed up, COOLDOWN shortens the gap
    // between teleports.
    SHADE_SIZE_SCALE: 0.8,
    SHADE_TEMPO_SCALE: 0.55,
    SHADE_LUNGE_SCALE: 1.5,
    SHADE_COOLDOWN_SCALE: 0.6,

    // Frost Weaver: instead of one patch, lays a full row of
    // ice from itself through the player - a King's-Blade-
    // style line, but it slows instead of damaging. WIDTH is
    // the row's total width (the Blade's beam is 30).
    WEAVER_ROW_WIDTH: 90,
    WEAVER_ROW_SPACING: 40,
    WEAVER_ROW_LENGTH: 1000,

    // Powder Keg: death scatters cluster bombs around the
    // blast that explode after a fuse, each scorching its own
    // (smaller) kill zone.
    KEG_CLUSTER_COUNT: 4,
    KEG_CLUSTER_RADIUS: 65,
    KEG_CLUSTER_FUSE: 1000,
    KEG_CLUSTER_SCATTER: 120,

    // Blood Cleric: wards come out twice as fast, and a ward
    // from an elite cleric also hastes its holder until the
    // shield breaks.
    CLERIC_WARD_RATE_SCALE: 0.5,
    CLERIC_HASTE: 1.25

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
// The Prince & Princess (Wave 20 Boss)
// =====================================
//
// A linked pair rather than a single boss - the Prince is a
// close-range brawler, the Princess a far-range support/CC
// caster who periodically heals and buffs him. Both must die
// for the wave to clear (see onEnemyKilled in game.js); killing
// the Princess first denies the sustain but transforms the
// Prince into Hero (see the HERO block below, applied in
// prince.js), so there's a real choice either way.

const PRINCE = {

    SIZE: 72,

    // Deliberately slow - a mobility pass cut this hard from an
    // earlier 1.7. He used to out-chase everyone; now standing
    // your ground or kiting is a real option, and his threat
    // comes from Quake Slam / Royal Judgment (below) reaching
    // out to you instead of him running you down.
    SPEED: 0.7,
    COLOR: "#7a1f3d",

    // Same wave-scaling scheme as the other bosses. Debuts at
    // 100 + 20*7 = 240 HP.
    BASE_HP: 100,
    HP_PER_WAVE: 7,

    // Leap-slam: still his gap-closer, and shorter now that it's
    // not his primary way of reaching you (see the ranged/AOE
    // lanes below) - a telegraphed leap onto the player's
    // current position, landing in a damaging AOE burst. Used
    // whenever he's out of cleave range and off cooldown.
    // Frequency has been tuned twice: an early pass cut it from
    // 2800 to 6500 (too rare), this pass halves that back down -
    // twice as often as the too-rare version, landing between
    // the two extremes. (No numeric damage here or below -
    // contact with the player is a binary takeHit() in this
    // game, not a variable damage amount; what actually makes a
    // hit scarier is reach/arc/frequency.)
    LEAP_TELEGRAPH_MS: 600,
    LEAP_SPEED: 7,
    LEAP_DURATION: 28,
    LEAP_COOLDOWN: 3250,
    SLAM_RADIUS: 110,

    // Up-close fist cleave once Leap is on cooldown - same
    // angle-arc hit test as the Knight's sword (see
    // Knight.checkSwordHit), just shorter reach and a faster
    // cadence, and drawn as fists rather than a blade. Nudged
    // back down slightly to give melee a hair more breathing
    // room between hits now that Quake/Judgment are more of a
    // presence too (see below).
    CLEAVE_RANGE: 78,
    CLEAVE_ARC: Math.PI * 1.1,
    CLEAVE_SWING_MS: 22,
    CLEAVE_COOLDOWN: 950,

    // Fury Combo - land 2 cleaves within COMBO_WINDOW_MS of each
    // other and the 3rd is a bigger, wider Finisher instead. The
    // combo resets if the window lapses without a landed hit.
    COMBO_WINDOW_MS: 2500,
    FINISHER_ARC: Math.PI * 1.7,

    // Battle Roar - an independent self-buff on its own
    // cooldown (parallel to leap/cleave, same shape as Royal
    // Magus running skills alongside his lightning shower):
    // a temporary speed + attack-speed surge, so the fight has
    // a second escalating rhythm besides the leap/cleave loop.
    ROAR_COOLDOWN: 6500,
    ROAR_DURATION_MS: 2500,
    ROAR_SPEED_MULT: 1.3,
    ROAR_COOLDOWN_MULT: 0.75,
    ROAR_COLOR: "#ff5a3d",

    // Quake Slam - an independent AOE lane, usable at ANY range
    // (his answer to being kited now that he's slow): a
    // telegraphed shockwave centered on himself. Radius cut
    // hard (230 -> 170) after melee feedback: at 230 it covered
    // roughly 3x his own cleave range, so anyone actually
    // fighting him in melee ate it completely unavoidably every
    // cooldown regardless of skill, while a ranged player was
    // already well clear of it either way - all downside for
    // melee, no real tradeoff for kiting. 170 still comfortably
    // outranges the 78px cleave (so it's still a real threat up
    // close) but leaves room to actually step out during the
    // telegraph.
    QUAKE_COOLDOWN: 5500,
    QUAKE_TELEGRAPH_MS: 900,
    QUAKE_RADIUS: 170,
    QUAKE_COLOR: "#c9482f",

    // Royal Judgment - his far-range answer: a telegraphed,
    // dodgeable strike of light at the player's position when
    // it's cast (mirrors MeteorStrike's telegraph-then-impact in
    // royalMagus.js), so standing at range isn't free either.
    // Frequency and radius both increased - kiting at max range
    // and sniping all fight was trivializing the fight for the
    // ranged classes, and this (with the weak laser below) is
    // the only lane that actually reaches a player who never
    // comes near him. (Was a thrown boulder - reskinned to
    // something that reads as royal/arcane rather than
    // barbaric; same shape, new theme.)
    JUDGMENT_COOLDOWN: 3400,
    JUDGMENT_TELEGRAPH_MS: 1000,
    JUDGMENT_RADIUS: 130,
    JUDGMENT_COLOR: "#ffd76a",

    // Guard - shields the Princess. A committed 2s channel
    // (rooted, same as the leap telegraph) that grants her a
    // flat GUARD_SHIELD_HP damage-absorption shield (see the
    // generic shieldHp handling in Enemy.takeDamage). Only
    // starts if she's alive, unshielded, and within
    // GUARD_CAST_RANGE - otherwise retries shortly rather than
    // burning the full cooldown on a no-op.
    GUARD_COOLDOWN: 9000,
    GUARD_RETRY_MS: 1200,
    GUARD_CHANNEL_MS: 2000,
    GUARD_SHIELD_HP: 20,
    GUARD_CAST_RANGE: 320,
    GUARD_COLOR: "#ffd76a"

};

// =====================================
// Hero Form (Prince, post-transformation)
// =====================================
//
// What used to happen when the Princess died was a flat enrage
// bump - every class found the fight trivial once she was gone,
// since the real difficulty was HER assisting him, not him
// alone. This replaces that entirely: her death now triggers a
// full form change. A brief full-sim freeze (applyHitStop, same
// mechanism as HITSTOP.BOSS_KILL_MS but much longer - see
// triggerHeroTransformation in prince.js) plays out a
// transformation beat with nothing moving, then he returns
// yellow/glowing, faster, with every cooldown tightened and his
// AOE/ranged reach widened - "a completely different boss
// fight" rather than a numeric tweak. this.type stays "prince"
// throughout (SIBLINGS_CLASS_DAMAGE_SCALE and the various
// Game.enemies.find(e => e.type === "prince") lookups all keep
// working unchanged) - only this.isHero and this.color flip.
const HERO = {

    COLOR: "#ffe066",
    GLOW_COLOR: "#fff6c9",

    // Real ms, not scaled - same as HITSTOP.BOSS_KILL_MS. Long
    // enough to read as a real beat, short enough not to become
    // a chore on every repeat run.
    TRANSFORM_FREEZE_MS: 1900,

    // One-time multiplies applied when the freeze ends, on top
    // of whatever he already is (phase2's speed bump included) -
    // same "permanent, never reverts" shape as phase2 itself.
    //
    // Toned down from an earlier pass (1.6 / 0.65 / 1.2) once
    // Hero picked up 3 full new attack lanes below - stacking
    // the original aggressive multipliers on top of a much
    // bigger kit made the fight nearly unwinnable. Still
    // meaningfully faster/tighter/wider than the base Prince,
    // just not as extreme now that the new moves carry more of
    // the threat themselves.
    SPEED_MULT: 1.35,
    COOLDOWN_MULT: 0.8,

    // Widens Slam/Quake/Judgment's AOE reach - "much stronger...
    // at all ranges" needs more than just faster cooldowns.
    RADIUS_MULT: 1.1,

    // Leap-slam is his only real "dash" - an ABSOLUTE cooldown
    // (bypasses getCooldownMultiplier entirely) so it stays
    // deliberately half as frequent as the base Prince's, even
    // though everything else about Hero is faster on cooldown.
    LEAP_COOLDOWN: PRINCE.LEAP_COOLDOWN * 2,

    // Royal Judgment's telegraph runs a touch longer for Hero
    // than the base Prince's - his kit already piles on 3 brand
    // new lanes, so this one inherited attack gives a little more
    // reaction time rather than also landing faster.
    JUDGMENT_TELEGRAPH_MS: PRINCE.JUDGMENT_TELEGRAPH_MS * 1.15,

    // Right-arm swing: a wide wall of fire thrown forward along
    // wherever the player was standing when it's cast (locked at
    // cast time, same fairness as every other telegraphed attack
    // in this fight). Travels outward from HIM rather than
    // sweeping the whole screen - dodge by stepping sideways out
    // of its width, not by dashing through it (that's the
    // Sweeping Laser's trick, below).
    FIREWALL_COOLDOWN: 5200,
    FIREWALL_TELEGRAPH_MS: 550,
    FIREWALL_WIDTH: 220,
    FIREWALL_HALF_THICKNESS: 45,
    FIREWALL_TRAVEL_DISTANCE: 560,
    FIREWALL_TRAVEL_MS: 750,
    FIREWALL_COLOR: "#ff5a1f",
    FIREWALL_GLOW_COLOR: "#ffae42",

    // Left-hand swing: his own empowerment - replaces the plain
    // Prince's Battle Roar (speed + cooldown only) with a 3-stat
    // version once he's Hero, adding a temporary swell to his
    // AOE attacks' radius on top (see getTempRadiusMultiplier()
    // in prince.js). Reuses the same roarTimer/roarCooldown
    // fields Battle Roar already used - just bigger numbers and
    // a 3rd stat, not a whole new lane.
    EMPOWER_COOLDOWN: 7000,
    EMPOWER_DURATION_MS: 3000,
    EMPOWER_SPEED_MULT: 1.3,
    EMPOWER_COOLDOWN_MULT: 0.7,
    EMPOWER_RADIUS_MULT: 1.25,
    EMPOWER_COLOR: "#fff3b0",

    // Sweeping laser: a full-screen beam that physically
    // translates across the arena rather than firing in place.
    // Standing still or walking away from a screen-spanning beam
    // isn't a real option - the only reliable way through is a
    // well-timed dash, since the brief invulnerability it grants
    // (DASH.GRACE_MS in player.js) is what actually saves you,
    // not outrunning it on foot.
    //
    // SWEEP_COOLDOWN is an ABSOLUTE value - deliberately NOT run
    // through getCooldownMultiplier() (bypassed the same way
    // LEAP_COOLDOWN is), so Empower's haste can never shrink the
    // gap between sweeps. It's pinned just above the Mage's own
    // Arcane Step cooldown (ARCANE_STEP.COOLDOWN, 5000ms) - the
    // Mage has no other dash, so if this ever landed faster than
    // that dash could recharge, some sweeps would simply be
    // undodgeable for that class regardless of skill.
    SWEEP_COOLDOWN: ARCANE_STEP.COOLDOWN + 400,
    SWEEP_TELEGRAPH_MS: 900,
    SWEEP_DURATION_MS: 1500,

    // Thinner than the first pass - still a real threat, but not
    // so wide that a well-timed dash can fail to clear both edges.
    SWEEP_WIDTH: 58,
    SWEEP_COLOR: "#fff3b0",
    SWEEP_RIM_COLOR: "#ff8c1a"

};

const PRINCESS = {

    SIZE: 48,
    SPEED: 1,
    COLOR: "#b76e9e",

    // Debuts at 45 + 20*3 = 105 HP.
    BASE_HP: 45,
    HP_PER_WAVE: 3,

    // Kiting - same preferred-range dance as the Archer/Royal
    // Magus (see Archer.move()).
    PREFERRED_RANGE: 400,

    // Personal damage - still not a solo DPS threat, but no
    // longer a total non-event either. Slowed back down after
    // the Volley lane (below) was removed for being a basically
    // guaranteed hit at close range - the bolt alone shouldn't
    // fill that same "constant pressure" role on its own.
    BOLT_DAMAGE: 2,
    BOLT_SPEED: 7,
    BOLT_COOLDOWN: 2200,

    // Map-wide teleport - an independent lane, fires whenever
    // off cooldown and relocates her to a random arena point
    // biased away from wherever the player currently is (see
    // teleportAcrossMap() in princess.js), so it reads as a real
    // reposition rather than a coin-flip that might land her
    // right next to you.
    BLINK_COOLDOWN: 20000,

    // A much weaker, much narrower echo of the King's own laser
    // (see WALL_LASER on KING and King's Blade on KINGS_BLADE) -
    // a single telegraphed line toward wherever the player was
    // standing when it was cast, not an arena-spanning wall.
    // Frequency and width both bumped up a notch - same reason
    // as Royal Judgment above: this is one of only two lanes
    // (with Judgment) that can actually threaten a player who
    // kites at long range the entire fight. Still well short of
    // the King's own 46px wall or the Warrior's 30px King's
    // Blade laser.
    LASER_COOLDOWN: 5000,
    LASER_TELEGRAPH_MS: 650,
    LASER_WIDTH: 20,
    LASER_COLOR: "#8fd6ff",

    // Slow zone - a growing ground patch (reuses FrostZone's
    // grow-in mechanic from hazard.js, just with her own
    // timing/palette so it's parameterized rather than hard-
    // wired to the Frost Weaver's numbers).
    ZONE_RADIUS: 150,
    ZONE_GROW_MS: 600,
    ZONE_DURATION_MS: 4000,
    ZONE_COOLDOWN: 4000,
    ZONE_PALETTE: { fill: "#e0a8cc", rim: "#f5d0e8", spark: "#ffe8f5" },

    // Binding Curse - a telegraphed hard root (distinct from the
    // slow zone) on anyone caught when the telegraph resolves.
    // Range trimmed down from an earlier pass - it was landing
    // as a near-arena-wide root, much bigger than intended.
    CURSE_COOLDOWN: 6500,
    CURSE_TELEGRAPH_MS: 700,
    CURSE_ROOT_MS: 900,
    CURSE_RANGE: 150,
    CURSE_COLOR: "#8e4fc9",

    // Heal/buff channel on the Prince - her one vulnerability
    // window (rooted in move(), same as Blood Cleric's tether).
    // Casts every time it's off cooldown regardless of his
    // current HP (a no-op heal if he's topped off, but the buff
    // still lands).
    HEAL_COOLDOWN: 7000,
    HEAL_CHANNEL_MS: 1500,
    HEAL_FRACTION: 0.2,
    BUFF_DURATION_MS: 7000,
    BUFF_SPEED_MULT: 1.3,
    BUFF_COOLDOWN_MULT: 0.6,
    TETHER_COLOR: "#e8c84a"

};

// =====================================
// Siblings Phase 2 - the 50% sacrifice
// =====================================
//
// Tracked per-fight in Game.siblingsPhase (reset to 1 by
// startSiblingsWave() in wave.js). While phase 1, the Princess's
// takeDamage() floors her hp at 1 (see princess.js) - she can be
// battered down but not actually killed yet. The moment their
// COMBINED current hp drops to TRIGGER_HP_FRACTION of their
// combined max hp (checked every frame in Princess.attack() -
// since her hp is floored, this is really driven by how much the
// Prince himself has been damaged), the transition fires ONCE:
// she pours her remaining life into him (healing him up to
// PRINCE_HEAL_TO_FRACTION of his own max hp) and loses her floor
// for good - one more hit ends her from here on. Both siblings
// also get a permanent phase-2 escalation on top of whatever
// enrage/roar/buff timers happen to be running.

const SIBLINGS_PHASE2 = {
    TRIGGER_HP_FRACTION: 0.5,
    PRINCE_HEAL_TO_FRACTION: 0.5,
    PRINCE_SPEED_MULT: 1.2,
    PRINCE_COOLDOWN_MULT: 0.75
};

// =====================================
// Siblings Fight - Per-Class Damage Scale
// =====================================
//
// Difficulty feedback landed all over the map by class: Warrior
// was a well-tuned 8/10, but Ranger/Mage/Thief were all sitting
// noticeably easier despite facing the identical boss kit - the
// gap is in how much damage each class can pour out, not in what
// the fight throws back. Rather than retune the fight itself
// (and risk un-tuning Warrior, which is already right), this
// scales every hit landed on either sibling by whichever class is
// current - see the takeDamage() check in enemy.js. Same idea as
// the Mage's existing per-boss mageDamageTo() scaling, just
// keyed by class and specific to this one fight rather than
// every boss in the game.
const SIBLINGS_CLASS_DAMAGE_SCALE = {
    warrior: 1.0,
    mage: 1.0,
    ranger: 1.0,
    thief: 0.45
};

// =====================================
// King (Wave 25 Boss)
// =====================================

const KING = {

    SIZE: 130,
    SPEED: 0.56,
    COLOR: "#6a0dad",

    // Same wave-scaling scheme as the Castle Guard / Knight:
    // 5 + 25 x 5 = 130 on his debut wave, growing every cycle
    // he recurs in Boss Rush / Endless / Custom. BASE_HP was 30
    // when he debuted at wave 20 - dropped by 25 (5 waves x his
    // own HP_PER_WAVE) when the Prince & Princess fight pushed
    // him back to wave 25, so his actual debut power level is
    // unchanged rather than silently gaining ~19% HP for free.
    BASE_HP: 5,
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

    // Arena-look bands. Deliberately SEPARATE constants from the
    // SET*_START values above: those drive which enemies spawn,
    // and the arena changes on its own cadence - one look per
    // boss, every five waves. Editing these changes only what the
    // floor/pillars/lighting look like (see updateArenaForWave in
    // arena.js), never what walks in.
    //
    // The campaign runs in three acts of three arenas each, and
    // each act has its own roster - see GARDEN_START/STORM_START,
    // which are the two places the enemy pool actually changes.
    //
    //   ACT I - the castle. Castle roster.
    //     1-5    castle    Castle Guard
    //     6-10   night     Knight
    //    11-15   throne    Royal Magus
    //
    //   ACT II - the grounds. Garden roster, no castle units.
    //    16-20   garden    Thorn Matron
    //    21-25   maze      Greenwarden
    //    26-30   grove     Heartwood
    //
    //   ACT III - the storm. Angel roster.
    //    31-35   storm     Herald
    //    36-40   stormGrove Prince & Princess / Hero
    //    41-50   final     every roster, then the King
    //
    // The last band is TEN waves, not five: nine waves recapping
    // everything the run has fought, then the King. Anything that
    // assumes a five-wave cadence has to read these constants
    // rather than doing its own modulo - see isEliteWave() and
    // the Boss Rush jump in wave.js.
    ARENA_GARDEN_START: 16,
    ARENA_MAZE_START: 21,
    ARENA_GROVE_START: 26,
    ARENA_STORM_START: 31,
    ARENA_STORM_GROVE_START: 36,
    ARENA_FINAL_START: 41,

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

    // Which roster walks in.
    //
    // Only two lines in the whole campaign change the enemy pool,
    // and these are they: at GARDEN_START the castle units stop
    // spawning entirely and the garden roster takes over, and at
    // STORM_START the angels do the same. The final band mixes
    // all three again for its recap (see getFinalCounts).
    GARDEN_START: 16,
    STORM_START: 31,

    BOSS_WAVE: 5,
    KNIGHT_WAVE: 10,
    MAGUS_WAVE: 15,

    // Act II bosses.
    MATRON_WAVE: 20,
    GREENWARDEN_WAVE: 25,
    HEARTWOOD_WAVE: 30,

    // Act III.
    HERALD_WAVE: 35,
    SIBLINGS_WAVE: 40,
    KING_WAVE: 50,

    BOSS_ESCORT_GRUNTS: 8,
    BOSS_ESCORT_TANKS: 4,

    // Long enough for the wave-clear tally (coins earned,
    // dash refunded) to actually read as a breather beat.
    TRANSITION_TIME: 2500,

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
// (bosses recur every 5 waves via a modulo-25 cycle - see
// startWave in wave.js) but there is no victory. Past the King
// (wave 25) the difficulty ramps: every wave beyond that adds a
// little enemy HP and speed, so how far you get is the score.
// (Elites follow the same deterministic elite-wave schedule as
// every other mode - see ELITE.) RAMP_START is WAVES.KING_WAVE.

const ENDLESS = {

    RAMP_START: WAVES.KING_WAVE,

    // Enemy HP multiplier: +HP_PER_WAVE per wave past RAMP_START,
    // on top of the normal per-wave HP formulas, capped at HP_MAX.
    HP_PER_WAVE: 0.06,
    HP_MAX: 4.0,

    // Enemy speed: added to the flat 1.2 combat multiplier per
    // wave past RAMP_START, capped at SPEED_MAX.
    SPEED_PER_WAVE: 0.015,
    SPEED_MAX: 1.9

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
// Damage Numbers
// =====================================
//
// Crits are 1.5x a normal hit's size (and pop harder on
// spawn - see DamageNumber.getScale), so the payoff of
// stacking crit rate is visible in the fight rather than
// buried in a stat screen.

const DAMAGE_NUMBER = {
    SIZE: 22,
    CRIT_SIZE: 33
};

// =====================================
// Boss Enrage (visual)
// =====================================
//
// Below THRESHOLD health a boss visibly turns: its plate
// cracks, its colour runs hot, and it pulses faster the closer
// it is to death. Purely presentational - no stat changes -
// but boss fights are read through escalation, and with HP now
// scaling every cycle (see BOSS/KING hpAtWave) the late fights
// are long enough that they need a visible second act.
//
// Applied centrally in Enemy.draw, so all four bosses get it.

const BOSS_ENRAGE = {

    THRESHOLD: 0.5,

    // Colour the body drifts toward, and how far at 0 HP.
    HOT_COLOR: [255, 70, 30],
    MAX_TINT: 0.55,

    // Pulse period in ms at the threshold vs. at death.
    PULSE_SLOW_MS: 420,
    PULSE_FAST_MS: 140,

    CRACK_COLOR: "rgba(20, 5, 2, 0.85)",
    CRACK_GLOW: "rgba(255, 120, 40, 0.9)"

};

// =====================================
// Bestiary
// =====================================
//
// The creatures grid lists every normal enemy followed
// immediately by its elite version (grunt, elite grunt, tank,
// elite tank, ...), split across as many pages as it takes;
// every boss then gets its own dedicated page (with lore),
// flipped through with arrows like the Armoury's class
// selector.

const BESTIARY_BASE_ORDER = [
    // Act I - the castle.
    "grunt", "tank", "archer", "runner",
    "fireMage", "necromancer", "skeleton", "lancer",
    "shade", "frostWeaver", "powderKeg", "bloodCleric",

    // Act II - the grounds.
    "boar", "hedgeWarden", "rootHulk", "brambleArcher",
    "sporePuffer", "wisp", "pollenDrone", "gardenerShade",
    "vineWeaver", "roseKnight",

    // Act III - the storm.
    "cherub", "gateWarden", "censer", "scribe", "choir", "seraphBlade"
];

const BESTIARY_BOSS_ORDER = [
    "boss", "knight", "royalMagus",
    "thornMatron", "greenwarden", "heartwood",
    "herald", "prince", "princess", "king"
];

const BESTIARY = {

    grunt: {
        name: "Grunt",
        color: "red",
        size: 40,
        isBoss: false,
        desc: "The arena's cannon fodder. Slow-witted but relentless.",
        behavior: "Walks straight toward you for a melee hit.",
        hpAtWave(w) { return 2 + Math.floor((w - 1) / 6); },
        hpScale: "Starts at 2 HP, gains 1 more every 6 waves",
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
        hpScale: "Starts at 4 HP, gains 1 more every 3 waves",
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
        hpScale: "Starts at 2 HP, gains 1 more every 10 waves",
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
        hpScale: "Starts at 2 HP, gains 1 more every 10 waves",
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
        hpScale: `${BOSS.BASE_HP} HP, plus ${BOSS.HP_PER_WAVE} for every wave you've reached`,
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
        hpScale: `${KNIGHT.BASE_HP} HP, plus ${KNIGHT.HP_PER_WAVE} for every wave you've reached`,
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
        hpScale: "Starts at 2 HP, gains 1 more every 10 waves",
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
        hpScale: "Starts at 3 HP, gains 1 more every 10 waves",
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
        hpScale: "Half a Grunt's HP (rounded down) plus 1 — never below 2",
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
        hpScale: "Starts at 2 HP, gains 1 more every 6 waves",
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
        hpScale: "Starts at 3 HP, gains 1 more every 8 waves",
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
        hpScale: "Starts at 3 HP, gains 1 more every 10 waves",
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
        hpScale: "Always 2 HP — never gets tougher",
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
        hpScale: "Starts at 4 HP, gains 1 more every 8 waves",
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
        hpScale: `${MAGUS.BASE_HP} HP, plus ${MAGUS.HP_PER_WAVE} for every wave you've reached`,
        baseSpeed: MAGUS.SPEED
    },

    prince: {
        name: "Prince",
        color: "#7a1f3d",
        size: 72,
        isBoss: true,
        desc: "One of the wave 20 gatekeepers - a linked pair; both must fall.",
        behavior: "Slow-moving but not safe at any range: quakes the ground around himself, calls down a Royal Judgment at distance, and still leaps in occasionally for a slam. Up close, chain 3 cleaves and the last one is a bigger Finisher. Periodically channels a shield onto the Princess (rooted while casting), and roars for a speed/haste surge. If the Princess dies first, he transforms into Hero - faster, tighter on cooldown, and wider-reaching at every range.",
        lore: "The King's heir, blooded in the arena since he could walk. His father taught him the only lesson that mattered: an audience only remembers who was still standing.",
        hpAtWave(w) { return PRINCE.BASE_HP + w * PRINCE.HP_PER_WAVE; },
        hpScale: `${PRINCE.BASE_HP} HP, plus ${PRINCE.HP_PER_WAVE} for every wave you've reached`,
        baseSpeed: PRINCE.SPEED,

        // Toggled view for the bestiary's swap button (see
        // drawBestiaryBossPage in ui.js) - not a separate page,
        // just an overlay of these fields onto the entry above.
        // Same size/HP as the Prince (the transformation doesn't
        // change either), so those fields are deliberately left
        // out here and inherited from the spread instead.
        hero: {
            name: "Hero",
            color: HERO.COLOR,
            desc: "What the Prince becomes if the Princess falls first - no longer holding anything back.",
            behavior: "Faster and tighter on cooldown, though he leaps far less often now - his real threat is a new moveset: a wall of fire hurled forward with his right arm (step out of its width to dodge), a screen-wide sweeping laser only a well-timed dash can carry you through, and a left-hand swing that empowers his speed, cooldowns, and AOE reach all at once. No longer shields anyone - there's no one left to protect.",
            lore: "Stripped of the audience he performed for, only the fighting remains. Whatever was left of the prince burns away with her.",
            baseSpeed: PRINCE.SPEED * HERO.SPEED_MULT
        }
    },

    princess: {
        name: "Princess",
        color: "#b76e9e",
        size: 48,
        isBoss: true,
        desc: "The other wave 20 gatekeeper - a linked pair; both must fall.",
        behavior: "Kites at range, peppers bolts, drops slowing zones, casts a telegraphed root, and looses a weak laser - plus an occasional teleport clear across the arena. Periodically heals and empowers the Prince - rooted while she channels it. The Prince can also shield her outright, so break it before she's actually vulnerable. Once the pair's combined hp drops to half, she pours the rest of herself into him and can finally be killed.",
        lore: "Where her brother learned the sword, she learned the court - poisons, wards, and the patient art of keeping a favorite alive. She has never needed to lift a blade herself, so long as he's still standing.",
        hpAtWave(w) { return PRINCESS.BASE_HP + w * PRINCESS.HP_PER_WAVE; },
        hpScale: `${PRINCESS.BASE_HP} HP, plus ${PRINCESS.HP_PER_WAVE} for every wave you've reached`,
        baseSpeed: PRINCESS.SPEED
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
        hpScale: `${KING.BASE_HP} HP, plus ${KING.HP_PER_WAVE} for every wave you've reached`,
        baseSpeed: KING.SPEED
    },

    // =====================================
    // Act II - the grounds (waves 16-30)
    // =====================================

    boar: {
        name: "Thornback Boar", color: GARDEN.boar.COLOR, size: GARDEN.boar.SIZE,
        isBoss: false,
        desc: "A bristling thing that would rather redraw the arena than fight in it.",
        behavior: "Paws the ground, then charges in a straight line until it hits something, laying bramble the whole way. Nothing shoves it off course, and the trail outlives the boar.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.boar, w); },
        hpScale: `${GARDEN.boar.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.boar.HP_EVERY} waves`,
        baseSpeed: GARDEN.boar.SPEED
    },

    hedgeWarden: {
        name: "Hedge Warden", color: GARDEN.hedgeWarden.COLOR, size: GARDEN.hedgeWarden.SIZE,
        isBoss: false,
        desc: "Living topiary. It heals from the garden itself.",
        behavior: "Cannot be killed at all while it stands near a bush or a tree - and the whole border of the garden is both. Drag it into the open, or don't fight it.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.hedgeWarden, w); },
        hpScale: `${GARDEN.hedgeWarden.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.hedgeWarden.HP_EVERY} waves`,
        baseSpeed: GARDEN.hedgeWarden.SPEED
    },

    rootHulk: {
        name: "Root Hulk", color: GARDEN.rootHulk.COLOR, size: GARDEN.rootHulk.SIZE,
        isBoss: false,
        desc: "A knot of old roots that walks. Backing away from it is a mistake.",
        behavior: "Roots itself, then erupts in a RING - the ground at its own feet stays safe. Every instinct you have says step back. Don't. Heavier and quicker on its feet than it looks.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.rootHulk, w); },
        hpScale: `${GARDEN.rootHulk.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.rootHulk.HP_EVERY} waves`,
        baseSpeed: GARDEN.rootHulk.SPEED
    },

    brambleArcher: {
        name: "Bramble Archer", color: GARDEN.brambleArcher.COLOR, size: GARDEN.brambleArcher.SIZE,
        isBoss: false,
        desc: "Its arrows barely scratch. That was never the idea.",
        behavior: "Holds range and fires a spread of three arrows. A hit roots you COMPLETELY for a beat - the arrow is not the threat, whatever else is on the screen while you cannot move is.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.brambleArcher, w); },
        hpScale: `${GARDEN.brambleArcher.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.brambleArcher.HP_EVERY} waves`,
        baseSpeed: GARDEN.brambleArcher.SPEED
    },

    sporePuffer: {
        name: "Spore Puffer", color: GARDEN.sporePuffer.COLOR, size: GARDEN.sporePuffer.SIZE,
        isBoss: false,
        desc: "A bladder of old pollen. Harmless alone; unforgivable in company.",
        behavior: "Lobs large clouds that hang where they land, hiding what's inside and slowing anything that walks through.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.sporePuffer, w); },
        hpScale: `${GARDEN.sporePuffer.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.sporePuffer.HP_EVERY} waves`,
        baseSpeed: GARDEN.sporePuffer.SPEED
    },

    wisp: {
        name: "Wisp", color: GARDEN.wispSwarm.COLOR, size: GARDEN.wispSwarm.SIZE,
        isBoss: false,
        desc: "Garden lights that never learned to stay put.",
        behavior: `Comes in packs of ${GARDEN.wispSwarm.MEMBERS}, fast, and weaving hard across its own approach rather than charging. Every wisp you kill makes the survivors faster, so a swarm gets harder to hit as it shrinks.`,
        hpAtWave(w) { return Math.max(1, Math.round(gardenBestiaryHp(GARDEN.wispSwarm, w) / GARDEN.wispSwarm.MEMBERS)); },
        hpScale: "A quarter of the swarm's pool each - fragile, but they speed up as they die",
        baseSpeed: GARDEN.wispSwarm.SPEED
    },

    pollenDrone: {
        name: "Pollen Drone", color: GARDEN.pollenDrone.COLOR, size: GARDEN.pollenDrone.SIZE,
        isBoss: false,
        desc: "It has no attack whatsoever. Kill it first anyway.",
        behavior: "Patrols the rim of the arena on a fixed circuit and ignores you entirely, bathing EVERY enemy on the field with pollen - faster, and healing - no matter how far away they are. There is nowhere out of its reach, so you have to leave the fight and go and deal with it.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.pollenDrone, w); },
        hpScale: `${GARDEN.pollenDrone.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.pollenDrone.HP_EVERY} waves`,
        baseSpeed: GARDEN.pollenDrone.SPEED
    },

    gardenerShade: {
        name: "Gardener Shade", color: GARDEN.gardenerShade.COLOR, size: GARDEN.gardenerShade.SIZE,
        isBoss: false,
        desc: "Still tending the beds, long after anyone asked it to.",
        behavior: "Completely invisible, motionless, and out at the edge - no body, no shadow, nothing. It shows itself only to replant the dead, and it does that often. It has no attack at all and you walk straight through it; everything it does to you, it does through what it puts back on the field. It CAN be hit - the damage numbers are how you find it - but it has enough health that it will never die by accident.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.gardenerShade, w); },
        hpScale: `${GARDEN.gardenerShade.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.gardenerShade.HP_EVERY} waves`,
        baseSpeed: GARDEN.gardenerShade.SPEED
    },

    vineWeaver: {
        name: "Vine Weaver", color: GARDEN.vineWeaver.COLOR, size: GARDEN.vineWeaver.SIZE,
        isBoss: false,
        desc: "It binds the squad together, and shares out the suffering.",
        behavior: "Binds EVERY enemy on the field to one vine, at any range. Damage is divided between all of them rather than landing on your target - six damage across six enemies is one each. Kill the weaver before anything else means anything.",
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.vineWeaver, w); },
        hpScale: `${GARDEN.vineWeaver.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.vineWeaver.HP_EVERY} waves`,
        baseSpeed: GARDEN.vineWeaver.SPEED
    },

    roseKnight: {
        name: "Rose Knight", color: GARDEN.roseKnight.COLOR, size: GARDEN.roseKnight.SIZE,
        isBoss: false,
        desc: "The garden keeps its own knights.",
        behavior: `Four hold the corners of every wave from the hedge maze on, arriving alongside whatever else the wave fields. Plants its feet, winds the scythe back, and sweeps it through a wide arc - then flows straight into a charge that lays thorns the whole way. Its body is harmless; only the blade and the thorns are not. Behind a guard of ${GARDEN.roseKnight.GUARD_PETALS} petals that eats whole hits and grows one back every ${(GARDEN.roseKnight.GUARD_REGROW_MS / 1000).toFixed(1)}s, so chipping at it between fights gets you nowhere.`,
        hpAtWave(w) { return gardenBestiaryHp(GARDEN.roseKnight, w); },
        hpScale: `${GARDEN.roseKnight.HP_BASE} HP at wave ${WAVES.GARDEN_START}, gaining 1 every ${GARDEN.roseKnight.HP_EVERY} waves, behind ${GARDEN.roseKnight.GUARD_PETALS} petals`,
        baseSpeed: GARDEN.roseKnight.SPEED
    },

    // =====================================
    // Act III - the storm (waves 31-40)
    // =====================================

    cherub: {
        name: "Cherub", color: ANGELS.cherub.COLOR, size: ANGELS.cherub.SIZE,
        isBoss: false,
        desc: "The lowest of the host, and there are always more.",
        behavior: "Holds formation at range - each one offset from the last - and fires bolts of light. A flight of them covers most of the arena at once.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.cherub, w); },
        hpScale: `${ANGELS.cherub.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.cherub.HP_EVERY} waves`,
        baseSpeed: ANGELS.cherub.SPEED
    },

    gateWarden: {
        name: "Gate Warden", color: ANGELS.gateWarden.COLOR, size: ANGELS.gateWarden.SIZE,
        isBoss: false,
        desc: "It only ever faces you. That is the whole problem.",
        behavior: "Shrugs off almost everything that arrives at its front and nothing that arrives at its back. No amount of damage solves it - only a flank does.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.gateWarden, w); },
        hpScale: `${ANGELS.gateWarden.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.gateWarden.HP_EVERY} waves`,
        baseSpeed: ANGELS.gateWarden.SPEED
    },

    censer: {
        name: "Censer", color: ANGELS.censer.COLOR, size: ANGELS.censer.SIZE,
        isBoss: false,
        desc: "Swinging its burning offering, endlessly, at nothing in particular.",
        behavior: "Never aims. It simply walks toward you with a lethal ring turning around it, and you fight it from outside the chain or not at all.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.censer, w); },
        hpScale: `${ANGELS.censer.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.censer.HP_EVERY} waves`,
        baseSpeed: ANGELS.censer.SPEED
    },

    scribe: {
        name: "Scribe", color: ANGELS.scribe.COLOR, size: ANGELS.scribe.SIZE,
        isBoss: false,
        desc: "It writes your name down. Then it waits.",
        behavior: "Marks you, and the mark lands unless you put something solid between yourself and the Scribe before the fuse burns out. The dotted line shows you exactly what to break.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.scribe, w); },
        hpScale: `${ANGELS.scribe.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.scribe.HP_EVERY} waves`,
        baseSpeed: ANGELS.scribe.SPEED
    },

    choir: {
        name: "Choir", color: ANGELS.choir.COLOR, size: ANGELS.choir.SIZE,
        isBoss: false,
        desc: "It does not fight. It simply refuses to let the others stay dead.",
        behavior: "Sings fallen angels back up at half strength. Everything you kill while it lives is on loan.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.choir, w); },
        hpScale: `${ANGELS.choir.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.choir.HP_EVERY} waves`,
        baseSpeed: ANGELS.choir.SPEED
    },

    seraphBlade: {
        name: "Seraph Blade", color: ANGELS.seraphBlade.COLOR, size: ANGELS.seraphBlade.SIZE,
        isBoss: false,
        desc: "It draws the line before it crosses it.",
        behavior: "Marks a line clean across the arena, holds it long enough to be read, then crosses at speed. Step off the line - you will never outrun it.",
        hpAtWave(w) { return gardenBestiaryHp(ANGELS.seraphBlade, w); },
        hpScale: `${ANGELS.seraphBlade.HP_BASE} HP at wave ${WAVES.STORM_START}, gaining 1 every ${ANGELS.seraphBlade.HP_EVERY} waves`,
        baseSpeed: ANGELS.seraphBlade.SPEED
    },

    // =====================================
    // Act II / III bosses
    // =====================================

    thornMatron: {
        name: "Thorn Matron", color: "#a8446b", size: 82, isBoss: true,
        desc: "The keeper of the rose court, still keeping it.",
        behavior: "Seeds the arena with thorns and lashes harder the more of it she has taken. She kneels to plant, and is vulnerable while she does - but not for long. Below half health she throws two fans at once and buries the ground.",
        lore: "She tended these beds when the court still had a court to walk in them. She pruned for the Queen, and cut roses for a Princess who has since grown into something with a crown of her own. No one ever came to tell her the household had fallen; no one ever came at all. So she kept planting, and the garden kept spreading, and by the time anyone noticed, the roses had taken the walls.",
        hpAtWave(w) { return ACT2_BOSSES.matron.HP_BASE + Math.floor(w / 5) * ACT2_BOSSES.matron.HP_PER_CYCLE; },
        hpScale: `${ACT2_BOSSES.matron.HP_BASE} HP, plus ${ACT2_BOSSES.matron.HP_PER_CYCLE} for every five waves reached`,
        baseSpeed: 0.85
    },

    greenwarden: {
        name: "Greenwarden", color: "#3f7a3c", size: 96, isBoss: true,
        desc: "A hedge shaped like a guardian, that took the shaping seriously.",
        behavior: "Three limbs, three attacks. Break a limb and that attack stops - break all three and it staggers. It regrows them quickly, and below half health it grows them back in pairs.",
        lore: "Topiary in the old style: a warden clipped into a hedge at the maze's heart, so that visitors would feel watched and behave. It worked. Season after season it was cut back into the same shape, until the shape stopped needing the shears — until it stepped out of its own outline and went on standing guard over a maze with nothing left in it to protect.",
        hpAtWave(w) { return ACT2_BOSSES.greenwarden.HP_BASE + Math.floor(w / 5) * ACT2_BOSSES.greenwarden.HP_PER_CYCLE; },
        hpScale: `${ACT2_BOSSES.greenwarden.HP_BASE} HP, plus ${ACT2_BOSSES.greenwarden.HP_PER_CYCLE} for every five waves reached`,
        baseSpeed: 0.6
    },

    heartwood: {
        name: "Heartwood", color: "#6b4a2a", size: 130, isBoss: true,
        desc: "It does not move. It does not have to.",
        behavior: "Fights entirely through the grove - roots erupting underfoot, canopy falling, saplings pushing up, sap surging out in rings. Its core opens only rarely, and briefly. Below half health the roots come in pairs and a second surge closes the outer ring.",
        lore: "The oldest thing on the grounds, and the only one that remembers what stood here before the castle. The garden did not grow around it; it grew around the garden. Every root in the grove is a finger of it, and every wall the masons raised was raised on ground it had already claimed. It has been waiting a very long time, and it has never once needed to take a step.",
        hpAtWave(w) { return ACT2_BOSSES.heartwood.HP_BASE + Math.floor(w / 5) * ACT2_BOSSES.heartwood.HP_PER_CYCLE; },
        hpScale: `${ACT2_BOSSES.heartwood.HP_BASE} HP, plus ${ACT2_BOSSES.heartwood.HP_PER_CYCLE} for every five waves reached`,
        baseSpeed: 0
    },

    herald: {
        name: "Herald", color: "#dfe6f5", size: 76, isBoss: true,
        desc: "The first of the host, and the announcement of the rest.",
        behavior: "Flies, and cannot be touched while airborne. It comes down rarely and briefly, and its landing is itself an attack. Marks you the way its Scribes will. Below half health it hurls five pillars at a time and barely lands at all.",
        lore: "It came down with the storm, and the storm has not lifted since. It does not speak, does not bargain, does not appear to notice the arena at all — it circles, it judges, it descends, and it writes down what it finds. Whatever it is heralding has not arrived yet. That is the part worth worrying about.",
        hpAtWave(w) { return ACT2_BOSSES.herald.HP_BASE + Math.floor(w / 5) * ACT2_BOSSES.herald.HP_PER_CYCLE; },
        hpScale: `${ACT2_BOSSES.herald.HP_BASE} HP, plus ${ACT2_BOSSES.herald.HP_PER_CYCLE} for every five waves reached`,
        baseSpeed: 1.5
    }

};

// Bestiary HP preview for the Act II/III rosters. Mirrors
// gardenHp() in garden.js, but takes an explicit wave so the
// bestiary can show a value for a wave you aren't on.
function gardenBestiaryHp(cfg, w) {

    const start = ANGELS[Object.keys(ANGELS).find(k => ANGELS[k] === cfg)]
        ? WAVES.STORM_START
        : WAVES.GARDEN_START;

    return cfg.HP_BASE + Math.floor(Math.max(0, w - start) / cfg.HP_EVERY);

}

// =====================================
// Elite Bestiary Entries
// =====================================
//
// Elites aren't separate enemy classes (see makeElite in
// entities/elite.js), so their pages aren't written out by
// hand either - each one is generated from its base entry
// with ELITE's generic buffs applied. Only the signature
// twist is per-type, and that's the whole reason elites get
// their own page: the stat buffs are identical across the
// board, but the twists play completely differently.
//
// Keys are "elite" + the base type ("grunt" -> "eliteGrunt"),
// which is also what markBestiaryKill records on an elite
// kill (see onEnemyKilled in game.js).

// How much a player can write on one creature's notes page.
const BESTIARY_NOTE_MAX_LENGTH = 600;

function eliteBestiaryKey(type) {

    return `elite${type[0].toUpperCase()}${type.slice(1)}`;

}

const BESTIARY_ELITE_TWISTS = {

    grunt: {
        desc: "A gilded brute that shrugs off the first blow.",
        behavior: `Walks straight at you like any Grunt, but carries a shield that soaks one hit before damage starts sticking.`
    },

    tank: {
        desc: "A walking fortress that makes its allies untouchable.",
        behavior: `Gives off an aura - every OTHER enemy standing inside it takes no damage at all. The Tank itself can still be hurt, so kill it first.`
    },

    archer: {
        desc: "An archer who fires a spray instead of a shot.",
        behavior: `Looses a fan of ${ELITE.ARCHER_FAN_COUNT} arrows at once, so sidestepping one can still walk you into another.`
    },

    runner: {
        desc: "Nothing new - just far faster and far harder to kill.",
        behavior: `Chases and charges exactly like a Runner, with no extra trick. The doubled health and higher speed are the whole threat.`
    },

    fireMage: {
        desc: "A pyromancer who sets the whole floor alight.",
        behavior: `Same burning ground, but each patch comes out much wider - it can cut off a third of the arena at once.`
    },

    necromancer: {
        desc: "A master who never comes to you.",
        behavior: `Hangs back at range instead of marching in, and every skeleton it raises is itself elite - you have to chew through the horde to reach it.`
    },

    skeleton: {
        desc: "Undead fodder with a shield and a blade.",
        behavior: `Soaks one hit before taking damage, and swings a dagger that kills from just outside touching range.`
    },

    // --- Act II ---

    boar: {
        desc: "A charge you cannot shoot down.",
        behavior: "Charges markedly faster, and shatters any projectile that hits it mid-charge - so the ranged answer stops working at exactly the moment you need it. It is only armoured WHILE charging."
    },

    hedgeWarden: {
        desc: "It shares its cover out.",
        behavior: `Still unkillable in greenery, and now hands every enemy on the field a ${GARDEN_ELITE.WARDEN_SHIELD_ALLIES}-point shield on top, at any range - so nothing on the board is soft while it lives.`
    },

    rootHulk: {
        desc: "The whole arena, all at once.",
        behavior: "Winds up far longer, then erupts across the ENTIRE map except a wide pocket at its own feet. The only safe place on the floor is pressed right up against it. Never more than one per wave."
    },

    brambleArcher: {
        desc: "Every shot costs you ground, hit or miss.",
        behavior: "A dodged arrow still buries itself and snares the ground where it lands for several seconds."
    },

    sporePuffer: {
        desc: "Its clouds outlive it, then outlive themselves.",
        behavior: `Throws ${GARDEN_ELITE.PUFFER_EXTRA_CLOUDS} extra clouds around you as well as the one on you, and every cloud breaks into ${GARDEN_ELITE.PUFFER_SPLIT_COUNT} smaller ones as it expires.`
    },

    wisp: {
        desc: "It doesn't die so much as divide.",
        behavior: `Splits into ${GARDEN_ELITE.WISP_SPLIT_COUNT} weaker wisps when killed, AND its death sends every other enemy on the field into a sprint. Raw damage is actively counterproductive here.`
    },

    pollenDrone: {
        desc: "Now it hands out shields as well.",
        behavior: "Its aura grants nearby allies a refreshing one-hit ward on top of the healing and haste. Killing it first stops being advice and starts being a rule."
    },

    gardenerShade: {
        desc: "Nothing you kill counts.",
        behavior: "Replants the fallen at full strength instead of as weakened seedlings."
    },

    vineWeaver: {
        desc: "The web itself bites.",
        behavior: "Binds the field exactly as any weaver does, and the vines themselves hurt to cross."
    },

    roseKnight: {
        desc: "The guard grows back faster than you can break it.",
        behavior: `Carries ${GARDEN_ELITE.KNIGHT_GUARD_PETALS} petals instead of ${GARDEN.roseKnight.GUARD_PETALS}, and regrows them well over twice as fast - chip damage never gets through, so it has to come down inside one window. Its charge ends by bursting into a ring of thorns.`
    },

    // --- Act III ---

    cherub: {
        desc: "Its bolts burst.",
        behavior: `Every bolt scatters into ${ANGEL_ELITE.CHERUB_SPLIT} smaller ones on impact, so the space you dodged into isn't safe either.`
    },

    gateWarden: {
        desc: "No back to get behind.",
        behavior: "The shield covers the whole body rather than an arc. Flanking stops working entirely; you have to grind it down through the leak."
    },

    censer: {
        desc: "Two chains, half the gap.",
        behavior: "Swings a second censer opposite the first, so the safe opening is halved and keeps moving."
    },

    scribe: {
        desc: "The mark follows where you were.",
        behavior: "Its judgement echoes to your previous position as well, so simply running does not reset it - you still have to break the sightline."
    },

    choir: {
        desc: "It will not stop singing.",
        behavior: "Raises the fallen at full strength, again and again, for as long as it is alive. The wave does not end until the Choir does."
    },

    seraphBlade: {
        desc: "It comes back across.",
        behavior: "Crosses the arena, turns, and crosses again on the reverse line - the dodge has to be held, not just timed."
    },

    lancer: {
        desc: "A shield-bearer for the entire wave.",
        behavior: `Its shield takes ${ELITE.LANCER_SHIELD_HITS} hits, it lunges whether the shield is up or not, and every few seconds it hands nearby allies a one-hit shield of their own.`
    },

    shade: {
        desc: "A smaller, quicker assassin - the only elite that shrinks.",
        behavior: `Vanishes and reappears far more often than a normal Shade, with a shorter telegraph and a faster lunge.`
    },

    frostWeaver: {
        desc: "An ice-caster that freezes a whole lane.",
        behavior: `Instead of one frost patch, it lays a full row of ice running from itself straight through wherever you're standing.`
    },

    powderKeg: {
        desc: "A bomb that keeps going off after it dies.",
        behavior: `Its death blast scatters ${ELITE.KEG_CLUSTER_COUNT} cluster bombs around the crater, each burning its own patch of ground a moment later.`
    },

    bloodCleric: {
        desc: "A medic who makes the whole wave harder to kill.",
        behavior: `Heals more per channel, hands out shields twice as fast, and its shields also speed up whoever's carrying them.`
    }

};

// Types that get an "Elite X" card generated for them.
//
// A type with no twist entry is skipped rather than crashing.
// That guard is not paranoia: the Creeper Vine has no elite form
// (it is in NO_ELITE - it's arena furniture with a health bar),
// so it has no twist, and reading .desc off the missing entry
// threw at load time. Because this loop runs at the top level of
// constants.js, that one throw took out EVERY declaration below
// it - BESTIARY_NORMAL_ORDER and everything after simply ceased
// to exist - and it did it silently, with the game still
// starting and the console still clean.
const BESTIARY_ELITE_ORDER =
    BESTIARY_BASE_ORDER.filter(type => BESTIARY_ELITE_TWISTS[type]);

BESTIARY_ELITE_ORDER.forEach(type => {

    const base = BESTIARY[type];
    const twist = BESTIARY_ELITE_TWISTS[type];

    // Elite shades shrink instead of growing (makeElite undoes
    // the generic size-up for them), so the portrait follows.
    const sizeScale = type === "shade"
        ? ELITE.SHADE_SIZE_SCALE
        : ELITE.SIZE_MULTIPLIER;

    BESTIARY[eliteBestiaryKey(type)] = {

        name: `Elite ${base.name}`,
        color: base.color,
        size: base.size * sizeScale,
        isBoss: false,
        isElite: true,
        emoji: base.emoji,

        desc: twist.desc,
        behavior: twist.behavior,

        hpAtWave(w) {
            return Math.round(base.hpAtWave(w) * ELITE.HP_MULTIPLIER);
        },

        hpScale: `${ELITE.HP_MULTIPLIER}× a ${base.name}'s health, at every wave`,

        baseSpeed: Number(
            (base.baseSpeed * ELITE.SPEED_MULTIPLIER).toFixed(2)
        )

    };

});

// Base creature followed by its elite: grunt, elite grunt,
// tank, elite tank, and so on. The bestiary grid pages this
// list; keeping each pair adjacent means they never split
// across a page boundary (12 per page, both lists even).

const BESTIARY_NORMAL_ORDER = BESTIARY_BASE_ORDER.flatMap(
    type => BESTIARY_ELITE_TWISTS[type]
        ? [type, eliteBestiaryKey(type)]
        : [type]
);