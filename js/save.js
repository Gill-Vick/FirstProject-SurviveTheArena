// =====================================
// Persistent Save (localStorage)
// =====================================

const SAVE_KEY = "surviveTheArenaSave";

const Save = {

    coins: 0,

    // Class used for the next run - set by the Armoury's
    // class selector arrows (see ui.js), read by startGame().
    selectedClass: "warrior",

    firstBossKilled: false,

    knightKilled: false,

    kingKilled: false,

    critRateLevel: 0,

    equippedCritLevel: 0,

    shieldStage: 0,

    equippedShieldStage: 0,

    bowStage: 0,

    equippedBowStage: 0,

    knightLocketLevel: 0,

    equippedKnightLocketLevel: 0,

    // Ranger staged items - same shape as shield/bow above.
    daggerStage: 0,

    equippedDaggerStage: 0,

    braceletStage: 0,

    equippedBraceletStage: 0,

    // Thief staged items.
    cloakStage: 0,

    equippedCloakStage: 0,

    throwingKnifeStage: 0,

    equippedThrowingKnifeStage: 0,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        berserkerMedallion: false,
        forgeSigil: false,
        kingsBlade: false,
        windrunnerAnklet: false,
        cloak: false,
        dagger: false,
        emberArrows: false,
        falconQuiver: false,
        swiftdrawGloves: false,
        huntersMark: false,
        galeRecurve: false,
        stormpiercer: false,
        bracelet: false,
        throwingKnife: false,
        thiefsWit: false,
        voidEnchant: false,
        masterOfBlade: false,
        serratedBlade: false,
        pocketWatch: false,
        moonlightDaggers: false
    },

    equipped: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        berserkerMedallion: false,
        forgeSigil: false,
        kingsBlade: false,
        windrunnerAnklet: false,
        cloak: false,
        dagger: false,
        emberArrows: false,
        falconQuiver: false,
        swiftdrawGloves: false,
        huntersMark: false,
        galeRecurve: false,
        stormpiercer: false,
        bracelet: false,
        throwingKnife: false,
        thiefsWit: false,
        voidEnchant: false,
        masterOfBlade: false,
        serratedBlade: false,
        pocketWatch: false,
        moonlightDaggers: false
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
            this.knightKilled = !!data.knightKilled;
            this.kingKilled = !!data.kingKilled;
            this.critRateLevel = data.critRateLevel ?? 0;
            this.equippedCritLevel = data.equippedCritLevel ?? this.critRateLevel;
            this.shieldStage = data.shieldStage ?? 0;
            this.equippedShieldStage = data.equippedShieldStage ?? this.shieldStage;
            this.bowStage = data.bowStage ?? 0;
            this.equippedBowStage = data.equippedBowStage ?? this.bowStage;
            this.knightLocketLevel = data.knightLocketLevel ?? 0;
            this.equippedKnightLocketLevel = data.equippedKnightLocketLevel ?? this.knightLocketLevel;
            this.cloakStage = data.cloakStage ?? 0;
            this.equippedCloakStage = data.equippedCloakStage ?? this.cloakStage;
            this.daggerStage = data.daggerStage ?? 0;
            this.equippedDaggerStage = data.equippedDaggerStage ?? this.daggerStage;
            this.throwingKnifeStage = data.throwingKnifeStage ?? 0;
            this.equippedThrowingKnifeStage = data.equippedThrowingKnifeStage ?? this.throwingKnifeStage;
            this.braceletStage = data.braceletStage ?? 0;
            this.equippedBraceletStage = data.equippedBraceletStage ?? this.braceletStage;

            // Saves that predate the class system just fall
            // back to Warrior (the original kit).
            this.selectedClass = CLASSES.some(c => c.id === data.selectedClass)
                ? data.selectedClass
                : "warrior";

            // One flag per item id, looped over the defaults
            // above - new items only need to be added there,
            // and saves that predate an item leave it false.
            Object.keys(this.inventory).forEach(id => {
                this.inventory[id] = !!data.inventory?.[id];
            });

            Object.keys(this.equipped).forEach(id => {
                this.equipped[id] = !!data.equipped?.[id];
            });

            this.bestiaryUnlocked = { ...(data.bestiaryUnlocked ?? {}) };

        } catch (e) {}

    },

    getOnyxShieldActive() {
        return this.equippedShieldStage >= 2;
    },

    persist() {

        localStorage.setItem(SAVE_KEY, JSON.stringify({

            coins: this.coins,
            selectedClass: this.selectedClass,
            firstBossKilled: this.firstBossKilled,
            knightKilled: this.knightKilled,
            kingKilled: this.kingKilled,
            critRateLevel: this.critRateLevel,
            equippedCritLevel: this.equippedCritLevel,
            shieldStage: this.shieldStage,
            equippedShieldStage: this.equippedShieldStage,
            bowStage: this.bowStage,
            equippedBowStage: this.equippedBowStage,
            knightLocketLevel: this.knightLocketLevel,
            equippedKnightLocketLevel: this.equippedKnightLocketLevel,
            cloakStage: this.cloakStage,
            equippedCloakStage: this.equippedCloakStage,
            daggerStage: this.daggerStage,
            equippedDaggerStage: this.equippedDaggerStage,
            throwingKnifeStage: this.throwingKnifeStage,
            equippedThrowingKnifeStage: this.equippedThrowingKnifeStage,
            braceletStage: this.braceletStage,
            equippedBraceletStage: this.equippedBraceletStage,
            inventory: { ...this.inventory },
            equipped: { ...this.equipped },
            bestiaryUnlocked: { ...this.bestiaryUnlocked }

        }));

    },

    addCoins(amount) {

        this.coins += amount;
        this.persist();

    },

    setSelectedClass(classId) {

        if (!CLASSES.some(c => c.id === classId))
            return;

        this.selectedClass = classId;
        this.persist();

    },

    // =====================================
    // Staged Items (shield/bow/cloak/dagger/throwingKnife)
    // =====================================
    //
    // Generic accessors for every STAGED_ITEM_IDS entry, so
    // ui.js/purchase logic don't need a hardcoded branch per
    // staged item.

    getStage(itemId) {

        if (itemId === "bow") return this.bowStage;
        if (itemId === "shield") return this.shieldStage;
        if (itemId === "cloak") return this.cloakStage;
        if (itemId === "dagger") return this.daggerStage;
        if (itemId === "throwingKnife") return this.throwingKnifeStage;
        if (itemId === "bracelet") return this.braceletStage;

        return 0;

    },

    getEquippedStage(itemId) {

        if (itemId === "bow") return this.equippedBowStage;
        if (itemId === "shield") return this.equippedShieldStage;
        if (itemId === "cloak") return this.equippedCloakStage;
        if (itemId === "dagger") return this.equippedDaggerStage;
        if (itemId === "throwingKnife") return this.equippedThrowingKnifeStage;
        if (itemId === "bracelet") return this.equippedBraceletStage;

        return 0;

    },

    setEquippedStage(itemId, stage) {

        if (itemId === "bow") return this.setEquippedBowStage(stage);
        if (itemId === "shield") return this.setEquippedShieldStage(stage);
        if (itemId === "cloak") return this.setEquippedCloakStage(stage);
        if (itemId === "dagger") return this.setEquippedDaggerStage(stage);
        if (itemId === "throwingKnife") return this.setEquippedThrowingKnifeStage(stage);
        if (itemId === "bracelet") return this.setEquippedBraceletStage(stage);

    },

    // How many purchasable stages an item actually has. Every
    // staged item currently follows the same 3-stage shape.
    getMaxStage(itemId) {

        return 3;

    },

    canAfford(price) {

        return this.coins >= price;

    },

    owns(itemId) {

        if (STAGED_ITEM_IDS.includes(itemId))
            return this.getStage(itemId) >= 1;

        return !!this.inventory[itemId];

    },

    isEquipped(itemId) {

        if (STAGED_ITEM_IDS.includes(itemId))
            return this.getStage(itemId) >= 1 && !!this.equipped[itemId];

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

        if (item.requiresKnightKilled && !this.knightKilled)
            return "Defeat the Knight";

        if ((itemId === "bow" || itemId === "dagger" || itemId === "throwingKnife") && this.getStage(itemId) >= this.getMaxStage(itemId))
            return "Maxed out";

        // Shield, cloak, and bracelet share a shape: 3 stages,
        // with the final stage locked behind the Knight.
        if (itemId === "shield" || itemId === "cloak" || itemId === "bracelet") {

            if (this.getStage(itemId) >= 3)
                return "Maxed out";

            if (this.getStage(itemId) === 2 && !this.knightKilled)
                return "Defeat the Knight";

        }

        if (!item.repeatable && !STAGED_ITEM_IDS.includes(itemId) && this.owns(itemId))
            return null;

        if (item.repeatable && itemId === "critRate" && this.getCritChance() >= CRIT.MAX)
            return "Maxed out";

        if (item.repeatable && itemId === "knightLocket" && this.getCharmChance() >= CHARM.MAX)
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

        if (item.repeatable || STAGED_ITEM_IDS.includes(itemId))
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

            if (itemId === "knightLocket") {

                this.knightLocketLevel++;

                if (this.equippedKnightLocketLevel < this.knightLocketLevel)
                    this.equippedKnightLocketLevel = this.knightLocketLevel;

            } else {

                this.critRateLevel++;

                if (this.equippedCritLevel < this.critRateLevel)
                    this.equippedCritLevel = this.critRateLevel;

            }

        } else if (itemId === "bow") {

            this.bowStage++;
            this.equippedBowStage = this.bowStage;
            this.inventory.bow = true;
            this.equipped.bow = true;

        } else if (itemId === "shield") {

            this.shieldStage++;
            this.equippedShieldStage = this.shieldStage;
            this.inventory.shield = true;
            this.equipped.shield = true;

        } else if (itemId === "cloak") {

            this.cloakStage++;
            this.equippedCloakStage = this.cloakStage;
            this.inventory.cloak = true;
            this.equipped.cloak = true;

        } else if (itemId === "dagger") {

            this.daggerStage++;
            this.equippedDaggerStage = this.daggerStage;
            this.inventory.dagger = true;
            this.equipped.dagger = true;

        } else if (itemId === "throwingKnife") {

            this.throwingKnifeStage++;
            this.equippedThrowingKnifeStage = this.throwingKnifeStage;
            this.inventory.throwingKnife = true;
            this.equipped.throwingKnife = true;

        } else if (itemId === "bracelet") {

            this.braceletStage++;
            this.equippedBraceletStage = this.braceletStage;
            this.inventory.bracelet = true;
            this.equipped.bracelet = true;

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

    setEquippedShieldStage(stage) {

        this.equippedShieldStage = Math.max(
            1,
            Math.min(this.shieldStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedCloakStage(stage) {

        this.equippedCloakStage = Math.max(
            1,
            Math.min(this.cloakStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedDaggerStage(stage) {

        this.equippedDaggerStage = Math.max(
            1,
            Math.min(this.daggerStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedThrowingKnifeStage(stage) {

        this.equippedThrowingKnifeStage = Math.max(
            1,
            Math.min(this.throwingKnifeStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedBraceletStage(stage) {

        this.equippedBraceletStage = Math.max(
            1,
            Math.min(this.braceletStage, Math.floor(stage))
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

    setEquippedKnightLocketLevel(level) {

        this.equippedKnightLocketLevel = Math.max(
            0,
            Math.min(this.knightLocketLevel, Math.floor(level))
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

    // Knight's Locket - unlike crit (which has an inherent 5%
    // baseline even at level 0), charm chance is 0 until the
    // locket is actually purchased. The first purchase grants
    // the base 5%, each one after that is a +1% upgrade, up to
    // CHARM.MAX.

    getCharmChance() {

        if (this.knightLocketLevel <= 0)
            return 0;

        return Math.min(
            CHARM.MAX,
            CHARM.BASE + (this.knightLocketLevel - 1) * CHARM.PER_UPGRADE
        );

    },

    getEquippedCharmChance() {

        if (this.equippedKnightLocketLevel <= 0)
            return 0;

        return Math.min(
            CHARM.MAX,
            CHARM.BASE + (this.equippedKnightLocketLevel - 1) * CHARM.PER_UPGRADE
        );

    },

    markFirstBossKilled() {

        if (this.firstBossKilled)
            return;

        this.firstBossKilled = true;
        this.persist();

    },

    markKnightKilled() {

        if (this.knightKilled)
            return;

        this.knightKilled = true;
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

//localStorage.removeItem("surviveTheArenaSave");
Save.load();