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
    "shield", "bow",
    "wetStone", "circleStrike", "hermesShoes", "kingsBlade", "critRate"
];

// =====================================
// Shop Row Layout
// =====================================

function getShopRowMetrics() {

    return {
        rowHeight: ph(0.095),
        rowStart: ph(0.17),
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

function getShopBowSlider(index) {

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    return {
        x: marginX + pw(0.19),
        y: rowStart + index * rowHeight + ph(0.045),
        width: pw(0.09),
        height: ph(0.028)
    };

}

function getShopShieldSlider(index) {

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    return {
        x: marginX + pw(0.19),
        y: rowStart + index * rowHeight + ph(0.045),
        width: pw(0.06),
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

function drawBowStageIndicator(slider) {

    const currentStage = Save.equippedBowStage;
    const labels = ["1", "2", "3"];

    const segW = slider.width / 3;
    const boxW = segW * 0.85;
    const fontSize = slider.height * 0.65;

    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";

    for (let s = 1; s <= 3; s++) {

        const segX = slider.x + (s - 1) * segW;

        ctx.fillStyle = s === currentStage ? "#c9a227" : "#444";
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

function bowStageFromSliderX(slider, x) {

    const relativeX = x - slider.x;
    const segW = slider.width / 3;

    if (relativeX < segW) return 1;
    if (relativeX < segW * 2) return 2;
    return 3;

}

// Visual stage indicator for shifting between Wooden (W) and Onyx (O) shields
function drawShieldStageIndicator(slider) {

    const currentStage = Save.equippedShieldStage ?? 1;
    const labels = ["W", "O"];

    const segW = slider.width / 2;
    const boxW = segW * 0.85;
    const fontSize = slider.height * 0.65;

    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";

    for (let s = 1; s <= 2; s++) {

        const segX = slider.x + (s - 1) * segW;

        ctx.fillStyle = s === currentStage ? "#4da6ff" : "#444";
        ctx.fillRect(segX, slider.y, boxW, slider.height);

        ctx.fillStyle = s === currentStage ? "black" : "#aaa";
        ctx.fillText(labels[s - 1], segX + boxW / 2, slider.y + slider.height * 0.72);

        if (s < 2) {

            ctx.fillStyle = "#888";
            ctx.font = `${fontSize * 0.75}px Arial`;
            ctx.fillText("→", segX + segW * 0.95, slider.y + slider.height * 0.72);
            ctx.font = `${fontSize}px Arial`;

        }

    }

}

// Processes user X coordinate input on the shield slider segment
function shieldStageFromSliderX(slider, x) {

    const relativeX = x - slider.x;
    const segW = slider.width / 2;

    if (relativeX < segW) return 1;
    return 2;

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

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.09)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("SURVIVE THE ARENA", canvas.width / 2, ph(0.16));

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
    drawButton(getShopButton(), "SHOP", "#c9a227", "black", btnFont);
    drawButton(getBestiaryButton(), "BESTIARY", "#8B4513", "white", btnFont);

}

function drawShop() {

    ctx.fillStyle = "white";
    ctx.font = `${ph(0.06)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("SHOP", canvas.width / 2, ph(0.14));

    drawButton(getShopBackButton(), "BACK", "#555", "white", ph(0.024));

    const { rowHeight, rowStart, marginX } = getShopRowMetrics();

    SHOP_ITEM_IDS.forEach((id, i) => {

        const item = SHOP_ITEMS[id];
        const rowY = rowStart + i * rowHeight;
        const buyBtn = getShopBuyButton(i);
        const equipBtn = getShopEquipButton(i);

        const owned = id === "bow" ? Save.bowStage >= 3 : (id === "shield" ? Save.shieldStage >= 2 : (!item.repeatable && Save.owns(id)));
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
        if (id === "bow" && Save.bowStage >= 3) {
            ctx.fillText("Max level reached", marginX + pw(0.015), rowY + ph(0.065));
        } else if (id === "shield" && Save.shieldStage >= 2) {
            ctx.fillText("Max level reached", marginX + pw(0.015), rowY + ph(0.065));
        } else {
            ctx.fillText(`${item.price} coins`, marginX + pw(0.015), rowY + ph(0.065));
        }

        if (id === "bow") {
            const slider = getShopBowSlider(i);
            drawBowStageIndicator(slider);
        }

        if (id === "shield" && Save.shieldStage >= 1) {
            const slider = getShopShieldSlider(i);
            drawShieldStageIndicator(slider);
        }

        if (item.repeatable) {

            const slider = getShopCritSlider(i);
            drawCritSlider(slider, Save.equippedCritLevel, Save.critRateLevel);

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
            (id === "bow" && Save.bowStage >= 3) ||
            (id === "shield" && Save.shieldStage >= 2);

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

        SHOP_ITEM_IDS.forEach((id, i) => {

            const item = SHOP_ITEMS[id];

            if (item.equippable && Save.owns(id) && hitRect(getShopEquipButton(i), x, y))
                Save.toggleEquip(id);

            if (hitRect(getShopBuyButton(i), x, y))
                Save.purchase(id);

            if (id === "bow" && hitRect(getShopBowSlider(i), x, y)) {
                Save.setEquippedBowStage(bowStageFromSliderX(getShopBowSlider(i), x));
            }

            if (id === "shield" && Save.shieldStage >= 1 && hitRect(getShopShieldSlider(i), x, y)) {
                const targetStage = shieldStageFromSliderX(getShopShieldSlider(i), x);
                Save.setEquippedShieldStage(targetStage);
            }

            if (item.repeatable && hitRect(getShopCritSlider(i), x, y))
                Save.setEquippedCritLevel(critLevelFromSliderX(getShopCritSlider(i), x));

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

    if (Game.shopCritDragging) {
        const critIndex = SHOP_ITEM_IDS.indexOf("critRate");
        if (critIndex >= 0) {
            Save.setEquippedCritLevel(
                critLevelFromSliderX(getShopCritSlider(critIndex), x)
            );
        }
    }

    if (Game.shopBowDragging) {
        const bowIndex = SHOP_ITEM_IDS.indexOf("bow");
        if (bowIndex >= 0) {
            Save.setEquippedBowStage(
                bowStageFromSliderX(getShopBowSlider(bowIndex), x)
            );
        }
    }

    if (Game.shopShieldDragging) {
        const shieldIndex = SHOP_ITEM_IDS.indexOf("shield");
        if (shieldIndex >= 0) {
            const targetStage = shieldStageFromSliderX(getShopShieldSlider(shieldIndex), x);
            Save.setEquippedShieldStage(targetStage);
        }
    }

}

function handleMenuMouseDown(x, y) {

    if (Game.menuView !== "shop")
        return;

    const critIndex = SHOP_ITEM_IDS.indexOf("critRate");
    if (critIndex >= 0 && hitRect(getShopCritSlider(critIndex), x, y)) {
        Game.shopCritDragging = true;
    }

    const bowIndex = SHOP_ITEM_IDS.indexOf("bow");
    if (bowIndex >= 0 && hitRect(getShopBowSlider(bowIndex), x, y)) {
        Game.shopBowDragging = true;
    }

    const shieldIndex = SHOP_ITEM_IDS.indexOf("shield");
    if (shieldIndex >= 0 && Save.shieldStage >= 1 && hitRect(getShopShieldSlider(shieldIndex), x, y)) {
        Game.shopShieldDragging = true;
    }

}

function handleMenuMouseUp() {

    Game.shopCritDragging = false;
    Game.shopBowDragging = false;
    Game.shopShieldDragging = false;

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
    const dash2 = Save.isEquipped("hermesShoes")
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

    if (Save.isEquipped("bow")) {

        ctx.fillStyle = "white";
        ctx.font = `bold ${ph(0.035)}px Arial`;

        let bowText = "READY [E]";
        if (player.bowCooldown > 0) {
            const realBowSecs = (player.bowCooldown / (1000 * GAME_SPEED)).toFixed(1);
            bowText = `${realBowSecs}s`;
        }

        const arrows = Save.getBowArrowCount();
        ctx.fillText(`Bow (${arrows}): ${bowText}`, pw(0.015), nextLineY);
        nextLineY += lineStep;

    }

    if (Save.isEquipped("kingsBlade")) {

        ctx.fillStyle = "white";
        ctx.font = `bold ${ph(0.035)}px Arial`;

        let kbText = "READY [RMB]";
        if (player.kingsBladeCooldown > 0) {
            const realKbSecs = (player.kingsBladeCooldown / (1000 * GAME_SPEED)).toFixed(1);
            kbText = `${realKbSecs}s`;
        }

        ctx.fillText(`King's Blade: ${kbText}`, pw(0.015), nextLineY);
        nextLineY += lineStep;

    }

    if (Save.isEquipped("shield")) {

        ctx.font = `bold ${ph(0.035)}px Arial`;

        const displayLabel = (Save.equippedShieldStage === 2) ? "Onyx Shield" : "Shield";
        ctx.fillStyle = player.shieldActive ? ((Save.equippedShieldStage === 2) ? "#b533ff" : "#44ffda") : "#666";
        ctx.fillText(
            `${displayLabel}: ${player.shieldActive ? "ACTIVE" : "USED"}`,
            pw(0.015),
            nextLineY
        );

    }

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