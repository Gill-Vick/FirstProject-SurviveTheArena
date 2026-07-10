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

const SHOP_ITEM_IDS = [

    // Warrior
    "shield", "bow",
    "wetStone", "circleStrike", "hermesShoes", "kingsBlade",
    "knightLocket", "windrunnerAnklet",

    // Ranger
    "cloak", "dagger", "emberArrows",
    "falconQuiver", "swiftdrawGloves",
    "huntersMark", "galeRecurve", "stormpiercer",

    // Shared
    "critRate"

];

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

    const index = CLASSES.findIndex(c => c.id === Save.selectedClass);

    const next = (index + step + CLASSES.length) % CLASSES.length;

    Save.setSelectedClass(CLASSES[next].id);

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

    // Rows start a little lower than they used to, leaving
    // room for the class selector under the ARMOURY title.
    const rowStart = 0.19;
    const available = 0.8 - rowStart;

    return {
        rowHeight: ph(Math.min(0.095, available / getArmouryItemIds().length)),
        rowStart: ph(rowStart),
        marginX: pw(0.04)
    };

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

    const cols = 5;
    const rows = Math.ceil(BESTIARY_ORDER.length / cols);

    const panel = getBestiaryPanelRect();

    // Gaps are a meaningfully bigger chunk of the available
    // space than before, so cells read as clearly separate
    // instead of packed edge-to-edge.
    const gapX = pw(0.02);
    const gapY = ph(0.045);

    const gridTop = ph(0.30);
    const gridBottom = panel.y + panel.height - ph(0.03);

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

function drawButton(btn, label, fill, textColor, fontSize) {

    const size = fontSize ?? ph(0.028);

    ctx.fillStyle = fill;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    ctx.fillStyle = textColor;
    ctx.font = `${size}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
        label,
        btn.x + btn.width / 2,
        btn.y + btn.height / 2 + size * 0.35
    );

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

const STAGE_SLIDER_STYLE = {

    bow: { labels: ["1", "2", "3"], activeColor: "#c9a227" },
    shield: { labels: ["W", "O", "B"], activeColor: "#4da6ff" },
    cloak: { labels: ["T", "S", "P"], activeColor: "#9b59b6" },
    dagger: { labels: ["1", "2", "3"], activeColor: "#95a5a6" }

};

function drawStageIndicator(slider, currentStage, itemId) {

    const { labels, activeColor } = STAGE_SLIDER_STYLE[itemId];

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
        ctx.font = `${ph(0.09)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("SURVIVE THE ARENA", canvas.width / 2, ph(0.16));

    }

    drawCoinDisplay(canvas.width - pw(0.17), ph(0.09), ph(0.032));

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

    const btnFont = ph(0.03);

    drawButton(getStartButton(), "START", "lime", "black", btnFont);
    drawButton(getShopButton(), "ARMOURY", "#c9a227", "black", btnFont);
    drawButton(getBestiaryButton(), "BESTIARY", "#8B4513", "white", btnFont);

}

