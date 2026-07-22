// =====================================
// Pixel Font & Panels
// =====================================
//
// A hand-built 5x7 bitmap font, drawn as solid rectangles.
//
// Why not a webfont: the whole game ships with zero network
// dependencies (see index.html - there isn't a single external
// link, and UI_FONT quietly falls back to Georgia because
// Cinzel was never loaded). Pulling a pixel typeface off a CDN
// would break offline play and fail silently into a serif,
// which is exactly the mismatch this is meant to fix. Rendering
// glyphs as rects is self-contained, scales to any size, and
// stays crisp because every "pixel" is an integer rect.
//
// Each glyph is 7 rows of 5 columns, '1' = filled.

const PIXEL_GLYPHS = {

    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
    Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"],
    Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],

    0: ["01110", "10011", "10011", "10101", "11001", "11001", "01110"],
    1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
    4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],

    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00000", "00100"],
    ",": ["00000", "00000", "00000", "00000", "00000", "00100", "01000"],
    ":": ["00000", "00100", "00000", "00000", "00000", "00100", "00000"],
    "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
    "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
    "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
    ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],

    // Multiplication sign - distinct from the letter X, which
    // is what an uppercased "x" would collide with.
    "×": ["00000", "10001", "01010", "00100", "01010", "10001", "00000"],

    // Selector arrows (class picker, bestiary pages).
    "◀": ["00001", "00011", "00111", "01111", "00111", "00011", "00001"],
    "▶": ["10000", "11000", "11100", "11110", "11100", "11000", "10000"]

};

const PIXEL_GLYPH_W = 5;
const PIXEL_GLYPH_H = 7;

// One blank column between glyphs, in font-pixels.
const PIXEL_GLYPH_GAP = 1;

// Width of `text` in font-pixels at scale 1.
function measurePixelText(text) {

    const chars = text.length;

    if (chars === 0)
        return 0;

    return chars * PIXEL_GLYPH_W + (chars - 1) * PIXEL_GLYPH_GAP;

}

// Largest whole-number pixel scale that fits `text` inside
// maxWidth/maxHeight. Kept an integer so glyph edges land on
// exact pixel boundaries and never blur.
function fitPixelScale(text, maxWidth, maxHeight) {

    const byWidth = maxWidth / measurePixelText(text);
    const byHeight = maxHeight / PIXEL_GLYPH_H;

    return Math.max(1, Math.floor(Math.min(byWidth, byHeight)));

}

// Draws `text` centered on (cx, cy).
//
// opts:
//   color   - glyph fill
//   shadow  - drop-shadow color (offset one font-pixel down
//             and right); omit for none
//
// Unknown characters fall back to a space rather than
// throwing, so a label change can never break the menu.

function drawPixelText(text, cx, cy, scale, opts = {}) {

    const chars = String(text).toUpperCase();

    const totalW = measurePixelText(chars) * scale;
    const totalH = PIXEL_GLYPH_H * scale;

    const startX = Math.round(cx - totalW / 2);
    const startY = Math.round(cy - totalH / 2);

    // Consecutive lit pixels in a row are drawn as ONE rect
    // rather than one each. The HUD redraws this every frame,
    // and a full status readout is a few hundred glyphs - runs
    // cut the fillRect count by roughly half for free.
    const paint = (offsetX, offsetY, color) => {

        ctx.fillStyle = color;

        let penX = startX + offsetX;

        for (const ch of chars) {

            const glyph = PIXEL_GLYPHS[ch] ?? PIXEL_GLYPHS[" "];

            for (let row = 0; row < PIXEL_GLYPH_H; row++) {

                const bits = glyph[row];

                let runStart = -1;

                for (let col = 0; col <= PIXEL_GLYPH_W; col++) {

                    const lit = col < PIXEL_GLYPH_W && bits[col] === "1";

                    if (lit && runStart === -1) {

                        runStart = col;

                    } else if (!lit && runStart !== -1) {

                        ctx.fillRect(
                            penX + runStart * scale,
                            startY + offsetY + row * scale,
                            (col - runStart) * scale,
                            scale
                        );

                        runStart = -1;

                    }

                }

            }

            penX += (PIXEL_GLYPH_W + PIXEL_GLYPH_GAP) * scale;

        }

    };

    ctx.save();

    if (opts.shadow)
        paint(scale, scale, opts.shadow);

    paint(0, 0, opts.color ?? "#ffffff");

    ctx.restore();

}

// =====================================
// Pixel Panel
// =====================================
//
// A hard-edged plate to sit under pixel text: flat fill, a
// stepped light/dark bevel, a chunky dark outline, and clipped
// corners - the shape 16-bit menus used. Deliberately has no
// gradients, no rounded corners and no soft shadow, which is
// what made the old glossy CSS-style plates read as a
// different game to the pixel-art background behind them.
//
// `unit` is the size of one bevel step in screen pixels;
// scaling it with the button keeps small controls slim.

// Any CSS color -> [r, g, b]. Round-trips through fillStyle,
// which the browser normalises to "#rrggbb", so named colors
// ("lime"), shorthand ("#555") and rgb() strings all work
// without a lookup table of our own.
const PIXEL_COLOR_CACHE = {};

