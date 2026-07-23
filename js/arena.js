// =====================================
// Arena State
// =====================================

const Arena = {

    theme: "castle",

    pillars: [],
    torches: [],

    // Static decoration for the castle-entrance arena (grass
    // tufts, path cobbles). Generated once per arena so the
    // layout doesn't reshuffle every frame.
    deco: { tufts: [], stones: [] }

};

function updateArenaForWave() {

    // Castle entrance for waves 1-5, night throne room (the
    // Knight's arena) for 6-10, throne approach for 11+.
    // Comparing against the CURRENT theme (rather than
    // one-way checks) means custom-mode wave jumps regenerate
    // correctly in both directions.
    const desired =
        Game.wave >= WAVES.SET3_START ? "throne" :
        Game.wave >= WAVES.SET2_START ? "night" :
        "castle";

    if (Arena.theme === desired)
        return;

    Arena.theme = desired;

    if (desired === "throne")
        generateThroneRoom();
    else if (desired === "night")
        generateNightThrone();
    else
        generateCastleEntrance();

}

function generateArena() {

    Arena.theme = "castle";
    generateCastleEntrance();

}

// =====================================
// Castle Entrance (waves 1-5)
// =====================================
//
// The arena straddles the castle threshold: the bottom half
// is the courtyard outside (grass, cobblestone approach),
// the top half is the first hall inside the keep (flagstone
// floor), split by the castle wall with its gate standing
// open. All the layout numbers live in getCastleLayout() so
// the floor, wall, lighting, and decoration can never drift
// apart.

function getCastleLayout() {

    const pathW = canvas.width * 0.2;

    return {
        wallY: canvas.height * 0.5,   // inside/outside boundary
        wallH: 42,                    // wall band thickness
        cx: canvas.width / 2,
        pathW,                        // cobblestone approach
        gateW: pathW + 36             // gate opening in the wall
    };

}

function generateCastleEntrance() {

    // Open ground - no pillars sprouting out of the lawn.
    // The castle wall and gate are the arena's architecture.
    Arena.pillars = [];
    Arena.torches = [];

    const { wallY, cx, pathW } = getCastleLayout();

    Arena.deco = { tufts: [], stones: [] };

    // Grass tufts scattered around the courtyard, kept clear
    // of the cobblestone path.
    for (let i = 0; i < 70; i++) {

        const x = Math.random() * canvas.width;
        const y = wallY + 30 + Math.random() * (canvas.height - wallY - 40);

        if (Math.abs(x - cx) < pathW / 2 + 16)
            continue;

        Arena.deco.tufts.push({
            x, y,
            size: 4 + Math.random() * 5,
            lean: (Math.random() - 0.5) * 4
        });

    }

    // Staggered cobbles down the approach path. Overhanging
    // stones are clipped to the path at draw time.
    const cols = 5;
    const stoneW = pathW / cols;
    let row = 0;

    for (let y = wallY + 28; y < canvas.height + 24; y += 24, row++) {

        const offset = (row % 2) * (stoneW / 2) - stoneW / 2;

        for (let c = 0; c <= cols; c++) {

            Arena.deco.stones.push({
                x: cx - pathW / 2 + c * stoneW + offset,
                y,
                w: stoneW - 3,
                h: 20,
                shade: 0.82 + Math.random() * 0.36
            });

        }

    }

}

// The throne approach (wave 11+) keeps the coliseum's exact
// pillar arrangement - only the floor (red carpet) and the
// pillar rendering itself (marble + gold) change.

function generateThroneRoom() {

    generateColiseumPillars();

}

