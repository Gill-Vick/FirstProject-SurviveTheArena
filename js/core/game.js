// =====================================
// Canvas
// =====================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuBackground = new Image();
menuBackground.src = "MainMenu.png";

const playerSprite = new Image();
playerSprite.src = "Player_Knight.png";

// =====================================
// Canvas Resolution
// =====================================
//
// One fixed logical resolution for every device: render at a
// fixed HEIGHT (width derived from the screen's real aspect
// ratio, so nothing distorts) and stretch the canvas to the
// window with CSS.
//
// Two problems, one answer.
//
// Every entity (player, enemies, projectiles, hazards) is sized
// and moved in absolute logical pixels, so a canvas matching a
// phone's small viewport would have entities towering over the
// screen - a 40px player is ~4% of a desktop window's height but
// ~10% of a phone's. And the art is authored in fixed texels, so
// a canvas matching a large desktop window renders those texels
// too small to read as pixel art at all.
//
// A fixed logical height solves both: entities occupy the same
// fraction of the screen and a texel is the same visible size,
// on any display. getCanvasCoords() in input.js already maps
// clicks/taps between CSS size and logical resolution, and the UI
// never notices - all of ui.js is laid out in percentages of
// canvas.width/height.

const LOGICAL_HEIGHT = 720;

function syncCanvasResolution() {

    // Every device now renders at the same logical height and is
    // stretched to fit, touch or not.
    //
    // Desktop used to render 1:1 at window.innerWidth/Height,
    // which quietly broke the pixel art: the art is authored in
    // fixed texels (FLOOR_TEXEL is 4, PARTICLE_TEXEL 3), so at
    // native resolution a "chunky" 4px block is four PHYSICAL
    // pixels - fine and detailed on a large or hi-DPI monitor,
    // coarse on a small window. The apparent size of a pixel
    // changed as you resized, and never matched what the same
    // build looked like on a phone.
    //
    // Fixing the render size fixes the pixel scale everywhere,
    // and renders far fewer pixels on a big monitor into the
    // bargain. The width still comes from the real aspect ratio,
    // so nothing distorts and nothing is cropped.
    const aspect = window.innerWidth / window.innerHeight;

    canvas.height = LOGICAL_HEIGHT;
    canvas.width = Math.round(LOGICAL_HEIGHT * aspect);

    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";

    // Assigning canvas.width/height resets the 2d context's
    // state, including imageSmoothingEnabled - re-disable it
    // here (after sizing) so the pixel-art sprites stay crisp.
    //
    // NOTE this only governs drawing INTO the canvas. The stretch
    // from logical size up to CSS size is the browser's, and is
    // smooth unless the stylesheet says otherwise - see
    // image-rendering in style.css.
    ctx.imageSmoothingEnabled = false;

}

syncCanvasResolution();

// =====================================
// Main Game Object
// =====================================
//
// Game no longer stores raw enemy/particle
// data - it stores instances of classes that
// know how to update and draw themselves.