function drawShop() {

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.055)}px Arial`;
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
    ctx.font = `bold ${ph(0.04)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(selectedClass.name, canvas.width / 2, ph(0.152));

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    getArmouryItemIds().forEach((id, i) => {

        const item = SHOP_ITEMS[id];
        const rowY = rowStart + i * rowHeight;
        const buyBtn = getShopBuyButton(i);
        const equipBtn = getShopEquipButton(i);

        const staged = STAGED_ITEM_IDS.includes(id);

        const owned = staged
            ? Save.getStage(id) >= 3
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
        if (staged && Save.getStage(id) >= 3) {
            ctx.fillText("Max level reached", marginX + pw(0.015), rowY + ph(0.065));
        } else {
            ctx.fillText(`${item.price} coins`, marginX + pw(0.015), rowY + ph(0.065));
        }

        // Staged items get the 3-segment stage picker. Bow and
        // dagger always show theirs; shield and cloak only once
        // the first stage is owned (matching the old behavior).
        if (id === "bow" || id === "dagger") {
            drawStageIndicator(getShopStageSlider(i), Save.getEquippedStage(id), id);
        }

        if ((id === "shield" || id === "cloak") && Save.getStage(id) >= 1) {
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
            (staged && Save.getStage(id) >= 3);

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

}

function drawEnemyPreview(type, x, y, w, h, unlocked) {

    const entry = BESTIARY[type];

    ctx.save();

    if (entry.isBoss) {

        ctx.strokeStyle = "gold";
        ctx.lineWidth = Math.max(2, ph(0.004));
        ctx.strokeRect(x, y, w, h);

    }

    if (!unlocked) {

        ctx.fillStyle = "#444";
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        ctx.fillStyle = "#888";
        ctx.font = `bold ${Math.floor(Math.min(w, h) * 0.45)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("?", x + w / 2, y + h / 2 + Math.min(w, h) * 0.15);

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

function drawBestiary() {

    const panel = getBestiaryPanelRect();

    ctx.fillStyle = "#5c4033";
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = Math.max(3, ph(0.006));
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.055)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("BESTIARY", canvas.width / 2, ph(0.185));

    drawButton(getBestiaryBackButton(), "BACK", "#555", "white", ph(0.024));

    BESTIARY_ORDER.forEach((type, i) => {

        const cell = getBestiaryCell(i);
        const entry = BESTIARY[type];
        const unlocked = Save.isBestiaryUnlocked(type);

        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(
            cell.x - cell.width * 0.04,
            cell.y - cell.width * 0.04,
            cell.width * 1.08,
            cell.height + ph(0.04)
        );

        drawEnemyPreview(type, cell.x, cell.y, cell.width, cell.height, unlocked);

        ctx.fillStyle = unlocked ? "white" : "#666";
        ctx.font = `${Math.max(10, cell.width * 0.12)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(
            unlocked ? entry.name : "???",
            cell.x + cell.width / 2,
            cell.y + cell.height + cell.width * 0.16
        );

    });

}

function drawBestiaryDetail() {

    const type = Game.bestiarySelected;
    const entry = BESTIARY[type];

    if (!entry)
        return;

    const panel = getBestiaryPanelRect();

    ctx.fillStyle = "#5c4033";
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = Math.max(3, ph(0.006));
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

    drawButton(getBestiaryBackButton(), "BACK", "#555", "white", ph(0.024));

    const previewX = panel.x + pw(0.04);
    const previewY = panel.y + ph(0.09);
    const previewSize = Math.min(pw(0.16), panel.height * 0.4);

    drawEnemyPreview(type, previewX, previewY, previewSize, previewSize, true);

    const textX = previewX + previewSize + pw(0.03);

    ctx.fillStyle = entry.isBoss ? "gold" : "white";
    ctx.font = `bold ${ph(0.05)}px Arial`;
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
    const speed1 = (entry.baseSpeed * (1 + 0 * 0.08)).toFixed(1);
    const speed5 = (entry.baseSpeed * (1 + 4 * 0.08)).toFixed(1);
    const speed10 = (entry.baseSpeed * (1 + 9 * 0.08)).toFixed(1);

    const statsY = previewY + previewSize + ph(0.08);

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.028)}px Arial`;
    ctx.fillText("Stats", panel.x + pw(0.03), statsY);

    ctx.fillStyle = "#ddd";
    ctx.font = `${ph(0.023)}px Arial`;
    ctx.fillText(`HP scaling: ${entry.hpScale}`, panel.x + pw(0.03), statsY + ph(0.05));
    ctx.fillText(`Wave 1 HP: ${wave1Hp}   Wave 5: ${wave5Hp}   Wave 10: ${wave10Hp}`, panel.x + pw(0.03), statsY + ph(0.09));
    ctx.fillText(`Base speed: ${entry.baseSpeed} (+8% per wave)`, panel.x + pw(0.03), statsY + ph(0.13));
    ctx.fillText(`Speed W1: ${speed1}   W5: ${speed5}   W10: ${speed10}`, panel.x + pw(0.03), statsY + ph(0.17));

}

function handleMenuClick(x, y) {

    if (Game.menuView === "shop") {

        if (hitRect(getShopBackButton(), x, y)) {
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

        getArmouryItemIds().forEach((id, i) => {

            const item = SHOP_ITEMS[id];

            if (item.equippable && Save.owns(id) && hitRect(getShopEquipButton(i), x, y))
                Save.toggleEquip(id);

            if (hitRect(getShopBuyButton(i), x, y))
                Save.purchase(id);

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

        if (hitRect(getBestiaryBackButton(), x, y))
            Game.menuView = "bestiary";

        return;

    }

    if (Game.menuView === "bestiary") {

        if (hitRect(getBestiaryBackButton(), x, y)) {
            Game.menuView = "main";
            return;
        }

        BESTIARY_ORDER.forEach((type, i) => {

            if (!Save.isBestiaryUnlocked(type))
                return;

            if (hitRect(getBestiaryCell(i), x, y)) {
                Game.bestiarySelected = type;
                Game.menuView = "bestiaryDetail";
            }

        });

        return;

    }

    if (hitRect(getStartButton(), x, y))
        startGame();

    if (hitRect(getShopButton(), x, y))
        Game.menuView = "shop";

    if (hitRect(getBestiaryButton(), x, y))
        Game.menuView = "bestiary";

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

}

// =====================================
// HUD
// =====================================

function drawHUD() {

    ctx.fillStyle = "white";
    ctx.font = `bold ${ph(0.035)}px Arial`;
    ctx.textAlign = "left";

    ctx.fillText(`Wave: ${Game.wave}`, pw(0.015), ph(0.05));

    const realElapsedSecs = Game.elapsedTime / (1000 * GAME_SPEED);
    const minutes = Math.floor(realElapsedSecs / 60);
    const seconds = Math.floor(realElapsedSecs % 60);
    const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    ctx.fillText(timeText, pw(0.015), ph(0.095));

    const getDashText = (cd) => {
        if (cd <= 0)
            return "READY";
        const realDashSecs = (cd / (1000 * GAME_SPEED)).toFixed(1);
        return `${realDashSecs}s`;
    };

    const dash1 = getDashText(player.dashCooldowns[0]);
    const dash2 = player.getDashSlotCount() >= 2
        ? getDashText(player.dashCooldowns[1])
        : null;

    ctx.fillText(
        dash2
            ? `Dash: ${dash1} | ${dash2}`
            : `Dash: ${dash1}`,
        pw(0.015),
        ph(0.14)
    );

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

    }

}

// =====================================
// Game Over
// =====================================

function drawGameOver() {

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.09)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, ph(0.31));

    ctx.font = `${ph(0.045)}px Arial`;
    ctx.fillText(
        `You were slain by ${Game.killedBy ?? "an unknown enemy"}`,
        canvas.width / 2,
        ph(0.42)
    );

    ctx.fillStyle = "gold";
    ctx.font = `${ph(0.036)}px Arial`;
    ctx.fillText(
        `Total Coins: ${Save.coins}`,
        canvas.width / 2,
        ph(0.5)
    );

    drawButton(getHomeButton(), "RETURN HOME", "lime", "black", ph(0.028));

}