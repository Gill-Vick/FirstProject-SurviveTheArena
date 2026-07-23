// =====================================
// Percentage-of-canvas layout helpers
// =====================================
//
// Centralized scaling system: every position/size in this
// file is expressed as a percentage of the *current*
// canvas.width/height via pw()/ph(), computed fresh on every
// call rather than cached. That's what makes every menu, the
// HUD, the shop, and the bestiary automatically re-layout
// correctly the instant canvas.width/height changes (window
// resize, mobile rotation, whatever) - nothing here needs to
// know or care what the actual resolution is.

function pw(pct) {

    return canvas.width * pct;

}

function ph(pct) {

    return canvas.height * pct;

}

// =====================================
// Buttons
// =====================================
//
// These used to be plain consts computed once at load time -
// which meant they went stale the moment canvas.width/height
// changed. They're functions now, recomputed from the
// *current* canvas size every time they're drawn or
// hit-tested, so a button's clickable area can never drift
// out of sync with where it's actually drawn.

function getMenuButtonMetrics() {

    return {
        width: pw(0.24),
        height: ph(0.11),
        gap: ph(0.03),
        startY: ph(0.40)
    };

}

function getStartButton() {

    const m = getMenuButtonMetrics();

    return {
        x: canvas.width / 2 - m.width / 2,
        y: m.startY,
        width: m.width,
        height: m.height
    };

}

function getShopButton() {

    const m = getMenuButtonMetrics();

    return {
        x: canvas.width / 2 - m.width / 2,
        y: m.startY + m.height + m.gap,
        width: m.width,
        height: m.height
    };

}

function getBestiaryButton() {

    const m = getMenuButtonMetrics();

    return {
        x: canvas.width / 2 - m.width / 2,
        y: m.startY + (m.height + m.gap) * 2,
        width: m.width,
        height: m.height
    };

}

function getShopBackButton() {

    return {
        x: pw(0.03),
        y: ph(0.05),
        width: pw(0.11),
        height: ph(0.065)
    };

}

// =====================================
// Mode Select
// =====================================
//
// Shown after clicking START - two lore cards side by side,
// Campaign and Boss Rush, sized/positioned as percentages so
// they reflow with the rest of the menu.

function getModeSelectCardMetrics() {

    return {
        width: pw(0.3),
        height: ph(0.5),
        gap: pw(0.04),
        y: ph(0.28)
    };

}

// The four trials are laid out as a 2x2 grid: Campaign and
// Boss Rush on top, Endless and Custom beneath them. col 0 =
// left of center, col 1 = right; row 0 = top, row 1 = bottom.

function getModeCardRect(col, row) {

    const m = getModeSelectCardMetrics();
    const rowGap = ph(0.02);
    const cardHeight = (m.height - rowGap) / 2;

    return {
        x: col === 0
            ? canvas.width / 2 - m.gap / 2 - m.width
            : canvas.width / 2 + m.gap / 2,
        y: m.y + row * (cardHeight + rowGap),
        width: m.width,
        height: cardHeight
    };

}

function getCampaignCardButton() { return getModeCardRect(0, 0); }
function getBossRushCardButton() { return getModeCardRect(1, 0); }
function getEndlessCardButton()  { return getModeCardRect(0, 1); }
function getCustomCardButton()   { return getModeCardRect(1, 1); }

function getModeSelectBackButton() {

    return getShopBackButton();

}

function getBestiaryBackButton() {

    return getShopBackButton();

}

function getHomeButton() {

    const width = pw(0.2);
    const height = ph(0.12);

    return {
        x: canvas.width / 2 - width / 2,
        y: ph(0.62),
        width,
        height
    };

}

// =====================================
// Pause
// =====================================
//
// A small button top-center during play (P also toggles).
// The menu it opens always offers resume/abandon; custom
// mode adds wave jumping and an immortality toggle.

function getPauseButton() {

    const width = pw(0.034);
    const height = ph(0.055);

    return {
        x: canvas.width / 2 - width / 2,
        y: ph(0.02),
        width,
        height
    };

}

function getPausePanelRect() {

    // Taller than it used to be - the audio sliders live here
    // now (below the custom-mode cheats when those show). The
    // same panel doubles as the main menu's audio settings
    // popup, where the cheat rows never show regardless of the
    // last run's mode - hence the state check.
    const custom = Game.state === "paused" && Game.mode === "custom";

    const width = pw(0.34);
    const height = custom ? ph(0.84) : ph(0.58);

    return {
        x: canvas.width / 2 - width / 2,
        y: canvas.height / 2 - height / 2,
        width,
        height
    };

}

function getPauseResumeButton() {

    const panel = getPausePanelRect();
    const width = pw(0.2);

    return {
        x: canvas.width / 2 - width / 2,
        y: panel.y + ph(0.1),
        width,
        height: ph(0.07)
    };

}

const PAUSE_WAVE_DELTAS = [-5, -1, 1, 5];

function getPauseWaveButton(index) {

    const panel = getPausePanelRect();

    const width = pw(0.055);
    const gap = pw(0.012);
    const total = width * 4 + gap * 3;
    const startX = canvas.width / 2 - total / 2;

    return {
        x: startX + index * (width + gap),
        y: panel.y + ph(0.29),
        width,
        height: ph(0.055)
    };

}

function getPauseImmortalButton() {

    const panel = getPausePanelRect();
    const width = pw(0.2);

    return {
        x: canvas.width / 2 - width / 2,
        y: panel.y + ph(0.38),
        width,
        height: ph(0.06)
    };

}

// =====================================
// Pause Menu - Audio Controls
// =====================================
//
// Three sliders (master / effects / music) plus a mute
// toggle. Values live in Save and route through the Sound
// setters so a drag is audible immediately.

const PAUSE_VOLUME_KEYS = [
    { key: "masterVolume", label: "MASTER" },
    { key: "sfxVolume", label: "EFFECTS" },
    { key: "musicVolume", label: "MUSIC" }
];

// Where the audio block starts inside the panel - below the
// custom-mode cheat buttons when those are showing.
function getPauseAudioStart() {

    return (Game.state === "paused" && Game.mode === "custom")
        ? 0.47
        : 0.21;

}

function getPauseVolumeSlider(index) {

    const panel = getPausePanelRect();

    return {
        x: panel.x + panel.width * 0.38,
        y: panel.y + ph(getPauseAudioStart() + index * 0.055),
        width: panel.width * 0.52,
        height: ph(0.024)
    };

}

function getPauseMuteButton() {

    const panel = getPausePanelRect();
    const width = pw(0.2);

    return {
        x: canvas.width / 2 - width / 2,
        y: panel.y + ph(getPauseAudioStart() + 3 * 0.055 + 0.012),
        width,
        height: ph(0.055)
    };

}

function setVolumeFromSliderX(key, slider, x) {

    const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.width));

    if (key === "masterVolume")
        Sound.setMasterVolume(pct);

    else if (key === "sfxVolume")
        Sound.setSfxVolume(pct);

    else
        Sound.setMusicVolume(pct);

}

// Shared by the pause menu and the main menu's audio settings
// popup: slider grabs (which also start a drag, released by
// handleMenuMouseUp) and the mute toggle. Returns true if the
// click landed on one of the controls.
function handleAudioControlsClick(x, y) {

    let handled = false;

    // The hit zone is padded vertically so the thin slider
    // track is easy to grab.
    PAUSE_VOLUME_KEYS.forEach((entry, i) => {

        const slider = getPauseVolumeSlider(i);

        if (
            x >= slider.x && x <= slider.x + slider.width &&
            y >= slider.y - slider.height &&
            y <= slider.y + slider.height * 2
        ) {
            Game.volumeDragging = entry.key;
            setVolumeFromSliderX(entry.key, slider, x);
            handled = true;
        }

    });

    if (hitRect(getPauseMuteButton(), x, y)) {

        Sound.toggleMuted();

        // Audible only when this unmuted, which is exactly the
        // feedback that matters.
        Sound.play("uiClick");

        handled = true;

    }

    return handled;

}

function drawPauseVolumeSliders(panel) {

    PAUSE_VOLUME_KEYS.forEach((entry, i) => {

        const slider = getPauseVolumeSlider(i);
        const value = Save[entry.key];

        const labelScale = Math.max(1, Math.round(ph(0.018) / PIXEL_GLYPH_H));
        const labelX = panel.x + panel.width * 0.07;

        drawPixelText(
            entry.label,
            labelX + measurePixelText(entry.label) * labelScale / 2,
            slider.y + slider.height / 2,
            labelScale,
            { color: "#f6efdd", shadow: "rgba(0, 0, 0, 0.85)" }
        );

        // Track, filled portion, knob - hard-edged to match
        // the rest of the pixel chrome.
        const u = Math.max(2, Math.round(slider.height * 0.3));

        ctx.fillStyle = "#1a1610";
        ctx.fillRect(slider.x - u, slider.y - u, slider.width + u * 2, slider.height + u * 2);

        ctx.fillStyle = "#3a342c";
        ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

        ctx.fillStyle = "#c9a227";
        ctx.fillRect(slider.x, slider.y, slider.width * value, slider.height);

        const knobW = Math.max(4, Math.round(slider.height * 0.7));
        const knobX = Math.round(slider.x + slider.width * value);

        ctx.fillStyle = "#0f0c08";
        ctx.fillRect(knobX - knobW / 2 - u, slider.y - u, knobW + u * 2, slider.height + u * 2);
        ctx.fillStyle = "#f6efdd";
        ctx.fillRect(knobX - knobW / 2, slider.y - u * 0.5, knobW, slider.height + u);

    });

    const muted = Sound.isMuted();

    drawButton(
        getPauseMuteButton(),
        muted ? "SOUND: OFF" : "SOUND: ON",
        muted ? "#8b1520" : "#444",
        "white",
        ph(0.02)
    );

}

function getPauseAbandonButton() {

    const panel = getPausePanelRect();
    const width = pw(0.2);

    return {
        x: canvas.width / 2 - width / 2,
        y: panel.y + panel.height - ph(0.1),
        width,
        height: ph(0.07)
    };

}

function drawPauseMenu() {

    // Dim the frozen scene behind the menu.
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const panel = getPausePanelRect();

    ctx.fillStyle = "#1c1815";
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = Math.max(3, ph(0.005));
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    drawPixelText(
        "PAUSED",
        canvas.width / 2,
        panel.y + ph(0.055),
        fitPixelScale("PAUSED", panel.width * 0.6, ph(0.05)),
        { color: "#f6efdd", shadow: "#6b4c0d" }
    );

    drawButton(getPauseResumeButton(), "RESUME", "lime", "black", ph(0.026));

    if (Game.mode === "custom") {

        drawPixelText(
            `WAVE ${Game.wave}`,
            canvas.width / 2,
            panel.y + ph(0.252),
            Math.max(1, Math.round(ph(0.026) / PIXEL_GLYPH_H)),
            { color: "#f1c40f", shadow: "rgba(0, 0, 0, 0.85)" }
        );

        PAUSE_WAVE_DELTAS.forEach((delta, i) => {

            drawButton(
                getPauseWaveButton(i),
                (delta > 0 ? "+" : "") + delta,
                "#333",
                "white",
                ph(0.022)
            );

        });

        drawButton(
            getPauseImmortalButton(),
            `IMMORTAL: ${Game.immortal ? "ON" : "OFF"}`,
            Game.immortal ? "#f1c40f" : "#444",
            Game.immortal ? "black" : "white",
            ph(0.022)
        );

    }

    drawPauseVolumeSliders(panel);

    drawButton(getPauseAbandonButton(), "ABANDON RUN", "#8b1520", "white", ph(0.024));

}

function handlePauseMenuClick(x, y) {

    if (hitRect(getPauseResumeButton(), x, y)) {
        Sound.play("uiClick");
        togglePause();
        return;
    }

    if (hitRect(getPauseAbandonButton(), x, y)) {
        Sound.play("uiClick");
        resetGame();
        return;
    }

    if (handleAudioControlsClick(x, y))
        return;

    if (Game.mode !== "custom")
        return;

    PAUSE_WAVE_DELTAS.forEach((delta, i) => {

        if (hitRect(getPauseWaveButton(i), x, y)) {
            Sound.play("uiClick");
            jumpToWave(Game.wave + delta);
        }

    });

    if (hitRect(getPauseImmortalButton(), x, y)) {
        Sound.play("uiClick");
        Game.immortal = !Game.immortal;
    }

}

