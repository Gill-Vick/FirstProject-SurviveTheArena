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
// POOLING: one HTMLAudioElement can only play one instance at
// a time - retriggering it restarts the sound and cuts off the
// previous one. Each catalog entry therefore gets `pool`
// copies, cycled round-robin, so overlapping hits layer
// instead of clipping each other.
//
// LAZY LOADING: pools are built on first play, not at startup,
// so a run only ever downloads the sounds it actually uses.
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

    // id -> { entry, elements: [], next: 0, broken: bool,
    //         lastPlay: ms }
    pools: {},

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

    },

    setSfxVolume(v) {

        Save.setVolume("sfxVolume", v);

    },

    setMusicVolume(v) {

        Save.setVolume("musicVolume", v);
        this.applyMusicVolume();

    },

    setMuted(muted) {

        Save.setAudioMuted(muted);
        this.applyMusicVolume();

    },

    toggleMuted() {

        this.setMuted(!this.isMuted());

        return this.isMuted();

    },

    // Final volume for one sfx instance, before positional
    // falloff. Returns 0 when muted, which callers treat as
    // "don't bother playing".

    getSfxGain(entry, overrideVolume) {

        if (this.isMuted())
            return 0;

        const trim = overrideVolume ?? entry.volume ?? 1;

        return clamp01(this.getMasterVolume() * this.getSfxVolume() * trim);

    },

    // =====================================
    // Pools
    // =====================================

    getPool(id) {

        const entry = SFX[id];

        if (!entry)
            return null;

        let pool = this.pools[id];

        if (pool)
            return pool;

        const count = Math.max(1, entry.pool ?? 2);

        pool = {
            entry,
            elements: [],
            next: 0,
            broken: false,
            lastPlay: -Infinity
        };

        for (let i = 0; i < count; i++) {

            const el = new Audio(entry.src);
            el.preload = "auto";

            // One bad path (or a file that hasn't been made
            // yet) retires the whole id rather than throwing
            // once per frame from gameplay code.
            el.addEventListener("error", () => {
                pool.broken = true;
            });

            pool.elements.push(el);

        }

        this.pools[id] = pool;

        return pool;

    },

    // =====================================
    // Playing SFX
    // =====================================
    //
    // opts:
    //   volume - overrides the catalog trim (0..1)
    //   rate   - fixed playbackRate, skipping rateJitter
    //
    // Returns the element that was started, or null if the
    // sound was skipped (muted, locked, broken, throttled).

    play(id, opts = {}) {

        if (!this.unlocked || this.isMuted())
            return null;

        const pool = this.getPool(id);

        if (!pool || pool.broken)
            return null;

        const entry = pool.entry;
        const now = performance.now();

        // Retrigger throttle: keeps per-frame events (burn
        // ticks, pierced arrows, chain lightning) from stacking
        // into a buzz.
        if (entry.minGap && now - pool.lastPlay < entry.minGap)
            return null;

        const gain = this.getSfxGain(entry, opts.volume);

        if (gain <= 0)
            return null;

        const el = pool.elements[pool.next];

        pool.next = (pool.next + 1) % pool.elements.length;
        pool.lastPlay = now;

        el.volume = gain;

        el.playbackRate =
            opts.rate ??
            (entry.rateJitter
                ? 1 + (Math.random() * 2 - 1) * entry.rateJitter
                : 1);

        // Rewinding is what makes a pooled element reusable -
        // without it a half-finished element resumes from
        // wherever it stopped.
        el.currentTime = 0;

        // play() rejects if the browser still considers the
        // page silent; nothing to do about it but ignore it.
        el.play().catch(() => {});

        return el;

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
// Boss fights get their own track, with the King getting his
// own on top of that. Everything else in a run is "battle".

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
        Sound.playMusic(boss.type === "king" ? "king" : "boss");

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
