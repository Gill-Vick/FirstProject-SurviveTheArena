// =====================================
// Buttons
// =====================================

const startButton = {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 - 60,
    width: 220,
    height: 60
};

const shopButton = {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 + 20,
    width: 220,
    height: 60
};

const bestiaryButton = {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 + 100,
    width: 220,
    height: 60
};

const shopBackButton = {
    x: 40,
    y: 40,
    width: 140,
    height: 50
};

const bestiaryBackButton = {
    x: 40,
    y: 40,
    width: 140,
    height: 50
};

const homeButton = {
    x: canvas.width / 2 - 100,
    y: canvas.height / 2 + 100,
    width: 200,
    height: 70
};

const SHOP_ITEM_IDS = [
    "shield", "bow",
    "wetStone", "circleStrike", "hermesShoes", "kingsBlade", "critRate"
];

const SHOP_ROW_HEIGHT = 78;
const SHOP_ROW_START = 130;
const SHOP_BTN_WIDTH = 110;
const SHOP_BTN_HEIGHT = 36;

const BESTIARY_COLS = 5;
const BESTIARY_CELL = 110;
const BESTIARY_GRID_X = 80;
const BESTIARY_GRID_Y = 200;

function getShopBuyButton(index) {

    return {
        x: canvas.width - SHOP_BTN_WIDTH - 50,
        y: SHOP_ROW_START + index * SHOP_ROW_HEIGHT + 18,
        width: SHOP_BTN_WIDTH,
        height: SHOP_BTN_HEIGHT
    };

}

function getShopEquipButton(index) {

    return {
        x: canvas.width - SHOP_BTN_WIDTH * 2 - 70,
        y: SHOP_ROW_START + index * SHOP_ROW_HEIGHT + 18,
        width: SHOP_BTN_WIDTH,
        height: SHOP_BTN_HEIGHT
    };

}

function getShopCritSlider(index) {

    return {
        x: 70,
        y: SHOP_ROW_START + index * SHOP_ROW_HEIGHT + 58,
        width: 220,
        height: 16
    };

}

function getShopBowSlider(index) {

    return {
        x: 280,
        y: SHOP_ROW_START + index * SHOP_ROW_HEIGHT + 38,
        width: 102,
        height: 22
    };

}

