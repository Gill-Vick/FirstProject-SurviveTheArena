// =====================================
// Elite Modifier
// =====================================
//
// Deliberately NOT a class hierarchy
// (EliteGrunt, EliteTank, EliteRunner...).
// An elite is just any enemy instance with
// buffed stats and a flag - this works on
// every current and future enemy type for
// free, with no combinatorial explosion of
// subclasses.
//
// On top of the generic stat buffs, each type gets one
// signature twist (tuned in the ELITE constants block).
// Behaviors that need per-frame logic live in the type's own
// class file, gated on `this.isElite` - this switch only sets
// the flags/stats they read.
//
// Usage (see wave.js):
//
//   const enemy = new Grunt(x, y);
//   makeElite(enemy);

function makeElite(enemy) {

    enemy.hp =
        Math.round(enemy.hp * ELITE.HP_MULTIPLIER);

    enemy.maxHp = enemy.hp;

    enemy.size *= ELITE.SIZE_MULTIPLIER;

    enemy.speed *= ELITE.SPEED_MULTIPLIER;

    enemy.isElite = true;

    switch (enemy.type) {

        // Bigger/faster/tougher from the generic buffs, plus
        // a 1-hit shield (the Blood Cleric's ward mechanic).
        case "grunt":
            enemy.wardShield = true;
            break;

        // Protective aura: every OTHER enemy standing inside
        // it is damage-immune (see isAuraProtected below and
        // Enemy.takeDamage). The tank itself stays hittable -
        // it IS the counterplay.
        case "tank":
            enemy.protectsAllies = true;
            enemy.auraRadius = ELITE.TANK_AURA_RADIUS;
            break;

        // Archer (3-arrow fan) and Runner (generic buffs
        // only) need no flags here - archer.js checks isElite.

        // Elite skeletons get the same ward as elite grunts;
        // their dagger swing lives in skeleton.js.
        case "skeleton":
            enemy.wardShield = true;
            break;

        // Tougher shield, and it no longer needs the shield
        // broken to unleash the dash attack (see lancer.js).
        case "lancer":
            enemy.shieldHits = ELITE.LANCER_SHIELD_HITS;
            enemy.eliteWardTimer = ELITE.LANCER_WARD_INTERVAL;
            break;

        // A smaller, faster blink-assassin: undo the generic
        // size-up and shrink it below stock instead. Tempo
        // scales are read in shade.js.
        case "shade":
            enemy.size =
                (enemy.size / ELITE.SIZE_MULTIPLIER) *
                ELITE.SHADE_SIZE_SCALE;
            break;

    }

    return enemy;

}

// =====================================
// Elite Tank Aura
// =====================================
//
// True if `enemy` is currently standing inside a living elite
// tank's aura. Checked by Enemy.takeDamage before applying
// damage. Aura carriers never protect themselves or each
// other (protectsAllies is the opt-out), so the tank is
// always killable.

function isAuraProtected(enemy) {

    if (enemy.protectsAllies)
        return false;

    const cx = enemy.x + enemy.size / 2;
    const cy = enemy.y + enemy.size / 2;

    return Game.enemies.some(tank => {

        if (!tank.protectsAllies || tank.isDead())
            return false;

        return Math.hypot(
            tank.x + tank.size / 2 - cx,
            tank.y + tank.size / 2 - cy
        ) < tank.auraRadius;

    });

}
