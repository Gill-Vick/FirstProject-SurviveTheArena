// =====================================
// Boss Enemy
// =====================================

class Boss extends Enemy {

    constructor(x, y) {

        super(x, y, {
            size: BOSS.SIZE,
            speed: BOSS.SPEED * Game.enemySpeedMultiplier,
            hp: BOSS.BASE_HP + Game.wave * BOSS.HP_PER_WAVE,
            color: BOSS.COLOR
        });

        this.type = "boss";
        this.isBoss = true;
        this.knockbackImmune = true;
        this.attackCooldown = BOSS.ATTACK_COOLDOWN;

        // Dash Attack Setup
        this.dashCharge = 0;
        this.dashing = false;
        this.dashDX = 0;
        this.dashDY = 0;
        this.dashTimer = 0;

        // NEW CONFIGS: Tweaked to make the dash distance significantly longer!
        this.dashSpeed = 12; // Speed boosted from 7 to 12
        this.dashDuration = 40; // Travel frames boosted from 24 to 40
        // Total dash distance is now 12 * 40 = 480px (previously 168px)
    }

    // =====================================
    // Attack
    // =====================================

    move() {

        // Dash movement
        if (this.dashing) {
            this.x += this.dashDX * Game.timeScale;
            this.y += this.dashDY * Game.timeScale;
            this.dashTimer -= Game.timeScale;
    
            if (this.dashTimer <= 0)
                this.dashing = false;
    
            return;
        }
    
        // Charging dash
        if (this.dashCharge > 0) {
            this.dashCharge -= Game.timeScale;
    
            if (this.dashCharge <= 0) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                // Uses synchronized dash variables
                this.dashDX = (dx / distance) * this.dashSpeed;
                this.dashDY = (dy / distance) * this.dashSpeed;
                this.dashing = true;
                this.dashTimer = this.dashDuration;
            }
            return;
        }
    
        super.move();
    }

    attack() {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= Game.timeScale;
            return;
        }

        this.fireRadialBurst();
        this.dashCharge = 45;
        this.attackCooldown = BOSS.ATTACK_COOLDOWN;
    }

    fireRadialBurst() {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;

        for (let i = 0; i < BOSS.PROJECTILE_COUNT; i++) {
            const angle = (Math.PI * 2 / BOSS.PROJECTILE_COUNT) * i;
            Game.projectiles.push(new Projectile(
                centerX,
                centerY,
                angle,
                {
                    speed: BOSS.PROJECTILE_SPEED,
                    color: BOSS.PROJECTILE_COLOR,
                    size: 8,
                    life: 120,
                    sourceType: "boss"
                }
            ));
        }
    }

    // =====================================
    // Drawing
    // =====================================

    draw() {
        super.draw();
        if (this.dashCharge > 0)
            this.drawDashIndicator();
        this.drawLabel();
    }

    drawLabel() {
        ctx.fillStyle = BOSS.COLOR;
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            BOSS.DISPLAY_NAME,
            this.x + this.size / 2,
            this.y - 20
        );
    }

    drawDashIndicator() {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;
    
        const dx = player.x + player.size / 2 - centerX;
    
        const dy =
            player.y + player.size / 2 - centerY;
    
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        const dirX = dx / distance;
        const dirY = dy / distance;
    
        ctx.save();
    
        const alpha = 0.3 + Math.sin(Date.now() / 60) * 0.2;
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        ctx.lineWidth = 6;
    
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
    
        // FIXED: The line now extends EXACTLY to the max dash distance (dashSpeed * dashDuration)
        const exactDashDistance = this.dashSpeed * this.dashDuration;
        
        ctx.lineTo(
            centerX + dirX * exactDashDistance,
            centerY + dirY * exactDashDistance
        );
    
        ctx.stroke();
        ctx.restore();
    }
}