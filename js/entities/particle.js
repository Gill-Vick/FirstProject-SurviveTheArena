// =====================================
// Particle Class
// =====================================

// Particles are drawn as chunky blocks on their own grid, not as
// smooth circles.
//
// Everything else in this game is pixel art - the floors are laid
// out in 4px texels, imageSmoothingEnabled is off, the fonts are
// pixel fonts, the trees and butterflies are placed block by
// block. Particles were the one system still drawing perfect
// antialiased circles with ctx.arc, which meant every hit, kill,
// dash and explosion in the game was rendered in a different
// visual language from the scene it happened in.
//
// A little finer than FLOOR_TEXEL on purpose: particles are only
// a few pixels across to begin with, and on the floor's 4px grid
// the small ones would collapse to a single block.
const PARTICLE_TEXEL = 3;

function snapParticle(v) {

    return Math.round(v / PARTICLE_TEXEL) * PARTICLE_TEXEL;

}

// Alpha in fixed steps. A perfectly smooth fade is the other
// giveaway that something was drawn with vectors, and stepping it
// costs nothing - at six levels it reads as a deliberate die-off
// rather than as banding.
function quantAlpha(a) {

    return Math.max(0, Math.round(a * 6) / 6);

}

class Particle {

    constructor(x, y, options = {}) {

        this.x = x;
        this.y = y;

        this.size = options.size ?? (Math.random() * 5 + 2);

        this.vx = options.vx ?? (Math.random() - 0.5) * 5.6;
        this.vy = options.vy ?? (Math.random() - 0.5) * 5.6;

        this.color = options.color ?? "white";

        this.life = options.life ?? 29;
        this.maxLife = this.life;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.x += this.vx * Game.timeScale;
        this.y += this.vy * Game.timeScale;

        this.life -= Game.timeScale;

    }

    isDead() {

        return this.life <= 0;

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        const fade = this.life / this.maxLife;

        // Blocks shrink as they burn out, in whole texels, so a
        // particle dies in a few visible steps instead of melting
        // away continuously.
        const px = Math.max(
            PARTICLE_TEXEL,
            Math.round((this.size * 1.5 * fade) / PARTICLE_TEXEL) * PARTICLE_TEXEL
        );

        ctx.globalAlpha = quantAlpha(fade);
        ctx.fillStyle = this.color;

        ctx.fillRect(
            snapParticle(this.x - px / 2),
            snapParticle(this.y - px / 2),
            px,
            px
        );

        ctx.globalAlpha = 1;

    }

    // =====================================
    // Burst Factories
    // =====================================
    //
    // Anything that wants a particle burst
    // (dash, hits, future explosions, etc.)
    // just calls one of these instead of
    // writing a spawn loop by hand.

    static createDashBurst(x, y) {

        for (let i = 0; i < 20; i++) {

            Game.particles.push(new Particle(x, y, {

                size: Math.random() * 6 + 2,

                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,

                color: "cyan",

                life: 43

            }));

        }

    }

    // Death pop: a radial burst in the enemy's own color plus
    // an expanding ring (see DeathRing below), so a kill reads
    // as an event instead of a disappearance. Particle count
    // scales gently with the corpse's size.

    static createDeathBurst(enemy) {

        const cx = enemy.x + enemy.size / 2;
        const cy = enemy.y + enemy.size / 2;

        const count = Math.min(24, 8 + Math.floor(enemy.size / 8));

        for (let i = 0; i < count; i++) {

            // Radial, not box-random - reads as a pop outward
            // from the corpse rather than a shapeless puff.
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const force = 1.4 + Math.random() * 2.8;

            Game.particles.push(new Particle(cx, cy, {

                size: Math.random() * 4 + 2,

                vx: Math.cos(angle) * force,
                vy: Math.sin(angle) * force,

                color: enemy.color,

                life: 22 + Math.random() * 12

            }));

        }

        Game.particles.push(new DeathRing(cx, cy, enemy.size, enemy.color));

    }

    static createHitBurst(x, y) {

        for (let i = 0; i < 10; i++) {

            Game.particles.push(new Particle(x, y, {

                size: Math.random() * 5 + 2,

                vx: (Math.random() - 0.5) * 5.6,
                vy: (Math.random() - 0.5) * 5.6,

                color: "red",

                life: 29

            }));

        }

    }

}

