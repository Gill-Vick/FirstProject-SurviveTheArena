// =====================================
// Persistent Save (localStorage)
// =====================================

const SAVE_KEY = "surviveTheArenaSave";

const Save = {

    coins: 0,

    firstBossKilled: false,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false
    },

    load() {

        try {

            const raw = localStorage.getItem(SAVE_KEY);

            if (!raw)
                return;

            const data = JSON.parse(raw);

            this.coins = data.coins ?? 0;
            this.firstBossKilled = !!data.firstBossKilled;

            this.inventory.shield = !!data.inventory?.shield;
            this.inventory.bow = !!data.inventory?.bow;
            this.inventory.wetStone = !!data.inventory?.wetStone;
            this.inventory.hermesShoes = !!data.inventory?.hermesShoes;

        } catch (e) {}

    },

    persist() {

        localStorage.setItem(SAVE_KEY, JSON.stringify({

            coins: this.coins,
            firstBossKilled: this.firstBossKilled,
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

        if (this.owns(itemId))
            return false;

        if (item.requiresFirstBoss && !this.firstBossKilled)
            return false;

        return this.canAfford(item.price);

    },

    purchase(itemId) {

        if (!this.canPurchase(itemId))
            return false;

        const item = SHOP_ITEMS[itemId];

        this.coins -= item.price;
        this.inventory[itemId] = true;
        this.persist();

        return true;

    },

    markFirstBossKilled() {

        if (this.firstBossKilled)
            return;

        this.firstBossKilled = true;
        this.persist();

    }

};

Save.load();
