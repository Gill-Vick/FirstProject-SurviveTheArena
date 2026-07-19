# =====================================
# SFX Generator
# =====================================
#
# Synthesizes every sound effect in the SFX catalog (js/audio/
# sounds.js). Same deal as generate_music.py - pure stdlib,
# rerun after tweaking a recipe:
#
#   python3 assets/audio/generate_sfx.py
#
# Every recipe returns a buffer sized with enough tail room
# that nothing wraps (unlike the music, sfx don't loop). Peak
# normalization is shared with the music generator; relative
# loudness between sounds is balanced by the per-sound volume
# trims in the catalog, not here.

import math
import random
from pathlib import Path

from generate_music import SR, finalize, note_freq, tone, write_wav

OUT_DIR = Path(__file__).parent / "sfx"

rng = random.Random(19)


def mk(dur_s):
    """Fresh buffer with tail margin so tone releases fit."""

    return [0.0] * int((dur_s + 0.35) * SR)


# =====================================
# Local synth helpers
# =====================================

def swoosh(buf, start_s, dur_s, vol, lowpass=0.0, highpass=True):
    """Noise with a rise-and-fall (hump) envelope - swings,
    dashes, whooshes. lowpass 0..1 darkens the noise."""

    n = max(1, int(dur_s * SR))
    i0 = int(start_s * SR)
    prev = 0.0
    lp = 0.0
    uniform = rng.uniform
    sin = math.sin

    for i in range(n):

        x = uniform(-1.0, 1.0)

        if highpass:
            s = (x - prev) * 0.7
            prev = x
        else:
            s = x

        if lowpass > 0.0:
            lp += (1.0 - lowpass) * (s - lp)
            s = lp

        env = sin(math.pi * i / n) ** 2

        buf[i0 + i] += s * vol * env


def boom(buf, start_s, dur_s, vol, lowpass=0.88):
    """Dark decaying rumble - explosions, slams."""

    n = max(1, int(dur_s * SR))
    i0 = int(start_s * SR)
    lp = 0.0
    uniform = rng.uniform

    for i in range(n):

        lp += (1.0 - lowpass) * (uniform(-1.0, 1.0) - lp)

        env = (1.0 - i / n) ** 2.5

        buf[i0 + i] += lp * vol * env


def crack(buf, start_s, dur_s, vol, curve=2.0):
    """Bright decaying noise burst - impacts, cracks."""

    n = max(1, int(dur_s * SR))
    i0 = int(start_s * SR)
    prev = 0.0
    uniform = rng.uniform

    for i in range(n):

        x = uniform(-1.0, 1.0)
        s = (x - prev) * 0.7
        prev = x

        env = (1.0 - i / n) ** curve

        buf[i0 + i] += s * vol * env


def zap(buf, start_s, f_hi, f_lo, dur_s, vol):
    """Fast descending square sweep - lasers, bolts."""

    tone(buf, start_s, dur_s, f_hi, "square", vol, duty=0.3,
         freq_end=f_lo, release=0.03)


def thump(buf, start_s, f_hi, f_lo, dur_s, vol):
    """Pitched sine drop - the body of any impact."""

    tone(buf, start_s, dur_s, f_hi, "sine", vol,
         freq_end=f_lo, release=0.05)


def chime(buf, start_s, names, gap_s, dur_s, vol, wave_type="sine"):
    """Staggered note run - pickups, fanfare blips."""

    for i, name in enumerate(names):
        tone(buf, start_s + i * gap_s, dur_s, note_freq(name),
             wave_type, vol, release=max(0.08, dur_s))


# =====================================
# Recipes
# =====================================

def sword_swing():
    buf = mk(0.25)
    swoosh(buf, 0, 0.2, 0.6, lowpass=0.55)
    return buf


def sword_hit():
    buf = mk(0.2)
    thump(buf, 0, 160, 65, 0.1, 0.7)
    crack(buf, 0, 0.07, 0.35)
    return buf


def dagger_swing():
    buf = mk(0.15)
    swoosh(buf, 0, 0.11, 0.55, lowpass=0.3)
    return buf


def crit_hit():
    buf = mk(0.3)
    thump(buf, 0, 180, 70, 0.1, 0.7)
    crack(buf, 0, 0.08, 0.35)
    # rising ping, triangle so it gleams instead of bites
    tone(buf, 0.02, 0.12, 600, "tri", 0.3, freq_end=1300,
         release=0.06)
    return buf


def bow_shot():
    buf = mk(0.2)
    tone(buf, 0, 0.07, 190, "tri", 0.6, freq_end=150, release=0.06)
    crack(buf, 0, 0.04, 0.3, curve=1.5)
    return buf


def arrow_hit():
    buf = mk(0.12)
    thump(buf, 0, 300, 140, 0.05, 0.55)
    crack(buf, 0, 0.03, 0.35)
    return buf


def knife_throw():
    buf = mk(0.18)
    swoosh(buf, 0, 0.14, 0.5, lowpass=0.2)
    tone(buf, 0.02, 0.06, 900, "tri", 0.12, freq_end=500, release=0.04)
    return buf


