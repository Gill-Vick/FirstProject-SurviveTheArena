// =====================================
// Arena State
// =====================================

const Arena = {

    theme: "coliseum",

    pillars: [],
    torches: [],
    thorns: []

};

function updateArenaForWave() {

    if (Game.wave >= WAVES.SET2_START && Arena.theme !== "thorn") {

        Arena.theme = "thorn";
        generateThornRoom();

    }

}

function generateArena() {

    Arena.theme = "coliseum";
    generateColiseum();

}

function generateColiseum() {
    Arena.pillars = [];
    Arena.torches = [];

    const leftX = canvas.width * 0.06;
    const rightX = canvas.width * 0.94;
    
    // Each pillar previously shared the exact same x, so
    // the tallest one (bottom row) drew last and completely
    // covered the other two - they looked like one fused
    // column. Now each row gets its own x offset (staggering
    // them apart) and a slightly different width (small
    // pillars further back, bigger ones up close), so all
    // three stay visible as a cluster instead of one blob.

    const rows = [

        { y: canvas.height * 0.08, width: 95,  offset: 55 },  // Inverted: shifted INWARD toward center

        { y: canvas.height * 0.50, width: 110, offset: 0 },   // Stays Center

        { y: canvas.height * 1.05, width: 125, offset: -55 }  // Inverted: shifted OUTWARD toward edges

    ];

    rows.forEach(row => {
        Arena.pillars.push({ 
            x: leftX + row.offset, 
            y: row.y, 
            width: row.width
        });
        Arena.pillars.push({ 
            x: rightX - row.offset, 
            y: row.y, 
            width: row.width
        });
    });

    Arena.pillars.forEach(p => {
        const torchCount = Math.random() > 0.5 ? 2 : 1;
        if (torchCount === 1) {
            Arena.torches.push({ x: p.x, y: p.y - 10, parentPillar: p });
        } else {
            Arena.torches.push({ x: p.x - p.width / 2 - 4, y: p.y - 10, parentPillar: p });
            Arena.torches.push({ x: p.x + p.width / 2 + 4, y: p.y - 10, parentPillar: p });
        }
    });
}

function generateThornRoom() {

    Arena.pillars = [];
    Arena.torches = [];
    Arena.thorns = [];

    const margin = canvas.width * 0.04;

    for (let i = 0; i < 14; i++) {

        const side = i % 4;
        let x, y;

        if (side === 0) {
            x = margin + Math.random() * (canvas.width - margin * 2);
            y = margin;
        } else if (side === 1) {
            x = canvas.width - margin;
            y = margin + Math.random() * (canvas.height - margin * 2);
        } else if (side === 2) {
            x = margin + Math.random() * (canvas.width - margin * 2);
            y = canvas.height - margin;
        } else {
            x = margin;
            y = margin + Math.random() * (canvas.height - margin * 2);
        }

        Arena.thorns.push({
            x, y,
            size: 20 + Math.random() * 30,
            rot: Math.random() * Math.PI
        });

    }

    const leftX = canvas.width * 0.08;
    const rightX = canvas.width * 0.92;

    [leftX, rightX].forEach(x => {

        Arena.pillars.push({
            x,
            y: canvas.height * 0.55,
            width: 80
        });

    });

}

function drawArenaFloor() {

    if (Arena.theme === "thorn") {

        ctx.fillStyle = "#1a1218";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        Arena.thorns.forEach(t => {

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rot);
            ctx.strokeStyle = "#1a3015";
            ctx.lineWidth = 2;

            for (let i = -2; i <= 2; i++) {

                ctx.beginPath();
                ctx.moveTo(i * 6, 0);
                ctx.lineTo(i * 3, -t.size);
                ctx.stroke();

            }

            ctx.restore();

        });

        return;

    }

    ctx.fillStyle = "#2b2927";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

}

// =====================================
// Light Source
// =====================================
//
// Single source of truth for where the light
// comes from. Both the directional wash and
// the pillar shadow casting read from this,
// so they can never drift out of sync.

