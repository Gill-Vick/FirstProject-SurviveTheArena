// =====================================
// Powder Keg (Set 3)
// =====================================
//
// A walking bomb. 2 HP, never scales - it's supposed to die
// easily. The decision is WHERE you let it die: reaching
// TRIGGER_RANGE of the player or losing its HP both light the
// fuse, and after FUSE_TIME it explodes, hurting the player
// AND other enemies. Kill it from range for free, or bait it
// into the horde for a reward.
//
// Kill-credit note: attackers call takeDamage() then check
// isDead() for onEnemyKilled credit. A keg's isDead() stays
// false through the fuse (so it isn't cleaned up mid-fuse),
// which means no attacker ever credits it - the keg credits
// itself via onEnemyKilled(this) when it finally explodes,
// and credits any enemies its blast kills the same way.

class PowderKeg extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.powderKeg.SIZE,

            speed:
                ENEMY_TYPES.powderKeg.SPEED *
                Game.enemySpeedMultiplier,

            hp: 2,

            color: ENEMY_TYPES.powderKeg.COLOR

        });

        this.type = "powderKeg";

        this.fusing = false;
        this.fuseTimer = 0;
        this.exploded = false;

    }

    startFuse() {

        if (this.fusing)
            return;

        this.fusing = true;
        this.fuseTimer = ENEMY_TYPES.powderKeg.FUSE_TIME;

    }

    takeDamage(amount, crit = false) {

        if (this.fusing)
            return;

        super.takeDamage(amount, crit);

        if (this.hp <= 0)
            this.startFuse();

    }

    isDead() {

        return this.exploded;

    }

    move() {

        if (this.fusing) {

            // Rooted while the fuse burns - the flashing keg
            // and warning circle are the player's window.
            this.fuseTimer -= Game.dt;

            if (this.fuseTimer <= 0 && !this.exploded)
                this.explode();

            return;

        }

        super.move();

    }

    attack() {

        if (this.fusing)
            return;

        const dx = player.x + player.size / 2 - (this.x + this.size / 2);
        const dy = player.y + player.size / 2 - (this.y + this.size / 2);

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ENEMY_TYPES.powderKeg.TRIGGER_RANGE)
            this.startFuse();

    }

    // The blast is the only threat - brushing against the keg
    // itself doesn't hurt.
    checkPlayerCollision() {}

    explode() {

        this.exploded = true;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const radius = ENEMY_TYPES.powderKeg.EXPLOSION_RADIUS;

        // Player
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - cx, py - cy) < radius + player.size / 2)
            player.takeHit(ENEMY_LABELS.powderKeg);

        // Other enemies - skipping ones already dead this
        // frame so their kill isn't credited twice. Damaging
        // another keg lights ITS fuse, so kegs chain.
        Game.enemies.forEach(enemy => {

            if (enemy === this || enemy.isDead())
                return;

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            if (Math.hypot(ex - cx, ey - cy) < radius + enemy.size / 2) {

                enemy.takeDamage(ENEMY_TYPES.powderKeg.EXPLOSION_ENEMY_DAMAGE);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

        for (let i = 0; i < 4; i++) {

            Particle.createHitBurst(
                cx + (Math.random() - 0.5) * radius,
                cy + (Math.random() - 0.5) * radius
            );

        }

        Game.screenShake = Math.max(Game.screenShake, 10);

        // The blast scorches its radius into a kill zone that
        // stays lethal to the player until the wave ends.
        Game.hazards.push(new KegKillZone(cx, cy));

        onEnemyKilled(this);

    }

    draw() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // Blast-radius warning while the fuse burns.
        if (this.fusing) {

            const urgency = 1 - this.fuseTimer / ENEMY_TYPES.powderKeg.FUSE_TIME;
            const pulse = 0.25 + Math.sin(Date.now() / 40) * 0.15;

            ctx.save();

            ctx.strokeStyle = `rgba(255, 60, 20, ${pulse + urgency * 0.3})`;
            ctx.fillStyle = `rgba(255, 80, 20, ${pulse * 0.3})`;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(cx, cy, ENEMY_TYPES.powderKeg.EXPLOSION_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            // Rapid white flashing as it's about to blow.
            if (Math.floor(Date.now() / (90 - urgency * 60)) % 2 === 0)
                this.flashTimer = 3;

        }

        super.draw();

        // Lit fuse spark - pulses faster the closer it gets.
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const rate = this.fusing ? 60 : Math.max(80, Math.min(300, dist));
        const spark = Math.sin(Date.now() / rate) > 0;

        ctx.save();

        ctx.fillStyle = "#3a2f26";
        ctx.fillRect(cx - 2, this.y - 10, 4, 12);

        ctx.fillStyle = spark ? "#ffcf4d" : "#ff7b29";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "orange";

        ctx.beginPath();
        ctx.arc(cx, this.y - 12, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

}
