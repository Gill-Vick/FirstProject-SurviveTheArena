// =====================================
// Persistent Save (localStorage)
// =====================================

const SAVE_KEY = "surviveTheArenaSave";

const Save = {

    coins: 0,

    firstBossKilled: false,

    kingKilled: false,

    critRateLevel: 0,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        kingsBlade: false
    },

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

            this.inventory.shield = !!data.inventory?.shield;
            this.inventory.bow = !!data.inventory?.bow;
            this.inventory.wetStone = !!data.inventory?.wetStone;
            this.inventory.hermesShoes = !!data.inventory?.hermesShoes;
            this.inventory.circleStrike = !!data.inventory?.circleStrike;
            this.inventory.kingsBlade = !!data.inventory?.kingsBlade;

        } catch (e) {}

    },

    persist() {

        localStorage.setItem(SAVE_KEY, JSON.stringify({

            coins: this.coins,
            firstBossKilled: this.firstBossKilled,
            kingKilled: this.kingKilled,
            critRateLevel: this.critRateLevel,
            inventory: { ...this.inventory }

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

        return !!this.inventory[itemId];

    },

    canPurchase(itemId) {

        const item = SHOP_ITEMS[itemId];

        if (!item)
            return false;

        // Repeatable items (currently just critRate) have no
        // "owned" state to block against - only affordability,
        // and (for crit rate specifically) a hard cap at 100%.
        if (item.repeatable) {

            if (itemId === "critRate" && this.getCritChance() >= CRIT.MAX)
                return false;

            return this.canAfford(item.price);

        }

        if (this.owns(itemId))
            return false;

        if (item.requiresFirstBoss && !this.firstBossKilled)
            return false;

        if (item.requiresKingKilled && !this.kingKilled)
            return false;

        return this.canAfford(item.price);

    },

    purchase(itemId) {

        if (!this.canPurchase(itemId))
            return false;

        const item = SHOP_ITEMS[itemId];

        this.coins -= item.price;

        if (item.repeatable)
            this.critRateLevel++;
        else
            this.inventory[itemId] = true;

        this.persist();

        return true;

    },

    getCritChance() {

        return Math.min(
            CRIT.MAX,
            CRIT.BASE + this.critRateLevel * CRIT.PER_UPGRADE
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

    }

};

Save.load();