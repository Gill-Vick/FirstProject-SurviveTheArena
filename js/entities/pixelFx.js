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

// =====================================
// Shape cache
// =====================================
//
// PERFORMANCE: the discs, rings and beams below are lattices
// of hundreds-to-thousands of little fillRects. Rebuilding
// them cell-by-cell every frame - for every boss ward, aura
// and laser at once - is what tanked the frame rate in the
// King/Magus fights, and got worse the more enemies were on
// screen.
//
// Since a given shape only depends on its size + colours (NOT
// its screen position, rotation, or its pulsing alpha), we
// rasterise each unique shape ONCE into an offscreen canvas
// and then just blit that bitmap each frame with the requested
// alpha (and, for rotated shapes, a transform). Any glow is
// baked into the bitmap too, so the expensive shadow-blur pass
// also runs only once per shape instead of once per cell. Per
// frame a shape becomes a single drawImage instead of anywhere
// from dozens to thousands of fillRects.
//
// The cache is keyed by the size/colour/etc signature, and
// every helper below explicitly zeroes ctx.shadowBlur right
// before its drawImage call - a caller that left shadowBlur
// set (e.g. to glow some OTHER shape drawn just before) must
// never leak into a blit, or every cached sprite silently pays
// a full-bitmap blur again despite the point of caching being
// to pay that cost exactly once, at bake time.

const _pixelShapeCache = new Map();
const _PIXEL_CACHE_MAX = 160;

function _getPixelShape(key, w, h, render) {

    let bmp = _pixelShapeCache.get(key);

    if (bmp)
        return bmp;

    bmp = document.createElement("canvas");
    bmp.width = Math.max(1, Math.ceil(w));
    bmp.height = Math.max(1, Math.ceil(h));

    render(bmp.getContext("2d"));

    // Simple FIFO eviction so the cache can't grow without
    // bound (e.g. across canvas resizes changing beam length,
    // or many distinct dash-phase buckets accumulating).
    if (_pixelShapeCache.size >= _PIXEL_CACHE_MAX)
        _pixelShapeCache.delete(_pixelShapeCache.keys().next().value);

    _pixelShapeCache.set(key, bmp);

    return bmp;

}

