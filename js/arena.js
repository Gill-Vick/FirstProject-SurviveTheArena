// =====================================
// Arena State
// =====================================

const Arena = {

    theme: "castle",

    // Foreground occluders - things entities can walk behind.
    // Historically always pillars, hence the name; the garden's
    // trees and the storm ruin's broken stumps live here too (see
    // getOccluderRect for how a non-full-height one declares
    // the part of the screen it actually covers).
    pillars: [],
    torches: [],

    // Ground dressing that does NOT occlude and is not lit as
    // an object - bushes, flower beds, benches. Drawn flat onto
    // the floor pass (see drawArenaProps).
    props: [],

    // Marks the fight leaves behind: scorch, cracks, splatter,
    // frost, footprints. Each carries its own birth time and
    // fades off the clock, so there is no per-frame update to
    // run - see addArenaDecal / drawArenaDecals.
    decals: [],

    // Set by updateArenaForWave when the look changes, and by
    // triggerArenaFlourish on a boss entrance. Both are read as
    // "how long ago" against Date.now(), same idea as the decals.
    transitionAt: 0,
    flourishAt: 0,
    flourishKind: null,

    // Static decoration for the castle-entrance arena (grass
    // tufts, path cobbles). Generated once per arena so the
    // layout doesn't reshuffle every frame.
    deco: { tufts: [], stones: [] }

};

function updateArenaForWave() {

    // One look per boss, changing every five waves: castle
    // entrance 1-5, night throne room 6-10, throne approach
    // 11-15, the rose court 16-20, the storm-broken ruin 21+.
    // Comparing against the CURRENT theme (rather than
    // one-way checks) means custom-mode wave jumps regenerate
    // correctly in both directions.
    //
    // The two late bands read from their own ARENA_* constants
    // rather than the SET*_START ones - see the note in
    // constants.js: those drive spawning, these only drive looks.
    const desired =
        Game.wave >= WAVES.ARENA_FINAL_START ? "final" :
        Game.wave >= WAVES.ARENA_STORM_GROVE_START ? "stormGrove" :
        Game.wave >= WAVES.ARENA_STORM_START ? "storm" :
        Game.wave >= WAVES.ARENA_GROVE_START ? "grove" :
        Game.wave >= WAVES.ARENA_MAZE_START ? "maze" :
        Game.wave >= WAVES.ARENA_GARDEN_START ? "garden" :
        Game.wave >= WAVES.SET3_START ? "throne" :
        Game.wave >= WAVES.SET2_START ? "night" :
        "castle";

    if (Arena.theme === desired)
        return;

    applyArenaTheme(desired, true);

}

// Swap the arena over to a theme, rebuilding everything that
// belongs to a look.
//
// Every generator below rebuilds its own occluders and lights,
// but only the themes that HAVE ground dressing set Arena.props -
// clearing it here stops a theme inheriting the previous one's
// bushes. Decals are scrubbed for the same reason: scorch marks
// from the last arena shouldn't survive into a different room.
//
// This is the ONLY place a theme is allowed to change. It used to
// be duplicated, with generateArena() assigning Arena.theme by
// hand and skipping the two lines above - so a run that ended in
// the rose court left its bushes and blood standing in the castle
// courtyard of the NEXT run, until wave 6 finally swapped themes
// for real and cleared them.
function applyArenaTheme(theme, wipe) {

    Arena.theme = theme;

    Arena.props = [];
    Arena.decals = [];

    // Drives the wipe between looks (see drawArenaTransition).
    // Skipped when the arena is being built rather than changed,
    // so a fresh run doesn't open on a curtain sweep.
    if (wipe)
        Arena.transitionAt = Date.now();

    // The three Act II/III green arenas are variations on the
    // rose court rather than separate builders: same trees,
    // hedges and lanterns, different density and palette. They
    // are the same PLACE at three depths - a tended court, a
    // maze, then wild woodland - so building them from one
    // generator is what keeps that reading rather than a
    // shortcut.
    if (theme === "final")
        generateFinalArena();
    else if (theme === "stormGrove")
        generateRoseCourt("stormGrove");
    else if (theme === "storm")
        generateStormRuin();
    else if (theme === "grove")
        generateRoseCourt("grove");
    else if (theme === "maze")
        generateRoseCourt("maze");
    else if (theme === "garden")
        generateRoseCourt("garden");
    else if (theme === "throne")
        generateThroneRoom();
    else if (theme === "night")
        generateNightThrone();
    else
        generateCastleEntrance();

}

function generateArena() {

    applyArenaTheme("castle", false);

}

// Put the background back to the opening arena and sweep the
// curtain across it. Called when a run ENDS - death or quit -
// rather than when the next one starts, so the menu and the
// game-over screen sit over the castle courtyard instead of over
// whatever room the player happened to die in.
function resetArenaToStart() {

    applyArenaTheme("castle", true);

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

// The castle arena's sunlight, as bare "r, g, b" so callers can
// pick their own alpha.
//
// ONE sun, and everything it touches reads from this: the wash on
// the courtyard, the archway, and the light on the flagstones
// inside. That is the whole point of the constant, and it had
// quietly stopped being true - the courtyard was being washed with
// a near-white at 0.07 alpha, which is invisible, so outside read
// as unlit; meanwhile the doorway had its own separate deep amber.
// Two different lights in one scene, which is exactly why the
// inside and the outside felt like different places.
//
// So this is a real warm daylight rather than an almost-white,
// strong enough to be visible on the grass at a low alpha.
const CASTLE_SUN = "255, 206, 132";

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

// The rose court (waves 16-20, the Prince & Princess's arena):
// a walled palace garden at dusk. The only arena with no columns
// at all - trees are the cover (see drawGardenTree), standing
// lantern posts are the light, and bushes, flower beds and
// benches dress the ground (see drawArenaProps).

// The four green arenas, as differences from the rose court.
//
// They are the same PLACE seen at four depths - a tended court,
// then the maze behind it, then wild woodland, then that same
// woodland under the angels' storm - so they are built by one
// generator from one table rather than by four near-identical
// functions. Anything not listed here is shared by all of them.
const GREEN_VARIANTS = {

    garden: {
        floor: [176, 168, 152],   // pale marble terrace
        soil: [74, 96, 52],
        trees: 6,
        bushes: 9,
        beds: true,
        benches: true,
        lanterns: 4,
        tint: null
    },

    maze: {
        // Hedge maze: the paving gives way to trodden gravel and
        // the planting closes in, so the same arena fights much
        // tighter without moving a single wall.
        floor: [142, 134, 116],
        soil: [58, 82, 44],
        trees: 10,
        bushes: 16,
        beds: false,
        benches: false,
        lanterns: 4,
        tint: "rgba(20, 40, 24, 0.14)"
    },

    grove: {
        // Wild woodland - no paving left at all, just leaf litter
        // under a closed canopy.
        floor: [86, 74, 54],
        soil: [48, 68, 38],
        trees: 12,
        bushes: 20,
        beds: false,
        benches: false,
        lanterns: 3,
        tint: "rgba(14, 34, 20, 0.26)"
    },

    stormGrove: {
        // The same wood with the storm overhead: the light goes
        // cold and the greens go grey.
        floor: [70, 66, 58],
        soil: [42, 56, 40],
        trees: 12,
        bushes: 18,
        beds: false,
        benches: false,
        lanterns: 3,
        tint: "rgba(24, 32, 52, 0.3)"
    }

};

// True for every arena built by generateRoseCourt.
//
// Every look/behaviour check that used to read `theme ===
// "garden"` goes through this, so adding a fifth green arena
// never means hunting down a dozen equality tests - which is
// exactly how the storm arena's shadow direction got missed the
// first time round.
function isGreenTheme(theme = Arena.theme) {

    return GREEN_VARIANTS[theme] !== undefined;

}

function greenVariant(theme = Arena.theme) {

    return GREEN_VARIANTS[theme] ?? GREEN_VARIANTS.garden;

}

function generateRoseCourt(variant = "garden") {

    const V = GREEN_VARIANTS[variant] ?? GREEN_VARIANTS.garden;

    // No columns here - a garden has trees. They still go in
    // Arena.pillars because that's the foreground-occluder list
    // (entities walk behind them, and the shadow and x-ray passes
    // read from it), but each declares a `top` so only the canopy
    // counts as cover rather than a full-height strip.
    Arena.pillars = [];
    Arena.props = [];
    Arena.torches = [];

    const W = canvas.width;
    const H = canvas.height;

    // Trees stand IN the planted border down each side, not out
    // on the paving - a tree rooted in the middle of a marble
    // court makes no sense, and it also kept the fighting lane
    // clear only by accident. Centred on the border strip, which
    // puts the trunks on soil and lets the canopies lean over
    // the court.
    // Far enough in that the widest canopy still clears the
    // screen edge, while the trunk stays on the border's soil.
    const bx = W * (GARDEN_BORDER * 0.63);

    // Six trees down the two borders in the tended court; the
    // wilder variants add pairs further in, closing the arena
    // down without ever blocking the middle where the fighting
    // happens.
    const treeSpots = [
        { x: bx, y: H * 0.26, width: 110 },
        { x: bx, y: H * 0.66, width: 124 },
        { x: bx, y: H * 1.04, width: 134 },
        { x: W - bx, y: H * 0.26, width: 110 },
        { x: W - bx, y: H * 0.66, width: 124 },
        { x: W - bx, y: H * 1.04, width: 134 }
    ];

    const extraRows = [
        { y: H * 0.16, width: 104 },
        { y: H * 0.88, width: 118 },
        { y: H * 0.52, width: 112 }
    ];

    for (let i = 0; treeSpots.length < V.trees && i < extraRows.length; i++) {

        const row = extraRows[i];

        treeSpots.push({ x: W * 0.235, y: row.y, width: row.width });

        if (treeSpots.length < V.trees)
            treeSpots.push({ x: W * 0.765, y: row.y, width: row.width });

    }

    treeSpots.forEach(t => {

        // occWidth/top describe the pine's actual silhouette so
        // the x-ray and shadow passes match what's drawn. Both
        // are derived from the same TREE_* proportions
        // drawGardenTree uses - change them in one place.
        const canopyTop = t.y + 40
                          - t.width * TREE_TRUNK_H
                          + t.width * TREE_CANOPY_OVERLAP
                          - t.width * TREE_CANOPY_H;

        Arena.pillars.push({
            x: t.x,
            y: t.y,
            width: t.width,
            occWidth: t.width * TREE_CANOPY_HALF * 2,
            top: Math.max(0, canopyTop),
            kind: "tree"
        });

    });

    // Lantern posts standing on their own between the trees -
    // the garden's light, and deliberately not bolted to a
    // trunk the way the old wall brackets were.
    [
        { x: W * 0.26, y: H * 0.34 },
        { x: W * 0.26, y: H * 0.80 },
        { x: W * 0.74, y: H * 0.34 },
        { x: W * 0.74, y: H * 0.80 }
    ].slice(0, V.lanterns).forEach(l => Arena.torches.push({ x: l.x, y: l.y }));

    // Ground dressing. None of this occludes or collides - it is
    // there to make the place read as a garden rather than a
    // marble box.
    //
    // Everything below goes through addProp, which refuses any
    // placement that would overlap something already there. Props
    // stacked on trees and lanterns looked like a mistake rather
    // than a garden, and a bush drawn over a lamp post put out
    // the only light in that corner.
    const addProp = prop => {

        const reach = p =>
            p.r ?? Math.max(p.w ?? 0, p.h ?? 0) / 2 ?? 20;

        // Lanterns win every contest - they are the arena's light
        // source, and a covered one is a dark corner the player
        // cannot explain.
        const clearOfLanterns = Arena.torches.every(t =>
            Math.hypot(t.x - prop.x, t.y - prop.y) > reach(prop) + 34
        );

        if (!clearOfLanterns)
            return;

        // Trees next: their trunks sit in the border, which is
        // exactly where the bushes want to go.
        const clearOfTrees = Arena.pillars.every(t =>
            Math.hypot(t.x - prop.x, (t.y + 40) - prop.y) > reach(prop) + t.width * 0.4
        );

        if (!clearOfTrees)
            return;

        const clearOfProps = Arena.props.every(o =>
            Math.hypot(o.x - prop.x, o.y - prop.y) > reach(prop) + reach(o) * 0.9
        );

        if (!clearOfProps)
            return;

        // The rose court's fountain is the one set piece that
        // sits IN the planted border rather than on the paving,
        // so the top row's middle bush lands right behind it. The
        // beds already skip the middle for the same reason; this
        // covers everything else that might wander in.
        if (variant === "garden") {

            const fx = W / 2;
            const fy = H * 0.155;

            if (Math.abs(prop.x - fx) < 96 + reach(prop) &&
                Math.abs(prop.y - fy) < 62 + reach(prop))
                return;

        }

        Arena.props.push(prop);

    };
    const hedge = H * 0.11;

    for (let i = 0; i < V.bushes; i++) {

        const x = W * (0.06 + (i % 9) * 0.11);
        const deep = i >= 9;

        // The extra bushes the wilder variants ask for come in
        // off the border and into the court itself, which is
        // what makes the maze and the grove feel overgrown
        // rather than merely darker.
        addProp({
            kind: "bush",
            x: deep ? x + W * 0.03 : x,
            y: deep ? hedge + 74 : hedge + 16,
            r: 20 + (i % 3) * 5
        });

        addProp({
            kind: "bush",
            x: x + W * 0.05,
            y: deep ? H - hedge - 74 : H - hedge - 16,
            r: 18 + (i % 4) * 5
        });

    }

    if (V.beds) {

        // Top row skips the middle - the fountain sits there (see
        // drawArenaSetPiece), and props draw after set pieces, so
        // a bed placed there would be painted straight over its
        // basin.
        [0.24, 0.76].forEach(f => {

            addProp({ kind: "bed", x: W * f, y: hedge + 52, w: 96, h: 26 });

        });

        [0.22, 0.5, 0.78].forEach(f => {

            addProp({ kind: "bed", x: W * f, y: H - hedge - 52, w: 96, h: 26 });

        });

    }

    if (V.benches) {

        addProp({ kind: "bench", x: W * 0.35, y: hedge + 96 });
        addProp({ kind: "bench", x: W * 0.65, y: H - hedge - 96 });

    }

}

// Fireflies under the grove's closed canopy - the only light in
// there that isn't a lantern. Clock-driven and stateless like
// every other ambient effect in this pass.
function drawGroveFireflies(now) {

    ctx.save();

    for (let i = 0; i < 22; i++) {

        const a = stormHash(i + 60);
        const b = stormHash(i + 130);
        const c = stormHash(i + 200);

        const t = now / 1000;

        const x = canvas.width * (0.08 + a * 0.84)
                  + Math.sin(t * (0.3 + b * 0.3) + c * 6) * 70;

        const y = canvas.height * (0.12 + b * 0.76)
                  + Math.cos(t * (0.25 + a * 0.3) + c * 6) * 44;

        // Each blinks on its own cycle, and most are dark at any
        // moment - a constellation that never quite repeats.
        const blink = Math.sin(t * (1.4 + c * 1.6) + a * 9);

        if (blink < 0.35)
            continue;

        ctx.globalAlpha = (blink - 0.35) * 1.1;
        ctx.fillStyle = "#d6f08a";
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3);

        ctx.globalAlpha *= 0.35;
        ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 9, 9);

    }

    ctx.globalAlpha = 1;
    ctx.restore();

}

