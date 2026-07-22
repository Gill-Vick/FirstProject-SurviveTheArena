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

        ctx.fillStyle = "white";
        ctx.font = `bold ${ph(0.018)}px ${UI_FONT}`;
        ctx.textAlign = "left";
        ctx.fillText(
            entry.label,
            panel.x + panel.width * 0.07,
            slider.y + slider.height * 0.9
        );

        // Track, filled portion, knob.
        ctx.fillStyle = "#333";
        ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

        ctx.fillStyle = "#c9a227";
        ctx.fillRect(slider.x, slider.y, slider.width * value, slider.height);

        ctx.fillStyle = "white";
        ctx.fillRect(
            slider.x + slider.width * value - pw(0.003),
            slider.y - slider.height * 0.3,
            pw(0.006),
            slider.height * 1.6
        );

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

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.045)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", canvas.width / 2, panel.y + ph(0.065));

    drawButton(getPauseResumeButton(), "RESUME", "lime", "black", ph(0.026));

    if (Game.mode === "custom") {

        ctx.fillStyle = "#f1c40f";
        ctx.font = `bold ${ph(0.026)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(`Wave: ${Game.wave}`, canvas.width / 2, panel.y + ph(0.26));

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

    drawButton(b, "", "#333", "white", 1);

    // Headphones: an arc for the band, two capsules for the
    // ear cups hanging off its ends.
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const r = b.width * 0.26;

    ctx.save();

    ctx.strokeStyle = "white";
    ctx.lineWidth = b.width * 0.09;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.25, r, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "white";

    const cupW = b.width * 0.16;
    const cupH = b.width * 0.3;

    [cx - r, cx + r].forEach(x => {

        ctx.beginPath();
        ctx.roundRect(x - cupW / 2, cy + r * 0.15, cupW, cupH, cupW / 2);
        ctx.fill();

    });

    ctx.restore();

}

function drawAudioSettingsMenu() {

    const panel = getPausePanelRect();

    ctx.fillStyle = "#1c1815";
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = Math.max(3, ph(0.005));
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.045)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("AUDIO", canvas.width / 2, panel.y + ph(0.09));

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

function getShopCritSlider(index) {

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    return {
        x: marginX,
        y: rowStart + index * rowHeight + ph(0.068),
        width: pw(0.18),
        height: ph(0.02)
    };

}

// Stage picker rect for any staged item's row (bow, shield,
// cloak, dagger).
function getShopStageSlider(index) {

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    return {
        x: marginX + pw(0.19),
        y: rowStart + index * rowHeight + ph(0.045),
        width: pw(0.09),
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

function getBestiaryGridMetrics() {

    // Page 0 only holds the normal enemies now (bosses live
    // on their own pages), so 4 columns × 2 rows gives every
    // cell plenty of room.
    const cols = 4;
    const rows = Math.ceil(BESTIARY_NORMAL_ORDER.length / cols);

    const panel = getBestiaryPanelRect();

    // Generous gaps so cells (and their name labels) read as
    // clearly separate instead of packed edge-to-edge.
    const gapX = pw(0.03);
    const gapY = ph(0.085);

    const gridTop = ph(0.34);

    // The bottom row's name label hangs ~ph(0.05) below its
    // cell, so that strip is reserved here - otherwise a
    // 3-row grid's last labels poke out of the panel.
    const gridBottom = panel.y + panel.height - ph(0.045) - ph(0.05);

    const availableWidth = panel.width - pw(0.04);
    const availableHeight = gridBottom - gridTop;

    const cellFromWidth = (availableWidth - gapX * (cols - 1)) / cols;
    const cellFromHeight = (availableHeight - gapY * (rows - 1)) / rows;

    // Capped by whichever axis is tighter, so the grid never
    // overflows the panel - it just spans however much of the
    // wider axis it can while staying square.
    const cell = Math.min(cellFromWidth, cellFromHeight);

    const usedWidth = cell * cols + gapX * (cols - 1);
    const gridX = panel.x + pw(0.02) + (availableWidth - usedWidth) / 2;

    return { cols, rows, gridX, gridY: gridTop, gapX, gapY, cell };

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

    const size = fontSize ?? ph(0.028);
    const { x, y, width: w, height: h } = btn;

    const radius = Math.min(h * 0.3, ph(0.016));
    const border = Math.max(1.5, Math.min(w, h) * 0.06);

    ctx.save();

    // Seat the plate on the surface with a soft drop shadow.
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = Math.max(2, h * 0.14);
    ctx.shadowOffsetY = Math.max(1, h * 0.07);

    roundRectPath(x, y, w, h, radius);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Forged-metal bevel, layered over whatever the fill was so
    // every button reads as a raised plate regardless of accent.
    roundRectPath(x, y, w, h, radius);
    ctx.save();
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, y, 0, y + h);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.04)");
    sheen.addColorStop(0.55, "rgba(0, 0, 0, 0.04)");
    sheen.addColorStop(1, "rgba(0, 0, 0, 0.40)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);
    ctx.restore();

    // Dark outer seat...
    roundRectPath(x, y, w, h, radius);
    ctx.strokeStyle = "rgba(20, 14, 8, 0.75)";
    ctx.lineWidth = border;
    ctx.stroke();

    // ...wrapped in a gilt inner frame - the shared medieval cue.
    const inset = border * 0.85;
    roundRectPath(
        x + inset,
        y + inset,
        w - inset * 2,
        h - inset * 2,
        Math.max(0.5, radius - inset)
    );
    ctx.strokeStyle = "rgba(201, 162, 39, 0.9)";
    ctx.lineWidth = Math.max(1, border * 0.55);
    ctx.stroke();

    // Engraved serif label with a carved drop-shadow.
    ctx.font = `bold ${size}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const cx = x + w / 2;
    const ty = y + h / 2 + size * 0.35;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillText(label, cx + Math.max(1, size * 0.03), ty + Math.max(1, size * 0.05));
    ctx.fillStyle = textColor;
    ctx.fillText(label, cx, ty);

    ctx.restore();

}

