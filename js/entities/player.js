// =====================================
// Player Base Class
// =====================================
//
// Shared chassis for every playable class (see
// entities/warrior.js and entities/ranger.js, and the
// CLASSES list in constants.js). Only the systems every
// class uses live here: movement, sprite animation, the
// dash, invulnerability frames, screen clamping, and the
// body sprite draw. Each class's kit (weapons, items,
// abilities) lives entirely in its subclass - startGame()
// instantiates the right one from PLAYER_CLASSES based on
// Save.selectedClass.

class Player {

    constructor() {

        this.x = canvas.width / 2;
        this.y = canvas.height / 2;

        this.size = PLAYER.SIZE;

        this.speed = PLAYER.SPEED * this.getSpeedMultiplier();

        this.color = PLAYER.COLOR;

        // Sprite animation
        this.frameIndex = PLAYER.SPRITE_IDLE_FRAME;
        this.frameTimer = 0;

        // Dash

        this.dashCooldowns = [0, 0];

        this.invulnTimer = 0;

    }

    // =====================================
    // Class Hooks
    // =====================================
    //
    // Overridden by Warrior/Ranger. Base implementations are
    // safe no-ops so shared systems (input.js, mobile.js,
    // projectile.js, ui.js) can call them without caring
    // which class is in play.

    // Flat movement speed multiplier applied at spawn time
    // (e.g. the Warrior's Windrunner Anklet).
    getSpeedMultiplier() { return 1; }

    // Live movement speed, recomputed every frame - lets a
    // class layer a temporary buff on top of the base `speed`
    // set at spawn (e.g. Thief's Wit). Defaults to the static
    // spawn-time value so classes without a dynamic buff pay
    // nothing extra.
    getCurrentSpeed() { return this.speed; }

    // How many dash charges are available (e.g. 2 with the
    // Warrior's Hermes Shoes).
    getDashSlotCount() { return 1; }

    // Cooldown applied to a dash charge after it's used (e.g.
    // reduced by the Thief's Cloak).
    getDashCooldown() { return DASH.COOLDOWN; }

    // Per-frame kit updates (weapon cooldowns, DoTs, etc.) -
    // runs between updateDash() and updateInvuln().
    updateAbilities() {}

    // [E] key / mobile ability button.
    onAbilityKey() {}

    // Right-click / mobile secondary button.
    onSecondaryFire() {}

    // Fires after a dash charge is spent and the player has
    // been moved. (dx, dy) is the normalized dash direction,
    // (startX, startY) the pre-dash top-left position.
    onDash(dx, dy, startX, startY) {}

    // Class-specific defenses (e.g. the Warrior's shield).
    // Return true if the hit was absorbed.
    absorbHit() { return false; }

    // A player-owned projectile landed on an enemy (see
    // projectile.js) - on-hit effects go here. `damage` is how
    // much was actually dealt by that hit (post-crit/marks),
    // for hooks that need to track it (e.g. the Thief's Void
    // Enchant).
    onProjectileHit(enemy, damage) {}

    // Damage multiplier applied to player-owned projectiles
    // against this specific enemy (e.g. Hunter's Mark).
    getProjectileDamageMultiplier(enemy) { return 1; }

    // True while this class projects an aura that slows
    // incoming enemy projectiles (the Mage's Amberlight
    // Field). Read every frame by Projectile.update.
    hasProjectileSlowAura() { return false; }

    // Glow color for the body sprite, or null for none.
    getBodyGlowColor() { return null; }

    // Kit status lines for the HUD - array of
    // { text, color } objects (see drawHUD in ui.js).
    getHUDStatusLines() { return []; }

    // Mobile ability/secondary button visibility + labels
    // (see updateMobileUIVisibility in mobile.js).
    hasAbilityButton() { return false; }
    getAbilityButtonLabel() { return ""; }
    hasSecondaryButton() { return false; }
    getSecondaryButtonLabel() { return ""; }

    // =====================================
    // Update
    // =====================================