// Rain slanting through the storm grove, plus the lightning
// wash. Reuses getStormFlash so the grove and the ruin flare on
// exactly the same frame - they are the same storm.
function drawStormGroveRain(now) {

    ctx.save();

    ctx.strokeStyle = "rgba(180, 205, 235, 0.32)";
    ctx.lineWidth = 1;

    for (let i = 0; i < 90; i++) {

        // stormHash rather than a modulo step - the arithmetic
        // version lands on a handful of repeating lanes and the
        // rain comes out as stripes. See the note on stormHash.
        const lane = stormHash(i);
        const speed = 620 + stormHash(i + 300) * 340;

        const x = lane * (canvas.width + 200) - 100;
        const y = ((now / speed) + stormHash(i + 700)) % 1 * (canvas.height + 120) - 60;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 7, y + 22);
        ctx.stroke();

    }

    const flash = getStormFlash();

    if (flash > 0.01) {

        ctx.fillStyle = `rgba(190, 214, 255, ${flash * 0.22})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

    }

    ctx.restore();

}

// Focal object for the three arenas beyond the rose court.
//
// The court has its fountain; giving the maze, the grove and the
// storm grove the same one made them read as the same room three
// times. Each gets the thing its own band is actually about -
// which is also the cheapest way to make a variation feel like a
// place.
function drawGreenSetPiece() {

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.34;
    const now = Date.now();

    ctx.save();

    if (Arena.theme === "maze") {

        // A sundial at the maze's centre - the thing you navigate
        // toward, and a quiet joke: it still keeps time for a
        // household that no longer exists.
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 26, 62, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8d8676";
        ctx.fillRect(cx - 12, cy - 6, 24, 34);

        ctx.fillStyle = "#b9b2a0";
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8, 52, 17, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#6f6959";
        ctx.beginPath();
        ctx.ellipse(cx, cy - 8, 44, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hour marks, and a gnomon whose shadow creeps round on
        // the clock - the only moving part.
        ctx.fillStyle = "#3c382e";

        for (let i = 0; i < 12; i++) {

            const a = (i / 12) * Math.PI * 2;

            ctx.fillRect(
                Math.round(cx + Math.cos(a) * 38) - 2,
                Math.round(cy - 8 + Math.sin(a) * 11) - 2,
                4, 4
            );

        }

        const sweep = (now / 24000) % 1 * Math.PI * 2;

        ctx.strokeStyle = "rgba(30, 28, 22, 0.5)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + Math.cos(sweep) * 40, cy - 8 + Math.sin(sweep) * 12);
        ctx.stroke();

        ctx.fillStyle = "#d8d2c0";
        ctx.fillRect(cx - 3, cy - 34, 6, 28);

    } else if (Arena.theme === "grove") {

        // A ring of standing stones around bare earth: the spot
        // the Heartwood grows out of, marked long before anyone
        // thought to build a castle nearby.
        ctx.fillStyle = "rgba(30, 22, 14, 0.35)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 118, 44, 0, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 7; i++) {

            const a = (i / 7) * Math.PI * 2 - 0.4;
            const sx = cx + Math.cos(a) * 116;
            const sy = cy + 10 + Math.sin(a) * 42;

            const h = 30 + (i % 3) * 12;

            ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
            ctx.beginPath();
            ctx.ellipse(sx, sy + 4, 15, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#6e6a5e";
            ctx.fillRect(Math.round(sx) - 10, Math.round(sy) - h, 20, h);

            ctx.fillStyle = "#8b8779";
            ctx.fillRect(Math.round(sx) - 10, Math.round(sy) - h, 6, h);

            // Faint carvings, lit by whatever is under the grove.
            ctx.fillStyle = `rgba(150, 220, 140, ${0.18 + Math.sin(now / 900 + i) * 0.1})`;
            ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - h + 8, 5, 5);
            ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - h + 20, 5, 5);

        }

    } else {

        // Storm grove: the same standing stones, now struck. One
        // is toppled, and the rest carry the storm's charge -
        // the grove after the angels arrived.
        ctx.fillStyle = "rgba(20, 24, 34, 0.4)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 118, 44, 0, 0, Math.PI * 2);
        ctx.fill();

        const flash = getStormFlash();

        for (let i = 0; i < 7; i++) {

            const a = (i / 7) * Math.PI * 2 - 0.4;
            const sx = cx + Math.cos(a) * 116;
            const sy = cy + 10 + Math.sin(a) * 42;

            // The fourth stone lies where it fell.
            if (i === 3) {

                ctx.fillStyle = "#5c5a54";
                ctx.fillRect(Math.round(sx) - 22, Math.round(sy) - 8, 44, 15);

                continue;

            }

            const h = 30 + (i % 3) * 12;

            ctx.fillStyle = "#585a63";
            ctx.fillRect(Math.round(sx) - 10, Math.round(sy) - h, 20, h);

            ctx.fillStyle = `rgba(190, 220, 255, ${0.25 + flash * 0.6})`;
            ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - h + 8, 5, 5);
            ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - h + 20, 5, 5);

        }

    }

    ctx.restore();

}

// The last arena (waves 41-50): the throne approach again, but
// after everything. Deliberately a REPRISE rather than a new
// look - nine waves recapping every roster the run has fought
// belong somewhere the player recognises, and the King should be
// beaten where he was always going to be.
function generateFinalArena() {

    generateThroneRoom();

}

// The storm-broken ruin (waves 21+, the King's arena): what is
// left of the great hall after the roof came down, open to the
// sky in a downpour. Nothing survives of the old room but broken
// pillar stumps; the light comes from lightning and a handful of
// braziers still guttering in the wind.
//
// The stumps are short on purpose - they read as cover without
// walling the arena in, which matters here because this is the
// final fight and the floor needs to stay legible.

function generateStormRuin() {

    Arena.pillars = [];
    Arena.props = [];
    Arena.torches = [];

    const W = canvas.width;
    const H = canvas.height;

    // stumpFrac is the remnant's height as a fraction of its own
    // width - they all snapped at different heights.
    const stumps = [
        { x: W * 0.10, y: H * 0.20, width: 88, frac: 0.62 },
        { x: W * 0.18, y: H * 0.58, width: 104, frac: 0.42 },
        { x: W * 0.07, y: H * 0.90, width: 94, frac: 0.7 },
        { x: W * 0.90, y: H * 0.20, width: 88, frac: 0.58 },
        { x: W * 0.82, y: H * 0.58, width: 104, frac: 0.46 },
        { x: W * 0.93, y: H * 0.90, width: 94, frac: 0.66 },
        { x: W * 0.40, y: H * 0.12, width: 80, frac: 0.52 },
        { x: W * 0.62, y: H * 0.96, width: 80, frac: 0.56 }
    ];

    stumps.forEach(s => {

        const stumpH = s.width * s.frac;

        Arena.pillars.push({
            x: s.x,
            y: s.y,
            width: s.width,
            stumpH,
            // Only the remnant itself is cover - see
            // getOccluderRect.
            top: Math.max(0, s.y + 40 - stumpH),
            // Broken stone throws a stubby shadow, not a
            // column-length one.
            shadowWidth: s.width * 0.8,
            kind: "stump"
        });

    });

    // Fallen masonry scattered around the stumps. Ground-level
    // dressing only - it never occludes or blocks.
    const rubble = [
        [0.14, 0.34], [0.24, 0.48], [0.12, 0.74], [0.29, 0.86],
        [0.86, 0.34], [0.76, 0.48], [0.88, 0.74], [0.71, 0.86],
        [0.45, 0.26], [0.55, 0.72], [0.34, 0.62], [0.66, 0.4]
    ];

    rubble.forEach(([fx, fy], i) => {

        Arena.props.push({
            kind: "rubble",
            x: W * fx,
            y: H * fy,
            r: 13 + (i % 4) * 6,
            seed: i
        });

    });

    // The few fires still alight, tucked against the standing
    // stone where the wind can't kill them.
    [
        { x: W * 0.29, y: H * 0.22 },
        { x: W * 0.29, y: H * 0.80 },
        { x: W * 0.71, y: H * 0.22 },
        { x: W * 0.71, y: H * 0.80 }
    ].forEach(b => Arena.torches.push({ x: b.x, y: b.y }));

}

// Stable pseudo-random 0..1 from an integer.
//
// The rain needs each drop to keep its own lane, speed and length
// without storing any per-drop state, and it needs those values
// spread evenly. A plain arithmetic step (i * k) % n does NOT
// spread - it lands on a handful of repeating values - so this
// hashes instead.

function stormHash(n) {

    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;

    return s - Math.floor(s);

}

// How hard the lightning is flaring right now, 0..1.
//
// Single source of truth so the floor wash, the entity-level
// overlay and the rain highlight all flash on exactly the same
// frame. Driven straight off the clock - a real double strike,
// bright snap then a dimmer echo, then a long dark gap.

function getStormFlash() {

    const t = (Date.now() % 7200) / 7200;

    if (t < 0.035)
        return 1 - t / 0.035;

    if (t > 0.06 && t < 0.115)
        return (1 - (t - 0.06) / 0.055) * 0.55;

    return 0;

}

// =====================================
// Pixel Floor Texture
// =====================================
//
// The ground is chunky pixel-art stone/grass rather than a
// flat fill, to match the rest of the pixel revamp. Building
// it means thousands of little blocks, so - like the night
// veil - it's rendered ONCE into an offscreen canvas and
// blitted each frame (see the pixel-fx caching rule). The
// cache rebuilds only when the theme or the canvas size
// changes; the texture itself is generated from a seeded RNG
// so it's identical every rebuild and never shimmers.

let floorCanvas = null;
let floorSig = "";

// Size of one "pixel" block, in real canvas pixels. Bigger =
// chunkier. Every tile/grout dimension below is a multiple of
// this so nothing lands off the block grid.
const FLOOR_TEXEL = 4;

// Deterministic PRNG (mulberry32) - same seed, same texture.
function makeFloorRng(seed) {

    let a = seed >>> 0;

    return function () {

        a |= 0;
        a = (a + 0x6d2b79f5) | 0;

        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

    };
}

// Clamp a channel and multiply by a brightness factor.
function shadeChannel(value, factor) {

    return Math.max(0, Math.min(255, Math.round(value * factor)));

}

function shadeColor([r, g, b], factor) {

    return `rgb(${shadeChannel(r, factor)}, ${shadeChannel(g, factor)}, ${shadeChannel(b, factor)})`;

}

// Snap a coordinate to the block grid so fills never straddle
// a half-block and blur the pixel edges.
function snapTexel(v) {

    return Math.round(v / FLOOR_TEXEL) * FLOOR_TEXEL;

}

// Tiles a rect with pixel flagstones: dark grout underneath,
// each stone a slightly different shade with a lit top-left
// edge, a shadowed bottom-right edge, and a little speckle.
function paintPixelStone(fctx, rx, ry, rw, rh, baseRGB, rng, opts = {}) {

    const tile = opts.tile ?? 52;
    const grout = FLOOR_TEXEL;

    // Grout bed.
    fctx.fillStyle = shadeColor(baseRGB, 0.5);
    fctx.fillRect(rx, ry, rw, rh);

    for (let ty = ry; ty < ry + rh; ty += tile) {

        for (let tx = rx; tx < rx + rw; tx += tile) {

            const x0 = snapTexel(tx + grout);
            const y0 = snapTexel(ty + grout);
            const x1 = Math.min(rx + rw, snapTexel(tx + tile));
            const y1 = Math.min(ry + rh, snapTexel(ty + tile));

            const w = x1 - x0;
            const h = y1 - y0;

            if (w <= 0 || h <= 0)
                continue;

            const shade = 0.82 + rng() * 0.34;

            fctx.fillStyle = shadeColor(baseRGB, shade);
            fctx.fillRect(x0, y0, w, h);

            // Beveled edges: lit top + left, shadowed bottom +
            // right, one block thick.
            fctx.fillStyle = shadeColor(baseRGB, shade * 1.28);
            fctx.fillRect(x0, y0, w, FLOOR_TEXEL);
            fctx.fillRect(x0, y0, FLOOR_TEXEL, h);

            fctx.fillStyle = shadeColor(baseRGB, shade * 0.66);
            fctx.fillRect(x0, y1 - FLOOR_TEXEL, w, FLOOR_TEXEL);
            fctx.fillRect(x1 - FLOOR_TEXEL, y0, FLOOR_TEXEL, h);

            // A few speckle blocks per stone for grain.
            const speckles = Math.floor((w * h) / 2600);

            for (let s = 0; s < speckles; s++) {

                const sx = x0 + Math.floor(rng() * (w / FLOOR_TEXEL)) * FLOOR_TEXEL;
                const sy = y0 + Math.floor(rng() * (h / FLOOR_TEXEL)) * FLOOR_TEXEL;

                fctx.fillStyle = shadeColor(baseRGB, shade * (rng() < 0.5 ? 1.16 : 0.78));
                fctx.fillRect(sx, sy, FLOOR_TEXEL, FLOOR_TEXEL);

            }

            // Occasional hairline crack down a stone.
            if (rng() < 0.16) {

                let cx = x0 + FLOOR_TEXEL * (1 + Math.floor(rng() * (w / FLOOR_TEXEL - 2)));
                fctx.fillStyle = shadeColor(baseRGB, 0.55);

                for (let cy = y0 + FLOOR_TEXEL; cy < y1 - FLOOR_TEXEL; cy += FLOOR_TEXEL) {

                    fctx.fillRect(cx, cy, FLOOR_TEXEL, FLOOR_TEXEL);

                    if (rng() < 0.4)
                        cx += (rng() < 0.5 ? -FLOOR_TEXEL : FLOOR_TEXEL);

                }

            }

        }

    }

}

// Pixel lawn: banded green base (darker toward the back for
// depth) with sparse mottle speckle and the odd upright blade.
// A solid base plus a fraction of speckle blocks - rather than
// a fillRect per texel - keeps the one-time build cheap.
function paintPixelGrass(fctx, rx, ry, rw, rh, rng) {

    // A lawn in ordinary daylight. Deliberately a muted, slightly
    // grey-leaning green rather than a vivid one: at full
    // saturation it stopped reading as grass and started reading
    // as a colour, and it was loud enough to pull the eye off the
    // fight happening on top of it.
    //
    // The saturation lives HERE, in the paint, rather than being
    // dialled in with a coloured overlay in the lighting pass.
    // Overlays can only ever wash a colour toward themselves, so
    // pushing one to compensate for a dull base is what flattens a
    // scene - the lighting adds light, the palette carries colour.
    const base = [82, 112, 58];

    // Horizontal bands, snapped to the block grid. Only enough
    // variation to break up a flat fill.
    const band = FLOOR_TEXEL * 6;

    for (let y = ry; y < ry + rh; y += band) {

        // Even across the whole lawn. There used to be a ramp
        // brightening it toward the bottom of the map, baked in to
        // match a sun that sat down there - the same sun the
        // lighting pass no longer has. Overhead light on flat
        // ground doesn't fall off toward the camera.
        const h = Math.min(band, ry + rh - y);

        fctx.fillStyle = shadeColor(base, 1);
        fctx.fillRect(rx, y, rw, h);

    }

    // Mottle: about a third of the blocks nudged lighter/darker.
    const cols = Math.floor(rw / FLOOR_TEXEL);
    const rows = Math.floor(rh / FLOOR_TEXEL);
    const speckle = Math.floor(cols * rows * 0.34);

    for (let i = 0; i < speckle; i++) {

        const x = rx + Math.floor(rng() * cols) * FLOOR_TEXEL;
        const y = ry + Math.floor(rng() * rows) * FLOOR_TEXEL;

        // Flat, matching the bands above - keep the two in step.
        fctx.fillStyle = shadeColor(base, rng() < 0.5 ? 1.12 : 0.86);
        fctx.fillRect(x, y, FLOOR_TEXEL, FLOOR_TEXEL);

    }

    // Scattered blades: a couple of stacked lighter blocks.
    const blades = Math.floor((rw * rh) / 5000);

    for (let i = 0; i < blades; i++) {

        const bx = snapTexel(rx + rng() * rw);
        const by = snapTexel(ry + rng() * rh);
        const tall = 2 + Math.floor(rng() * 2);

        fctx.fillStyle = shadeColor(base, 1.2);

        for (let t = 0; t < tall; t++)
            fctx.fillRect(bx, by - t * FLOOR_TEXEL, FLOOR_TEXEL, FLOOR_TEXEL);

    }

}

// Pixel hedge: a dense dark-green mass with leaf mottle and a
// lit top lip, for the rose court's garden walls. Denser and
// darker than paintPixelGrass - that's a lawn seen from above,
// this is a clipped wall of foliage seen edge-on.
function paintPixelHedge(fctx, rx, ry, rw, rh, rng) {

    const T = FLOOR_TEXEL;
    const base = [34, 64, 38];

    fctx.fillStyle = shadeColor(base, 1);
    fctx.fillRect(rx, ry, rw, rh);

    // Leaf mottle - a fraction of the texels, not all of them,
    // so the one-time bake stays cheap.
    const cells = (rw / T) * (rh / T);

    for (let i = 0; i < cells * 0.4; i++) {

        const x = rx + Math.floor(rng() * (rw / T)) * T;
        const y = ry + Math.floor(rng() * (rh / T)) * T;

        fctx.fillStyle = shadeColor(base, 0.7 + rng() * 0.75);
        fctx.fillRect(x, y, T, T);

    }

    // Lit lip along the top edge, shadowed underside.
    for (let x = rx; x < rx + rw; x += T) {

        const lift = rng() < 0.5 ? T : T * 2;

        fctx.fillStyle = shadeColor(base, 1.55);
        fctx.fillRect(x, ry, T, lift);

    }

    fctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    fctx.fillRect(rx, ry + rh - T * 2, rw, T * 2);

}

// Scatters small petal clusters over a rect - the rose court's
// one bit of colour on the pale marble.
function paintRosePetals(fctx, rx, ry, rw, rh, rng, count) {

    const T = FLOOR_TEXEL;
    const petals = ["#8f1e33", "#b8324b", "#d9556d", "#6e1526"];

    for (let i = 0; i < count; i++) {

        const x = rx + Math.floor(rng() * (rw / T)) * T;
        const y = ry + Math.floor(rng() * (rh / T)) * T;

        fctx.fillStyle = petals[Math.floor(rng() * petals.length)];

        // A petal is two or three texels, never a lone dot -
        // single pixels read as noise rather than as debris.
        fctx.fillRect(x, y, T, T);
        fctx.fillRect(x + T, y, T, T);

        if (rng() < 0.5)
            fctx.fillRect(x, y + T, T, T);

    }

}

// Rebuilds the offscreen floor for the current theme/size if
// it isn't already current.
function ensureFloorTexture() {

    if (canvas.width === 0 || canvas.height === 0)
        return null;

    const sig = `${Arena.theme}:${canvas.width}x${canvas.height}`;

    if (floorCanvas && floorSig === sig)
        return floorCanvas;

    if (!floorCanvas)
        floorCanvas = document.createElement("canvas");

    floorCanvas.width = canvas.width;
    floorCanvas.height = canvas.height;

    const fctx = floorCanvas.getContext("2d");
    fctx.imageSmoothingEnabled = false;
    fctx.clearRect(0, 0, canvas.width, canvas.height);

    // Seed from size so a resize reshuffles but a redraw never
    // does; XOR a per-theme salt so the floors all differ.
    const salt =
        Arena.theme === "castle" ? 0x1a2b :
        Arena.theme === "night" ? 0x51de :
        isGreenTheme() ? 0x2c91 :
        Arena.theme === "storm" ? 0x6ad4 : 0x7403;

    const rng = makeFloorRng((canvas.width * 73856093) ^ (canvas.height * 19349663) ^ salt);

    if (isGreenTheme()) {

        // Pale marble terrace inset inside a planted border on
        // all four sides. The border matters: the trees are
        // planted in it, and without it they stood in the middle
        // of the paving looking like they had grown through it.
        const hedgeY = snapTexel(canvas.height * 0.11);
        const hedgeX = snapTexel(canvas.width * GARDEN_BORDER);

        // The court's paving goes from pale marble in the rose
        // garden to bare leaf litter out in the grove - the one
        // change that does the most to say how far from the
        // castle you have walked.
        const V = greenVariant();

        paintPixelStone(fctx, 0, 0, canvas.width, canvas.height,
                        V.floor, rng, { tile: 40 });

        paintPixelHedge(fctx, 0, 0, canvas.width, hedgeY, rng);
        paintPixelHedge(fctx, 0, canvas.height - hedgeY, canvas.width, hedgeY, rng);
        paintPixelHedge(fctx, 0, 0, hedgeX, canvas.height, rng);
        paintPixelHedge(fctx, canvas.width - hedgeX, 0, hedgeX, canvas.height, rng);

        // Petals drift across the open court only - and only the
        // tended one has roses to shed them.
        if (Arena.theme === "garden")
            paintRosePetals(fctx, hedgeX, hedgeY,
                            canvas.width - hedgeX * 2,
                            canvas.height - hedgeY * 2, rng, 90);

        // Overall wash, baked in rather than drawn live: it is a
        // property of the ground, not of the light.
        if (V.tint) {
            fctx.fillStyle = V.tint;
            fctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Bushes, beds and benches straight into the bitmap. They
        // are static for the whole band, so there is no reason to
        // pay for them once a frame - see drawArenaProps.
        drawArenaProps(fctx);

        floorSig = sig;

        return floorCanvas;

    }

    if (Arena.theme === "storm") {

        // Rain-soaked flagstone, cold and cracked.
        paintPixelStone(fctx, 0, 0, canvas.width, canvas.height,
                        [46, 52, 62], rng, { tile: 56 });

        // Standing water. Built as rows of varying width so each
        // pool is a blobby texel shape rather than an ellipse,
        // with a pale sky reflection caught along its top lip -
        // that highlight is what makes the floor read as WET
        // rather than just dark.
        const T = FLOOR_TEXEL;

        // Keep pools clear of the stumps. The floor is baked after
        // generateStormRuin has run, so the stump footprints are
        // known here - a puddle drawn under standing stone read as
        // water running THROUGH the pillar.
        const blocked = Arena.pillars.map(s => {

            const half = s.width / 2;
            const sh = s.stumpH ?? s.width * 0.55;

            return {
                x: s.x - half - 26,
                y: s.y + 40 - sh - 18,
                w: s.width + 52,
                h: sh + 62
            };

        });

        const clashes = (x, y, w, h) => blocked.some(r =>
            x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);

        for (let i = 0; i < 16; i++) {

            const pw = snapTexel(70 + rng() * 150);
            const ph = snapTexel(30 + rng() * 70);

            // Rejection-sample a clear spot; if this pool can't
            // find one, drop it rather than force an overlap.
            let px = 0;
            let py = 0;
            let placed = false;

            for (let attempt = 0; attempt < 24; attempt++) {

                px = snapTexel(rng() * canvas.width);
                py = snapTexel(rng() * canvas.height);

                if (!clashes(px - pw / 2, py, pw, ph)) {
                    placed = true;
                    break;
                }

            }

            if (!placed)
                continue;

            for (let y = 0; y < ph; y += T) {

                const t = y / ph;
                const bulge = Math.sin(t * Math.PI);
                const w = snapTexel(pw * (0.4 + bulge * 0.6));
                const x = snapTexel(px - w / 2);

                if (w <= 0)
                    continue;

                fctx.fillStyle = "rgba(20, 30, 44, 0.72)";
                fctx.fillRect(x, py + y, w, T);

                if (y < T * 2) {
                    fctx.fillStyle = "rgba(158, 188, 222, 0.22)";
                    fctx.fillRect(x, py + y, w, T);
                }

            }

        }

        floorSig = sig;

        return floorCanvas;

    }

    if (Arena.theme === "castle") {

        const { wallY, cx, pathW } = getCastleLayout();

        // Keep flagstones above the wall, lawn below it.
        //
        // The interior stone is deliberately darker and cooler
        // than it used to be: inside and outside were reading as
        // the same place in two shades, and the whole point of
        // this arena is that you are fighting across a threshold.
        // The lighting pass leans on the same split.
        // Both stones carry their own colour rather than relying
        // on the lighting to tint them: the interior a cool
        // blue-grey, the approach a warm sandstone. Read against
        // each other they say "shade" and "sun" before a single
        // light has been drawn - which is why neither needs to be
        // pushed far to do it.
        paintPixelStone(fctx, 0, 0, canvas.width, wallY, [34, 41, 53], rng, { tile: 44 });
        paintPixelGrass(fctx, 0, wallY, canvas.width, canvas.height - wallY, rng);

        // Cobblestone approach up the middle, clipped to path.
        fctx.save();
        fctx.beginPath();
        fctx.rect(cx - pathW / 2, wallY, pathW, canvas.height - wallY);
        fctx.clip();
        paintPixelStone(
            fctx,
            snapTexel(cx - pathW / 2), wallY,
            snapTexel(pathW), canvas.height - wallY,
            // Lighter than the lawn it runs through. Pale stone in
            // open daylight reflects more than grass does, and at
            // a darker value the approach read as a trench of mud
            // rather than as a paved path.
            [104, 94, 76], rng, { tile: 24 }
        );
        fctx.restore();

    } else {

        // Throne + night share the same dungeon-stone floor.
        paintPixelStone(fctx, 0, 0, canvas.width, canvas.height, [43, 41, 39], rng, { tile: 52 });

    }

    floorSig = sig;

    return floorCanvas;

}

function drawArenaFloor() {

    const tex = ensureFloorTexture();

    if (tex)
        ctx.drawImage(tex, 0, 0);
    else {
        // Pre-size fallback so the frame isn't transparent.
        ctx.fillStyle = "#2b2927";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Per-theme ground layers.
    //
    // NOTE: this deliberately does NOT return early per theme.
    // The castle branch used to, which silently skipped the three
    // shared layers below it - the courtyard ended up with no set
    // piece, no props and no decals at all, so kills in waves 1-5
    // left no mark. Theme-specific work goes in here; anything
    // every arena needs goes after.
    if (Arena.theme === "castle") {

        // The wall, towers and gate are architecture, not
        // ground - still drawn live over the baked floor.
        drawCastleWall();

    } else if (Arena.theme === "throne" || Arena.theme === "night") {

        // The rose court and the storm ruin have their own baked
        // floor treatments, so the carpet stays with the two
        // throne-approach arenas.
        // The throne room's runner stops at the foot of the dais
        // (see THRONE_DAIS_BOTTOM); the night hall has no throne
        // in it, so its carpet runs the full length.
        drawRedCarpet(Arena.theme === "throne" ? THRONE_DAIS_BOTTOM * canvas.height : 0);

    }

    // The room's focal object, then ground dressing, then the
    // fight's own marks - all on top of the baked floor but under
    // everything that moves. Every theme gets these.
    drawArenaSetPiece();

    // ...except the green arenas, which already have their props
    // baked into the floor bitmap (see ensureFloorTexture). Their
    // planting is dense enough that drawing it live cost more
    // than everything else in the frame put together.
    if (!isGreenTheme())
        drawArenaProps();

    drawArenaDecals();

}

// The castle-entrance GROUND (keep flagstones, courtyard
// lawn, cobble approach) is now baked into the pixel floor
// texture - see ensureFloorTexture. drawArenaFloor blits that
// and then calls drawCastleWall directly for the architecture.

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

        // Contact shadow thrown down onto the courtyard, so the
        // wall reads as a solid mass standing on the ground
        // rather than a band painted across the screen.
        ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
        ctx.fillRect(x0, wallY + 10, w, 14);

        ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
        ctx.fillRect(x0, wallY + 24, w, 10);

        // Higher contrast top-to-bottom than before - the wall was
        // reading as half-transparent, and a flatter gradient was
        // part of why.
        let stone = ctx.createLinearGradient(0, top, 0, wallY + 10);
        stone.addColorStop(0, "#5d636e");
        stone.addColorStop(0.5, "#3a3f47");
        stone.addColorStop(1, "#15171c");

        ctx.fillStyle = stone;
        ctx.fillRect(x0, top, w, wallH);

        // Inside face catches a sliver of light.
        ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
        ctx.fillRect(x0, top, w, 3);

        // Hard edges top and bottom to keep the silhouette crisp.
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(x0, top - 2, w, 2);
        ctx.fillRect(x0, wallY - 3, w, 3);

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

function drawRedCarpet(topY = 0) {

    // Snapped to the floor's block grid and drawn in stepped
    // bands rather than smooth gradients, so it reads as pixel
    // pile like the stone around it. It's a handful of
    // fillRects, so drawing it live each frame is cheap.
    //
    // topY lets the runner START below something. The throne room
    // passes the foot of the dais: a carpet that ran under the
    // throne would read as the throne standing on the rug, when
    // the whole point of the runner is that it LEADS to the dais
    // and stops there.

    const T = FLOOR_TEXEL;
    const q = v => Math.round(v / T) * T;
    const top = q(topY);
    const runLength = canvas.height - top;

    const cx = q(canvas.width / 2);
    const half = q(canvas.width * 0.13);
    const left = cx - half;
    const carpetWidth = half * 2;
    const trimWidth = Math.max(T * 2, q(carpetWidth * 0.05));

    ctx.save();

    // Soft contact shadow so the carpet reads as sitting on
    // the floor instead of painted onto it.
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(left - T, top, carpetWidth + T * 2, runLength);

    // Red body in vertical bands: a lit column down the middle
    // stepping to darker pile at the edges.
    const bodyBands = [
        "#4a0c14", "#6e1220", "#8f1626", "#6e1220", "#4a0c14"
    ];

    const bandW = q(carpetWidth / bodyBands.length);

    bodyBands.forEach((color, i) => {

        const bx = left + i * bandW;
        const w = i === bodyBands.length - 1 ? left + carpetWidth - bx : bandW;

        ctx.fillStyle = color;
        ctx.fillRect(bx, top, w, runLength);

    });

    // Gold trim down both sides - three stepped columns per
    // side (dark / bright / dark) instead of a gradient.
    [left, left + carpetWidth - trimWidth].forEach(x => {

        const step = Math.max(T, Math.round(trimWidth / 3 / T) * T);

        ["#7a5c14", "#d4af37", "#7a5c14"].forEach((color, i) => {

            ctx.fillStyle = color;
            ctx.fillRect(x + i * step, top, i === 2 ? trimWidth - 2 * step : step, runLength);

        });

    });

    // Dark seam where the trim meets the red.
    ctx.fillStyle = "rgba(30, 5, 8, 0.6)";
    ctx.fillRect(left + trimWidth, top, T, runLength);
    ctx.fillRect(left + carpetWidth - trimWidth - T, top, T, runLength);

    // Gold diamond motifs down the center, built from stacked
    // pixel rows so the edges stay stepped.
    const spacing = 140;
    const size = q(carpetWidth * 0.06);

    ctx.fillStyle = "rgba(212, 175, 55, 0.55)";

    for (let cyc = top + q(spacing / 2); cyc < canvas.height; cyc += spacing) {

        for (let dy = -size; dy < size; dy += T) {

            const rowW = q((size - Math.abs(dy)) * 2);

            ctx.fillRect(cx - rowW / 2, cyc + dy, rowW, T);

        }

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

    // The sun, off-screen to the right, for the arenas that have
    // one in frame.
    //
    // The castle used to answer here too, with a sun parked below
    // the bottom of the map. It doesn't any more: that courtyard
    // is lit from overhead, which has no direction to point at
    // from a bird's-eye view. See the castle branch of
    // drawLightingSystem.
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

        // ---- night throne room: lit by torchlight rather than
        // sun, but no longer a blackout. An earlier pass ran this
        // near-opaque with a moonbeam in the middle, which made
        // most of the arena unreadable; the cold cast and the warm
        // torch pools still set the mood, but you can actually see
        // what is walking at you. ----

        ctx.fillStyle = "rgba(12, 16, 34, 0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pulse = Math.sin(Date.now() / 90) * 6;
        const flicker = Math.sin(Date.now() / 47) * 4;

        Arena.torches.forEach(t => {

            const radius = 430 + pulse + flicker;

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

        ctx.restore();
        return;

    }

    if (isGreenTheme()) {

        // Each green arena gets its own hour. The rose court is a
        // warm dusk; the maze is later and colder; the grove is
        // under a closed canopy with almost no sky left; the
        // storm grove has no sun at all, only the storm.
        //
        // This is the cheapest thing that stops four variations
        // of one generator reading as the same place four times,
        // and it costs one lookup.
        const GV = {
            garden:     { sky: "rgba(34, 24, 58, 0.34)", mid: "rgba(40, 30, 62, 0.14)",
                          sunA: "rgba(255, 198, 138, 0.52)", sunB: "rgba(250, 172, 126, 0.24)" },
            maze:       { sky: "rgba(26, 22, 52, 0.46)", mid: "rgba(30, 28, 56, 0.24)",
                          sunA: "rgba(240, 168, 122, 0.38)", sunB: "rgba(214, 140, 118, 0.18)" },
            grove:      { sky: "rgba(14, 26, 22, 0.56)", mid: "rgba(18, 32, 26, 0.34)",
                          sunA: "rgba(190, 224, 150, 0.24)", sunB: "rgba(150, 190, 130, 0.12)" },
            stormGrove: { sky: "rgba(14, 20, 38, 0.62)", mid: "rgba(18, 26, 44, 0.4)",
                          sunA: "rgba(150, 185, 235, 0.2)", sunB: "rgba(120, 150, 200, 0.1)" }
        }[Arena.theme] ?? {
            sky: "rgba(34, 24, 58, 0.34)", mid: "rgba(40, 30, 62, 0.14)",
            sunA: "rgba(255, 198, 138, 0.52)", sunB: "rgba(250, 172, 126, 0.24)"
        };

        // ---- rose court: dusk. A violet sky wash settling over
        // the whole garden, warm amber sunset low on the right
        // where the sun is going down, and the lanterns picking
        // up the slack. Bright enough to read clearly, but
        // unmistakably evening rather than daylight. ----

        // Kept light: too much violet turned the marble to mud
        // rather than reading as pale stone at dusk.
        let dusk = ctx.createLinearGradient(0, 0, 0, canvas.height);
        dusk.addColorStop(0, GV.sky);
        dusk.addColorStop(0.5, GV.mid);
        dusk.addColorStop(1, GV.sky);

        ctx.fillStyle = dusk;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const sun = getLightSource();

        let sunset = ctx.createRadialGradient(
            sun.x, sun.y, 0,
            sun.x, sun.y, canvas.width * 1.05
        );

        sunset.addColorStop(0, GV.sunA);
        sunset.addColorStop(0.45, GV.sunB);
        sunset.addColorStop(1, "rgba(210, 140, 130, 0)");

        ctx.fillStyle = sunset;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Lantern pools - cooler and softer than a torch.
        const sway = Math.sin(Date.now() / 220) * 4;

        Arena.torches.forEach(t => {

            let lamp = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 130 + sway);
            lamp.addColorStop(0, "rgba(255, 214, 150, 0.34)");
            lamp.addColorStop(0.5, "rgba(255, 190, 130, 0.14)");
            lamp.addColorStop(1, "rgba(255, 180, 120, 0)");

            ctx.fillStyle = lamp;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 130 + sway, 0, Math.PI * 2);
            ctx.fill();

        });

        ctx.restore();
        return;

    }

    if (Arena.theme === "storm") {

        // ---- storm-broken ruin: no roof and no sun. A cold
        // overcast base, the braziers holding small warm pools
        // against it, and lightning periodically flooding the
        // whole floor. ----

        ctx.fillStyle = "rgba(16, 22, 34, 0.62)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Diffuse grey daylight leaking through the broken roof,
        // strongest toward the middle where the span collapsed.
        let overcast = ctx.createRadialGradient(
            canvas.width / 2, canvas.height * 0.42, 0,
            canvas.width / 2, canvas.height * 0.42, canvas.width * 0.7
        );

        overcast.addColorStop(0, "rgba(150, 175, 210, 0.2)");
        overcast.addColorStop(0.5, "rgba(120, 145, 180, 0.09)");
        overcast.addColorStop(1, "rgba(90, 110, 145, 0)");

        ctx.fillStyle = overcast;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Brazier pools - wind-thrashed, so they flicker harder
        // and reach less far than a sheltered torch would.
        const gust = Math.sin(Date.now() / 61) * 9 + Math.sin(Date.now() / 143) * 6;

        Arena.torches.forEach(t => {

            const radius = 210 + gust;

            let fire = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
            fire.addColorStop(0, "rgba(255, 172, 74, 0.44)");
            fire.addColorStop(0.45, "rgba(226, 124, 44, 0.18)");
            fire.addColorStop(1, "rgba(170, 80, 30, 0)");

            ctx.fillStyle = fire;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.fill();

        });

        // Lightning washing the floor.
        const flash = getStormFlash();

        if (flash > 0) {

            // Deliberately short of a whiteout: at full strength
            // a heavier wash than this loses the enemies for a
            // beat, which is not a fair trade during a boss fight.
            ctx.fillStyle = `rgba(198, 218, 255, ${flash * 0.28})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

        }

        ctx.restore();
        return;

    }

    if (Arena.theme === "castle") {

        // ---- castle-entrance lighting ----
        //
        // The fiction, stated once because every pass below
        // follows from it: it is the middle of the day, the
        // courtyard is open to the sky, and the hall behind the
        // wall is not. Sun from overhead lights open ground
        // EVENLY. The hall gets only what comes through the gate
        // and what its own sconces give it. That contrast - flat
        // daylight against a dim interior - is the whole idea, and
        // it does not need either side pushed to an extreme to
        // read.
        //
        // What used to be here was a sun parked off the bottom of
        // the map throwing a radial wash up the screen, an
        // "overlay" pass on top of it to force the colour back,
        // and a hot rim along the bottom edge. Seen from directly
        // above, none of that made sense: the grass nearest the
        // camera was lit like a floodlit stage while the grass by
        // the wall went dull, on ground that is all one flat lawn.
        // Stacked, they also blew the whole arena out.

        // Layout first - every pass below keys off the wall line.
        // Only the wall line, now: nothing in here needs the gate
        // any more.
        const { wallY, wallH } = getCastleLayout();
        const wallTop = wallY - wallH;

        // 1. Daylight on the courtyard: flat, and visibly warm.
        //
        // No gradient, because overhead light on level ground
        // hasn't got one - but it does have a COLOUR, and it needs
        // to be strong enough to see. At 0.07 of a near-white this
        // was doing nothing at all: the lawn was just its own
        // green, so the courtyard read as unlit ground rather than
        // as ground in sunshine, and there was nothing out here
        // for the light coming through the gate to match.
        ctx.fillStyle = `rgba(${CASTLE_SUN}, 0.16)`;
        ctx.fillRect(0, wallY, canvas.width, canvas.height - wallY);

        // 2. A soft darkening into the corners of the frame.
        //
        // This is the camera, not a light: it has no source and no
        // direction, so it can sit over a scene lit from overhead
        // without contradicting it, and it keeps the eye in the
        // middle of the arena where the fight is.
        let vignette = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.45,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.95
        );

        vignette.addColorStop(0, "rgba(12, 14, 18, 0)");
        vignette.addColorStop(1, "rgba(12, 14, 18, 0.3)");

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Interior shade: the keep sits out of the sun, so it
        // reads dimmer and cooler, fading out right at the wall.

        // Every interior pass below stops at the TOP of the wall
        // (wallTop, set above), not at wallY. Running them to
        // wallY laid shadow over the masonry itself, which is what
        // made the wall look half-transparent - it was being
        // washed by the same gradients meant for the floor behind
        // it.
        //
        // Eased back now the courtyard isn't being floodlit: the
        // inside/outside split is carried by the difference
        // between the two, so with the glare gone from the lawn
        // the hall no longer has to be nearly black to read as
        // indoors.
        let indoor = ctx.createLinearGradient(0, 0, 0, wallTop);
        // Held short of a blackout: enemies spawn and walk in
        // through this half, and they have to stay readable in
        // the corners the sconces don't reach.
        indoor.addColorStop(0, "rgba(8, 11, 20, 0.44)");
        indoor.addColorStop(0.75, "rgba(10, 14, 24, 0.32)");
        indoor.addColorStop(1, "rgba(12, 16, 26, 0.04)");

        ctx.fillStyle = indoor;
        ctx.fillRect(0, 0, canvas.width, wallTop);

        // Deep shadow at the very top - the far end of the hall,
        // away from the doorway, with no light reaching it.
        let ceiling = ctx.createLinearGradient(0, 0, 0, wallY * 0.42);
        ceiling.addColorStop(0, "rgba(2, 4, 10, 0.3)");
        ceiling.addColorStop(1, "rgba(2, 4, 10, 0)");

        ctx.fillStyle = ceiling;
        ctx.fillRect(0, 0, canvas.width, wallY * 0.42);

        // Warm sconces burning down the inside walls - the only
        // light in the keep that isn't coming through the gate,
        // and the clearest signal that this half is indoors.
        const sconceGlow = Math.sin(Date.now() / 140) * 6;

        [0.12, 0.32, 0.68, 0.88].forEach(f => {

            const sx = canvas.width * f;
            const sy = wallY * 0.34;
            const rad = 120 + sconceGlow;

            let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
            g.addColorStop(0, "rgba(255, 176, 88, 0.4)");
            g.addColorStop(0.5, "rgba(226, 132, 52, 0.15)");
            g.addColorStop(1, "rgba(180, 90, 30, 0)");

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(sx, sy, rad, 0, Math.PI * 2);
            ctx.fill();

            // The sconce itself.
            ctx.fillStyle = "#2a2016";
            ctx.fillRect(sx - 3, sy - 4, 6, 16);

            ctx.shadowBlur = 16;
            ctx.shadowColor = "#ffae42";
            ctx.fillStyle = "#ffc35e";

            ctx.beginPath();
            ctx.ellipse(sx, sy - 10 + sconceGlow * 0.3, 5, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

        });

        // Threshold shade: the doorway's own shadow thrown onto
        // the flagstones just INSIDE the wall - so it sits above
        // wallTop, never on the stonework.
        let thresh = ctx.createLinearGradient(0, wallTop, 0, wallTop - 52);
        thresh.addColorStop(0, "rgba(0, 0, 0, 0.45)");
        thresh.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = thresh;
        ctx.fillRect(0, wallTop - 52, canvas.width, 52);

        // NOTE: nothing here for light coming through the gate,
        // deliberately. The hall is dark, and the doorway is a
        // hole in a wall rather than a lamp. Several goes at
        // painting sun on the flagstones inside all read as
        // something glowing in its own right rather than as
        // daylight, so the arena is better off without it.

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

    // Light enough that an enemy outside a torch pool is dimmed
    // rather than invisible - see the note in drawLightingSystem.
    vctx.fillStyle = "rgba(6, 9, 22, 0.4)";
    vctx.fillRect(0, 0, canvas.width, canvas.height);

    // Punch a flickering hole of visibility around each torch:
    // fully clear near the flame, fading back to full darkness
    // at the pool's edge.
    vctx.globalCompositeOperation = "destination-out";

    const pulse = Math.sin(Date.now() / 90) * 6;
    const flicker = Math.sin(Date.now() / 47) * 4;

    Arena.torches.forEach(t => {

        const radius = 420 + pulse + flicker;

        let hole = vctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, radius);
        hole.addColorStop(0, "rgba(0, 0, 0, 1)");
        hole.addColorStop(0.5, "rgba(0, 0, 0, 0.92)");
        hole.addColorStop(1, "rgba(0, 0, 0, 0)");

        vctx.fillStyle = hole;
        vctx.beginPath();
        vctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
        vctx.fill();

    });

    vctx.globalCompositeOperation = "source-over";

    ctx.drawImage(nightVeilCanvas, 0, 0);

}

