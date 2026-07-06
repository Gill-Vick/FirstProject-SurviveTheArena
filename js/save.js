// =====================================
// Persistent Save (localStorage)
// =====================================

const SAVE_KEY = "surviveTheArenaSave";

const Save = {

    coins: 0,

    firstBossKilled: false,

    kingKilled: false,

    critRateLevel: 0,

    equippedCritLevel: 0,

    bowStage: 0,

    equippedBowStage: 0,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        kingsBlade: false
    },

    equipped: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        kingsBlade: false
    },

    bestiaryUnlocked: {},

    load() {

        try {

            const raw = localStorage.getItem(SAVE_KEY);

            if (!raw)
                return;

            const data = JSON.parse(raw);

            this.coins = data.coins ?? 0;
            this.firstBossKilled = !!data.firstBossKilled;
            this.kingKilled = !!data.kingKilled;
            this.critRateLevel = data.critRateLevel ?? 0;
            this.equippedCritLevel = data.equippedCritLevel ?? this.critRateLevel;
            this.bowStage = data.bowStage ?? 0;
            this.equippedBowStage = data.equippedBowStage ?? this.bowStage;

            this.inventory.shield = !!data.inventory?.shield;
            this.inventory.bow = !!data.inventory?.bow;
            this.inventory.wetStone = !!data.inventory?.wetStone;
            this.inventory.hermesShoes = !!data.inventory?.hermesShoes;
            this.inventory.circleStrike = !!data.inventory?.circleStrike;
            this.inventory.kingsBlade = !!data.inventory?.kingsBlade;

            this.equipped.shield = !!data.equipped?.shield;
            this.equipped.bow = !!data.equipped?.bow;
            this.equipped.wetStone = !!data.equipped?.wetStone;
            this.equipped.hermesShoes = !!data.equipped?.hermesShoes;
            this.equipped.circleStrike = !!data.equipped?.circleStrike;
            this.equipped.kingsBlade = !!data.equipped?.kingsBlade;

            this.bestiaryUnlocked = { ...(data.bestiaryUnlocked ?? {}) };

        } catch (e) {}

    },

    persist() {

        localStorage.setItem(SAVE_KEY, JSON.stringify({

            coins: this.coins,
            firstBossKilled: this.firstBossKilled,
            kingKilled: this.kingKilled,
            critRateLevel: this.critRateLevel,
            equippedCritLevel: this.equippedCritLevel,
            bowStage: this.bowStage,
            equippedBowStage: this.equippedBowStage,
            inventory: { ...this.inventory },
            equipped: { ...this.equipped },
            bestiaryUnlocked: { ...this.bestiaryUnlocked }

        }));

    },

    addCoins(amount) {

        this.coins += amount;
        this.persist();

    },

    canAfford(price) {

        return this.coins >= price;

    },

    owns(itemId) {

        if (itemId === "bow")
            return this.bowStage >= 1;

        return !!this.inventory[itemId];

    },

    isEquipped(itemId) {

        if (itemId === "bow")
            return this.bowStage >= 1 && this.equipped.bow;

        return !!this.inventory[itemId] && !!this.equipped[itemId];

    },

    toggleEquip(itemId) {

        const item = SHOP_ITEMS[itemId];

        if (!item?.equippable || !this.owns(itemId))
            return;

        this.equipped[itemId] = !this.equipped[itemId];
        this.persist();

    },

    getBowArrowCount() {

        if (!this.isEquipped("bow"))
            return 0;

        return Math.max(1, this.equippedBowStage);

    },

    getPurchaseBlockReason(itemId) {

        const item = SHOP_ITEMS[itemId];

        if (!item)
            return null;

        if (item.requiresFirstBoss && !this.firstBossKilled)
            return "Defeat Castle Guard";

        if (item.requiresKingKilled && !this.kingKilled)
            return "Defeat the King";

        if (itemId === "bow" && this.bowStage >= 3)
            return "Maxed out";

        if (!item.repeatable && itemId !== "bow" && this.owns(itemId))
            return null;

        if (item.repeatable && itemId === "critRate" && this.getCritChance() >= CRIT.MAX)
            return "Maxed out";

        if (!this.canAfford(item.price))
            return "Not enough coins";

        return null;

    },

    canPurchase(itemId) {

        const item = SHOP_ITEMS[itemId];

        if (!item)
            return false;

        if (this.getPurchaseBlockReason(itemId))
            return false;

        if (item.repeatable || itemId === "bow")
            return true;

        if (this.owns(itemId))
            return false;

        return true;

    },

    purchase(itemId) {

        if (!this.canPurchase(itemId))
            return false;

        const item = SHOP_ITEMS[itemId];

        this.coins -= item.price;

        if (item.repeatable) {

            this.critRateLevel++;

            if (this.equippedCritLevel < this.critRateLevel)
                this.equippedCritLevel = this.critRateLevel;

        } else if (itemId === "bow") {

            this.bowStage++;
            this.equippedBowStage = this.bowStage;
            this.inventory.bow = true;
            this.equipped.bow = true;

        } else {

            this.inventory[itemId] = true;
            this.equipped[itemId] = true;

        }

        this.persist();

        return true;

    },

    setEquippedBowStage(stage) {

        this.equippedBowStage = Math.max(
            1,
            Math.min(this.bowStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedCritLevel(level) {

        this.equippedCritLevel = Math.max(
            0,
            Math.min(this.critRateLevel, Math.floor(level))
        );

        this.persist();

    },

    getCritChance() {

        return Math.min(
            CRIT.MAX,
            CRIT.BASE + this.critRateLevel * CRIT.PER_UPGRADE
        );

    },

    getEquippedCritChance() {

        return Math.min(
            CRIT.MAX,
            CRIT.BASE + this.equippedCritLevel * CRIT.PER_UPGRADE
        );

    },

    markFirstBossKilled() {

        if (this.firstBossKilled)
            return;

        this.firstBossKilled = true;
        this.persist();

    },

    markKingKilled() {

        if (this.kingKilled)
            return;

        this.kingKilled = true;
        this.persist();

    },

    isBestiaryUnlocked(type) {

        return !!this.bestiaryUnlocked[type];

    },

    markBestiaryKill(type) {

        if (this.bestiaryUnlocked[type])
            return;

        this.bestiaryUnlocked[type] = true;
        this.persist();

    }

};

Save.load();