    update() {

        this.updateMovement();

        this.updateAnimation();

        this.updateDash();

        this.updateAbilities();

        this.updateInvuln();

        this.keepOnScreen();

    }

    updateInvuln() {

        if (this.invulnTimer > 0)
            this.invulnTimer -= Game.dt;

    }

    takeHit(source = "an unknown enemy") {

        // Custom-mode cheat, toggled from the pause menu.
        if (Game.immortal)
            return false;

        // Already dying - the slow-mo window shouldn't record
        // a second killer or restart itself.
        if (Game.dying)
            return false;

        if (this.invulnTimer > 0)
            return false;

        // Class-specific defenses (e.g. the Warrior's
        // shield) get first refusal on the hit.
        if (this.absorbHit())
            return false;

        Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

        // Don't cut straight to the game over screen - run the
        // sim in slow motion for a beat so the killing blow is
        // actually seen. finishPlayerDeath() (game.js) flips
        // the state when the window expires (main.js ticks it).
        Game.dying = true;
        Game.dyingTimer = DEATH_SLOWMO.DURATION_MS;

        // The death sting carries the moment; the music bed
        // fades out under it (the router deliberately doesn't
        // start anything new while in "gameover").
        Sound.play("gameOver");
        Sound.stopMusic({ fade: 1000 });

        Game.killedBy = source;

        return true;

    }

    // =====================================
    // Movement
    // =====================================

    // 1 normally, SLOW_FACTOR while standing in any Frost
    // Weaver zone (see FrostZone in hazard.js). Applies to
    // both walking and dash distance.
    getFrostMultiplier() {

        const inFrost = Game.hazards.some(
            h => h.slowsPlayer && h.containsPlayer()
        );

        return inFrost
            ? ENEMY_TYPES.frostWeaver.SLOW_FACTOR
            : 1;

    }

    updateMovement() {

        const speed = this.getCurrentSpeed() * this.getFrostMultiplier();

        // Build the full input vector first, then clamp its
        // magnitude to 1 - holding W+D used to move the player
        // sqrt(2) (~41%) faster than holding W alone. Only
        // clamped (not always normalized) so an analog joystick
        // tilted gently still walks at partial speed.
        let dx = 0;
        let dy = 0;

        if (keys["w"]) dy -= 1;
        if (keys["s"]) dy += 1;
        if (keys["a"]) dx -= 1;
        if (keys["d"]) dx += 1;

        // Mobile joystick input - purely additive on top of
        // the WASD checks above. MobileInput.active is only
        // ever true on a touch device, and moveX/moveY sit at
        // 0 whenever the stick isn't being held, so this is a
        // no-op on desktop and doesn't change PC movement feel.
        if (typeof MobileInput !== "undefined" && MobileInput.active) {

            dx += MobileInput.moveX;
            dy += MobileInput.moveY;

        }

        const magnitude = Math.hypot(dx, dy);

        if (magnitude > 1) {

            dx /= magnitude;
            dy /= magnitude;

        }

        this.x += dx * speed * Game.timeScale;
        this.y += dy * speed * Game.timeScale;

    }

