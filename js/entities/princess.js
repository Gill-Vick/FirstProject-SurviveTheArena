// =====================================
// Princess Boss (Wave 20, half of the Siblings fight)
// =====================================
//
// Far-range support/CC - half of a linked pair with the Prince
// (prince.js). Kites at PREFERRED_RANGE like the Archer/Royal
// Magus, and runs four independent lanes in attack() (same
// parallel-cooldown shape as RoyalMagus.attack()'s nova/
// lightning/skill rotation): a personal bolt, a volley burst, a
// slowing ground zone (reuses FrostZone from hazard.js with her
// own timing/palette), a telegraphed hard-root curse, and - her
// real threat - a heal/buff channel on the Prince. The channel
// roots her (same as Blood Cleric's tether) and pauses her other
// lanes, so it's her one real vulnerability window: killing her
// mid-cast denies the Prince both the heal and the buff.
//
// Deliberately does NOT grant the Prince healShieldTimer
// invulnerability during the channel (unlike Blood Cleric's
// tether) - he stays damageable throughout, so "tunnel the
// Prince and eat the buffs" stays a real, punishable choice
// instead of being forced into "always kill her first."
//
// Phase 2 (see SIBLINGS_PHASE2 in constants.js): while
// Game.siblingsPhase is 1, her own takeDamage() floors her hp at
// 1 - she can be battered down but not finished off. The moment
// the SIBLINGS' COMBINED hp crosses the 50% threshold (checked
// every frame in attack(), since her own hp barely moves once
// floored - this is really driven by how much the Prince has
// taken), she pours what's left of herself into him (a big heal,
// see prince.js) and loses her floor for good. One more hit ends
// her from there.

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
        this.volleyCooldown = PRINCESS.VOLLEY_COOLDOWN * 0.5;
        this.zoneCooldown = PRINCESS.ZONE_COOLDOWN * 0.5;

        // Binding Curse - "windup" holds the telegraphed anchor
        // point until it resolves (root applied or missed).
        this.curseCooldown = PRINCESS.CURSE_COOLDOWN * 0.5;
        this.curseTelegraph = null;

        this.healCooldown = PRINCESS.HEAL_COOLDOWN * 0.5;
        this.healChannelTimer = 0;
        this.healTarget = null;

    }

    // Phase 1: floored at 1hp, never actually dies. Phase 2:
    // normal damage - see the Siblings Phase 2 header above.
    takeDamage(amount, crit = false) {

        super.takeDamage(amount, crit);

        if (Game.siblingsPhase === 1 && this.hp < 1)
            this.hp = 1;

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

        if (this.volleyCooldown > 0)
            this.volleyCooldown -= Game.dt;

        if (this.zoneCooldown > 0)
            this.zoneCooldown -= Game.dt;

        if (this.curseCooldown > 0)
            this.curseCooldown -= Game.dt;

        this.updateCurse();

        this.updateHealChannel();

        this.checkPhaseTransition();

        // The other lanes pause during the heal channel - her
        // whole focus (and her whole exposure) is the tether
        // while it's up.
        if (this.healTarget)
            return;

        if (this.boltCooldown <= 0) {

            this.fireBolt();
            this.boltCooldown = PRINCESS.BOLT_COOLDOWN;

        }

        if (this.volleyCooldown <= 0) {

            this.fireVolley();
            this.volleyCooldown = PRINCESS.VOLLEY_COOLDOWN;

        }

        if (this.zoneCooldown <= 0) {

            this.castZone();
            this.zoneCooldown = PRINCESS.ZONE_COOLDOWN;

        }

        if (this.curseCooldown <= 0 && !this.curseTelegraph) {

            this.startCurse();
            this.curseCooldown = PRINCESS.CURSE_COOLDOWN;

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

    // Volley - an independent lane: a 3-bolt spread instead of
    // the single shot, so the bolt lane isn't the same single
    // note the whole fight.
    fireVolley() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const baseAngle = Math.atan2(py - cy, px - cx);
        const startAngle = baseAngle - PRINCESS.VOLLEY_SPREAD / 2;
        const step = PRINCESS.VOLLEY_SPREAD / (PRINCESS.VOLLEY_COUNT - 1);

        for (let i = 0; i < PRINCESS.VOLLEY_COUNT; i++) {

            const angle = startAngle + i * step;

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

        Sound.play("knifeThrow");

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
    // Binding Curse
    // =====================================
    //
    // A telegraphed hard root, distinct from the slow zone: the
    // anchor point is pinned to wherever the player is standing
    // when the cast starts, drawn as a tightening warning ring,
    // and resolves CURSE_TELEGRAPH_MS later - root lands only if
    // the player is still inside CURSE_RANGE of that anchor,
    // same "dodge the telegraph" fairness as every other
    // telegraphed hit in this game.

    startCurse() {

        this.curseTelegraph = {
            x: player.x + player.size / 2,
            y: player.y + player.size / 2,
            timer: PRINCESS.CURSE_TELEGRAPH_MS
        };

    }

    updateCurse() {

        if (!this.curseTelegraph)
            return;

        this.curseTelegraph.timer -= Game.dt;

        if (this.curseTelegraph.timer > 0)
            return;

        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        if (Math.hypot(px - this.curseTelegraph.x, py - this.curseTelegraph.y) <= PRINCESS.CURSE_RANGE) {

            player.rootTimer = Math.max(player.rootTimer, PRINCESS.CURSE_ROOT_MS);

            Game.screenShake = Math.max(Game.screenShake ?? 0, 8);
            Particle.createHitBurst(px, py);

        }

        this.curseTelegraph = null;

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
    // Phase 2 - the 50% sacrifice
    // =====================================

    checkPhaseTransition() {

        if (Game.siblingsPhase !== 1)
            return;

        const prince = Game.enemies.find(
            e => e.type === "prince" && !e.isDead()
        );

        if (!prince)
            return;

        const combinedHp = prince.hp + this.hp;
        const combinedMax = prince.maxHp + this.maxHp;

        if (combinedHp > combinedMax * SIBLINGS_PHASE2.TRIGGER_HP_FRACTION)
            return;

        Game.siblingsPhase = 2;

        // She pours what's left of herself into him.
        prince.hp = Math.max(
            prince.hp,
            Math.round(prince.maxHp * SIBLINGS_PHASE2.PRINCE_HEAL_TO_FRACTION)
        );

        prince.enterPhase2();

        // Interrupt whatever she was doing - the sacrifice takes
        // her whole attention.
        this.healTarget = null;
        this.curseTelegraph = null;

        Game.screenShake = Math.max(Game.screenShake ?? 0, 20);
        Particle.createHitBurst(
            prince.x + prince.size / 2,
            prince.y + prince.size / 2
        );
        Sound.play("bossSlam");

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        // Curse telegraph - a tightening warning ring at the
        // pinned anchor point.
        if (this.curseTelegraph) {

            const progress = 1 - this.curseTelegraph.timer / PRINCESS.CURSE_TELEGRAPH_MS;
            const alpha = 0.4 + Math.sin(Date.now() / 50) * 0.2;

            drawPixelRing(
                this.curseTelegraph.x,
                this.curseTelegraph.y,
                PRINCESS.CURSE_RANGE * (1 - progress * 0.85),
                {
                    color: PRINCESS.CURSE_COLOR,
                    alpha,
                    unit: 4,
                    glow: 12,
                    glowColor: PRINCESS.CURSE_COLOR
                }
            );

        }

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

        const label = Game.siblingsPhase === 2 ? "PRINCESS (EXPOSED)" : "PRINCESS";
        const color = Game.siblingsPhase === 2 ? "#ff5a3d" : "#e0a0c0";

        drawPixelText(
            label,
            this.x + this.size / 2,
            this.y - 22,
            2,
            { color, shadow: "rgba(0, 0, 0, 0.9)" }
        );

    }

}
