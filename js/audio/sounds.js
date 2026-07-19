// =====================================
// Sound Catalog
// =====================================
//
// The audio equivalent of constants.js: every sound the game
// can play is declared here, and nothing else in the codebase
// ever mentions a file path. Callers only ever say
// Sound.play("swordSwing") - swapping the file, retuning its
// volume, or deleting a sound entirely is a change in this
// file alone.
//
// Per-entry fields (all optional except src):
//
//   src      - path relative to index.html
//   volume   - per-sound trim, 0..1. Sounds are mastered at
//              wildly different levels, so this is where a
//              too-loud explosion gets pulled down rather
//              than re-exporting the file.
//   pool     - UNUSED since the Web Audio rewrite (buffer
//              sources overlap freely); kept for reference
//              only.
//   minGap   - ms that must pass before this id can retrigger.
//              Stops a per-frame event (burn ticks, arrow
//              hits) from machine-gunning into a buzz.
//   rateJitter - random playbackRate spread (0.1 = ±10%), so
//              repeated hits don't sound like a copy-paste.
//
// A sound whose file doesn't exist yet is not an error - the
// audio layer just no-ops on it (see Sound.play), so entries
// can be listed here before the .wav is made.

const SFX = {

    // Mix philosophy: the sounds that fire constantly (hits,
    // deaths, coins, shots, dashes) sit LOW so they read as
    // texture; the once-in-a-while cues (boss spawn, blocks,
    // purchases, game over) sit noticeably above them.

    // ----- Player: melee -----

    swordSwing:   { src: "assets/audio/sfx/sword_swing.wav", volume: 0.35, rateJitter: 0.08 },
    swordHit:     { src: "assets/audio/sfx/sword_hit.wav",   volume: 0.4, rateJitter: 0.1 },
    daggerSwing:  { src: "assets/audio/sfx/dagger_swing.wav", volume: 0.28, rateJitter: 0.1 },
    critHit:      { src: "assets/audio/sfx/crit_hit.wav",    volume: 0.5 },

    // ----- Player: ranged / abilities -----

    bowShot:      { src: "assets/audio/sfx/bow_shot.wav",    volume: 0.32, rateJitter: 0.08 },
    arrowHit:     { src: "assets/audio/sfx/arrow_hit.wav",   volume: 0.28, minGap: 40 },
    knifeThrow:   { src: "assets/audio/sfx/knife_throw.wav", volume: 0.32 },
    dash:         { src: "assets/audio/sfx/dash.wav",        volume: 0.32 },
    laser:        { src: "assets/audio/sfx/laser.wav",       volume: 0.45 },
    sunbeam:      { src: "assets/audio/sfx/sunbeam.wav",     volume: 0.4 },
    sunburst:     { src: "assets/audio/sfx/sunburst.wav",    volume: 0.45 },
    lightningChain: { src: "assets/audio/sfx/lightning_chain.wav", volume: 0.28, minGap: 60 },

    // ----- Player: defense / damage -----

    shieldBlock:  { src: "assets/audio/sfx/shield_block.wav", volume: 0.45 },
    haloBreak:    { src: "assets/audio/sfx/halo_break.wav",   volume: 0.42 },
    playerHurt:   { src: "assets/audio/sfx/player_hurt.wav",  volume: 0.55 },
    playerDeath:  { src: "assets/audio/sfx/player_death.wav", volume: 0.65 },

    // ----- Enemies -----

    enemyHit:     { src: "assets/audio/sfx/enemy_hit.wav",   volume: 0.22, minGap: 40, rateJitter: 0.12 },
    enemyDeath:   { src: "assets/audio/sfx/enemy_death.wav", volume: 0.18, minGap: 50, rateJitter: 0.12 },
    enemyShoot:   { src: "assets/audio/sfx/enemy_shoot.wav", volume: 0.18, minGap: 60 },
    explosion:    { src: "assets/audio/sfx/explosion.wav",   volume: 0.5 },
    summon:       { src: "assets/audio/sfx/summon.wav",      volume: 0.3 },
    bossSlam:     { src: "assets/audio/sfx/boss_slam.wav",   volume: 0.6 },
    telegraph:    { src: "assets/audio/sfx/telegraph.wav",   volume: 0.22, minGap: 80 },

    // ----- Run flow -----

    waveStart:    { src: "assets/audio/sfx/wave_start.wav",  volume: 0.2 },
    waveClear:    { src: "assets/audio/sfx/wave_clear.wav",  volume: 0.35 },
    bossSpawn:    { src: "assets/audio/sfx/boss_spawn.wav",  volume: 0.55 },
    coin:         { src: "assets/audio/sfx/coin.wav",        volume: 0.2, minGap: 60, rateJitter: 0.15 },
    gameOver:     { src: "assets/audio/sfx/game_over.wav",   volume: 0.55 },
    victory:      { src: "assets/audio/sfx/victory.wav",     volume: 0.5 },

    // ----- UI -----

    uiClick:      { src: "assets/audio/sfx/ui_click.wav",    volume: 0.35 },
    uiHover:      { src: "assets/audio/sfx/ui_hover.wav",    volume: 0.2, minGap: 60 },
    uiPurchase:   { src: "assets/audio/sfx/ui_purchase.wav", volume: 0.4 },
    uiDenied:     { src: "assets/audio/sfx/ui_denied.wav",   volume: 0.3 },
    uiEquip:      { src: "assets/audio/sfx/ui_equip.wav",    volume: 0.35 }

};

