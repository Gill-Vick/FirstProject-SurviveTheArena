// =====================================
// Shade (Set 3)
// =====================================
//
// A living shadow that punishes tunnel vision. Walks in
// lazily, then on a cooldown: vanishes (untargetable),
// reappears BLINK_DISTANCE behind the player, telegraphs for
// a beat, and lunges. Sluggish for a moment after the lunge -
// that's the punish window.
//
// State machine: "walk" → "vanish" → "windup" → "lunge" →
// "recover" → back to "walk".

class Shade extends Enemy {

    constructor(x, y) {

        super(x, y, {

            size: ENEMY_TYPES.shade.SIZE,

            speed:
                ENEMY_TYPES.shade.SPEED *
                Game.enemySpeedMultiplier,

            hp: 3 + Math.floor((Game.wave - 1) / 8),

            color: ENEMY_TYPES.shade.COLOR

        });

        this.type = "shade";

        this.state = "walk";
        this.stateTimer = 0;
        this.teleportCooldown = ENEMY_TYPES.shade.TELEPORT_COOLDOWN;

        // Locked at the end of windup so the lunge commits to
        // a direction instead of homing.
        this.lungeDX = 0;
        this.lungeDY = 0;

    }

    // Untouchable mid-vanish - the dissolve is its defense.
    takeDamage(amount, crit = false) {

        if (this.state === "vanish")
            return;

        super.takeDamage(amount, crit);

    }

    move() {

        const S = ENEMY_TYPES.shade;

        this.stateTimer -= Game.dt;

        switch (this.state) {

            case "walk":

                this.teleportCooldown -= Game.dt;

                if (this.teleportCooldown <= 0) {

                    this.state = "vanish";
                    this.stateTimer = S.VANISH_DURATION;

                    return;

                }

                super.move();

                return;

            case "vanish":

                if (this.stateTimer <= 0) {

                    this.blinkBehindPlayer();

                    this.state = "windup";
                    this.stateTimer = S.WINDUP_DURATION;

                }

                return;

            case "windup":

                if (this.stateTimer <= 0) {

                    // Lock the lunge direction at the player's
                    // position right now.
                    const dx = player.x + player.size / 2 - (this.x + this.size / 2);
                    const dy = player.y + player.size / 2 - (this.y + this.size / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    this.lungeDX = dx / dist;
                    this.lungeDY = dy / dist;

                    this.state = "lunge";
                    this.stateTimer = S.LUNGE_DURATION * (1000 / 60);

                }

                return;

            case "lunge":

                this.x += this.lungeDX * S.LUNGE_SPEED * Game.timeScale;
                this.y += this.lungeDY * S.LUNGE_SPEED * Game.timeScale;

                if (this.stateTimer <= 0) {

                    this.state = "recover";
                    this.stateTimer = S.RECOVER_DURATION;

                }

                return;

            case "recover":

                if (this.stateTimer <= 0) {

                    this.state = "walk";
                    this.teleportCooldown = S.TELEPORT_COOLDOWN;

                    return;

                }

                // Sluggish drift toward the player - the
                // punish window.
                {
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    this.x += (dx / dist) * this.speed * 0.4 * Game.timeScale;
                    this.y += (dy / dist) * this.speed * 0.4 * Game.timeScale;
                }

                return;

        }

    }

    blinkBehindPlayer() {

        const S = ENEMY_TYPES.shade;

        // "Behind" = directly opposite where the player is
        // aiming. aimAngle is the global updated in input.js.
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        let x = px - Math.cos(aimAngle) * S.BLINK_DISTANCE - this.size / 2;
        let y = py - Math.sin(aimAngle) * S.BLINK_DISTANCE - this.size / 2;

        // Never blink off-screen - clamp inside a small margin
        // so the telegraph is always visible.
        x = Math.max(10, Math.min(canvas.width - this.size - 10, x));
        y = Math.max(10, Math.min(canvas.height - this.size - 10, y));

        this.x = x;
        this.y = y;

    }

    checkPlayerCollision() {

        // No contact damage while dissolved.
        if (this.state === "vanish")
            return;

        super.checkPlayerCollision();

    }

    draw() {

        if (this.state === "vanish")
            return;

        // Windup telegraph - a tightening purple ring, the
        // "it's behind you" warning.
        if (this.state === "windup") {

            const S = ENEMY_TYPES.shade;
            const progress = 1 - this.stateTimer / S.WINDUP_DURATION;
            const radius = this.size * (1.6 - progress * 0.7);

            ctx.save();

            ctx.strokeStyle = `rgba(150, 80, 220, ${0.35 + progress * 0.5})`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#9932cc";

            ctx.beginPath();
            ctx.arc(
                this.x + this.size / 2,
                this.y + this.size / 2,
                radius,
                0,
                Math.PI * 2
            );
            ctx.stroke();

            ctx.restore();

        }

        // Fainter body during recover so the punish window
        // reads visually.
        if (this.state === "recover")
            ctx.globalAlpha = 0.65;

        super.draw();

        ctx.globalAlpha = 1;

        // Purple eye slits over the near-black body.
        ctx.save();

        ctx.fillStyle = "#b06ae0";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#9932cc";

        const cx = this.x + this.size / 2;
        const eyeY = this.y + this.size * 0.35;

        ctx.fillRect(cx - 9, eyeY, 6, 3);
        ctx.fillRect(cx + 3, eyeY, 6, 3);

        ctx.restore();

    }

}
