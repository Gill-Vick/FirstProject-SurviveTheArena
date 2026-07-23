// =====================================
// Skeleton (Necromancer minion)
// =====================================

class Skeleton extends Enemy {

    constructor(x, y) {

        const gruntHp = 2 + Math.floor((Game.wave - 1) / 6);

        super(x, y, {

            size: ENEMY_TYPES.skeleton.SIZE,

            speed:
                ENEMY_TYPES.skeleton.SPEED *
                Game.enemySpeedMultiplier,

            hp: Math.max(1, Math.floor(gruntHp / 2)) + 1,

            color: ENEMY_TYPES.skeleton.COLOR

        });

        this.type = "skeleton";
        this.knockbackImmune = true;
        this.isMinion = true;

        // Elite dagger swing (only ever used when isElite -
        // see makeElite): "idle" | "windup" | "swing".
        this.daggerState = "idle";
        this.daggerTimer = 0;
        this.daggerCooldown = 0;
        this.daggerAngle = 0;

    }

    // Elites carry a small dagger: a short telegraphed swing
    // that extends their kill reach past plain body contact.
    // Normal skeletons keep the base contact-only behavior.
    attack() {

        if (!this.isElite)
            return;

        if (this.daggerCooldown > 0)
            this.daggerCooldown -= Game.dt;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const px = player.x + player.size / 2;
        const py = player.y + player.size / 2;

        const dist = Math.hypot(px - cx, py - cy);

        switch (this.daggerState) {

            case "idle":

                if (
                    this.daggerCooldown <= 0 &&
                    dist < ELITE.SKELETON_DAGGER_RANGE
                ) {

                    this.daggerState = "windup";
                    this.daggerTimer = ELITE.SKELETON_DAGGER_WINDUP;
                    this.daggerAngle = Math.atan2(py - cy, px - cx);

                }

                return;

            case "windup":

                this.daggerTimer -= Game.dt;

                if (this.daggerTimer <= 0) {

                    this.daggerState = "swing";
                    this.daggerTimer = ELITE.SKELETON_DAGGER_SWING;

                }

                return;

            case "swing": {

                this.daggerTimer -= Game.dt;

                // Active hitbox: within reach and roughly in
                // front of the locked swing direction.
                const angleTo = Math.atan2(py - cy, px - cx);

                let diff = Math.abs(angleTo - this.daggerAngle);

                if (diff > Math.PI)
                    diff = Math.PI * 2 - diff;

                if (
                    dist < ELITE.SKELETON_DAGGER_RANGE + player.size / 2 &&
                    diff < Math.PI / 2
                ) {

                    player.takeHit(ENEMY_LABELS.skeleton);

                }

                if (this.daggerTimer <= 0) {

                    this.daggerState = "idle";
                    this.daggerCooldown = ELITE.SKELETON_DAGGER_COOLDOWN;

                }

                return;

            }

        }

    }

    draw() {

        // Dagger telegraph/swing - drawn under the body so
        // the skull stays readable.
        if (this.daggerState !== "idle")
            this.drawDagger();

        super.draw();

        // Pixel skull on the body (was a 💀 emoji).
        drawPixelIcon(
            "skull",
            this.x + this.size / 2,
            this.y + this.size / 2,
            2,
            { color: "#2a2a2a", shadow: "rgba(255, 255, 255, 0.5)" }
        );

    }

    // Windup: dim arc telegraph raising the blade. Swing: the
    // blade sweeps across the locked arc.
    drawDagger() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const reach = ELITE.SKELETON_DAGGER_RANGE;

        // Half-circle pixel threat arc centered on the swing
        // direction, matching the hit test in attack().
        if (this.daggerState === "windup") {

            const urgency =
                1 - this.daggerTimer / ELITE.SKELETON_DAGGER_WINDUP;

            drawPixelSector(cx, cy, reach, this.daggerAngle, Math.PI / 2, {
                color: "#ff503c",
                alpha: 0.15 + urgency * 0.25,
                unit: Math.max(3, Math.round(reach * 0.09))
            });

        }

        // The blade: held at the arc's leading edge during
        // windup, sweeping across it during the swing. Drawn as
        // a run of pixel cells.
        const progress =
            this.daggerState === "swing"
                ? 1 - this.daggerTimer / ELITE.SKELETON_DAGGER_SWING
                : 0;

        const bladeAngle =
            this.daggerAngle - Math.PI / 2 + Math.PI * progress;

        const unit = 4;

        ctx.save();
        ctx.fillStyle = "#e8e8e8";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "white";

        for (let r = this.size * 0.4; r < reach * 0.8; r += unit) {

            ctx.fillRect(
                pxSnap(cx + Math.cos(bladeAngle) * r, unit),
                pxSnap(cy + Math.sin(bladeAngle) * r, unit),
                unit, unit
            );

        }

        ctx.restore();

    }

}