// The screen rect a foreground occluder actually covers.
//
// A pillar is a full-height shaft, so it occludes everything
// from the top of the screen down to its base - that's the
// default. The garden's trees and the ruin's stumps only
// cover their own silhouette, so they set `top` and get an
// honest rect instead of a full-height strip (which would
// x-ray a column of empty air above them).

function getOccluderRect(p) {

    const top = p.top ?? 0;
    const bottom = p.y + 40;

    // A pillar's silhouette is exactly its shaft width, but a
    // tree canopy is far wider than the trunk it's declared with -
    // without this override anything standing behind the outer
    // half of the foliage got no x-ray outline at all.
    const width = p.occWidth ?? p.width;

    return {
        x: p.x - width / 2,
        y: top,
        width,
        height: Math.max(0, bottom - top)
    };

}

// The occluder's real silhouette, as a path, for the x-ray clip.
//
// A pillar fills its rect exactly, so it returns null and the
// caller just clips to the bounds. A tree and a stump don't -
// clipping those to a box showed outlines floating in the gaps
// between the branches and the broken crown, so they trace their
// actual shape instead. Both tracers are built from the same
// numbers their draw functions use.

function getOccluderClip(p) {

    if (p.kind === "tree")
        return c => traceGardenTreePath(c, p);

    if (p.kind === "stump")
        return c => traceStormStumpPath(c, p);

    return null;

}