const Game = {

    // Real elapsed ms since last frame, and that same
    // duration expressed as "how many 60fps frames" -
    // set once per loop in main.js. See main.js for why.
    dt: 1000 / 60,
    timeScale: 1,

    // timeScale with the hit-stop and slow-mo taken back out, for
    // the handful of effects that have to keep running while the
    // sim is frozen. See the note in main.js.
    rawTimeScale: 1,

    // Remaining hit-stop freeze, in REAL ms - ticked down by
    // the raw frame delta in main.js (it must not scale
    // itself to zero). While positive, dt/timeScale are 0.
    hitStopTimer: 0,

    // True between the fatal hit and the game over screen -
    // the sim keeps running in slow motion so the killing
    // blow is actually seen. dyingTimer is REAL ms remaining;
    // finishPlayerDeath() (below) fires when it runs out.
    dying: false,
    dyingTimer: 0,

    state: "menu",

    menuView: "main",

    bestiarySelected: null,

    shopCritDragging: false,

    // Which staged item's stage picker is being dragged
    // (item id string), or null. See handleMenuMouseDown.
    shopStageDragging: null,

    // Which pause-menu volume slider is being dragged (a Save
    // key: "masterVolume" | "sfxVolume" | "musicVolume"), or
    // null. See handlePauseMenuClick.
    volumeDragging: null,

    // Armoury list scroll offset in logical px (0 = top).
    // Driven by the mouse wheel / touch drag in input.js.
    armouryScroll: 0,

    // Bestiary page: 0 = the creatures grid, 1..N = one
    // dedicated page per boss (see BESTIARY_BOSS_ORDER).
    bestiaryPage: 0,

    // Toggled by the swap button on the Prince's own boss page
    // (see getBestiaryHeroSwapButton in ui.js) to show his Hero
    // form's info instead. Reset whenever the page changes or
    // the bestiary is reopened, so it never sticks on some other
    // boss's page.
    bestiaryShowHero: false,

    // Who/what killed the player, shown on the game over
    // screen (e.g. "a Grunt", "the King").
    killedBy: null,

    // True when the run that just ended set a new Endless/Boss
    // Rush high score - read by the game-over screen.
    newBest: false,

    wave: 1,

    // Which mode the current/next run is playing:
    // "campaign" | "bossRush" | "custom". Custom plays like
    // campaign but unlocks the pause menu's cheats (wave
    // jumping, immortality).
    mode: "campaign",

    // True when the current/next run is Boss Rush mode -
    // waves jump straight from one boss fight to the next
    // (5, 10, 15, 20, ...) instead of playing the filler
    // waves in between. See startWave()/updateWave() in
    // wave.js.
    bossRush: false,

    // Custom-mode cheat: player.takeHit() is a no-op while
    // set. Toggled from the pause menu.
    immortal: false,

    // Bumped whenever the run's timeline is invalidated
    // (new run, back to menu, custom wave jump). Every
    // setTimeout-scheduled spawn captures the token at
    // schedule time and bails if it changed by fire time, so
    // stale spawns can't leak into a different run/wave.
    runToken: 0,

    // Real elapsed ms since the current run started (startGame()),
    // ticked up in update() using Game.dt - pauses with the
    // game, unlike Date.now().
    elapsedTime: 0,

    waveActive: false,

    // True from the moment a wave starts until every one
    // of its enemies has actually been pushed into
    // Game.enemies. Spawns are scheduled with setTimeout
    // (even a "0ms" one is asynchronous), so there's a
    // window right after starting a wave where enemies
    // list is still empty. updateWave() must not treat
    // that as "wave complete" - see wave.js.
    waveSpawning: false,

    waveTransition: false,

    waveMessageTimer: 0,

    enemiesRemaining: 0,

    // Coins earned in the current wave (wave-clear banner
    // tally) - reset by startWave.
    waveCoins: 0,

    // Deterministic elite-wave bookkeeping - set by startWave
    // / the spawners in wave.js, spent by spawnEnemy.
    eliteBudget: 0,
    eliteEligibleLeft: 0,

    enemySpeedMultiplier: 1,

    // Flat HP multiplier applied to every enemy at spawn (see
    // Enemy constructor). 1 in every mode except Endless, where
    // startWave ramps it up past wave 20.
    enemyHpMultiplier: 1,

    lastSpawn: 0,

    enemies: [],

    projectiles: [],

    particles: [],

    damageNumbers: [],

    hazards: [],

    // The Thief's Mirror Cloak decoy currently drawing non-boss
    // aggro (see getAggroSource() in enemy.js), or null. Owned
    // by the MirrorDecoy hazard itself (thief.js) - set on
    // spawn, cleared on detonation.
    tauntDecoy: null,

    // The Prince & Princess fight's one-time 50% sacrifice phase
    // (see SIBLINGS_PHASE2 in constants.js) - 1 until the
    // combined-hp threshold is crossed, then 2 forever. Reset by
    // startSiblingsWave() in wave.js.
    siblingsPhase: 1,

    // Red warning circles shown ~0.7s before a summoned enemy
    // (necromancer skeletons, king reinforcements) actually
    // appears - see SpawnWarning below.
    spawnTelegraphs: [],

    screenShake: 0,

    // Full-screen colour flash for the two moments that decide a
    // run: the hit that kills you, and the hit that something
    // saved you from. Clock-driven (see triggerScreenFlash), so
    // it plays out in real time through the death slow-mo rather
    // than crawling along with it.
    screenFlash: null

};

