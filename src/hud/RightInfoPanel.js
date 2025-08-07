/**
 * KILLtONE Game Framework - Right Info Panel Component
 * Displays player health, ammo, weapon, and speed information with angled projection
 */

export class RightInfoPanel {
    constructor() {
        this.game = null;
        this.scene = null;
        this.camera = null;
        this.config = null;
        this.hudManager = null;
        
        // Component properties
        this.order = 10; // Low order - render behind other elements
        this.isVisible = true;
        
        // Panel mesh and materials
        this.panelMesh = null;
        this.textTexture = null;
        this.material = null;
        
        // Data sources
        this.player = null;
        
        // Cached data
        this.cachedData = {
            health: 100,
            maxHealth: 100,
            currentAmmo: 0,
            maxAmmo: 0,
            weaponName: 'None',
            speed: 0
        };
        
        // Health bar animation
        this.animatedHealth = 100;
        this.healthAnimationSpeed = 3.0;
    }
    
    /**
     * Initialize the right info panel
     */
    async initialize() {
        if (!this.scene || !this.camera) {
            throw new Error('RightInfoPanel: Scene and camera required for initialization');
        }
        
        try {
            // Get player reference
            this.player = this.game.player;
            
            await this.createPanel();
            console.log('RightInfoPanel initialized');
        } catch (error) {
            console.error('Failed to initialize RightInfoPanel:', error);
            throw error;
        }
    }
    
    /**
     * Update player reference (called by UIManager)
     * @param {Player} player - Current player instance
     */
    updatePlayerReference(player) {
        this.player = player;
    }
    
    /**
     * Update speedometer position to follow the right panel
     */
    updateSpeedometerPosition() {
        if (!this.speedometer || !this.panelMesh) {
            return;
        }
        
        // Get panel's world position
        const panelWorldPosition = this.panelMesh.getAbsolutePosition();
        
        // Convert 3D world position to screen coordinates
        const screenPosition = BABYLON.Vector3.Project(
            panelWorldPosition,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            this.camera.viewport.toGlobal(
                this.scene.getEngine().getRenderWidth(),
                this.scene.getEngine().getRenderHeight()
            )
        );
        
        // Convert to normalized screen coordinates (0-1)
        const normalizedX = (screenPosition.x + 1) / 2;
        const normalizedY = (1 - screenPosition.y) / 2;
        
        // Offset the speedometer to the right side of the panel
        const offsetX = 1; // Offset to the right of panel center
        const offsetY = -0.1; // Slight offset down from panel center
        
        // Set the speedometer position
        this.speedometer.setHudPosition(normalizedX + offsetX, normalizedY + offsetY);
        
        console.log(`Speedometer positioned at: (${(normalizedX + offsetX).toFixed(3)}, ${(normalizedY + offsetY).toFixed(3)})`);
    }
    
    /**
     * Create the angled info panel mesh
     */
    async createPanel() {
        // Create dynamic texture for text content
        this.textTexture = new BABYLON.DynamicTexture('rightInfoTexture', {
            width: 512,
            height: 512
        }, this.scene, false);
        
        // Create material for glowing text only - completely transparent background
        this.material = new BABYLON.StandardMaterial('rightInfoMaterial', this.scene);
        this.material.diffuseTexture = null; // No diffuse texture
        this.material.emissiveTexture = this.textTexture; // Only emissive texture for text
        this.material.disableLighting = true;
        this.material.alpha = 1.0;
        this.material.hasAlpha = true;
        this.material.diffuseColor = new BABYLON.Color3(0, 0, 0);
        this.material.specularColor = new BABYLON.Color3(0, 0, 0);
        this.material.ambientColor = new BABYLON.Color3(0, 0, 0);
        this.material.backFaceCulling = false;
        this.material.useAlphaFromDiffuseTexture = true;
        this.material.emissiveIntensity = 1.5; // Make text glow
        this.material.opacityTexture = this.textTexture; // Use texture alpha for opacity
        
        // Create panel geometry (angled plane)
        this.panelMesh = BABYLON.MeshBuilder.CreatePlane('rightInfoPanel', {
            width: 0.6,
            height: 0.8
        }, this.scene);
        
        // Position and rotate panel for angled forward projection
        this.panelMesh.position = new BABYLON.Vector3(
            this.config.RIGHT_PANEL_OFFSET.x,
            this.config.RIGHT_PANEL_OFFSET.y,
            this.config.RIGHT_PANEL_OFFSET.z
        );
        
        // Apply angled rotation (outer edge closer to camera)
        this.panelMesh.rotation = new BABYLON.Vector3(
            this.config.ANGLED_TEXT_ROTATION.x,
            this.config.ANGLED_TEXT_ROTATION.y + 0.3, // Slight Y rotation for right panel
            this.config.ANGLED_TEXT_ROTATION.z
        );
        
        this.panelMesh.parent = this.camera;
        this.panelMesh.material = this.material;
        this.panelMesh.renderingGroupId = 1; // Render behind crosshair
        
        // Initial text update
        this.updateTextContent();
    }
    
