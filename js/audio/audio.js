// =====================================
// Audio
// =====================================
//
// The one place the game talks to the speakers. Everything
// else calls Sound.play("id") / Sound.playAt("id", x, y) /
// Sound.playMusic("battle") and never touches an audio
// element directly.
//
// Named `Sound` rather than `Audio` on purpose - `Audio` is
// the browser's own HTMLAudioElement constructor, which this
// file itself uses, so shadowing it globally would break it.
//
// Design notes:
//
// AUTOPLAY: browsers refuse to play audio until the user has
// interacted with the page. Sound.play() before that point is
// silently dropped; a requested music track is remembered and
// starts the moment the first click/tap/keypress lands (see
// the unlock listeners at the bottom).
//
// WEB AUDIO vs ELEMENTS: sfx and music go through different
// machinery on purpose. HTMLAudioElement is a streaming media
// player - great for a looping 20s music bed, but it has
// hundreds of ms of trigger latency and stutters the main
// thread when several fire in the same frame (a kill = death +
// coin + hit all at once). So sfx use the Web Audio API
// instead: every file is fetched and decoded ONCE into an
// AudioBuffer at unlock time, and each play() is just a new
// buffer-source node - effectively free and instant, with
// unlimited overlap. Music stays on elements.
//
// MISSING FILES: a sound whose file isn't there yet marks
// itself broken on the first load error and is skipped from
// then on. The catalog can list sounds long before the assets
// exist, and a missing file is never an exception in gameplay
// code.