function generateColiseumPillars() {
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

// The night throne room (waves 6-10, the Knight's arena) is
// the throne approach after dark: identical pillar layout and
// red carpet, but the only light comes from a single torch
// mounted at the base of each pillar. The random rooftop
// torches from generateColiseumPillars() are replaced with
// exactly one base torch per pillar; bottom-row pillars sit
// partly off-screen, so their torch is clamped up onto the
// visible part of the shaft.

function generateNightThrone() {

    generateColiseumPillars();

    Arena.torches = [];

    Arena.pillars.forEach(p => {

        const baseY = Math.min(p.y + 28, canvas.height - 36);

        Arena.torches.push({ x: p.x, y: baseY, parentPillar: p });

    });

}

function drawArenaFloor() {

    if (Arena.theme === "castle") {

        drawCastleEntranceFloor();
        return;

    }

    // The night throne room shares the throne floor - same
    // stone, same red carpet - and gets its darkness from the
    // lighting pass, not from a different floor color.
    ctx.fillStyle = "#2b2927";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (Arena.theme === "throne" || Arena.theme === "night")
        drawRedCarpet();

}

// =====================================
// Castle Entrance Floor
// =====================================
//
// Painted bottom-up: keep interior (flagstones), courtyard
// grass, the cobblestone approach, the entrance steps, and
// finally the castle wall with its gate standing open. All
// of it sits on the floor pass, so shadows, lighting, and
// every entity draw on top.

function drawCastleEntranceFloor() {

    const { wallY, cx, pathW } = getCastleLayout();

    // ---- inside the keep (top half): cool flagstones ----

    let interior = ctx.createLinearGradient(0, 0, 0, wallY);
    interior.addColorStop(0, "#25282e");
    interior.addColorStop(1, "#33363c");

    ctx.fillStyle = interior;
    ctx.fillRect(0, 0, canvas.width, wallY);

    // Flagstone seams - horizontal courses with vertical
    // joints offset half a stone per row.
    ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
    ctx.lineWidth = 2;

    const courseH = 80;
    const stoneSpan = 110;

    for (let y = courseH, r = 0; y < wallY + courseH; y += courseH, r++) {

        ctx.beginPath();
        ctx.moveTo(0, Math.min(y, wallY));
        ctx.lineTo(canvas.width, Math.min(y, wallY));
        ctx.stroke();

        const offset = (r % 2) * (stoneSpan / 2);

        for (let x = offset; x < canvas.width; x += stoneSpan) {

            ctx.beginPath();
            ctx.moveTo(x, y - courseH);
            ctx.lineTo(x, Math.min(y, wallY));
            ctx.stroke();

        }

    }

    // ---- courtyard (bottom half): grass ----

    let grass = ctx.createLinearGradient(0, wallY, 0, canvas.height);
    grass.addColorStop(0, "#38472a");
    grass.addColorStop(1, "#2a3820");

    ctx.fillStyle = grass;
    ctx.fillRect(0, wallY, canvas.width, canvas.height - wallY);

    ctx.strokeStyle = "#2c4520";
    ctx.lineWidth = 2;

    Arena.deco.tufts.forEach(t => {

        for (let i = -1; i <= 1; i++) {

            ctx.beginPath();
            ctx.moveTo(t.x + i * 3, t.y);
            ctx.lineTo(t.x + i * 2 + t.lean, t.y - t.size);
            ctx.stroke();

        }

    });

    // ---- cobblestone approach up the middle ----

    ctx.save();

    ctx.beginPath();
    ctx.rect(cx - pathW / 2, wallY, pathW, canvas.height - wallY);
    ctx.clip();

    ctx.fillStyle = "#403b33";
    ctx.fillRect(cx - pathW / 2, wallY, pathW, canvas.height - wallY);

    Arena.deco.stones.forEach(s => {

        ctx.fillStyle = `rgb(${Math.round(88 * s.shade)}, ${Math.round(82 * s.shade)}, ${Math.round(72 * s.shade)})`;

        ctx.beginPath();
        ctx.roundRect(s.x, s.y, s.w, s.h, 6);
        ctx.fill();

    });

    ctx.restore();

    // Worn edges where path meets grass.
    ctx.fillStyle = "rgba(20, 26, 14, 0.4)";
    ctx.fillRect(cx - pathW / 2 - 3, wallY, 3, canvas.height - wallY);
    ctx.fillRect(cx + pathW / 2, wallY, 3, canvas.height - wallY);

    drawCastleWall();

}

// The wall itself: two stone segments with battlements on
// the courtyard face, round towers flanking the gate, the
// entrance steps, and both wooden gate doors swung open
// into the courtyard.

function drawCastleWall() {

    const { wallY, wallH, cx, gateW } = getCastleLayout();

    const top = wallY - wallH;
    const gateL = cx - gateW / 2;
    const gateR = cx + gateW / 2;

    // ---- entrance steps, just outside the gate ----

    ctx.fillStyle = "#57524a";
    ctx.fillRect(gateL - 14, wallY, gateW + 28, 12);

    ctx.fillStyle = "#454138";
    ctx.fillRect(gateL - 26, wallY + 12, gateW + 52, 12);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gateL - 14, wallY, gateW + 28, 12);
    ctx.strokeRect(gateL - 26, wallY + 12, gateW + 52, 12);

    // ---- wooden gate doors, swung open outward ----

    const doorLen = gateW / 2 - 8;

    [[gateL, 0.55], [gateR, -0.55]].forEach(([hingeX, angle]) => {

        ctx.save();

        ctx.translate(hingeX, wallY);
        ctx.rotate(angle);

        const x0 = angle > 0 ? 0 : -doorLen;

        let wood = ctx.createLinearGradient(0, -6, 0, 6);
        wood.addColorStop(0, "#6b4a2a");
        wood.addColorStop(0.5, "#54381f");
        wood.addColorStop(1, "#3a2715");

        ctx.fillStyle = wood;
        ctx.fillRect(x0, -6, doorLen, 12);

        // Plank seams + iron band.
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";

        for (let i = 1; i < 4; i++) {

            ctx.beginPath();
            ctx.moveTo(x0 + (doorLen * i) / 4, -6);
            ctx.lineTo(x0 + (doorLen * i) / 4, 6);
            ctx.stroke();

        }

        ctx.fillStyle = "#23252a";
        ctx.fillRect(x0, -2, doorLen, 4);

        ctx.restore();

    });

    // ---- wall segments either side of the gate ----

    [[0, gateL], [gateR, canvas.width]].forEach(([x0, x1]) => {

        const w = x1 - x0;

        let stone = ctx.createLinearGradient(0, top, 0, wallY + 10);
        stone.addColorStop(0, "#4c515a");
        stone.addColorStop(0.55, "#3a3f47");
        stone.addColorStop(1, "#22252b");

        ctx.fillStyle = stone;
        ctx.fillRect(x0, top, w, wallH);

        // Inside face catches a sliver of light.
        ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
        ctx.fillRect(x0, top, w, 3);

        // Block seams.
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x0, top + wallH / 2);
        ctx.lineTo(x1, top + wallH / 2);
        ctx.stroke();

        for (let x = x0 + 23; x < x1; x += 46) {

            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, top + wallH / 2);
            ctx.moveTo(x + 23, top + wallH / 2);
            ctx.lineTo(x + 23, wallY);
            ctx.stroke();

        }

        // Battlements on the courtyard face.
        ctx.fillStyle = "#2e323a";

        for (let x = x0 + 8; x + 18 < x1; x += 34)
            ctx.fillRect(x, wallY, 18, 10);

    });

    // ---- round towers flanking the gate ----

    [gateL, gateR].forEach(x => {

        const ty = top + wallH / 2 + 4;
        const r = 27;

        let tower = ctx.createRadialGradient(x - r * 0.3, ty - r * 0.3, r * 0.2, x, ty, r);
        tower.addColorStop(0, "#5b616b");
        tower.addColorStop(0.7, "#3d424a");
        tower.addColorStop(1, "#212429");

        ctx.fillStyle = tower;
        ctx.beginPath();
        ctx.arc(x, ty, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Parapet ring seen from above.
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.arc(x, ty, r * 0.62, 0, Math.PI * 2);
        ctx.stroke();

    });

}