    /**
     * Update the text content on the panel
     */
    updateTextContent() {
        const ctx = this.textTexture.getContext();
        const size = this.textTexture.getSize();
        
        // Clear texture completely transparent
        ctx.clearRect(0, 0, size.width, size.height);
        
        // Set text properties
        ctx.font = `${this.config.HUD_FONT_SIZE_MEDIUM}px ${this.config.HUD_FONT_FAMILY}`;
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        
        let y = 20;
        const lineHeight = 35;
        const x = size.width - 20;
        
        // Health Section
        const healthPercent = (this.cachedData.health / this.cachedData.maxHealth) * 100;
        let healthColor = this.config.HUD_COLOR;
        
        if (healthPercent <= 25) {
            healthColor = this.config.HUD_COLOR_DANGER;
        } else if (healthPercent <= 50) {
            healthColor = this.config.HUD_COLOR_WARNING;
        }
        
        ctx.fillStyle = this.config.getColorWithAlpha(healthColor);
        ctx.fillText(`HP: ${this.cachedData.health}/${this.cachedData.maxHealth}`, x, y);
        y += lineHeight;
        
        // Health bar visualization
        this.drawHealthBar(ctx, x - 180, y, healthPercent);
        y += 35;
        
        // Speed Section - Draw speedometer gauge aligned to the right
        this.drawSpeedometerGauge(ctx, x, y, this.cachedData.speed);
        y += 100 + lineHeight;

        // Ammo Section
        ctx.textAlign = 'right';
        ctx.fillStyle = this.config.getColorWithAlpha();
        if (this.cachedData.maxAmmo > 0) {
            const ammoColor = this.cachedData.currentAmmo <= (this.cachedData.maxAmmo * 0.2) 
                ? this.config.HUD_COLOR_WARNING 
                : this.config.HUD_COLOR;
            ctx.fillStyle = this.config.getColorWithAlpha(ammoColor);
            ctx.fillText(`Ammo: ${this.cachedData.currentAmmo}/${this.cachedData.maxAmmo}`, x, y);
        } else {
            ctx.fillText('Ammo: ∞', x, y);
        }
        y += lineHeight;
        
        // Weapon Section
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.fillText(`Weapon: ${this.cachedData.weaponName}`, x, y);
        y += lineHeight;
        
        // Update texture
        this.textTexture.update();
    }
    
    /**
     * Draw health bar visualization
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} healthPercent - Health percentage (0-100)
     */
    drawHealthBar(ctx, x, y) {
        const barWidth = 180;
        const barHeight = 15;
        const borderWidth = 2;
        
        // Animate health bar
        const targetHealthPercent = (this.cachedData.health / this.cachedData.maxHealth) * 100;
        const currentHealthPercent = (this.animatedHealth / this.cachedData.maxHealth) * 100;
        
        // Border
        ctx.strokeStyle = this.config.getColorWithAlpha();
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Health fill
        const fillWidth = (barWidth - borderWidth * 2) * (currentHealthPercent / 100);
        
        if (fillWidth > 0) {
            let healthColor = this.config.HUD_COLOR;
            if (currentHealthPercent <= 25) {
                healthColor = this.config.HUD_COLOR_DANGER;
            } else if (currentHealthPercent <= 50) {
                healthColor = this.config.HUD_COLOR_WARNING;
            } else {
                healthColor = this.config.HUD_COLOR_SUCCESS;
            }
            
            ctx.fillStyle = this.config.getColorWithAlpha(healthColor);
            ctx.fillRect(x + borderWidth, y + borderWidth, fillWidth, barHeight - borderWidth * 2);
        }
        
        // Health value overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${this.config.HUD_FONT_SIZE_SMALL}px ${this.config.HUD_FONT_FAMILY}`;
        ctx.textAlign = 'right';
    }
    
