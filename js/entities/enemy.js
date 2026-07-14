// =====================================
// Enemy Base Class
// =====================================

class Enemy {

    constructor(x, y, stats) {

        this.x = x;
        this.y = y;

        this.size = stats.size;
        this.speed = stats.speed;

        // Game.enemyHpMultiplier is 1 everywhere except Endless
        // (see startWave), so this is a no-op in normal play.
        // Bosses that re-set maxHp after super() must mirror
        // this.hp, not their raw constant (see Magus/King).
        this.hp = Math.round(stats.hp * Game.enemyHpMultiplier);
        this.maxHp = this.hp;

        this.color = stats.color;

        this.hitThisSwing = false;

        this.knockbackX = 0;
        this.knockbackY = 0;

        this.flashTimer = 0;

        // Knight's Locket - see applyCharm(). 0 = not charmed.
        // charmImmune can be set true by subclasses (e.g. King)
        // to opt out entirely, same pattern as knockbackImmune.
        this.charmTimer = 0;

        // Blood Cleric heal channel - re-asserted every frame
        // by the channeling cleric, so it expires on its own
        // moments after the cleric dies or drops the tether.
        // While > 0 this enemy cannot be damaged.
        this.healShieldTimer = 0;

    }

    update() {

        this.x += this.knockbackX * Game.timeScale;
        this.y += this.knockbackY * Game.timeScale;

        // Exponential decay via Math.pow so knockback fades
        // out at the same real-world rate at any frame rate.
        // (0.87 ≈ the old 0.82-per-frame decay at the old 0.7
        // game speed, so shove arcs feel identical.)
        const knockbackDecay = Math.pow(0.87, Game.timeScale);
        this.knockbackX *= knockbackDecay;
        this.knockbackY *= knockbackDecay;

        if (Math.abs(this.knockbackX) < 0.035)
            this.knockbackX = 0;

        if (Math.abs(this.knockbackY) < 0.035)
            this.knockbackY = 0;

        if (this.flashTimer > 0)
            this.flashTimer -= Game.timeScale;

        if (this.charmTimer > 0)
            this.charmTimer -= Game.dt;

        if (this.healShieldTimer > 0)
            this.healShieldTimer -= Game.dt;

        this.move();

        // Charmed enemies can still move, but can't attack or
        // deal contact damage for the duration.
        if (this.charmTimer <= 0) {

            this.attack();

            this.checkPlayerCollision();

        }

    }

    // Rolled by the player's Knight's Locket on hit. No-op
    // against charm-immune enemies (King). Re-applying while
    // already charmed just refreshes to the fresh duration
    // rather than stacking.

    applyCharm(durationMs) {

        if (this.charmImmune)
            return;

        this.charmTimer = Math.max(this.charmTimer, durationMs);

    }

    // Boss-fight escort behavior (Royal Magus): an enemy with
    // a `station` point walks to its post, then holds it
    // forever - it never chases or kites. Returns true when it
    // has taken over movement, so a subclass's move() can bail
    // out early. Their ranged attacks are unaffected (fire
    // mages / frost weavers already cast at the player from
    // any distance).
    moveTowardStation() {

        if (!this.station)
            return false;

        const dx = this.station.x - this.x;
        const dy = this.station.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2)
            return true;

        const step = Math.min(dist, this.speed * Game.timeScale);

        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;

