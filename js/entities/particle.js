// =====================================
// Particle Class
// =====================================

class Particle {

    constructor(x, y, options = {}) {

        this.x = x;
        this.y = y;

        this.size = options.size ?? (Math.random() * 5 + 2);

        this.vx = options.vx ?? (Math.random() - 0.5) * 8;
        this.vy = options.vy ?? (Math.random() - 0.5) * 8;

        this.color = options.color ?? "white";

        this.life = options.life ?? 20;
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

        ctx.fillStyle = this.color;

        ctx.globalAlpha =
            this.life / this.maxLife;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

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

                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,

                color: "cyan",

                life: 30

            }));

        }

    }

    static createHitBurst(x, y) {

        for (let i = 0; i < 10; i++) {

            Game.particles.push(new Particle(x, y, {

                size: Math.random() * 5 + 2,

                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,

                color: "red",

                life: 20

            }));

        }

    }

}