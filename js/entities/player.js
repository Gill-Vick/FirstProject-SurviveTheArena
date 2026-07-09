// =====================================
// Player Class
// =====================================

class Player {

    constructor() {

        this.x = canvas.width / 2;
        this.y = canvas.height / 2;

        this.size = PLAYER.SIZE;

        this.speed = PLAYER.SPEED * (
            Save.isEquipped("windrunnerBoots")
                ? WINDRUNNER.SPEED_MULTIPLIER
                : 1
        );

        this.color = PLAYER.COLOR;

        // Sprite animation
        this.frameIndex = PLAYER.SPRITE_IDLE_FRAME;
        this.frameTimer = 0;

        // Sword

        this.swordSwing = false;
        this.swordAngle = 0;
        this.swordTimer = 0;
        this.swingProgress = 0;

        // Dash

        this.dashCooldowns = [0, 0];

        this.shieldActive = Save.isEquipped("shield");

        this.invulnTimer = 0;

        // Phoenix Feather - one revive per run, consumed the
        // moment it's used (see takeHit()).
        this.phoenixUsed = false;

        // Bow

        this.bowCooldown = 0;

        // King's Blade laser (right-click ability)

        this.kingsBladeCooldown = 0;
        this.kingsBladeLaserTimer = 0;
        this.kingsBladeLaserAngle = 0;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.updateMovement();

        this.updateAnimation();

        this.updateDash();

        this.updateBow();

        this.updateKingsBlade();

        // Hold-to-swing checking system triggers auto attacks safely
        if (isMouseDown && Game.state === "playing") {
            this.swingSword();
        }

        this.updateSword();

        this.updateInvuln();

        this.keepOnScreen();

    }

    updateInvuln() {

        if (this.invulnTimer > 0)
            this.invulnTimer -= Game.dt;

    }

    takeHit(source = "an unknown enemy") {

        if (this.invulnTimer > 0)
            return false;

        if (this.shieldActive) {

            if (Save.getOnyxShieldActive()) {
                this.triggerNuke();
            }

            this.shieldActive = false;

            this.invulnTimer = SHIELD.INVULN_MS;

            Game.screenShake = EFFECTS.SHAKE_ON_KILL;

            return false;

        }

        if (Save.isEquipped("phoenixFeather") && !this.phoenixUsed) {

            this.phoenixUsed = true;

            this.invulnTimer = PHOENIX.INVULN_MS;

            Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

            Particle.createHitBurst(
                this.x + this.size / 2,
                this.y + this.size / 2
            );

            return false;

        }

        Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

        Game.state = "gameover";

        Game.killedBy = source;

        return true;

    }

    triggerNuke() {
        // Damage all enemies currently on screen and clear kill state correctly
        Game.enemies.forEach(enemy => {
            enemy.takeDamage(SHIELD.ONYX_DAMAGE); 
            if (enemy.isDead()) {
                onEnemyKilled(enemy);
            }
        });
    }

    getSwordDamage() {

        const base = Save.isEquipped("kingsBlade")
            ? KINGS_BLADE.BASE_DAMAGE
            : SWORD.DAMAGE;

        const wetstoneBonus = Save.isEquipped("wetStone")
            ? (Save.isEquipped("kingsBlade") ? KINGS_BLADE.WETSTONE_BONUS : SWORD.WETSTONE_BONUS)
            : 0;

        return base + wetstoneBonus;

    }

    getSwordLength() {

        return Save.isEquipped("kingsBlade")
            ? KINGS_BLADE.LENGTH
            : SWORD.LENGTH;

    }

    getSwordArc() {

        return Save.isEquipped("circleStrike")
            ? Math.PI * 2
            : SWORD.ARC;

    }

    // =====================================
    // Movement
    // =====================================

    updateMovement() {

        if (keys["w"])
            this.y -= this.speed * Game.timeScale;

        if (keys["s"])
            this.y += this.speed * Game.timeScale;

        if (keys["a"])
            this.x -= this.speed * Game.timeScale;

        if (keys["d"])
            this.x += this.speed * Game.timeScale;

        // Mobile joystick input - purely additive on top of
        // the WASD checks above. MobileInput.active is only
        // ever true on a touch device, and moveX/moveY sit at
        // 0 whenever the stick isn't being held, so this is a
        // no-op on desktop and doesn't change PC movement feel.
        if (typeof MobileInput !== "undefined" && MobileInput.active) {

            this.x += MobileInput.moveX * this.speed * Game.timeScale;
            this.y += MobileInput.moveY * this.speed * Game.timeScale;

        }

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

        const slots = Save.isEquipped("hermesShoes") ? 2 : 1;

        for (let i = 0; i < slots; i++) {

            if (this.dashCooldowns[i] > 0)
                this.dashCooldowns[i] -= Game.dt;

        }

    }

