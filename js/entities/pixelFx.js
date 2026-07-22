// =====================================
// Pixel FX primitives
// =====================================
//
// Shared blocky-shape helpers so every shield, aura, ring and
// beam in the arena reads on the same pixel grid as the menus
// and HUD. All of these snap their cells to a WORLD-space grid
// of size `unit`, so a pulsing radius grows in whole-pixel
// steps and never shimmers with sub-pixel edges.
//
// ctx comes from game.js (loaded first). These are plain
// functions, called only at draw time, so load order past
// game.js doesn't matter.

// Floor a world coordinate onto the pixel grid.
function pxSnap(v, unit) {

    return Math.floor(v / unit) * unit;

}

// A ring of square "pixels" around (cx, cy). `thickness` is
// how many pixel-widths deep the band runs inward.
//
// opts: color, alpha, unit, thickness, glow, glowColor
function drawPixelRing(cx, cy, radius, opts = {}) {

    if (radius <= 0)
        return;

    const unit = Math.max(2, Math.round(opts.unit ?? Math.max(3, radius * 0.05)));
    const thickness = Math.max(1, opts.thickness ?? 1);

    ctx.save();

    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.fillStyle = opts.color ?? "#ffffff";

    if (opts.glow) {

        ctx.shadowBlur = opts.glow;
        ctx.shadowColor = opts.glowColor ?? opts.color ?? "#ffffff";

    }

    // Step fine enough that neighbouring cells touch, so the
    // ring reads solid rather than dotted.
    const drawn = new Set();

    for (let layer = 0; layer < thickness; layer++) {

        const r = radius - layer * unit;

        if (r <= 0)
            break;

        const steps = Math.max(24, Math.ceil((r * 2 * Math.PI) / unit));

        for (let i = 0; i < steps; i++) {

            const a = (i / steps) * Math.PI * 2;
            const px = pxSnap(cx + Math.cos(a) * r, unit);
            const py = pxSnap(cy + Math.sin(a) * r, unit);

            const key = px + "," + py;

            if (drawn.has(key))
                continue;

            drawn.add(key);

            ctx.fillRect(px, py, unit, unit);

        }

    }

    ctx.restore();
    ctx.globalAlpha = 1;

}

// A filled aura disc on a coarse grid. The outer band is
// dithered (checkerboard-dropped) so the edge fades in blocks
// rather than a hard circle - reads as a soft pixel glow.
//
// opts: color (any css), alpha, unit, dither (0..1 of the
// radius that gets dithered)
function drawPixelDisc(cx, cy, radius, opts = {}) {

    if (radius <= 0)
        return;

    const unit = Math.max(3, Math.round(opts.unit ?? radius * 0.08));
    const dither = opts.dither ?? 0.55;

    ctx.save();

    ctx.globalAlpha = opts.alpha ?? 0.2;
    ctx.fillStyle = opts.color ?? "#ffffff";

    const x0 = pxSnap(cx - radius, unit);
    const y0 = pxSnap(cy - radius, unit);
    const x1 = cx + radius;
    const y1 = cy + radius;

    const ditherFrom = radius * dither;

    for (let py = y0; py <= y1; py += unit) {

        for (let px = x0; px <= x1; px += unit) {

            const dx = px + unit / 2 - cx;
            const dy = py + unit / 2 - cy;
            const d = Math.hypot(dx, dy);

            if (d > radius)
                continue;

            // Drop every other cell in the outer band for a
            // stippled, softening edge.
            if (d > ditherFrom && ((px / unit + py / unit) & 1))
                continue;

            ctx.fillRect(px, py, unit, unit);

        }

    }

    ctx.restore();
    ctx.globalAlpha = 1;

}

// A rectangular beam rendered as a lattice of pixel blocks -
// the "laser" counterpart to the discs. Drawn in local space:
// the caller translates/rotates so the beam runs along +x from
// the origin, `length` long and `width` tall (centered on y).
//
// opts: color, coreColor, alpha, unit
function drawPixelBeam(length, width, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? width * 0.22));

    ctx.save();

    ctx.globalAlpha = opts.alpha ?? 1;

    const halfRows = Math.max(1, Math.round((width / 2) / unit));

    for (let col = 0; col * unit < length; col++) {

        const x = col * unit;

        for (let row = -halfRows; row < halfRows; row++) {

            const y = row * unit;

            // Brighter core down the middle two rows, dimmer at
            // the fringes - and a stipple on the outermost row
            // so the edge frays into pixels.
            const edge = Math.abs(row) >= halfRows - 1;

            if (edge && ((col + row) & 1))
                continue;

            ctx.fillStyle = Math.abs(row) <= 1
                ? (opts.coreColor ?? "#ffffff")
                : (opts.color ?? "#ffffff");

            ctx.fillRect(x, y, unit, unit);

        }

    }

    ctx.restore();
    ctx.globalAlpha = 1;

}

// A blocky shield "bubble": a pixel ring plus a couple of
// stepped highlight cells, sized to sit just outside a body of
// `size`. Used for every 1-hit ward (grunt, skeleton, cleric
// ward) and the player's own shield/cloak/halo auras.
//
// opts: color, glowColor, alpha, unit
function drawPixelShield(cx, cy, radius, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? radius * 0.16));
    const pulse = opts.pulse ?? 1;

    // Faint inner fill so the bubble reads as a surface.
    drawPixelDisc(cx, cy, radius - unit, {
        color: opts.color,
        alpha: (opts.fillAlpha ?? 0.12) * pulse,
        unit,
        dither: 0.35
    });

    drawPixelRing(cx, cy, radius, {
        color: opts.color,
        alpha: (opts.alpha ?? 0.9) * pulse,
        unit,
        thickness: opts.thickness ?? 1,
        glow: opts.glow ?? 8,
        glowColor: opts.glowColor ?? opts.color
    });

    // Two lit cells at the upper-left for a glint.
    if (opts.glint !== false) {

        ctx.save();
        ctx.globalAlpha = 0.8 * pulse;
        ctx.fillStyle = opts.glintColor ?? "#ffffff";

        const gx = pxSnap(cx - radius * 0.55, unit);
        const gy = pxSnap(cy - radius * 0.62, unit);

        ctx.fillRect(gx, gy, unit, unit);
        ctx.fillRect(gx + unit, gy + unit, unit, unit);

        ctx.restore();
        ctx.globalAlpha = 1;

    }

}