// =====================================
// Red Carpet (throne approach)
// =====================================
//
// A full-height runner down the center of the arena - deep
// red body, gold trim bands down both sides, and a line of
// gold diamond motifs spaced along the middle. Purely
// decorative; it sits on the floor pass so shadows, lighting,
// and every entity draw on top of it.

function drawRedCarpet() {

    const carpetWidth = canvas.width * 0.26;
    const trimWidth = Math.max(8, carpetWidth * 0.05);
    const left = canvas.width / 2 - carpetWidth / 2;
    const right = left + carpetWidth;

    ctx.save();

    // Soft contact shadow so the carpet reads as sitting on
    // the floor instead of painted onto it.
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(left - 6, 0, carpetWidth + 12, canvas.height);

    // Red body - darker at the edges, richer in the middle,
    // like the pile catching the light down its center.
    let body = ctx.createLinearGradient(left, 0, right, 0);
    body.addColorStop(0, "#4a0c14");
    body.addColorStop(0.18, "#6e1220");
    body.addColorStop(0.5, "#8f1626");
    body.addColorStop(0.82, "#6e1220");
    body.addColorStop(1, "#4a0c14");

    ctx.fillStyle = body;
    ctx.fillRect(left, 0, carpetWidth, canvas.height);

    // Gold trim bands down both sides.
    [left, right - trimWidth].forEach(x => {

        let trim = ctx.createLinearGradient(x, 0, x + trimWidth, 0);
        trim.addColorStop(0, "#7a5c14");
        trim.addColorStop(0.5, "#d4af37");
        trim.addColorStop(1, "#7a5c14");

        ctx.fillStyle = trim;
        ctx.fillRect(x, 0, trimWidth, canvas.height);

    });

    // Thin dark seam where the trim meets the red, so the
    // bands don't blur into the body.
    ctx.fillStyle = "rgba(30, 5, 8, 0.6)";
    ctx.fillRect(left + trimWidth, 0, 2, canvas.height);
    ctx.fillRect(right - trimWidth - 2, 0, 2, canvas.height);

    // Gold diamond motifs spaced down the center line.
    const cx = canvas.width / 2;
    const spacing = 140;
    const size = carpetWidth * 0.055;

    ctx.fillStyle = "rgba(212, 175, 55, 0.55)";

    for (let y = spacing / 2; y < canvas.height; y += spacing) {

        ctx.beginPath();
        ctx.moveTo(cx, y - size);
        ctx.lineTo(cx + size, y);
        ctx.lineTo(cx, y + size);
        ctx.lineTo(cx - size, y);
        ctx.closePath();
        ctx.fill();

    }

    ctx.restore();

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

    // Castle entrance: daylight pours in from the open
    // courtyard below the map. Everywhere else the sun sits
    // off-screen to the right.
    if (Arena.theme === "castle")
        return {
            x: canvas.width / 2,
            y: canvas.height * 1.15
        };

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

    if (Arena.theme === "night") {

        // ---- night throne room: no sun, no moon. The room
        // starts near-black with a cold blue cast, and the
        // base torches carve out the only pools of light. ----

        ctx.fillStyle = "rgba(4, 5, 14, 0.93)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pulse = Math.sin(Date.now() / 90) * 6;
        const flicker = Math.sin(Date.now() / 47) * 4;

        Arena.torches.forEach(t => {

            const radius = 345 + pulse + flicker;

            // Broad warm wash - the candlelit floor pool.
            let warmGlow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
            warmGlow.addColorStop(0, "rgba(255, 195, 95, 0.68)");
            warmGlow.addColorStop(0.35, "rgba(255, 155, 58, 0.36)");
            warmGlow.addColorStop(1, "rgba(255, 130, 40, 0)");

            ctx.fillStyle = warmGlow;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Hot core right around the flame itself.
            const coreRadius = 95 + pulse * 0.5;

            let core = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, coreRadius);
            core.addColorStop(0, "rgba(255, 238, 175, 0.62)");
            core.addColorStop(1, "rgba(255, 200, 110, 0)");

            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(t.x, t.y, coreRadius, 0, Math.PI * 2);
            ctx.fill();

        });

        // A small moonbeam spotlight dead center - a cool
        // pale pool so the middle of the room isn't a total
        // void, contrasting the warm torch pools at the edges.
        const spot = getNightSpotlight();

        let moon = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.radius);
        moon.addColorStop(0, "rgba(190, 210, 255, 0.4)");
        moon.addColorStop(0.6, "rgba(170, 195, 250, 0.18)");
        moon.addColorStop(1, "rgba(160, 185, 245, 0)");

        ctx.fillStyle = moon;
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;

    }

    if (Arena.theme === "castle") {

        // ---- castle-entrance lighting: daylight comes from
        // the courtyard BELOW the map, so every directional
        // pass here runs bottom-to-top instead of
        // right-to-left. ----

        // 1. Shadow settling toward the top of the map, fully
        // clear by ~55% down so the courtyard stays bright.

        let shade = ctx.createLinearGradient(0, 0, 0, canvas.height);
        shade.addColorStop(0, "rgba(15, 13, 12, 0.5)");
        shade.addColorStop(0.55, "rgba(15, 13, 12, 0.15)");
        shade.addColorStop(1, "rgba(15, 13, 12, 0)");

        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Warm sunlight flooding up from below the map -
        // the actual light source.

        const sun = getLightSource();
        const reach = canvas.height * 1.6;

        let dayGlow = ctx.createRadialGradient(
            sun.x, sun.y, 0,
            sun.x, sun.y, reach
        );

        dayGlow.addColorStop(0, "rgba(255, 225, 170, 0.55)");
        dayGlow.addColorStop(0.4, "rgba(255, 210, 150, 0.28)");
        dayGlow.addColorStop(1, "rgba(255, 200, 140, 0)");

        ctx.fillStyle = dayGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Hot edge along the bottom where the light
        // enters, like sun blowing out right at the source.

        let rim = ctx.createLinearGradient(0, canvas.height * 0.8, 0, canvas.height);
        rim.addColorStop(0, "rgba(255, 240, 210, 0)");
        rim.addColorStop(1, "rgba(255, 248, 225, 0.4)");

        ctx.fillStyle = rim;
        ctx.fillRect(0, canvas.height * 0.8, canvas.width, canvas.height * 0.2);

        // 4. Interior shade: the keep (top half) sits out of
        // the sun, so it reads noticeably dimmer and cooler,
        // fading out right at the castle wall.

        const { wallY, cx, gateW } = getCastleLayout();

        let indoor = ctx.createLinearGradient(0, 0, 0, wallY + 6);
        indoor.addColorStop(0, "rgba(8, 10, 18, 0.42)");
        indoor.addColorStop(0.8, "rgba(8, 10, 18, 0.3)");
        indoor.addColorStop(1, "rgba(8, 10, 18, 0)");

        ctx.fillStyle = indoor;
        ctx.fillRect(0, 0, canvas.width, wallY + 6);

        // 5. Daylight spilling through the open gate onto the
        // flagstones just inside.

        ctx.save();

        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, wallY);
        ctx.clip();

        let spill = ctx.createRadialGradient(cx, wallY, gateW * 0.15, cx, wallY, canvas.height * 0.42);
        spill.addColorStop(0, "rgba(255, 226, 170, 0.4)");
        spill.addColorStop(0.5, "rgba(255, 210, 150, 0.16)");
        spill.addColorStop(1, "rgba(255, 200, 140, 0)");

        ctx.fillStyle = spill;
        ctx.fillRect(0, 0, canvas.width, wallY);

        ctx.restore();

        ctx.restore();
        return;

    }

    // ---- throne lighting ----
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

