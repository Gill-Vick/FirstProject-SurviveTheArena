# =====================================
# Music Generator
# =====================================
#
# Synthesizes every track in the MUSIC catalog (js/audio/
# sounds.js) as a loopable 16-bit mono WAV - chiptune-style,
# pure Python stdlib, no dependencies. Rerun after editing a
# compose_*() function to retune a track:
#
#   python3 assets/audio/generate_music.py
#
# Loop-safety: notes and echo taps that spill past the end of
# a track wrap around to its start (all buffer writes are
# modulo the track length), so every file loops seamlessly.
# That's also why these are WAVs and not mp3s - mp3 encoders
# pad the stream and the pad clicks audibly at the loop point.
#
# The track briefs (what each boss "sounds like") live next to
# BOSS_TRACKS in sounds.js.

import math
import random
import struct
import wave
from pathlib import Path

SR = 22050

OUT_DIR = Path(__file__).parent / "music"

rng = random.Random(20260719)

# =====================================
# Notes
# =====================================

SEMITONES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def note_freq(name):
    """'A4' / 'C#3' / 'Bb2' -> frequency in Hz."""

    letter = name[0]
    rest = name[1:]

    semi = SEMITONES[letter]

    while rest and rest[0] in "#b":
        semi += 1 if rest[0] == "#" else -1
        rest = rest[1:]

    octave = int(rest)
    midi = 12 * (octave + 1) + semi

    return 440.0 * 2 ** ((midi - 69) / 12)


# =====================================
# Synthesis
# =====================================

def tone(buf, start_s, dur_s, freq, wave_type="square", vol=0.15,
         duty=0.5, attack=0.004, release=0.03, vib=0.0, vib_rate=5.5,
         freq_end=None):
    """Add one note into buf (wrapping past the end)."""

    n_buf = len(buf)
    sus_n = max(1, int(dur_s * SR))
    rel_n = max(1, int(release * SR))
    att_n = max(1, int(attack * SR))
    n = sus_n + rel_n

    i0 = int(start_s * SR)

    # Per-sample multiplier for an exponential pitch sweep.
    sweep = (freq_end / freq) ** (1.0 / n) if freq_end else 1.0

    # Constant-power-ish DC correction for asymmetric squares.
    dc = (2 * duty - 1) if wave_type == "square" else 0.0

    two_pi = 2 * math.pi
    ph = 0.0
    f = freq
    sin = math.sin

    for i in range(n):

        if i < att_n:
            env = i / att_n
        elif i > sus_n:
            env = 1.0 - (i - sus_n) / rel_n
        else:
            env = 1.0

        fr = f * (1.0 + vib * sin(two_pi * vib_rate * i / SR)) if vib else f
        ph += fr / SR

        if sweep != 1.0:
            f *= sweep

        p = ph - int(ph)

        if wave_type == "square":
            s = (1.0 if p < duty else -1.0) - dc
        elif wave_type == "saw":
            s = 2.0 * p - 1.0
        elif wave_type == "tri":
            s = 4.0 * abs(p - 0.5) - 1.0
        else:
            s = sin(two_pi * p)

        buf[(i0 + i) % n_buf] += s * vol * env


def noise(buf, start_s, dur_s, vol, highpass=False, curve=2.0):
    """Decaying noise burst - snares, hats, cymbals."""

    n_buf = len(buf)
    n = max(1, int(dur_s * SR))
    i0 = int(start_s * SR)
    prev = 0.0
    uniform = rng.uniform

    for i in range(n):

        x = uniform(-1.0, 1.0)
        s = (x - prev) * 0.7 if highpass else x
        prev = x

        env = (1.0 - i / n) ** curve

        buf[(i0 + i) % n_buf] += s * vol * env


# ----- Drum kit -----

def kick(buf, t, vol=0.5):
    tone(buf, t, 0.11, 105, "sine", vol, freq_end=38, release=0.05)


def snare(buf, t, vol=0.3):
    noise(buf, t, 0.13, vol, highpass=True)
    tone(buf, t, 0.05, 190, "sine", vol * 0.5, release=0.04)


def hat(buf, t, vol=0.08):
    noise(buf, t, 0.035, vol, highpass=True, curve=1.5)


def tom(buf, t, freq=90, vol=0.4, dur=0.2):
    tone(buf, t, dur, freq, "sine", vol, freq_end=freq * 0.72, release=0.06)


def crash(buf, t, vol=0.16):
    noise(buf, t, 1.1, vol, highpass=True, curve=3.0)


def timpani(buf, t, freq=65, vol=0.5):
    tone(buf, t, 0.5, freq, "sine", vol, freq_end=freq * 0.9, release=0.12)


# =====================================
# Sequencing helpers
# =====================================

def seq(buf, spb, items, wave_type, vol, **kw):
    """items: (start_beat, dur_beats, note_name_or_None)."""

    for beat, dur, name in items:

        if name is None:
            continue

        tone(buf, beat * spb, dur * spb * 0.92, note_freq(name),
             wave_type, vol, **kw)


def chord(buf, spb, beat, dur, names, wave_type, vol, **kw):

    for name in names:
        tone(buf, beat * spb, dur * spb * 0.95, note_freq(name),
             wave_type, vol, **kw)


def echo(buf, delay_s, feedback, taps=4):
    """Feedback delay as explicit taps, wrapped for looping."""

    n = len(buf)
    d = int(delay_s * SR)
    dry = list(buf)

    for k in range(1, taps + 1):

        g = feedback ** k

        if g < 0.02:
            break

        off = (k * d) % n

        for i in range(n):
            buf[(i + off) % n] += dry[i] * g


