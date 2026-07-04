// =====================================
// Player Class
// =====================================

class Player {

    constructor() {

        this.x = canvas.width / 2;
        this.y = canvas.height / 2;

        this.size = PLAYER.SIZE;
        this.speed = PLAYER.SPEED;
        this.color = PLAYER.COLOR;

        // Sword

        this.swordSwing = false;
        this.swordAngle = 0;
        this.swordTimer = 0;
        this.swingProgress = 0;

        // Dash

        this.dashCooldowns = [0, 0];

        this.shieldActive = Save.inventory.shield;

        this.invulnTimer = 0;

        // Bow

        this.bowCooldown = 0;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.updateMovement();

        this.updateDash();

        this.updateBow();

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

            this.shieldActive = false;

            this.invulnTimer = SHIELD.INVULN_MS;

            Game.screenShake = EFFECTS.SHAKE_ON_KILL;

            return false;

        }

        Game.screenShake = EFFECTS.SHAKE_ON_DEATH;

        Game.state = "gameover";

        Game.killedBy = source;

        return true;

    }

    getSwordDamage() {

        return Save.inventory.wetStone
            ? SWORD.DAMAGE_UPGRADED
            : SWORD.DAMAGE;

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
    // Dash
    // =====================================

    updateDash() {

        const slots = Save.inventory.hermesShoes ? 2 : 1;

        for (let i = 0; i < slots; i++) {

            if (this.dashCooldowns[i] > 0)
                this.dashCooldowns[i] -= Game.dt;

        }

    }

    dash() {

        const slots = Save.inventory.hermesShoes ? 2 : 1;

        for (let i = 0; i < slots; i++) {

            if (this.dashCooldowns[i] > 0)
                continue;

            let dx = 0;
            let dy = 0;

            if (keys["w"]) dy = -1;
            if (keys["s"]) dy = 1;
            if (keys["a"]) dx = -1;
            if (keys["d"]) dx = 1;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0)
                return;

            dx /= distance;
            dy /= distance;

            this.x += dx * DASH.DISTANCE;
            this.y += dy * DASH.DISTANCE;

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

        if (!Save.inventory.bow)
            return;

        if (this.bowCooldown > 0)
            return;

        const cx = this.x + this.size / 2;
        const cy = this.y + this.size / 2;

        Game.projectiles.push(new Projectile(

            cx + Math.cos(aimAngle) * 28,
            cy + Math.sin(aimAngle) * 28,
            aimAngle,

            {
                owner: "player",
                speed: BOW.SPEED,
                damage: BOW.DAMAGE,
                size: BOW.SIZE,
                color: BOW.COLOR,
                life: 120
            }

        ));

        this.bowCooldown = BOW.COOLDOWN;

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

            if (enemy.type === "king" && enemy.slashing && !enemy.slashParried) {

                if (enemy.checkParry()) {

                    enemy.triggerParry();
                    return;

                }

            }

            // Player Center
            const playerCenterX = this.x + this.size / 2;
            const playerCenterY = this.y + this.size / 2;

            // =========================================================
            // NEW: Find the closest point on the enemy box to the player
            // =========================================================
            // This clamps the player's center coordinates inside the enemy's 
            // structural rectangle footprint to find the exact closest point of impact.
            const closestX = Math.max(enemy.x, Math.min(playerCenterX, enemy.x + enemy.size));
            const closestY = Math.max(enemy.y, Math.min(playerCenterY, enemy.y + enemy.size));

            // Calculate vector and distance to that closest point
            const dx = closestX - playerCenterX;
            const dy = closestY - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If the sword tip doesn't reach the closest edge/corner, it's a miss
            if (distance > SWORD.LENGTH)
                return;

            // Use the angle to this closest intersection point for the arc calculation
            const angleToEnemy = Math.atan2(dy, dx);

            const currentAngle =
                this.swordAngle -
                SWORD.ARC / 2 +
                SWORD.ARC * this.swingProgress;

            let angleDifference = Math.abs(angleToEnemy - currentAngle);

            if (angleDifference > Math.PI)
                angleDifference = Math.PI * 2 - angleDifference;

            // Check if the sword arc overlaps our target angle
            if (angleDifference < 0.5) {
                const critical = Math.random() < Save.getCritChance();
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

        if (this.invulnTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0)
            ctx.globalAlpha = 0.55;

        ctx.shadowBlur = EFFECTS.PLAYER_GLOW;
        ctx.shadowColor = PLAYER.COLOR;

        ctx.fillStyle = this.color;

        ctx.fillRect(
            this.x,
            this.y,
            this.size,
            this.size
        );

        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;

        if (this.shieldActive)
            this.drawShieldOutline();

        if (Save.inventory.bow)
            this.drawBowOnBack();

        this.drawSword();

        this.drawAimIndicator();

    }

    drawShieldOutline() {

        ctx.save();

        ctx.strokeStyle = SHIELD.OUTLINE_COLOR;
        ctx.lineWidth = SHIELD.OUTLINE_WIDTH;

        ctx.shadowBlur = 12;
        ctx.shadowColor = SHIELD.OUTLINE_COLOR;

        const pad = 6;

        ctx.strokeRect(
            this.x - pad,
            this.y - pad,
            this.size + pad * 2,
            this.size + pad * 2
        );

        ctx.restore();

    }

    drawBowOnBack() {

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        ctx.rotate(aimAngle + Math.PI * 0.75);

        ctx.strokeStyle = "#5c4033";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 14, -Math.PI * 0.55, Math.PI * 0.55);
        ctx.stroke();

        ctx.strokeStyle = "#8b6914";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();

        ctx.restore();

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
        
        const currentAngle = this.swordAngle - SWORD.ARC / 2 + SWORD.ARC * this.swingProgress;
        const previousAngle = this.swordAngle - SWORD.ARC / 2 + SWORD.ARC * prevProgress;
        const angleDiff = currentAngle - previousAngle;
    
        const bladeLength = SWORD.LENGTH;
    
        // =====================================
        // 1. THE SHARP TRAIL
        // =====================================
        if (angleDiff > 0) {
            ctx.save();
            ctx.rotate(currentAngle);
    
            // Gradient for the trail so it fades out smoothly into the past
            let trailGrad = ctx.createRadialGradient(0, 0, bladeLength * 0.4, 0, 0, bladeLength);
            trailGrad.addColorStop(0, "rgba(0, 255, 255, 0)");
            trailGrad.addColorStop(0.85, "rgba(0, 255, 255, 0.15)");
            trailGrad.addColorStop(1, "rgba(255, 255, 255, 0.4)");
    
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
        const wet = Save.inventory.wetStone;

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
    
        ctx.restore();
    }

    drawAimIndicator() {

        ctx.save();

        ctx.translate(
            this.x + this.size / 2,
            this.y + this.size / 2
        );

        ctx.rotate(aimAngle);

        ctx.globalAlpha = 0.4;

        ctx.strokeStyle = "cyan";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(0, 0);

        ctx.lineTo(50, 0);

        ctx.stroke();

        ctx.restore();

        ctx.globalAlpha = 1;

    }

}