// Single source of truth for the night arena's center
// spotlight - the floor glow and the veil hole both read
// from this so they can never drift apart.

function getNightSpotlight() {

    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 150 + Math.sin(Date.now() / 400) * 5
    };

}

// =====================================
// NIGHT VEIL (entity darkness)
// =====================================
//
// The floor-pass night darkness deliberately doesn't touch
// entities (it draws before them). This second pass draws
// AFTER entities: a darkness layer with a soft hole punched
// around each torch, so the player, enemies, and projectiles
// genuinely fade into the dark as they move away from the
// light. Built on an offscreen canvas because punching
// gradient holes needs destination-out compositing, which
// would erase the scene if done on the main canvas.

let nightVeilCanvas = null;

function drawNightVeil() {

    if (Arena.theme !== "night")
        return;

    if (canvas.width === 0 || canvas.height === 0)
        return;

    if (!nightVeilCanvas)
        nightVeilCanvas = document.createElement("canvas");

    if (nightVeilCanvas.width !== canvas.width || nightVeilCanvas.height !== canvas.height) {

        nightVeilCanvas.width = canvas.width;
        nightVeilCanvas.height = canvas.height;

    }

    const vctx = nightVeilCanvas.getContext("2d");

    vctx.clearRect(0, 0, canvas.width, canvas.height);

    vctx.fillStyle = "rgba(3, 4, 12, 0.9)";
    vctx.fillRect(0, 0, canvas.width, canvas.height);

    // Punch a flickering hole of visibility around each torch:
    // fully clear near the flame, fading back to full darkness
    // at the pool's edge.
    vctx.globalCompositeOperation = "destination-out";

    const pulse = Math.sin(Date.now() / 90) * 6;
    const flicker = Math.sin(Date.now() / 47) * 4;

    Arena.torches.forEach(t => {

        const radius = 330 + pulse + flicker;

        let hole = vctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
        hole.addColorStop(0, "rgba(0, 0, 0, 1)");
        hole.addColorStop(0.4, "rgba(0, 0, 0, 0.9)");
        hole.addColorStop(1, "rgba(0, 0, 0, 0)");

        vctx.fillStyle = hole;
        vctx.beginPath();
        vctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        vctx.fill();

    });

    // Matching visibility hole under the center spotlight.
    const spot = getNightSpotlight();

    let spotHole = vctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.radius);
    spotHole.addColorStop(0, "rgba(0, 0, 0, 1)");
    spotHole.addColorStop(0.5, "rgba(0, 0, 0, 0.85)");
    spotHole.addColorStop(1, "rgba(0, 0, 0, 0)");

    vctx.fillStyle = spotHole;
    vctx.beginPath();
    vctx.arc(spot.x, spot.y, spot.radius, 0, Math.PI * 2);
    vctx.fill();

    vctx.globalCompositeOperation = "source-over";

    ctx.drawImage(nightVeilCanvas, 0, 0);

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

    // No off-screen sun at night - the base torches are the
    // only light, so directional cast shadows would point the
    // wrong way. The night lighting pass handles depth instead.
    if (Arena.theme === "night")
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

    if (Arena.theme === "night") {

        Arena.pillars.forEach(p => drawNightPillar(p));

        return;

    }

    if (Arena.theme === "throne") {

        Arena.pillars.forEach(p => drawThronePillar(p));

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
// X-RAY OUTLINES (entities behind pillars OR the HUD)
// =====================================
//
// Foreground pillars are painted on top of the entities so
// characters can walk behind them - which means an enemy, or
// you, can end up fully hidden by a column. So nothing can
// vanish (or ambush you) behind one, any entity overlapping a
// pillar shaft is re-drawn as a glowing outline clipped to that
// shaft: red for enemies, blue for the player, amber for
// projectiles, and each hazard's own tint for ice/fire/damage
// zones. The clip keeps the silhouette confined to the
// occluder, so it reads as a true x-ray only where the column
// (or panel) actually covers the thing.
//
// The exact same clip-and-redraw trick covers the HUD status
// plate in the top-left corner (see drawXRayInRect, called
// from drawHUD in ui.js AFTER the panel is painted) - it's the
// same "can't hide behind an opaque UI element" problem the
// pillars already solved, just with a screen-space rect
// instead of a pillar shaft.
//
// Called after drawPillars()/drawTorches() (see game.js), so
// the outlines sit on top of the columns.

// Outline tint for a circular hazard, guessed from its class -
// ice patches read cold blue, fire/blast zones read hot
// orange, anything else falls back to a neutral white rather
// than needing every hazard type hand-registered here.
const HAZARD_XRAY_COLORS = {
    FrostZone: "#8fe3ff",
    MageIceField: "#8fe3ff",
    FireCast: "#ff8a3d",
    BurningGround: "#ff8a3d",
    MagusFirestorm: "#ff8a3d",
    KegKillZone: "#ff5a3c",
    ClusterBomb: "#ff5a3c",
    SanctuaryField: "#ffd25a",
    LeylineVortex: "#a57dff",
    MeteorStrike: "#ff5a3c",
    LightningStrike: "#ffeb78",
    ArcaneNova: "#5f7dff"
};

// Gathers every occludable thing on screen ONCE per frame -
// shared by the pillar pass and the HUD pass so neither has to
// re-derive it. Squares (player/enemies/projectiles) carry
// `size`; circles (hazards) carry `radius`.
function buildXRayTargets() {

    const targets = [];

    if (player)
        targets.push({ shape: "square", ent: player, color: "#4da6ff" });

    Game.enemies.forEach(ent =>
        targets.push({ shape: "square", ent, color: "#ff3b30" })
    );

    Game.projectiles.forEach(ent =>
        targets.push({ shape: "square", ent, color: "#ffd54d" })
    );

    // Only hazards that are plain circular ground zones (a
    // stable x/y plus a radius or getRadius()) qualify - full-
    // width effects like the Magus's earth wall or wind gust
    // don't carry a radius at all, so they're duck-typed out
    // automatically rather than drawing a nonsense circle for
    // them.
    Game.hazards.forEach(ent => {

        const radius = typeof ent.getRadius === "function"
            ? ent.getRadius()
            : ent.radius;

        if (typeof radius !== "number" || radius <= 0)
            return;

        targets.push({
            shape: "circle",
            ent,
            radius,
            color: HAZARD_XRAY_COLORS[ent.constructor.name] ?? "#ffffff"
        });

    });

    return targets;

}

// Clips to (rectX, rectY, rectW, rectH) and redraws every
// target overlapping it as a glowing silhouette - the shared
// body both the per-pillar loop and the HUD call into.
function drawXRayTargetsInRect(rectX, rectY, rectW, rectH, targets) {

    const rectRight = rectX + rectW;
    const rectBottom = rectY + rectH;

    let any = false;

    for (const t of targets) {

        if (t.shape === "square") {

            const { ent } = t;

            if (
                ent.x + ent.size < rectX ||
                ent.x > rectRight ||
                ent.y + ent.size < rectY ||
                ent.y > rectBottom
            )
                continue;

        } else {

            const { ent, radius } = t;

            if (
                ent.x + radius < rectX ||
                ent.x - radius > rectRight ||
                ent.y + radius < rectY ||
                ent.y - radius > rectBottom
            )
                continue;

        }

        any = true;
        break;

    }

    // Skip the save/clip entirely when nothing overlaps - this
    // rect gets tested every frame (pillars AND the HUD), so
    // the common "nothing's back there" case should cost only
    // the bounding check above, not a clip setup too.
    if (!any)
        return;

    ctx.save();

    ctx.beginPath();
    ctx.rect(rectX, rectY, rectW, rectH);
    ctx.clip();

    targets.forEach(t => {

        if (t.shape === "square") {

            const { ent, color } = t;

            if (
                ent.x + ent.size < rectX ||
                ent.x > rectRight ||
                ent.y + ent.size < rectY ||
                ent.y > rectBottom
            )
                return;

            ctx.save();

            ctx.shadowBlur = 8;
            ctx.shadowColor = color;

            ctx.globalAlpha = 0.15;
            ctx.fillStyle = color;
            ctx.fillRect(ent.x, ent.y, ent.size, ent.size);

            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(ent.x, ent.y, ent.size, ent.size);

            ctx.restore();

        } else {

            const { ent, radius, color } = t;

            if (
                ent.x + radius < rectX ||
                ent.x - radius > rectRight ||
                ent.y + radius < rectY ||
                ent.y - radius > rectBottom
            )
                return;

            ctx.save();

            ctx.shadowBlur = 8;
            ctx.shadowColor = color;

            ctx.globalAlpha = 0.18;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(ent.x, ent.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ent.x, ent.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

        }

    });

    ctx.restore();

}

function drawOccludedOutlines() {

    const targets = buildXRayTargets();

    if (targets.length === 0)
        return;

    Arena.pillars.forEach(p => {

        const left = p.x - p.width / 2;
        const bottom = p.y + 40;

        drawXRayTargetsInRect(left, 0, p.width, bottom, targets);

    });

}

// Public entry point for anything OTHER than pillars that
// wants the same "show what's hidden underneath" treatment -
// currently just the HUD status plate (see drawHUD in ui.js).
// Builds its own target list since it's called well after the
// pillar pass and Game.projectiles/hazards may have ticked.
function drawXRayInRect(rectX, rectY, rectW, rectH) {

    drawXRayTargetsInRect(rectX, rectY, rectW, rectH, buildXRayTargets());

}

// Throne pillar: same silhouette and plinth as the coliseum
// pillar (same x/width/height), rendered as polished marble -
// smoother multi-stop gradient, a bright edge highlight,
// proper fluting grooves, and gold capital/plinth trim to
// match the carpet.

function drawThronePillar(p) {

    const shaftLeft = p.x - p.width / 2;
    const shaftHeight = p.y + 40;

    ctx.save();

    // Polished marble shaft - more gradient stops than the
    // coliseum version so the rounding reads smoothly.
    let shaft = ctx.createLinearGradient(shaftLeft, 0, shaftLeft + p.width, 0);
    shaft.addColorStop(0, "#e8ecec");
    shaft.addColorStop(0.12, "#c3ced1");
    shaft.addColorStop(0.35, "#8fa1a8");
    shaft.addColorStop(0.6, "#54626e");
    shaft.addColorStop(0.85, "#2b3843");
    shaft.addColorStop(1, "#151d24");

    ctx.fillStyle = shaft;
    ctx.fillRect(shaftLeft, 0, p.width, shaftHeight);

    // Bright specular streak near the lit edge.
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(shaftLeft + p.width * 0.07, 0, p.width * 0.05, shaftHeight);

    // Fluting - four soft vertical grooves instead of the
    // coliseum's two hard lines.
    for (let i = 1; i <= 4; i++) {

        const gx = shaftLeft + (p.width * i) / 5;

        let groove = ctx.createLinearGradient(gx - 3, 0, gx + 3, 0);
        groove.addColorStop(0, "rgba(0, 0, 0, 0)");
        groove.addColorStop(0.5, "rgba(0, 0, 0, 0.3)");
        groove.addColorStop(1, "rgba(255, 255, 255, 0.08)");

        ctx.fillStyle = groove;
        ctx.fillRect(gx - 3, 0, 6, shaftHeight);

    }

    // Gold capital band where the shaft meets the plinth.
    let band = ctx.createLinearGradient(0, shaftHeight - 18, 0, shaftHeight);
    band.addColorStop(0, "#d4af37");
    band.addColorStop(0.5, "#a07d1f");
    band.addColorStop(1, "#6e5512");

    ctx.fillStyle = band;
    ctx.fillRect(shaftLeft - p.width * 0.05, shaftHeight - 18, p.width * 1.1, 18);

    // Plinth - same two-step footprint as the coliseum
    // pillar, in marble tones with a gold trim line.
    ctx.fillStyle = "#3d4d5c";
    ctx.fillRect(p.x - p.width * 0.65, shaftHeight, p.width * 1.3, 14);

    ctx.fillStyle = "#d4af37";
    ctx.fillRect(p.x - p.width * 0.65, shaftHeight + 12, p.width * 1.3, 3);

    ctx.fillStyle = "#1b2530";
    ctx.fillRect(p.x - p.width * 0.75, shaftHeight + 14, p.width * 1.5, 12);

    ctx.restore();

}

// Night pillar: the exact throne pillar, then a night pass
// clipped to the pillar's own footprint - a cold dark wash
// over the marble, and a warm torchlight gradient rising from
// the base torch so the stone visibly catches the flame.
// Pillars draw after the lighting pass (so they can occlude
// entities), which is why they need their own darkening here.

function drawNightPillar(p) {

    drawThronePillar(p);

    const shaftHeight = p.y + 40;
    const torch = Arena.torches.find(t => t.parentPillar === p);
    const torchY = torch ? torch.y : shaftHeight;

    ctx.save();

    // Clip to the pillar's silhouette: shaft (with the gold
    // band's slight overhang) plus both plinth steps.
    ctx.beginPath();
    ctx.rect(p.x - p.width * 0.55, 0, p.width * 1.1, shaftHeight);
    ctx.rect(p.x - p.width * 0.65, shaftHeight, p.width * 1.3, 15);
    ctx.rect(p.x - p.width * 0.75, shaftHeight + 14, p.width * 1.5, 12);
    ctx.clip();

    const left = p.x - p.width * 0.75;
    const width = p.width * 1.5;
    const height = shaftHeight + 26;

    // Cold night wash over the marble.
    ctx.fillStyle = "rgba(7, 9, 22, 0.72)";
    ctx.fillRect(left, 0, width, height);

    // Warm torchlight climbing the stone from the base torch.
    const flicker = Math.sin(Date.now() / 80) * 8;
    const reach = p.width * 2.2 + flicker;

    let glow = ctx.createRadialGradient(p.x, torchY, 0, p.x, torchY, reach);
    glow.addColorStop(0, "rgba(255, 185, 85, 0.55)");
    glow.addColorStop(0.5, "rgba(255, 145, 55, 0.25)");
    glow.addColorStop(1, "rgba(255, 130, 40, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(left, 0, width, height);

    ctx.restore();

}

// =====================================
// TORCHES
// =====================================

function drawTorches() {

    // Night torches are the arena's only light source, so
    // they render bigger: a heavier bracket, a taller flame
    // with a white-hot inner tongue, and a stronger halo.
    const night = Arena.theme === "night";

    const flicker = Math.sin(Date.now() / 80) * (night ? 3 : 2);

    Arena.torches.forEach(t => {

        ctx.save();

        if (night) {

            ctx.fillStyle = "#3a2a1a";
            ctx.fillRect(t.x - 4, t.y - 6, 8, 30);

            ctx.fillStyle = "#1f1610";
            ctx.fillRect(t.x - 8, t.y + 20, 16, 5);

            ctx.shadowBlur = 35;
            ctx.shadowColor = "orange";

            ctx.fillStyle = "#ffae42";
            ctx.beginPath();
            ctx.ellipse(t.x, t.y - 14 + flicker, 9, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff3c4";
            ctx.beginPath();
            ctx.ellipse(t.x, t.y - 11 + flicker * 0.6, 4, 9, 0, 0, Math.PI * 2);
            ctx.fill();

        } else {

            ctx.fillStyle = "#3a2a1a";
            ctx.fillRect(t.x - 3, t.y - 5, 6, 20);

            ctx.shadowBlur = 20;
            ctx.shadowColor = "orange";

            ctx.fillStyle = "#ffae42";
            ctx.beginPath();
            ctx.ellipse(t.x, t.y - 10 + flicker, 6, 12, 0, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.restore();

    });

}