// =====================================
// Music Tracks
// =====================================
//
// Looping beds, one at a time. Sound.playMusic() cross-fades
// between them, so a track switch at a boss spawn doesn't cut
// off mid-note.
//
//   loopStart - seconds to jump back to on loop, for tracks
//               with a one-shot intro before the loop body.
//               Omit for a plain end-to-start loop.

const MUSIC = {

    menu:        { src: "assets/audio/music/menu.wav",         volume: 0.5 },
    battle:      { src: "assets/audio/music/battle.wav",       volume: 0.45 },
    castleGuard: { src: "assets/audio/music/castle_guard.wav", volume: 0.5 },
    knight:      { src: "assets/audio/music/knight.wav",       volume: 0.5 },
    magus:       { src: "assets/audio/music/magus.wav",        volume: 0.5 },
    king:        { src: "assets/audio/music/king.wav",         volume: 0.5 },
    victory:     { src: "assets/audio/music/victory.wav",      volume: 0.5 }

};

// Which MUSIC track each boss fights to, keyed by the boss's
// enemy type. Read by syncMusicToGameState() in audio.js -
// a boss type missing from here falls back to "battle".
//
//   Castle Guard - a slow, heavy dirge for the tireless
//                  gatekeeper
//   Knight       - a martial, drum-driven march: the mirror
//                  match, all snare rolls and trumpet calls
//   Royal Magus  - shimmering diminished arpeggios and
//                  rolling thunder for the storm-caller
//   King         - the full final-boss treatment: relentless
//                  organ stabs and harmonic-minor runs

const BOSS_TRACKS = {

    boss: "castleGuard",
    knight: "knight",
    royalMagus: "magus",
    king: "king"

};

// =====================================
// Audio Tuning
// =====================================

const AUDIO = {

    // Default slider positions for a brand-new save (see the
    // volume fields in save.js).
    DEFAULT_MASTER: 0.8,
    DEFAULT_SFX: 0.8,
    DEFAULT_MUSIC: 0.5,

    // Cross-fade length when swapping music tracks, in ms.
    MUSIC_FADE_MS: 800,

    // Positional falloff for Sound.playAt(). Sounds at the
    // player's feet play at full volume; past FALLOFF_MAX they
    // are silent, with a linear ramp between the two. Keeps a
    // fight on the far side of the arena from drowning out
    // what's happening on top of the player.
    FALLOFF_MIN: 250,
    FALLOFF_MAX: 1100,

    // Music is dimmed rather than stopped while paused, so the
    // pause menu doesn't feel like the game crashed.
    PAUSE_DUCK: 0.35

};