function drawCoinDisplay(x, y, size) {

    ctx.fillStyle = "gold";
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(`Coins: ${Save.coins}`, x, y);

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
    const boxW = segW * 0.85;
    const fontSize = slider.height * 0.65;

    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";

    for (let s = 1; s <= 3; s++) {

        const segX = slider.x + (s - 1) * segW;

        ctx.fillStyle = s === currentStage ? activeColor : "#444";
        ctx.fillRect(segX, slider.y, boxW, slider.height);

        ctx.fillStyle = s === currentStage ? "black" : "#aaa";
        ctx.fillText(labels[s - 1], segX + boxW / 2, slider.y + slider.height * 0.72);

        if (s < 3) {

            ctx.fillStyle = "#888";
            ctx.font = `${fontSize * 0.75}px Arial`;
            ctx.fillText("→", segX + segW * 0.95, slider.y + slider.height * 0.72);
            ctx.font = `${fontSize}px Arial`;

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

function drawCritSlider(slider, value, maxLevel) {

    ctx.fillStyle = "#333";
    ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

    const pct = maxLevel > 0 ? value / maxLevel : 0;

    ctx.fillStyle = "#4da6ff";
    ctx.fillRect(slider.x, slider.y, slider.width * pct, slider.height);

    const knobX = slider.x + slider.width * pct;
    const knobRadius = slider.height * 0.55;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(knobX, slider.y + slider.height / 2, knobRadius, 0, Math.PI * 2);
    ctx.fill();

    const equippedPct = Math.round(Save.getEquippedCritChance() * 100);
    const maxPct = Math.round(Save.getCritChance() * 100);

    ctx.fillStyle = "#4da6ff";
    ctx.font = `${slider.height * 0.9}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(
        `Equipped: ${equippedPct}%  (owned up to ${maxPct}%)`,
        slider.x + slider.width + slider.height,
        slider.y + slider.height * 0.75
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

    ctx.fillStyle = "#333";
    ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

    const pct = maxLevel > 0 ? value / maxLevel : 0;

    ctx.fillStyle = "#ff69b4";
    ctx.fillRect(slider.x, slider.y, slider.width * pct, slider.height);

    const knobX = slider.x + slider.width * pct;
    const knobRadius = slider.height * 0.55;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(knobX, slider.y + slider.height / 2, knobRadius, 0, Math.PI * 2);
    ctx.fill();

    const equippedPct = Math.round(Save.getEquippedCharmChance() * 100);
    const maxPct = Math.round(Save.getCharmChance() * 100);

    ctx.fillStyle = "#ff69b4";
    ctx.font = `${slider.height * 0.9}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(
        `Equipped: ${equippedPct}%  (owned up to ${maxPct}%)`,
        slider.x + slider.width + slider.height,
        slider.y + slider.height * 0.75
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

        ctx.fillStyle = "white";
        ctx.font = `bold ${ph(0.09)}px ${UI_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("SURVIVE THE ARENA", canvas.width / 2, ph(0.16));

    }

    drawCoinDisplay(canvas.width - pw(0.17), ph(0.09), ph(0.032));

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

    const btnFont = ph(0.03);

    drawButton(getStartButton(), "START", "lime", "black", btnFont);
    drawButton(getShopButton(), "ARMOURY", "#c9a227", "black", btnFont);
    drawButton(getBestiaryButton(), "BESTIARY", "#8B4513", "white", btnFont);

    drawAudioSettingsButton();

}

function drawModeSelect() {

    ctx.fillStyle = "#ccc";
    ctx.font = `${ph(0.028)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("CHOOSE YOUR TRIAL", canvas.width / 2, ph(0.24));

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

    const cardRadius = ph(0.014);

    roundRectPath(card.x, card.y, card.width, card.height, cardRadius);
    const cardGrad = ctx.createLinearGradient(0, card.y, 0, card.y + card.height);
    cardGrad.addColorStop(0, "rgba(30, 24, 18, 0.82)");
    cardGrad.addColorStop(1, "rgba(12, 10, 8, 0.88)");
    ctx.fillStyle = cardGrad;
    ctx.fill();

    // Accent outer frame with a thin gilt inner line, echoing
    // the buttons so the whole menu reads as one set.
    roundRectPath(card.x, card.y, card.width, card.height, cardRadius);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, ph(0.006));
    ctx.stroke();

    const giltInset = ph(0.008);
    roundRectPath(
        card.x + giltInset,
        card.y + giltInset,
        card.width - giltInset * 2,
        card.height - giltInset * 2,
        Math.max(1, cardRadius - giltInset)
    );
    ctx.strokeStyle = "rgba(201, 162, 39, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Half-height cards squeeze every offset/font down so the
    // same anatomy (title, divider, lore) still fits.
    const titleFont = compact ? ph(0.026) : ph(0.034);
    const titleY = compact ? ph(0.05) : ph(0.075);
    const dividerY = compact ? ph(0.075) : ph(0.11);
    const loreY = compact ? ph(0.115) : ph(0.16);
    const loreFont = compact ? ph(0.018) : ph(0.021);
    const loreLine = compact ? ph(0.027) : ph(0.032);

    ctx.fillStyle = accent;
    ctx.font = `bold ${titleFont}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(title, card.x + card.width / 2, card.y + titleY);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(card.x + pw(0.02), card.y + dividerY);
    ctx.lineTo(card.x + card.width - pw(0.02), card.y + dividerY);
    ctx.stroke();

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
        ctx.fillStyle = accent;
        ctx.font = `bold ${compact ? ph(0.02) : ph(0.024)}px ${UI_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(
            footer,
            card.x + card.width / 2,
            card.y + card.height - ph(0.028)
        );
    }

}

function drawShop() {

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.055)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("ARMOURY", canvas.width / 2, ph(0.08));

    drawButton(getShopBackButton(), "BACK", "#555", "white", ph(0.024));

    // Class selector - the class showing here is the class
    // the next run plays as.
    const selectedClass =
        CLASSES.find(c => c.id === Save.selectedClass) ?? CLASSES[0];

    drawButton(getArmouryClassArrowButton(-1), "◀", "#333", "white", ph(0.026));
    drawButton(getArmouryClassArrowButton(1), "▶", "#333", "white", ph(0.026));

    ctx.fillStyle = "#c9a227";
    ctx.font = `bold ${ph(0.04)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(selectedClass.name, canvas.width / 2, ph(0.152));

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

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(marginX, rowY - ph(0.008), canvas.width - marginX * 2, rowHeight - ph(0.01));

        ctx.fillStyle = "white";
        ctx.font = `bold ${ph(0.026)}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText(item.name, marginX + pw(0.015), rowY + ph(0.02));

        ctx.font = `${ph(0.018)}px Arial`;
        ctx.fillStyle = "#ccc";
        ctx.fillText(item.desc, marginX + pw(0.015), rowY + ph(0.045));

        ctx.fillStyle = "gold";
        ctx.font = `${ph(0.018)}px Arial`;
        if (staged && Save.getStage(id) >= Save.getMaxStage(id)) {
            ctx.fillText("Max level reached", marginX + pw(0.015), rowY + ph(0.065));
        } else {
            ctx.fillText(`${item.price} coins`, marginX + pw(0.015), rowY + ph(0.065));
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
    const plateH = ph(0.038);

    // Portrait tile with a soft drop shadow.
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = cell.width * 0.1;
    ctx.shadowOffsetY = cell.width * 0.04;
    roundRectPath(cell.x, cell.y, cell.width, cell.height, r);
    ctx.fillStyle = unlocked ? "#241f19" : "#1a1714";
    ctx.fill();
    ctx.restore();

    // Vertical sheen so the tile reads as carved stone.
    ctx.save();
    roundRectPath(cell.x, cell.y, cell.width, cell.height, r);
    ctx.clip();
    const g = ctx.createLinearGradient(0, cell.y, 0, cell.y + cell.height);
    g.addColorStop(0, unlocked ? "rgba(120, 92, 58, 0.5)" : "rgba(70, 64, 56, 0.35)");
    g.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    ctx.restore();

    // Creature glyph / sealed silhouette.
    drawEnemyPreview(type, cell.x, cell.y, cell.width, cell.height, unlocked);

    // Gilt frame.
    roundRectPath(cell.x, cell.y, cell.width, cell.height, r);
    ctx.strokeStyle = unlocked ? "rgba(201, 162, 39, 0.9)" : "rgba(120, 100, 62, 0.5)";
    ctx.lineWidth = Math.max(1.5, cell.width * 0.03);
    ctx.stroke();

    // Nameplate banner beneath the portrait.
    const plateX = cell.x + cell.width * 0.04;
    const plateW = cell.width * 0.92;
    const plateY = cell.y + cell.height + gap;

    roundRectPath(plateX, plateY, plateW, plateH, plateH * 0.28);
    ctx.fillStyle = "rgba(18, 12, 8, 0.85)";
    ctx.fill();
    roundRectPath(plateX, plateY, plateW, plateH, plateH * 0.28);
    ctx.strokeStyle = unlocked ? "rgba(201, 162, 39, 0.65)" : "rgba(120, 100, 62, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const label = unlocked ? entry.name : "? ? ?";

    // Shrink the label until it fits the plate so long names
    // (Necromancer, Frost Weaver) don't spill past the frame.
    let fontSize = Math.max(9, cell.width * 0.15);
    ctx.font = `bold ${fontSize}px ${UI_FONT}`;
    const maxLabelW = plateW * 0.9;
    while (fontSize > 8 && ctx.measureText(label).width > maxLabelW) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px ${UI_FONT}`;
    }

    ctx.fillStyle = unlocked ? "#f2e4c2" : "#8a7a5a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cell.x + cell.width / 2, plateY + plateH / 2);
    ctx.textBaseline = "alphabetic";

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

function getBestiaryPageCount() {

    return 1 + BESTIARY_BOSS_ORDER.length;

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

    const bossType = page > 0 ? BESTIARY_BOSS_ORDER[page - 1] : null;
    const bossUnlocked = bossType ? Save.isBestiaryUnlocked(bossType) : false;

    // Page title + arrows (the boss's name once discovered)
    const title = page === 0
        ? "BESTIARY"
        : (bossUnlocked ? BESTIARY[bossType].name.toUpperCase() : "???");

    ctx.fillStyle = page === 0 ? "white" : "gold";
    ctx.font = `bold ${ph(0.05)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, ph(0.185));

    drawButton(getBestiaryPageArrowButton(-1), "◀", "#3a2a20", "white", ph(0.026));
    drawButton(getBestiaryPageArrowButton(1), "▶", "#3a2a20", "white", ph(0.026));

    ctx.fillStyle = "#d0b58a";
    ctx.font = `italic ${ph(0.02)}px ${UI_FONT}`;
    ctx.fillText(
        page === 0
            ? `Creatures — page 1 / ${getBestiaryPageCount()}`
            : `Boss — page ${page + 1} / ${getBestiaryPageCount()}`,
        canvas.width / 2,
        ph(0.235)
    );

    if (page > 0) {

        drawBestiaryBossPage(bossType);

        return;

    }

    BESTIARY_NORMAL_ORDER.forEach((type, i) => {

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

    drawBestiaryPortrait(type, previewX, previewY, previewSize, previewSize, unlocked);

    const textX = previewX + previewSize + pw(0.04);
    const textWidth = panel.x + panel.width - pw(0.04) - textX;

    if (!unlocked) {

        ctx.fillStyle = "#a08560";
        ctx.font = `${ph(0.028)}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText("Defeat this foe to unlock its page.", textX, previewY + ph(0.06));

        return;

    }

    ctx.textAlign = "left";

    // desc, behavior, and lore all wrap to textWidth and flow
    // downward from the running y, so a long line (e.g. the
    // Royal Magus's behavior) pushes the rest down instead of
    // spilling off the right edge of the panel.
    let textY = previewY + ph(0.035);

    ctx.fillStyle = "#eee";
    ctx.font = `${ph(0.024)}px Arial`;
    textY = wrapText(entry.desc, textX, textY, textWidth, ph(0.032));

    textY += ph(0.02);

    ctx.fillStyle = "#c9a227";
    ctx.font = `bold ${ph(0.02)}px Arial`;
    textY = wrapText(`Behavior: ${entry.behavior}`, textX, textY, textWidth, ph(0.028));

    textY += ph(0.02);

    // Lore, wrapped, in italics under a thin divider
    ctx.strokeStyle = "rgba(201, 162, 39, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textX, textY);
    ctx.lineTo(textX + textWidth, textY);
    ctx.stroke();

    textY += ph(0.035);

    ctx.fillStyle = "#e8d9b8";
    ctx.font = `italic ${ph(0.022)}px Georgia, serif`;
    wrapText(entry.lore, textX, textY, textWidth, ph(0.037));

    // Stats block along the bottom of the panel
    const statsY = panel.y + panel.height - ph(0.19);

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.026)}px ${UI_FONT}`;
    ctx.fillText("Stats", panel.x + pw(0.05), statsY);

    ctx.fillStyle = "#ddd";
    ctx.font = `${ph(0.021)}px Arial`;

    // Health reads as a sentence now, so it can be long enough
    // to need wrapping - flow the speed line off wherever it ends.
    const statsX = panel.x + pw(0.05);
    const statsWidth = panel.width - pw(0.1);

    let sy = wrapText(`Health: ${entry.hpScale}`, statsX, statsY + ph(0.045), statsWidth, ph(0.03));

    ctx.fillText(`Speed: ${describeSpeed(entry.baseSpeed)}`, statsX, sy + ph(0.01));

}

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

    drawBestiaryPortrait(type, previewX, previewY, previewSize, previewSize, true);

    const textX = previewX + previewSize + pw(0.03);

    ctx.fillStyle = entry.isBoss ? "gold" : "white";
    ctx.font = `bold ${ph(0.05)}px ${UI_FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(entry.name, textX, previewY + ph(0.05));

    ctx.fillStyle = "#ccc";
    ctx.font = `${ph(0.026)}px Arial`;
    ctx.fillText(entry.desc, textX, previewY + ph(0.12));

    ctx.fillStyle = "#aaa";
    ctx.font = `${ph(0.023)}px Arial`;
    ctx.fillText(`Behavior: ${entry.behavior}`, textX, previewY + ph(0.17));

    const wave1Hp = entry.hpAtWave(1);
    const wave5Hp = entry.hpAtWave(5);
    const wave10Hp = entry.hpAtWave(10);

    const statsY = previewY + previewSize + ph(0.08);

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.028)}px ${UI_FONT}`;
    ctx.fillText("Stats", panel.x + pw(0.03), statsY);

    ctx.fillStyle = "#ddd";
    ctx.font = `${ph(0.023)}px Arial`;

    // Health is a plain-English sentence, so it may wrap - the
    // lines below flow from wherever it ends rather than sitting
    // at fixed offsets.
    const statsX = panel.x + pw(0.03);
    const statsWidth = panel.width - pw(0.06);
    const lineGap = ph(0.04);

    let sy = wrapText(`Health: ${entry.hpScale}`, statsX, statsY + ph(0.05), statsWidth, ph(0.033));

    sy += ph(0.008);

    ctx.fillText(`Health on wave 1: ${wave1Hp}   wave 5: ${wave5Hp}   wave 10: ${wave10Hp}`, statsX, sy);
    ctx.fillText(`Speed: ${describeSpeed(entry.baseSpeed)}`, statsX, sy + lineGap);

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

        // Only the creatures grid (page 0) has clickable
        // cells - boss pages already show everything.
        if (Game.bestiaryPage !== 0)
            return;

        BESTIARY_NORMAL_ORDER.forEach((type, i) => {

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

    // Pause control, top-center ("II" glyph). P toggles too.
    const pauseBtn = getPauseButton();

    const pauseRadius = Math.min(pauseBtn.height * 0.3, ph(0.014));

    roundRectPath(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height, pauseRadius);
    ctx.fillStyle = "rgba(28, 24, 21, 0.72)";
    ctx.fill();

    roundRectPath(pauseBtn.x, pauseBtn.y, pauseBtn.width, pauseBtn.height, pauseRadius);
    ctx.strokeStyle = "rgba(201, 162, 39, 0.85)";
    ctx.lineWidth = Math.max(1.5, pauseBtn.width * 0.04);
    ctx.stroke();

    const barW = pauseBtn.width * 0.16;
    const barH = pauseBtn.height * 0.5;
    const barY = pauseBtn.y + (pauseBtn.height - barH) / 2;

    ctx.fillStyle = "#e8d9b8";
    ctx.fillRect(pauseBtn.x + pauseBtn.width * 0.3 - barW / 2, barY, barW, barH);
    ctx.fillRect(pauseBtn.x + pauseBtn.width * 0.7 - barW / 2, barY, barW, barH);

    if (Game.immortal) {

        ctx.fillStyle = "#f1c40f";
        ctx.font = `bold ${ph(0.022)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(
            "IMMORTAL",
            canvas.width / 2,
            pauseBtn.y + pauseBtn.height + ph(0.032)
        );

    }

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.035)}px Arial`;
    ctx.textAlign = "left";

    ctx.fillText(`Wave: ${Game.wave}`, pw(0.015), ph(0.05));

    const realElapsedSecs = Game.elapsedTime / 1000;
    const minutes = Math.floor(realElapsedSecs / 60);
    const seconds = Math.floor(realElapsedSecs % 60);
    const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    ctx.fillText(timeText, pw(0.015), ph(0.095));

    // The Mage has no dash (getDashSlotCount 0) - skip the line
    // entirely so the HUD doesn't show a phantom "Dash: READY".
    const dashSlots = player.getDashSlotCount();

    if (dashSlots > 0) {

        const getDashText = (cd) => {
            if (cd <= 0)
                return "READY";
            const realDashSecs = (cd / 1000).toFixed(1);
            return `${realDashSecs}s`;
        };

        const dash1 = getDashText(player.dashCooldowns[0]);
        const dash2 = dashSlots >= 2
            ? getDashText(player.dashCooldowns[1])
            : null;

        ctx.fillText(
            dash2
                ? `Dash: ${dash1} | ${dash2}`
                : `Dash: ${dash1}`,
            pw(0.015),
            ph(0.14)
        );

    }

    drawCoinDisplay(pw(0.015), ph(0.185), ph(0.03));

    let nextLineY = ph(0.23);
    const lineStep = ph(0.045);

    // Kit status lines (Warrior: bow/King's Blade/shield,
    // Ranger: dagger/storm lance) - each class reports its
    // own (see getHUDStatusLines).
    player.getHUDStatusLines().forEach(line => {

        ctx.fillStyle = line.color;
        ctx.font = `bold ${ph(0.035)}px Arial`;
        ctx.fillText(line.text, pw(0.015), nextLineY);

        nextLineY += lineStep;

    });

}

// =====================================
// Wave Messages
// =====================================

function drawWaveMessages() {

    if (Game.waveMessageTimer > 0) {

        Game.waveMessageTimer--;

        ctx.textAlign = "center";
        ctx.font = `${ph(0.07)}px Arial`;
        ctx.fillStyle = "white";
        ctx.fillText(`WAVE ${Game.wave}`, canvas.width / 2, ph(0.21));

    }

    if (Game.waveTransition) {

        ctx.textAlign = "center";
        ctx.font = `${ph(0.08)}px Arial`;
        ctx.fillStyle = "gold";
        ctx.fillText("WAVE COMPLETE", canvas.width / 2, canvas.height / 2);

        // The breather tally: what the wave paid out, and
        // that the dash came back with it.
        ctx.font = `${ph(0.04)}px Arial`;
        ctx.fillStyle = "#ffe28a";
        ctx.fillText(
            `+${Game.waveCoins} coins`,
            canvas.width / 2,
            canvas.height / 2 + ph(0.065)
        );

        ctx.font = `${ph(0.028)}px Arial`;
        ctx.fillStyle = "#9fd8ff";
        ctx.fillText(
            "Dash refunded",
            canvas.width / 2,
            canvas.height / 2 + ph(0.11)
        );

    }

}

// =====================================
// Game Over
// =====================================

function drawGameOver() {

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.09)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, ph(0.31));

    ctx.font = `${ph(0.045)}px Arial`;
    ctx.fillText(
        `You were slain by ${Game.killedBy ?? "an unknown enemy"}`,
        canvas.width / 2,
        ph(0.42)
    );

    // Score modes report the run's distance vs. the record.
    if (Game.mode === "endless" || Game.mode === "bossRush") {

        const best = Save.getBestWave(Game.mode);

        ctx.fillStyle = Game.newBest ? "gold" : "#ddd";
        ctx.font = `${ph(0.038)}px Arial`;
        ctx.fillText(
            Game.newBest
                ? `New Best — Wave ${Game.wave}!`
                : `Reached Wave ${Game.wave}   (Best: ${best})`,
            canvas.width / 2,
            ph(0.49)
        );

    }

    ctx.fillStyle = "gold";
    ctx.font = `${ph(0.036)}px Arial`;
    ctx.fillText(
        `Total Coins: ${Save.coins}`,
        canvas.width / 2,
        ph(0.55)
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

    ctx.save();

    ctx.fillStyle = "gold";
    ctx.font = `bold ${ph(0.1)}px ${UI_FONT}`;
    ctx.textAlign = "center";
    ctx.shadowBlur = 24;
    ctx.shadowColor = "rgba(255, 215, 0, 0.7)";
    ctx.fillText("VICTORY", canvas.width / 2, ph(0.3));

    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.04)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
        "The King has fallen. The arena is yours.",
        canvas.width / 2,
        ph(0.42)
    );

    ctx.fillStyle = "#c9a227";
    ctx.font = `${ph(0.03)}px Arial`;
    ctx.fillText(
        "Seek an endless trial for a sterner test.",
        canvas.width / 2,
        ph(0.48)
    );

    ctx.fillStyle = "gold";
    ctx.font = `${ph(0.036)}px Arial`;
    ctx.fillText(
        `Total Coins: ${Save.coins}`,
        canvas.width / 2,
        ph(0.56)
    );

    drawButton(getHomeButton(), "RETURN HOME", "lime", "black", ph(0.028));

}