def make_buffer(bpm, beats):

    spb = 60.0 / bpm
    n = int(round(beats * spb * SR))

    return [0.0] * n, spb


def finalize(buf, peak=0.82, target_rms=0.22):

    # Remove DC, soft-limit, then normalize.
    #
    # Peak normalization alone is not enough: one instant where a
    # few low sines happen to land together (a stacked accent, say)
    # can sit ~6x the track's average level, and scaling to fit
    # THAT leaves everything else quiet. The Royal Magus cut
    # measured half the RMS of every other track in the catalogue
    # for exactly this reason, which read as "no impact" - the hits
    # were not too small, the rest of the track was too far down.
    #
    # So: scale to a target RMS first, then run the signal through
    # tanh. Below about half-scale tanh is near enough linear and
    # leaves the body untouched, while isolated transients past it
    # round off instead of dictating the level of the whole track.
    # Peak normalization afterwards just sets the ceiling.
    #
    # NOTE: a tail-into-head crossfade was tried here and removed.
    # It truncated every track by the fade length, so the loop was
    # no longer a whole number of beats and the downbeat crept
    # earlier on each repeat - a rhythmic stumble, which is worse
    # than what it was meant to fix. It also wasn't needed: every
    # write in this file is modulo the buffer length (see tone()
    # and noise()), so a note or echo tap running past the end
    # already wraps around and sums into the head. The loop is
    # sample-continuous by construction.
    #
    # That means an audible seam is a COMPOSITIONAL problem, not a
    # click - a fill that winds down like an ending, or a cymbal
    # sitting right on position 0 announcing the restart. Fix
    # those in the compose_*() function itself (see the horn that
    # deliberately wraps across the loop point in
    # compose_castle_guard).
    n = len(buf)

    mean = sum(buf) / n
    centred = [s - mean for s in buf]

    rms = math.sqrt(sum(s * s for s in centred) / n)
    drive = target_rms / max(1e-9, rms)

    tanh = math.tanh
    limited = [tanh(s * drive) for s in centred]

    top = max(1e-9, max(abs(s) for s in limited))
    g = peak / top

    return [s * g for s in limited]


def write_wav(path, buf):

    with wave.open(str(path), "w") as w:

        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)

        frames = bytearray()

        for s in buf:
            v = max(-1.0, min(1.0, s))
            frames += struct.pack("<h", int(v * 32767))

        w.writeframes(bytes(frames))


# =====================================
# Tracks
# =====================================

def compose_menu():
    """Candlelit hall - slow harp arpeggios over a low drone."""

    buf, spb = make_buffer(bpm=66, beats=32)

    # Am - F - C - E, 8 beats each.
    chords = [
        ("A2", ["A3", "C4", "E4", "A4"]),
        ("F2", ["F3", "A3", "C4", "F4"]),
        ("C2", ["C3", "E3", "G3", "C4"]),
        ("E2", ["E3", "G#3", "B3", "E4"]),
    ]

    for ci, (root, tones) in enumerate(chords):

        base = ci * 8

        # Drone + soft pad.
        tone(buf, base * spb, 8 * spb, note_freq(root), "tri", 0.10,
             attack=0.4, release=0.5)
        chord(buf, spb, base, 8, tones[:3], "tri", 0.045,
              attack=0.6, release=0.8)

        # Harp: eighth-note arpeggio up and back down.
        pattern = tones + [tones[2], tones[1]]

        for i in range(16):
            name = pattern[i % len(pattern)]
            tone(buf, (base + i * 0.5) * spb, 0.42 * spb,
                 note_freq(name), "tri", 0.11, release=0.15)

    # Sparse flute melody.
    seq(buf, spb, [
        (2, 2, "E5"), (5, 1, "D5"), (6, 2, "C5"),
        (10, 2, "C5"), (13, 1, "A4"), (14, 2, "C5"),
        (18, 2, "G4"), (21, 1.5, "E5"), (22.5, 1.5, "D5"),
        (26, 2, "B4"), (29, 3, "G#4"),
    ], "tri", 0.09, attack=0.06, release=0.25, vib=0.006, vib_rate=4.5)

    echo(buf, 0.36, 0.35)

    return finalize(buf)


def compose_battle():
    """Standard waves - driving minor-key chiptune."""

    buf, spb = make_buffer(bpm=128, beats=32)

    # Em - C - D - B, 8 beats each.
    sections = [
        ("E2", ["E3", "B3"]), ("C2", ["C3", "G3"]),
        ("D2", ["D3", "A3"]), ("B1", ["B2", "F#3"]),
    ]

    for ci, (root, fifth) in enumerate(sections):

        base = ci * 8

        chord(buf, spb, base, 8, fifth, "tri", 0.05,
              attack=0.3, release=0.4)

        # Driving eighth-note bass with octave pops.
        rf = note_freq(root)

        for i in range(16):
            f = rf * 2 if i % 4 == 3 else rf
            tone(buf, (base + i * 0.5) * spb, 0.38 * spb, f,
                 "square", 0.16, duty=0.3, release=0.02)

    seq(buf, spb, [
        (0, 1, "B4"), (1, 1, "E5"), (2, 0.5, "D5"), (2.5, 0.5, "B4"),
        (3, 1, "G4"), (4, 1, "A4"), (5, 0.5, "B4"), (5.5, 0.5, "A4"),
        (6, 1, "G4"), (7, 1, "F#4"),
        (8, 1, "G4"), (9, 1, "C5"), (10, 0.5, "B4"), (10.5, 0.5, "A4"),
        (11, 1, "G4"), (12, 2, "A4"), (14, 2, "B4"),
        (16, 1, "F#4"), (17, 1, "A4"), (18, 1, "D5"),
        (19, 0.5, "C#5"), (19.5, 0.5, "A4"),
        (20, 2, "B4"), (22, 1, "A4"), (23, 1, "G4"),
        (24, 1, "F#5"), (25, 1, "D#5"), (26, 0.5, "B4"),
        (26.5, 0.5, "C#5"), (27, 1, "D#5"),
        (28, 1, "E5"), (29, 1, "F#5"), (30, 1, "G5"), (31, 1, "F#5"),
    ], "square", 0.13, release=0.04)

    for beat in range(32):
        if beat % 2 == 0:
            kick(buf, beat * spb, 0.45)
        else:
            snare(buf, beat * spb, 0.22)
        hat(buf, beat * spb)
        hat(buf, (beat + 0.5) * spb, 0.05)

    echo(buf, 0.22, 0.18)

    return finalize(buf)


