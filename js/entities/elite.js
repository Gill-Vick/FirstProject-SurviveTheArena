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

    return enemy;

}