/**
 * KILLtONE Game Framework - Muzzle Flash Effects
 * Creates muzzle flash effects attached to weapon models
 */

import { WeaponConstants } from '../entities/weapons/WeaponConfig.js';

export class MuzzleFlash {
    constructor(scene) {
        this.scene = scene;
        
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
        // Create materials using WeaponConstants.MUZZLE_FLASH_COLORS
        Object.entries(WeaponConstants.MUZZLE_FLASH_COLORS).forEach(([colorKey, colorValue]) => {
            const materialName = `muzzleFlash_${colorKey.toLowerCase()}`;
            const material = new BABYLON.StandardMaterial(materialName, this.scene);
            
            // Convert RGBA to Color3 (ignore alpha for material)
            material.emissiveColor = new BABYLON.Color3(colorValue.r, colorValue.g, colorValue.b);
            material.diffuseColor = new BABYLON.Color3(colorValue.r, colorValue.g, colorValue.b);
            material.disableLighting = true;
            material.backFaceCulling = false;
            
            // Store with both the key name and a fallback name
            this.materials.set(colorKey, material);
            this.materials.set(colorKey.toLowerCase(), material);
        });
        
        console.log('MuzzleFlash: Created materials for colors:', Object.keys(WeaponConstants.MUZZLE_FLASH_COLORS));
    }
    
    /**
     * Create muzzle flash effect attached to weapon
     */
    createMuzzleFlash(position, direction, weaponModel = null, config = {}) {
        const flashId = `flash_${Date.now()}_${Math.random()}`;
        
        // Calculate scale factor for weapon model
        let scaleFactor = 1.0;
        if (weaponModel && weaponModel.scaling) {
            scaleFactor = Math.max(weaponModel.scaling.x, weaponModel.scaling.y, weaponModel.scaling.z);
        }
        
        // Scale the muzzle flash size and length based on weapon model scaling
        const scaledSize = (config.size || 0.3) / scaleFactor;
        const scaledLength = (config.length || 0.8) / scaleFactor;
        
        // Create cone mesh for muzzle flash
        const cone = BABYLON.MeshBuilder.CreateCylinder(flashId, {
            diameterTop: 0,
            diameterBottom: scaledSize,
            height: scaledLength,
            tessellation: 8
        }, this.scene);
        
        // Apply material
        const materialType = config.color || 'PRIMARY';
        const material = this.materials.get(materialType) || this.materials.get('PRIMARY');
        if (material) {
            cone.material = material;
        } else {
            console.warn(`MuzzleFlash: No material found for color '${materialType}', using PRIMARY`);
            cone.material = this.materials.get('PRIMARY');
        }
        
        // Handle positioning based on whether we have a weapon model
        if (weaponModel) {
            console.log(`MuzzleFlash: Attaching to weapon model: ${weaponModel.name}`);
            // Attach to weapon and use relative positioning from config
            cone.parent = weaponModel;
            
            // Calculate scaled position based on weapon model scaling
            let localPosition;
            if (weaponModel.scaling) {
                // Scale the position coordinates to compensate for weapon model scaling
                localPosition = new BABYLON.Vector3(
                    (config.position?.x || 0) / scaleFactor,
                    (config.position?.y || 0) / scaleFactor,
                    (config.position?.z || 0) / scaleFactor
                );
                console.log(`MuzzleFlash: Scaled position by factor ${scaleFactor}: ${localPosition.toString()}`);
            } else {
                // Fallback to original position if no scaling info
                localPosition = new BABYLON.Vector3(
                    config.position?.x || 0,
                    config.position?.y || 0,
                    config.position?.z || 0
                );
            }
            
            cone.position = localPosition;
            console.log(`MuzzleFlash: Cone position: ${cone.position.toString()}`);
        } else {
            console.log(`MuzzleFlash: No weapon model, using world position`);
            // Use world position if no weapon model
            cone.position = position.clone();
        }
               
        // Rotate 90 degrees so the cone tip points opposite the firing direction
        cone.rotation.x -= Math.PI / 2;
        
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