function getLightSource() {

    return {
        x: canvas.width * 1.15,
        y: canvas.height * 0.5
    };

}

// =====================================
// Directional Lighting
// =====================================
//
// Different approach from the window-beam
// version: instead of a dark room with light
// shafts cut into it, this is one broad light
// source off-screen to the right, washing the
// whole scene warm and bright, fading into a
// gentler shadow on the left. No heavy base
// darkness layer - the scene stays bright
// overall, matching the reference.

function drawLightingSystem() {

    ctx.save();

    if (Arena.theme === "thorn") {

        let vignette = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.width * 0.15,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.75
        );
        vignette.addColorStop(0, "rgba(60, 20, 40, 0.15)");
        vignette.addColorStop(1, "rgba(10, 5, 15, 0.55)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(120, 30, 60, 0.12)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.restore();
        return;

    }

    // ---- coliseum lighting ----
    // dims, and only partially. Fully clear by ~55%
    // across so most of the arena stays bright. ----

    let shadow = ctx.createLinearGradient(0, 0, canvas.width, 0);
    shadow.addColorStop(0, "rgba(15, 13, 12, 0.5)");
    shadow.addColorStop(0.55, "rgba(15, 13, 12, 0.15)");
    shadow.addColorStop(1, "rgba(15, 13, 12, 0)");

    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ---- 2. Warm sunlight flooding in from off-screen
    // to the right - the actual light source ----

    const light = getLightSource();
    const sourceRadius = canvas.width * 1.1;

    let sunGlow = ctx.createRadialGradient(
        light.x, light.y, 0,
        light.x, light.y, sourceRadius
    );

    sunGlow.addColorStop(0, "rgba(255, 225, 170, 0.55)");
    sunGlow.addColorStop(0.4, "rgba(255, 210, 150, 0.28)");
    sunGlow.addColorStop(1, "rgba(255, 200, 140, 0)");

    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ---- 3. Hot edge right where the light enters,
    // like sun blowing out right at the source ----

    let edge = ctx.createLinearGradient(canvas.width * 0.8, 0, canvas.width, 0);
    edge.addColorStop(0, "rgba(255, 240, 210, 0)");
    edge.addColorStop(1, "rgba(255, 248, 225, 0.4)");

    ctx.fillStyle = edge;
    ctx.fillRect(canvas.width * 0.8, 0, canvas.width * 0.2, canvas.height);

    // ---- 4. Torches: small warm accents on top,
    // mostly noticeable on the shadowed left side ----

    const pulse = Math.sin(Date.now() / 90) * 3;

    Arena.torches.forEach(t => {

        let warmGlow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 110 + pulse);
        warmGlow.addColorStop(0, "rgba(255, 170, 60, 0.35)");
        warmGlow.addColorStop(1, "rgba(255, 170, 60, 0)");

        ctx.fillStyle = warmGlow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 110 + pulse, 0, Math.PI * 2);
        ctx.fill();

    });

    ctx.restore();

}

// =====================================
// PILLAR CAST SHADOWS
// =====================================
//
// Replaces the old fixed ellipse. Each pillar
// now casts a real shadow shape pointing away
// from getLightSource() - since the light sits
// off-screen to the right, shadows stretch out
// to the left, exactly like a light source
// actually being there.