// =====================================
// Spawn Warning
// =====================================
//
// A pulsing red circle that sits at a future spawn point for
// `delay` ms, then calls onSpawn() once and removes itself.
// Used so summoned enemies (necromancer skeletons, king
// reinforcements) can't just appear directly on top of the
// player with no way to react.

class SpawnWarning {

    constructor(x, y, radius, delay, onSpawn) {

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.timer = delay;
        this.onSpawn = onSpawn;
        this.triggered = false;

        // The warning circle is also the audio telegraph for
        // whatever is about to appear (minGap in the catalog
        // keeps a necromancer pack from stacking the sting).
        Sound.playAt("summon", x, y);

    }

    update() {

        if (this.triggered)
            return;

        this.timer -= Game.dt;

        if (this.timer <= 0) {

            this.triggered = true;
            this.onSpawn();

        }

    }

    isDead() {

        return this.triggered;

    }

    draw() {

        const pulse = 0.4 + Math.sin(Date.now() / 60) * 0.2;

        // Pulsing red pixel warning where a summon will appear.
        drawPixelZone(this.x, this.y, this.radius, {
            fill: "#ff1e1e",
            rim: "#ff1e1e",
            fillAlpha: pulse * 0.35,
            rimAlpha: pulse + 0.25,
            glow: 8,
            glowColor: "#ff1e1e"
        });

    }

}

// The player is created fresh each run inside
// startGame(). It doesn't exist yet on page load.

let player;

// Constructor registry for playable classes, keyed by the
// ids in CLASSES (constants.js). Each class file
// (entities/warrior.js, entities/ranger.js) registers
// itself here when it loads.

const PLAYER_CLASSES = {};

// =====================================
// Game Functions
// =====================================

function startGame(mode = "campaign") {

    Game.state = "playing";

    Game.mode = mode;

    Game.bossRush = mode === "bossRush";

    Game.immortal = false;

    Game.runToken++;

    Game.killedBy = null;

    Game.newBest = false;

    Game.hitStopTimer = 0;

    // The death flash must not survive into the next run.
    Game.screenFlash = null;

    Game.dying = false;

    Game.dyingTimer = 0;

    Game.wave = Game.bossRush ? WAVES.BOSS_WAVE : 1;

    Game.elapsedTime = 0;

    Game.waveActive = false;

    Game.waveSpawning = false;

    Game.waveTransition = false;

    Game.waveMessageTimer = 0;

    Game.enemySpeedMultiplier = 1;

    Game.enemyHpMultiplier = 1;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

    clearHazards();

    Game.spawnTelegraphs = [];

    // Whichever class the Armoury last showed is the class
    // this run plays as (see Save.selectedClass).
    const PlayerClass =
        PLAYER_CLASSES[Save.selectedClass] ?? PLAYER_CLASSES.warrior;

    player = new PlayerClass();

    generateArena();

    startWave();

}

// Drop every live hazard, and anything holding a reference to
// one.
//
// Game.tauntDecoy is the reason this is a function rather than
// three copies of `Game.hazards = []`. The Thief's Mirror Cloak
// decoy clears that pointer from its OWN update(), when its timer
// runs out and it detonates - so emptying the hazard list without
// clearing the pointer left a decoy that could never detonate,
// because the object was no longer being updated. It stayed
// "alive" forever (isDead() just reports whether it detonated),
// and getAggroSource() went on handing it to every non-boss enemy
// - so a run abandoned as a Thief left the NEXT run's enemies all
// walking toward a decoy that wasn't there, whatever class you
// picked.
//
// Anything else that ends up holding a hazard belongs here too.
function clearHazards() {

    Game.hazards = [];
    Game.tauntDecoy = null;

}

