// =====================================
// Grid
// =====================================

function drawGrid() {

    ctx.strokeStyle = CANVAS.GRID_COLOR;
    ctx.lineWidth = 1;

    const offset =
        (Date.now() * 0.02) %
        CANVAS.GRID_SIZE;

    // Vertical

    for (
        let x = -CANVAS.GRID_SIZE;
        x < canvas.width + CANVAS.GRID_SIZE;
        x += CANVAS.GRID_SIZE
    ) {

        ctx.beginPath();

        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);

        ctx.stroke();

    }

    // Horizontal

    for (
        let y = -CANVAS.GRID_SIZE;
        y < canvas.height + CANVAS.GRID_SIZE;
        y += CANVAS.GRID_SIZE
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);

        ctx.stroke();

    }

}

// =====================================
// Particles
// =====================================

function updateParticles() {

    Game.particles.forEach((particle, index) => {

        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.life--;

        if (particle.life <= 0) {

            Game.particles.splice(index, 1);

        }

    });

}

function drawParticles() {

    Game.particles.forEach((particle) => {

        ctx.fillStyle = particle.color;

        ctx.globalAlpha =
            particle.life / particle.maxLife;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.globalAlpha = 1;

    });

}

// =====================================
// Dash Particles
// =====================================

function createDashParticles() {

    for (let i = 0; i < 20; i++) {

        Game.particles.push({

            x: player.x + player.size / 2,
            y: player.y + player.size / 2,

            size: Math.random() * 6 + 2,

            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,

            color: "cyan",

            life: 30,
            maxLife: 30

        });

    }

}

// =====================================
// Hit Particles
// =====================================

function createHitParticles(x, y) {

    for (let i = 0; i < 10; i++) {

        Game.particles.push({

            x,
            y,

            size: Math.random() * 5 + 2,

            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,

            color: "red",

            life: 20,
            maxLife: 20

        });

    }

}