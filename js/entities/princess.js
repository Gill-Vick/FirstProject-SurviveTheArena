// =====================================
// Princess Boss (Wave 20, half of the Siblings fight)
// =====================================
//
// Far-range support/CC - half of a linked pair with the Prince
// (prince.js). Kites at PREFERRED_RANGE like the Archer/Royal
// Magus, and runs three independent lanes in attack() (same
// parallel-cooldown shape as RoyalMagus.attack()'s nova/
// lightning/skill rotation): a weak personal bolt, a slowing
// ground zone (reuses FrostZone from hazard.js with her own
// timing/palette), and - her real threat - a heal/buff channel
// on the Prince. The channel roots her (same as Blood Cleric's
// tether) and pauses her other two lanes, so it's her one real
// vulnerability window: killing her mid-cast denies the Prince
// both the heal and the buff.
//
// Deliberately does NOT grant the Prince healShieldTimer
// invulnerability during the channel (unlike Blood Cleric's
// tether) - he stays damageable throughout, so "tunnel the
// Prince and eat the buffs" stays a real, punishable choice
// instead of being forced into "always kill her first."

class Princess extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: PRINCESS.SIZE,
            speed: PRINCESS.SPEED * Game.enemySpeedMultiplier,
            hp: PRINCESS.BASE_HP + Game.wave * PRINCESS.HP_PER_WAVE,
            color: PRINCESS.COLOR
        });

        this.type = "princess";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.lightningImmune = true;
        this.stunImmune = true;
        // Mirror the (possibly Endless-scaled) hp set by super().
        this.maxHp = this.hp;

        this.boltCooldown = PRINCESS.BOLT_COOLDOWN * 0.5;
        this.zoneCooldown = PRINCESS.ZONE_COOLDOWN * 0.5;

        this.healCooldown = PRINCESS.HEAL_COOLDOWN * 0.5;
        this.healChannelTimer = 0;
        this.healTarget = null;

    }

    // =====================================
    // Movement
    // =====================================

    move() {

        // Rooted while channeling - the tether is a commitment.
        if (this.healTarget)
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0)
            return;

        const preferred = PRINCESS.PREFERRED_RANGE;

        if (distance < preferred - 30) {

            this.x -= (dx / distance) * this.speed * Game.timeScale;
            this.y -= (dy / distance) * this.speed * Game.timeScale;

        } else if (distance > preferred + 30) {

            this.x += (dx / distance) * this.speed * Game.timeScale;
            this.y += (dy / distance) * this.speed * Game.timeScale;

        }

        this.keepInArenaOnceEntered();

    }

    // =====================================
    // Attack
    // =====================================

    attack() {

        if (this.boltCooldown > 0)
            this.boltCooldown -= Game.dt;

        if (this.zoneCooldown > 0)
            this.zoneCooldown -= Game.dt;

        this.updateHealChannel();

        // The bolt/zone lanes pause during the heal channel -
        // her whole focus (and her whole exposure) is the
        // tether while it's up.
        if (this.healTarget)
            return;

        if (this.boltCooldown <= 0) {

            this.fireBolt();
            this.boltCooldown = PRINCESS.BOLT_COOLDOWN;

        }

        if (this.zoneCooldown <= 0) {

            this.castZone();
            this.zoneCooldown = PRINCESS.ZONE_COOLDOWN;

        }

    }

    fireBolt() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const angle = Math.atan2(py - cy, px - cx);

        Game.projectiles.push(new Projectile(

            cx + Math.cos(angle) * (this.size / 2 + 8),
            cy + Math.sin(angle) * (this.size / 2 + 8),
            angle,

            {
                speed: PRINCESS.BOLT_SPEED,
                color: PRINCESS.TETHER_COLOR,
                size: 6,
                life: 200,
                sourceType: "princess",
                damage: PRINCESS.BOLT_DAMAGE
            }

        ));

    }

    castZone() {

        const tx = player.x + player.size / 2;
        const ty = player.y + player.size / 2;

        Game.hazards.push(new FrostZone(tx, ty, PRINCESS.ZONE_RADIUS, {
            growTime: PRINCESS.ZONE_GROW_MS,
            duration: PRINCESS.ZONE_DURATION_MS,
            palette: PRINCESS.ZONE_PALETTE
        }));

    }

    // =====================================
    // Heal / Buff Channel
    // =====================================
    //
    // Same shape as Blood Cleric's channel (see bloodCleric.js)
    // but hardcoded to the Prince rather than a "most injured
    // ally" search, since she only ever has one target.

    updateHealChannel() {

        if (this.healTarget) {

            // Target died mid-channel (or somehow left play) -
            // the cast fizzles on a shortened cooldown.
            if (
                this.healTarget.isDead() ||
                !Game.enemies.includes(this.healTarget)
            ) {

                this.healTarget = null;
                this.healCooldown = PRINCESS.HEAL_COOLDOWN * 0.5;

                return;

            }

            this.healChannelTimer -= Game.dt;

            if (this.healChannelTimer <= 0) {

                const amount = Math.round(
                    this.healTarget.maxHp * PRINCESS.HEAL_FRACTION
                );

                this.healTarget.hp = Math.min(
                    this.healTarget.maxHp,
                    this.healTarget.hp + amount
                );

                this.healTarget.applySiblingBuff();

                Particle.createHitBurst(
                    this.healTarget.x + this.healTarget.size / 2,
                    this.healTarget.y + this.healTarget.size / 2
                );

                this.healTarget = null;
                this.healCooldown = PRINCESS.HEAL_COOLDOWN;

            }

            return;

        }

        if (this.healCooldown > 0) {

            this.healCooldown -= Game.dt;

            return;

        }

        const prince = Game.enemies.find(
            e => e.type === "prince" && !e.isDead()
        );

        if (!prince)
            return;

        this.healTarget = prince;
        this.healChannelTimer = PRINCESS.HEAL_CHANNEL_MS;

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        // Channel tether under the bodies.
        if (this.healTarget) {

            const sx = this.x + this.size / 2;
            const sy = this.y + this.size / 2;
            const tx = this.healTarget.x + this.healTarget.size / 2;
            const ty = this.healTarget.y + this.healTarget.size / 2;

            const pulse = 0.5 + Math.sin(Date.now() / 80) * 0.25;

            ctx.save();

            ctx.strokeStyle = `rgba(232, 200, 74, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 12;
            ctx.shadowColor = PRINCESS.TETHER_COLOR;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // Glow on the recipient.
            ctx.strokeStyle = `rgba(240, 220, 140, ${pulse})`;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(tx, ty, this.healTarget.size * 0.7, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

        }

        super.draw();

        this.drawLabel();

    }

    drawLabel() {

        drawPixelText(
            "PRINCESS",
            this.x + this.size / 2,
            this.y - 22,
            2,
            { color: "#e0a0c0", shadow: "rgba(0, 0, 0, 0.9)" }
        );

    }

}