    dash() {

        const slots = Save.isEquipped("hermesShoes") ? 2 : 1;

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

            // The Hermes Shoes' second charge (index 1) covers
            // only 60% of a normal dash's distance.
            const dashDistance =
                i === 1
                    ? DASH.DISTANCE * 0.6
                    : DASH.DISTANCE;

            this.x += dx * dashDistance;
            this.y += dy * dashDistance;

            this.dashCooldowns[i] = DASH.COOLDOWN;

            return;

        }

    }

    // =====================================
    // Bow
    // =====================================

    updateBow() {

        if (this.bowCooldown > 0)
            this.bowCooldown -= Game.dt;

    }

    fireBow() {

        if (!Save.isEquipped("bow"))
            return;

        if (this.bowCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const arrowCount = Save.getBowArrowCount();
        const spread = BOW.FAN_SPREAD;
        const startAngle = aimAngle - (arrowCount - 1) * spread / 2;

        for (let i = 0; i < arrowCount; i++) {

            const angle = startAngle + i * spread;

            const critical = Math.random() < Save.getEquippedCritChance();
            const damage = critical ? BOW.DAMAGE * 2 : BOW.DAMAGE;

            Game.projectiles.push(new Projectile(

                cx + Math.cos(angle) * 28,
                cy + Math.sin(angle) * 28,
                angle,

                {
                    owner: "player",
                    speed: BOW.SPEED,
                    damage: damage,
                    size: BOW.SIZE,
                    color: BOW.COLOR,
                    life: 120,
                    crit: critical,
                    isArrow: true
                }

            ));

        }

        this.bowCooldown = BOW.COOLDOWN;

    }

    // =====================================
    // King's Blade Laser (right-click ability)
    // =====================================

    updateKingsBlade() {

        if (this.kingsBladeCooldown > 0)
            this.kingsBladeCooldown -= Game.dt;

        if (this.kingsBladeLaserTimer > 0)
            this.kingsBladeLaserTimer -= Game.dt;

    }

    fireKingsBladeLaser() {

        if (!Save.isEquipped("kingsBlade"))
            return;

        if (this.kingsBladeCooldown > 0)
            return;

        this.kingsBladeCooldown = KINGS_BLADE.LASER_COOLDOWN;
        this.kingsBladeLaserAngle = aimAngle;
        this.kingsBladeLaserTimer = KINGS_BLADE.LASER_DURATION;

        const critical = Math.random() < Save.getEquippedCritChance();
        const damage = critical
            ? KINGS_BLADE.LASER_DAMAGE * 2
            : KINGS_BLADE.LASER_DAMAGE;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        // Long enough to clear the map in any direction from
        // any position - same trick used by the King's beam.
        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const halfWidth = KINGS_BLADE.LASER_WIDTH / 2;

        const cos = Math.cos(-this.kingsBladeLaserAngle);
        const sin = Math.sin(-this.kingsBladeLaserAngle);

        Game.enemies.forEach(enemy => {

            const ex = enemy.x + enemy.size / 2;
            const ey = enemy.y + enemy.size / 2;

            const dx = ex - cx;
            const dy = ey - cy;

            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            const pad = enemy.size / 2;

            if (

                localX >= -pad &&
                localX <= length + pad &&
                Math.abs(localY) <= halfWidth + pad

            ) {

                enemy.takeDamage(damage, critical);

                enemy.applyKnockback(cx, cy, critical ? 16 : 12);

                if (enemy.isDead())
                    onEnemyKilled(enemy);

            }

        });

    }

    // =====================================
    // Sword
    // =====================================

    swingSword() {

        if (this.swordSwing)
            return;

        this.swordSwing = true;

        this.swordTimer = SWORD.DURATION;

        this.swingProgress = 0;

        this.swordAngle = aimAngle;

        Game.enemies.forEach(enemy => {

            enemy.hitThisSwing = false;

        });

    }

    updateSword() {

        if (!this.swordSwing)
            return;

        this.swordTimer -= Game.timeScale;

        this.swingProgress =
            1 - (this.swordTimer / SWORD.DURATION);

        this.attackEnemies();

        if (this.swordTimer <= 0)
            this.swordSwing = false;

    }

    // =====================================
    // Combat
    // =====================================
    //
    // No more manual splice() here - a hit
    // enemy is just flagged dead via takeDamage().
    // Game.cleanupEntities() removes it after
    // the update pass, so nothing gets skipped.

    attackEnemies() {
        Game.enemies.forEach(enemy => {
            if (enemy.hitThisSwing)
                return;

            // Player Center
            const playerCenterX = this.x + this.size / 2;
            const playerCenterY = this.y + this.size / 2;

            // Find the closest point on the enemy box to the player
            const closestX = Math.max(enemy.x, Math.min(playerCenterX, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(playerCenterY, enemy.y + enemy.size));

            // Calculate vector and distance to that closest point
            const dx = closestX - playerCenterX;
            const dy = closestY - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If the sword tip doesn't reach the closest edge/corner, it's a miss
            if (distance > this.getSwordLength())
                return;

            // Use the angle to this closest intersection point for the arc calculation
            const angleToEnemy = Math.atan2(dy, dx);

            const arc = this.getSwordArc();

            const currentAngle =
                this.swordAngle -
                arc / 2 +
                arc * this.swingProgress;

            let angleDifference = Math.abs(angleToEnemy - currentAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            // Check if the sword arc overlaps our target angle
            if (angleDifference < 0.5) {
                const critical = Math.random() < Save.getEquippedCritChance();
                const base = this.getSwordDamage();
                const damage = critical ? base * 2 : base;

                enemy.takeDamage(damage, critical);

                enemy.applyKnockback(
                    playerCenterX,
                    playerCenterY,
                    critical ? 18 : 12
                );

                enemy.hitThisSwing = true;

                if (enemy.isDead())
                    onEnemyKilled(enemy);
            }
        });
    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

        if (this.kingsBladeLaserTimer > 0)
            this.drawKingsBladeLaser();

        if (this.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0)
            ctx.globalAlpha = 0.55;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;
        const drawSize = this.size * PLAYER.VISUAL_SCALE;

        ctx.save();

        if (this.shieldActive) {

            ctx.shadowBlur = EFFECTS.PLAYER_GLOW;
            ctx.shadowColor = SHIELD.OUTLINE_COLOR;

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

        this.drawSword();

    }

    drawSword() {
        if (!this.swordSwing)
            return;
    
        ctx.save();
    
        // Move origin to the player's center
        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );
    
        const trailLag = 0.15;
        const prevProgress = Math.max(0, this.swingProgress - trailLag);

        const arc = this.getSwordArc();
        const currentAngle = this.swordAngle - arc / 2 + arc * this.swingProgress;
        const previousAngle = this.swordAngle - arc / 2 + arc * prevProgress;
        const angleDiff = currentAngle - previousAngle;
    
        const bladeLength = this.getSwordLength();
        const kingsBlade = Save.isEquipped("kingsBlade");
    
        // =====================================
        // 1. THE SHARP TRAIL
        // =====================================
        if (angleDiff > 0) {
            ctx.save();
            ctx.rotate(currentAngle);
    
            // Gradient for the trail so it fades out smoothly into the past
            let trailGrad = ctx.createRadialGradient(0, 0, bladeLength * 0.4, 0, 0, bladeLength);

            if (kingsBlade) {

                trailGrad.addColorStop(0, "rgba(255, 204, 0, 0)");
                trailGrad.addColorStop(0.85, "rgba(255, 204, 0, 0.18)");
                trailGrad.addColorStop(1, "rgba(255, 240, 200, 0.4)");

            } else {

                trailGrad.addColorStop(0, "rgba(0, 255, 255, 0)");
                trailGrad.addColorStop(0.85, "rgba(0, 255, 255, 0.15)");
                trailGrad.addColorStop(1, "rgba(255, 255, 255, 0.4)");

            }
    
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.moveTo(bladeLength - 5, 0);
            ctx.arc(0, 0, bladeLength - 5, 0, -angleDiff, true);
            ctx.lineTo(bladeLength - 35, 0); 
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    
        // Rotate to current angle for the physical sword
        ctx.rotate(currentAngle);

        if (kingsBlade)
            this.drawKingsBladeBlade(bladeLength);
        else
            this.drawBaseSwordBlade(bladeLength);
    
        ctx.restore();
    }

    // The original sword: cyan energy-core shortsword.
    drawBaseSwordBlade(bladeLength) {

        // =====================================
        // 2. THE ENERGY GLOW (Rendered underneath)
        // =====================================
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";
        ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
        ctx.beginPath();
        // A sleek, thin energy core running down the blade
        ctx.moveTo(20, -1);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.lineTo(20, 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    
        // =====================================
        // 3. HIGH-QUALITY METAL BLADE (Tapered & Sharp)
        // =====================================
        // Metallic sleek gradient
        const wet = Save.isEquipped("wetStone");

        let metalGrad = ctx.createLinearGradient(0, -6, 0, 6);
        metalGrad.addColorStop(0, wet ? "#d5e8f0" : "#ffffff");
        metalGrad.addColorStop(0.3, wet ? "#7eb8c9" : "#bdc3c7");
        metalGrad.addColorStop(0.5, wet ? "#4a90a4" : "#95a5a6");
        metalGrad.addColorStop(1, wet ? "#2c5f6e" : "#7f8c8d");
    
        ctx.fillStyle = metalGrad;
        ctx.beginPath();
        ctx.moveTo(20, -5);               // Base top
        ctx.lineTo(bladeLength - 15, -2); // Tapering top
        ctx.lineTo(bladeLength, 0);       // Ultra-sharp point tip
        ctx.lineTo(bladeLength - 15, 2);  // Tapering bottom
        ctx.lineTo(20, 5);                // Base bottom
        ctx.closePath();
        ctx.fill();
    
        // Center blade ridge line for 3D depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.stroke();
    
        // =====================================
        // 4. THE CROSSGUARD & HILT
        // =====================================
        // Sleek metallic crossguard
        ctx.fillStyle = "#34495e";
        ctx.fillRect(16, -10, 5, 20);
    
        // Leather wrapped handle
        ctx.fillStyle = "#5c4033";
        ctx.fillRect(0, -3, 16, 6);
    
        // Steel Pommel (end cap)
        ctx.fillStyle = "#bdc3c7";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

    }

    // King's Blade: same gold-and-crimson greatsword look as
    // the King's own weapon, just scaled down to human size.
    drawKingsBladeBlade(bladeLength) {

        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffcc00";

        let grad = ctx.createLinearGradient(0, -6, 0, 6);
        grad.addColorStop(0, "#f7f2e0");
        grad.addColorStop(0.25, "#e0d29a");
        grad.addColorStop(0.5, "#8b0000");
        grad.addColorStop(0.75, "#e0d29a");
        grad.addColorStop(1, "#2c2416");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(16, -6);
        ctx.lineTo(bladeLength - 18, -3);
        ctx.lineTo(bladeLength, 0);
        ctx.lineTo(bladeLength - 18, 3);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Center ridge for depth
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(bladeLength - 10, 0);
        ctx.stroke();

        // Gold crossguard
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(11, -11, 5, 22);

        // Wrapped hilt
        ctx.fillStyle = "#3a1a1a";
        ctx.fillRect(0, -3, 11, 6);

        // Pommel jewel
        ctx.fillStyle = "#8b0000";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

    }

    drawKingsBladeLaser() {

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        const length = Math.hypot(canvas.width, canvas.height) * 1.2;
        const width = KINGS_BLADE.LASER_WIDTH;

        const fade = Math.max(
            0,
            this.kingsBladeLaserTimer / KINGS_BLADE.LASER_DURATION
        );

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.kingsBladeLaserAngle);

        ctx.shadowBlur = 20;
        ctx.shadowColor = KINGS_BLADE.LASER_COLOR;

        const grad = ctx.createLinearGradient(0, -width / 2, 0, width / 2);
        grad.addColorStop(0, "rgba(0, 191, 255, 0)");
        grad.addColorStop(0.5, `rgba(200, 245, 255, ${0.95 * fade})`);
        grad.addColorStop(1, "rgba(0, 191, 255, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(0, -width / 2, length, width);

        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
        ctx.fillRect(0, -width * 0.12, length, width * 0.24);

        ctx.restore();

    }

}