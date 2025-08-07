/**
 * KILLtONE Game Framework - Left Info Panel Component
 * Displays flow state, audio, and performance information with angled projection
 */

export class LeftInfoPanel {
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
        this.engine = null;
        this.audioSystem = null;
        this.flowstateManager = null;
        
        // Cached data
        this.cachedData = {
            song: 'No Signal',
            flowActive: false,
            audioLevel: 0,
            fps: 0,
            memory: 0,
            warnings: 0
        };
        
        // Audio visualization
        this.audioMeterBars = 5;
        this.audioMeterData = new Array(this.audioMeterBars).fill(0);
    }
    
    /**
     * Initialize the left info panel
     */
    async initialize() {
        if (!this.scene || !this.camera) {
            throw new Error('LeftInfoPanel: Scene and camera required for initialization');
        }
        
        try {
            // Get data source references
            this.engine = this.game.engine;
            this.audioSystem = this.game.audioSystem;
            this.flowstateManager = this.game.flowstateManager;
            
            await this.createPanel();
            console.log('LeftInfoPanel initialized');
        } catch (error) {
            console.error('Failed to initialize LeftInfoPanel:', error);
            throw error;
        }
    }
    
    /**
     * Create the angled info panel mesh
     */
    async createPanel() {
        // Create dynamic texture for text content
        this.textTexture = new BABYLON.DynamicTexture('leftInfoTexture', {
            width: 512,
            height: 512
        }, this.scene, false);
        
        // Create material for glowing text only - completely transparent background
        this.material = new BABYLON.StandardMaterial('leftInfoMaterial', this.scene);
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
        this.panelMesh = BABYLON.MeshBuilder.CreatePlane('leftInfoPanel', {
            width: 0.6,
            height: 0.8
        }, this.scene);
        
        // Position and rotate panel for angled forward projection
        this.panelMesh.position = new BABYLON.Vector3(
            this.config.LEFT_PANEL_OFFSET.x,
            this.config.LEFT_PANEL_OFFSET.y,
            this.config.LEFT_PANEL_OFFSET.z
        );
        
        // Apply angled rotation (outer edge closer to camera)
        this.panelMesh.rotation = new BABYLON.Vector3(
            this.config.ANGLED_TEXT_ROTATION.x,
            this.config.ANGLED_TEXT_ROTATION.y - 0.3, // Slight Y rotation for left panel
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
        
        // Set text properties - use MEDIUM font size consistently
        ctx.font = `${this.config.HUD_FONT_SIZE_MEDIUM}px ${this.config.HUD_FONT_FAMILY}`;
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let y = 30; // Increased starting Y position for larger font
        const lineHeight = 35; // Increased line height for larger font
        const x = 30; // Increased left margin for larger font
        
        // Flow State Section
        if (this.cachedData.flowActive) {
            ctx.fillStyle = this.config.getColorWithAlpha(this.config.HUD_COLOR_SUCCESS);
            ctx.fillText(`Song: ${this.cachedData.song}`, x, y);
        } else {
            ctx.fillStyle = this.config.getColorWithAlpha();
            ctx.fillText('Song: No Signal', x, y);
        }
        y += lineHeight;
        
        // Audio meter visualization
        this.drawAudioMeter(ctx, x, y);
        y += 50; // Increased spacing for larger font
        
        // Performance Section
        ctx.fillStyle = this.config.getColorWithAlpha();
        ctx.fillText(`FPS: ${this.cachedData.fps}`, x, y);
        y += lineHeight;
        
        ctx.fillText(`Memory: ${this.cachedData.memory} MB`, x, y);
        y += lineHeight;
        
        // Warnings (if any)
        if (this.cachedData.warnings > 0) {
            ctx.fillStyle = this.config.getColorWithAlpha(this.config.HUD_COLOR_WARNING);
            ctx.fillText(`Warnings: ${this.cachedData.warnings}`, x, y);
        }
        
        // Update texture
        this.textTexture.update();
    }
    
    /**
     * Draw audio meter visualization
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    drawAudioMeter(ctx, x, y) {
        const barWidth = 20; // Increased for larger font
        const barHeight = 25; // Increased for larger font
        const barSpacing = 4; // Increased spacing for larger font
        const totalWidth = (barWidth + barSpacing) * this.audioMeterBars - barSpacing;
        
        // Draw meter background
        ctx.strokeStyle = this.config.getColorWithAlpha();
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, totalWidth, barHeight);
        
        // Draw audio level bars
        for (let i = 0; i < this.audioMeterBars; i++) {
            const barX = x + i * (barWidth + barSpacing);
            const level = this.audioMeterData[i];
            
            if (level > 0.1) {
                // Active bar
                const intensity = Math.min(level, 1.0);
                const barFillHeight = barHeight * intensity;
                
                // Color based on intensity
                let color = this.config.HUD_COLOR;
                if (intensity > 0.7) {
                    color = this.config.HUD_COLOR_WARNING;
                } else if (intensity > 0.9) {
                    color = this.config.HUD_COLOR_DANGER;
                }
                
                ctx.fillStyle = this.config.getColorWithAlpha(color);
                ctx.fillRect(barX + 1, y + barHeight - barFillHeight, barWidth - 2, barFillHeight);
            } else {
                // Inactive bar (dim outline)
                ctx.strokeStyle = this.config.getColorWithAlpha();
                ctx.globalAlpha = 0.3;
                ctx.strokeRect(barX + 1, y + 1, barWidth - 2, barHeight - 2);
                ctx.globalAlpha = 1.0;
            }
        }
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
        
        // Update performance data directly from engine
        if (updateFlags.shouldUpdatePerformance && this.engine) {
            const newFPS = Math.round(this.engine.getFps());
            const newMemory = this.getMemoryUsage();
            const newWarnings = 0; // Simplified - no warnings without PerformanceMonitor
            
            if (newFPS !== this.cachedData.fps || 
                newMemory !== this.cachedData.memory || 
                newWarnings !== this.cachedData.warnings) {
                
                this.cachedData.fps = newFPS;
                this.cachedData.memory = newMemory;
                this.cachedData.warnings = newWarnings;
                shouldUpdateText = true;
            }
        }
        
        // Update audio/flow state data
        if (updateFlags.shouldUpdateAudio) {
            const flowActive = this.getFlowStateActive();
            const currentSong = this.getCurrentSong();
            const audioLevel = this.getAudioLevel();
            
            if (flowActive !== this.cachedData.flowActive || 
                currentSong !== this.cachedData.song ||
                Math.abs(audioLevel - this.cachedData.audioLevel) > 0.1) {
                
                this.cachedData.flowActive = flowActive;
                this.cachedData.song = currentSong;
                this.cachedData.audioLevel = audioLevel;
                this.updateAudioMeter(audioLevel);
                shouldUpdateText = true;
            }
        }
        
        // Update text if data changed
        if (shouldUpdateText) {
            this.updateTextContent();
        }
    }
    
    /**
     * Get flow state active status
     * @returns {boolean} Whether flow state is active
     */
    getFlowStateActive() {
        if (this.flowstateManager && this.flowstateManager.isActive !== undefined) {
            return this.flowstateManager.isActive;
        }
        return false;
    }
    
    /**
     * Get current song name
     * @returns {string} Current song name or 'No Signal'
     */
    getCurrentSong() {
        // Try to get from flowstate manager first
        if (this.flowstateManager && this.flowstateManager.backgroundMusic) {
            // Extract song name from audio source or path
            const music = this.flowstateManager.backgroundMusic;
            if (music.src) {
                const path = music.src;
                const filename = path.split('/').pop().split('.')[0];
                return filename.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
        
        // Try to get from audio system
        if (this.audioSystem && this.audioSystem.currentMusic) {
            const music = this.audioSystem.currentMusic;
            if (music.name || music.src) {
                const name = music.name || music.src.split('/').pop().split('.')[0];
                return name.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
        
        return 'No Signal';
    }
    
    /**
     * Get current audio level for visualization
     * @returns {number} Audio level (0-1)
     */
    getAudioLevel() {
        // In a real implementation, this would analyze the actual audio
        // For now, simulate audio levels when flow state is active
        if (this.cachedData.flowActive) {
            return Math.random() * 0.8 + 0.2; // Simulate active audio
        }
        return 0;
    }
    
    /**
     * Get memory usage in MB
     * @returns {number} Memory usage in MB
     */
    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        }
        return 0;
    }
    
    /**
     * Update audio meter visualization data
     * @param {number} level - Overall audio level
     */
    updateAudioMeter(level) {
        // Simulate frequency bands for visualization
        for (let i = 0; i < this.audioMeterBars; i++) {
            const frequency = (i + 1) / this.audioMeterBars;
            const variation = Math.random() * 0.3;
            this.audioMeterData[i] = level * frequency + variation;
        }
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
        
        console.log('LeftInfoPanel disposed');
    }
}