// =====================================
// Main Menu - Audio Settings
// =====================================
//
// A headphones button in the home screen's top-left corner
// opens a small popup reusing the pause menu's audio controls
// (same panel, sliders, and mute button - see the state
// guards in getPausePanelRect / getPauseAudioStart).

function getAudioSettingsButton() {

    const size = ph(0.075);

    return {
        x: pw(0.015),
        y: ph(0.025),
        width: size,
        height: size
    };

}

function drawAudioSettingsButton() {

    const b = getAudioSettingsButton();

    drawButton(b, "", "#4a4a52", "white", 1);

    // Headphones drawn on the same pixel grid as everything
    // else: a stepped band (three blocks, so the arc reads as
    // pixel-art rather than a smooth stroke) over two solid
    // ear cups.
    const p = Math.max(2, Math.round(b.width * 0.085));

    const cx = Math.round(b.x + b.width / 2);
    const cy = Math.round(b.y + b.height / 2);

    ctx.save();

    ctx.fillStyle = "#e8e8f0";

    // Band: flat crown with a stepped shoulder each side, so
    // the arc reads as pixel-art rather than a smooth stroke.
    ctx.fillRect(cx - p * 2, cy - p * 3, p * 4, p);
    ctx.fillRect(cx - p * 3, cy - p * 2, p, p);
    ctx.fillRect(cx + p * 2, cy - p * 2, p, p);

    // Ear cups hanging off the band's ends.
    ctx.fillRect(cx - p * 4, cy - p, p * 2, p * 3);
    ctx.fillRect(cx + p * 2, cy - p, p * 2, p * 3);

    // Darker inner face on each cup so they read as solid
    // objects instead of flat tabs.
    ctx.fillStyle = "#7d7d8c";
    ctx.fillRect(cx - p * 3, cy, p, p * 2);
    ctx.fillRect(cx + p * 2, cy, p, p * 2);

    ctx.restore();

}

function drawAudioSettingsMenu() {

    const panel = getPausePanelRect();

    ctx.fillStyle = "#1c1815";
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = Math.max(3, ph(0.005));
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    drawPixelText(
        "AUDIO",
        canvas.width / 2,
        panel.y + ph(0.08),
        fitPixelScale("AUDIO", panel.width * 0.6, ph(0.05)),
        { color: "#f6efdd", shadow: "#6b4c0d" }
    );

    drawPauseVolumeSliders(panel);

    drawButton(getPauseAbandonButton(), "BACK", "#555", "white", ph(0.024));

}

const SHOP_ITEM_IDS = [

    // Warrior
    "shield", "bow",
    "wetStone", "circleStrike", "hermesShoes",
    "berserkerMedallion", "forgeSigil",
    "knightLocket", "windrunnerAnklet", "kingsBlade",

    // Ranger
    "bracelet", "dagger", "emberArrows",
    "falconQuiver", "swiftdrawGloves",
    "huntersMark", "galeRecurve",
    "stormfletch", "cycloneVeil", "stormpiercer",

    // Thief
    "cloak", "throwingKnife", "thiefsWit",
    "voidEnchant", "masterOfBlade",
    "shadowreachBlades", "pocketWatch",
    "voltaicFang", "leylineSnare", "moonlightDaggers",

    // Mage
    "halo", "sunburst", "sunstone",
    "refraction", "amberlightField",
    "radiantOverload", "elementalPrism",
    "sanctuary", "corona", "sovereignScepter",

    // Shared
    "critRate"

];

// =====================================
// Stage Picker Visibility
// =====================================
//
// Which staged items show the 3-segment stage picker, and
// when. Every class owns exactly one item in each group:
//
//   [E] weapon line - picker always visible
//     Warrior bow / Ranger dagger / Thief throwing knife /
//     Mage sunburst (Glimmer -> Sunburst -> Solar Flare)
//
//   Defensive-utility line - picker once stage 1 is owned
//     Warrior shield / Thief cloak / Ranger bracelet /
//     Mage halo
//
// Between them these cover all of STAGED_ITEM_IDS. The click
// and drag handlers already work off STAGED_ITEM_IDS, so an
// item missing from BOTH lists is still draggable but draws
// no picker - which is exactly how the Mage's halo and
// sunburst ended up unswitchable.

const PICKER_ALWAYS = ["bow", "dagger", "throwingKnife", "sunburst"];

const PICKER_WHEN_OWNED = ["shield", "cloak", "bracelet", "halo"];

// The Armoury only lists the currently selected class's
// items, plus shared ones (crit). Every row index used for
// layout/hit-testing below is an index into THIS list, not
// SHOP_ITEM_IDS.
function getArmouryItemIds() {

    return SHOP_ITEM_IDS.filter(id => {

        const classId = SHOP_ITEMS[id].classId ?? "shared";

        return classId === "shared" || classId === Save.selectedClass;

    });

}

// Cycles the Armoury's class selector. Persisted immediately,
// so whichever class is showing when the player leaves the
// Armoury is the class the next run starts as.
function cycleArmouryClass(step) {

    Sound.play("uiClick");

    const index = CLASSES.findIndex(c => c.id === Save.selectedClass);

    const next = (index + step + CLASSES.length) % CLASSES.length;

    Save.setSelectedClass(CLASSES[next].id);

    // Each class's list starts back at the top.
    Game.armouryScroll = 0;

}

// Left (-1) / right (+1) class selector arrows, flanking the
// class name under the ARMOURY title.
function getArmouryClassArrowButton(direction) {

    const width = pw(0.045);
    const height = ph(0.055);
    const offset = pw(0.13);

    return {
        x: canvas.width / 2 + direction * offset - width / 2,
        y: ph(0.11),
        width,
        height
    };

}

// =====================================
// Shop Row Layout
// =====================================
//
// rowHeight shrinks automatically as more items get added to
// SHOP_ITEM_IDS, so the full list always fits between
// rowStart and the bottom of the screen instead of overflowing
// it. Capped at the original 0.095 so the layout looks
// unchanged for the smaller list sizes it was tuned for.

function getShopRowMetrics() {

    // Fixed, comfortable row height - the list scrolls (see
    // Game.armouryScroll) instead of squeezing rows together
    // when a class has a lot of items. rowStart is already
    // shifted by the scroll offset, so every button/slider
    // getter below moves with the list automatically.
    // viewTop/viewBottom bound the visible list area (below
    // the class selector, above the screen edge).
    return {
        rowHeight: ph(0.115),
        rowStart: ph(0.19) - Game.armouryScroll,
        viewTop: ph(0.19),
        viewBottom: ph(0.97),
        marginX: pw(0.04)
    };

}

function getArmouryMaxScroll() {

    const { rowHeight, viewTop, viewBottom } = getShopRowMetrics();

    const contentHeight = getArmouryItemIds().length * rowHeight;

    return Math.max(0, contentHeight - (viewBottom - viewTop));

}

// Scrolls the Armoury list by deltaY logical px, clamped to
// the content. Called from the wheel/touch handlers in
// input.js and re-clamped (delta 0) whenever the list or
// canvas size changes.
function scrollArmoury(deltaY) {

    Game.armouryScroll = Math.max(
        0,
        Math.min(getArmouryMaxScroll(), Game.armouryScroll + deltaY)
    );

}

function getShopBtnSize() {

    return {
        width: pw(0.085),
        height: ph(0.045)
    };

}

function getShopBuyButton(index) {

    const { rowHeight, rowStart } = getShopRowMetrics();
    const btn = getShopBtnSize();

    return {
        x: canvas.width - btn.width - pw(0.04),
        y: rowStart + index * rowHeight + ph(0.022),
        width: btn.width,
        height: btn.height
    };

}

function getShopEquipButton(index) {

    const { rowHeight, rowStart } = getShopRowMetrics();
    const btn = getShopBtnSize();

    return {
        x: canvas.width - btn.width * 2 - pw(0.055),
        y: rowStart + index * rowHeight + ph(0.022),
        width: btn.width,
        height: btn.height
    };

}

// Repeatable items (crit, locket) show a level slider instead
// of an equip button. It sits in the row's right-hand control
// area - just left of the Buy plate, where the equip button
// would otherwise be - and vertically centred, so it no longer
// runs across the item's own price line on the left.
function getShopCritSlider(index) {

    const { rowHeight, rowStart } = getShopRowMetrics();
    const btn = getShopBtnSize();

    const width = pw(0.16);

    return {
        x: canvas.width - btn.width - pw(0.055) - width,
        y: rowStart + index * rowHeight + rowHeight / 2 - ph(0.01),
        width,
        height: ph(0.02)
    };

}

// Stage picker rect for any staged item's row (bow, shield,
// cloak, dagger, halo, sunburst).
//
// Lives in the row's right-hand control area, same as the
// crit/locket sliders - but one slot further left, because a
// staged item shows BOTH an equip and a buy plate while a
// repeatable one only shows buy. Sat on the left before, where
// it crowded the item's own price / "MAX LEVEL" line.
function getShopStageSlider(index) {

    const { rowHeight, rowStart } = getShopRowMetrics();
    const btn = getShopBtnSize();

    const width = pw(0.12);

    return {
        x: canvas.width - btn.width * 2 - pw(0.075) - width,
        y: rowStart + index * rowHeight + rowHeight / 2 - ph(0.014),
        width,
        height: ph(0.028)
    };

}

// =====================================
// Bestiary Grid Layout
// =====================================
//
// Previously a fixed 110px cell size starting at a fixed
// x=80 offset - on any canvas wider than ~700px (which is
// most of them) that left the whole grid squashed into a
// fraction of the available width instead of spanning it.
//
// Cell size here is *derived* - computed from however much
// space is actually available, both width- and height-wise
// (so it can never overflow vertically either), then the
// grid is centered in whichever axis ends up with room to
// spare. That means it always spans the full width when
// there's enough vertical room, and shrinks gracefully
// instead of overflowing when there isn't.

function getBestiaryPanelRect() {

    const marginX = pw(0.05);
    const marginY = ph(0.11);

    return {
        x: marginX,
        y: marginY,
        width: canvas.width - marginX * 2,
        height: canvas.height - marginY * 2
    };

}

// Creatures per grid page. The full list (every enemy plus
// its elite) is far too long for one grid, so it's paged.
const BESTIARY_PER_PAGE = 12;

function getBestiaryGridMetrics() {

    const panel = getBestiaryPanelRect();

    // Generous gaps so cells (and their name labels) read as
    // clearly separate instead of packed edge-to-edge.
    const gapX = pw(0.02);
    const gapY = ph(0.085);

    // Starts just under the page subtitle (ph(0.235)) - the
    // old ph(0.34) left an empty band across the top of the
    // tome that the cells could have been using.
    const gridTop = ph(0.30);

    // The bottom row's nameplate hangs ph(0.008) + ph(0.058)
    // below its cell, so that strip is reserved here -
    // otherwise the last row's plates poke out of the panel.
    const gridBottom = panel.y + panel.height - ph(0.045) - ph(0.07);

    const availableWidth = panel.width - pw(0.04);
    const availableHeight = gridBottom - gridTop;

    // Cells are square, so whichever axis is tighter caps how
    // big they get - and that depends on the window's shape.
    // A fixed 4x3 wasted most of a wide panel's width (cells
    // came out a third of the size the width allowed, clumped
    // in the middle); 6x2 wastes a tall one's height. So try
    // each even column count and keep whichever gives the
    // biggest cell: 6x2 on a wide screen, 4x3 on a portrait
    // one. Even counts only, so a creature and its elite stay
    // side by side rather than wrapping apart.
    let best = null;

    [2, 4, 6].forEach(cols => {

        const rows = Math.ceil(BESTIARY_PER_PAGE / cols);

        const cell = Math.min(
            (availableWidth - gapX * (cols - 1)) / cols,
            (availableHeight - gapY * (rows - 1)) / rows
        );

        if (!best || cell > best.cell)
            best = { cols, rows, cell };

    });

    const { cols, rows, cell } = best;

    // When height is the binding constraint the row would sit
    // in a narrow clump mid-panel, so the leftover width is
    // pushed into the gaps to spread the cells out. Capped so
    // a very wide, very short window doesn't scatter them.
    const spreadGapX = Math.min(
        gapX + (availableWidth - (cell * cols + gapX * (cols - 1))) / (cols - 1),
        cell * 0.5
    );

    const usedWidth = cell * cols + spreadGapX * (cols - 1);
    const gridX = panel.x + pw(0.02) + (availableWidth - usedWidth) / 2;

    // Centered in the leftover height too, so a tall window
    // doesn't leave the grid stranded at the top of the tome.
    const usedHeight = cell * rows + gapY * (rows - 1);
    const gridY = gridTop + Math.max(0, availableHeight - usedHeight) / 2;

    return {
        cols,
        rows,
        gridX,
        gridY,
        gapX: spreadGapX,
        gapY,
        cell
    };

}