// A ring of square "pixels" around (cx, cy). `thickness` is
// how many pixel-widths deep the band runs inward.
//
// opts: color, alpha, unit, thickness, glow, glowColor
function drawPixelRing(cx, cy, radius, opts = {}) {

    if (radius <= 0)
        return;

    const unit = Math.max(2, Math.round(opts.unit ?? Math.max(2, radius * 0.025)));
    const thickness = Math.max(1, opts.thickness ?? 1);
    const color = opts.color ?? "#ffffff";
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;
    const r = Math.round(radius);

    const pad = unit + glow;
    const size = r * 2 + pad * 2;

    const key = `r|${r}|${unit}|${thickness}|${color}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, size, size, (c) => {

        const b = pad + r;

        c.fillStyle = color;

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        const drawn = new Set();

        for (let layer = 0; layer < thickness; layer++) {

            const rr = r - layer * unit;

            if (rr <= 0)
                break;

            const steps = Math.max(24, Math.ceil((rr * 2 * Math.PI) / unit));

            for (let i = 0; i < steps; i++) {

                const a = (i / steps) * Math.PI * 2;
                const px = pxSnap(b + Math.cos(a) * rr, unit);
                const py = pxSnap(b + Math.sin(a) * rr, unit);
                const k = px + "," + py;

                if (drawn.has(k))
                    continue;

                drawn.add(k);
                c.fillRect(px, py, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(bmp, pxSnap(cx - r - pad, unit), pxSnap(cy - r - pad, unit));
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

    const unit = Math.max(2, Math.round(opts.unit ?? radius * 0.04));
    const dither = opts.dither ?? 0.55;
    const color = opts.color ?? "#ffffff";
    const r = Math.round(radius);

    const pad = unit;
    const size = r * 2 + pad * 2;

    const key = `d|${r}|${unit}|${color}|${dither}`;

    const bmp = _getPixelShape(key, size, size, (c) => {

        const b = pad + r;
        const ditherFrom = r * dither;

        c.fillStyle = color;

        for (let py = 0; py <= size - unit; py += unit) {

            for (let px = 0; px <= size - unit; px += unit) {

                const dx = px + unit / 2 - b;
                const dy = py + unit / 2 - b;
                const d = Math.hypot(dx, dy);

                if (d > r)
                    continue;

                if (d > ditherFrom && ((px / unit + py / unit) & 1))
                    continue;

                c.fillRect(px, py, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 0.2;
    ctx.drawImage(bmp, pxSnap(cx - r - pad, unit), pxSnap(cy - r - pad, unit));
    ctx.restore();
    ctx.globalAlpha = 1;

}

// A filled pixel SQUARE, axis-aligned, cached the same way as
// drawPixelDisc - the square counterpart used wherever a zone
// reads better as a block than a circle (e.g. the Thief's
// Moonlight Dagger burn patch). `halfSize` is half the square's
// side length. Edge cells dither the same way the disc's do.
//
// opts: color, alpha, unit, dither, glow, glowColor
function drawPixelSquare(cx, cy, halfSize, opts = {}) {

    if (halfSize <= 0)
        return;

    const unit = Math.max(2, Math.round(opts.unit ?? halfSize * 0.08));
    const dither = opts.dither ?? 0.6;
    const color = opts.color ?? "#ffffff";
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;
    const hs = Math.round(halfSize);

    const pad = unit + glow;
    const size = hs * 2 + pad * 2;

    const key = `sq|${hs}|${unit}|${color}|${dither}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, size, size, (c) => {

        const b = pad + hs;
        const ditherFrom = hs * dither;

        c.fillStyle = color;

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        for (let py = 0; py <= size - unit; py += unit) {

            for (let px = 0; px <= size - unit; px += unit) {

                const dx = Math.abs(px + unit / 2 - b);
                const dy = Math.abs(py + unit / 2 - b);
                const d = Math.max(dx, dy);

                if (d > hs)
                    continue;

                if (d > ditherFrom && ((px / unit + py / unit) & 1))
                    continue;

                c.fillRect(px, py, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 0.2;
    ctx.drawImage(bmp, pxSnap(cx - hs - pad, unit), pxSnap(cy - hs - pad, unit));
    ctx.restore();
    ctx.globalAlpha = 1;

}

// A rectangular beam rendered as a lattice of pixel blocks -
// the "laser" counterpart to the discs. Drawn in local space:
// the caller translates/rotates so the beam runs along +x from
// the origin, `length` long and `width` tall (centered on y).
//
// opts: color, coreColor, alpha, unit, glow, glowColor
function drawPixelBeam(length, width, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? width * 0.22));
    const color = opts.color ?? "#ffffff";
    const coreColor = opts.coreColor ?? "#ffffff";
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;

    const halfRows = Math.max(1, Math.round((width / 2) / unit));
    const len = Math.round(length / unit) * unit;
    const pad = glow;
    const h = halfRows * 2 * unit + pad * 2;

    const key = `b|${len}|${halfRows}|${unit}|${color}|${coreColor}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, len + pad * 2, h, (c) => {

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        const cols = Math.ceil(len / unit);

        for (let col = 0; col < cols; col++) {

            for (let row = -halfRows; row < halfRows; row++) {

                // Brighter core down the middle two rows,
                // dimmer at the fringes - and a stipple on the
                // outermost row so the edge frays into pixels.
                const edge = Math.abs(row) >= halfRows - 1;

                if (edge && ((col + row) & 1))
                    continue;

                c.fillStyle = Math.abs(row) <= 1 ? coreColor : color;
                c.fillRect(pad + col * unit, pad + (row + halfRows) * unit, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(bmp, -pad, -h / 2);
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

    const unit = Math.max(2, Math.round(opts.unit ?? radius * 0.08));
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

// A ground zone: a filled pixel disc plus a solid pixel rim,
// the shape every circular hazard and telegraph shares (fire
// blasts, frost patches, keg craters, warning circles). One
// call so they all read on the same grid.
//
// opts: fill, rim, fillAlpha, rimAlpha, unit, dither, glow
function drawPixelZone(cx, cy, radius, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? radius * 0.055));

    drawPixelDisc(cx, cy, radius, {
        color: opts.fill ?? "#ffffff",
        alpha: opts.fillAlpha ?? 0.3,
        unit,
        dither: opts.dither ?? 0.6
    });

    if (opts.rim !== null) {

        drawPixelRing(cx, cy, radius, {
            color: opts.rim ?? opts.fill ?? "#ffffff",
            alpha: opts.rimAlpha ?? 0.85,
            unit,
            thickness: opts.rimThickness ?? 1,
            glow: opts.glow ?? 0,
            glowColor: opts.glowColor ?? opts.rim ?? opts.fill
        });

    }

}

// A filled pixel sector (pie slice), baked pointing along +x
// (angle 0) and rotated onto (cx, cy, angle) via a canvas
// transform at blit time - so the bitmap is reused regardless
// of which way it's currently facing, which matters a lot for
// something like the elite skeleton's dagger arc that re-aims
// at the player constantly. Used for melee arc telegraphs.
//
// opts: color, alpha, unit, glow, glowColor
function drawPixelSector(cx, cy, radius, angle, halfSpread, opts = {}) {

    if (radius <= 0)
        return;

    const unit = Math.max(2, Math.round(opts.unit ?? radius * 0.08));
    const color = opts.color ?? "#ffffff";
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;
    const r = Math.round(radius);
    const spread = Math.round(halfSpread * 1000) / 1000;

    const pad = unit + glow;
    const size = r * 2 + pad * 2;

    const key = `s|${r}|${unit}|${spread}|${color}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, size, size, (c) => {

        const b = pad + r;

        c.fillStyle = color;

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        for (let py = 0; py <= size - unit; py += unit) {

            for (let px = 0; px <= size - unit; px += unit) {

                const dx = px + unit / 2 - b;
                const dy = py + unit / 2 - b;

                if (Math.hypot(dx, dy) > r)
                    continue;

                // Sector is baked centred on angle 0 (+x); the
                // caller's actual facing is applied as a canvas
                // rotation at blit time instead.
                let diff = Math.atan2(dy, dx);
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                if (Math.abs(diff) > spread)
                    continue;

                c.fillRect(px, py, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 0.4;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(bmp, -pad - r, -pad - r);
    ctx.restore();
    ctx.globalAlpha = 1;

}

// A filled rectangle rendered as a pixel lattice, in LOCAL
// space (caller has already translated/rotated). Spans x in
// [0, length] and y in [-width/2, width/2] - matching the rect
// telegraphs the lancer and King's wall lasers draw. Outer edge
// rows are stippled so the block frays into pixels.
//
// opts: color, alpha, unit, glow, glowColor
function drawPixelRectZone(length, width, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? width * 0.12));
    const color = opts.color ?? "#ffffff";
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;

    const cols = Math.ceil(length / unit);
    const halfRows = Math.max(1, Math.round((width / 2) / unit));
    const len = cols * unit;
    const pad = glow;
    const h = halfRows * 2 * unit + pad * 2;

    const key = `rz|${len}|${halfRows}|${unit}|${color}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, len + pad * 2, h, (c) => {

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        c.fillStyle = color;

        for (let col = 0; col < cols; col++) {

            for (let row = -halfRows; row < halfRows; row++) {

                const edge = Math.abs(row) >= halfRows - 1 || col >= cols - 1;

                // Stipple the fringe so the block edge reads pixel.
                if (edge && ((col + row) & 1))
                    continue;

                c.fillRect(pad + col * unit, pad + (row + halfRows) * unit, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 0.4;
    ctx.drawImage(bmp, -pad, -h / 2);
    ctx.restore();
    ctx.globalAlpha = 1;

}

// A single dashed/solid row of pixel blocks along local +x,
// from 0 to `length` - the marching-ants centreline used by
// telegraphs (King's wall-laser preview) and charge lanes
// (Castle Guard's dash indicator). `phase` is an integer
// "which frame of the march" bucket the CALLER computes (e.g.
// `Math.floor(Date.now() / 60) % dashPeriod`) - baking a small,
// bounded number of phase bitmaps is what makes a "constantly
// marching" pattern cacheable at all.
//
// opts: color, alpha, unit, dashOn, dashOff (0 = solid line),
// phase, glow, glowColor
function drawPixelDashedLine(length, opts = {}) {

    const unit = Math.max(2, Math.round(opts.unit ?? 6));
    const color = opts.color ?? "#ffffff";
    const dashOn = Math.max(1, opts.dashOn ?? 3);
    const dashOff = Math.max(0, opts.dashOff ?? 0);
    const period = dashOn + dashOff;
    const phase = ((opts.phase ?? 0) % period + period) % period;
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;

    const len = Math.max(unit, Math.round(length / unit) * unit);
    const pad = glow;

    const key = `dl|${len}|${unit}|${dashOn}|${dashOff}|${phase}|${color}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, len + pad * 2, unit + pad * 2, (c) => {

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        c.fillStyle = color;

        const cols = Math.ceil(len / unit);

        for (let col = 0; col < cols; col++) {

            if (period > 1 && (col + phase) % period >= dashOn)
                continue;

            c.fillRect(pad + col * unit, pad, unit, unit);

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(bmp, -pad, -unit / 2 - pad);
    ctx.restore();
    ctx.globalAlpha = 1;

}

// A marching dashed RING - the circular counterpart to
// drawPixelDashedLine, and the shape that was previously the
// single biggest frame-rate cost in the game: every boss's
// projectile ward and every elite tank's protect aura redrew a
// few hundred individually-shadowed fillRects for this every
// single frame, for the entire fight. Same phase-bucket
// caching trick - `phase` is an integer bucket the caller
// advances slowly (e.g. every ~60ms), not every frame, so the
// whole 5-or-6-entry cycle of bitmaps gets baked once and then
// just cycled through.
//
// opts: color, alpha, unit, thickness, dashOn, dashOff, phase,
// glow, glowColor
function drawPixelDashedRing(cx, cy, radius, opts = {}) {

    if (radius <= 0)
        return;

    const unit = Math.max(2, Math.round(opts.unit ?? Math.max(2, radius * 0.025)));
    const thickness = Math.max(1, opts.thickness ?? 1);
    const color = opts.color ?? "#ffffff";
    const dashOn = Math.max(1, opts.dashOn ?? 3);
    const dashOff = Math.max(0, opts.dashOff ?? 2);
    const period = dashOn + dashOff;
    const phase = ((opts.phase ?? 0) % period + period) % period;
    const glow = opts.glow ?? 0;
    const glowColor = opts.glowColor ?? color;
    const r = Math.round(radius);

    const pad = unit + glow;
    const size = r * 2 + pad * 2;

    const key = `dr|${r}|${unit}|${thickness}|${dashOn}|${dashOff}|${phase}|${color}|${glow}|${glowColor}`;

    const bmp = _getPixelShape(key, size, size, (c) => {

        const b = pad + r;

        c.fillStyle = color;

        if (glow) {
            c.shadowBlur = glow;
            c.shadowColor = glowColor;
        }

        const drawn = new Set();

        for (let layer = 0; layer < thickness; layer++) {

            const rr = r - layer * unit;

            if (rr <= 0)
                break;

            const steps = Math.max(24, Math.ceil((rr * 2 * Math.PI) / unit));

            for (let i = 0; i < steps; i++) {

                if (period > 1 && (i + phase) % period >= dashOn)
                    continue;

                const a = (i / steps) * Math.PI * 2;
                const px = pxSnap(b + Math.cos(a) * rr, unit);
                const py = pxSnap(b + Math.sin(a) * rr, unit);
                const k = px + "," + py;

                if (drawn.has(k))
                    continue;

                drawn.add(k);
                c.fillRect(px, py, unit, unit);

            }

        }

    });

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.drawImage(bmp, pxSnap(cx - r - pad, unit), pxSnap(cy - r - pad, unit));
    ctx.restore();
    ctx.globalAlpha = 1;

}
