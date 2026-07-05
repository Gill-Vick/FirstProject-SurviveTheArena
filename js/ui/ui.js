// =====================================
// Buttons
// =====================================

const startButton = {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 - 30,
    width: 220,
    height: 60
};

const shopButton = {
    x: canvas.width / 2 - 110,
    y: canvas.height / 2 + 50,
    width: 220,
    height: 60
};

const shopBackButton = {
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

const SHOP_ROW_HEIGHT = 88;
const SHOP_ROW_START = 160;
const SHOP_BUY_WIDTH = 120;
const SHOP_BUY_HEIGHT = 44;

function getShopBuyButton(index) {

    return {
        x: canvas.width - SHOP_BUY_WIDTH - 60,
        y: SHOP_ROW_START + index * SHOP_ROW_HEIGHT,
        width: SHOP_BUY_WIDTH,
        height: SHOP_BUY_HEIGHT
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

function drawButton(btn, label, fill, textColor) {

    ctx.fillStyle = fill;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    ctx.fillStyle = textColor;
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        label,
        btn.x + btn.width / 2,
        btn.y + btn.height / 2 + 10
    );

}

function drawCoinDisplay(x, y, size) {

    ctx.fillStyle = "gold";
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(`Coins: ${Save.coins}`, x, y);

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
    ctx.fillText("SURVIVE THE ARENA", canvas.width / 2, 140);

    drawCoinDisplay(canvas.width - 220, 50, 32);

    if (Game.menuView === "shop") {
        drawShop();
        return;
    }

    drawButton(startButton, "START", "lime", "black");
    drawButton(shopButton, "SHOP", "#c9a227", "black");

}

function drawShop() {

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("SHOP", canvas.width / 2, 120);

    drawButton(shopBackButton, "BACK", "#555", "white");

    const ids = ["shield", "bow", "wetStone", "circleStrike", "hermesShoes", "kingsBlade", "critRate"];

    ids.forEach((id, i) => {

        const item = SHOP_ITEMS[id];
        const rowY = SHOP_ROW_START + i * SHOP_ROW_HEIGHT;
        const buyBtn = getShopBuyButton(i);
        const owned = !item.repeatable && Save.owns(id);

        const locked =
            (item.requiresFirstBoss && !Save.firstBossKilled) ||
            (item.requiresKingKilled && !Save.kingKilled);

        const lockedMessage = item.requiresKingKilled
            ? "Defeat the King"
            : "Defeat Wave 5 Boss";

        const canBuy = Save.canPurchase(id);

        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(50, rowY - 8, canvas.width - 100, SHOP_ROW_HEIGHT - 12);

        ctx.fillStyle = "white";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "left";
        ctx.fillText(item.name, 70, rowY + 18);

        ctx.font = "18px Arial";
        ctx.fillStyle = "#ccc";
        ctx.fillText(item.desc, 70, rowY + 42);

        ctx.fillStyle = "gold";
        ctx.font = "20px Arial";
        ctx.fillText(`${item.price} coins`, 70, rowY + 64);

        if (item.repeatable) {

            const currentRate = Math.round(Save.getCritChance() * 100);

            ctx.fillStyle = "#4da6ff";
            ctx.font = "16px Arial";
            ctx.fillText(`Current Crit Rate: ${currentRate}%`, 70, rowY + 80);

        }

        const maxed =
            item.repeatable &&
            id === "critRate" &&
            Save.getCritChance() >= CRIT.MAX;

        if (owned) {

            drawButton(buyBtn, "OWNED", "#444", "#aaa");

        } else if (maxed) {

            drawButton(buyBtn, "MAXED", "#444", "#aaa");

        } else if (locked) {

            drawButton(buyBtn, "LOCKED", "#333", "#666");
            ctx.fillStyle = "#888";
            ctx.font = "16px Arial";
            ctx.fillText(lockedMessage, 70, rowY + 78);

        } else if (canBuy) {

            drawButton(buyBtn, "BUY", "lime", "black");

        } else {

            drawButton(buyBtn, "BUY", "#663333", "#888");

        }

    });

}

function handleMenuClick(x, y) {

    if (Game.menuView === "shop") {

        if (hitRect(shopBackButton, x, y)) {
            Game.menuView = "main";
            return;
        }

        const ids = ["shield", "bow", "wetStone", "circleStrike", "hermesShoes", "kingsBlade", "critRate"];

        ids.forEach((id, i) => {

            if (hitRect(getShopBuyButton(i), x, y))
                Save.purchase(id);

        });

        return;

    }

    if (hitRect(startButton, x, y))
        startGame();

    if (hitRect(shopButton, x, y))
        Game.menuView = "shop";

}

// =====================================
// HUD
// =====================================

function drawHUD() {

    ctx.fillStyle = "white";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "left";

    ctx.fillText(`Wave: ${Game.wave}`, 20, 40);

    const dash1 = player.dashCooldowns[0] <= 0 ? "READY" : "CD";
    const dash2 = Save.inventory.hermesShoes
        ? (player.dashCooldowns[1] <= 0 ? "READY" : "CD")
        : null;

    ctx.fillText(
        dash2
            ? `Dash: ${dash1} | ${dash2}`
            : `Dash: ${dash1}`,
        20,
        80
    );

    drawCoinDisplay(20, 120, 26);

    let nextLineY = 160;

    if (Save.inventory.bow) {

        ctx.fillStyle = "white";
        
        let bowText = "READY [E]";
        if (player.bowCooldown > 0) {
            // Adjust cooldown timeline by dividing by GAME_SPEED to reveal physical human time left
            const realBowSecs = (player.bowCooldown / (1000 * GAME_SPEED)).toFixed(1);
            bowText = `${realBowSecs}s`;
        }

        ctx.fillText(`Bow: ${bowText}`, 20, nextLineY);
        nextLineY += 40;

    }

    if (Save.inventory.kingsBlade) {

        ctx.fillStyle = "white";

        let kbText = "READY [RMB]";
        if (player.kingsBladeCooldown > 0) {
            // Adjust cooldown timeline by dividing by GAME_SPEED to reveal physical human time left
            const realKbSecs = (player.kingsBladeCooldown / (1000 * GAME_SPEED)).toFixed(1);
            kbText = `${realKbSecs}s`;
        }

        ctx.fillText(`King's Blade: ${kbText}`, 20, nextLineY);
        nextLineY += 40;

    }

    if (Save.inventory.shield) {

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