def dash():
    buf = mk(0.3)
    swoosh(buf, 0, 0.24, 0.6, lowpass=0.75, highpass=False)
    return buf


def laser():
    buf = mk(0.35)
    tone(buf, 0, 0.28, 950, "saw", 0.4, freq_end=180, release=0.05)
    zap(buf, 0, 1900, 360, 0.28, 0.2)
    return buf


def sunbeam():
    # Radiant ARTILLERY, not fairy dust - a deep strike with a
    # warm mid body and one modest overtone for the "light"
    # flavor. The old 1.3-2.2kHz sine stack read as piercing.
    buf = mk(0.45)
    thump(buf, 0, 170, 60, 0.28, 0.8)
    boom(buf, 0, 0.3, 0.35)
    tone(buf, 0.01, 0.2, 520, "tri", 0.35, freq_end=300,
         release=0.12)
    tone(buf, 0.02, 0.14, 780, "sine", 0.15, release=0.1)
    return buf


def sunburst():
    # Pure blast wave - the shove is the point of this spell.
    buf = mk(0.6)
    thump(buf, 0, 110, 38, 0.35, 0.85)
    boom(buf, 0, 0.5, 0.6)
    tone(buf, 0.02, 0.18, 420, "tri", 0.3, freq_end=240,
         release=0.12)
    return buf


def lightning_chain():
    buf = mk(0.2)
    zap(buf, 0, 2400, 300, 0.09, 0.4)
    zap(buf, 0.05, 1800, 250, 0.08, 0.3)
    crack(buf, 0, 0.1, 0.35, curve=1.5)
    return buf


def shield_block():
    buf = mk(0.35)
    # Inharmonic partials read as metal.
    for f, v in [(420, 0.4), (633, 0.28), (1130, 0.18), (1790, 0.1)]:
        tone(buf, 0, 0.22, f, "tri", v, release=0.15)
    crack(buf, 0, 0.03, 0.4)
    return buf


def halo_break():
    # An octave lower than it was - a warm shattered bell
    # rather than breaking glass.
    buf = mk(0.5)
    chime(buf, 0, ["G5", "Eb5", "B4", "G4"], 0.07, 0.16, 0.35, "tri")
    thump(buf, 0, 200, 90, 0.12, 0.4)
    return buf


def player_hurt():
    buf = mk(0.25)
    tone(buf, 0, 0.16, 240, "tri", 0.5, freq_end=140,
         release=0.06)
    crack(buf, 0, 0.06, 0.25)
    return buf


def player_death():
    buf = mk(0.9)
    tone(buf, 0, 0.75, 330, "tri", 0.5, freq_end=70,
         release=0.15)
    boom(buf, 0.1, 0.6, 0.35)
    return buf


def enemy_hit():
    buf = mk(0.1)
    thump(buf, 0, 210, 110, 0.06, 0.6)
    crack(buf, 0, 0.03, 0.25)
    return buf


def enemy_death():
    # Deliberately mellow - this fires constantly, so it's a
    # soft descending sigh rather than a zap: triangle sweep
    # with a slow attack and a small dark puff underneath.
    buf = mk(0.3)
    tone(buf, 0, 0.18, 300, "tri", 0.5, freq_end=110,
         attack=0.02, release=0.08)
    boom(buf, 0, 0.15, 0.2)
    return buf


def enemy_shoot():
    # Triangle pew instead of a square zap - it fires from
    # every archer in the wave.
    buf = mk(0.12)
    tone(buf, 0, 0.09, 620, "tri", 0.45, freq_end=260,
         release=0.03)
    return buf


def explosion():
    buf = mk(0.7)
    thump(buf, 0, 85, 32, 0.4, 0.8)
    boom(buf, 0, 0.6, 0.7)
    crack(buf, 0, 0.1, 0.3)
    return buf


def summon():
    buf = mk(0.55)
    tone(buf, 0, 0.4, 190, "sine", 0.4, freq_end=620,
         release=0.12, vib=0.02, vib_rate=9)
    swoosh(buf, 0.05, 0.35, 0.2, lowpass=0.6)
    return buf


def boss_slam():
    buf = mk(0.7)
    thump(buf, 0, 95, 28, 0.4, 0.85)
    boom(buf, 0, 0.55, 0.6)
    crack(buf, 0, 0.06, 0.28)
    return buf


def telegraph():
    buf = mk(0.3)
    tone(buf, 0, 0.09, 880, "tri", 0.3, release=0.05)
    tone(buf, 0.13, 0.11, 660, "tri", 0.3, release=0.06)
    return buf


def wave_start():
    # A tiny two-note chime, not a horn - the wave banner on
    # screen does the announcing; this just ticks the moment.
    buf = mk(0.35)
    tone(buf, 0, 0.06, note_freq("G5"), "sine", 0.4,
         attack=0.01, release=0.08)
    tone(buf, 0.09, 0.1, note_freq("C6"), "sine", 0.35,
         attack=0.01, release=0.12)
    return buf