    keepOnScreen() {

        this.x = Math.max(
            0,
            Math.min(
                canvas.width - this.size,
                this.x
            )
        );

        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.size,
                this.y
            )
        );

    }

    // =====================================
    // Sprite Animation
    // =====================================

    updateAnimation() {

        const moving =
            keys["w"] || keys["s"] ||
            keys["a"] || keys["d"] ||
            (

                typeof MobileInput !== "undefined" &&
                MobileInput.active &&
                (MobileInput.moveX !== 0 || MobileInput.moveY !== 0)

            );

        if (!moving) {

            this.frameIndex = PLAYER.SPRITE_IDLE_FRAME;
            this.frameTimer = 0;

            return;

        }

        this.frameTimer += Game.dt;

        if (this.frameTimer >= PLAYER.SPRITE_FRAME_DURATION) {

            this.frameTimer -= PLAYER.SPRITE_FRAME_DURATION;

            this.frameIndex =
                (this.frameIndex + 1) % PLAYER.SPRITE_FRAME_COUNT;

        }

    }

    // =====================================
    // Dash
    // =====================================

    updateDash() {

        const slots = this.getDashSlotCount();

        for (let i = 0; i < slots; i++) {

            if (this.dashCooldowns[i] > 0)
                this.dashCooldowns[i] -= Game.dt;

        }

    }

    dash() {

        const slots = this.getDashSlotCount();

        for (let i = 0; i < slots; i++) {

            if (this.dashCooldowns[i] > 0)
                continue;

            let dx = 0;
            let dy = 0;

            if (keys["w"]) dy = -1;
            if (keys["s"]) dy = 1;
            if (keys["a"]) dx = -1;
            if (keys["d"]) dx = 1;

            // Touch users don't have a keyboard - if no WASD
            // is held, fall back to whatever direction the
            // mobile movement joystick is currently pointing.
            // Desktop is untouched since MobileInput.active is
            // only true on a touch device.
            if (

                dx === 0 && dy === 0 &&
                typeof MobileInput !== "undefined" &&
                MobileInput.active

            ) {

                dx = MobileInput.moveX;
                dy = MobileInput.moveY;

            }

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0)
                return;

            dx /= distance;
            dy /= distance;

            // The second dash charge (index 1, Hermes Shoes)
            // covers only 60% of a normal dash's distance.
            // Frost zones shorten the dash the same way they
            // slow walking.
            const dashDistance =
                (i === 1
                    ? DASH.DISTANCE * 0.6
                    : DASH.DISTANCE) * this.getFrostMultiplier();

            const startX = this.x;
            const startY = this.y;

            this.x += dx * dashDistance;
            this.y += dy * dashDistance;

            this.dashCooldowns[i] = this.getDashCooldown();

            // A hair of grace on every dash - dashing INTO a
            // projectile you were dodging shouldn't be a death.
            // Max, not assignment, so it never trims a longer
            // shield/cloak invulnerability already running.
            this.invulnTimer = Math.max(this.invulnTimer, DASH.GRACE_MS);

            // Ghost trail along the dash line so the teleport
            // reads as movement (see DashAfterimage).
            DashAfterimage.createTrail(
                startX, startY,
                this.x, this.y,
                this.size,
                this.frameIndex,
                aimAngle
            );

            Sound.play("dash");

            this.onDash(dx, dy, startX, startY);

            return;

        }

    }

    // =====================================
    // Drawing
    // =====================================
    //
    // Subclasses draw their weapons around this - the default
    // draw() is just the body, and drawBody() stays callable
    // so a subclass can layer things under/over it.

    draw() {

        this.drawBody();

    }

    drawBody() {

        if (this.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0)
            ctx.globalAlpha = 0.55;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const drawSize = this.size * PLAYER.VISUAL_SCALE;

        ctx.save();

        const glow = this.getBodyGlowColor();

        if (glow) {

            ctx.shadowBlur = EFFECTS.PLAYER_GLOW;
            ctx.shadowColor = glow;

        }

        ctx.translate(cx, cy);
        ctx.rotate(aimAngle + PLAYER.SPRITE_ROTATION_OFFSET);

        if (playerSprite.complete && playerSprite.naturalWidth > 0) {

            ctx.drawImage(

                playerSprite,

                this.frameIndex * PLAYER.SPRITE_FRAME_SIZE,
                0,
                PLAYER.SPRITE_FRAME_SIZE,
                PLAYER.SPRITE_FRAME_SIZE,

                -drawSize / 2,
                -drawSize / 2,
                drawSize,
                drawSize

            );

        } else {

            // Fallback while the sprite sheet is still loading
            ctx.fillStyle = this.color;
            ctx.fillRect(
                -this.size / 2,
                -this.size / 2,
                this.size,
                this.size
            );

        }

        ctx.restore();

        ctx.globalAlpha = 1;

    }

}