    /**
     * Draw speedometer gauge visualization (like health bar but circular)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} speed - Current speed (0-1000)
     */
    drawSpeedometerGauge(ctx, x, y, speed) {
        const gaugeRadius = 50;
        const centerX = x - gaugeRadius; // Use x directly since it's already positioned for right alignment
        const centerY = y + gaugeRadius;
        const startAngle = 90; // Start at bottom (6 o'clock position)
        const endAngle = 420; // Go all the way around to bottom again
        const arcLength = endAngle - startAngle;
        
        // Calculate progress (0-1)
        const progress = Math.min(1, speed / 1000);
        const currentAngle = startAngle + (arcLength * progress);
        
        // Draw gauge background (outer ring)
        ctx.beginPath();
        ctx.arc(centerX, centerY, gaugeRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = this.config.getColorWithAlpha();
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw gauge arc (progress indicator)
        ctx.beginPath();
        ctx.arc(centerX, centerY, gaugeRadius, 
            startAngle * (Math.PI / 180), 
            currentAngle * (Math.PI / 180));
        
        // Color based on speed
        let gaugeColor = this.config.HUD_COLOR;
        if (progress > 0.8) {
            gaugeColor = this.config.HUD_COLOR_DANGER;
        } else if (progress > 0.6) {
            gaugeColor = this.config.HUD_COLOR_WARNING;
        } else if (progress > 0.3) {
            gaugeColor = this.config.HUD_COLOR_SUCCESS;
        }
        
        ctx.strokeStyle = this.config.getColorWithAlpha(gaugeColor);
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw tick marks
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const angle = startAngle + (arcLength * i / numTicks);
            const angleRad = angle * (Math.PI / 180);
            const innerRadius = gaugeRadius - 8;
            const outerRadius = gaugeRadius - 2;
            
            const innerX = centerX + Math.cos(angleRad) * innerRadius;
            const innerY = centerY + Math.sin(angleRad) * innerRadius;
            const outerX = centerX + Math.cos(angleRad) * outerRadius;
            const outerY = centerY + Math.sin(angleRad) * outerRadius;
            
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = this.config.getColorWithAlpha();
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw needle
        const needleLength = gaugeRadius - 5;
        const needleAngle = currentAngle * (Math.PI / 180);
        const needleX = centerX + Math.cos(needleAngle) * needleLength;
        const needleY = centerY + Math.sin(needleAngle) * needleLength;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(needleX, needleY);
        ctx.strokeStyle = this.config.getColorWithAlpha(this.config.HUD_COLOR_DANGER);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.fill();
        
        // Draw speed value text
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.font = `${this.config.HUD_FONT_SIZE_SMALL}px ${this.config.HUD_FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(speed)}`, centerX, centerY + 5);
    }
    