def compose_castle_guard():
    """Wave 5 - a slow, heavy dirge for the tireless gatekeeper."""

    buf, spb = make_buffer(bpm=96, beats=32)

    riff_a = ["D2", "D2", None, "D2", "F2", None, "D2", None,
              "G2", None, "F2", None, "G#2", "G2", "F2", "D2"]
    riff_b = ["D2", "D2", None, "D2", "F2", None, "D2", None,
              "Bb2", None, "A2", None, "G2", "F2", "E2", "D2"]

    for ci, riff in enumerate([riff_a, riff_a, riff_b, riff_a]):

        base = ci * 8

        for i, name in enumerate(riff):

            if name is None:
                continue

            t = (base + i * 0.5) * spb
            f = note_freq(name)

            tone(buf, t, 0.4 * spb, f, "saw", 0.15, release=0.03)
            tone(buf, t, 0.4 * spb, f * 2, "saw", 0.07, release=0.03)

    # Long, dark horn line above the riff. The last note runs 10
    # beats from beat 24 - two beats PAST the end of the track -
    # so it wraps around and is still sounding underneath the
    # opening bar. That overlap is what actually hides the loop
    # point: there's no instant where every voice restarts at once.
    seq(buf, spb, [
        (0, 6, "D4"), (8, 4, "F4"), (12, 4, "E4"),
        (16, 6, "Bb3"), (24, 10, "A3"),
    ], "square", 0.09, duty=0.4, attack=0.1, release=0.4,
        vib=0.005, vib_rate=4.0)

    for beat in range(32):

        kick(buf, beat * spb, 0.5)

        if beat % 4 == 2:
            snare(buf, beat * spb, 0.3)

    # A short ASCENDING pickup into the downbeat rather than the
    # long descending fill that used to sit here - a wind-down
    # tom run reads as "the track is ending", which is exactly
    # what made the seam obvious.
    for i, fr in enumerate([64, 76, 90]):
        tom(buf, (30.5 + i * 0.5) * spb, fr, 0.26)

    # Crash moved off position 0: a cymbal on the downbeat is a
    # restart announcement every time the loop comes round. It
    # accents the middle of the track instead.
    crash(buf, 16 * spb, 0.13)

    echo(buf, 0.26, 0.2)

    return finalize(buf)


def compose_knight():
    """Wave 10 - martial snares and trumpet calls: the mirror match."""

    buf, spb = make_buffer(bpm=140, beats=32)

    # Trumpet call / answer phrases in G minor.
    seq(buf, spb, [
        (0, 0.5, "G4"), (0.5, 0.5, "G4"), (1, 1, "G4"), (2, 1, "Bb4"),
        (3, 0.5, "A4"), (3.5, 0.5, "F4"), (4, 2, "G4"), (6, 1, "D4"),
        (8, 0.5, "Bb4"), (8.5, 0.5, "Bb4"), (9, 1, "Bb4"), (10, 1, "D5"),
        (11, 0.5, "C5"), (11.5, 0.5, "A4"), (12, 2, "Bb4"), (14, 1, "G4"),
        (16, 1, "D5"), (17, 0.5, "D5"), (17.5, 0.5, "C5"), (18, 1, "Bb4"),
        (19, 0.5, "C5"), (19.5, 0.5, "D5"), (20, 2, "Eb5"),
        (22, 1, "D5"), (23, 1, "C5"),
        (24, 1, "Bb4"), (25, 0.5, "A4"), (25.5, 0.5, "G4"),
        (26, 1, "F#4"), (27, 1, "A4"), (28, 3, "G4"),
    ], "square", 0.13, release=0.05, vib=0.004, vib_rate=5.0)

    # Low answering horns.
    seq(buf, spb, [
        (6, 2, "G3"), (14, 2, "Bb3"), (22, 2, "C4"), (30, 2, "D4"),
    ], "tri", 0.1, attack=0.05, release=0.2)

    # Quarter-note bass.
    bass = (["G2"] * 4 + ["Eb2"] * 2 + ["F2"] * 2) * 2 + \
           ["Eb2"] * 4 + ["C2"] * 2 + ["D2"] * 2 + \
           ["G2"] * 4 + ["D2"] * 2 + ["F#2"] * 2

    for i, name in enumerate(bass):
        tone(buf, i * spb, 0.8 * spb, note_freq(name), "square", 0.14,
             duty=0.35, release=0.03)

    # March kit: kick, backbeat, and snare rolls into each bar.
    for beat in range(32):

        if beat % 2 == 0:
            kick(buf, beat * spb, 0.42)
        else:
            snare(buf, beat * spb, 0.26)

        hat(buf, beat * spb)

        if beat % 4 == 3:
            snare(buf, (beat + 0.5) * spb, 0.12)
            snare(buf, (beat + 0.75) * spb, 0.16)

    echo(buf, 0.2, 0.16)

    return finalize(buf)