// =====================================
// Hit-Stop / Death Slow-Mo
// =====================================
//
// Both bend time for the entire sim; the actual dt/timeScale
// enforcement lives in main.js, where the raw (unscaled)
// frame delta is available to tick these timers.

function applyHitStop(ms) {

    // Max, not sum - a multi-target swing lands one beat, not
    // a stutter per enemy hit.
    Game.hitStopTimer = Math.max(Game.hitStopTimer, ms);

}

// =====================================
// Screen Flash
// =====================================
//
// A wash of colour around the edges of the screen, for the two
// moments in a run that matter most and had no screen-space
// feedback at all: the hit that kills you, and the hit that
// something absorbed for you.
//
// The absorb is the bigger gap of the two. The player dies in ONE
// hit - there is no health pool - so a Warrior's shield or a
// Mage's ward eating a blow is the difference between a run
// continuing and ending, and until now it happened in complete
// silence. Nothing on screen said you had just been saved.
//
// Timed off the wall clock rather than the sim, so it runs at
// normal speed through the death slow-mo instead of stretching
// out with it.

function triggerScreenFlash(color, ms, strength) {

    Game.screenFlash = { at: Date.now(), ms, color, strength };

}

function drawScreenFlash() {

    const f = Game.screenFlash;

    if (!f || canvas.width === 0)
        return;

    const age = Date.now() - f.at;

    if (age < 0 || age > f.ms) {
        Game.screenFlash = null;
        return;
    }

    // Fast attack, slower release - a flash that ramps up reads
    // as a light being switched on rather than as an impact.
    const t = 1 - age / f.ms;
    const a = f.strength * t * t;

    // Weighted to the edges, clear through the middle. A flat
    // wash over the whole screen would hide the very thing the
    // player needs to see at exactly the moment they need to see
    // it - where the enemy that just hit them is standing.
    const g = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.78
    );

    g.addColorStop(0, `rgba(${f.color}, 0)`);
    g.addColorStop(0.55, `rgba(${f.color}, ${a * 0.35})`);
    g.addColorStop(1, `rgba(${f.color}, ${a})`);

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

}

// The fatal hit only STARTS the death (see Player.takeHit) -
// this runs when the slow-mo window ends and actually rolls
// the game over screen.

function finishPlayerDeath() {

    Game.dying = false;
    Game.dyingTimer = 0;

    Game.state = "gameover";

    // The scene behind the game-over panel is still whatever room
    // the run ended in. Put it back to the opening arena and let
    // the curtain sweep across the swap, the same way it does
    // between waves.
    resetArenaToStart();

    // The run is over, so nothing it left burning, frozen or
    // taunting outlives it. startGame/resetGame both do this
    // anyway, which is why the stale-decoy bug never actually
    // reached gameplay from the death path - but leaving a dead
    // run's decoy hanging off Game until the player happens to
    // press a button is how that bug existed in the first place.
    clearHazards();

    // Log the run's distance for the score modes (no-op in
    // Campaign/Custom); remember if it was a new record.
    Game.newBest = Save.recordRunWave(Game.mode, Game.wave);

}