const Sound = {

    // Set true by the first real user gesture (see below).
    // Nothing audible happens before this.
    unlocked: false,

    // Web Audio graph (sfx only). Built once in
    // initAudioGraph():  source -> per-play gain -> sfxGain
    // -> masterGain -> speakers. The sliders just move the
    // two shared gain nodes.
    ctx: null,
    masterGain: null,
    sfxGain: null,

    // id -> AudioBuffer once decoded, "loading" while the
    // fetch is in flight, "broken" after a failed load.
    buffers: {},

    // id -> performance.now() of the last trigger, for the
    // catalog's minGap retrigger throttle.
    lastPlay: {},

    // The music element currently audible, and the id it's
    // playing. Both null when nothing is playing.
    musicEl: null,
    musicId: null,

    // Track requested before the audio unlock, started as soon
    // as the gesture arrives.
    pendingMusicId: null,

    // Music ids whose file failed to load, so they're never
    // retried. Without this a missing track would be requested
    // again on the very next frame (syncMusicToGameState calls
    // playMusic every frame), building a new Audio element and
    // a new fade 60 times a second.
    brokenMusic: {},

    // Elements mid-fade: { el, from, to, elapsed, duration,
    // stopAtEnd }. Ticked by Sound.update() from the game loop.
    fades: [],

    // Music is ducked rather than stopped while the game is
    // paused - see Sound.setPaused.
    ducked: false,

    // =====================================
    // Volume
    // =====================================
    //
    // Three independent dials, persisted in Save so they
    // survive a reload: a master trim, plus one each for sfx
    // and music. Every playing element's volume is
    // master x category x per-sound trim.

    getMasterVolume() {
        return Save.masterVolume ?? AUDIO.DEFAULT_MASTER;
    },

    getSfxVolume() {
        return Save.sfxVolume ?? AUDIO.DEFAULT_SFX;
    },

    getMusicVolume() {
        return Save.musicVolume ?? AUDIO.DEFAULT_MUSIC;
    },

    isMuted() {
        return !!Save.audioMuted;
    },

    setMasterVolume(v) {

        Save.setVolume("masterVolume", v);
        this.applyMusicVolume();
        this.applySfxVolume();

    },

    setSfxVolume(v) {

        Save.setVolume("sfxVolume", v);
        this.applySfxVolume();

    },

    setMusicVolume(v) {

        Save.setVolume("musicVolume", v);
        this.applyMusicVolume();

    },

    setMuted(muted) {

        Save.setAudioMuted(muted);
        this.applyMusicVolume();
        this.applySfxVolume();

    },

    toggleMuted() {

        this.setMuted(!this.isMuted());

        return this.isMuted();

    },

    // =====================================
    // Audio Graph & Buffers
    // =====================================

    // Built on unlock (an AudioContext created before a user
    // gesture starts suspended anyway). Also kicks off the
    // fetch+decode of every catalog sound - ~1MB of local
    // WAVs, so it's done long before the first fight.

    initAudioGraph() {

        if (this.ctx)
            return;

        const AC = window.AudioContext || window.webkitAudioContext;

        if (!AC)
            return;

        this.ctx = new AC();

        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.applySfxVolume();

        Object.keys(SFX).forEach(id => this.loadBuffer(id));

    },

    loadBuffer(id) {

        if (this.buffers[id] || !this.ctx)
            return;

        const entry = SFX[id];

        if (!entry)
            return;

        this.buffers[id] = "loading";

        fetch(entry.src)
            .then(res => {

                if (!res.ok)
                    throw new Error(res.status);

                return res.arrayBuffer();

            })
            .then(data => this.ctx.decodeAudioData(data))
            .then(buffer => { this.buffers[id] = buffer; })
            .catch(() => { this.buffers[id] = "broken"; });

    },

    // Push the slider values into the shared gain nodes. Mute
    // zeroes the master node so even already-ringing tails go
    // silent.

    applySfxVolume() {

        if (!this.masterGain)
            return;

        this.masterGain.gain.value =
            this.isMuted() ? 0 : clamp01(this.getMasterVolume());

        this.sfxGain.gain.value = clamp01(this.getSfxVolume());

    },

    // =====================================
    // Playing SFX
    // =====================================
    //
    // opts:
    //   volume - overrides the catalog trim (0..1)
    //   rate   - fixed playbackRate, skipping rateJitter
    //
    // Returns the started source node, or null if the sound
    // was skipped (muted, locked, still loading, broken,
    // throttled).

    play(id, opts = {}) {

        if (!this.unlocked || this.isMuted() || !this.ctx)
            return null;

        const entry = SFX[id];

        if (!entry)
            return null;

        const buffer = this.buffers[id];

        // "loading" and "broken" both fall through here - a
        // still-decoding sound just misses this one trigger.
        if (!(buffer instanceof AudioBuffer))
            return null;

        const now = performance.now();

        // Retrigger throttle: keeps per-frame events (burn
        // ticks, pierced arrows, chain lightning) from stacking
        // into a buzz.
        if (entry.minGap && now - (this.lastPlay[id] ?? -Infinity) < entry.minGap)
            return null;

        const vol = clamp01(opts.volume ?? entry.volume ?? 1);

        if (vol <= 0)
            return null;

        this.lastPlay[id] = now;

        // A fresh source per play is the intended Web Audio
        // pattern - they're one-shot and garbage-collected
        // after they finish.
        const source = this.ctx.createBufferSource();

        source.buffer = buffer;

        source.playbackRate.value =
            opts.rate ??
            (entry.rateJitter
                ? 1 + (Math.random() * 2 - 1) * entry.rateJitter
                : 1);

        const gain = this.ctx.createGain();

        gain.gain.value = vol;

        source.connect(gain);
        gain.connect(this.sfxGain);

        source.start();

        return source;

    },

    // Positional variant: the same sound, quieter the further
    // it happens from the player. Use for anything that has a
    // place in the arena (enemy hits, explosions, casts); use
    // play() for things that happen "to you" or to the UI.

    playAt(id, x, y, opts = {}) {

        const listener = this.getListener();

        if (!listener)
            return this.play(id, opts);

        const dist = Math.hypot(x - listener.x, y - listener.y);

        const falloff = 1 - clamp01(
            (dist - AUDIO.FALLOFF_MIN) /
            (AUDIO.FALLOFF_MAX - AUDIO.FALLOFF_MIN)
        );

        if (falloff <= 0)
            return null;

        const entry = SFX[id];
        const base = opts.volume ?? entry?.volume ?? 1;

        return this.play(id, { ...opts, volume: base * falloff });

    },

    // Where the "ears" are. The player during a run; nothing
    // (i.e. no falloff) in the menus, where playAt shouldn't
    // really be used anyway.

    getListener() {

        if (typeof player === "undefined" || !player)
            return null;

        if (!isRunActive())
            return null;

        return player;

    },

    // =====================================
    // Music
    // =====================================
    //
    // One looping bed at a time, cross-faded on change. Calling
    // playMusic with the track that's already playing is a
    // no-op, so it's safe to call from a per-frame "what should
    // be playing right now" check.

    playMusic(id, { fade = AUDIO.MUSIC_FADE_MS } = {}) {

        if (this.musicId === id && this.musicEl)
            return;

        const track = MUSIC[id];

        if (!track || this.brokenMusic[id])
            return;

        // Remember it and bail - the unlock handler replays
        // this once the browser lets us make noise.
        if (!this.unlocked) {
            this.pendingMusicId = id;
            return;
        }

        this.fadeOutCurrentMusic(fade);

        const el = new Audio(track.src);

        el.loop = true;
        el.preload = "auto";
        el.volume = 0;

        el.addEventListener("error", () => {

            this.brokenMusic[id] = true;

            // Drop the dead element's fade too, or it sits in
            // the fade list ramping the volume of something
            // that will never make a sound.
            this.fades = this.fades.filter(f => f.el !== el);

            if (this.musicEl === el) {
                this.musicEl = null;
                this.musicId = null;
            }

        });

        el.play().catch(() => {});

        this.musicEl = el;
        this.musicId = id;

        this.fadeTo(el, this.getMusicTargetVolume(), fade);

    },

    stopMusic({ fade = AUDIO.MUSIC_FADE_MS } = {}) {

        this.fadeOutCurrentMusic(fade);

        this.musicEl = null;
        this.musicId = null;
        this.pendingMusicId = null;

    },

    fadeOutCurrentMusic(fade) {

        const old = this.musicEl;

        if (!old)
            return;

        // Drop any in-flight fade for this element first, or
        // the old fade-in would fight the new fade-out.
        this.fades = this.fades.filter(f => f.el !== old);

        this.fadeTo(old, 0, fade, true);

    },

    // What the current track's volume should be right now,
    // given the sliders and whether the game is paused.

    getMusicTargetVolume() {

        if (this.isMuted())
            return 0;

        const track = MUSIC[this.musicId];
        const trim = track?.volume ?? 1;

        const duck = this.ducked ? AUDIO.PAUSE_DUCK : 1;

        return clamp01(
            this.getMasterVolume() * this.getMusicVolume() * trim * duck
        );

    },

    // Snap the playing track to the current sliders - called
    // whenever a volume changes or mute flips, so dragging a
    // slider is audible immediately instead of at the next
    // track change.

    applyMusicVolume() {

        if (!this.musicEl)
            return;

        // Don't stomp an in-progress cross-fade; that fade is
        // already heading somewhere and will be re-targeted by
        // whoever started it.
        if (this.fades.some(f => f.el === this.musicEl))
            return;

        this.musicEl.volume = this.getMusicTargetVolume();

    },

    // Pause menu hook: dim the music instead of cutting it.

    setPaused(paused) {

        if (this.ducked === paused)
            return;

        this.ducked = paused;

        if (this.musicEl)
            this.fadeTo(this.musicEl, this.getMusicTargetVolume(), 250);

    },

    // =====================================
    // Fades
    // =====================================

    fadeTo(el, target, duration, stopAtEnd = false) {

        this.fades = this.fades.filter(f => f.el !== el);

        if (duration <= 0) {

            el.volume = clamp01(target);

            if (stopAtEnd)
                el.pause();

            return;

        }

        this.fades.push({
            el,
            from: el.volume,
            to: clamp01(target),
            elapsed: 0,
            duration,
            stopAtEnd
        });

    },

    // Ticked once per frame from the game loop. Uses real ms
    // (Game.dt) so fades run at the same wall-clock rate on
    // any refresh rate - same convention as everything else
    // that counts in ms.

    update() {

        if (!this.fades.length)
            return;

        for (const fade of this.fades) {

            fade.elapsed += Game.dt;

            const t = Math.min(1, fade.elapsed / fade.duration);

            fade.el.volume = clamp01(
                fade.from + (fade.to - fade.from) * t
            );

            if (t >= 1 && fade.stopAtEnd)
                fade.el.pause();

        }

        this.fades = this.fades.filter(
            fade => fade.elapsed < fade.duration
        );

    },

    // =====================================
    // Unlock
    // =====================================
    //
    // Called by the first genuine user gesture. Everything
    // before this point was silently dropped, so any music the
    // menu asked for gets started here instead.

    unlock() {

        if (this.unlocked)
            return;

        this.unlocked = true;

        this.initAudioGraph();

        // A context created during the gesture should start
        // running; resume() covers the browsers that don't.
        if (this.ctx && this.ctx.state === "suspended")
            this.ctx.resume().catch(() => {});

        if (this.pendingMusicId) {

            const id = this.pendingMusicId;

            this.pendingMusicId = null;

            this.playMusic(id, { fade: AUDIO.MUSIC_FADE_MS });

        }

    }

};