    /**
     * Update the component (called every frame)
     * @param {number} deltaTime - Time since last frame
     * @param {Object} updateFlags - What should be updated this frame
     */
    update(deltaTime, updateFlags) {
        if (!this.isVisible || !this.panelMesh) {
            return;
        }
        
        let shouldUpdateText = false;
        
        // Animate health bar
        if (Math.abs(this.animatedHealth - this.cachedData.health) > 0.5) {
            this.animatedHealth = BABYLON.Scalar.Lerp(
                this.animatedHealth,
                this.cachedData.health,
                this.healthAnimationSpeed * deltaTime / 1000
            );
            shouldUpdateText = true;
        }
        
        // Update player data
        if (updateFlags.shouldUpdatePlayer && this.player) {
            const newHealth = this.getPlayerHealth();
            const newMaxHealth = this.getPlayerMaxHealth();
            const ammoData = this.getPlayerAmmo();
            const weaponName = this.getPlayerWeapon();
            const speed = this.getPlayerSpeed();
            
            if (newHealth !== this.cachedData.health ||
                newMaxHealth !== this.cachedData.maxHealth ||
                ammoData.current !== this.cachedData.currentAmmo ||
                ammoData.max !== this.cachedData.maxAmmo ||
                weaponName !== this.cachedData.weaponName ||
                Math.abs(speed - this.cachedData.speed) > 0.5) {
                
                this.cachedData.health = newHealth;
                this.cachedData.maxHealth = newMaxHealth;
                this.cachedData.currentAmmo = ammoData.current;
                this.cachedData.maxAmmo = ammoData.max;
                this.cachedData.weaponName = weaponName;
                this.cachedData.speed = speed;
                shouldUpdateText = true;
            }
        }
        
        // Update text if data changed
        if (shouldUpdateText) {
            this.updateTextContent();
        }
    }
    
    /**
     * Get player health
     * @returns {number} Current health
     */
    getPlayerHealth() {
        if (this.player && this.player.health !== undefined) {
            return Math.max(0, Math.round(this.player.health));
        }
        return 100;
    }
    
    /**
     * Get player max health
     * @returns {number} Maximum health
     */
    getPlayerMaxHealth() {
        if (this.player && this.player.maxHealth !== undefined) {
            return this.player.maxHealth;
        }
        return 100;
    }
    
    /**
     * Get player ammo data
     * @returns {Object} Ammo data with current and max values
     */
    getPlayerAmmo() {
        if (this.player && this.player.currentWeapon) {
            const weapon = this.player.currentWeapon;
            
            if (weapon) {
                const currentAmmo = weapon.getCurrentAmmo ? weapon.getCurrentAmmo() : (weapon.currentAmmo || 0);
                const maxAmmo = weapon.getMaxAmmo ? weapon.getMaxAmmo() : (weapon.maxAmmo || weapon.magazineSize || 0);
                
                return {
                    current: currentAmmo,
                    max: maxAmmo
                };
            }
        }
        
        return { current: 0, max: 0 };
    }
    
    /**
     * Get current weapon name
     * @returns {string} Weapon name
     */
    getPlayerWeapon() {
        if (this.player && this.player.currentWeapon) {
            const weapon = this.player.currentWeapon;
            
            if (weapon && weapon.name) {
                return weapon.name.toUpperCase();
            }
        }
        
        return 'NONE';
    }
    
    /**
     * Get player speed
     * @returns {number} Current speed magnitude (0-1000 scale)
     */
    getPlayerSpeed() {
        if (this.player && this.player.velocity) {
            // Calculate 2D speed (ignore Y component for ground movement)
            const velocity = this.player.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) * 2.5;
            
            // Convert to 0-1000 scale where 1000 is full sprint speed
            // Assuming typical walking speed is around 5-10 units, sprint is around 15-20
            const normalizedSpeed = Math.min(1000, speed * 100); // Increased scale factor to reach 1000 at sprint speed
            return normalizedSpeed;
        }
        
        return 0;
    }
    
    /**
     * Show the panel
     */
    show() {
        this.isVisible = true;
        if (this.panelMesh) {
            this.panelMesh.setEnabled(true);
        }
    }
    
    /**
     * Hide the panel
     */
    hide() {
        this.isVisible = false;
        if (this.panelMesh) {
            this.panelMesh.setEnabled(false);
        }
    }
    
    /**
     * Handle color change
     * @param {string} color - New HUD color
     */
    onColorChange(color) {
        this.updateTextContent();
    }
    
    /**
     * Handle alpha change
     * @param {number} alpha - New alpha value
     */
    onAlphaChange(alpha) {
        if (this.material) {
            this.material.alpha = alpha;
        }
        this.updateTextContent();
    }
    
    /**
     * Dispose of the component
     */
    dispose() {
        if (this.panelMesh) {
            this.panelMesh.dispose();
            this.panelMesh = null;
        }
        
        if (this.textTexture) {
            this.textTexture.dispose();
            this.textTexture = null;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        
        console.log('RightInfoPanel disposed');
    }
}