/**
 * KILLtONE Game Framework - Muzzle Flash Effects
 * Creates muzzle flash effects attached to weapon models
 */

export class MuzzleFlash {
    constructor(scene, effectsManager) {
        this.scene = scene;
        this.effectsManager = effectsManager;
        
        // Active muzzle flashes
        this.activeMuzzleFlashes = new Map();
        
        // Materials cache
        this.materials = new Map();
    }
    
    /**
     * Initialize muzzle flash system
     */
    initialize() {
        this.createMaterials();
        console.log('MuzzleFlash system initialized');
    }
    
    /**
     * Create muzzle flash materials
     */
    createMaterials() {
        // Purple muzzle flash material
        const purpleMaterial = new BABYLON.StandardMaterial('muzzleFlash_purple', this.scene);
        purpleMaterial.emissiveColor = new BABYLON.Color3(1.0, 0.0, 1.0); // Bright purple
        purpleMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.0, 1.0);
        purpleMaterial.disableLighting = true;
        purpleMaterial.backFaceCulling = false;
        this.materials.set('purple', purpleMaterial);
        
        // Pink muzzle flash material
        const pinkMaterial = new BABYLON.StandardMaterial('muzzleFlash_pink', this.scene);
        pinkMaterial.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.5); // Pink
        pinkMaterial.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.5);
        pinkMaterial.disableLighting = true;
        pinkMaterial.backFaceCulling = false;
        this.materials.set('pink', pinkMaterial);
    }
    
    /**
     * Create muzzle flash effect attached to weapon
     */
    createMuzzleFlash(position, direction, weaponModel = null, config = {}) {
        const flashId = `flash_${Date.now()}_${Math.random()}`;
        
        // Create cone mesh for muzzle flash
        const cone = BABYLON.MeshBuilder.CreateCylinder(flashId, {
            diameterTop: 0,
            diameterBottom: config.size || 0.3,
            height: config.length || 0.8,
            tessellation: 8
        }, this.scene);
        
        // Position and orient the cone
        cone.position = position.clone();
        
        // Point the cone away from the weapon (tip pointing forward)
        const lookDirection = direction.normalize();
        cone.lookAt(position.add(lookDirection));
        
        // Rotate 90 degrees so the tip points in the direction
        cone.rotation.x += Math.PI / 2;
        
        // Apply material
        const materialType = config.color || 'purple';
        cone.material = this.materials.get(materialType) || this.materials.get('purple');
        
        // Attach to weapon if provided
        if (weaponModel && weaponModel.isEnabled()) {
            cone.parent = weaponModel;
            // Adjust position relative to weapon
            cone.position = new BABYLON.Vector3(0, 0, 1.2); // Forward from weapon
        }
        
        // Scale animation
        const initialScale = new BABYLON.Vector3(0.1, 0.1, 0.1);
        const targetScale = new BABYLON.Vector3(1, 1, 1);
        cone.scaling = initialScale;
        
        // Animate scale up then down
        const scaleUpAnim = BABYLON.Animation.CreateAndStartAnimation(
            'muzzleFlashScaleUp',
            cone,
            'scaling',
            60, // 60 FPS
            3, // 3 frames up
            initialScale,
            targetScale,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Store reference
        this.activeMuzzleFlashes.set(flashId, {
            mesh: cone,
            startTime: performance.now(),
            duration: config.duration || 100 // milliseconds
        });
        
        // Auto cleanup
        setTimeout(() => {
            this.removeMuzzleFlash(flashId);
        }, config.duration || 100);
        
        return flashId;
    }
    
    /**
     * Remove muzzle flash
     */
    removeMuzzleFlash(flashId) {
        const flash = this.activeMuzzleFlashes.get(flashId);
        if (flash) {
            if (flash.mesh) {
                flash.mesh.dispose();
            }
            this.activeMuzzleFlashes.delete(flashId);
        }
    }
    
    /**
     * Update muzzle flashes (called from game loop)
     */
    update(deltaTime) {
        const currentTime = performance.now();
        const flashesToRemove = [];
        
        // Check for expired flashes
        this.activeMuzzleFlashes.forEach((flash, flashId) => {
            if (currentTime - flash.startTime > flash.duration) {
                flashesToRemove.push(flashId);
            }
        });
        
        // Remove expired flashes
        flashesToRemove.forEach(flashId => {
            this.removeMuzzleFlash(flashId);
        });
    }
    
    /**
     * Clear all muzzle flashes
     */
    clearAll() {
        this.activeMuzzleFlashes.forEach((flash, flashId) => {
            this.removeMuzzleFlash(flashId);
        });
    }
    
    /**
     * Dispose of muzzle flash system
     */
    dispose() {
        this.clearAll();
        
        // Dispose materials
        this.materials.forEach(material => {
            material.dispose();
        });
        this.materials.clear();
        
        console.log('MuzzleFlash system disposed');
    }
}

export default MuzzleFlash;