def wave_clear():
    buf = mk(0.6)
    chime(buf, 0, ["C5", "E5", "G5", "C6"], 0.08, 0.14, 0.28, "tri")
    return buf


def boss_spawn():
    buf = mk(1.0)
    tone(buf, 0, 0.7, note_freq("G2"), "saw", 0.35,
         release=0.2, vib=0.008, vib_rate=5)
    tone(buf, 0, 0.7, note_freq("G3"), "saw", 0.18,
         release=0.2, vib=0.008, vib_rate=5)
    thump(buf, 0, 90, 40, 0.3, 0.6)
    boom(buf, 0.1, 0.6, 0.3)
    return buf


def coin():
    buf = mk(0.25)
    tone(buf, 0, 0.05, note_freq("B5"), "tri", 0.35, release=0.03)
    tone(buf, 0.06, 0.14, note_freq("E6"), "tri", 0.35, release=0.09)
    return buf


def game_over():
    buf = mk(1.5)
    for i, name in enumerate(["A4", "E4", "C4", "A3"]):
        tone(buf, i * 0.28, 0.26, note_freq(name), "tri", 0.4,
             attack=0.02, release=0.16, vib=0.005)
    boom(buf, 1.0, 0.4, 0.2)
    return buf


def victory():
    buf = mk(0.8)
    chime(buf, 0, ["C5", "G5", "C6"], 0.1, 0.22, 0.3, "square")
    chime(buf, 0.1, ["E5", "C6", "E6"], 0.1, 0.2, 0.15, "tri")
    return buf


def ui_click():
    # Soft, rounded "thock" - sines, not squares. Raw square
    # blips at 1kHz read as piercing on real speakers.
    buf = mk(0.1)
    tone(buf, 0, 0.04, 520, "sine", 0.55, release=0.05)
    tone(buf, 0, 0.025, 1040, "sine", 0.12, release=0.03)
    return buf


def ui_hover():
    buf = mk(0.08)
    tone(buf, 0, 0.025, 660, "sine", 0.3, release=0.04)
    return buf


def ui_purchase():
    buf = mk(0.4)
    chime(buf, 0, ["E5", "A5", "C#6"], 0.07, 0.14, 0.3)
    return buf


def ui_denied():
    # Low double-knock rather than a raspy buzz.
    buf = mk(0.3)
    tone(buf, 0, 0.08, 165, "tri", 0.5, release=0.05)
    tone(buf, 0.12, 0.1, 130, "tri", 0.5, release=0.06)
    return buf


def ui_equip():
    buf = mk(0.18)
    tone(buf, 0, 0.03, 500, "sine", 0.35, release=0.03)
    tone(buf, 0.05, 0.08, 660, "tri", 0.3, release=0.06)
    return buf


# =====================================
# Main
# =====================================
#
# Filenames must match the src paths in the SFX catalog.

RECIPES = {
    "sword_swing.wav": sword_swing,
    "sword_hit.wav": sword_hit,
    "dagger_swing.wav": dagger_swing,
    "crit_hit.wav": crit_hit,
    "bow_shot.wav": bow_shot,
    "arrow_hit.wav": arrow_hit,
    "knife_throw.wav": knife_throw,
    "dash.wav": dash,
    "laser.wav": laser,
    "sunbeam.wav": sunbeam,
    "sunburst.wav": sunburst,
    "lightning_chain.wav": lightning_chain,
    "shield_block.wav": shield_block,
    "halo_break.wav": halo_break,
    "player_hurt.wav": player_hurt,
    "player_death.wav": player_death,
    "enemy_hit.wav": enemy_hit,
    "enemy_death.wav": enemy_death,
    "enemy_shoot.wav": enemy_shoot,
    "explosion.wav": explosion,
    "summon.wav": summon,
    "boss_slam.wav": boss_slam,
    "telegraph.wav": telegraph,
    "wave_start.wav": wave_start,
    "wave_clear.wav": wave_clear,
    "boss_spawn.wav": boss_spawn,
    "coin.wav": coin,
    "game_over.wav": game_over,
    "victory.wav": victory,
    "ui_click.wav": ui_click,
    "ui_hover.wav": ui_hover,
    "ui_purchase.wav": ui_purchase,
    "ui_denied.wav": ui_denied,
    "ui_equip.wav": ui_equip,
}


def soften(buf, cutoff_hz=3800.0):
    """Gentle one-pole lowpass applied to every finished sfx -
    shaves the harsh digital top end off squares, zaps, and
    noise without muffling the body of the sound."""

    a = 1.0 - math.exp(-2.0 * math.pi * cutoff_hz / SR)
    lp = 0.0

    for i, s in enumerate(buf):
        lp += a * (s - lp)
        buf[i] = lp

    return buf


def main():

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0

    for filename, recipe in RECIPES.items():

        buf = finalize(soften(recipe()), peak=0.8)
        path = OUT_DIR / filename

        write_wav(path, buf)

        total += path.stat().st_size

        print(f"{filename:22} {len(buf) / SR:5.2f}s")

    print(f"\n{len(RECIPES)} files, {total / 1024:.0f} KB total")


if __name__ == "__main__":
    main()