        return true;

    }

    move() {

        if (this.knockbackX !== 0 || this.knockbackY !== 0)
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.x += (dx / distance) * this.speed * Game.timeScale;
        this.y += (dy / distance) * this.speed * Game.timeScale;

    }

    attack() {}

    checkPlayerCollision() {

        if (

            player.x < this.x + this.size &&
            player.x + player.size > this.x &&

            player.y < this.y + this.size &&
            player.y + player.size > this.y

        ) {

            player.takeHit(ENEMY_LABELS[this.type] ?? "an enemy");

        }

    }

    takeDamage(amount, crit = false) {

        // Royal Magus honor guard (untouchable while their
        // master lives - see RoyalMagus.takeDamage) and Blood
        // Cleric heal targets (invincible while the tether
        // holds). Hits still spark so the player can feel
        // them bounce off.
        if (this.damageImmune || this.healShieldTimer > 0) {

            this.flashTimer = 4;

            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return;

        }

        // Blood Cleric ward - a 1-hit shield that eats one
        // full instance of damage, whatever its size.
        if (this.wardShield) {

            this.wardShield = false;
            this.flashTimer = 7;

            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return;

        }

        this.hp -= amount;

        this.flashTimer = 7;

        const centerX =
            this.x + this.size / 2;

        const centerY =
            this.y + this.size / 2;

        Particle.createHitBurst(
            centerX,
            centerY
        );

        Game.damageNumbers.push(

            new DamageNumber(

                centerX,

                centerY - 10,

                amount,

                crit

            )

        );

    }

    applyKnockback(fromX, fromY, force = 8.4) {

        if (this.knockbackImmune)
            return;

        const dx = this.x + this.size / 2 - fromX;
        const dy = this.y + this.size / 2 - fromY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        this.knockbackX += (dx / distance) * force;
        this.knockbackY += (dy / distance) * force;

    }

    isDead() {

        return this.hp <= 0;

    }

    draw() {

        if (this.projectileRingRadius)
            this.drawProjectileRing();

        if (this.isElite)
            this.drawEliteRing();

        if (this.charmTimer > 0)
            this.drawCharmIndicator();

        if (this.wardShield)
            this.drawWardShield();

        if (this.damageImmune)
            this.drawImmuneRing();

        ctx.shadowBlur = EFFECTS.ENEMY_GLOW;
        ctx.shadowColor = this.color;

        ctx.fillStyle =
            this.flashTimer > 0
                ? "white"
                : this.color;

        ctx.fillRect(

            this.x,

            this.y,

            this.size,

            this.size

        );

        ctx.shadowBlur = 0;

        this.drawHealthBar();

    }

    // Boss projectile ward - the big ring every boss projects
    // that stops player projectiles fired from outside it
    // (see Projectile.checkBossRing). Drawn as a slowly
    // pulsing dashed circle so it reads as a standing barrier
    // rather than an attack telegraph.

    drawProjectileRing() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const pulse = 0.35 + Math.sin(Date.now() / 400) * 0.12;

        ctx.save();

        // Faint fill so the protected zone is readable.
        ctx.fillStyle = `rgba(155, 108, 255, ${pulse * 0.12})`;
        ctx.beginPath();
        ctx.arc(cx, cy, this.projectileRingRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(155, 108, 255, ${pulse + 0.25})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 16;
        ctx.shadowColor = BOSS_RING.COLOR;
        ctx.setLineDash([18, 12]);
        ctx.lineDashOffset = -Date.now() / 40;

        ctx.beginPath();
        ctx.arc(cx, cy, this.projectileRingRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

    }

    // Arcane ring around a damage-immune enemy (the Royal
    // Magus' honor guard) - same idea as the ward shield ring
    // but in the Magus' blue, so it reads as HIS protection.

    drawImmuneRing() {

        const pulse = 0.5 + Math.sin(Date.now() / 170) * 0.2;

        ctx.save();

        ctx.strokeStyle = `rgba(120, 150, 255, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#3d5af1";

        ctx.beginPath();
        ctx.arc(
            this.x + this.size / 2,
            this.y + this.size / 2,
            this.size * 0.8,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        ctx.restore();

    }

    // Pale ring around a warded enemy (Blood Cleric's 1-hit
    // shield) - pulses gently so it reads as active magic.

    drawWardShield() {

        const pulse = 0.55 + Math.sin(Date.now() / 150) * 0.2;

        ctx.save();

        ctx.strokeStyle = `rgba(255, 240, 220, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffe8c8";

        ctx.beginPath();
        ctx.arc(
            this.x + this.size / 2,
            this.y + this.size / 2,
            this.size * 0.75,
            0,
            Math.PI * 2
        );
        ctx.stroke();

        ctx.restore();

    }

    // Small heart icon above the enemy while charmed - offset
    // to the upper-right corner rather than dead-center so it
    // doesn't collide with boss name labels drawn there.

    drawCharmIndicator() {

        ctx.save();

        ctx.fillStyle = "#ff69b4";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "💗",
            this.x + this.size + 6,
            this.y - 2
        );

        ctx.restore();

    }

    drawEliteRing() {

        ctx.save();

        ctx.strokeStyle = ELITE.GLOW_COLOR;
        ctx.lineWidth = 3;

        ctx.shadowBlur = 15;
        ctx.shadowColor = ELITE.GLOW_COLOR;

        ctx.strokeRect(

            this.x - 4,

            this.y - 4,

            this.size + 8,

            this.size + 8

        );

        ctx.restore();

    }

    drawHealthBar() {

        ctx.fillStyle = "black";

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size,

            6

        );

        ctx.fillStyle = "lime";

        // Clamp the fill fraction to [0, 1] - an overkill hit
        // drives hp negative, and units that linger past that
        // (e.g. a fusing Powder Keg, whose isDead() is tied to
        // its explosion, not its hp) would otherwise draw a
        // negative-width bar extending off to the left.
        const hpFraction = Math.max(0, Math.min(1, this.hp / this.maxHp));

        ctx.fillRect(

            this.x,

            this.y - 12,

            this.size * hpFraction,

            6

        );

    }

}