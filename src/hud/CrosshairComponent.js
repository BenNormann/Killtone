/**
 * KILLtONE Game Framework - Crosshair Component
 * Fighter-jet inspired minimalistic crosshair with multiple styles
 */

export class CrosshairComponent {
    constructor() {
        this.game = null;
        this.scene = null;
        this.camera = null;
        this.config = null;
        this.hudManager = null;
        
        // Component properties
        this.order = 100; // High order - render on top
        this.isVisible = true;
        
        // Crosshair elements
        this.crosshairGroup = null;
        this.crosshairElements = [];
        this.material = null;
        
        // Dynamic properties
        this.currentScale = 1.0;
        this.targetScale = 1.0;
        this.animationSpeed = 5.0;
    }
    
    /**
     * Initialize the crosshair component
     */
    async initialize() {
        if (!this.scene || !this.camera) {
            throw new Error('CrosshairComponent: Scene and camera required for initialization');
        }
        
        try {
            await this.createCrosshair();
            console.log('CrosshairComponent initialized');
        } catch (error) {
            console.error('Failed to initialize CrosshairComponent:', error);
            throw error;
        }
    }
    
    /**
     * Create the crosshair mesh and material
     */
    async createCrosshair() {
        // Create parent group
        this.crosshairGroup = new BABYLON.TransformNode('crosshairGroup', this.scene);
        this.crosshairGroup.parent = this.camera;
        this.crosshairGroup.position = new BABYLON.Vector3(0, 0, 0.5);
        
        // Create material
        this.material = new BABYLON.StandardMaterial('crosshairMaterial', this.scene);
        this.material.emissiveColor = this.config.getBabylonColor();
        this.material.diffuseColor = BABYLON.Color3.Black();
        this.material.specularColor = BABYLON.Color3.Black();
        this.material.disableLighting = true;
        this.material.alpha = this.config.HUD_ALPHA;
        
        // Create crosshair based on style
        switch (this.config.CROSSHAIR.style) {
            case 'brackets':
                this.createBracketsCrosshair();
                break;
            case 'lines':
                this.createLinesCrosshair();
                break;
            case 'cross':
                this.createCrossCrosshair();
                break;
            case 'dot':
                this.createDotCrosshair();
                break;
            default:
                this.createBracketsCrosshair();
        }
        
        // Apply material and rendering settings to all elements
        this.crosshairElements.forEach(element => {
            element.material = this.material;
            element.renderingGroupId = 3; // Render on top
            element.parent = this.crosshairGroup;
        });
    }
    
    /**
     * Create fighter-jet style brackets crosshair
     */
    createBracketsCrosshair() {
        const thickness = this.config.CROSSHAIR.thickness / 1000;
        const length = this.config.CROSSHAIR.length / 1000;
        const gap = this.config.CROSSHAIR.gap / 1000;
        
        this.crosshairElements = [];
        
        // Create 4 corner brackets using simple boxes
        const positions = [
            { x: -gap - length/2, y: gap + length/2 }, // Top-left
            { x: gap + length/2, y: gap + length/2 },  // Top-right
            { x: -gap - length/2, y: -gap - length/2 }, // Bottom-left
            { x: gap + length/2, y: -gap - length/2 }   // Bottom-right
        ];
        
        positions.forEach((pos, index) => {
            // Horizontal part of bracket
            const hBox = BABYLON.MeshBuilder.CreateBox(`crosshair_h_${index}`, {
                width: length,
                height: thickness,
                depth: thickness
            }, this.scene);
            hBox.position.x = pos.x;
            hBox.position.y = pos.y;
            this.crosshairElements.push(hBox);
            
            // Vertical part of bracket
            const vBox = BABYLON.MeshBuilder.CreateBox(`crosshair_v_${index}`, {
                width: thickness,
                height: length,
                depth: thickness
            }, this.scene);
            vBox.position.x = pos.x + (index % 2 === 0 ? -length/2 + thickness/2 : length/2 - thickness/2);
            vBox.position.y = pos.y;
            this.crosshairElements.push(vBox);
        });
    }
    
