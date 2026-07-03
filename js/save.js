// =====================================
// Persistent Save (localStorage)
// =====================================

const SAVE_KEY = "surviveTheArenaSave";

const Save = {

    coins: 0,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false
    },

    load() {

        try {

            const raw = localStorage.getItem(SAVE_KEY);

            if (!raw)
                return;

            const data = JSON.parse(raw);

            this.coins = data.coins ?? 0;

            this.inventory.shield = !!data.inventory?.shield;
            this.inventory.bow = !!data.inventory?.bow;
            this.inventory.wetStone = !!data.inventory?.wetStone;

        } catch (e) {}

    },

    persist() {

        localStorage.setItem(SAVE_KEY, JSON.stringify({

            coins: this.coins,

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

    purchase(itemId) {

        const item = SHOP_ITEMS[itemId];

        if (!item)
            return false;

        if (this.owns(itemId))
            return false;

        if (!this.canAfford(item.price))
            return false;

        this.coins -= item.price;

        this.inventory[itemId] = true;

        this.persist();

        return true;

    }

};

Save.load();