function getBestiaryCell(index) {

    const col = index % BESTIARY_COLS;
    const row = Math.floor(index / BESTIARY_COLS);

    return {
        x: BESTIARY_GRID_X + col * (BESTIARY_CELL + 16),
        y: BESTIARY_GRID_Y + row * (BESTIARY_CELL + 20),
        width: BESTIARY_CELL,
        height: BESTIARY_CELL
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

    ctx.fillStyle = fill;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    ctx.fillStyle = textColor;
    ctx.font = `${fontSize ?? 22}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
        label,
        btn.x + btn.width / 2,
        btn.y + btn.height / 2 + 8
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
    const labels = ["", "1", "2", "3"];

    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    for (let s = 1; s <= 3; s++) {

        const cx = slider.x + (s - 1) * 36;

        ctx.fillStyle = s === currentStage ? "#c9a227" : "#444";
        ctx.fillRect(cx, slider.y, 28, 22);

        ctx.fillStyle = s === currentStage ? "black" : "#aaa";
        ctx.fillText(labels[s], cx + 14, slider.y + 16);

        if (s < 3) {

            ctx.fillStyle = "#888";
            ctx.fillText("→", cx + 32, slider.y + 16);

        }

    }

}

function bowStageFromSliderX(slider, x) {

    // Center point divisions for 3 discrete columns (1, 2, 3) inside the 102px width
    const relativeX = x - slider.x;

    if (relativeX < 34) return 1;
    if (relativeX < 68) return 2;
    return 3;

}

function drawCritSlider(slider, value, maxLevel) {

    ctx.fillStyle = "#333";
    ctx.fillRect(slider.x, slider.y, slider.width, slider.height);

    const pct = maxLevel > 0 ? value / maxLevel : 0;

    ctx.fillStyle = "#4da6ff";
    ctx.fillRect(slider.x, slider.y, slider.width * pct, slider.height);

    const knobX = slider.x + slider.width * pct;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(knobX, slider.y + slider.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    const equippedPct = Math.round(Save.getEquippedCritChance() * 100);
    const maxPct = Math.round(Save.getCritChance() * 100);

    ctx.fillStyle = "#4da6ff";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
        `Equipped: ${equippedPct}%  (owned up to ${maxPct}%)`,
        slider.x + slider.width + 12,
        slider.y + 13
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
    ctx.font = "80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SURVIVE THE ARENA", canvas.width / 2, 120);

    drawCoinDisplay(canvas.width - 220, 50, 32);

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

    drawButton(startButton, "START", "lime", "black");
    drawButton(shopButton, "SHOP", "#c9a227", "black");
    drawButton(bestiaryButton, "BESTIARY", "#8B4513", "white");

}

function drawShop() {

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SHOP", canvas.width / 2, 100);

    drawButton(shopBackButton, "BACK", "#555", "white");

    SHOP_ITEM_IDS.forEach((id, i) => {

        const item = SHOP_ITEMS[id];
        const rowY = SHOP_ROW_START + i * SHOP_ROW_HEIGHT;
        const buyBtn = getShopBuyButton(i);
        const equipBtn = getShopEquipButton(i);
        const owned = id === "bow" ? Save.bowStage >= 3 : (!item.repeatable && Save.owns(id));
        const blockReason = Save.getPurchaseBlockReason(id);
        const canBuy = Save.canPurchase(id);

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(50, rowY - 6, canvas.width - 100, SHOP_ROW_HEIGHT - 8);

        ctx.fillStyle = "white";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "left";
        ctx.fillText(item.name, 70, rowY + 16);

        ctx.font = "16px Arial";
        ctx.fillStyle = "#ccc";
        ctx.fillText(item.desc, 70, rowY + 36);

        ctx.fillStyle = "gold";
        ctx.font = "16px Arial";
        if (id === "bow" && Save.bowStage >= 3) {
            ctx.fillText("Max level reached", 70, rowY + 54);
        } else {
            ctx.fillText(`${item.price} coins`, 70, rowY + 54);
        }

        if (id === "bow") {
            const slider = getShopBowSlider(i);
            drawBowStageIndicator(slider);
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
                18
            );

        }

        const maxed =
            (item.repeatable && id === "critRate" && Save.getCritChance() >= CRIT.MAX) ||
            (id === "bow" && Save.bowStage >= 3);

        if (owned) {

            drawButton(buyBtn, "OWNED", "#444", "#aaa", 18);

        } else if (maxed) {

            drawButton(buyBtn, "MAXED", "#444", "#aaa", 18);

        } else if (blockReason) {

            drawButton(buyBtn, blockReason, "#333", "#ccc", 14);

        } else if (canBuy) {

            drawButton(buyBtn, "BUY", "lime", "black", 18);

        } else {

            drawButton(buyBtn, "BUY", "#663333", "#888", 18);

        }

    });

}

function drawEnemyPreview(type, x, y, w, h, unlocked) {

    const entry = BESTIARY[type];

    ctx.save();

    if (entry.isBoss) {

        ctx.strokeStyle = "gold";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

    }

    if (!unlocked) {

        ctx.fillStyle = "#444";
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        ctx.fillStyle = "#888";
        ctx.font = "bold 48px Arial";
        ctx.textAlign = "center";
        ctx.fillText("?", x + w / 2, y + h / 2 + 16);

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

    ctx.fillStyle = "#5c4033";
    ctx.fillRect(60, 80, canvas.width - 120, canvas.height - 140);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 80, canvas.width - 120, canvas.height - 140);

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BESTIARY", canvas.width / 2, 130);

    drawButton(bestiaryBackButton, "BACK", "#555", "white");

    BESTIARY_ORDER.forEach((type, i) => {

        const cell = getBestiaryCell(i);
        const entry = BESTIARY[type];
        const unlocked = Save.isBestiaryUnlocked(type);

        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(cell.x - 4, cell.y - 4, cell.width + 8, cell.height + 28);

        drawEnemyPreview(type, cell.x, cell.y, cell.width, cell.height, unlocked);

        ctx.fillStyle = unlocked ? "white" : "#666";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            unlocked ? entry.name : "???",
            cell.x + cell.width / 2,
            cell.y + cell.height + 18
        );

    });

}

function drawBestiaryDetail() {

    const type = Game.bestiarySelected;
    const entry = BESTIARY[type];

    if (!entry)
        return;

    ctx.fillStyle = "#5c4033";
    ctx.fillRect(60, 80, canvas.width - 120, canvas.height - 140);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 80, canvas.width - 120, canvas.height - 140);

    drawButton(bestiaryBackButton, "BACK", "#555", "white");

    const previewX = 120;
    const previewY = 160;
    const previewSize = 180;

    drawEnemyPreview(type, previewX, previewY, previewSize, previewSize, true);

    ctx.fillStyle = entry.isBoss ? "gold" : "white";
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "left";
    ctx.fillText(entry.name, previewX + previewSize + 40, 200);

    ctx.fillStyle = "#ccc";
    ctx.font = "22px Arial";
    ctx.fillText(entry.desc, previewX + previewSize + 40, 250);

    ctx.fillStyle = "#aaa";
    ctx.font = "20px Arial";
    ctx.fillText(`Behavior: ${entry.behavior}`, previewX + previewSize + 40, 290);

    const wave1Hp = entry.hpAtWave(1);
    const wave5Hp = entry.hpAtWave(5);
    const wave10Hp = entry.hpAtWave(10);
    const speed1 = (entry.baseSpeed * (1 + 0 * 0.08)).toFixed(1);
    const speed5 = (entry.baseSpeed * (1 + 4 * 0.08)).toFixed(1);
    const speed10 = (entry.baseSpeed * (1 + 9 * 0.08)).toFixed(1);

    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.fillText("Stats", previewX + previewSize + 40, 350);

    ctx.fillStyle = "#ddd";
    ctx.font = "20px Arial";
    ctx.fillText(`HP scaling: ${entry.hpScale}`, previewX + previewSize + 40, 385);
    ctx.fillText(`Wave 1 HP: ${wave1Hp}   Wave 5: ${wave5Hp}   Wave 10: ${wave10Hp}`, previewX + previewSize + 40, 415);
    ctx.fillText(`Base speed: ${entry.baseSpeed} (+8% per wave)`, previewX + previewSize + 40, 445);
    ctx.fillText(`Speed W1: ${speed1}   W5: ${speed5}   W10: ${speed10}`, previewX + previewSize + 40, 475);

}

function handleMenuClick(x, y) {

    if (Game.menuView === "shop") {

        if (hitRect(shopBackButton, x, y)) {
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

            if (item.repeatable && hitRect(getShopCritSlider(i), x, y))
                Save.setEquippedCritLevel(critLevelFromSliderX(getShopCritSlider(i), x));

        });

        return;

    }

    if (Game.menuView === "bestiaryDetail") {

        if (hitRect(bestiaryBackButton, x, y))
            Game.menuView = "bestiary";

        return;

    }

    if (Game.menuView === "bestiary") {

        if (hitRect(bestiaryBackButton, x, y)) {
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

    if (hitRect(startButton, x, y))
        startGame();

    if (hitRect(shopButton, x, y))
        Game.menuView = "shop";

    if (hitRect(bestiaryButton, x, y))
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

}

function handleMenuMouseUp() {

    Game.shopCritDragging = false;
    Game.shopBowDragging = false;

}

// =====================================
// HUD
// =====================================

function drawHUD() {

    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "left";

    ctx.fillText(`Wave: ${Game.wave}`, 20, 40);

    const realElapsedSecs = Game.elapsedTime / (1000 * GAME_SPEED);
    const minutes = Math.floor(realElapsedSecs / 60);
    const seconds = Math.floor(realElapsedSecs % 60);
    const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    ctx.fillText(timeText, 20, 80);

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
        20,
        120
    );

    drawCoinDisplay(20, 160, 26);

    let nextLineY = 200;

    if (Save.isEquipped("bow")) {

        ctx.fillStyle = "white";

        let bowText = "READY [E]";
        if (player.bowCooldown > 0) {
            const realBowSecs = (player.bowCooldown / (1000 * GAME_SPEED)).toFixed(1);
            bowText = `${realBowSecs}s`;
        }

        const arrows = Save.getBowArrowCount();
        ctx.fillText(`Bow (${arrows}): ${bowText}`, 20, nextLineY);
        nextLineY += 40;

    }

    if (Save.isEquipped("kingsBlade")) {

        ctx.fillStyle = "white";

        let kbText = "READY [RMB]";
        if (player.kingsBladeCooldown > 0) {
            const realKbSecs = (player.kingsBladeCooldown / (1000 * GAME_SPEED)).toFixed(1);
            kbText = `${realKbSecs}s`;
        }

        ctx.fillText(`King's Blade: ${kbText}`, 20, nextLineY);
        nextLineY += 40;

    }

    if (Save.isEquipped("shield")) {

        ctx.fillStyle = player.shieldActive ? "#4da6ff" : "#666";
        ctx.fillText(
            `Shield: ${player.shieldActive ? "ACTIVE" : "USED"}`,
            20,
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
        ctx.font = "60px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(`WAVE ${Game.wave}`, canvas.width / 2, 150);

    }

    if (Game.waveTransition) {

        ctx.textAlign = "center";
        ctx.font = "70px Arial";
        ctx.fillStyle = "gold";
        ctx.fillText("WAVE COMPLETE", canvas.width / 2, canvas.height / 2);

    }

}

// =====================================
// Game Over
// =====================================

function drawGameOver() {

    ctx.fillStyle = "white";
    ctx.font = "80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, 220);

    ctx.font = "40px Arial";
    ctx.fillText(
        `You were slain by ${Game.killedBy ?? "an unknown enemy"}`,
        canvas.width / 2,
        300
    );

    ctx.fillStyle = "gold";
    ctx.font = "32px Arial";
    ctx.fillText(
        `Total Coins: ${Save.coins}`,
        canvas.width / 2,
        360
    );

    drawButton(homeButton, "RETURN HOME", "lime", "black");

}