function drawPillarShadows() {

    if (Arena.theme === "thorn")
        return;

    const light = getLightSource();

    ctx.save();

    ctx.filter = "blur(6px)";

    Arena.pillars.forEach(p => {

        // Cast from the pillar's base (where it meets
        // the floor), not its center.

        const baseX = p.x;
        const baseY = p.y + 40;

        const dx = baseX - light.x;
        const dy = baseY - light.y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0)
            return;

        // Direction pointing AWAY from the light -
        // this is the direction the shadow falls.

        const dirX = dx / dist;
        const dirY = dy / dist;

        // Perpendicular to that, for the shadow's width.

        const perpX = -dirY;
        const perpY = dirX;

        const halfWidth = p.width * 0.55;
        const tipHalfWidth = halfWidth * 0.5;

        const shadowLength = p.width * 3.2;

        const baseLeftX = baseX - perpX * halfWidth;
        const baseLeftY = baseY - perpY * halfWidth;

        const baseRightX = baseX + perpX * halfWidth;
        const baseRightY = baseY + perpY * halfWidth;

        const tipX = baseX + dirX * shadowLength;
        const tipY = baseY + dirY * shadowLength;

        const tipLeftX = tipX - perpX * tipHalfWidth;
        const tipLeftY = tipY - perpY * tipHalfWidth;

        const tipRightX = tipX + perpX * tipHalfWidth;
        const tipRightY = tipY + perpY * tipHalfWidth;

        // Dark at the pillar's base, fading out toward
        // the tip - a shadow gets softer the further it
        // stretches from what's casting it.

        const gradient = ctx.createLinearGradient(
            baseX, baseY,
            tipX, tipY
        );

        gradient.addColorStop(0, "rgba(0, 0, 0, 0.45)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(baseLeftX, baseLeftY);
        ctx.lineTo(baseRightX, baseRightY);
        ctx.lineTo(tipRightX, tipRightY);
        ctx.lineTo(tipLeftX, tipLeftY);
        ctx.closePath();
        ctx.fill();

    });

    ctx.restore();

}

// =====================================
// FOREGROUND PILLARS
// =====================================

function drawPillars() {

    if (Arena.theme === "thorn") {

        Arena.pillars.forEach(p => {

            ctx.save();

            let grad = ctx.createLinearGradient(p.x - p.width / 2, 0, p.x + p.width / 2, 0);
            grad.addColorStop(0, "#3d2b35");
            grad.addColorStop(0.5, "#5c3d4a");
            grad.addColorStop(1, "#2a1a22");

            ctx.fillStyle = grad;
            ctx.fillRect(p.x - p.width / 2, 0, p.width, p.y + 40);

            ctx.strokeStyle = "#4a6741";
            ctx.lineWidth = 2;

            for (let i = 0; i < 5; i++) {

                ctx.beginPath();
                ctx.moveTo(p.x - p.width / 2 + i * 16, 0);
                ctx.lineTo(p.x - p.width / 2 + i * 16 + 8, p.y);
                ctx.stroke();

            }

            ctx.restore();

        });

        return;

    }

    Arena.pillars.forEach(p => {
        ctx.save();

        let pillarGrad = ctx.createLinearGradient(p.x - p.width / 2, 0, p.x + p.width / 2, 0);
        pillarGrad.addColorStop(0, "#9cb0b3");
        pillarGrad.addColorStop(0.25, "#6b6b6b");
        pillarGrad.addColorStop(0.7, "#2c3e50");
        pillarGrad.addColorStop(1, "#11181f");

        ctx.fillStyle = pillarGrad;
        ctx.fillRect(p.x - p.width / 2, 0, p.width, p.y + 40);

        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(p.x - p.width * 0.65, p.y + 40, p.width * 1.3, 14);
        ctx.fillStyle = "#141d26";
        ctx.fillRect(p.x - p.width * 0.75, p.y + 54, p.width * 1.5, 12);

        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - p.width / 4, 0); ctx.lineTo(p.x - p.width / 4, p.y + 40);
        ctx.moveTo(p.x + p.width / 4, 0); ctx.lineTo(p.x + p.width / 4, p.y + 40);
        ctx.stroke();

        ctx.restore();
    });
}

// =====================================
// TORCHES
// =====================================

function drawTorches() {

    if (Arena.theme === "thorn")
        return;

    const flicker = Math.sin(Date.now() / 80) * 2;

    Arena.torches.forEach(t => {

        ctx.save();

        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(t.x - 3, t.y - 5, 6, 20);

        ctx.shadowBlur = 20;
        ctx.shadowColor = "orange";

        ctx.fillStyle = "#ffae42";

        ctx.beginPath();
        ctx.ellipse(t.x, t.y - 10 + flicker, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    });

}