function onEnemyKilled(enemy) {

    // One credit per corpse. Two damage sources can both see
    // the same enemy dead in a single frame (e.g. an AoE that
    // kills the Royal Magus, whose death then fells his guard
    // mid-loop) - the second call must not double-count.
    if (enemy.killCredited)
        return;

    enemy.killCredited = true;

    Game.enemiesRemaining--;

    // Any Gardener Shade on the field remembers what just died,
    // so it has something to replant. Done here rather than in
    // the shade's own update because this is the one place every
    // death in the game passes through.
    Game.enemies.forEach(e => {

        if ((e.type === "gardenerShade" || e.type === "choir") && !e.isDead())
            e.noteDeath(enemy.type);

    });

    enemy.onDeath();

    // Bosses go down with a slam; everything else with the
    // stock death blip. (No coin chime here on purpose - one
    // per kill turned into constant jingling, and the death
    // sound already marks the payout moment.)
    Sound.playAt(
        enemy.isBoss ? "bossSlam" : "enemyDeath",
        enemy.x + enemy.size / 2,
        enemy.y + enemy.size / 2
    );

    // Death pop: a burst of the enemy's own color plus an
    // expanding ring, so kills read as an event instead of a
    // disappearance. Bosses also get the big hit-stop beat,
    // whatever weapon landed the kill.
    Particle.createDeathBurst(enemy);

    // Leave a mark where it fell, tinted to its own colour, so
    // the floor ends up telling the story of the wave.
    addArenaDecal(
        "splat",
        enemy.x + enemy.size / 2,
        enemy.y + enemy.size / 2,
        {
            r: enemy.size * (enemy.isBoss ? 1.1 : 0.8),
            color: enemy.color
        }
    );

    if (enemy.isBoss)
        applyHitStop(HITSTOP.BOSS_KILL_MS);

    player.onKill?.(enemy);

    const reward = COINS[enemy.type] ?? COINS.grunt;

    Save.addCoins(reward);

    Game.waveCoins += reward;

    if (enemy.type === "boss")
        Save.markFirstBossKilled();

    if (enemy.type === "knight")
        Save.markKnightKilled();

    if (enemy.type === "royalMagus")
        Save.markMagusKilled();

    // The four Act II bosses, each unlocking its own shop tier.
    if (enemy.type === "thornMatron")
        Save.markMatronKilled();

    if (enemy.type === "greenwarden")
        Save.markGreenwardenKilled();

    if (enemy.type === "heartwood")
        Save.markHeartwoodKilled();

    if (enemy.type === "herald")
        Save.markHeraldKilled();

    if (enemy.type === "prince" || enemy.type === "princess") {

        // Killing the Princess first denies the Prince his
        // sustain but transforms him into Hero - a real cost
        // either way (see Prince.triggerHeroTransformation() in
        // prince.js).
        if (enemy.type === "princess") {

            const prince = Game.enemies.find(
                e => e.type === "prince" && !e.isDead()
            );

            if (prince)
                prince.triggerHeroTransformation();

        }

        // If the PRINCE dies first while still in phase 1, the
        // whole sacrifice premise (her healing him) is moot -
        // there's no one left for her floor to be protecting.
        // Lift it immediately so the wave can still be cleared
        // (see Princess.takeDamage's phase-1 floor in
        // princess.js) rather than leaving her stuck at 1hp
        // forever with nothing left alive to trigger the normal
        // 50%-combined-hp transition.
        if (enemy.type === "prince" && Game.siblingsPhase === 1)
            Game.siblingsPhase = 2;

        // The wave/unlock only counts once BOTH siblings are
        // down - both are still in Game.enemies at this point
        // (cleanup happens later in the frame), so this is safe
        // to check from whichever one just died.
        const anySiblingAlive = Game.enemies.some(e =>
            (e.type === "prince" || e.type === "princess") && !e.isDead()
        );

        if (!anySiblingAlive)
            Save.markSiblingsKilled();

    }

    if (enemy.type === "king") {

        Save.markKingKilled();

        // Beating the King clears Campaign - roll the Victory
        // screen. Boss Rush loops and Endless never ends, so
        // they just carry on. (Custom is a sandbox, no win.)
        if (Game.mode === "campaign")
            Game.state = "victory";

    }

    // Elites have their own bestiary page (they play nothing
    // like their base form), so they unlock separately -
    // killing a plain Grunt never reveals the Elite Grunt.
    Save.markBestiaryKill(
        enemy.isElite
            ? eliteBestiaryKey(enemy.type)
            : enemy.type
    );

    Game.screenShake = EFFECTS.SHAKE_ON_KILL;

}