function traceGardenTreePath(c, p) {

    const baseY = p.y + 40;

    const trunkH = p.width * TREE_TRUNK_H;
    const trunkTop = baseY - trunkH;
    const trunkHalf = p.width * TREE_TRUNK_HALF;

    const canopyBottom = trunkTop + p.width * TREE_CANOPY_OVERLAP;
    const canopyH = p.width * TREE_CANOPY_H;
    const canopyTop = canopyBottom - canopyH;
    const halfMax = p.width * TREE_CANOPY_HALF;

    // Trunk.
    c.rect(p.x - trunkHalf, trunkTop, trunkHalf * 2, baseY - trunkTop);

    // One triangle per canopy tier.
    TREE_TIERS.forEach(tier => {

        const tTop = canopyTop + canopyH * tier.top;
        const tBottom = tTop + canopyH * tier.h;
        const half = halfMax * tier.half;

        c.moveTo(p.x, tTop);
        c.lineTo(p.x + half, tBottom);
        c.lineTo(p.x - half, tBottom);
        c.closePath();

    });

}

function traceStormStumpPath(c, p) {

    const baseY = p.y + 40;
    const h = p.stumpH ?? p.width * 0.55;
    const top = baseY - h;
    const half = p.width / 2;

    const U = 6;
    const snap = v => Math.round(v / U) * U;
    const seed = Math.abs(Math.round(p.x)) % 7;

    const cols = Math.max(4, Math.round(p.width / U));
    const colW = Math.max(U, snap(p.width / cols));

    // Same per-column break heights drawStormStump uses, so the
    // clip lines up with the ragged crown exactly.
    for (let i = 0; i < cols; i++) {

        const x = snap(p.x - half + i * (p.width / cols));
        const bite = ((i * 7 + seed * 3) % 5) * U;
        const colTop = snap(top + bite);

        c.rect(x, colTop, colW, snap(baseY) - colTop);

    }

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

// =====================================
// FLOOR DECALS
// =====================================
//
// The marks a fight leaves on the ground: scorch where fire
// burned, cracks where something heavy landed, splatter where an
// enemy died, frost where a chill zone sat, and footprints.
//
// Each decal stores its own birth time and lifetime and fades off
// Date.now(), so nothing has to tick them - the only bookkeeping
// is dropping expired ones (see pruneArenaDecals, called from
// cleanupEntities) and the hard cap below.
//
// Capped because a long Endless run would otherwise pile up
// thousands of them and the floor pass would crawl.

const DECAL_LIMIT = 90;

const DECAL_TTL = {
    scorch: 26000,
    crack: 34000,
    splat: 30000,
    frost: 12000,
    step: 5200
};

function addArenaDecal(kind, x, y, opts = {}) {

    if (!DECAL_TTL[kind])
        return;

    if (canvas.width === 0)
        return;

    Arena.decals.push({
        kind,
        x,
        y,
        r: opts.r ?? 26,
        color: opts.color ?? null,
        angle: opts.angle ?? Math.random() * Math.PI * 2,
        seed: Math.floor(Math.random() * 1000),
        born: Date.now(),
        ttl: opts.ttl ?? DECAL_TTL[kind]
    });

    // Oldest out first once we're over the cap.
    if (Arena.decals.length > DECAL_LIMIT)
        Arena.decals.splice(0, Arena.decals.length - DECAL_LIMIT);

}

// Footprints. Called every frame from update(); only actually
// leaves a mark once the player has covered enough ground, so the
// trail is spaced like steps rather than a solid smear.
//
// What a step looks like is per-arena: dust on dry stone, a
// darker crush on grass, a wet print in the rain.

let lastStepX = null;
let lastStepY = null;

function trackPlayerFootsteps() {

    if (typeof player === "undefined" || !player)
        return;

    const cx = player.x + player.size / 2;
    const cy = player.y + player.size * 0.92;

    if (lastStepX === null) {

        lastStepX = cx;
        lastStepY = cy;

        return;

    }

    if (Math.hypot(cx - lastStepX, cy - lastStepY) < 34)
        return;

    lastStepX = cx;
    lastStepY = cy;

    const look =
        Arena.theme === "storm"
            ? { color: "rgba(150, 180, 215, 0.9)", r: 7 }
            : isGreenTheme()
                ? { color: "rgba(40, 56, 34, 0.9)", r: 6 }
                : { color: "rgba(90, 82, 70, 0.9)", r: 6 };

    addArenaDecal("step", cx, cy, {
        r: look.r,
        color: look.color,
        angle: Math.random() * 0.6 - 0.3
    });

}

function pruneArenaDecals() {

    if (Arena.decals.length === 0)
        return;

    const now = Date.now();

    Arena.decals = Arena.decals.filter(d => now - d.born < d.ttl);

}

// Which expiring hazards leave a mark, keyed by class name.
//
// Hooked once from cleanupEntities rather than from inside each
// hazard class - the hazards already know when they're finished,
// and one lookup here beats editing every one of them.

const HAZARD_DECALS = {
    FireCast: "scorch",
    BurningGround: "scorch",
    MagusFirestorm: "scorch",
    MeteorStrike: "scorch",
    RoyalJudgmentStrike: "scorch",
    FireWall: "scorch",
    KegKillZone: "scorch",
    ClusterBomb: "scorch",
    LightningStrike: "scorch",
    FrostZone: "frost",
    MageIceField: "frost"
};

function noteHazardDecal(hazard) {

    const kind = HAZARD_DECALS[hazard?.constructor?.name];

    if (!kind)
        return;

    const r = hazard.radius ?? hazard.r ?? 40;

    // Hazards report a centre point directly (unlike entities,
    // which are top-left + size).
    addArenaDecal(kind, hazard.x, hazard.y, { r: r * 0.85 });

}

function drawArenaDecals() {

    if (Arena.decals.length === 0)
        return;

    const now = Date.now();

    ctx.save();

    Arena.decals.forEach(d => {

        const age = now - d.born;

        if (age >= d.ttl)
            return;

        // Hold full strength for the first half of the life, then
        // fade - a mark that starts fading immediately never reads
        // as having been burned into the floor.
        const t = age / d.ttl;
        const fade = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;

        if (d.kind === "scorch") {

            drawPixelDisc(d.x, d.y, d.r, {
                color: "#140f0c",
                alpha: 0.5 * fade,
                unit: Math.max(3, Math.round(d.r * 0.1)),
                dither: 0.45
            });

            drawPixelDisc(d.x, d.y, d.r * 0.55, {
                color: "#0a0706",
                alpha: 0.45 * fade,
                unit: Math.max(3, Math.round(d.r * 0.09)),
                dither: 0.3
            });

            return;

        }

        if (d.kind === "frost") {

            drawPixelDisc(d.x, d.y, d.r, {
                color: "#bfe8ff",
                alpha: 0.3 * fade,
                unit: Math.max(3, Math.round(d.r * 0.1)),
                dither: 0.55
            });

            return;

        }

        if (d.kind === "splat") {

            ctx.globalAlpha = 0.42 * fade;
            ctx.fillStyle = d.color ?? "#5a1420";

            // A few blobs around the centre rather than one disc,
            // so kills read as splatter.
            for (let i = 0; i < 5; i++) {

                const a = d.angle + i * 1.31;
                const dist = d.r * (0.15 + ((i + d.seed) % 3) * 0.26);
                const rr = d.r * (0.3 - i * 0.035);

                ctx.beginPath();
                ctx.ellipse(d.x + Math.cos(a) * dist,
                            d.y + Math.sin(a) * dist * 0.7,
                            Math.max(2, rr), Math.max(1.5, rr * 0.7),
                            a, 0, Math.PI * 2);
                ctx.fill();

            }

            ctx.globalAlpha = 1;

            return;

        }

        if (d.kind === "crack") {

            ctx.globalAlpha = 0.4 * fade;
            ctx.strokeStyle = "#100d0b";
            ctx.lineWidth = 2.5;

            ctx.beginPath();

            // Radiating fissures, each stepping outward with a
            // kink so they don't look like drawn spokes.
            for (let i = 0; i < 7; i++) {

                const a = d.angle + i * (Math.PI * 2 / 7);
                const len = d.r * (0.55 + ((i + d.seed) % 4) * 0.16);

                let px = d.x;
                let py = d.y;

                ctx.moveTo(px, py);

                for (let s = 1; s <= 3; s++) {

                    const wob = ((i + s + d.seed) % 3 - 1) * 0.34;

                    px += Math.cos(a + wob) * (len / 3);
                    py += Math.sin(a + wob) * (len / 3);

                    ctx.lineTo(px, py);

                }

            }

            ctx.stroke();
            ctx.globalAlpha = 1;

            return;

        }

        if (d.kind === "step") {

            ctx.globalAlpha = 0.3 * fade;
            ctx.fillStyle = d.color ?? "rgba(0, 0, 0, 1)";

            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, d.angle, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;

        }

    });

    ctx.restore();

}

// Where shadows in this arena are cast FROM, and how dark they
// land. Shared by the occluder shadows and the entity contact
// shadows so the two can never disagree about the light.
//
// getLightSource() answers for the DIRECTIONAL arenas (an
// off-screen sun), which is right for castle/throne/garden. The
// storm ruin is lit from the broken span overhead rather than
// from one side, so its shadows radiate outward from the middle
// instead of all leaning the same way.

function getArenaShadowLight() {

    if (Arena.theme === "storm")
        return { x: canvas.width / 2, y: canvas.height * 0.42, centre: true };

    const l = getLightSource();

    return { x: l.x, y: l.y, centre: false };

}

// Softer where the arena itself is dim - a hard black wedge under
// broken stone in the rain looks pasted on.

function getArenaShadowStrength() {

    if (Arena.theme === "storm" || isGreenTheme())
        return 0.3;

    return 0.45;

}

// Contact shadows for everything that moves.
//
// Only the scenery cast shadows before this, which left the
// player, the enemies and the bosses visually floating over the
// floor. Drawn as one pass before the entity draws (see
// drawPlayingScene) rather than per-entity, so the whole cast is
// grounded consistently and it costs one save/restore.

function drawEntityShadows() {

    if (typeof player === "undefined" || !player)
        return;

    const light = getArenaShadowLight();

    // Two arenas have no usable light direction, so their shadows
    // drop straight down instead of leaning: night is lit only by
    // its own torches, and the castle courtyard is lit from
    // overhead, which from a bird's-eye view points nowhere.
    const directional =
        Arena.theme !== "night" && Arena.theme !== "castle";

    ctx.save();

    const cast = ent => {

        if (!ent)
            return;

        // A concealed enemy casts nothing - a shadow on the floor
        // is exactly as much of a giveaway as a body.
        if (ent.isConcealed?.())
            return;

        const size = ent.size ?? 32;

        const cx = ent.x + size / 2;
        const feet = ent.y + size * 0.92;

        // Airborne things throw a smaller, fainter shadow - the
        // Prince's leap is the obvious one, and it reads as real
        // height rather than him sliding.
        const airborne = ent.leaping === true;

        let ox = 0;
        let oy = 0;

        if (directional) {

            const dx = cx - light.x;
            const dy = feet - light.y;
            const d = Math.hypot(dx, dy) || 1;

            ox = (dx / d) * size * 0.16;
            oy = (dy / d) * size * 0.1;

        }

        const rx = size * (airborne ? 0.34 : 0.5);
        const ry = rx * 0.44;

        // Two stacked ellipses - a wide soft one plus a tighter,
        // darker core. A single flat ellipse measured only ~16
        // levels of darkening and read as nothing on a busy floor;
        // the core is what actually plants the feet.
        const base = (airborne ? 0.18 : 0.34) * (Arena.theme === "night" ? 0.75 : 1);

        ctx.fillStyle = `rgba(0, 0, 0, ${base * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(cx + ox, feet + oy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(0, 0, 0, ${base})`;
        ctx.beginPath();
        ctx.ellipse(cx + ox, feet + oy, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();

    };

    cast(player);
    Game.enemies.forEach(cast);

    // The Thief's decoy is a body on the floor too.
    if (Game.tauntDecoy && !Game.tauntDecoy.isDead?.())
        cast(Game.tauntDecoy);

    ctx.restore();

}

function drawPillarShadows() {

    // No off-screen sun at night - the base torches are the
    // only light, so directional cast shadows would point the
    // wrong way. The night lighting pass handles depth instead.
    if (Arena.theme === "night")
        return;

    const light = getArenaShadowLight();
    const centreLit = light.centre;
    const strength = getArenaShadowStrength();

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

        // Scale the shadow off whatever the thing actually looks
        // like, not its declared width - a tree's canopy throws a
        // far wider shadow than its trunk would.
        const castWidth = p.shadowWidth ?? p.occWidth ?? p.width;

        const halfWidth = castWidth * 0.55;
        const tipHalfWidth = halfWidth * 0.5;

        const shadowLength = castWidth * (centreLit ? 2.2 : 3.2);

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

        gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
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

    if (isGreenTheme()) {

        Arena.pillars.forEach(p => drawGardenTree(p));

        return;

    }

    if (Arena.theme === "storm") {

        Arena.pillars.forEach(p => drawStormStump(p));

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
    LeylineVortex: "#a57dff",
    MeteorStrike: "#ff5a3c",
    LightningStrike: "#ffeb78",
    ArcaneNova: "#5f7dff",
    MirrorDecoy: "#b06ae0",
    RoyalJudgmentStrike: "#ffd76a"
};

// Gathers every occludable thing on screen ONCE per frame -
// shared by the pillar pass and the HUD pass so neither has to
// re-derive it. Squares (player/enemies/projectiles) carry
// `size`; circles (hazards) carry `radius`.
function buildXRayTargets() {

    const targets = [];

    if (player)
        targets.push({ shape: "square", ent: player, color: "#4da6ff" });

    // Concealed enemies are left out: the x-ray exists so nothing
    // can hide BEHIND scenery, and outlining something that is
    // deliberately hidden defeats the concealment instead.
    Game.enemies.forEach(ent => {

        if (ent.isConcealed?.())
            return;

        targets.push({ shape: "square", ent, color: "#ff3b30" });

    });

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
// buildClip, when given, receives the context and should add the
// occluder's real silhouette to the current path - the clip then
// follows the shape instead of its bounding box, so an outline
// only shows where the thing genuinely covers it. The rect is
// still used for the cheap overlap pre-test, which is valid
// because the silhouette always sits inside its own bounds.
function drawXRayTargetsInRect(rectX, rectY, rectW, rectH, targets, buildClip = null) {

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

    if (buildClip)
        buildClip(ctx);
    else
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

        const r = getOccluderRect(p);

        drawXRayTargetsInRect(r.x, r.y, r.width, r.height, targets,
                              getOccluderClip(p));

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

// Garden tree: a pixel-art pine - a tall bare trunk under a
// pointy canopy of stacked triangular tiers.
//
// Everything here is snapped to a texel grid and drawn as rects,
// deliberately: the floor, the hedges and the petals are all
// pixel work (see paintPixelStone / FLOOR_TEXEL), and the earlier
// smooth-circle canopy sat on top of that looking like it came
// from a different game.
//
// The proportions below are mirrored in generateRoseCourt's
// occWidth/top so the x-ray pass matches the silhouette - change
// them together.

// Width of the rose court's planted border, as a fraction of the
// arena width. The trees stand in it (see generateRoseCourt) and
// the floor bake paints it (see ensureFloorTexture).
const GARDEN_BORDER = 0.1;

const TREE_TEXEL = 5;

// Trunk and canopy extents as multiples of the tree's declared
// width. Shared with the generator (occWidth/top) and with
// traceGardenTreePath (the x-ray clip), so all three agree.
const TREE_TRUNK_H = 0.72;
const TREE_TRUNK_HALF = 0.075;
const TREE_CANOPY_H = 1.7;
const TREE_CANOPY_OVERLAP = 0.18;
const TREE_CANOPY_HALF = 0.62;

// Three overlapping triangles that widen downward - the conifer
// silhouette. Fractions are of the total canopy height/half-width.
const TREE_TIERS = [
    { top: 0.0, h: 0.46, half: 0.56 },
    { top: 0.3, h: 0.44, half: 0.8 },
    { top: 0.58, h: 0.42, half: 1.0 }
];

function drawGardenTree(p) {

    const U = TREE_TEXEL;
    const snap = v => Math.round(v / U) * U;

    const baseY = p.y + 40;

    const trunkH = p.width * TREE_TRUNK_H;
    const trunkTop = snap(baseY - trunkH);
    const trunkHalf = Math.max(U, snap(p.width * TREE_TRUNK_HALF));

    // Each tree is shaped a little differently, derived from its
    // own x so it never changes between frames.
    const seed = Math.abs(Math.round(p.x)) % 5;

    ctx.save();

    // ---- root flare ----
    ctx.fillStyle = "#2b2016";

    for (let i = 0; i < 3; i++) {

        const w = trunkHalf * 2 + (3 - i) * U * 2;

        ctx.fillRect(snap(p.x - w / 2), snap(baseY - i * U), snap(w), U);

    }

    // ---- trunk ----
    // Three shaded columns rather than a gradient, so it reads as
    // pixels: lit left, mid, shadowed right.
    for (let y = trunkTop; y < baseY; y += U) {

        const cols = [
            { x: p.x - trunkHalf, w: trunkHalf * 0.8, c: "#6b5238" },
            { x: p.x - trunkHalf * 0.2, w: trunkHalf * 0.8, c: "#4d3a26" },
            { x: p.x + trunkHalf * 0.6, w: trunkHalf * 0.4, c: "#2e2216" }
        ];

        cols.forEach(c => {
            ctx.fillStyle = c.c;
            ctx.fillRect(snap(c.x), y, Math.max(U, snap(c.w)), U);
        });

        // Occasional bark notch.
        if (((y / U) + seed) % 7 === 0) {
            ctx.fillStyle = "#2e2216";
            ctx.fillRect(snap(p.x - trunkHalf * 0.6), y, U, U);
        }

    }

    // ---- canopy ----
    const canopyBottom = snap(trunkTop + p.width * TREE_CANOPY_OVERLAP);
    const canopyH = p.width * TREE_CANOPY_H;
    const canopyTop = snap(canopyBottom - canopyH);
    const halfMax = p.width * TREE_CANOPY_HALF;

    const greens = ["#4a7340", "#3d6134", "#2f4d29", "#25401f"];

    TREE_TIERS.forEach((tier, ti) => {

        const tTop = snap(canopyTop + canopyH * tier.top);
        const tH = canopyH * tier.h;
        const rows = Math.max(2, Math.round(tH / U));

        for (let r = 0; r < rows; r++) {

            const y = snap(tTop + r * U);
            const grow = (r + 1) / rows;

            // Slight jitter on the edge so the triangle isn't
            // mechanically straight.
            const jitter = ((r + ti + seed) % 3 === 0) ? U : 0;
            const half = Math.max(U, snap(halfMax * tier.half * grow + jitter));

            // Banded shading: lighter toward the top of each tier.
            const band = greens[Math.min(greens.length - 1,
                                Math.floor(grow * 2) + (ti > 0 ? 1 : 0))];

            ctx.fillStyle = band;
            ctx.fillRect(snap(p.x - half), y, half * 2, U);

            // Lit left edge.
            ctx.fillStyle = "rgba(150, 195, 120, 0.3)";
            ctx.fillRect(snap(p.x - half), y, U, U);

            // Shadowed right edge.
            ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
            ctx.fillRect(snap(p.x + half - U), y, U, U);

        }

        // Dark seam under each tier so the layers read separately.
        const seamY = snap(tTop + tH);
        const seamHalf = Math.max(U, snap(halfMax * tier.half));

        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fillRect(snap(p.x - seamHalf), seamY, seamHalf * 2, U);

    });

    // ---- roses caught in the needles ----
    // Kept from the court's motif, as texel blocks rather than
    // circles so they match the rest of the tree.
    for (let i = 0; i < 6; i++) {

        const a = (i + seed) * 1.7;
        const depth = 0.35 + ((i + seed) % 3) * 0.22;

        const rx = snap(p.x + Math.cos(a) * halfMax * depth);
        const ry = snap(canopyTop + canopyH * (0.35 + ((i * 0.17 + seed * 0.11) % 0.6)));

        ctx.fillStyle = "#8f1e33";
        ctx.fillRect(rx, ry, U, U);
        ctx.fillRect(rx + U, ry, U, U);

        ctx.fillStyle = "#c8425c";
        ctx.fillRect(rx, ry - U, U, U);

    }

    ctx.restore();

}

// The rose court's ground dressing - bushes, flower beds and
// benches. Drawn flat onto the floor pass, so entities walk OVER
// all of it and it never becomes accidental cover.

// Ground dressing - bushes, beds, benches.
//
// Takes its target context because the green arenas BAKE these
// into the cached floor bitmap instead of drawing them live (see
// ensureFloorTexture). They never move, and at the grove's forty
// bushes the live version was several hundred path operations
// every frame - which is the same trap the pixel-fx primitives
// already carry a rule about. Baked, they cost nothing.
function drawArenaProps(target = ctx) {

    if (Arena.props.length === 0)
        return;

    const ctx = target;

    ctx.save();

    Arena.props.forEach(o => {

        if (o.kind === "bush") {

            // Soft contact shadow: a couple of stacked, very
            // transparent ellipses rather than one hard dark
            // blob, so the bush sits on the ground instead of
            // having a black hole painted under it.
            for (const s of [
                { rx: 1.12, ry: 0.42, a: 0.1 },
                { rx: 0.86, ry: 0.3, a: 0.13 },
                { rx: 0.58, ry: 0.2, a: 0.14 }
            ]) {

                ctx.fillStyle = `rgba(18, 26, 16, ${s.a})`;
                ctx.beginPath();
                ctx.ellipse(o.x, o.y + o.r * 0.6, o.r * s.rx, o.r * s.ry,
                            0, 0, Math.PI * 2);
                ctx.fill();

            }

            // Body: a dark mass first, then leaf tufts layered
            // over it in lighter greens. The tufts are placed off
            // the prop's own x so each bush is shaped differently
            // but never changes between frames.
            const seed = Math.abs(Math.round(o.x + o.y)) % 6;

            ctx.fillStyle = "#22391f";
            ctx.beginPath();
            ctx.ellipse(o.x, o.y + o.r * 0.12, o.r * 1.02, o.r * 0.8,
                        0, 0, Math.PI * 2);
            ctx.fill();

            const tufts = 11;

            for (let i = 0; i < tufts; i++) {

                const a = (i / tufts) * Math.PI * 2 + seed * 0.4;
                const spread = 0.42 + ((i + seed) % 3) * 0.2;

                const tx = o.x + Math.cos(a) * o.r * spread;
                const ty = o.y + Math.sin(a) * o.r * spread * 0.72;

                // Higher tufts catch more light.
                const lift = (o.y - ty) / (o.r * 0.8);

                const greens = ["#2c4a26", "#375c2f", "#436d38"];
                const shade = greens[Math.min(2, Math.max(0, Math.round(lift + 1)))];

                ctx.fillStyle = shade;
                ctx.beginPath();
                ctx.ellipse(tx, ty, o.r * 0.38, o.r * 0.3,
                            a * 0.3, 0, Math.PI * 2);
                ctx.fill();

            }

            // Lit crown and a couple of berry specks.
            ctx.fillStyle = "rgba(164, 205, 128, 0.26)";
            ctx.beginPath();
            ctx.ellipse(o.x - o.r * 0.22, o.y - o.r * 0.42,
                        o.r * 0.42, o.r * 0.26, -0.3, 0, Math.PI * 2);
            ctx.fill();

            for (let i = 0; i < 3; i++) {

                const a = (i + seed) * 2.1;

                ctx.fillStyle = "#b8324b";
                ctx.beginPath();
                ctx.arc(o.x + Math.cos(a) * o.r * 0.5,
                        o.y + Math.sin(a) * o.r * 0.36,
                        2.1, 0, Math.PI * 2);
                ctx.fill();

            }

            return;

        }

        if (o.kind === "bed") {

            // Soil border.
            ctx.fillStyle = "#4a3a2a";
            ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);

            ctx.fillStyle = "#3a2c20";
            ctx.fillRect(o.x - o.w / 2 + 4, o.y - o.h / 2 + 4, o.w - 8, o.h - 8);

            // Blooms in rows.
            const colors = ["#c8425c", "#e0768c", "#d9a13a", "#b8324b"];

            for (let i = 0; i < 10; i++) {

                const bx = o.x - o.w / 2 + 10 + (i % 5) * ((o.w - 20) / 4);
                const by = o.y - 4 + Math.floor(i / 5) * 9;

                ctx.fillStyle = colors[(i + Math.round(o.x)) % colors.length];
                ctx.beginPath();
                ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
                ctx.fill();

            }

            return;

        }

        if (o.kind === "rubble") {

            // Fallen masonry: a few angular texel chunks with a
            // wet lit top, matching the storm ruin's stumps.
            const U = 6;
            const snap = v => Math.round(v / U) * U;
            const s = o.seed ?? 0;

            ctx.fillStyle = "rgba(10, 14, 22, 0.4)";
            ctx.fillRect(snap(o.x - o.r), snap(o.y + o.r * 0.4),
                         snap(o.r * 2), U);

            for (let i = 0; i < 4; i++) {

                const bw = snap(o.r * (0.5 + ((i + s) % 3) * 0.22));
                const bh = snap(o.r * (0.3 + ((i + s) % 2) * 0.2));

                const bx = snap(o.x - o.r * 0.8 + ((i * 5 + s) % 7) * (o.r * 0.26));
                const by = snap(o.y - o.r * 0.2 + ((i * 3 + s) % 3) * (o.r * 0.22));

                ctx.fillStyle = i % 2 ? "#39404f" : "#2c333f";
                ctx.fillRect(bx, by, bw, bh);

                ctx.fillStyle = "rgba(178, 200, 230, 0.32)";
                ctx.fillRect(bx, by, bw, Math.max(2, U / 2));

            }

            return;

        }

        if (o.kind === "bench") {

            ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
            ctx.fillRect(o.x - 30, o.y + 6, 60, 8);

            ctx.fillStyle = "#7a6a52";
            ctx.fillRect(o.x - 30, o.y - 6, 60, 10);

            ctx.fillStyle = "#5d5040";
            ctx.fillRect(o.x - 30, o.y + 2, 60, 4);

            ctx.fillStyle = "#4a4034";
            ctx.fillRect(o.x - 26, o.y + 4, 6, 10);
            ctx.fillRect(o.x + 20, o.y + 4, 6, 10);

        }

    });

    ctx.restore();

}

// Storm ruin stump: a snapped-off pillar remnant. The top is
// deliberately ragged and the wet upper surface catches the cold
// light from the open sky above.
//
// Each column of stone is drawn at its OWN height rather than
// drawing a full block and biting notches out of it - the pillars
// paint over the finished scene, so clearing pixels here would
// punch a transparent hole straight through the floor and any
// entity behind it.

function drawStormStump(p) {

    const baseY = p.y + 40;
    const h = p.stumpH ?? p.width * 0.55;
    const top = baseY - h;
    const half = p.width / 2;

    const U = 6;
    const snap = v => Math.round(v / U) * U;

    // Shape derived from the stump's own x, so each break is
    // different but stable frame to frame.
    const seed = Math.abs(Math.round(p.x)) % 7;

    ctx.save();

    const cols = Math.max(4, Math.round(p.width / U));
    const colW = Math.max(U, snap(p.width / cols));

    for (let i = 0; i < cols; i++) {

        const x = snap(p.x - half + i * (p.width / cols));

        // How far this column was broken down from the crown.
        const bite = ((i * 7 + seed * 3) % 5) * U;
        const colTop = snap(top + bite);

        // Across-the-shaft shading: lit on the left, dark right.
        const across = (x - p.x) / half;

        const body =
            across < -0.35 ? "#6a7180" :
            across < 0.3 ? "#4a5261" :
            "#2c333f";

        ctx.fillStyle = body;
        ctx.fillRect(x, colTop, colW, snap(baseY) - colTop);

        // Wet lit lip on top of whatever is left standing.
        ctx.fillStyle = "#9aa6ba";
        ctx.fillRect(x, colTop, colW, U);

        ctx.fillStyle = "rgba(196, 218, 248, 0.45)";
        ctx.fillRect(x, colTop, colW, Math.max(2, U / 2));

    }

    // A crack or two running down the shaft.
    ctx.fillStyle = "rgba(14, 18, 26, 0.55)";

    for (let i = 0; i < 2; i++) {

        let cx = snap(p.x - half * 0.4 + i * half * 0.7);

        for (let y = snap(top + U * 4); y < baseY - U; y += U) {

            ctx.fillRect(cx, y, U, U);

            if (((y / U) + seed + i) % 3 === 0)
                cx += (((y / U) + i) % 2 === 0 ? U : -U);

        }

    }

    // Rubble collar where the pillar shattered into the floor.
    ctx.fillStyle = "#232935";
    ctx.fillRect(snap(p.x - half * 1.15), snap(baseY - U), snap(half * 2.3), U * 2);

    ctx.fillStyle = "#333b49";

    for (let i = 0; i < 5; i++) {

        const rx = snap(p.x - half * 1.05 + ((i * 5 + seed) % 9) * (half * 0.22));

        ctx.fillRect(rx, snap(baseY), U * 2, U);

    }

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
// FLOURISH + TRANSITION
// =====================================
//
// Two brief, whole-screen beats. Both are stamped with a start
// time and read as "how long ago" against the clock, so neither
// needs a timer ticked anywhere - same approach as the decals.

const FLOURISH_MS = 900;
const TRANSITION_MS = 620;

function triggerArenaFlourish() {

    Arena.flourishAt = Date.now();
    Arena.flourishKind = Arena.theme;

}

function drawArenaFlourish() {

    if (!Arena.flourishAt)
        return;

    const age = Date.now() - Arena.flourishAt;

    if (age < 0 || age > FLOURISH_MS)
        return;

    const t = age / FLOURISH_MS;
    const fade = 1 - t;

    const W = canvas.width;
    const H = canvas.height;

    ctx.save();

    if (Arena.flourishKind === "storm") {

        // A strike lands as the boss arrives.
        ctx.fillStyle = `rgba(206, 226, 255, ${fade * 0.34})`;
        ctx.fillRect(0, 0, W, H);

        // The bolt itself, forking down the sky for the first
        // moment only.
        if (t < 0.3) {

            ctx.strokeStyle = `rgba(232, 244, 255, ${(1 - t / 0.3) * 0.85})`;
            ctx.lineWidth = 3;
            ctx.beginPath();

            let bx = W * 0.5;

            ctx.moveTo(bx, 0);

            for (let y = 0; y < H * 0.6; y += 34) {

                bx += (stormHash(Math.floor(y) + 7) - 0.5) * 60;
                ctx.lineTo(bx, y);

            }

            ctx.stroke();

        }

    } else if (Arena.flourishKind === "garden") {

        // A gust tears petals off the trees.
        for (let i = 0; i < 60; i++) {

            const spread = t * 1.2;

            const px = stormHash(i + 11) * W + Math.sin(i + t * 6) * 40 * spread;
            const py = stormHash(i + 33) * H - 60 + spread * H * 0.5;

            ctx.globalAlpha = fade * 0.8;
            ctx.fillStyle = i % 3 === 0 ? "#e0768c" : "#8f1e33";

            ctx.fillRect(px, py, 5, 3);

        }

        ctx.globalAlpha = 1;

    } else if (Arena.flourishKind === "night") {

        // The torches flare up as it enters.
        Arena.torches.forEach(tt => {

            let g = ctx.createRadialGradient(tt.x, tt.y, 0, tt.x, tt.y, 300 * (0.5 + t));

            g.addColorStop(0, `rgba(255, 210, 130, ${fade * 0.4})`);
            g.addColorStop(1, "rgba(255, 170, 70, 0)");

            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(tt.x, tt.y, 300 * (0.5 + t), 0, Math.PI * 2);
            ctx.fill();

        });

    } else {

        // Castle and throne: a shockwave ring out from the middle
        // plus a short warm flash.
        const r = t * Math.hypot(W, H) * 0.6;

        ctx.strokeStyle = `rgba(255, 226, 168, ${fade * 0.5})`;
        ctx.lineWidth = 8 * fade + 2;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 226, 168, ${fade * 0.12})`;
        ctx.fillRect(0, 0, W, H);

    }

    ctx.restore();

}

// A quick wipe when the arena's look changes at waves 6/11/16/21,
// so the room doesn't just pop from one theme to the next.

function drawArenaTransition() {

    if (!Arena.transitionAt)
        return;

    const age = Date.now() - Arena.transitionAt;

    if (age < 0 || age > TRANSITION_MS)
        return;

    const t = age / TRANSITION_MS;

    ctx.save();

    // A dark band sweeps across and off, brightest at its leading
    // edge - reads as a curtain passing rather than a plain fade.
    const x = t * canvas.width * 2 - canvas.width;

    let g = ctx.createLinearGradient(x, 0, x + canvas.width, 0);

    g.addColorStop(0, "rgba(0, 0, 0, 0)");
    g.addColorStop(0.42, "rgba(0, 0, 0, 0.8)");
    g.addColorStop(0.5, "rgba(255, 255, 255, 0.12)");
    g.addColorStop(0.58, "rgba(0, 0, 0, 0.8)");
    g.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();

}

// =====================================
// LIGHT SHAFTS + HAZARD BOUNCE
// =====================================
//
// Two lighting touches that both sit on the floor, under the
// entities: shafts of light where the arena has an actual opening
// for light to come through, and a tint under fire/ice hazards so
// they look like they're sitting ON the ground rather than
// floating over it.

function drawLightShafts() {

    if (canvas.width === 0)
        return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.save();

    if (Arena.theme === "throne") {

        // Angled shafts from the windows down the right wall,
        // matching the off-screen sun the rest of this arena's
        // lighting already uses.
        ctx.globalCompositeOperation = "lighter";

        for (let i = 0; i < 3; i++) {

            const y = H * (0.1 + i * 0.32);
            const len = W * 0.62;

            let g = ctx.createLinearGradient(W, y, W - len, y + len * 0.5);
            g.addColorStop(0, "rgba(255, 226, 168, 0.15)");
            g.addColorStop(0.55, "rgba(255, 214, 150, 0.06)");
            g.addColorStop(1, "rgba(255, 200, 140, 0)");

            ctx.fillStyle = g;

            ctx.beginPath();
            ctx.moveTo(W, y);
            ctx.lineTo(W, y + H * 0.14);
            ctx.lineTo(W - len, y + len * 0.5 + H * 0.3);
            ctx.lineTo(W - len, y + len * 0.5);
            ctx.closePath();
            ctx.fill();

        }

    }

    // NOTE: no castle branch here, deliberately. The courtyard is
    // open to the sky - there is no opening for a shaft to come
    // through - and the hall behind the wall is simply dark.

    ctx.restore();

}

// Warm/cold light spilling onto the floor from active hazards.
//
// Reuses the class-to-colour map the x-ray pass already maintains
// (HAZARD_XRAY_COLORS) rather than keeping a second list in step -
// if a hazard is worth tinting an outline, it's worth bouncing
// light too.

function drawHazardBounce() {

    if (!Game.hazards || Game.hazards.length === 0)
        return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    Game.hazards.forEach(h => {

        const color = HAZARD_XRAY_COLORS[h?.constructor?.name];

        if (!color)
            return;

        const r = (h.radius ?? h.r ?? 0) * 1.5;

        if (!r || !isFinite(h.x) || !isFinite(h.y))
            return;

        let g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);

        g.addColorStop(0, color + "44");
        g.addColorStop(0.5, color + "1c");
        g.addColorStop(1, color + "00");

        ctx.fillStyle = g;

        ctx.beginPath();
        ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
        ctx.fill();

    });

    ctx.restore();

}

// =====================================
// SET PIECES
// =====================================
//
// One focal object per arena, so each room has something in it
// besides cover. All of these are BACKDROP: they draw on the
// floor pass, they are not in Arena.pillars, and nothing collides
// with or hides behind them - the arenas were tuned with their
// existing cover and this shouldn't change how any of them play.

// How far down the throne room the dais reaches, as a fraction of
// arena height. Shared by the set piece that draws it and by the
// carpet, which stops at its foot.
// Deep enough that the chair sits centred on the platform with
// the stair flight below it, and still clears the pause button at
// the top of the screen.
const THRONE_DAIS_BOTTOM = 0.4;

function drawArenaSetPiece() {

    if (canvas.width === 0)
        return;

    const W = canvas.width;
    const H = canvas.height;
    const now = Date.now();

    if (Arena.theme === "castle") {

        // Hay bales and a hand cart parked off to one side of the
        // courtyard.
        const { wallY } = getCastleLayout();
        const baseY = wallY + (H - wallY) * 0.42;

        ctx.save();

        // --- hay bales ---
        [
            { x: W * 0.13, y: baseY, s: 1 },
            { x: W * 0.19, y: baseY + 26, s: 0.85 }
        ].forEach(b => {

            const w = 58 * b.s;
            const h = 38 * b.s;

            ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
            ctx.beginPath();
            ctx.ellipse(b.x, b.y + h * 0.55, w * 0.6, h * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#b99a4a";
            ctx.fillRect(b.x - w / 2, b.y - h / 2, w, h);

            ctx.fillStyle = "#cdb060";
            ctx.fillRect(b.x - w / 2, b.y - h / 2, w, h * 0.25);

            // Binding twine.
            ctx.fillStyle = "#7a6428";
            ctx.fillRect(b.x - w * 0.2, b.y - h / 2, 4, h);
            ctx.fillRect(b.x + w * 0.12, b.y - h / 2, 4, h);

            // Loose straw.
            ctx.fillStyle = "#d8c078";
            for (let i = 0; i < 5; i++)
                ctx.fillRect(b.x - w * 0.5 + i * (w * 0.24),
                             b.y + h * 0.5, 6, 2);

        });

        // --- cart ---
        const cx2 = W * 0.85;
        const cy2 = baseY + 8;

        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.fillRect(cx2 - 52, cy2 + 20, 104, 8);

        ctx.fillStyle = "#6b5233";
        ctx.fillRect(cx2 - 50, cy2 - 16, 100, 32);

        ctx.fillStyle = "#54402736";
        ctx.fillRect(cx2 - 50, cy2 - 16, 100, 6);

        // Plank lines.
        ctx.fillStyle = "rgba(40, 30, 18, 0.55)";
        for (let i = 1; i < 4; i++)
            ctx.fillRect(cx2 - 50, cy2 - 16 + i * 8, 100, 2);

        // Wheels.
        [-30, 30].forEach(dx => {

            ctx.fillStyle = "#3d2f1c";
            ctx.beginPath();
            ctx.arc(cx2 + dx, cy2 + 20, 13, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#6b5233";
            ctx.beginPath();
            ctx.arc(cx2 + dx, cy2 + 20, 5, 0, Math.PI * 2);
            ctx.fill();

        });

        // Shaft.
        ctx.fillStyle = "#54402a";
        ctx.fillRect(cx2 + 48, cy2 - 4, 34, 5);

        ctx.restore();

        return;

    }

    if (Arena.theme === "night") {

        // A chandelier hanging over the hall. In this view it is
        // overhead, so what actually lands on the floor is its
        // shadow plus the warm pool it throws - and pools of
        // colour from the stained glass down each side.
        const cx2 = W / 2;
        const cy2 = H * 0.34;

        ctx.save();

        // Warm pool underneath it.
        let pool = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 190);
        pool.addColorStop(0, "rgba(255, 196, 108, 0.2)");
        pool.addColorStop(1, "rgba(255, 170, 70, 0)");

        ctx.fillStyle = pool;
        ctx.fillRect(cx2 - 200, cy2 - 200, 400, 400);

        // Shadow of the frame: two rings plus the spokes.
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 5;

        [58, 92].forEach(r => {
            ctx.beginPath();
            ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < 8; i++) {

            const a = i * Math.PI / 4;

            ctx.moveTo(cx2 + Math.cos(a) * 20, cy2 + Math.sin(a) * 20);
            ctx.lineTo(cx2 + Math.cos(a) * 92, cy2 + Math.sin(a) * 92);

        }

        ctx.stroke();

        // Candle flames around the rim, gently guttering.
        for (let i = 0; i < 8; i++) {

            const a = i * Math.PI / 4;
            const fx = cx2 + Math.cos(a) * 92;
            const fy = cy2 + Math.sin(a) * 92;
            const flick = Math.sin(now / 150 + i) * 1.5;

            ctx.shadowBlur = 14;
            ctx.shadowColor = "#ffb347";
            ctx.fillStyle = "#ffd27a";

            ctx.beginPath();
            ctx.ellipse(fx, fy + flick, 3, 5, 0, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.shadowBlur = 0;

        // Stained-glass colour cast on the floor down both walls.
        const glass = ["rgba(190, 60, 70, 0.12)", "rgba(70, 110, 200, 0.12)",
                       "rgba(220, 180, 60, 0.11)"];

        glass.forEach((c, i) => {

            const y = H * (0.2 + i * 0.28);

            ctx.fillStyle = c;
            ctx.fillRect(0, y, W * 0.1, H * 0.16);
            ctx.fillRect(W - W * 0.1, y, W * 0.1, H * 0.16);

        });

        ctx.restore();

        return;

    }

    if (Arena.theme === "throne") {

        // The throne at the head of the hall, seen from directly
        // above like everything else in this game.
        //
        // The first pass drew it in side elevation - a seat with a
        // tall back - which fought the camera and, worse, sat it
        // ON the runner. A real throne room puts the throne on a
        // raised dais at the head and runs the carpet UP to it, so
        // the runner now stops at the dais foot (see drawRedCarpet)
        // and from above you read: backrest slab at the top, seat
        // cushion below it, armrests flanking, footstool in front.
        const cx2 = W / 2;
        const daisBottom = H * THRONE_DAIS_BOTTOM;

        ctx.save();

        // ---- platform, then the stair flight up to it ----
        //
        // The old version stacked three widening slabs, which from
        // above read as a wedding cake rather than steps. A real
        // flight is NARROWER than the dais and centred on the
        // approach, so from directly overhead you see a run of
        // parallel treads with a shadow line at each nosing.
        const stairDepth = 72;
        const platformBottom = daisBottom - stairDepth;
        const platformHalf = W * 0.2;
        const stairHalf = W * 0.115;

        // Platform.
        ctx.fillStyle = "#4a5866";
        ctx.fillRect(cx2 - platformHalf, 0, platformHalf * 2, platformBottom);

        // Side edges, so it reads as a raised slab with thickness
        // rather than a flat grey rectangle.
        ctx.fillStyle = "#2b3541";
        ctx.fillRect(cx2 - platformHalf, 0, 7, platformBottom);
        ctx.fillRect(cx2 + platformHalf - 7, 0, 7, platformBottom);

        // Its front edge, in shadow where it drops to the stairs.
        ctx.fillStyle = "#222b34";
        ctx.fillRect(cx2 - platformHalf, platformBottom - 6, platformHalf * 2, 6);

        // Stairs: four treads, each lighter as it climbs.
        const treads = 4;
        const treadH = stairDepth / treads;

        for (let i = 0; i < treads; i++) {

            // i = 0 is the bottom step, nearest the room.
            const yTop = daisBottom - (i + 1) * treadH;
            const shade = 0.62 + (i / treads) * 0.38;

            ctx.fillStyle = shadeColor([65, 79, 93], shade);
            ctx.fillRect(cx2 - stairHalf, yTop, stairHalf * 2, treadH);

            // Nosing shadow at the front lip of each tread.
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(cx2 - stairHalf, yTop + treadH - 3, stairHalf * 2, 3);

        }

        // Cheek walls down either side of the flight.
        ctx.fillStyle = "#2b3541";
        ctx.fillRect(cx2 - stairHalf - 8, platformBottom, 8, stairDepth);
        ctx.fillRect(cx2 + stairHalf, platformBottom, 8, stairDepth);

        // ---- the throne, centred on the platform ----
        //
        // Flatter than before: from directly overhead a chair is
        // mostly its seat, with the backrest showing only as the
        // thickness of its top edge. The tall upright slab the
        // first pass drew was really a side elevation.
        const backH = 18;
        const seatH = 58;
        const chairH = backH + 3 + seatH;

        const chairTop = platformBottom / 2 - chairH / 2;

        const backTop = chairTop;
        const backBottom = backTop + backH;
        const seatTop = backBottom + 3;
        const seatBottom = seatTop + seatH;

        // Contact shadow, so the chair sits ON the platform.
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(cx2 - 62, backTop + 6, 124, chairH + 6);

        // Backrest, seen as its top edge.
        //
        // Deliberately much darker than the platform stone: at a
        // near-matching grey the whole chair disappeared into the
        // dais and only the cushion read.
        ctx.fillStyle = "#232c36";
        ctx.fillRect(cx2 - 46, backTop, 92, backH);

        ctx.fillStyle = "#39434f";
        ctx.fillRect(cx2 - 46, backTop, 92, 5);

        ctx.fillStyle = "#141a21";
        ctx.fillRect(cx2 - 46, backBottom - 3, 92, 3);

        // A single narrow gold band along the crest - the only
        // ornament left on the chair itself.
        ctx.fillStyle = "#a8873a";
        ctx.fillRect(cx2 - 46, backTop, 92, 2);

        // Seat cushion.
        ctx.fillStyle = "#7d1421";
        ctx.fillRect(cx2 - 38, seatTop, 76, seatH);

        ctx.fillStyle = "#8f1626";
        ctx.fillRect(cx2 - 38, seatTop, 76, 10);

        // Shallow tufting so it doesn't read as a flat red block.
        ctx.fillStyle = "rgba(48, 6, 12, 0.45)";

        for (let r = 0; r < 2; r++)
            for (let c = 0; c < 3; c++)
                ctx.fillRect(cx2 - 22 + c * 22, seatTop + 18 + r * 18, 3, 3);

        ctx.strokeStyle = "#a8873a";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx2 - 38, seatTop, 76, seatH);

        // Armrests: thin bars either side of the seat.
        [-1, 1].forEach(side => {

            const ax = cx2 + side * 48;

            ctx.fillStyle = "#232c36";
            ctx.fillRect(ax - 10, seatTop - 4, 20, seatH + 8);

            ctx.fillStyle = "#39434f";
            ctx.fillRect(ax - 10, seatTop - 4, 20, 4);

        });

        // ---- banners hanging either side of the dais ----
        [-1, 1].forEach(side => {

            const bx2 = cx2 + side * (W * 0.235);
            const sway = Math.sin(now / 1500 + side) * 3;

            ctx.fillStyle = "#5c0f1b";
            ctx.beginPath();
            ctx.moveTo(bx2 - 26, 0);
            ctx.lineTo(bx2 + 26, 0);
            ctx.lineTo(bx2 + 26 + sway, 116);
            ctx.lineTo(bx2 + sway, 132);
            ctx.lineTo(bx2 - 26 + sway, 116);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#7d1421";
            ctx.fillRect(bx2 - 26, 0, 20, 112);

            ctx.fillStyle = "#a8873a";
            ctx.fillRect(bx2 - 28, 0, 56, 5);

            // Crown device on the banner.
            ctx.beginPath();
            ctx.moveTo(bx2 - 12 + sway * 0.4, 58);
            ctx.lineTo(bx2 - 12 + sway * 0.4, 44);
            ctx.lineTo(bx2 - 6 + sway * 0.4, 52);
            ctx.lineTo(bx2 + sway * 0.4, 40);
            ctx.lineTo(bx2 + 6 + sway * 0.4, 52);
            ctx.lineTo(bx2 + 12 + sway * 0.4, 44);
            ctx.lineTo(bx2 + 12 + sway * 0.4, 58);
            ctx.closePath();
            ctx.fill();

        });

        ctx.restore();

        return;

    }

    if (isGreenTheme() && Arena.theme !== "garden") {

        drawGreenSetPiece();

        return;

    }

    if (isGreenTheme()) {

        // A fountain at the head of the court, water running.
        const cx2 = W / 2;
        const cy2 = H * 0.155;

        ctx.save();

        // Basin.
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 + 30, 84, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#cfc5b2";
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 + 24, 80, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8a8172";
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 + 24, 68, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Water, with a slow shimmer.
        const shimmer = 0.5 + Math.sin(now / 700) * 0.1;

        ctx.fillStyle = `rgba(96, 152, 178, ${shimmer})`;
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 + 24, 62, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Expanding ripple rings in the basin.
        ctx.strokeStyle = "rgba(220, 240, 250, 0.32)";
        ctx.lineWidth = 1.5;

        for (let i = 0; i < 3; i++) {

            const cyc = ((now / 1600) + i / 3) % 1;
            const rr = 8 + cyc * 48;

            ctx.globalAlpha = (1 - cyc) * 0.5;
            ctx.beginPath();
            ctx.ellipse(cx2, cy2 + 24, rr, rr * 0.26, 0, 0, Math.PI * 2);
            ctx.stroke();

        }

        ctx.globalAlpha = 1;

        // Central pedestal and upper bowl.
        ctx.fillStyle = "#cfc5b2";
        ctx.fillRect(cx2 - 9, cy2 - 20, 18, 44);

        ctx.beginPath();
        ctx.ellipse(cx2, cy2 - 22, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8a8172";
        ctx.beginPath();
        ctx.ellipse(cx2, cy2 - 22, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Falling water from the upper bowl into the basin.
        ctx.strokeStyle = "rgba(198, 230, 244, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < 8; i++) {

            const a = (i / 8) * Math.PI * 2;
            const ox = Math.cos(a) * 24;
            const drop = ((now / 460) + i / 8) % 1;

            const sy = cy2 - 18 + drop * 38;

            ctx.moveTo(cx2 + ox, sy);
            ctx.lineTo(cx2 + ox * 0.94, sy + 8);

        }

        ctx.stroke();
        ctx.restore();

        return;

    }

    if (Arena.theme === "storm") {

        // Fallen roof timbers across the floor, and chains still
        // hanging from what's left of the span, swinging in the
        // wind.
        ctx.save();

        const beams = [
            { x: W * 0.34, y: H * 0.30, len: 250, a: 0.42, w: 17 },
            { x: W * 0.68, y: H * 0.52, len: 300, a: -0.3, w: 20 },
            { x: W * 0.46, y: H * 0.80, len: 210, a: 0.16, w: 15 }
        ];

        beams.forEach(b => {

            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.a);

            ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
            ctx.fillRect(-b.len / 2, b.w * 0.5, b.len, b.w * 0.5);

            ctx.fillStyle = "#4a3a26";
            ctx.fillRect(-b.len / 2, -b.w / 2, b.len, b.w);

            ctx.fillStyle = "#6b5238";
            ctx.fillRect(-b.len / 2, -b.w / 2, b.len, b.w * 0.34);

            // Wet sheen along the top of the timber.
            ctx.fillStyle = "rgba(178, 200, 230, 0.16)";
            ctx.fillRect(-b.len / 2, -b.w / 2, b.len, 2);

            // Split ends and iron bands.
            ctx.fillStyle = "#2e2216";
            ctx.fillRect(-b.len / 2, -b.w / 2, 5, b.w);
            ctx.fillRect(b.len / 2 - 5, -b.w / 2, 5, b.w);

            ctx.fillStyle = "#3a4050";
            ctx.fillRect(-b.len * 0.14, -b.w / 2, 6, b.w);
            ctx.fillRect(b.len * 0.22, -b.w / 2, 6, b.w);

            ctx.restore();

        });

        // Hanging chains, swaying out of sync with each other.
        [W * 0.24, W * 0.55, W * 0.79].forEach((x, i) => {

            const sway = Math.sin(now / (1100 + i * 260) + i) * 12;
            const len = 120 + i * 34;

            ctx.strokeStyle = "#39404f";
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (let y = 0; y < len; y += 9) {

                const t = y / len;
                const cxx = x + sway * t;

                if (y === 0)
                    ctx.moveTo(cxx, y);
                else
                    ctx.lineTo(cxx, y);

            }

            ctx.stroke();

            // Link highlights.
            ctx.fillStyle = "#5a6272";

            for (let y = 6; y < len; y += 18) {

                const t = y / len;
                ctx.fillRect(x + sway * t - 2, y, 4, 4);

            }

            // Hook on the end.
            ctx.fillStyle = "#2a303c";
            ctx.fillRect(x + sway - 4, len, 8, 7);

        });

        ctx.restore();

        return;

    }

}

// =====================================
// ARENA AMBIENT
// =====================================
//
// Weather and drifting particles, per theme. Split out of
// drawTorches so that function only draws light HARDWARE - the
// ambient layer has to run for arenas with no torches at all
// (the castle courtyard has none), which an early return inside
// the torch loop could never do.
//
// Everything here is a pure function of the clock and an index.
// No particle arrays, no update pass, nothing to clean up - the
// same trick the fireflies and the rain were already using.

// Wing colours for the courtyard butterflies. Picked to sit on a
// green lawn without competing with anything the player needs to
// track - pale and muted rather than the saturated blues and reds
// a real garden would have.
const BUTTERFLY_COLORS = ["#f2d16b", "#e8e3d0", "#e0975a", "#cfd8f0"];

function drawArenaAmbient() {

    if (canvas.width === 0)
        return;

    const now = Date.now();

    if (Arena.theme === "castle") {

        // Butterflies over the lawn, and grass seed blowing across
        // the courtyard.
        //
        // The dust motes that used to be here are gone with the
        // light they hung in - they only made sense as specks
        // caught in the shaft through the gate, and there is no
        // shaft any more.
        const { wallY } = getCastleLayout();

        ctx.save();

        // Butterflies.
        //
        // Zero state, like everything else in this pass: the whole
        // flight path is a function of the clock and the index, so
        // there is nothing to allocate, nothing to update, and
        // they carry on correctly across a pause, a wave change or
        // a run ending without any bookkeeping.
        const t = now / 1000;

        for (let i = 0; i < 7; i++) {

            const a = stormHash(i + 700);
            const b = stormHash(i + 900);
            const c = stormHash(i + 1100);

            const phase = c * Math.PI * 2;
            const rate = 0.26 + b * 0.2;

            // Home patch of lawn, kept clear of the wall at the
            // top and the screen edge at the bottom.
            const homeX = canvas.width * (0.08 + a * 0.84);
            const homeY = wallY + 44 + b * (canvas.height - wallY - 78);

            // A slow loop around that patch, with a faster, smaller
            // wobble laid over it. The wobble is the whole trick -
            // a butterfly's path dithers constantly, and without it
            // this reads as a bee cruising in a neat ellipse.
            const bx = homeX
                + Math.sin(t * rate + phase) * (60 + c * 80)
                + Math.sin(t * rate * 2.7 + phase) * 11;

            const by = homeY
                + Math.cos(t * rate * 0.8 + phase) * (22 + a * 34)
                + Math.sin(t * 3.1 + phase) * 6;

            // Wings beat far faster than the body travels, and the
            // beat is what sells it at this size.
            const flap = Math.abs(Math.sin(t * 8.5 + phase));

            const PX = 2;

            // Forewing and hindwing, not one slab. A single
            // rectangle per side just read as a coloured dash at
            // this scale - it is the big-over-small silhouette
            // that says butterfly, and it costs one extra rect.
            const fore = Math.round(1 + flap * 2.4) * PX;
            const hind = Math.max(PX, Math.round(fore * 0.55 / PX) * PX);

            const px = Math.round(bx / PX) * PX;
            const py = Math.round(by / PX) * PX;

            ctx.globalAlpha = 0.9;
            ctx.fillStyle = BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length];

            // Left pair, then right pair, mirrored about a body
            // one pixel-unit wide.
            ctx.fillRect(px - fore, py - PX, fore, PX * 2);
            ctx.fillRect(px - hind, py + PX, hind, PX);
            ctx.fillRect(px + PX, py - PX, fore, PX * 2);
            ctx.fillRect(px + PX, py + PX, hind, PX);

            // Body last, over the wing roots, so the two halves
            // read as one creature rather than as two flakes
            // drifting alongside each other.
            ctx.fillStyle = "#3a2f26";
            ctx.fillRect(px, py - PX, PX, PX * 3);

        }

        // Seed heads blowing left to right, low over the lawn.
        for (let i = 0; i < 18; i++) {

            const t = ((now / 5200) + stormHash(i + 300)) % 1;

            const sx = t * (canvas.width + 80) - 40;
            const sy = wallY + 40 + stormHash(i + 500) * (canvas.height - wallY - 60)
                       + Math.sin(now / 700 + i) * 6;

            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "#d8e4a8";

            ctx.fillRect(sx, sy, 3, 2);

        }

        ctx.globalAlpha = 1;
        ctx.restore();

        return;

    }

    if (Arena.theme === "night") {

        // Moths circling the torches, and ash turning over in the
        // warm air above them.
        ctx.save();

        Arena.torches.forEach((t, ti) => {

            for (let i = 0; i < 3; i++) {

                // Each moth keeps its own orbit radius and rate.
                const rate = 900 + stormHash(i + ti * 13) * 900;
                const orbit = 26 + stormHash(i + ti * 29) * 30;
                const a = now / rate + i * 2.1 + ti;

                const mx = t.x + Math.cos(a) * orbit;
                const my = t.y - 16 + Math.sin(a * 1.4) * orbit * 0.45;

                ctx.globalAlpha = 0.5 + Math.sin(a * 3) * 0.2;
                ctx.fillStyle = "#e8d9b0";

                ctx.fillRect(mx, my, 3, 2);

            }

            // Ash lifting off the flame.
            for (let i = 0; i < 4; i++) {

                const rise = ((now / 3400) + i / 4 + ti * 0.2) % 1;

                const ax = t.x + Math.sin(i * 2.7 + now / 1200) * 14;
                const ay = t.y - 10 - rise * 90;

                ctx.globalAlpha = (1 - rise) * 0.3;
                ctx.fillStyle = "#8c8478";

                ctx.fillRect(ax, ay, 2, 2);

            }

        });

        ctx.globalAlpha = 1;
        ctx.restore();

        return;

    }

    if (Arena.theme === "throne") {

        // Dust turning slowly in the light from the right - the
        // only thing moving in an otherwise still hall.
        ctx.save();

        for (let i = 0; i < 34; i++) {

            const t = ((now / 11000) + stormHash(i + 77)) % 1;

            const dx = canvas.width - t * canvas.width * 1.05;
            const dy = stormHash(i + 133) * canvas.height
                       + Math.sin(now / 1800 + i) * 12;

            ctx.globalAlpha = Math.sin(t * Math.PI) * 0.3;
            ctx.fillStyle = "#ffeccd";

            ctx.beginPath();
            ctx.arc(dx, dy, 1.7, 0, Math.PI * 2);
            ctx.fill();

        }

        ctx.globalAlpha = 1;
        ctx.restore();

        return;

    }

    if (isGreenTheme()) {

        // Airborne dressing, per arena. Petals belong to the rose
        // court; further out it becomes leaf fall, then fireflies
        // under the closed canopy, then rain driven through the
        // trees. The ambient layer is what a place sounds like
        // when you can't hear it.
        if (Arena.theme === "grove")
            drawGroveFireflies(now);
        else if (Arena.theme === "stormGrove")
            drawStormGroveRain(now);

        // Petals coming down off the trees, on top of the static
        // ones already baked into the floor.
        ctx.save();

        const petalColors = ["#c8425c", "#8f1e33", "#e0768c"];

        for (let i = 0; i < 30; i++) {

            const fall = ((now / 7000) + stormHash(i + 900)) % 1;

            // Sway as they drop, so they flutter rather than
            // dropping like stones.
            const px = stormHash(i + 21) * canvas.width
                       + Math.sin(now / 900 + i * 1.7) * 22;
            const py = fall * (canvas.height + 40) - 20;

            ctx.globalAlpha = 0.65 * Math.min(1, (1 - fall) * 3);
            ctx.fillStyle = petalColors[i % petalColors.length];

            // Tilt flips as it falls - reads as a tumbling petal.
            const tilt = Math.sin(now / 500 + i) > 0;

            ctx.fillRect(px, py, tilt ? 4 : 2, tilt ? 2 : 4);

        }

        ctx.globalAlpha = 1;
        ctx.restore();

    // Fireflies drifting over the court. Purely ambient -
    // positions are a function of time and index, so there is
    // no state to update and nothing to clean up.
    ctx.save();

    for (let i = 0; i < 22; i++) {

        const fx = ((i * 137.5) % 100) / 100 * canvas.width
                   + Math.sin(now / 1900 + i) * 34;

        const fy = ((i * 71.3) % 100) / 100 * canvas.height
                   + Math.cos(now / 1500 + i * 1.7) * 26;

        // Each blinks on its own slow cycle.
        const blink = 0.35 + Math.sin(now / 600 + i * 2.1) * 0.35;

        if (blink <= 0.05)
            continue;

        ctx.globalAlpha = blink;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#e8ff9a";
        ctx.fillStyle = "#f2ffb0";

        ctx.beginPath();
        ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
        ctx.fill();

    }

    ctx.globalAlpha = 1;
    ctx.restore();


        return;

    }

    if (Arena.theme === "storm") {

    const flash = getStormFlash();

    // ---- rain ----
    //
    // Drop lanes come from a hash of the drop index, NOT from
    // an arithmetic step. The first version used (i * 137.5)
    // % 100, which only yields EIGHT distinct values, so every
    // drop stacked into the same few columns and the downpour
    // read as a row of dashed vertical bars.
    //
    // Three depth layers - far/mid/near - each with its own
    // length, thickness, opacity, speed and slant, so the
    // rain has depth instead of being one flat sheet. Each
    // layer is a single path stroked once.
    const layers = [
        { count: 110, len: 11, w: 1, a: 0.14, speed: 1000, slant: 0.24 },
        { count: 85, len: 19, w: 1.5, a: 0.22, speed: 1550, slant: 0.28 },
        { count: 55, len: 30, w: 2.3, a: 0.3, speed: 2250, slant: 0.32 }
    ];

    const span = canvas.height + 220;

    layers.forEach((L, li) => {

        ctx.save();

        ctx.strokeStyle = `rgba(190, 214, 245, ${L.a + flash * 0.22})`;
        ctx.lineWidth = L.w;
        ctx.lineCap = "round";

        ctx.beginPath();

        for (let i = 0; i < L.count; i++) {

            const lane = stormHash(i + li * 977);
            const vary = stormHash(i + li * 977 + 31);

            const x = lane * (canvas.width + 280) - 140;
            const speed = L.speed * (0.82 + vary * 0.45);
            const len = L.len * (0.7 + vary * 0.7);

            // Offsetting by the hash rather than by i keeps
            // drops in a lane from marching in lockstep.
            const y = ((now / 1000) * speed + vary * span) % span - 110;

            ctx.moveTo(x, y);
            ctx.lineTo(x - len * L.slant, y + len);

        }

        ctx.stroke();
        ctx.restore();

    });

    // Splashes: little expanding ticks where drops land, which
    // is most of what sells rain as rain rather than as
    // falling lines.
    ctx.save();

    ctx.strokeStyle = `rgba(205, 226, 250, ${0.26 + flash * 0.2})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    for (let i = 0; i < 46; i++) {

        const cyc = ((now / 560) + stormHash(i + 555)) % 1;

        // Only alive for the first part of its cycle.
        if (cyc > 0.34)
            continue;

        const r = 2 + cyc * 10;
        const sx = stormHash(i + 700) * canvas.width;
        const sy = stormHash(i + 900) * canvas.height;

        ctx.moveTo(sx - r, sy);
        ctx.lineTo(sx - r * 0.45, sy);
        ctx.moveTo(sx + r * 0.45, sy);
        ctx.lineTo(sx + r, sy);

    }

    ctx.stroke();
    ctx.restore();

    // Lightning over the entities too, so a strike lights the
    // whole scene and not just the floor.
    if (flash > 0) {

        ctx.save();
        ctx.fillStyle = `rgba(206, 226, 255, ${flash * 0.16})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

    }


        // Ripples where the rain lands in standing water.
        ctx.save();

        ctx.strokeStyle = "rgba(178, 204, 236, 0.22)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();

        for (let i = 0; i < 26; i++) {

            const cyc = ((now / 900) + stormHash(i + 2100)) % 1;
            const r = 3 + cyc * 16;

            const rx = stormHash(i + 2300) * canvas.width;
            const ry = stormHash(i + 2500) * canvas.height;

            ctx.moveTo(rx + r, ry);
            ctx.ellipse(rx, ry, r, r * 0.4, 0, 0, Math.PI * 2);

        }

        ctx.stroke();
        ctx.restore();

        // Wind-torn debris skidding across the floor.
        ctx.save();

        for (let i = 0; i < 14; i++) {

            const t = ((now / 2100) + stormHash(i + 3100)) % 1;

            const dx = t * (canvas.width + 120) - 60;
            const dy = stormHash(i + 3300) * canvas.height
                       + Math.sin(now / 400 + i) * 10;

            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#6a7180";

            ctx.fillRect(dx, dy, 5, 2);

        }

        ctx.globalAlpha = 1;
        ctx.restore();

        return;

    }

}

// =====================================
// TORCHES
// =====================================

function drawTorches() {

    // Night torches are the arena's only light source, so
    // they render bigger: a heavier bracket, a taller flame
    // with a white-hot inner tongue, and a stronger halo.
    const night = Arena.theme === "night";
    const garden = isGreenTheme();
    const storm = Arena.theme === "storm";

    const now = Date.now();
    const flicker = Math.sin(now / 80) * (night ? 3 : 2);

    // The rose court hangs lanterns rather than mounting torches:
    // a bracket arm, a glass box, and a slow sway instead of a
    // flicker, so evening in a garden doesn't read like a dungeon.
    if (garden) {

        const sway = Math.sin(Date.now() / 420) * 2.5;

        Arena.torches.forEach(t => {

            ctx.save();

            // Standing post: these are free-standing lamps in a
            // garden now, not brackets bolted to a column, so
            // they need a pole and a base or they read as
            // floating.
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.ellipse(t.x, t.y + 30, 13, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#2f2a24";
            ctx.fillRect(t.x - 2.5, t.y - 14, 5, 44);

            ctx.fillStyle = "#231f1a";
            ctx.fillRect(t.x - 9, t.y + 26, 18, 5);

            // Arm and hook over the glass.
            ctx.fillStyle = "#2f2a24";
            ctx.fillRect(t.x - 1.5, t.y - 26, 3, 12);
            ctx.fillRect(t.x - 7, t.y - 27, 14, 3);

            const gx = t.x + sway;

            // Glass box.
            ctx.fillStyle = "rgba(255, 226, 160, 0.28)";
            ctx.fillRect(gx - 8, t.y - 14, 16, 20);

            ctx.strokeStyle = "#2f2a24";
            ctx.lineWidth = 2;
            ctx.strokeRect(gx - 8, t.y - 14, 16, 20);

            // Flame inside.
            ctx.shadowBlur = 22;
            ctx.shadowColor = "#ffd27a";

            ctx.fillStyle = "#ffcf7a";
            ctx.beginPath();
            ctx.ellipse(gx, t.y - 3, 4, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fff6d8";
            ctx.beginPath();
            ctx.ellipse(gx, t.y - 2, 2, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

        });

        return;

    }

    // The storm ruin: low braziers thrashed by the wind, then
    // the weather itself - rain and lightning drawn over the top
    // of everything, so it reads as falling in front of the
    // camera rather than being part of the floor.
    if (storm) {

        const gust = Math.sin(now / 61) * 4 + Math.sin(now / 143) * 3;

        Arena.torches.forEach(t => {

            ctx.save();

            // Iron basket on stubby legs.
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.beginPath();
            ctx.ellipse(t.x, t.y + 20, 22, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#20242e";
            ctx.fillRect(t.x - 16, t.y + 2, 32, 12);
            ctx.fillRect(t.x - 13, t.y + 14, 5, 7);
            ctx.fillRect(t.x + 8, t.y + 14, 5, 7);

            ctx.fillStyle = "#39404f";
            ctx.fillRect(t.x - 16, t.y, 32, 4);

            // Flame, leaning with the gust rather than standing
            // straight up.
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#ff9a3c";

            ctx.fillStyle = "#ff7a24";
            ctx.beginPath();
            ctx.ellipse(t.x + gust * 0.9, t.y - 14, 10, 18, gust * 0.05, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffb03e";
            ctx.beginPath();
            ctx.ellipse(t.x + gust * 1.2, t.y - 11, 6, 11, gust * 0.05, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffe9a8";
            ctx.beginPath();
            ctx.ellipse(t.x + gust * 1.4, t.y - 8, 2.5, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

        });

        // Sparks torn off the fires and blown sideways.
        ctx.save();

        Arena.torches.forEach((t, ti) => {

            for (let i = 0; i < 4; i++) {

                const phase = ((now / 1500) + (i / 4) + ti * 0.23) % 1;

                const sx = t.x + phase * 120 * (ti % 2 ? -1 : 1)
                           + Math.sin(i + now / 300) * 8;
                const sy = t.y - 12 - phase * 70;

                ctx.globalAlpha = (1 - phase) * 0.7;
                ctx.fillStyle = i % 2 ? "#ffd27a" : "#ff9a3c";

                ctx.beginPath();
                ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
                ctx.fill();

            }

        });

        ctx.globalAlpha = 1;
        ctx.restore();

        return;

    }

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