function getBestiaryCell(index) {

    const { cols, gridX, gridY, gapX, gapY, cell } = getBestiaryGridMetrics();

    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
        x: gridX + col * (cell + gapX),
        y: gridY + row * (cell + gapY),
        width: cell,
        height: cell
    };

}

function hitRect(btn, x, y) {

    return (
        x > btn.x &&
        x < btn.x + btn.width &&
        y > btn.y &&
        y < btn.y + btn.height
    );

}

// Serif stack used across the UI chrome - falls back to
// Georgia everywhere, but reads as engraved / forged lettering
// to match the throne-room art when the fancier faces exist.
const UI_FONT = "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif";

// Largest font size at or below `desired` that fits `text`
// inside maxWidth.
//
// Canvas text neither wraps nor shrinks on its own, so any
// heading sized off the viewport HEIGHT (as all of these are)
// runs off the sides of a narrow window - which is how
// "SURVIVE THE ARENA" became "URVIVE THE AREN". Every large
// centered heading goes through here.
//
// Leaves ctx.font set to the fitted size, so callers can draw
// immediately without setting it again.

function fitFontSize(text, maxWidth, desired, weight = "bold", family = UI_FONT) {

    ctx.font = `${weight} ${desired}px ${family}`;

    const width = ctx.measureText(text).width;

    if (width <= maxWidth)
        return desired;

    const fitted = Math.max(8, Math.floor(desired * (maxWidth / width)));

    ctx.font = `${weight} ${fitted}px ${family}`;

    return fitted;

}

// Rounded-rectangle path helper - traces a rounded rect as the
// current path so it can be filled/stroked/clipped. Written by
// hand rather than relying on ctx.roundRect for older canvases.
function roundRectPath(x, y, w, h, r) {

    r = Math.max(0, Math.min(r, w / 2, h / 2));

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();

}

// =====================================
// Medieval button plate
// =====================================
//
// Every button in the game funnels through here, so this is
// what carries the theme: a rounded, drop-shadowed plate in the
// caller's accent colour, given a forged-metal bevel (glossy
// highlight up top, shaded base), a dark outer seat, and a gilt
// inner frame - the one cue shared by every button in the keep.
// Ornament scales with the button, so tiny controls (shop
// arrows, wave-jump deltas) stay slim while big menu buttons get
// the full treatment. The label is engraved serif with a carved
// drop-shadow.

function drawButton(btn, label, fill, textColor, fontSize) {

    const { x, y, width: w, height: h } = btn;

    const palette = pixelPaletteFrom(fill, textColor ?? "#ffffff");

    // Bevel step scales with the button so shop arrows and
    // wave-jump deltas stay slim while menu plates get a
    // chunky border.
    drawPixelPanel(x, y, w, h, palette, Math.min(w, h) * 0.09);

    // fontSize is the caller's intent for how big the label
    // should read; convert it to the nearest whole pixel scale
    // and then clamp so it always fits the plate.
    //
    // The height budget is generous (0.55) because glyphs are
    // exactly 7px tall with no ascenders/descenders to leave
    // room for - a tighter budget rounded small square buttons
    // (the class arrows) down to a 5x7 speck.
    const wanted = Math.max(1, Math.round((fontSize ?? ph(0.028)) / PIXEL_GLYPH_H));
    const fits = fitPixelScale(label, w * 0.78, h * 0.55);

    drawPixelText(
        label,
        x + w / 2,
        y + h / 2,
        Math.min(wanted, fits),
        { color: palette.text, shadow: palette.textShadow }
    );

}

// Coin readout: a small pixel coin sprite followed by the
// count, seated on a dark plate so it stays legible over the
// bright stained glass behind it. `x, y` stays the anchor the
// callers already pass (left edge, text baseline-ish), and the
// plate is drawn around that.

function drawCoinDisplay(x, y, size, alignRight = false) {

    const text = String(Save.coins);
    const scale = Math.max(1, Math.round(size / PIXEL_GLYPH_H));

    const coinSize = scale * 5;
    const gap = scale * 2;
    const textW = measurePixelText(text) * scale;

    const padX = scale * 3;
    const padY = scale * 3;

    const innerW = coinSize + gap + textW;
    const innerH = Math.max(coinSize, PIXEL_GLYPH_H * scale);

    // Right-aligned callers pass the RIGHT edge, so the plate
    // grows leftward as the coin count gets longer instead of
    // running off the screen (which is what clipped "Coins:"
    // on a narrow viewport).
    if (alignRight)
        x = x - innerW;

    const panelX = x - padX;
    const panelY = y - innerH / 2 - padY;
    const panelW = innerW + padX * 2;
    const panelH = innerH + padY * 2;

    drawPixelFrame(panelX, panelY, panelW, panelH, {
        unit: Math.max(2, scale),
        border: "#6b5a3e",
        borderDark: "#231b12",
        fill: "rgba(10, 8, 5, 0.8)"
    });

    // Chunky pixel coin: dark rim, gold face, one highlight
    // pip - reads as a coin at any size without a sprite.
    const coinX = Math.round(x);
    const coinY = Math.round(y - coinSize / 2);

    ctx.fillStyle = "#6b4c0d";
    ctx.fillRect(coinX + scale, coinY, coinSize - scale * 2, coinSize);
    ctx.fillRect(coinX, coinY + scale, coinSize, coinSize - scale * 2);

    ctx.fillStyle = "#e8c24d";
    ctx.fillRect(coinX + scale, coinY + scale, coinSize - scale * 2, coinSize - scale * 2);

    ctx.fillStyle = "#fff2b8";
    ctx.fillRect(coinX + scale * 1.5, coinY + scale * 1.5, scale, scale);

    drawPixelText(
        text,
        x + coinSize + gap + textW / 2,
        y,
        scale,
        { color: "#ffe066", shadow: "#4a3208" }
    );

}

// =====================================
// Staged Item Sliders
// =====================================
//
// One shared 3-segment stage picker for every staged item
// (bow 1/2/3, shield W/O/B, cloak T/S/P, dagger 1/2/3) -
// the per-item labels/colors live in STAGE_SLIDER_STYLE.

// Labels follow the same split as the picker groups: the [E]
// weapon line is numbered 1-2-3, the defensive/utility line
// uses its stage initials (Wooden/Onyx/Bulwark, Tattered/
// Shadow/Phantom, Iron/Wind/Sylph, Dim/Bright/Radiant).

const STAGE_SLIDER_STYLE = {

    bow: { labels: ["1", "2", "3"], activeColor: "#c9a227" },
    shield: { labels: ["W", "O", "B"], activeColor: "#4da6ff" },
    cloak: { labels: ["T", "S", "P"], activeColor: "#9b59b6" },
    dagger: { labels: ["1", "2", "3"], activeColor: "#95a5a6" },
    throwingKnife: { labels: ["1", "2", "3"], activeColor: "#c0392b" },
    bracelet: { labels: ["I", "W", "S"], activeColor: "#1abc9c" },
    sunburst: { labels: ["1", "2", "3"], activeColor: SUNBURST.COLOR },
    halo: { labels: ["D", "B", "R"], activeColor: HALO.COLOR }

};

// Numeric fallback so a staged item missing from the table
// above draws a plain picker instead of throwing and taking
// the whole menu down with it.
const STAGE_SLIDER_FALLBACK = {
    labels: ["1", "2", "3"],
    activeColor: "#c9a227"
};

function drawStageIndicator(slider, currentStage, itemId) {

    const { labels, activeColor } =
        STAGE_SLIDER_STYLE[itemId] ?? STAGE_SLIDER_FALLBACK;

    const segW = slider.width / 3;
    const boxW = segW * 0.82;

    const u = Math.max(2, Math.round(slider.height * 0.16));

    // One shared glyph scale across all three segments, so the
    // stage letters don't change size from box to box.
    const scale = labels.reduce(
        (min, label) => Math.min(
            min,
            fitPixelScale(label, boxW * 0.8, slider.height * 0.7)
        ),
        99
    );

    for (let s = 1; s <= 3; s++) {

        const segX = Math.round(slider.x + (s - 1) * segW);
        const active = s === currentStage;

        // Seated pixel box - lit face for the equipped stage,
        // dark iron for the others.
        ctx.fillStyle = "#12100b";
        ctx.fillRect(segX - u, Math.round(slider.y) - u, boxW + u * 2, slider.height + u * 2);

        ctx.fillStyle = active ? activeColor : "#3a352c";
        ctx.fillRect(segX, Math.round(slider.y), boxW, slider.height);

        drawPixelText(
            labels[s - 1],
            segX + boxW / 2,
            slider.y + slider.height / 2,
            scale,
            {
                color: active ? "#0f0c08" : "#9c9384",
                shadow: active ? null : "rgba(0, 0, 0, 0.6)"
            }
        );

        // Chevron between boxes, as pixel blocks.
        if (s < 3) {

            const cx = segX + boxW + (segW - boxW) / 2 - u;
            const cy = slider.y + slider.height / 2;

            ctx.fillStyle = "#7a7264";
            ctx.fillRect(cx, Math.round(cy - u * 1.5), u, u);
            ctx.fillRect(cx + u, Math.round(cy - u / 2), u, u);
            ctx.fillRect(cx, Math.round(cy + u / 2), u, u);

        }

    }

}

// Which of the 3 segments an X coordinate lands in.
function stageFromSliderX(slider, x) {

    const relativeX = x - slider.x;
    const segW = slider.width / 3;

    if (relativeX < segW) return 1;
    if (relativeX < segW * 2) return 2;
    return 3;

}

// Shared body for both level sliders: a pixel track with a
// square knob, and its readout stacked ABOVE the bar. The
// label used to sit to the right, which ran it straight under
// the Buy plate now that the slider lives in the control area.
function drawLevelSlider(slider, pct, label, accent) {

    const u = Math.max(2, Math.round(slider.height * 0.28));

    ctx.save();

    // Track.
    ctx.fillStyle = "#1a1610";
    ctx.fillRect(slider.x - u, slider.y - u, slider.width + u * 2, slider.height + u * 2);
    ctx.fillStyle = "#3a342c";
    ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

    // Filled portion.
    ctx.fillStyle = accent;
    ctx.fillRect(slider.x, slider.y, slider.width * pct, slider.height);

    // Square knob, snapped to whole pixels.
    const knobX = Math.round(slider.x + slider.width * pct);
    const knobW = Math.max(4, Math.round(slider.height * 0.7));

    ctx.fillStyle = "#0f0c08";
    ctx.fillRect(knobX - knobW / 2 - u, slider.y - u, knobW + u * 2, slider.height + u * 2);
    ctx.fillStyle = "#f6efdd";
    ctx.fillRect(knobX - knobW / 2, slider.y - u * 0.5, knobW, slider.height + u);

    ctx.restore();

    drawPixelText(
        label,
        slider.x + slider.width / 2,
        slider.y - slider.height * 0.9,
        Math.max(1, fitPixelScale(label, slider.width, slider.height * 0.8)),
        { color: accent, shadow: "rgba(0, 0, 0, 0.85)" }
    );

}

function drawCritSlider(slider, value, maxLevel) {

    const equippedPct = Math.round(Save.getEquippedCritChance() * 100);
    const maxPct = Math.round(Save.getCritChance() * 100);

    drawLevelSlider(
        slider,
        maxLevel > 0 ? value / maxLevel : 0,
        `CRIT ${equippedPct}% / ${maxPct}%`,
        "#4da6ff"
    );

}