def compose_magus():
    """Wave 15 - diminished shimmer and thunder for the storm-caller.

    Slow throughout, on purpose. An earlier cut alternated half-time
    sections with 16th-driven ones; the fast material is gone
    entirely and every phrase is now the heavy, half-time character.
    The variety comes from layer density, register and dynamics
    instead of speed - a storm rolling in rather than one already
    breaking - so the piece still goes somewhere across its eight
    phrases without ever picking up the tempo:

        0  heavy   the bare riff, huge spaced hits
        1  heavy   fuller, the shimmer widens an octave
        2  swell   sustained brass joins, hits get bigger
        3  break   almost bare - shimmer and lead over a hollow fifth
        4  heavy   the return, low register
        5  swell   building again
        6  swell   the biggest section in the track
        7  break   thinning out, rolling into the loop
    """

    buf, spb = make_buffer(bpm=138, beats=64)

    # A hit with real low end under it.
    #
    # These are all low sines landing on the same sample, so they
    # sum almost perfectly and spike the peak - kept modest, and
    # the sub is offset slightly so it swells under the hit rather
    # than straight through it.
    def impact(t, vol=1.0):

        kick(buf, t, 0.5 * vol)
        tone(buf, t + 0.012, 0.26, 46, "sine", 0.2 * vol,
             freq_end=30, release=0.15)
        tom(buf, t, 62, 0.26 * vol, 0.3)

    sets = [
        ["C4", "Eb4", "F#4", "A4"],
        ["B3", "D4", "F4", "G#4"],
        ["C4", "Eb4", "F#4", "A4"],
        ["D4", "F4", "G#4", "B4"],
        ["C4", "Eb4", "F#4", "A4"],
        ["B3", "D4", "F4", "G#4"],
        ["Eb4", "F#4", "A4", "C5"],
        ["D4", "F4", "G#4", "B4"],
        ["A3", "C4", "Eb4", "F#4"],
        ["G#3", "B3", "D4", "F4"],
        ["A3", "C4", "Eb4", "F#4"],
        ["B3", "D4", "F4", "G#4"],
        ["C4", "Eb4", "F#4", "A4"],
        ["D4", "F4", "G#4", "B4"],
        ["Eb4", "F#4", "A4", "C5"],
        ["F4", "G#4", "B4", "D5"],
    ]

    roots = ["C2", "B1", "C2", "D2", "C2", "B1", "Eb2", "D2",
             "A1", "G#1", "A1", "B1", "C2", "D2", "Eb2", "F2"]

    HEAVY, SWELL, BREAK = "heavy", "swell", "break"

    phrase_style = [HEAVY, HEAVY, SWELL, BREAK,
                    HEAVY, SWELL, SWELL, BREAK]

    shimmer_vol = {HEAVY: 0.085, SWELL: 0.1, BREAK: 0.095}

    for ci, tones in enumerate(sets):

        base = ci * 4
        style = phrase_style[ci // 2]
        rf = note_freq(roots[ci])

        up = tones + [n[:-1] + str(int(n[-1]) + 1) for n in tones]
        cycle = up + up[-2:0:-1]

        # Eighths everywhere - the arcane shimmer is the only thing
        # that moves, and it never doubles up into 16ths now.
        for i in range(8):
            name = cycle[i % len(cycle)]
            tone(buf, (base + i * 0.5) * spb, 0.44 * spb,
                 note_freq(name), "tri", shimmer_vol[style], release=0.06)

        # An octave above on the fuller phrases - width without pace.
        if style in (HEAVY, SWELL) and ci % 2 == 1:
            for i in range(0, 8, 2):
                name = cycle[i % len(cycle)]
                tone(buf, (base + i * 0.5) * spb, 0.44 * spb,
                     note_freq(name) * 2, "tri", 0.03, release=0.06)

        if style == BREAK:

            # Almost nothing underneath - a hollow low fifth.
            tone(buf, base * spb, 3.8 * spb, rf, "tri", 0.11,
                 attack=0.3, release=0.35)
            tone(buf, base * spb, 3.8 * spb, rf * 1.5, "tri", 0.06,
                 attack=0.35, release=0.35)

        else:

            tone(buf, base * spb, 3.7 * spb, rf, "tri", 0.2,
                 attack=0.03, release=0.2)
            tone(buf, base * spb, 3.7 * spb, rf * 0.5, "sine", 0.11,
                 attack=0.03, release=0.2)

            # Sustained brass swelling underneath on the big
            # phrases - weight, not speed.
            if style == SWELL:
                for name in tones[:3]:
                    tone(buf, base * spb, 3.7 * spb, note_freq(name),
                         "square", 0.04, duty=0.44,
                         attack=0.35, release=0.3)

    # The lead hangs throughout - no running figures anywhere.
    seq(buf, spb, [
        (0, 3, "G5"), (4, 3, "F#5"),
        (8, 3, "A5"), (12, 2, "F5"), (14, 2, "Eb5"),

        (16, 4, "C6"), (20, 2, "B5"), (22, 2, "G#5"),
        (24, 3, "Eb6"), (28, 2, "D6"), (30, 2, "B5"),

        (32, 3, "C5"), (36, 2, "Eb5"), (38, 2, "A4"),
        (40, 3, "F#5"), (44, 2, "A5"), (46, 2, "C6"),

        (48, 4, "Eb6"), (52, 2, "D6"), (54, 2, "F6"),
        (56, 3, "G6"), (60, 2, "F#6"), (62, 2, "D6"),
    ], "square", 0.11, duty=0.42, attack=0.06, release=0.3,
        vib=0.01, vib_rate=5.0)

    # Half-time throughout: hits every two beats, with space around
    # them. No section doubles the pulse.
    for beat in range(64):

        style = phrase_style[beat // 8]

        if style == BREAK:

            if beat % 4 == 0:
                impact(beat * spb, 0.55)

            hat(buf, (beat + 1) * spb, 0.035)

        else:

            big = style == SWELL

            if beat % 2 == 0:
                impact(beat * spb,
                       (1.15 if big else 1.0) if beat % 4 == 0
                       else (0.8 if big else 0.7))

            if beat % 4 == 2:
                snare(buf, beat * spb, 0.32 if big else 0.3)

            hat(buf, (beat + 0.5) * spb, 0.05)

            # A slow tom answer on the big phrases - still on the
            # half-time grid.
            if big and beat % 8 == 6:
                tom(buf, (beat + 1) * spb, 74, 0.24, 0.26)

    # Slow rolling thunder into each swell, in eighths rather than
    # the old 16th rolls.
    for start, freq in ((15, 70), (39, 74), (47, 76)):
        for i in range(3):
            tom(buf, (start + i * 0.5) * spb, freq, 0.14 + i * 0.08, 0.2)

    # The two landings. Nothing on beat 0 marks the loop.
    crash(buf, 16 * spb, 0.15)
    impact(24 * spb, 1.2)
    crash(buf, 24 * spb, 0.12)

    crash(buf, 48 * spb, 0.16)
    impact(56 * spb, 1.3)
    crash(buf, 56 * spb, 0.14)

    echo(buf, 0.3, 0.28)

    return finalize(buf)


def compose_king():
    """Wave 20 - relentless organ and harmonic-minor runs."""

    buf, spb = make_buffer(bpm=150, beats=48)

    # Six 8-beat sections: Dm, Gm, A, Dm, Bb, A.
    sections = [
        ("D2", ["D4", "F4", "A4"]),
        ("G2", ["G3", "Bb3", "D4"]),
        ("A2", ["A3", "C#4", "E4"]),
        ("D2", ["D4", "F4", "A4"]),
        ("Bb1", ["Bb3", "D4", "F4"]),
        ("A1", ["A3", "C#4", "E4"]),
    ]

    # Descending harmonic-minor runs opening each section.
    runs = {
        0: ["D6", "C#6", "Bb5", "A5", "G5", "F5", "E5", "D5"],
        1: ["Bb5", "A5", "G5", "F5", "E5", "D5", "C#5", "Bb4"],
        2: ["A5", "G5", "F5", "E5", "D5", "C#5", "Bb4", "A4"],
        3: ["D6", "C#6", "Bb5", "A5", "G5", "F5", "E5", "D5"],
        4: ["F5", "E5", "D5", "C#5", "Bb4", "A4", "G4", "F4"],
        5: ["A5", "Bb5", "C#6", "D6", "C#6", "Bb5", "A5", "G5"],
    }

    melody = {
        0: [(3, 1, "A5"), (4, 1.5, "F5"), (5.5, 1.5, "E5"), (7, 1, "D5")],
        1: [(3, 1, "D5"), (4, 1.5, "G5"), (5.5, 1.5, "F5"), (7, 1, "D5")],
        2: [(3, 1, "E5"), (4, 1.5, "C#5"), (5.5, 1.5, "E5"), (7, 1, "A5")],
        3: [(3, 1, "A5"), (4, 1.5, "F5"), (5.5, 1.5, "G5"), (7, 1, "A5")],
        4: [(3, 1, "F5"), (4, 1.5, "D5"), (5.5, 1.5, "F5"), (7, 1, "Bb5")],
        5: [(3, 1, "A5"), (4, 1, "C#6"), (5, 1, "E6"), (6, 2, "C#6")],
    }

    for ci, (root, stab) in enumerate(sections):

        base = ci * 8
        rf = note_freq(root)

        # Sustained low organ fifth under everything.
        tone(buf, base * spb, 8 * spb, rf, "square", 0.06, duty=0.45,
             attack=0.1, release=0.3)
        tone(buf, base * spb, 8 * spb, rf * 1.5, "square", 0.04,
             duty=0.45, attack=0.1, release=0.3)

        # Off-beat organ stabs.
        for i in range(8):
            for name in stab:
                f = note_freq(name)
                t = (base + i + 0.5) * spb
                tone(buf, t, 0.3 * spb, f, "square", 0.05, duty=0.4,
                     release=0.03)
                tone(buf, t, 0.3 * spb, f * 2, "square", 0.025,
                     duty=0.4, release=0.03)

        # Driving eighth-note bass.
        for i in range(16):
            f = rf * 2 if i % 8 == 7 else rf
            tone(buf, (base + i * 0.5) * spb, 0.36 * spb, f,
                 "square", 0.16, duty=0.3, release=0.02)

        # The run, then the melody answer.
        for i, name in enumerate(runs[ci]):
            tone(buf, (base + i * 0.25) * spb, 0.22 * spb,
                 note_freq(name), "square", 0.12, duty=0.3, release=0.03)

        seq(buf, spb, [(base + b, d, n) for b, d, n in melody[ci]],
            "square", 0.12, duty=0.3, release=0.05, vib=0.006)

    for beat in range(48):

        kick(buf, beat * spb, 0.42)
        kick(buf, (beat + 0.5) * spb, 0.2)

        if beat % 2 == 1:
            snare(buf, beat * spb, 0.24)

        if beat % 8 == 0:
            crash(buf, beat * spb, 0.12)

    echo(buf, 0.16, 0.14)

    return finalize(buf)


def compose_prince_princess():
    """Wave 20 - one continuous dramatic piece in D harmonic minor.

    The previous version was six contrasting blocks that each swapped
    out the whole texture (kit and bass dropping in and out, the lead
    changing instrument every eight beats), which read as a collage of
    unrelated cues rather than a theme. This is built the way the
    battle/knight/king tracks are: a single kit, bass, and pad running
    unbroken end to end over one repeating Dm - Bb - Gm - A cadence,
    with a recurring fate motif that is restated and varied rather than
    handed back and forth. His march and her high counter-line are
    woven through each other the whole way instead of taking turns.
    """

    buf, spb = make_buffer(bpm=124, beats=32)

    sections = [
        ("D2", ["D3", "F3", "A3"]),
        ("Bb1", ["Bb2", "D3", "F3"]),
        ("G1", ["G2", "Bb2", "D3"]),
        ("A1", ["A2", "C#3", "E3"]),
    ]

    for ci, (root, pad) in enumerate(sections):

        base = ci * 8
        rf = note_freq(root)

        # Pad runs slightly long so each chord overlaps the next -
        # the harmony never gaps at a section boundary.
        chord(buf, spb, base, 8.4, pad, "tri", 0.055,
              attack=0.25, release=0.5)

        # Driving eighth-note bass with an octave pop, unbroken.
        for i in range(16):
            f = rf * 2 if i % 8 == 7 else rf
            tone(buf, (base + i * 0.5) * spb, 0.36 * spb, f,
                 "square", 0.16, duty=0.32, release=0.02)

        # Off-beat brass stabs - the martial edge, in every
        # section rather than only in "his" ones.
        for i in range(4):
            for name in pad:
                tone(buf, (base + i * 2 + 1.5) * spb, 0.4 * spb,
                     note_freq(name), "square", 0.06, duty=0.42,
                     release=0.04)

    # The fate motif: stated, answered a third higher, turned
    # darker, then climbing to the cadence - one voice throughout.
    seq(buf, spb, [
        (0, 1, "A4"), (1, 0.5, "Bb4"), (1.5, 0.5, "A4"),
        (2, 2, "F4"), (4, 1, "D5"), (5, 1, "C#5"), (6, 2, "D5"),

        (8, 1, "D5"), (9, 0.5, "F5"), (9.5, 0.5, "D5"),
        (10, 2, "Bb4"), (12, 1, "F5"), (13, 1, "E5"), (14, 2, "F5"),

        (16, 1, "Bb4"), (17, 0.5, "D5"), (17.5, 0.5, "Bb4"),
        (18, 2, "G4"), (20, 1, "D5"), (21, 1, "Bb4"), (22, 2, "G4"),

        (24, 1, "A4"), (25, 1, "C#5"), (26, 1, "E5"), (27, 1, "G5"),
        (28, 2, "F5"), (30, 1, "E5"), (31, 1, "C#5"),
    ], "square", 0.13, duty=0.38, release=0.05, vib=0.006, vib_rate=5.0)

    # Her counter-line, shadowing the motif high above it - present
    # in every section, never a separate block of its own.
    seq(buf, spb, [
        (2, 2, "D5"), (6, 2, "A5"),
        (10, 2, "F5"), (14, 2, "D6"),
        (18, 2, "Bb5"), (22, 2, "D5"),
        (26, 2, "A5"), (30, 2, "A5"),
    ], "tri", 0.075, attack=0.08, release=0.3, vib=0.008, vib_rate=4.5)

    # One kit, all 32 beats, no dropouts.
    for beat in range(32):

        kick(buf, beat * spb, 0.44)

        if beat % 2 == 1:
            snare(buf, beat * spb, 0.24)

        hat(buf, beat * spb, 0.07)
        hat(buf, (beat + 0.5) * spb, 0.05)

        # A short roll turning each 8-beat phrase into the next.
        if beat % 8 == 7:
            snare(buf, (beat + 0.5) * spb, 0.14)
            snare(buf, (beat + 0.75) * spb, 0.18)

    # Accents mid-phrase rather than on beat 0 - nothing announces
    # the top of the loop.
    timpani(buf, 8 * spb, 55, 0.38)
    timpani(buf, 24 * spb, 55, 0.38)
    crash(buf, 16 * spb, 0.12)

    echo(buf, 0.22, 0.18)

    return finalize(buf)


def compose_hero():
    """The Prince's transformation payoff - the cruellest and
    loudest music in the game, and the most furiously busy.

    Scored like a piano sonata in full flight rather than a synth
    patch: a continuous broken-chord arpeggio ripples under
    everything as the motor (the Moonlight signature), rocketing
    two-octave runs launch out of it into sforzando stabs at the end
    of every phrase, and a full orchestra sits on top - sustained
    string beds in octaves, brass-section stabs, running low
    strings, and a counter-melody working against the lead.

    Harmony is E PHRYGIAN - the bII sitting a semitone above the
    tonic is the sound of something holy gone wrong. The first
    eight turns are the statement; the second eight are new ground
    (C - D - Em - F - Am) closing on a B diminished seventh, so the
    loop is genuinely twice as long rather than played twice.
    """

    buf, spb = make_buffer(bpm=168, beats=64)

    turns = [
        # --- statement ---
        ("E1", ["E3", "G3", "B3", "E4"]),
        ("F1", ["F3", "A3", "C4", "F4"]),
        ("E1", ["E3", "G3", "B3", "E4"]),
        ("F1", ["F3", "A3", "C4", "F4"]),
        ("G1", ["G3", "Bb3", "D4", "G4"]),
        ("F1", ["F3", "A3", "C4", "F4"]),
        ("E1", ["E3", "G3", "B3", "E4"]),
        ("B1", ["B2", "D3", "F3", "B3"]),
        # --- new ground ---
        ("C2", ["C3", "E3", "G3", "C4"]),
        ("D2", ["D3", "F3", "A3", "D4"]),
        ("E1", ["E3", "G3", "B3", "E4"]),
        ("F1", ["F3", "A3", "C4", "F4"]),
        ("A1", ["A2", "C3", "E3", "A3"]),
        ("F1", ["F3", "A3", "C4", "F4"]),
        ("C2", ["C3", "E3", "G3", "C4"]),
        ("B1", ["B2", "D3", "F3", "Ab3"]),
    ]

    for ti, (root, voicing) in enumerate(turns):

        base = ti * 4
        rf = note_freq(root)

        # THE MOTOR: a continuous broken chord in 16ths, rippling
        # up and part-way back, never stopping. This is what turns
        # the piece from stately into relentless.
        arp = voicing + [voicing[2], voicing[1]]

        for i in range(16):
            name = arp[i % len(arp)]
            tone(buf, (base + i * 0.25) * spb, 0.23 * spb,
                 note_freq(name), "tri", 0.075, release=0.05)

        # An octave above, quieter - widens the ripple.
        for i in range(0, 16, 2):
            name = arp[i % len(arp)]
            tone(buf, (base + i * 0.25) * spb, 0.23 * spb,
                 note_freq(name) * 2, "tri", 0.032, release=0.05)

        # Sustained string bed plus upper octave.
        chord(buf, spb, base, 4.3, voicing, "tri", 0.042,
              attack=0.12, release=0.4)

        for name in voicing[:3]:
            tone(buf, base * spb, 4.1 * spb, note_freq(name) * 2, "tri",
                 0.022, attack=0.18, release=0.4)

        # Brass section stabs, octave-doubled.
        for i in range(4):
            for name in voicing[:3]:
                t = (base + i) * spb
                tone(buf, t, 0.4 * spb, note_freq(name), "square", 0.062,
                     duty=0.42, attack=0.006, release=0.05)
                tone(buf, t, 0.4 * spb, note_freq(name) * 2, "square", 0.02,
                     duty=0.42, attack=0.006, release=0.05)

        # Low strings running eighths.
        for i in range(8):
            f = rf * 4 if i % 4 == 3 else rf * 2
            tone(buf, (base + i * 0.5) * spb, 0.3 * spb, f,
                 "saw", 0.12, release=0.02)

        # Sub - E1 is ~41Hz, unbroken under everything.
        tone(buf, base * spb, 3.9 * spb, rf, "sine", 0.25,
             attack=0.02, release=0.12)

    lead = [
        (0, 1, "B5"), (1, 0.5, "C6"), (1.5, 0.5, "B5"), (2, 2, "E5"),
        (4, 1, "C6"), (5, 0.5, "B5"), (5.5, 0.5, "C6"), (6, 2, "F5"),
        (8, 1, "B5"), (9, 0.5, "A5"), (9.5, 0.5, "B5"), (10, 2, "E5"),
        (12, 1, "C6"), (13, 1, "B5"), (14, 2, "F5"),
        (16, 1, "D6"), (17, 0.5, "C6"), (17.5, 0.5, "Bb5"), (18, 2, "G5"),
        (20, 1, "C6"), (21, 0.5, "A5"), (21.5, 0.5, "F5"), (22, 2, "C6"),
        (24, 1, "B5"), (25, 0.5, "G5"), (25.5, 0.5, "E5"), (26, 2, "B5"),
        (28, 1, "F6"), (29, 1, "D6"), (30, 2, "B5"),

        (32, 2, "G5"), (34, 1, "C6"), (35, 1, "E6"), (36, 2, "D6"),
        (38, 1, "A5"), (39, 1, "D6"),
        (40, 2, "E6"), (42, 1, "B5"), (43, 1, "G5"), (44, 2, "F6"),
        (46, 1, "C6"), (47, 1, "A5"),
        (48, 2, "E6"), (50, 1, "C6"), (51, 1, "A5"), (52, 2, "F6"),
        (54, 1, "E6"), (55, 1, "C6"),
        (56, 2, "G6"), (58, 1, "E6"), (59, 1, "C6"),
        (60, 1, "F6"), (61, 1, "D6"), (62, 2, "B5"),
    ]

    seq(buf, spb, lead, "sine", 0.14, attack=0.02, release=0.18,
        vib=0.012, vib_rate=5.5)

    # Saw double an octave below - teeth, without losing the sung
    # line on top.
    seq(buf, spb, [(b, d, n[:-1] + str(int(n[-1]) - 1)) for b, d, n in lead],
        "saw", 0.055, attack=0.02, release=0.12)

    # Counter-melody in the middle register, moving against the
    # lead rather than shadowing it.
    seq(buf, spb, [
        (2, 2, "G4"), (6, 2, "A4"), (10, 2, "B4"), (14, 2, "A4"),
        (18, 2, "D5"), (22, 2, "C5"), (26, 2, "G4"), (30, 2, "F4"),
        (34, 2, "E5"), (38, 2, "F5"), (42, 2, "D5"), (46, 2, "C5"),
        (50, 2, "A4"), (54, 2, "C5"), (58, 2, "B4"), (62, 2, "F4"),
    ], "tri", 0.065, attack=0.1, release=0.3, vib=0.006, vib_rate=4.5)

    # Rocketing two-octave runs launching out of the arpeggio into
    # a sforzando chord - the loudest gesture in the piece, at the
    # end of every eight-beat phrase.
    rockets = [
        (6.5, ["E4", "G4", "B4", "E5", "G5", "B5"], ["E4", "G4", "B4", "E5"]),
        (14.5, ["F4", "A4", "C5", "F5", "A5", "C6"], ["F4", "A4", "C5", "F5"]),
        (22.5, ["G4", "Bb4", "D5", "G5", "Bb5", "D6"], ["G4", "Bb4", "D5", "G5"]),
        (30.5, ["B3", "D4", "F4", "B4", "D5", "F5"], ["B3", "D4", "F4", "B4"]),
        (38.5, ["C4", "E4", "G4", "C5", "E5", "G5"], ["C4", "E4", "G4", "C5"]),
        (46.5, ["F4", "A4", "C5", "F5", "A5", "C6"], ["F4", "A4", "C5", "F5"]),
        (54.5, ["A3", "C4", "E4", "A4", "C5", "E5"], ["A3", "C4", "E4", "A4"]),
        (62.5, ["B3", "D4", "F4", "Ab4", "B4", "D5"], ["B3", "D4", "F4", "Ab4"]),
    ]

    for start, run, stab in rockets:

        for i, name in enumerate(run):
            tone(buf, (start + i * 0.25) * spb, 0.22 * spb,
                 note_freq(name), "tri", 0.1, release=0.04)

        # Sforzando: the run slams into a chord on the downbeat.
        landing = start + len(run) * 0.25

        for name in stab:
            tone(buf, landing * spb, 0.55 * spb, note_freq(name),
                 "square", 0.085, duty=0.44, attack=0.004, release=0.08)

    # Low tolling bells rather than bright chimes.
    for ti in range(0, 16, 4):
        tone(buf, (ti * 4) * spb, 2.2 * spb, note_freq("E3"), "sine",
             0.08, attack=0.004, release=0.7)

    # Double-kick, backbeat with ghost notes, 16th hats.
    for beat in range(64):

        kick(buf, beat * spb, 0.48)
        kick(buf, (beat + 0.5) * spb, 0.24)

        if beat % 2 == 1:
            snare(buf, beat * spb, 0.28)
        else:
            snare(buf, (beat + 0.75) * spb, 0.09)

        for h in range(4):
            hat(buf, (beat + h * 0.25) * spb,
                0.05 if h % 2 == 0 else 0.028)

        if beat % 8 == 7:
            snare(buf, (beat + 0.5) * spb, 0.18)
            snare(buf, (beat + 0.75) * spb, 0.24)

    for beat in (0, 16, 32, 48):
        timpani(buf, beat * spb, 41, 0.4)

    crash(buf, 32 * spb, 0.15)
    crash(buf, 48 * spb, 0.13)

    echo(buf, 0.18, 0.2)

    # The loudest thing in the game, deliberately: a harder drive
    # into the limiter than the 0.22 the rest of the catalogue uses,
    # and a higher ceiling.
    return finalize(buf, peak=0.96, target_rms=0.3)


def compose_victory():
    """Victory screen - a bright major-key fanfare."""

    buf, spb = make_buffer(bpm=112, beats=16)

    fanfare = [
        (0, 0.5, "C5"), (0.5, 0.5, "C5"), (1, 1, "C5"), (2, 1, "E5"),
        (3, 1, "G5"), (4, 2, "C6"), (6, 1, "G5"), (7, 1, "A5"),
        (8, 2, "F5"), (10, 1, "A5"), (11, 1, "C6"),
        (12, 2, "G5"), (14, 1, "D6"), (15, 1, "B5"),
    ]

    seq(buf, spb, fanfare, "square", 0.13, release=0.06)

    # Parallel thirds below the fanfare.
    thirds = {"C5": "G4", "E5": "C5", "G5": "E5", "C6": "G5",
              "A5": "F5", "F5": "C5", "D6": "B5", "B5": "G5"}

    seq(buf, spb, [(b, d, thirds[n]) for b, d, n in fanfare],
        "tri", 0.09, release=0.06)

    # Pads: C - C - F - G.
    for base, tones in [(0, ["C3", "E3", "G3"]), (4, ["C3", "E3", "G3"]),
                        (8, ["F3", "A3", "C4"]), (12, ["G3", "B3", "D4"])]:
        chord(buf, spb, base, 4, tones, "tri", 0.05, attack=0.2,
              release=0.3)

    for beat in [0, 4, 8, 12]:
        timpani(buf, beat * spb, 65 if beat < 8 else 87, 0.4)

    crash(buf, 0, 0.18)
    echo(buf, 0.24, 0.22)

    return finalize(buf)


# =====================================
# Main
# =====================================

TRACKS = {
    "menu.wav": compose_menu,
    "battle.wav": compose_battle,
    "castle_guard.wav": compose_castle_guard,
    "knight.wav": compose_knight,
    "magus.wav": compose_magus,
    "king.wav": compose_king,
    "prince_princess.wav": compose_prince_princess,
    "hero.wav": compose_hero,
    "victory.wav": compose_victory,
}


def main():

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for filename, compose in TRACKS.items():

        buf = compose()
        path = OUT_DIR / filename

        write_wav(path, buf)

        secs = len(buf) / SR
        kb = path.stat().st_size / 1024

        print(f"{filename:18} {secs:5.1f}s  {kb:6.0f} KB")


if __name__ == "__main__":
    main()