// True while a run exists on screen - playing OR paused.
// setTimeout-scheduled spawns use this instead of checking
// for "playing" directly, so pausing doesn't swallow enemies
// whose spawn timers fire mid-pause (they spawn frozen).

function isRunActive() {

    return Game.state === "playing" || Game.state === "paused";

}

function togglePause() {

    if (Game.state === "playing")
        Game.state = "paused";

    else if (Game.state === "paused")
        Game.state = "playing";

    // Music dims while paused instead of stopping - see
    // AUDIO.PAUSE_DUCK.
    Sound.setPaused(Game.state === "paused");

}

// Custom-mode cheat: tear down the current wave completely
// and restart at `targetWave`. The runToken bump strands any
// spawns the old wave still had scheduled.

function jumpToWave(targetWave) {

    Game.runToken++;

    Game.wave = Math.max(1, targetWave);

    Game.enemies = [];
    Game.projectiles = [];
    clearHazards();
    Game.spawnTelegraphs = [];
    Game.damageNumbers = [];

    Game.waveActive = false;
    Game.waveSpawning = false;
    Game.waveTransition = false;
    Game.enemiesRemaining = 0;

    startWave();

}

function resetGame() {

    Game.state = "menu";

    // Same as dying: abandoning a run puts the background back to
    // the opening arena, with the curtain sweeping over the swap.
    resetArenaToStart();

    // Quitting straight out of a paused run would otherwise
    // leave the menu music ducked.
    Sound.setPaused(false);

    Game.menuView = "main";

    Game.mode = "campaign";

    Game.immortal = false;

    Game.runToken++;

    Game.hitStopTimer = 0;

    // The death flash must not survive into the next run.
    Game.screenFlash = null;

    Game.dying = false;

    Game.dyingTimer = 0;

    Game.bestiarySelected = null;

    Game.bestiaryPage = 0;

    Game.armouryScroll = 0;

    Game.shopCritDragging = false;

    Game.bossRush = false;

    Game.wave = 1;

    Game.waveActive = false;

    Game.waveSpawning = false;

    Game.waveTransition = false;

    Game.enemies = [];

    Game.projectiles = [];

    Game.particles = [];

    Game.damageNumbers = [];

    clearHazards();

    Game.spawnTelegraphs = [];

}

function getWaveSpeedMultiplier() {

    // Flat 1.2 over the old wave-1 baseline for every mode -
    // except Endless, where enemies speed up a little each wave
    // past the King (wave 20), capped so it never becomes an
    // unplayable race.
    let mult = 1.2;

    if (Game.mode === "endless" && Game.wave > ENDLESS.RAMP_START) {

        mult = Math.min(
            ENDLESS.SPEED_MAX,
            mult + (Game.wave - ENDLESS.RAMP_START) * ENDLESS.SPEED_PER_WAVE
        );

    }

    return mult;

}

// =====================================
// Update
// =====================================

function update() {

    if (Game.state !== "playing")
        return;

    Game.elapsedTime += Game.dt;

    Game.enemySpeedMultiplier = getWaveSpeedMultiplier();

    // Every entity updates itself now.

    player.update();

    trackPlayerFootsteps();

    Game.enemies.forEach(enemy => enemy.update());

    Game.projectiles.forEach(projectile => projectile.update());

    Game.particles.forEach(particle => particle.update());

    Game.damageNumbers.forEach(number => number.update());

    Game.hazards.forEach(hazard => hazard.update());

    Game.spawnTelegraphs.forEach(telegraph => telegraph.update());

    cleanupEntities();

    updateWave();

}

// =====================================
// Cleanup
// =====================================
//
// Dead entities are removed here, once per
// frame, after everything has updated. This
// replaces the old splice-during-forEach
// pattern that could skip entities.

