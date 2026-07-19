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


def finalize(buf, peak=0.82):

    # Remove DC, then normalize to a consistent loudness.
    mean = sum(buf) / len(buf)
    top = max(0.0001, max(abs(s - mean) for s in buf))
    g = peak / top

    return [(s - mean) * g for s in buf]


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

    # Long, dark horn line above the riff.
    seq(buf, spb, [
        (0, 6, "D4"), (8, 4, "F4"), (12, 4, "E4"),
        (16, 6, "Bb3"), (24, 8, "A3"),
    ], "square", 0.09, duty=0.4, attack=0.1, release=0.4,
        vib=0.005, vib_rate=4.0)

    for beat in range(32):

        kick(buf, beat * spb, 0.5)

        if beat % 4 == 2:
            snare(buf, beat * spb, 0.3)

    # Tom fill into the loop point.
    for i, fr in enumerate([110, 98, 86, 74, 66, 58, 52, 46]):
        tom(buf, (28 + i * 0.5) * spb, fr, 0.3)

    crash(buf, 0, 0.14)
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
    """Wave 15 - diminished shimmer and thunder for the storm-caller."""

    buf, spb = make_buffer(bpm=132, beats=32)

    # Diminished-seventh arpeggio sets, 8 beats each.
    sets = [
        ["C4", "Eb4", "F#4", "A4"],
        ["B3", "D4", "F4", "G#4"],
        ["C4", "Eb4", "F#4", "A4"],
        ["D4", "F4", "G#4", "B4"],
    ]

    for ci, tones in enumerate(sets):

        base = ci * 8

        # 16th-note shimmer cycling up two octaves and back.
        up = tones + [n[:-1] + str(int(n[-1]) + 1) for n in tones]
        cycle = up + up[-2:0:-1]

        for i in range(32):
            name = cycle[i % len(cycle)]
            tone(buf, (base + i * 0.25) * spb, 0.22 * spb,
                 note_freq(name), "tri", 0.09, release=0.06)

        # Pulsing low bass, half notes.
        roots = {0: ["C2", "G1", "C2", "B1"], 1: ["B1", "B1", "G#1", "B1"],
                 2: ["C2", "G1", "C2", "B1"], 3: ["D2", "D2", "B1", "G#1"]}[ci]

        for i, name in enumerate(roots):
            tone(buf, (base + i * 2) * spb, 1.7 * spb, note_freq(name),
                 "tri", 0.17, attack=0.03, release=0.1)

    # Eerie lead hanging above the storm.
    seq(buf, spb, [
        (0, 2.5, "G5"), (8, 2.5, "F5"), (16, 1.5, "G5"),
        (18, 1.5, "A5"), (24, 2, "G#5"), (28, 2.5, "B5"),
    ], "square", 0.08, duty=0.42, attack=0.08, release=0.3,
        vib=0.01, vib_rate=6.0)

    # Thunder: deep tom hits and a rising roll each phrase.
    for ci in range(4):

        base = ci * 8

        tom(buf, base * spb, 55, 0.45, 0.4)

        for i in range(6):
            tom(buf, (base + 6.5 + i * 0.25) * spb, 70,
                0.1 + i * 0.05, 0.15)

    for beat in range(0, 32, 2):
        kick(buf, beat * spb, 0.3)

    echo(buf, 0.28, 0.32)

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