function toRGB(color) {

    if (PIXEL_COLOR_CACHE[color])
        return PIXEL_COLOR_CACHE[color];

    const previous = ctx.fillStyle;

    ctx.fillStyle = color;
    const normalized = ctx.fillStyle;
    ctx.fillStyle = previous;

    let rgb = [128, 128, 128];

    if (typeof normalized === "string" && normalized[0] === "#") {

        const value = parseInt(normalized.slice(1), 16);

        rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];

    }

    PIXEL_COLOR_CACHE[color] = rgb;

    return rgb;

}

function shiftRGB([r, g, b], amount) {

    const move = (c) => amount >= 0
        ? Math.round(c + (255 - c) * amount)
        : Math.round(c * (1 + amount));

    return `rgb(${move(r)}, ${move(g)}, ${move(b)})`;

}

// Builds a full pixel-panel palette from a single accent
// colour. This is what lets every existing drawButton() call
// site - mode cards, shop buy/equip, bestiary, back buttons -
// convert to the pixel look without touching any of them.
//
// `textColor` is the caller's own label colour; the shadow is
// derived so light labels get a dark shadow and vice versa.

function pixelPaletteFrom(color, textColor = "#ffffff") {

    const base = toRGB(color);
    const text = toRGB(textColor);

    const luminance = (text[0] * 0.3 + text[1] * 0.59 + text[2] * 0.11) / 255;

    return {
        face: shiftRGB(base, 0),
        light: shiftRGB(base, 0.34),
        shade: shiftRGB(base, -0.42),
        outline: shiftRGB(base, -0.78),
        text: textColor,
        textShadow: luminance > 0.5
            ? shiftRGB(base, -0.65)
            : shiftRGB(base, 0.5)
    };

}

// =====================================
// Wrapped Pixel Text
// =====================================
//
// The pixel counterpart to wrapText(): breaks `text` on word
// boundaries to fit maxWidth and draws each line LEFT-aligned
// from (x, y), returning the y just past the last line so
// callers can flow content beneath it.
//
// Note drawPixelText centres on its given point, so each line
// is emitted at its own midline - hence the half-line offset.

function drawPixelTextWrapped(text, x, y, maxWidth, scale, opts = {}) {

    const words = String(text).toUpperCase().split(" ");

    const lineHeight = PIXEL_GLYPH_H * scale + scale * 3;

    const lines = [];
    let line = "";

    words.forEach(word => {

        const test = line ? `${line} ${word}` : word;

        if (line && measurePixelText(test) * scale > maxWidth) {

            lines.push(line);
            line = word;

        } else {

            line = test;

        }

    });

    if (line)
        lines.push(line);

    lines.forEach((text, i) => {

        drawPixelText(
            text,
            x + measurePixelText(text) * scale / 2,
            y + i * lineHeight + PIXEL_GLYPH_H * scale / 2,
            scale,
            opts
        );

    });

    return y + lines.length * lineHeight;

}

// =====================================
// Pixel Frame
// =====================================
//
// The window/card counterpart to drawPixelPanel: a dark
// translucent interior inside a chunky two-tone border, with
// the corners knocked off. Used for anything that holds
// content rather than being clicked - shop rows, bestiary
// cards, HUD backdrops, mode cards.

function drawPixelFrame(x, y, w, h, opts = {}) {

    const u = Math.max(2, Math.round(opts.unit ?? 3));

    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);

    const border = opts.border ?? "#6b5a3e";
    const borderDark = opts.borderDark ?? "#2a2116";
    const fill = opts.fill ?? "rgba(12, 9, 6, 0.72)";

    ctx.save();

    // Outer dark band, corners clipped.
    ctx.fillStyle = borderDark;
    ctx.fillRect(x + u, y, w - u * 2, h);
    ctx.fillRect(x, y + u, w, h - u * 2);

    // Inner lighter border.
    ctx.fillStyle = border;
    ctx.fillRect(x + u, y + u, w - u * 2, h - u * 2);

    // Interior.
    ctx.fillStyle = fill;
    ctx.fillRect(x + u * 2, y + u * 2, w - u * 4, h - u * 4);

    ctx.restore();

}

function drawPixelPanel(x, y, w, h, colors, unit) {

    const u = Math.max(2, Math.round(unit ?? Math.min(w, h) * 0.08));

    // Snap to whole pixels so the bevel edges stay crisp.
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);

    ctx.save();

    // Outline, with the corners knocked off - drawn as three
    // bands rather than a rounded rect so every edge is hard.
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x + u, y, w - u * 2, h);
    ctx.fillRect(x, y + u, w, h - u * 2);

    // Body.
    const bx = x + u;
    const by = y + u;
    const bw = w - u * 2;
    const bh = h - u * 2;

    ctx.fillStyle = colors.face;
    ctx.fillRect(bx, by, bw, bh);

    // Stepped bevel: lit top/left, shaded bottom/right.
    ctx.fillStyle = colors.light;
    ctx.fillRect(bx, by, bw - u, u);
    ctx.fillRect(bx, by, u, bh - u);

    ctx.fillStyle = colors.shade;
    ctx.fillRect(bx + u, by + bh - u, bw - u, u);
    ctx.fillRect(bx + bw - u, by + u, u, bh - u);

    ctx.restore();

}