function cleanupEntities() {

    Game.enemies =
        Game.enemies.filter(enemy => !enemy.isDead());

    Game.projectiles =
        Game.projectiles.filter(projectile => !projectile.isDead());

    Game.particles =
        Game.particles.filter(
            particle => !particle.isDead()
        );

    Game.damageNumbers =
        Game.damageNumbers.filter(
            number => !number.isDead()
        );

    // An expiring hazard can leave a mark on the floor (scorch,
    // frost). Noted here rather than inside each hazard class -
    // they already know when they're finished, and one lookup
    // beats editing every one of them (see noteHazardDecal).
    Game.hazards.forEach(hazard => {

        if (hazard.isDead())
            noteHazardDecal(hazard);

    });

    Game.hazards =
        Game.hazards.filter(
            hazard => !hazard.isDead()
        );

    pruneArenaDecals();

    Game.spawnTelegraphs =
        Game.spawnTelegraphs.filter(
            telegraph => !telegraph.isDead()
        );

}

// =====================================
// Draw
// =====================================
//
// IMPORTANT ORDERING FIX:
//
// drawLightingSystem() used to run AFTER
// entities were drawn, meaning the dark
// overlay + light glow painted directly on
// top of the player/enemies - dimming and
// washing them out. It's now drawn BEFORE
// entities, so it only tints the floor.
// Entities render fully opaque on top and
// stay readable no matter how dramatic the
// lighting gets. Pillars still draw AFTER
// entities so they keep occluding characters
// that walk behind them.

// This frame's screen-shake offset, in whole pixels, decaying as
// it goes.
//
// Called exactly once per frame, by draw(), because everything
// that shakes has to shake by the SAME amount - rolling it twice
// would give the floor a different jolt from the scene standing
// on it.
//
// Rounded to whole pixels deliberately: a fractional translate
// resamples every bitmap in the frame, so the entire arena went
// soft for the length of each shake. On pixel art that reads as
// the picture going out of focus when you hit something.
function takeScreenShakeOffset() {

    if (!(Game.screenShake > 0))
        return { x: 0, y: 0 };

    const x = Math.round((Math.random() - 0.5) * Game.screenShake);
    const y = Math.round((Math.random() - 0.5) * Game.screenShake);

    // Exponential decay via Math.pow so the shake dies out at the
    // same real-world rate regardless of fps.
    //
    // Raw frame time, not timeScale: the shake is something the
    // camera does, so it has to keep settling even when the sim
    // it's watching is frozen. See main.js.
    Game.screenShake *= Math.pow(0.93, Game.rawTimeScale);

    // Below half a pixel it can no longer move anything, so let it
    // stop rather than tick away at a permanent tiny value.
    if (Game.screenShake < 0.5)
        Game.screenShake = 0;

    return { x, y };
}

function draw() {

    // The bestiary's notes field is an HTML overlay, so it has
    // to be told when its page is no longer on screen. Cleared
    // here and re-set by the page's own draw, then synced at
    // the end of the frame - whatever the state does in
    // between.
    clearBestiaryNotesArea();

    const shake = takeScreenShakeOffset();
    const shaking = shake.x !== 0 || shake.y !== 0;

    // ---- THE WORLD ----
    //
    // Floor, ground shadows and the scene above them all take the
    // same offset, because they are all one place.
    //
    // The shake used to start below the floor: the ground, the
    // grid and the cast shadows were drawn before the translate
    // and stayed nailed down while everything standing on them
    // jolted around. So a hit slid the pillars off their own
    // shadows, dragged the castle wall away from its torches, and
    // slewed the whole lighting pass across the floor it was
    // supposed to be lighting.

    ctx.save();

    if (shaking) {

        // Moving the world leaves a strip of last frame's pixels
        // along one edge. An unshifted pass of the bare floor
        // texture backs it: a few pixels of ground at the very
        // edge of the screen that don't move with the rest are
        // invisible, where a smear of stale frame buffer is not.
        //
        // The cached texture rather than drawArenaFloor(), so the
        // props and set pieces on top of it aren't drawn twice and
        // ghosted into the strip. Only paid for while shaking.
        const tex = ensureFloorTexture();

        if (tex)
            ctx.drawImage(tex, 0, 0);

        ctx.translate(shake.x, shake.y);

    }

    // 1. FLOOR

    drawArenaFloor();

    // 2. DECORATION

    drawGrid();

    // 3. GROUND SHADOWS

    drawPillarShadows();

    switch (Game.state) {

        case "playing":
        case "paused":

            // Paused keeps the frozen scene visible under the menu.
            drawPlayingScene();
            break;

        case "menu":
        case "gameover":
        case "victory":

            // Out of a run the arena is only a backdrop, but it
            // still gets the curtain, so the swap back to the
            // castle on death/quit reads as a deliberate wipe
            // rather than the scene popping.
            drawArenaTransition();
            break;

    }

    ctx.restore();

    // ---- THE INTERFACE ----
    //
    // Screen space, outside the shake. A HUD that jumps around is
    // harder to read exactly when it matters most, and the pause
    // button moving out from under the cursor on impact is worse
    // than that.

    switch (Game.state) {
        case "menu":
            drawMenu();
            break;

        case "playing":
            drawPlayingUI();
            break;

        case "paused":
            drawPlayingUI();
            drawPauseMenu();
            break;

        case "gameover":
            drawGameOver();
            break;

        case "victory":
            drawVictory();
            break;
    }

    syncBestiaryNotesField();
}