    /**
     * Create simple lines crosshair
     */
    createLinesCrosshair() {
        const thickness = this.config.CROSSHAIR.thickness / 1000;
        const length = this.config.CROSSHAIR.length / 1000;
        const gap = this.config.CROSSHAIR.gap / 1000;
        
        this.crosshairElements = [];
        
        // Left horizontal line
        const leftLine = BABYLON.MeshBuilder.CreateBox('crosshair_left', {
            width: length,
            height: thickness,
            depth: thickness
        }, this.scene);
        leftLine.position.x = -gap - length/2;
        this.crosshairElements.push(leftLine);
        
        // Right horizontal line
        const rightLine = BABYLON.MeshBuilder.CreateBox('crosshair_right', {
            width: length,
            height: thickness,
            depth: thickness
        }, this.scene);
        rightLine.position.x = gap + length/2;
        this.crosshairElements.push(rightLine);
        
        // Top vertical line
        const topLine = BABYLON.MeshBuilder.CreateBox('crosshair_top', {
            width: thickness,
            height: length,
            depth: thickness
        }, this.scene);
        topLine.position.y = gap + length/2;
        this.crosshairElements.push(topLine);
        
        // Bottom vertical line
        const bottomLine = BABYLON.MeshBuilder.CreateBox('crosshair_bottom', {
            width: thickness,
            height: length,
            depth: thickness
        }, this.scene);
        bottomLine.position.y = -gap - length/2;
        this.crosshairElements.push(bottomLine);
    }
    
    /**
     * Create cross style crosshair
     */
    createCrossCrosshair() {
        const thickness = this.config.CROSSHAIR.thickness / 1000;
        const length = this.config.CROSSHAIR.length / 1000;
        
        this.crosshairElements = [];
        
        // Horizontal line
        const hLine = BABYLON.MeshBuilder.CreateBox('crosshair_horizontal', {
            width: length * 2,
            height: thickness,
            depth: thickness
        }, this.scene);
        this.crosshairElements.push(hLine);
        
        // Vertical line
        const vLine = BABYLON.MeshBuilder.CreateBox('crosshair_vertical', {
            width: thickness,
            height: length * 2,
            depth: thickness
        }, this.scene);
        this.crosshairElements.push(vLine);
    }
    
    /**
     * Create dot style crosshair
     */
    createDotCrosshair() {
        const radius = this.config.CROSSHAIR.thickness / 2000;
        
        this.crosshairElements = [];
        
        const dot = BABYLON.MeshBuilder.CreateSphere('crosshair_dot', {
            diameter: radius * 2
        }, this.scene);
        this.crosshairElements.push(dot);
    }
    
    /**
     * Update the crosshair (called every frame)
     * @param {number} deltaTime - Time since last frame
     * @param {Object} updateFlags - What should be updated this frame
     */
    update(deltaTime, updateFlags) {
        if (!this.isVisible || !this.crosshairGroup) {
            return;
        }
        
        // Animate scale changes
        if (Math.abs(this.currentScale - this.targetScale) > 0.01) {
            this.currentScale = BABYLON.Scalar.Lerp(
                this.currentScale,
                this.targetScale,
                this.animationSpeed * deltaTime / 1000
            );
            
            this.crosshairGroup.scaling = new BABYLON.Vector3(
                this.currentScale,
                this.currentScale,
                this.currentScale
            );
        }
    }
    
    /**
     * Set crosshair scale (for weapon feedback)
     * @param {number} scale - Scale multiplier
     */
    setScale(scale) {
        this.targetScale = scale;
    }
    
    /**
     * Reset crosshair to default scale
     */
    resetScale() {
        this.targetScale = 1.0;
    }
    
    /**
     * Show the crosshair
     */
    show() {
        this.isVisible = true;
        if (this.crosshairGroup) {
            this.crosshairGroup.setEnabled(true);
        }
    }
    
    /**
     * Hide the crosshair
     */
    hide() {
        this.isVisible = false;
        if (this.crosshairGroup) {
            this.crosshairGroup.setEnabled(false);
        }
    }
    
    /**
     * Handle color change
     * @param {string} color - New HUD color
     */
    onColorChange(color) {
        if (this.material) {
            this.material.emissiveColor = this.config.getBabylonColor(color);
        }
    }
    
    /**
     * Handle alpha change
     * @param {number} alpha - New alpha value
     */
    onAlphaChange(alpha) {
        if (this.material) {
            this.material.alpha = alpha;
        }
    }
    
    /**
     * Dispose of the crosshair component
     */
    dispose() {
        if (this.crosshairElements) {
            this.crosshairElements.forEach(element => {
                element.dispose();
            });
            this.crosshairElements = [];
        }
        
        if (this.crosshairGroup) {
            this.crosshairGroup.dispose();
            this.crosshairGroup = null;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        
        console.log('CrosshairComponent disposed');
    }
}