// =====================================
// Music Router
// =====================================
//
// Decides which bed should be playing for whatever the game is
// currently doing, and asks for it. Called once per frame from
// the game loop - playMusic() no-ops when the right track is
// already playing, so calling it every frame costs nothing and
// means no individual state change has to remember to switch
// the music.
//
// Every boss fights to its own track (see BOSS_TRACKS in
// sounds.js). Everything else in a run is "battle".

function syncMusicToGameState() {

    if (!Sound.unlocked)
        return;

    if (Game.state === "menu") {
        Sound.playMusic("menu");
        return;
    }

    if (Game.state === "victory") {
        Sound.playMusic("victory");
        return;
    }

    // Game over holds on whatever was playing rather than
    // cutting to silence mid-sting - the gameOver sfx carries
    // that moment.
    if (Game.state === "gameover")
        return;

    if (!isRunActive())
        return;

    const boss = Game.enemies.find(enemy => enemy.isBoss);

    if (boss)
        Sound.playMusic(BOSS_TRACKS[boss.type] ?? "battle");

    else
        Sound.playMusic("battle");

}

// Volumes outside 0..1 throw a DOMException on assignment, so
// every value that reaches an element goes through here.

function clamp01(v) {

    if (!isFinite(v))
        return 0;

    return Math.max(0, Math.min(1, v));

}

// The gesture listeners that let the page make noise at all.
// `once` on each - the first one to fire wins and they all
// unregister themselves.

["pointerdown", "keydown", "touchstart"].forEach(type => {

    window.addEventListener(type, () => Sound.unlock(), { once: true });

});

// A hidden tab goes quiet. The game loop (rAF) freezes when
// the tab is hidden, so fades stop ticking too - pausing the
// music element (and anything mid-fade) directly is the only
// reliable way to silence it. Coming back resumes the current
// track from where it stopped.

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        Sound.fades.forEach(fade => fade.el.pause());

        if (Sound.musicEl)
            Sound.musicEl.pause();

        // The sfx graph runs on its own audio thread, so it
        // keeps ringing after rAF freezes - suspend it too.
        if (Sound.ctx)
            Sound.ctx.suspend().catch(() => {});

    } else {

        if (Sound.musicEl && !Sound.isMuted())
            Sound.musicEl.play().catch(() => {});

        if (Sound.ctx)
            Sound.ctx.resume().catch(() => {});

    }

});