function drawPlayingScene() {

    // 4. LIGHTING PASS: floor-only. Everything drawn
    // after this is fully opaque and unaffected by it.

    drawLightingSystem();

    // Shafts belong with the lighting; the hazard bounce has to
    // land before the hazards themselves so the glow reads as
    // coming off the floor underneath them.
    drawLightShafts();
    drawHazardBounce();

    // Hazards that opt into drawAbovePillars (see HeroSweepingLaser
    // in prince.js) are skipped here and drawn again after the
    // foreground pillar pass below, so they stay visible instead
    // of being occluded by scenery.
    Game.hazards.forEach(hazard => {
        if (!hazard.drawAbovePillars)
            hazard.draw();
    });

    Game.spawnTelegraphs.forEach(telegraph => telegraph.draw());

    // Grounds the whole cast against the floor. One pass before
    // any of them draw, so a shadow can never land on top of
    // another entity.
    drawEntityShadows();

    player.draw();
    Game.enemies.forEach(enemy => enemy.draw());
    Game.projectiles.forEach(projectile => projectile.draw());
    Game.particles.forEach(particle => particle.draw());

    // 5.5 NIGHT VEIL (night arena only): darkness drawn over
    // entities with holes around the torches, so characters
    // fade into the dark away from the light.

    drawNightVeil();

    // 6. FOREGROUND OBJECT PASS: pillars occlude characters
    // that walk behind them

    drawPillars();
    drawTorches();

    // Weather and drifting particles. After the foreground so it
    // reads as being between the camera and the scene, and run
    // for every theme (some have no torches at all).
    drawArenaAmbient();

    // Whole-screen beats last: a boss's arrival, and the wipe
    // between arena looks.
    drawArenaFlourish();
    drawArenaTransition();

    // Hazards flagged drawAbovePillars (see above) get their
    // real draw here, on top of the foreground pillars/torches.
    Game.hazards.forEach(hazard => {
        if (hazard.drawAbovePillars)
            hazard.draw();
    });

    // 6.5 X-RAY PASS: entities hidden behind a pillar are shown
    // as a colored outline over it (red enemies / blue player)
    // so nothing can hide or ambush from behind a column.

    drawOccludedOutlines();

    // Damage numbers belong to the world, not to the interface -
    // each one is pinned over the thing it came off, so it has to
    // travel with it when the screen shakes.
    Game.damageNumbers.forEach(number => number.draw());

}

// 7. UI PASS: always on top, always readable.
//
// Split out of the scene so draw() can keep it outside the screen
// shake - see the note there.
function drawPlayingUI() {

    // Under the HUD, over the world: it's a screen effect, so it
    // doesn't take the shake, but it must never wash out the
    // readouts the player is checking while it plays.
    drawScreenFlash();

    drawHUD();
    drawBossBars();
    drawWaveMessages();

}