// =====================================
// Death Ring
// =====================================
//
// The "pop" half of a death burst: a stroked circle that
// expands from the corpse's footprint and fades out. Lives in
// Game.particles alongside regular Particles (same
// update/draw/isDead interface).

class DeathRing {

    constructor(x, y, startSize, color) {

        this.x = x;
        this.y = y;

        this.radius = startSize * 0.4;
        this.growth = startSize * 0.09;

        this.color = color;

        this.life = 13;
        this.maxLife = 13;

    }

    update() {

        this.radius += this.growth * Game.timeScale;

        this.life -= Game.timeScale;

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        const fade = this.life / this.maxLife;

        // Stepped around the circumference in blocks rather than
        // stroked as a smooth circle, to match the particles it
        // ships alongside.
        //
        // Enough steps to close the ring at this radius - the
        // spacing is one texel of arc - and the positions are
        // de-duplicated afterwards. Snapping pulls neighbouring
        // steps onto the same block, and a translucent block
        // painted twice comes out denser than its neighbours, so
        // without the dedupe the ring beads up into bright clumps.
        const steps = Math.max(10, Math.round((Math.PI * 2 * this.radius) / PARTICLE_TEXEL));
        const seen = new Set();

        ctx.globalAlpha = quantAlpha(fade * 0.8);
        ctx.fillStyle = this.color;

        for (let i = 0; i < steps; i++) {

            const a = (i / steps) * Math.PI * 2;

            const bx = snapParticle(this.x + Math.cos(a) * this.radius);
            const by = snapParticle(this.y + Math.sin(a) * this.radius);

            const key = bx + "," + by;

            if (seen.has(key))
                continue;

            seen.add(key);

            ctx.fillRect(bx, by, PARTICLE_TEXEL, PARTICLE_TEXEL);

        }

        ctx.globalAlpha = 1;

    }

}

// =====================================
// Dash Afterimage
// =====================================
//
// Fading ghosts of the player's sprite left along the dash
// line, so the instant 120px teleport reads as motion. Ghosts
// nearer the dash's end start more opaque, and every ghost
// fades over DASH.AFTERIMAGE_LIFE frames. Same
// update/draw/isDead interface as Particle; spawned by
// Player.dash() via createTrail().

class DashAfterimage {

    constructor(x, y, size, frameIndex, angle, baseAlpha) {

        this.x = x;
        this.y = y;
        this.size = size;

        this.frameIndex = frameIndex;
        this.angle = angle;

        this.baseAlpha = baseAlpha;

        this.life = DASH.AFTERIMAGE_LIFE;
        this.maxLife = DASH.AFTERIMAGE_LIFE;

    }

    update() {

        this.life -= Game.timeScale;

    }

    isDead() {

        return this.life <= 0;

    }

    draw() {

        if (!(playerSprite.complete && playerSprite.naturalWidth > 0))
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const drawSize = this.size * PLAYER.VISUAL_SCALE;

        ctx.save();

        ctx.globalAlpha = this.baseAlpha * (this.life / this.maxLife);

        ctx.translate(cx, cy);
        ctx.rotate(this.angle + PLAYER.SPRITE_ROTATION_OFFSET);

        ctx.drawImage(

            playerSprite,

            this.frameIndex * PLAYER.SPRITE_FRAME_SIZE,
            0,
            PLAYER.SPRITE_FRAME_SIZE,
            PLAYER.SPRITE_FRAME_SIZE,

            -drawSize / 2,
            -drawSize / 2,
            drawSize,
            drawSize

        );

        ctx.restore();

        ctx.globalAlpha = 1;

    }

    // Ghosts evenly spaced along the dash line, skipping the
    // endpoint itself (the real player is standing there).

    static createTrail(startX, startY, endX, endY, size, frameIndex, angle) {

        const count = DASH.AFTERIMAGE_COUNT;

        for (let i = 0; i < count; i++) {

            const frac = (i + 1) / (count + 1);

            Game.particles.push(new DashAfterimage(

                startX + (endX - startX) * frac,
                startY + (endY - startY) * frac,
                size,
                frameIndex,
                angle,
                0.15 + 0.35 * frac

            ));

        }

    }

}