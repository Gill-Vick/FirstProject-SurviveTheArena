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

        this.dashCooldown = 0;

    }

    // =====================================
    // Update
    // =====================================

    update() {

        this.updateMovement();

        this.updateDash();

        this.updateSword();

        this.keepOnScreen();

    }

    // =====================================
    // Movement
    // =====================================

    updateMovement() {

        if (keys["w"])
            this.y -= this.speed;

        if (keys["s"])
            this.y += this.speed;

        if (keys["a"])
            this.x -= this.speed;

        if (keys["d"])
            this.x += this.speed;

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

        if (this.dashCooldown > 0)
            this.dashCooldown -= 16;

    }

    dash() {

        if (this.dashCooldown > 0)
            return;

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

        this.dashCooldown = DASH.COOLDOWN;

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

        this.swordTimer--;

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

            const enemyCenterX =
                enemy.x + enemy.size / 2;

            const enemyCenterY =
                enemy.y + enemy.size / 2;

            const dx =
                enemyCenterX -
                (this.x + this.size / 2);

            const dy =
                enemyCenterY -
                (this.y + this.size / 2);

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            if (distance > SWORD.LENGTH)
                return;

            const angleToEnemy =
                Math.atan2(dy, dx);

            const currentAngle =
                this.swordAngle -
                SWORD.ARC / 2 +
                SWORD.ARC * this.swingProgress;

            let angleDifference =
                Math.abs(angleToEnemy - currentAngle);

            if (angleDifference > Math.PI)
                angleDifference =
                    Math.PI * 2 - angleDifference;

            if (angleDifference < 0.5) {

                const critical =
                    Math.random() < 0.05;
            
                const damage =
                    critical
                        ? SWORD.DAMAGE * 2
                        : SWORD.DAMAGE;
            
                enemy.takeDamage(
                    damage,
                    critical
                );

                enemy.applyKnockback(

                    this.x + this.size / 2,
                    this.y + this.size / 2,
                
                    critical ? 18 : 12
                
                );

                enemy.hitThisSwing = true;

                if (enemy.isDead()) {

                    Game.enemiesRemaining--;

                    Game.screenShake =
                        EFFECTS.SHAKE_ON_KILL;

                }

            }

        });

    }

    // =====================================
    // Drawing
    // =====================================

    draw() {

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

        this.drawSword();

        this.drawAimIndicator();

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
        let metalGrad = ctx.createLinearGradient(0, -6, 0, 6);
        metalGrad.addColorStop(0, "#ffffff"); // Highlighted edge
        metalGrad.addColorStop(0.3, "#bdc3c7"); // Mid-tone steel
        metalGrad.addColorStop(0.5, "#95a5a6"); // Center ridge
        metalGrad.addColorStop(1, "#7f8c8d"); // Shadow edge
    
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