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

    magusKilled: false,

    // The four Act II bosses, each gating its own two-item tier
    // per class. Ordered as the campaign meets them: Matron 20,
    // Greenwarden 25, Heartwood 30, Herald 35 - all of them
    // before the Siblings at 40 and the King at 50.
    matronKilled: false,

    greenwardenKilled: false,

    heartwoodKilled: false,

    heraldKilled: false,

    siblingsKilled: false,

    kingKilled: false,

    // Furthest wave reached in the score modes (0 = never played).
    bestEndlessWave: 0,

    bestBossRushWave: 0,

    // Audio settings - three independent dials plus a mute
    // toggle, read every time a sound plays (see audio.js).
    // Defaults live in AUDIO (sounds.js) so the sliders and
    // the catalog agree on what "normal" is.
    masterVolume: AUDIO.DEFAULT_MASTER,

    sfxVolume: AUDIO.DEFAULT_SFX,

    musicVolume: AUDIO.DEFAULT_MUSIC,

    audioMuted: false,

    critRateLevel: 0,

    equippedCritLevel: 0,

    shieldStage: 0,

    equippedShieldStage: 0,

    bowStage: 0,

    equippedBowStage: 0,

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

    // Mage staged items.
    haloStage: 0,

    equippedHaloStage: 0,

    sunburstStage: 0,

    equippedSunburstStage: 0,

    inventory: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        berserkerMedallion: false,
        forgeSigil: false,
        blessingOfThorns: false,
        matronsSeal: false,
        wardensCleaver: false,
        heartbarkPlate: false,
        heartwoodMaul: false,
        deeprootGreaves: false,
        heraldicBrand: false,
        stormstepSabatons: false,
        twinbladeEcho: false,
        siblingsResilience: false,
        kingsBlade: false,
        windrunnerAnklet: false,
        lightningRing: false,
        cloak: false,
        dagger: false,
        emberArrows: false,
        falconQuiver: false,
        swiftdrawGloves: false,
        huntersMark: false,
        galeRecurve: false,
        stormfletch: false,
        cycloneVeil: false,
        seedshotQuiver: false,
        bramblestride: false,
        severingBroadheads: false,
        secondGrowth: false,
        taprootArrows: false,
        grovewalker: false,
        judgementArrow: false,
        skywardTalons: false,
        royalVolley: false,
        princessFavor: false,
        stormpiercer: false,
        bracelet: false,
        throwingKnife: false,
        thiefsWit: false,
        voidEnchant: false,
        masterOfBlade: false,
        shadowreachBlades: false,
        pocketWatch: false,
        voltaicFang: false,
        leylineSnare: false,
        rosethornEdge: false,
        briarCloak: false,
        limbtaker: false,
        regrowthSigil: false,
        rootfang: false,
        sapwell: false,
        heraldsVerdict: false,
        ascendantCloak: false,
        shadowTwin: false,
        mirrorCloak: false,
        moonlightDaggers: false,
        halo: false,
        sunburst: false,
        sunstone: false,
        refraction: false,
        amberlightField: false,
        radiantOverload: false,
        elementalPrism: false,
        arcaneStep: false,
        corona: false,
        bloomsightPrism: false,
        sporeVeil: false,
        pruningLight: false,
        hedgewardBloom: false,
        corewoodFocus: false,
        rootcage: false,
        pillarOfJudgement: false,
        heraldsWings: false,
        twincastPrism: false,
        siblingsGrace: false,
        sovereignScepter: false
    },

    equipped: {
        shield: false,
        bow: false,
        wetStone: false,
        hermesShoes: false,
        circleStrike: false,
        berserkerMedallion: false,
        forgeSigil: false,
        blessingOfThorns: false,
        matronsSeal: false,
        wardensCleaver: false,
        heartbarkPlate: false,
        heartwoodMaul: false,
        deeprootGreaves: false,
        heraldicBrand: false,
        stormstepSabatons: false,
        twinbladeEcho: false,
        siblingsResilience: false,
        kingsBlade: false,
        windrunnerAnklet: false,
        lightningRing: false,
        cloak: false,
        dagger: false,
        emberArrows: false,
        falconQuiver: false,
        swiftdrawGloves: false,
        huntersMark: false,
        galeRecurve: false,
        stormfletch: false,
        cycloneVeil: false,
        seedshotQuiver: false,
        bramblestride: false,
        severingBroadheads: false,
        secondGrowth: false,
        taprootArrows: false,
        grovewalker: false,
        judgementArrow: false,
        skywardTalons: false,
        royalVolley: false,
        princessFavor: false,
        stormpiercer: false,
        bracelet: false,
        throwingKnife: false,
        thiefsWit: false,
        voidEnchant: false,
        masterOfBlade: false,
        shadowreachBlades: false,
        pocketWatch: false,
        voltaicFang: false,
        leylineSnare: false,
        rosethornEdge: false,
        briarCloak: false,
        limbtaker: false,
        regrowthSigil: false,
        rootfang: false,
        sapwell: false,
        heraldsVerdict: false,
        ascendantCloak: false,
        shadowTwin: false,
        mirrorCloak: false,
        moonlightDaggers: false,
        halo: false,
        sunburst: false,
        sunstone: false,
        refraction: false,
        amberlightField: false,
        radiantOverload: false,
        elementalPrism: false,
        arcaneStep: false,
        corona: false,
        bloomsightPrism: false,
        sporeVeil: false,
        pruningLight: false,
        hedgewardBloom: false,
        corewoodFocus: false,
        rootcage: false,
        pillarOfJudgement: false,
        heraldsWings: false,
        twincastPrism: false,
        siblingsGrace: false,
        sovereignScepter: false
    },

    bestiaryUnlocked: {},

    // Player-written field notes, keyed by bestiary type the
    // same way bestiaryUnlocked is ("grunt", "eliteGrunt").
    // Whatever the player works out about a foe lives here -
    // the game never writes to it.
    bestiaryNotes: {},

    load() {

        try {

            const raw = localStorage.getItem(SAVE_KEY);

            if (!raw)
                return;

            const data = JSON.parse(raw);

            this.coins = data.coins ?? 0;
            this.firstBossKilled = !!data.firstBossKilled;
            this.knightKilled = !!data.knightKilled;
            this.magusKilled = !!data.magusKilled;
            this.matronKilled = !!data.matronKilled;
            this.greenwardenKilled = !!data.greenwardenKilled;
            this.heartwoodKilled = !!data.heartwoodKilled;
            this.heraldKilled = !!data.heraldKilled;
            this.siblingsKilled = !!data.siblingsKilled;
            this.kingKilled = !!data.kingKilled;
            this.bestEndlessWave = data.bestEndlessWave ?? 0;
            this.bestBossRushWave = data.bestBossRushWave ?? 0;
            this.masterVolume = data.masterVolume ?? AUDIO.DEFAULT_MASTER;
            this.sfxVolume = data.sfxVolume ?? AUDIO.DEFAULT_SFX;
            this.musicVolume = data.musicVolume ?? AUDIO.DEFAULT_MUSIC;
            this.audioMuted = !!data.audioMuted;
            this.critRateLevel = data.critRateLevel ?? 0;
            this.equippedCritLevel = data.equippedCritLevel ?? this.critRateLevel;
            this.shieldStage = data.shieldStage ?? 0;
            this.equippedShieldStage = data.equippedShieldStage ?? this.shieldStage;
            this.bowStage = data.bowStage ?? 0;
            this.equippedBowStage = data.equippedBowStage ?? this.bowStage;
            this.cloakStage = data.cloakStage ?? 0;
            this.equippedCloakStage = data.equippedCloakStage ?? this.cloakStage;
            this.daggerStage = data.daggerStage ?? 0;
            this.equippedDaggerStage = data.equippedDaggerStage ?? this.daggerStage;
            this.throwingKnifeStage = data.throwingKnifeStage ?? 0;
            this.equippedThrowingKnifeStage = data.equippedThrowingKnifeStage ?? this.throwingKnifeStage;
            this.braceletStage = data.braceletStage ?? 0;
            this.equippedBraceletStage = data.equippedBraceletStage ?? this.braceletStage;
            this.haloStage = data.haloStage ?? 0;
            this.equippedHaloStage = data.equippedHaloStage ?? this.haloStage;
            this.sunburstStage = data.sunburstStage ?? 0;
            this.equippedSunburstStage = data.equippedSunburstStage ?? this.sunburstStage;

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

            // Renamed items keep their owners: the buyer paid
            // for the slot, so a rebalance that swaps what
            // fills it must not silently pocket their coins.
            //
            //   Radiant Bloom    -> Elemental Prism    (mage)
            //   Serrated Blade   -> Shadowreach Blades (thief)
            //   Solar Attunement -> Amberlight Field   (mage)
            //
            // Same price and same boss gate on both sides of
            // each swap. The Amberlight Field does something
            // different from the Solar Attunement it replaces
            // (its old recharge bonus was folded into
            // Refraction), but the slot was paid for either
            // way.
            if (data.inventory?.radiantBloom) {

                this.inventory.elementalPrism = true;
                this.equipped.elementalPrism = !!data.equipped?.radiantBloom;

            }

            if (data.inventory?.serratedBlade) {

                this.inventory.shadowreachBlades = true;
                this.equipped.shadowreachBlades = !!data.equipped?.serratedBlade;

            }

            if (data.inventory?.solarAttunement) {

                this.inventory.amberlightField = true;
                this.equipped.amberlightField = !!data.equipped?.solarAttunement;

            }

            this.bestiaryUnlocked = { ...(data.bestiaryUnlocked ?? {}) };
            this.bestiaryNotes = { ...(data.bestiaryNotes ?? {}) };

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
            magusKilled: this.magusKilled,
            matronKilled: this.matronKilled,
            greenwardenKilled: this.greenwardenKilled,
            heartwoodKilled: this.heartwoodKilled,
            heraldKilled: this.heraldKilled,
            siblingsKilled: this.siblingsKilled,
            kingKilled: this.kingKilled,
            bestEndlessWave: this.bestEndlessWave,
            bestBossRushWave: this.bestBossRushWave,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            audioMuted: this.audioMuted,
            critRateLevel: this.critRateLevel,
            equippedCritLevel: this.equippedCritLevel,
            shieldStage: this.shieldStage,
            equippedShieldStage: this.equippedShieldStage,
            bowStage: this.bowStage,
            equippedBowStage: this.equippedBowStage,
            cloakStage: this.cloakStage,
            equippedCloakStage: this.equippedCloakStage,
            daggerStage: this.daggerStage,
            equippedDaggerStage: this.equippedDaggerStage,
            throwingKnifeStage: this.throwingKnifeStage,
            equippedThrowingKnifeStage: this.equippedThrowingKnifeStage,
            braceletStage: this.braceletStage,
            equippedBraceletStage: this.equippedBraceletStage,
            haloStage: this.haloStage,
            equippedHaloStage: this.equippedHaloStage,
            sunburstStage: this.sunburstStage,
            equippedSunburstStage: this.equippedSunburstStage,
            inventory: { ...this.inventory },
            equipped: { ...this.equipped },
            bestiaryUnlocked: { ...this.bestiaryUnlocked },
            bestiaryNotes: { ...this.bestiaryNotes }

        }));

    },

    addCoins(amount) {

        this.coins += amount;
        this.persist();

    },

    // =====================================
    // Audio Settings
    // =====================================
    //
    // One setter for all three volume dials, since a settings
    // slider only differs by which key it writes. Values are
    // clamped here rather than at the call site so a dragged
    // slider can hand over whatever it computed.

    setVolume(key, value) {

        if (key !== "masterVolume" && key !== "sfxVolume" && key !== "musicVolume")
            return;

        const v = Number(value);

        this[key] = Math.max(0, Math.min(1, isFinite(v) ? v : 0));

        this.persist();

    },

    setAudioMuted(muted) {

        this.audioMuted = !!muted;
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
        if (itemId === "halo") return this.haloStage;
        if (itemId === "sunburst") return this.sunburstStage;

        return 0;

    },

    getEquippedStage(itemId) {

        if (itemId === "bow") return this.equippedBowStage;
        if (itemId === "shield") return this.equippedShieldStage;
        if (itemId === "cloak") return this.equippedCloakStage;
        if (itemId === "dagger") return this.equippedDaggerStage;
        if (itemId === "throwingKnife") return this.equippedThrowingKnifeStage;
        if (itemId === "bracelet") return this.equippedBraceletStage;
        if (itemId === "halo") return this.equippedHaloStage;
        if (itemId === "sunburst") return this.equippedSunburstStage;

        return 0;

    },

    setEquippedStage(itemId, stage) {

        if (itemId === "bow") return this.setEquippedBowStage(stage);
        if (itemId === "shield") return this.setEquippedShieldStage(stage);
        if (itemId === "cloak") return this.setEquippedCloakStage(stage);
        if (itemId === "dagger") return this.setEquippedDaggerStage(stage);
        if (itemId === "throwingKnife") return this.setEquippedThrowingKnifeStage(stage);
        if (itemId === "bracelet") return this.setEquippedBraceletStage(stage);
        if (itemId === "halo") return this.setEquippedHaloStage(stage);
        if (itemId === "sunburst") return this.setEquippedSunburstStage(stage);

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

        if (item.requiresMagusKilled && !this.magusKilled)
            return "Defeat the Royal Magus";

        if (item.requiresMatronKilled && !this.matronKilled)
            return "Defeat the Thorn Matron";

        if (item.requiresGreenwardenKilled && !this.greenwardenKilled)
            return "Defeat the Greenwarden";

        if (item.requiresHeartwoodKilled && !this.heartwoodKilled)
            return "Defeat the Heartwood";

        if (item.requiresHeraldKilled && !this.heraldKilled)
            return "Defeat the Herald";

        if (item.requiresSiblingsKilled && !this.siblingsKilled)
            return "Defeat the Siblings";

        if ((itemId === "bow" || itemId === "dagger" || itemId === "throwingKnife" || itemId === "sunburst") && this.getStage(itemId) >= this.getMaxStage(itemId))
            return "Maxed out";

        // Shield, cloak, and bracelet share a shape: 3 stages,
        // with the final stage locked behind the Knight.
        if (itemId === "shield" || itemId === "cloak" || itemId === "bracelet" || itemId === "halo") {

            if (this.getStage(itemId) >= 3)
                return "Maxed out";

            if (this.getStage(itemId) === 2 && !this.knightKilled)
                return "Defeat the Knight";

        }

        if (!item.repeatable && !STAGED_ITEM_IDS.includes(itemId) && this.owns(itemId))
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

            // critRate is the only repeatable item left (see
            // getCritChance) - Knight's Locket, the other one,
            // was replaced by the equippable Lightning Ring.
            this.critRateLevel++;

            if (this.equippedCritLevel < this.critRateLevel)
                this.equippedCritLevel = this.critRateLevel;

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

        } else if (itemId === "halo") {

            this.haloStage++;
            this.equippedHaloStage = this.haloStage;
            this.inventory.halo = true;
            this.equipped.halo = true;

        } else if (itemId === "sunburst") {

            this.sunburstStage++;
            this.equippedSunburstStage = this.sunburstStage;
            this.inventory.sunburst = true;
            this.equipped.sunburst = true;

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

    setEquippedHaloStage(stage) {

        this.equippedHaloStage = Math.max(
            1,
            Math.min(this.haloStage, Math.floor(stage))
        );

        this.persist();

    },

    setEquippedSunburstStage(stage) {

        this.equippedSunburstStage = Math.max(
            1,
            Math.min(this.sunburstStage, Math.floor(stage))
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

    markKnightKilled() {

        if (this.knightKilled)
            return;

        this.knightKilled = true;
        this.persist();

    },

    markMagusKilled() {

        if (this.magusKilled)
            return;

        this.magusKilled = true;
        this.persist();

    },

    markMatronKilled() {

        if (this.matronKilled)
            return;

        this.matronKilled = true;
        this.persist();

    },

    markGreenwardenKilled() {

        if (this.greenwardenKilled)
            return;

        this.greenwardenKilled = true;
        this.persist();

    },

    markHeartwoodKilled() {

        if (this.heartwoodKilled)
            return;

        this.heartwoodKilled = true;
        this.persist();

    },

    markHeraldKilled() {

        if (this.heraldKilled)
            return;

        this.heraldKilled = true;
        this.persist();

    },

    markSiblingsKilled() {

        if (this.siblingsKilled)
            return;

        this.siblingsKilled = true;
        this.persist();

    },

    markKingKilled() {

        if (this.kingKilled)
            return;

        this.kingKilled = true;
        this.persist();

    },

    // High scores for the score modes: the furthest wave reached.
    // Called on death (see Player.takeHit). Returns true if this
    // run set a new record, so the game-over screen can call it
    // out. Campaign/Custom aren't scored.

    recordRunWave(mode, wave) {

        const key =
            mode === "endless" ? "bestEndlessWave" :
            mode === "bossRush" ? "bestBossRushWave" :
            null;

        if (!key || wave <= this[key])
            return false;

        this[key] = wave;
        this.persist();

        return true;

    },

    getBestWave(mode) {

        if (mode === "endless") return this.bestEndlessWave;
        if (mode === "bossRush") return this.bestBossRushWave;

        return 0;

    },

    isBestiaryUnlocked(type) {

        return !!this.bestiaryUnlocked[type];

    },

    markBestiaryKill(type) {

        if (this.bestiaryUnlocked[type])
            return;

        this.bestiaryUnlocked[type] = true;
        this.persist();

    },

    getBestiaryNote(type) {

        return this.bestiaryNotes[type] ?? "";

    },

    // Capped so a stuck key can't grow the save without limit.
    // An emptied note drops its key instead of storing "".
    setBestiaryNote(type, text) {

        const trimmed = (text ?? "").slice(0, BESTIARY_NOTE_MAX_LENGTH);

        if (this.getBestiaryNote(type) === trimmed)
            return;

        if (trimmed)
            this.bestiaryNotes[type] = trimmed;
        else
            delete this.bestiaryNotes[type];

        this.persist();

    }

};

//localStorage.removeItem("surviveTheArenaSave");
Save.load();