function critLevelFromSliderX(slider, x) {

    const maxLevel = Save.critRateLevel;

    if (maxLevel <= 0)
        return 0;

    const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.width));

    return Math.round(pct * maxLevel);

}

function drawLocketSlider(slider, value, maxLevel) {

    const equippedPct = Math.round(Save.getEquippedCharmChance() * 100);
    const maxPct = Math.round(Save.getCharmChance() * 100);

    drawLevelSlider(
        slider,
        maxLevel > 0 ? value / maxLevel : 0,
        `CHARM ${equippedPct}% / ${maxPct}%`,
        "#ff69b4"
    );

}

function locketLevelFromSliderX(slider, x) {

    const maxLevel = Save.knightLocketLevel;

    if (maxLevel <= 0)
        return 0;

    const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.width));

    return Math.round(pct * maxLevel);

}

// =====================================
// Menu
// =====================================

// The keep's palette - muted enough that the pixel plates sit
// in the great hall rather than glowing on top of it. Used for
// the three front-door buttons; every other button passes its
// own accent straight to drawButton.
const MENU_ACCENTS = {
    start: "#2f7d3f",
    armoury: "#b08422",
    bestiary: "#7a4423"
};

function drawMenu() {

    ctx.drawImage(
        menuBackground,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // The big title belongs to the main menu view - the
    // Armoury draws its own header in the same spot.
    if (Game.menuView !== "shop") {

        // fitPixelScale clamps to the window, so the title can
        // never crop the way the old height-sized serif did.
        //
        // The width budget also has to clear the coin plate in
        // the top-right corner: the title is centred, so its
        // half-width must stop short of where that plate
        // starts, or a long coin count gets run over.
        const titleScale = fitPixelScale(
            "SURVIVE THE ARENA",
            canvas.width * 0.66,
            ph(0.1)
        );

        // Gilt drop shadow under a bone-white face, so it
        // still reads as a title plate rather than body text.
        drawPixelText(
            "SURVIVE THE ARENA",
            canvas.width / 2,
            ph(0.14),
            titleScale,
            { color: "#f6efdd", shadow: "#6b4c0d" }
        );

    }

    drawCoinDisplay(canvas.width - pw(0.025), ph(0.085), ph(0.032), true);

    if (Game.menuView === "modeSelect") {
        drawModeSelect();
        return;
    }

    if (Game.menuView === "shop") {
        drawShop();
        return;
    }

    if (Game.menuView === "bestiary") {
        drawBestiary();
        return;
    }

    if (Game.menuView === "bestiaryDetail") {
        drawBestiaryDetail();
        return;
    }

    if (Game.menuView === "audioSettings") {
        drawAudioSettingsMenu();
        return;
    }

    // The three front-door buttons use the pixel plate rather
    // than the glossy medieval one every other button shares.
    // This screen is the only place the pixel-art background
    // is the whole picture, and a beveled CSS-style plate on
    // top of it read as a different game.
    const btnFont = ph(0.03);

    drawButton(getStartButton(), "START", MENU_ACCENTS.start, "#f2ffe8", btnFont);
    drawButton(getShopButton(), "ARMOURY", MENU_ACCENTS.armoury, "#fff6d8", btnFont);
    drawButton(getBestiaryButton(), "BESTIARY", MENU_ACCENTS.bestiary, "#ffeddc", btnFont);

    drawAudioSettingsButton();

}

function drawModeSelect() {

    drawPixelText(
        "CHOOSE YOUR TRIAL",
        canvas.width / 2,
        ph(0.235),
        fitPixelScale("CHOOSE YOUR TRIAL", canvas.width * 0.6, ph(0.03)),
        { color: "#d8d0c0", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    drawButton(getModeSelectBackButton(), "BACK", "#555", "white", ph(0.024));

    drawModeCard(
        getCampaignCardButton(),
        "CAMPAIGN",
        "Survive wave by wave and face a boss every five - " +
        "Guard, Knight, Magus, King. Fell the King to win.",
        "lime",
        true
    );

    drawModeCard(
        getBossRushCardButton(),
        "BOSS RUSH",
        "The four bosses back to back, no filler - and the " +
        "cycle repeats, harder each time.",
        "#c0392b",
        true,
        Save.bestBossRushWave > 0 ? `Best: Wave ${Save.bestBossRushWave}` : null
    );

    drawModeCard(
        getEndlessCardButton(),
        "ENDLESS",
        "No end, no mercy. Past the King the horde only grows " +
        "faster and tougher. How far can you get?",
        "#3498db",
        true,
        Save.bestEndlessWave > 0 ? `Best: Wave ${Save.bestEndlessWave}` : null
    );

    drawModeCard(
        getCustomCardButton(),
        "CUSTOM",
        "Your arena, your rules. Begin at any wave, bend " +
        "time, and cheat death itself.",
        "#f1c40f",
        true
    );

}

function drawModeCard(card, title, lore, accent, compact = false, footer = null) {

    // Pixel frame in the mode's own accent, so each trial reads
    // as its own plate on the same rack.
    drawPixelFrame(card.x, card.y, card.width, card.height, {
        unit: Math.max(2, Math.round(ph(0.005))),
        border: accent,
        borderDark: "#15110c",
        fill: "rgba(16, 13, 10, 0.86)"
    });

    // Half-height cards squeeze every offset/font down so the
    // same anatomy (title, divider, lore) still fits.
    const titleFont = compact ? ph(0.026) : ph(0.034);
    const titleY = compact ? ph(0.05) : ph(0.075);
    const dividerY = compact ? ph(0.075) : ph(0.11);
    const loreY = compact ? ph(0.115) : ph(0.16);
    const loreFont = compact ? ph(0.018) : ph(0.021);
    const loreLine = compact ? ph(0.027) : ph(0.032);

    drawPixelText(
        title,
        card.x + card.width / 2,
        card.y + titleY - titleFont * 0.3,
        fitPixelScale(title, card.width * 0.8, titleFont),
        { color: accent, shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Divider as a dashed run of pixel blocks rather than a
    // hairline, so it belongs to the same grid as the frame.
    const dashY = Math.round(card.y + dividerY);
    const dashUnit = Math.max(2, Math.round(ph(0.004)));

    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";

    for (
        let dx = card.x + pw(0.02);
        dx < card.x + card.width - pw(0.02);
        dx += dashUnit * 3
    ) {
        ctx.fillRect(Math.round(dx), dashY, dashUnit * 2, dashUnit);
    }

    ctx.fillStyle = "#e8d9b8";
    ctx.font = `italic ${loreFont}px Georgia, serif`;
    ctx.textAlign = "left";
    wrapText(
        lore,
        card.x + pw(0.02),
        card.y + loreY,
        card.width - pw(0.04),
        loreLine
    );

    // Optional high-score line pinned to the card's bottom edge.
    if (footer) {

        const footerSize = compact ? ph(0.02) : ph(0.024);

        drawPixelText(
            footer,
            card.x + card.width / 2,
            card.y + card.height - ph(0.032),
            fitPixelScale(footer, card.width * 0.8, footerSize),
            { color: accent, shadow: "rgba(0, 0, 0, 0.85)" }
        );

    }

}

function drawShop() {

    drawPixelText(
        "ARMOURY",
        canvas.width / 2,
        ph(0.07),
        fitPixelScale("ARMOURY", canvas.width * 0.5, ph(0.06)),
        { color: "#f6efdd", shadow: "#6b4c0d" }
    );

    drawButton(getShopBackButton(), "BACK", "#555", "white", ph(0.024));

    // Class selector - the class showing here is the class
    // the next run plays as.
    const selectedClass =
        CLASSES.find(c => c.id === Save.selectedClass) ?? CLASSES[0];

    drawButton(getArmouryClassArrowButton(-1), "◀", "#333", "white", ph(0.026));
    drawButton(getArmouryClassArrowButton(1), "▶", "#333", "white", ph(0.026));

    // Kept inside the gap between the two class arrows (they
    // sit at +/- pw(0.13), half a button wide each) so a long
    // class name can't run under them.
    drawPixelText(
        selectedClass.name,
        canvas.width / 2,
        ph(0.138),
        fitPixelScale(selectedClass.name, canvas.width * 0.18, ph(0.04)),
        { color: "#e8c24d", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Re-clamp the scroll in case the canvas resized or the
    // class list changed since the last scroll input.
    scrollArmoury(0);

    const { rowHeight, rowStart, viewTop, viewBottom, marginX } = getShopRowMetrics();

    // Rows only render inside the list viewport, so a
    // scrolled row can't draw over the header.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, viewTop, canvas.width, viewBottom - viewTop);
    ctx.clip();

    getArmouryItemIds().forEach((id, i) => {

        const item = SHOP_ITEMS[id];
        const rowY = rowStart + i * rowHeight;

        // Fully off-screen rows can be skipped outright.
        if (rowY + rowHeight < viewTop || rowY > viewBottom)
            return;

        const buyBtn = getShopBuyButton(i);
        const equipBtn = getShopEquipButton(i);

        const staged = STAGED_ITEM_IDS.includes(id);

        const owned = staged
            ? Save.getStage(id) >= Save.getMaxStage(id)
            : (!item.repeatable && Save.owns(id));

        const blockReason = Save.getPurchaseBlockReason(id);
        const canBuy = Save.canPurchase(id);

        // Each item sits in its own pixel frame - owned rows
        // get a warmer border so what you already have reads
        // apart from what you're shopping for.
        drawPixelFrame(
            marginX,
            rowY - ph(0.008),
            canvas.width - marginX * 2,
            rowHeight - ph(0.01),
            {
                unit: Math.max(2, Math.round(ph(0.004))),
                border: owned || Save.owns(id) ? "#6b5a3e" : "#3c3730",
                borderDark: "#171310",
                fill: "rgba(8, 7, 5, 0.62)"
            }
        );

        const textX = marginX + pw(0.02);
        const nameScale = Math.max(1, Math.round(ph(0.024) / PIXEL_GLYPH_H));

        // Item NAME in the pixel face (short, uppercase, reads
        // great) - the description stays in a normal typeface
        // because a 5x7 bitmap turns a full sentence of prose
        // into a wall of blocks.
        drawPixelText(
            item.name,
            textX + measurePixelText(item.name) * nameScale / 2,
            rowY + ph(0.017),
            nameScale,
            { color: "#f6efdd", shadow: "rgba(0, 0, 0, 0.85)" }
        );

        ctx.font = `${ph(0.018)}px Arial`;
        ctx.fillStyle = "#c2bcae";
        ctx.textAlign = "left";
        ctx.fillText(item.desc, textX, rowY + ph(0.045));

        // Price line: pixel coin + amount, matching the HUD's
        // coin readout so "what things cost" looks the same
        // everywhere.
        if (staged && Save.getStage(id) >= Save.getMaxStage(id)) {

            drawPixelText(
                "MAX LEVEL",
                textX + measurePixelText("MAX LEVEL") * nameScale / 2,
                rowY + ph(0.066),
                Math.max(1, nameScale - 1),
                { color: "#7fdc7f", shadow: "rgba(0, 0, 0, 0.8)" }
            );

        } else {

            const priceText = String(item.price);
            const priceScale = Math.max(1, nameScale - 1);
            const pip = priceScale * 4;

            ctx.fillStyle = "#6b4c0d";
            ctx.fillRect(textX, rowY + ph(0.066) - pip / 2, pip, pip);
            ctx.fillStyle = "#e8c24d";
            ctx.fillRect(
                textX + priceScale, rowY + ph(0.066) - pip / 2 + priceScale,
                pip - priceScale * 2, pip - priceScale * 2
            );

            drawPixelText(
                priceText,
                textX + pip + priceScale * 2 +
                    measurePixelText(priceText) * priceScale / 2,
                rowY + ph(0.066),
                priceScale,
                { color: "#ffe066", shadow: "rgba(0, 0, 0, 0.8)" }
            );

        }

        // Staged items get the 3-segment stage picker, in two
        // groups that line up one-per-class (see the lists
        // above drawShop): the [E] weapon line always shows
        // its picker, the defensive/utility line only once the
        // first stage is owned.
        if (
            PICKER_ALWAYS.includes(id) ||
            (PICKER_WHEN_OWNED.includes(id) && Save.getStage(id) >= 1)
        ) {
            drawStageIndicator(getShopStageSlider(i), Save.getEquippedStage(id), id);
        }

        if (item.repeatable && id === "critRate") {

            const slider = getShopCritSlider(i);
            drawCritSlider(slider, Save.equippedCritLevel, Save.critRateLevel);

        }

        if (item.repeatable && id === "knightLocket") {

            const slider = getShopCritSlider(i);
            drawLocketSlider(slider, Save.equippedKnightLocketLevel, Save.knightLocketLevel);

        }

        if (item.equippable && Save.owns(id)) {

            const equipped = Save.isEquipped(id);

            drawButton(
                equipBtn,
                equipped ? "UNEQUIP" : "EQUIP",
                equipped ? "#2a5a2a" : "#555",
                "white",
                ph(0.018)
            );

        }

        const maxed =
            (item.repeatable && id === "critRate" && Save.getCritChance() >= CRIT.MAX) ||
            (item.repeatable && id === "knightLocket" && Save.getCharmChance() >= CHARM.MAX) ||
            (staged && Save.getStage(id) >= Save.getMaxStage(id));

        if (owned) {

            drawButton(buyBtn, "OWNED", "#444", "#aaa", ph(0.018));

        } else if (maxed) {

            drawButton(buyBtn, "MAXED", "#444", "#aaa", ph(0.018));

        } else if (blockReason) {

            drawButton(buyBtn, blockReason, "#333", "#ccc", ph(0.014));

        } else if (canBuy) {

            drawButton(buyBtn, "BUY", "lime", "black", ph(0.018));

        } else {

            drawButton(buyBtn, "BUY", "#663333", "#888", ph(0.018));

        }

    });

    ctx.restore();

    drawArmouryScrollbar(viewTop, viewBottom);

}

// Thin scroll indicator on the right edge - only shown when
// the list actually overflows the viewport.
function drawArmouryScrollbar(viewTop, viewBottom) {

    const maxScroll = getArmouryMaxScroll();

    if (maxScroll <= 0)
        return;

    const trackX = canvas.width - pw(0.012);
    const trackWidth = pw(0.006);
    const trackHeight = viewBottom - viewTop;

    const thumbHeight = trackHeight * (trackHeight / (trackHeight + maxScroll));
    const thumbY = viewTop + (trackHeight - thumbHeight) * (Game.armouryScroll / maxScroll);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(trackX, viewTop, trackWidth, trackHeight);

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fillRect(trackX, thumbY, trackWidth, thumbHeight);

}

function drawEnemyPreview(type, x, y, w, h, unlocked) {

    const entry = BESTIARY[type];

    ctx.save();

    // Framing (gilt for creatures, gold for bosses) is drawn by
    // the card / portrait plate around this glyph now, so this
    // just renders the creature itself.

    if (!unlocked) {

        // Wax-seal medallion standing in for the unknown foe: a
        // dark disc with a gilt rim and a single "?" glyph.
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rad = Math.min(w, h) * 0.3;

        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(28, 22, 16, 0.75)";
        ctx.fill();
        ctx.strokeStyle = "rgba(140, 116, 66, 0.7)";
        ctx.lineWidth = Math.max(1.5, rad * 0.14);
        ctx.stroke();

        ctx.fillStyle = "#a08a60";
        ctx.font = `bold ${Math.floor(rad * 1.1)}px ${UI_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("?", cx, cy + rad * 0.4);

        ctx.restore();
        return;

    }

    const scale = Math.min(w, h) / entry.size;
    const drawSize = entry.size * scale * 0.85;
    const dx = x + (w - drawSize) / 2;
    const dy = y + (h - drawSize) / 2;

    ctx.shadowBlur = 12;
    ctx.shadowColor = entry.color;
    ctx.fillStyle = entry.color;
    ctx.fillRect(dx, dy, drawSize, drawSize);

    // Elites wear the same gold ring here as they do in the
    // arena, so the card matches what you're looking at when
    // one shows up mid-wave.
    if (entry.isElite) {

        const inset = Math.max(2, drawSize * 0.05);

        ctx.shadowBlur = 15;
        ctx.shadowColor = ELITE.GLOW_COLOR;
        ctx.strokeStyle = ELITE.GLOW_COLOR;
        ctx.lineWidth = Math.max(2, drawSize * 0.06);
        ctx.strokeRect(
            dx - inset,
            dy - inset,
            drawSize + inset * 2,
            drawSize + inset * 2
        );

    }

    if (entry.emoji) {

        ctx.shadowBlur = 0;
        ctx.font = `${Math.floor(drawSize * 0.45)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(entry.emoji, x + w / 2, y + h / 2 + drawSize * 0.12);

    }

    if (type === "king") {

        ctx.shadowBlur = 0;
        ctx.fillStyle = "gold";
        ctx.font = `${Math.floor(drawSize * 0.35)}px Arial`;
        ctx.fillText("♛", x + w / 2, dy - 4);

    }

    ctx.restore();

}

// =====================================
// Bestiary theming helpers
// =====================================
//
// The Bestiary's backing "tome": an aged leather-and-stone
// gradient seated in a dark border with a gilt inner frame and
// gold corner studs - replaces the old flat brown slab so the
// whole codex reads as one bound volume. Shared by the grid,
// boss, and detail pages (all use getBestiaryPanelRect).

function drawBestiaryPanel(panel) {

    const r = ph(0.02);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = ph(0.03);
    ctx.shadowOffsetY = ph(0.008);
    roundRectPath(panel.x, panel.y, panel.width, panel.height, r);
    ctx.fillStyle = "#3a2a20";
    ctx.fill();
    ctx.restore();

    // Warm radial fill - lit at the centre, shadowed at the edges.
    ctx.save();
    roundRectPath(panel.x, panel.y, panel.width, panel.height, r);
    ctx.clip();
    const g = ctx.createRadialGradient(
        panel.x + panel.width / 2, panel.y + panel.height * 0.42, panel.width * 0.08,
        panel.x + panel.width / 2, panel.y + panel.height / 2, panel.width * 0.7
    );
    g.addColorStop(0, "#6f4d37");
    g.addColorStop(1, "#33241c");
    ctx.fillStyle = g;
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.restore();

    // Dark outer seat + gilt inner frame.
    roundRectPath(panel.x, panel.y, panel.width, panel.height, r);
    ctx.strokeStyle = "rgba(20, 14, 8, 0.85)";
    ctx.lineWidth = Math.max(4, ph(0.008));
    ctx.stroke();

    const inset = ph(0.014);
    roundRectPath(
        panel.x + inset,
        panel.y + inset,
        panel.width - inset * 2,
        panel.height - inset * 2,
        Math.max(2, r - inset)
    );
    ctx.strokeStyle = "rgba(201, 162, 39, 0.85)";
    ctx.lineWidth = Math.max(2, ph(0.004));
    ctx.stroke();

    // Gold corner studs.
    const studR = ph(0.009);
    const pad = inset + ph(0.008);

    [
        [panel.x + pad, panel.y + pad],
        [panel.x + panel.width - pad, panel.y + pad],
        [panel.x + pad, panel.y + panel.height - pad],
        [panel.x + panel.width - pad, panel.y + panel.height - pad]
    ].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, studR, 0, Math.PI * 2);
        ctx.fillStyle = "#c9a227";
        ctx.fill();
        ctx.strokeStyle = "rgba(20, 14, 8, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });

}

// One creature tile on the grid page: a framed stone portrait
// with a gilt border and an engraved nameplate beneath. Locked
// entries dim down and show the wax-seal "?" from
// drawEnemyPreview.
function drawBestiaryCard(cell, type, entry, unlocked) {

    const r = cell.width * 0.08;
    const gap = ph(0.008);

    // Tall enough for the elites' two-line "ELITE / name"
    // plate. Kept uniform across every card so a row of plates
    // still lines up.
    const plateH = ph(0.058);

    // Portrait tile: a pixel frame, gilt for entries you've
    // met and dull iron for the ones you haven't.
    drawPixelFrame(cell.x, cell.y, cell.width, cell.height, {
        unit: Math.max(2, Math.round(cell.width * 0.035)),
        border: unlocked ? "#a8842c" : "#4a443a",
        borderDark: "#120e0a",
        fill: unlocked ? "rgba(36, 31, 25, 0.95)" : "rgba(20, 18, 16, 0.95)"
    });

    // Creature glyph / sealed silhouette.
    drawEnemyPreview(type, cell.x, cell.y, cell.width, cell.height, unlocked);

    // Nameplate banner beneath the portrait.
    const plateX = cell.x + cell.width * 0.04;
    const plateW = cell.width * 0.92;
    const plateY = cell.y + cell.height + gap;

    drawPixelFrame(plateX, plateY, plateW, plateH, {
        unit: Math.max(2, Math.round(cell.width * 0.022)),
        border: unlocked ? "#6b5a3e" : "#3a352d",
        borderDark: "#120e0a",
        fill: "rgba(14, 11, 8, 0.92)"
    });

    // "Elite Frost Weaver" on one line doesn't fit the plate at
    // any legible size, so elites get the rank on its own gold
    // line above the creature's name.
    const isElite = unlocked && entry.isElite;

    const label = unlocked
        ? (isElite ? entry.name.replace(/^Elite /, "") : entry.name)
        : "? ? ?";

    const centerX = cell.x + cell.width / 2;

    if (isElite) {

        drawPixelText(
            "ELITE",
            centerX,
            plateY + plateH * 0.3,
            fitPixelScale("ELITE", plateW * 0.8, plateH * 0.3),
            { color: "#ffd700", shadow: "rgba(0, 0, 0, 0.85)" }
        );

    }

    // fitPixelScale already shrinks long names (Necromancer,
    // Frost Weaver) to the plate, so no measure-and-step loop.
    drawPixelText(
        label,
        centerX,
        plateY + (isElite ? plateH * 0.7 : plateH / 2),
        fitPixelScale(label, plateW * 0.86, isElite ? plateH * 0.32 : plateH * 0.5),
        {
            color: unlocked ? "#f2e4c2" : "#8a7a5a",
            shadow: "rgba(0, 0, 0, 0.85)"
        }
    );

}

// Larger framed portrait for the boss and detail pages - same
// carved-stone tile, with a bright gold frame for bosses.
function drawBestiaryPortrait(type, x, y, size, unlocked) {

    const entry = BESTIARY[type];
    const r = size * 0.06;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = size * 0.06;
    ctx.shadowOffsetY = size * 0.02;
    roundRectPath(x, y, size, size, r);
    ctx.fillStyle = "#221d17";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(x, y, size, size, r);
    ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + size);
    g.addColorStop(0, unlocked ? "rgba(120, 92, 58, 0.5)" : "rgba(70, 64, 56, 0.35)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);
    ctx.restore();

    drawEnemyPreview(type, x, y, size, size, unlocked);

    roundRectPath(x, y, size, size, r);
    ctx.strokeStyle = entry.isBoss
        ? (unlocked ? "rgba(255, 215, 0, 0.95)" : "rgba(140, 110, 50, 0.55)")
        : (unlocked ? "rgba(201, 162, 39, 0.9)" : "rgba(120, 100, 62, 0.5)");
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.stroke();

}

// =====================================
// Bestiary Pages
// =====================================
//
// Page 0: the creatures grid. Pages 1..N: one dedicated page
// per boss (BESTIARY_BOSS_ORDER), with lore - flipped through
// with arrows like the Armoury's class selector.

// Pages run: creature grids first, then one page per boss.
function getBestiaryCreaturePageCount() {

    return Math.ceil(BESTIARY_NORMAL_ORDER.length / BESTIARY_PER_PAGE);

}

function getBestiaryPageCount() {

    return getBestiaryCreaturePageCount() + BESTIARY_BOSS_ORDER.length;

}

// The creatures shown on a given grid page, or an empty list
// if that page is a boss page.
function getBestiaryPageTypes(page) {

    if (page >= getBestiaryCreaturePageCount())
        return [];

    const start = page * BESTIARY_PER_PAGE;

    return BESTIARY_NORMAL_ORDER.slice(start, start + BESTIARY_PER_PAGE);

}

function cycleBestiaryPage(step) {

    Sound.play("uiClick");

    const count = getBestiaryPageCount();

    Game.bestiaryPage = (Game.bestiaryPage + step + count) % count;

}

// Left (-1) / right (+1) page arrows, flanking the page title.
function getBestiaryPageArrowButton(direction) {

    const width = pw(0.045);
    const height = ph(0.055);
    const offset = pw(0.19);

    return {
        x: canvas.width / 2 + direction * offset - width / 2,
        y: ph(0.145),
        width,
        height
    };

}

// Word-wraps text at maxWidth, returning the y of the line
// AFTER the last one drawn (uses the current ctx font).
function wrapText(text, x, y, maxWidth, lineHeight) {

    const words = text.split(" ");

    let line = "";

    words.forEach(word => {

        const test = line ? `${line} ${word}` : word;

        if (line && ctx.measureText(test).width > maxWidth) {

            ctx.fillText(line, x, y);

            line = word;
            y += lineHeight;

        } else {

            line = test;

        }

    });

    if (line) {

        ctx.fillText(line, x, y);
        y += lineHeight;

    }

    return y;

}

// The raw engine speed number (0.56, 2.24, ...) means nothing to
// a player, so the bestiary shows a word plus how it compares to
// how fast *they* move. Every enemy is slower than the player's
// base speed, so the tiers describe how easily you can outrun it.
function describeSpeed(baseSpeed) {

    const percent = Math.round((baseSpeed / PLAYER.SPEED) * 100);

    let label;

    if (percent >= 55)
        label = "Fast";
    else if (percent >= 38)
        label = "Brisk";
    else if (percent >= 25)
        label = "Steady";
    else if (percent >= 18)
        label = "Slow";
    else
        label = "Very slow";

    return `${label} — moves at ${percent}% of your speed`;

}

function drawBestiary() {

    const panel = getBestiaryPanelRect();

    drawBestiaryPanel(panel);

    drawButton(getBestiaryBackButton(), "BACK", "#555", "white", ph(0.024));

    const page = Game.bestiaryPage;

    const creaturePages = getBestiaryCreaturePageCount();
    const isCreaturePage = page < creaturePages;

    const bossType = isCreaturePage
        ? null
        : BESTIARY_BOSS_ORDER[page - creaturePages];

    const bossUnlocked = bossType ? Save.isBestiaryUnlocked(bossType) : false;

    // Page title + arrows (the boss's name once discovered)
    const title = isCreaturePage
        ? "BESTIARY"
        : (bossUnlocked ? BESTIARY[bossType].name.toUpperCase() : "???");

    // Held inside the gap between the page arrows (they sit at
    // +/- pw(0.19), half a button wide each) so a long boss
    // name can't run under them.
    drawPixelText(
        title,
        canvas.width / 2,
        ph(0.175),
        fitPixelScale(title, canvas.width * 0.28, ph(0.05)),
        {
            color: isCreaturePage ? "#f6efdd" : "#ffd23f",
            shadow: "#6b4c0d"
        }
    );

    drawButton(getBestiaryPageArrowButton(-1), "◀", "#3a2a20", "white", ph(0.026));
    drawButton(getBestiaryPageArrowButton(1), "▶", "#3a2a20", "white", ph(0.026));

    const subtitle = isCreaturePage
        ? `CREATURES - PAGE ${page + 1} / ${getBestiaryPageCount()}`
        : `BOSS - PAGE ${page + 1} / ${getBestiaryPageCount()}`;

    drawPixelText(
        subtitle,
        canvas.width / 2,
        ph(0.228),
        fitPixelScale(subtitle, canvas.width * 0.4, ph(0.022)),
        { color: "#d0b58a", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    if (!isCreaturePage) {

        drawBestiaryBossPage(bossType);

        return;

    }

    getBestiaryPageTypes(page).forEach((type, i) => {

        const cell = getBestiaryCell(i);
        const entry = BESTIARY[type];
        const unlocked = Save.isBestiaryUnlocked(type);

        drawBestiaryCard(cell, type, entry, unlocked);

    });

}

// A boss's dedicated page: big portrait, lore, and stats.
// Locked bosses only show their silhouette.
function drawBestiaryBossPage(type) {

    const entry = BESTIARY[type];
    const panel = getBestiaryPanelRect();

    const unlocked = Save.isBestiaryUnlocked(type);

    const previewSize = Math.min(pw(0.17), panel.height * 0.38);
    const previewX = panel.x + pw(0.05);
    const previewY = ph(0.30);

    drawBestiaryPortrait(type, previewX, previewY, previewSize, unlocked);

    const textX = previewX + previewSize + pw(0.04);
    const textWidth = panel.x + panel.width - pw(0.04) - textX;

    const proseScale = Math.max(1, Math.round(ph(0.018) / PIXEL_GLYPH_H));

    if (!unlocked) {

        drawPixelTextWrapped(
            "DEFEAT THIS FOE TO UNLOCK ITS PAGE.",
            textX,
            previewY + ph(0.045),
            textWidth,
            proseScale,
            { color: "#a08560", shadow: "rgba(0, 0, 0, 0.85)" }
        );

        return;

    }

    ctx.textAlign = "left";

    // desc, behavior, and lore all wrap to textWidth and flow
    // downward from the running y, so a long line (e.g. the
    // Royal Magus's behavior) pushes the rest down instead of
    // spilling off the right edge of the panel.
    let textY = previewY + ph(0.02);

    textY = drawPixelTextWrapped(
        entry.desc,
        textX, textY, textWidth, proseScale,
        { color: "#ede5d3", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    textY += ph(0.018);

    textY = drawPixelTextWrapped(
        `BEHAVIOR: ${entry.behavior}`,
        textX, textY, textWidth, proseScale,
        { color: "#e8c24d", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    textY += ph(0.018);

    // Divider as pixel dashes rather than a hairline.
    const dashUnit = Math.max(2, Math.round(ph(0.004)));

    ctx.fillStyle = "rgba(201, 162, 39, 0.5)";

    for (let dx = textX; dx < textX + textWidth; dx += dashUnit * 3)
        ctx.fillRect(Math.round(dx), Math.round(textY), dashUnit * 2, dashUnit);

    textY += ph(0.028);

    // Lore keeps a touch more air between lines - it's the
    // flavour paragraph, not a stat readout.
    drawPixelTextWrapped(
        entry.lore,
        textX, textY, textWidth, proseScale,
        { color: "#c9bda4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Stats block along the bottom of the panel
    const statsY = panel.y + panel.height - ph(0.19);

    const headScale = Math.max(1, Math.round(ph(0.026) / PIXEL_GLYPH_H));

    drawPixelText(
        "STATS",
        panel.x + pw(0.05) + measurePixelText("STATS") * headScale / 2,
        statsY - ph(0.008),
        headScale,
        { color: "#f6efdd", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Health reads as a sentence now, so it can be long enough
    // to need wrapping - flow the speed line off wherever it ends.
    const statsX = panel.x + pw(0.05);
    const statsWidth = panel.width - pw(0.1);

    const sy = drawPixelTextWrapped(
        `HEALTH: ${entry.hpScale}`,
        statsX, statsY + ph(0.025), statsWidth, proseScale,
        { color: "#ded6c4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    drawPixelTextWrapped(
        `SPEED: ${describeSpeed(entry.baseSpeed)}`,
        statsX, sy + ph(0.006), statsWidth, proseScale,
        { color: "#ded6c4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

}

// =====================================
// Bestiary Field Notes
// =====================================
//
// The detail page's bottom-right was dead space, so it's a
// blank journal page the player writes on themselves - the
// game never puts anything in it. Notes are per creature
// (elites keep their own) and saved as they're typed.
//
// The writing surface is a real <textarea> parked over the
// drawn page rather than canvas-rendered text: that gets the
// caret, selection, wrapping and the mobile keyboard for
// free. Everything below just keeps it lined up with the
// canvas and in sync with the save.
//
// bestiaryNotesArea is set by the draw pass while the page is
// on screen and cleared every frame before it - so the field
// hides itself the moment the page stops being drawn, no
// matter how the player left it.

let bestiaryNotesArea = null;
let bestiaryNotesLoadedType = null;
let bestiaryNotesSaveTimer = null;

function clearBestiaryNotesArea() {

    bestiaryNotesArea = null;

}

function getBestiaryNotesElement() {

    return document.getElementById("bestiaryNotes");

}

// The journal page: parchment leaf, heading, margin rule and
// ruled writing lines. Returns the inner writing area (canvas
// space) the textarea gets parked over.
function drawBestiaryNotesPage(x, y, width, height, type) {

    const pad = Math.min(width, height) * 0.06;
    const r = ph(0.012);

    ctx.save();

    // Parchment leaf, lifted off the tome with a soft shadow.
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = ph(0.02);
    ctx.shadowOffsetY = ph(0.005);
    roundRectPath(x, y, width, height, r);
    const leaf = ctx.createLinearGradient(0, y, 0, y + height);
    leaf.addColorStop(0, "#efe3c4");
    leaf.addColorStop(1, "#dccfa8");
    ctx.fillStyle = leaf;
    ctx.fill();
    ctx.restore();

    roundRectPath(x, y, width, height, r);
    ctx.strokeStyle = "rgba(120, 92, 48, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Heading + rule under it.
    const headingY = y + pad + ph(0.022);

    ctx.fillStyle = "#6b4a22";
    ctx.font = `bold ${ph(0.021)}px ${UI_FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("FIELD NOTES", x + pad, headingY);

    ctx.strokeStyle = "rgba(120, 92, 48, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + pad, headingY + ph(0.012));
    ctx.lineTo(x + width - pad, headingY + ph(0.012));
    ctx.stroke();

    // Writing area: indented past a red margin rule, ruled in
    // lines the textarea's line-height matches so the text
    // sits ON them rather than drifting between them.
    const textTop = headingY + ph(0.032);
    const textLeft = x + pad * 2.2;
    const textRight = x + width - pad;
    const textBottom = y + height - pad;

    const lineHeight = ph(0.035);
    const fontSize = ph(0.024);

    ctx.strokeStyle = "rgba(160, 60, 50, 0.35)";
    ctx.beginPath();
    ctx.moveTo(textLeft - pad * 0.5, textTop - ph(0.02));
    ctx.lineTo(textLeft - pad * 0.5, textBottom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(120, 92, 48, 0.28)";

    for (
        let lineY = textTop + lineHeight * 0.25;
        lineY <= textBottom;
        lineY += lineHeight
    ) {

        ctx.beginPath();
        ctx.moveTo(textLeft, lineY);
        ctx.lineTo(textRight, lineY);
        ctx.stroke();

    }

    bestiaryNotesArea = {
        type,
        x: textLeft,
        y: textTop - ph(0.024),
        width: textRight - textLeft,
        height: textBottom - textTop + ph(0.024),
        fontSize,
        lineHeight
    };

}

// Parks the textarea over the drawn page (converting canvas
// space to CSS pixels, which differ on touch devices - see
// syncCanvasResolution), or hides it when the page is gone.
function syncBestiaryNotesField() {

    const el = getBestiaryNotesElement();

    if (!el)
        return;

    const area = bestiaryNotesArea;

    if (!area) {

        if (el.style.display !== "none") {

            commitBestiaryNote();
            el.blur();
            el.style.display = "none";
            bestiaryNotesLoadedType = null;

        }

        return;

    }

    // Switching creatures mid-view: flush the old note before
    // the field is refilled with the new one.
    if (bestiaryNotesLoadedType !== area.type) {

        commitBestiaryNote();

        el.value = Save.getBestiaryNote(area.type);
        bestiaryNotesLoadedType = area.type;

    }

    const rect = canvas.getBoundingClientRect();

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    el.style.display = "block";
    el.style.left = `${rect.left + window.scrollX + area.x * scaleX}px`;
    el.style.top = `${rect.top + window.scrollY + area.y * scaleY}px`;
    el.style.width = `${area.width * scaleX}px`;
    el.style.height = `${area.height * scaleY}px`;
    el.style.fontSize = `${area.fontSize * scaleY}px`;
    el.style.lineHeight = `${area.lineHeight * scaleY}px`;

}

function commitBestiaryNote() {

    const el = getBestiaryNotesElement();

    if (!el || !bestiaryNotesLoadedType)
        return;

    Save.setBestiaryNote(bestiaryNotesLoadedType, el.value);

}

// Saving on every keystroke would rewrite the whole save
// object per letter, so writes settle briefly first.
function initBestiaryNotesField() {

    const el = getBestiaryNotesElement();

    if (!el)
        return;

    el.addEventListener("input", () => {

        clearTimeout(bestiaryNotesSaveTimer);
        bestiaryNotesSaveTimer = setTimeout(commitBestiaryNote, 400);

    });

    el.addEventListener("blur", () => {

        clearTimeout(bestiaryNotesSaveTimer);
        commitBestiaryNote();

    });

    // Closing or reloading mid-sentence still keeps the note.
    window.addEventListener("beforeunload", commitBestiaryNote);

}

initBestiaryNotesField();

function drawBestiaryDetail() {

    const type = Game.bestiarySelected;
    const entry = BESTIARY[type];

    if (!entry)
        return;

    const panel = getBestiaryPanelRect();

    drawBestiaryPanel(panel);

    drawButton(getBestiaryBackButton(), "BACK", "#555", "white", ph(0.024));

    const previewX = panel.x + pw(0.04);
    const previewY = panel.y + ph(0.09);
    const previewSize = Math.min(pw(0.16), panel.height * 0.4);

    drawBestiaryPortrait(type, previewX, previewY, previewSize, true);

    const textX = previewX + previewSize + pw(0.03);
    const textWidth = panel.x + panel.width - pw(0.04) - textX;

    // The notes page owns the right half below the blurb, so
    // the stats keep to the left column beside it.
    const notesX = panel.x + panel.width * 0.46;
    const notesWidth = panel.width * 0.5;

    // Headings and stat lines go pixel; the two prose
    // paragraphs below (desc/behavior) and the field-notes
    // journal stay in a proportional face - a 5x7 bitmap turns
    // a wrapped sentence into a wall of blocks.
    const nameScale = fitPixelScale(entry.name, textWidth, ph(0.05));

    drawPixelText(
        entry.name,
        textX + measurePixelText(entry.name) * nameScale / 2,
        previewY + ph(0.035),
        nameScale,
        {
            color: entry.isBoss ? "#ffd23f" : "#f6efdd",
            shadow: "rgba(0, 0, 0, 0.85)"
        }
    );

    ctx.textAlign = "left";

    // desc and behavior wrap - the elites' twists are a
    // sentence or two long and used to run straight off the
    // right edge of the tome.
    const proseScale = Math.max(1, Math.round(ph(0.019) / PIXEL_GLYPH_H));

    let textY = drawPixelTextWrapped(
        entry.desc,
        textX,
        previewY + ph(0.1),
        textWidth,
        proseScale,
        { color: "#ded6c4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    textY += ph(0.012);

    textY = drawPixelTextWrapped(
        `BEHAVIOR: ${entry.behavior}`,
        textX,
        textY,
        textWidth,
        proseScale,
        { color: "#b3aa98", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    const wave1Hp = entry.hpAtWave(1);
    const wave5Hp = entry.hpAtWave(5);
    const wave10Hp = entry.hpAtWave(10);

    // Normally the stats sit below the portrait, but a long
    // wrapped behavior can reach past it - push them clear.
    const statsY = Math.max(
        previewY + previewSize + ph(0.08),
        textY + ph(0.05)
    );

    const headScale = Math.max(1, Math.round(ph(0.028) / PIXEL_GLYPH_H));

    drawPixelText(
        "STATS",
        panel.x + pw(0.03) + measurePixelText("STATS") * headScale / 2,
        statsY - ph(0.008),
        headScale,
        { color: "#f6efdd", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Health is a plain-English sentence, so it may wrap - the
    // lines below flow from wherever it ends rather than sitting
    // at fixed offsets.
    const statsX = panel.x + pw(0.03);
    const statsWidth = notesX - pw(0.03) - statsX;

    let sy = drawPixelTextWrapped(
        `HEALTH: ${entry.hpScale}`,
        statsX,
        statsY + ph(0.03),
        statsWidth,
        proseScale,
        { color: "#ded6c4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    sy += ph(0.012);

    // The stat rows WRAP at the same scale as the health line
    // above rather than shrinking to fit on one line. Fitting
    // them to width meant the longest row (Speed) dictated the
    // scale for all of them, rendering the whole block at half
    // the size of the sentence directly above it.
    [
        `WAVE 1: ${wave1Hp}   WAVE 5: ${wave5Hp}   WAVE 10: ${wave10Hp}`,
        `SPEED: ${describeSpeed(entry.baseSpeed)}`
    ].forEach(row => {

        sy = drawPixelTextWrapped(
            row,
            statsX, sy + ph(0.006), statsWidth, proseScale,
            { color: "#ded6c4", shadow: "rgba(0, 0, 0, 0.85)" }
        );

    });

    // Blank journal page in what used to be dead space, sat
    // below the blurb so a long wrapped behavior never lands
    // on top of it.
    const notesY = Math.max(
        previewY + previewSize * 0.55,
        textY + ph(0.04)
    );

    drawBestiaryNotesPage(
        notesX,
        notesY,
        notesWidth,
        panel.y + panel.height - ph(0.05) - notesY,
        type
    );

}

function handleMenuClick(x, y) {

    if (Game.menuView === "audioSettings") {

        if (hitRect(getPauseAbandonButton(), x, y)) {
            Sound.play("uiClick");
            Game.menuView = "main";
            return;
        }

        handleAudioControlsClick(x, y);

        return;

    }

    if (Game.menuView === "modeSelect") {

        if (hitRect(getModeSelectBackButton(), x, y)) {
            Sound.play("uiClick");
            Game.menuView = "main";
            return;
        }

        if (hitRect(getCampaignCardButton(), x, y)) {
            Sound.play("uiClick");
            startGame("campaign");
            return;
        }

        if (hitRect(getBossRushCardButton(), x, y)) {
            Sound.play("uiClick");
            startGame("bossRush");
            return;
        }

        if (hitRect(getEndlessCardButton(), x, y)) {
            Sound.play("uiClick");
            startGame("endless");
            return;
        }

        if (hitRect(getCustomCardButton(), x, y)) {
            Sound.play("uiClick");
            startGame("custom");
            return;
        }

        return;

    }

    if (Game.menuView === "shop") {

        if (hitRect(getShopBackButton(), x, y)) {
            Sound.play("uiClick");
            Game.menuView = "main";
            return;
        }

        if (hitRect(getArmouryClassArrowButton(-1), x, y)) {
            cycleArmouryClass(-1);
            return;
        }

        if (hitRect(getArmouryClassArrowButton(1), x, y)) {
            cycleArmouryClass(1);
            return;
        }

        const { rowHeight, rowStart, viewTop, viewBottom } = getShopRowMetrics();

        getArmouryItemIds().forEach((id, i) => {

            const item = SHOP_ITEMS[id];

            // Rows scrolled out of the viewport aren't
            // clickable (mirrors the draw-side skip).
            const rowY = rowStart + i * rowHeight;

            if (rowY + rowHeight < viewTop || rowY > viewBottom)
                return;

            if (item.equippable && Save.owns(id) && hitRect(getShopEquipButton(i), x, y)) {
                Save.toggleEquip(id);
                Sound.play("uiEquip");
            }

            // purchase() reports whether the sale went through,
            // which is exactly the buy/denied sound split.
            if (hitRect(getShopBuyButton(i), x, y))
                Sound.play(Save.purchase(id) ? "uiPurchase" : "uiDenied");

            // Staged items: clicking the stage picker sets the
            // equipped stage (clamped to what's owned in
            // Save.setEquippedStage). Bow/dagger accept clicks
            // whenever visible; shield/cloak need stage 1 owned.
            if (STAGED_ITEM_IDS.includes(id) && Save.getStage(id) >= 1 && hitRect(getShopStageSlider(i), x, y))
                Save.setEquippedStage(id, stageFromSliderX(getShopStageSlider(i), x));

            if (id === "critRate" && item.repeatable && hitRect(getShopCritSlider(i), x, y))
                Save.setEquippedCritLevel(critLevelFromSliderX(getShopCritSlider(i), x));

            if (id === "knightLocket" && item.repeatable && hitRect(getShopCritSlider(i), x, y))
                Save.setEquippedKnightLocketLevel(locketLevelFromSliderX(getShopCritSlider(i), x));

        });

        return;

    }

    if (Game.menuView === "bestiaryDetail") {

        if (hitRect(getBestiaryBackButton(), x, y)) {
            Sound.play("uiClick");
            Game.menuView = "bestiary";
        }

        return;

    }

    if (Game.menuView === "bestiary") {

        if (hitRect(getBestiaryBackButton(), x, y)) {
            Sound.play("uiClick");
            Game.menuView = "main";
            return;
        }

        if (hitRect(getBestiaryPageArrowButton(-1), x, y)) {
            cycleBestiaryPage(-1);
            return;
        }

        if (hitRect(getBestiaryPageArrowButton(1), x, y)) {
            cycleBestiaryPage(1);
            return;
        }

        // Only the creature grids have clickable cells - boss
        // pages already show everything.
        getBestiaryPageTypes(Game.bestiaryPage).forEach((type, i) => {

            if (!Save.isBestiaryUnlocked(type))
                return;

            if (hitRect(getBestiaryCell(i), x, y)) {
                Sound.play("uiClick");
                Game.bestiarySelected = type;
                Game.menuView = "bestiaryDetail";
            }

        });

        return;

    }

    if (hitRect(getAudioSettingsButton(), x, y)) {
        Sound.play("uiClick");
        Game.menuView = "audioSettings";
        return;
    }

    if (hitRect(getStartButton(), x, y)) {
        Sound.play("uiClick");
        Game.menuView = "modeSelect";
        return;
    }

    if (hitRect(getShopButton(), x, y)) {
        Sound.play("uiClick");
        Game.menuView = "shop";
        Game.armouryScroll = 0;
    }

    if (hitRect(getBestiaryButton(), x, y)) {
        Sound.play("uiClick");
        Game.menuView = "bestiary";
        Game.bestiaryPage = 0;
    }

}

function handleMenuMouseMove(x, y) {

    if (Game.menuView !== "shop")
        return;

    const itemIds = getArmouryItemIds();

    if (Game.shopCritDragging) {
        const critIndex = itemIds.indexOf("critRate");
        if (critIndex >= 0) {
            Save.setEquippedCritLevel(
                critLevelFromSliderX(getShopCritSlider(critIndex), x)
            );
        }
    }

    // Staged item pickers (bow/shield for Warrior, cloak/
    // dagger for Ranger) all drag the same way.
    if (Game.shopStageDragging) {
        const stageIndex = itemIds.indexOf(Game.shopStageDragging);
        if (stageIndex >= 0) {
            Save.setEquippedStage(
                Game.shopStageDragging,
                stageFromSliderX(getShopStageSlider(stageIndex), x)
            );
        }
    }

    if (Game.shopLocketDragging) {
        const locketIndex = itemIds.indexOf("knightLocket");
        if (locketIndex >= 0) {
            Save.setEquippedKnightLocketLevel(
                locketLevelFromSliderX(getShopCritSlider(locketIndex), x)
            );
        }
    }

}

function handleMenuMouseDown(x, y) {

    if (Game.menuView !== "shop")
        return;

    const itemIds = getArmouryItemIds();

    const critIndex = itemIds.indexOf("critRate");
    if (critIndex >= 0 && hitRect(getShopCritSlider(critIndex), x, y)) {
        Game.shopCritDragging = true;
    }

    // Whichever staged item's picker was grabbed (if any) -
    // stored by id so mouse-move knows which one to drive.
    STAGED_ITEM_IDS.forEach(id => {

        const stageIndex = itemIds.indexOf(id);

        if (
            stageIndex >= 0 &&
            Save.getStage(id) >= 1 &&
            hitRect(getShopStageSlider(stageIndex), x, y)
        ) {
            Game.shopStageDragging = id;
        }

    });

    const locketIndex = itemIds.indexOf("knightLocket");
    if (locketIndex >= 0 && hitRect(getShopCritSlider(locketIndex), x, y)) {
        Game.shopLocketDragging = true;
    }

}

function handleMenuMouseUp() {

    Game.shopCritDragging = false;
    Game.shopStageDragging = null;
    Game.shopLocketDragging = false;

    // Releasing a volume slider plays a click at the new
    // settings - instant "this is how loud that is" feedback.
    if (Game.volumeDragging) {

        Game.volumeDragging = null;
        Sound.play("uiClick");

    }

}

// =====================================
// HUD
// =====================================

function drawHUD() {

    // Pause control, top-center - a pixel plate with two
    // chunky bars, matching the menu buttons.
    const pauseBtn = getPauseButton();

    drawPixelPanel(
        pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height,
        pixelPaletteFrom("#3c3630", "#e8d9b8"),
        pauseBtn.width * 0.09
    );

    const barW = Math.max(2, Math.round(pauseBtn.width * 0.14));
    const barH = Math.round(pauseBtn.height * 0.42);
    const barY = Math.round(pauseBtn.y + (pauseBtn.height - barH) / 2);

    ctx.fillStyle = "#f0e2c2";
    ctx.fillRect(Math.round(pauseBtn.x + pauseBtn.width * 0.34 - barW / 2), barY, barW, barH);
    ctx.fillRect(Math.round(pauseBtn.x + pauseBtn.width * 0.66 - barW / 2), barY, barW, barH);

    if (Game.immortal) {

        drawPixelText(
            "IMMORTAL",
            canvas.width / 2,
            pauseBtn.y + pauseBtn.height + ph(0.028),
            Math.max(1, Math.round(ph(0.022) / PIXEL_GLYPH_H)),
            { color: "#f1c40f", shadow: "#4a3d05" }
        );

    }

    // =====================================
    // Status readout (top-left)
    // =====================================
    //
    // Wave, run timer, dash charges and the class's own kit
    // lines, stacked on one dark pixel plate. The plate's SIZE
    // and glyph SCALE are both fixed - derived only from the
    // viewport, never from what the rows actually say - so it
    // can't visibly pulse as cooldown text ticks between
    // "READY" and "11.4S" from frame to frame. A row that's too
    // long to fit shrinks ITSELF (fitPixelScale, capped at the
    // fixed scale) rather than growing the box.

    const realElapsedSecs = Game.elapsedTime / 1000;
    const minutes = Math.floor(realElapsedSecs / 60);
    const seconds = Math.floor(realElapsedSecs % 60);

    const rows = [
        { text: `WAVE ${Game.wave}`, color: "#ffffff" },
        { text: `${minutes}:${seconds.toString().padStart(2, "0")}`, color: "#c8c2b4" }
    ];

    // The Mage has no dash (getDashSlotCount 0) - skip the row
    // entirely so the HUD doesn't show a phantom "DASH READY".
    const dashSlots = player.getDashSlotCount();

    if (dashSlots > 0) {

        const dashText = (cd) => cd <= 0 ? "READY" : `${(cd / 1000).toFixed(1)}S`;

        const charges = [];

        for (let i = 0; i < dashSlots; i++)
            charges.push(dashText(player.dashCooldowns[i]));

        rows.push({
            text: `DASH ${charges.join(" / ")}`,
            color: player.dashCooldowns[0] <= 0 ? "#9fd8ff" : "#7c8794"
        });

    }

    // Kit status lines (Warrior: bow/King's Blade/shield,
    // Ranger: dagger/storm lance) - each class reports its
    // own (see getHUDStatusLines). The row COUNT is fixed for
    // the whole run (it only depends on what's equipped, not on
    // live cooldown values), so sizing the plate off rows.length
    // is safe and won't pulse - only sizing off the ROWS' TEXT
    // would.
    player.getHUDStatusLines().forEach(line => {

        rows.push({ text: line.text.toUpperCase(), color: line.color });

    });

    // Fixed scale and plate width - viewport-derived only, so
    // neither changes as the rows' text changes length. Capped
    // small per-class since this used to swallow a third of the
    // screen at its widest.
    const scale = Math.max(1, Math.round(ph(0.0135) / PIXEL_GLYPH_H));
    const plateW = Math.min(pw(0.17), ph(0.34));

    const lineH = PIXEL_GLYPH_H * scale + scale * 2;
    const padding = scale * 3;
    const innerWidth = plateW - padding * 2;

    const plateX = pw(0.012);
    const plateY = ph(0.02);
    const plateH = rows.length * lineH + padding * 2 - scale * 2;

    drawPixelFrame(plateX, plateY, plateW, plateH, {
        unit: Math.max(2, scale),
        border: "#5a5040",
        borderDark: "#1b1710",
        fill: "rgba(8, 7, 5, 0.74)"
    });

    rows.forEach((row, i) => {

        // Never larger than the fixed base scale - only ever
        // shrinks, and only for the one long row, not the plate.
        const rowScale = Math.min(scale, fitPixelScale(row.text, innerWidth, lineH * 0.85));

        drawPixelText(
            row.text,
            plateX + padding + measurePixelText(row.text) * rowScale / 2,
            plateY + padding + i * lineH + PIXEL_GLYPH_H * scale / 2,
            rowScale,
            { color: row.color, shadow: "rgba(0, 0, 0, 0.85)" }
        );

    });

    // Same fixed-plate treatment the pillars get: anything
    // hidden under this panel - enemies, the player if they walk
    // up into the corner, stray projectiles, an ice/fire zone
    // spreading underneath it - is redrawn as a glowing outline
    // clipped to the panel, so nothing can lurk behind the UI.
    drawXRayInRect(plateX, plateY, plateW, plateH);

    // Same glyph scale as the rows above it, so the purse
    // reads as part of the same readout rather than a second,
    // louder panel.
    drawCoinDisplay(
        plateX + padding,
        plateY + plateH + lineH,
        scale * PIXEL_GLYPH_H
    );

}

// =====================================
// Wave Messages
// =====================================

function drawWaveMessages() {

    if (Game.waveMessageTimer > 0) {

        Game.waveMessageTimer--;

        const label = `WAVE ${Game.wave}`;

        drawPixelText(
            label,
            canvas.width / 2,
            ph(0.21),
            fitPixelScale(label, canvas.width * 0.7, ph(0.09)),
            { color: "#ffffff", shadow: "rgba(0, 0, 0, 0.9)" }
        );

    }

    if (Game.waveTransition) {

        const bannerScale =
            fitPixelScale("WAVE COMPLETE", canvas.width * 0.8, ph(0.1));

        drawPixelText(
            "WAVE COMPLETE",
            canvas.width / 2,
            canvas.height / 2,
            bannerScale,
            { color: "#ffd23f", shadow: "rgba(0, 0, 0, 0.9)" }
        );

        // The payout, placed below the banner's ACTUAL bottom
        // edge. Pixel text is centred on its midline, so a
        // fixed offset collided with the banner as soon as the
        // glyph scale grew on a wide window.
        const tally = `+${Game.waveCoins}`;
        const tallyScale = Math.max(1, Math.round(bannerScale * 0.6));

        const gap = PIXEL_GLYPH_H * bannerScale / 2 +
                    PIXEL_GLYPH_H * tallyScale / 2 +
                    bannerScale * 4;

        const coinPip = tallyScale * 5;
        const tallyW = measurePixelText(tally) * tallyScale;
        const blockW = coinPip + tallyScale * 2 + tallyW;

        const blockX = canvas.width / 2 - blockW / 2;
        const tallyY = canvas.height / 2 + gap;

        ctx.fillStyle = "#6b4c0d";
        ctx.fillRect(blockX, tallyY - coinPip / 2, coinPip, coinPip);
        ctx.fillStyle = "#e8c24d";
        ctx.fillRect(
            blockX + tallyScale, tallyY - coinPip / 2 + tallyScale,
            coinPip - tallyScale * 2, coinPip - tallyScale * 2
        );

        drawPixelText(
            tally,
            blockX + coinPip + tallyScale * 2 + tallyW / 2,
            tallyY,
            tallyScale,
            { color: "#ffe066", shadow: "rgba(0, 0, 0, 0.9)" }
        );

    }

}

// =====================================
// Game Over
// =====================================

function drawGameOver() {

    // Pixel type throughout, to match the pause menu, the HUD
    // and the RETURN HOME button below (drawButton is pixel).
    // The em dash isn't in the pixel font, so the "New Best"
    // line uses a hyphen.

    const cx = canvas.width / 2;

    drawPixelText(
        "GAME OVER",
        cx,
        ph(0.27),
        fitPixelScale("GAME OVER", canvas.width * 0.9, ph(0.12)),
        { color: "#f4ece0", shadow: "rgba(120, 20, 20, 0.9)" }
    );

    const slainText =
        `YOU WERE SLAIN BY ${Game.killedBy ?? "an unknown enemy"}`.toUpperCase();

    drawPixelText(
        slainText,
        cx,
        ph(0.42),
        fitPixelScale(slainText, canvas.width * 0.9, ph(0.04)),
        { color: "#e8e0d4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    // Score modes report the run's distance vs. the record.
    if (Game.mode === "endless" || Game.mode === "bossRush") {

        const best = Save.getBestWave(Game.mode);

        const scoreText = (
            Game.newBest
                ? `NEW BEST - WAVE ${Game.wave}!`
                : `REACHED WAVE ${Game.wave}   (BEST: ${best})`
        );

        drawPixelText(
            scoreText,
            cx,
            ph(0.50),
            fitPixelScale(scoreText, canvas.width * 0.9, ph(0.034)),
            {
                color: Game.newBest ? "#f1c40f" : "#dddddd",
                shadow: "rgba(0, 0, 0, 0.85)"
            }
        );

    }

    const coinsText = `TOTAL COINS: ${Save.coins}`;

    drawPixelText(
        coinsText,
        cx,
        ph(0.56),
        fitPixelScale(coinsText, canvas.width * 0.9, ph(0.032)),
        { color: "#f1c40f", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    drawButton(getHomeButton(), "RETURN HOME", "lime", "black", ph(0.028));

}

// =====================================
// Victory (Campaign cleared)
// =====================================
//
// Shown when the King falls in Campaign. Boss Rush and Endless
// never reach here (see onEnemyKilled in game.js).

function drawVictory() {

    // Pixel type throughout, matching the Game Over screen and
    // the RETURN HOME button below (drawButton is pixel).

    const cx = canvas.width / 2;

    // Golden glow behind the title - a soft radial bloom rather
    // than a canvas shadowBlur, which would just fuzz the pixel
    // edges we're trying to keep sharp.
    ctx.save();
    const glow = ctx.createRadialGradient(
        cx, ph(0.27), 0,
        cx, ph(0.27), canvas.width * 0.32
    );
    glow.addColorStop(0, "rgba(255, 215, 0, 0.35)");
    glow.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, ph(0.12), canvas.width, ph(0.3));
    ctx.restore();

    drawPixelText(
        "VICTORY",
        cx,
        ph(0.27),
        fitPixelScale("VICTORY", canvas.width * 0.9, ph(0.13)),
        { color: "#ffd54a", shadow: "rgba(120, 80, 0, 0.9)" }
    );

    const wonText = "THE KING HAS FALLEN. THE ARENA IS YOURS.";

    drawPixelText(
        wonText,
        cx,
        ph(0.42),
        fitPixelScale(wonText, canvas.width * 0.9, ph(0.036)),
        { color: "#e8e0d4", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    const hintText = "SEEK AN ENDLESS TRIAL FOR A STERNER TEST.";

    drawPixelText(
        hintText,
        cx,
        ph(0.49),
        fitPixelScale(hintText, canvas.width * 0.9, ph(0.03)),
        { color: "#c9a227", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    const coinsText = `TOTAL COINS: ${Save.coins}`;

    drawPixelText(
        coinsText,
        cx,
        ph(0.56),
        fitPixelScale(coinsText, canvas.width * 0.9, ph(0.032)),
        { color: "#f1c40f", shadow: "rgba(0, 0, 0, 0.85)" }
    );

    drawButton(getHomeButton(), "RETURN HOME", "lime", "black", ph(0.028));

}