// =====================================
// Blood Cleric (Set 3)
// =====================================
//
// The enemy healer - classic "kill the healer first"
// pressure. Hangs back at PREFERRED_RANGE, and on a heartbeat
// either channels a heal into the most-injured non-boss ally
// (visible red tether, interruptible by killing either end)
// or, if nobody's hurt, wards a nearby ally with a 1-hit
// shield (see wardShield in enemy.js).

class BloodCleric extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.bloodCleric.SIZE,

            speed:
                ENEMY_TYPES.bloodCleric.SPEED *
                Game.enemySpeedMultiplier,

            hp: 3 + Math.floor((Game.wave - 1) / 8),

            color: ENEMY_TYPES.bloodCleric.COLOR

        });

        this.type = "bloodCleric";

        this.healCooldown = ENEMY_TYPES.bloodCleric.HEAL_COOLDOWN;
        this.channelTimer = 0;
        this.healTarget = null;

    }

    move() {

        // Rooted while channeling - the tether is a commitment.
        if (this.healTarget)
            return;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {

            const preferred = ENEMY_TYPES.bloodCleric.PREFERRED_RANGE;

            if (distance < preferred - 30) {

                this.x -= (dx / distance) * this.speed * Game.timeScale;
                this.y -= (dy / distance) * this.speed * Game.timeScale;

            } else if (distance > preferred + 60) {

                this.x += (dx / distance) * this.speed * 0.5 * Game.timeScale;
                this.y += (dy / distance) * this.speed * 0.5 * Game.timeScale;

            }

        }

        // It retreats, so unlike chasers it can actually reach
        // the arena edge - keep it on screen.
        this.x = Math.max(10, Math.min(canvas.width - this.size - 10, this.x));
        this.y = Math.max(10, Math.min(canvas.height - this.size - 10, this.y));

    }

    // Valid recipients: alive, hittable allies. Bosses are
    // excluded from both heals and wards.
    isValidAlly(enemy) {

        return (
            enemy !== this &&
            !enemy.isDead() &&
            enemy.hp > 0 &&
            !enemy.isBoss
        );

    }

    attack() {

        const C = ENEMY_TYPES.bloodCleric;

        // Mid-channel: hold the tether, then deliver the heal.
        if (this.healTarget) {

            if (!this.isValidAlly(this.healTarget) ||
                !Game.enemies.includes(this.healTarget)) {

                // Target died mid-channel - the heal fizzles.
                this.healTarget = null;
                this.healCooldown = C.HEAL_COOLDOWN * 0.5;

                return;

            }

            // The tether shields its target: re-asserted every
            // frame so it collapses on its own right after the
            // cleric dies or drops the channel.
            this.healTarget.healShieldTimer = 250;

            this.channelTimer -= Game.dt;

            if (this.channelTimer <= 0) {

                const amount = this.isElite
                    ? C.ELITE_HEAL_AMOUNT
                    : C.HEAL_AMOUNT;

                this.healTarget.hp = Math.min(
                    this.healTarget.maxHp,
                    this.healTarget.hp + amount
                );

                Particle.createHitBurst(
                    this.healTarget.x + this.healTarget.size / 2,
                    this.healTarget.y + this.healTarget.size / 2
                );

                this.healTarget = null;
                this.healCooldown = C.HEAL_COOLDOWN;

            }

            return;

        }

        if (this.healCooldown > 0) {

            this.healCooldown -= Game.dt;

            return;

        }

        // Most-injured ally by missing-HP fraction.
        let best = null;
        let bestRatio = 1;

        Game.enemies.forEach(enemy => {

            if (!this.isValidAlly(enemy) || enemy.hp >= enemy.maxHp)
                return;

            const ratio = enemy.hp / enemy.maxHp;

            if (ratio < bestRatio) {

                bestRatio = ratio;
                best = enemy;

            }

        });

        if (best) {

            this.healTarget = best;
            this.channelTimer = C.CHANNEL_TIME;

            return;

        }

        // Nobody's hurt - ward the nearest unwarded ally
        // instead.
        let nearest = null;
        let nearestDist = C.WARD_RANGE;

        Game.enemies.forEach(enemy => {

            if (!this.isValidAlly(enemy) || enemy.wardShield)
                return;

            const dist = Math.hypot(
                enemy.x - this.x,
                enemy.y - this.y
            );

            if (dist < nearestDist) {

                nearestDist = dist;
                nearest = enemy;

            }

        });

        if (nearest) {

            nearest.wardShield = true;

            Particle.createHitBurst(
                nearest.x + nearest.size / 2,
                nearest.y + nearest.size / 2
            );

        }

        // Short retry beat either way so it re-evaluates soon
        // without scanning every frame.
        this.healCooldown = C.RETRY_BEAT;

    }

    draw() {

        // Channel tether under the bodies.
        if (this.healTarget) {

            const sx = this.x + this.size / 2;
            const sy = this.y + this.size / 2;
            const tx = this.healTarget.x + this.healTarget.size / 2;
            const ty = this.healTarget.y + this.healTarget.size / 2;

            const pulse = 0.5 + Math.sin(Date.now() / 80) * 0.25;

            ctx.save();

            ctx.strokeStyle = `rgba(200, 30, 40, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#c01828";

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // Glow on the recipient.
            ctx.strokeStyle = `rgba(220, 60, 60, ${pulse})`;
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(tx, ty, this.healTarget.size * 0.7, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();

        }

        super.draw();

        // Dark red sigil on the bone-white robes.
        ctx.save();

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const arm = this.size * 0.28;

        ctx.fillStyle = "#8b1520";
        ctx.fillRect(cx - arm, cy - 4, arm * 2, 8);
        ctx.fillRect(cx - 4, cy - arm, 8, arm * 2);

        ctx.restore();

    }

}
