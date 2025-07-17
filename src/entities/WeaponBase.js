/**
 * KILLtONE Game Framework - WeaponBase Abstract Class
 * Base class for all weapons with common functionality
 */

import * as BABYLON from '@babylonjs/core';
import { WeaponConstants } from './WeaponConfig.js';
import { AccuracySystem } from './AccuracySystem.js';

export class WeaponBase {
    constructor(config, scene, effectsManager, accuracySystem = null) {
        if (this.constructor === WeaponBase) {
            throw new Error('WeaponBase is an abstract class and cannot be instantiated directly');
        }
        
        this.config = config;
        this.scene = scene;
        this.effectsManager = effectsManager;
        
        // Weapon properties from config
        this.name = config.name;
        this.type = config.type;
        this.firingMode = config.firingMode;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.magazineSize = config.magazineSize;
        this.reloadTime = config.reloadTime;
        this.accuracy = config.accuracy;
        this.recoilAmount = config.recoilAmount;
        
        // Current state
        this.currentAmmo = config.magazineSize;
        this.isReloading = false;
        this.canFire = true;
        this.lastFireTime = 0;
        this.isFiring = false;
        
        // Visual components
        this.model = null;
        this.animationGroups = new Map();
        this.currentAnimation = null;
        
        // Accuracy system integration
        this.accuracySystem = accuracySystem || new AccuracySystem();
        this.accuracySystem.setCurrentWeapon(this.type);
        
        // Recoil pattern for this weapon
        this.recoilPattern = this.createRecoilPattern();
        
        // Events
        this.onFire = null;
        this.onReload = null;
        this.onAmmoChanged = null;
        this.onWeaponEmpty = null;
    }
    
    /**
     * Initialize the weapon (must be implemented by subclasses)
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }
    
    /**
     * Fire the weapon (must be implemented by subclasses)
     */
    fire(origin, direction) {
        throw new Error('fire() must be implemented by subclass');
    }
    
    /**
     * Check if weapon can fire
     */
    canFireWeapon() {
        if (this.magazineSize === Infinity) {
            // Knife or other infinite ammo weapons
            return this.canFire && !this.isReloading;
        }
        
        return this.canFire && !this.isReloading && this.currentAmmo > 0;
    }
    
    /**
     * Start reloading the weapon
     */
    reload() {
        // Cannot reload if already reloading, magazine is full, or weapon has infinite ammo
        if (this.isReloading || 
            this.currentAmmo >= this.magazineSize || 
            this.magazineSize === Infinity) {
            return false;
        }
        
        console.log(`Reloading ${this.name}...`);
        
        this.isReloading = true;
        
        // Play reload animation
        this.playReloadAnimation();
        
        // Trigger reload event
        if (this.onReload) {
            this.onReload(true);
        }
        
        // Set reload timer
        setTimeout(() => {
            this.finishReload();
        }, this.reloadTime * 1000); // Convert to milliseconds
        
        return true;
    }
    
    /**
     * Finish reloading the weapon
     */
    finishReload() {
        if (!this.isReloading) return;
        
        // Restore magazine to full capacity
        this.currentAmmo = this.magazineSize;
        this.isReloading = false;
        
        // Return to idle animation
        this.pauseAtIdle();
        
        console.log(`${this.name} reloaded. Ammo: ${this.currentAmmo}/${this.magazineSize}`);
        
        // Trigger events
        if (this.onReload) {
            this.onReload(false);
        }
        
        if (this.onAmmoChanged) {
            this.onAmmoChanged(this.currentAmmo, this.magazineSize);
        }
    }
    
    /**
     * Update weapon logic each frame
     */
    update(deltaTime) {
        // Update firing cooldown
        if (!this.canFire) {
            const currentTime = performance.now() / 1000; // Convert to seconds
            if (currentTime - this.lastFireTime >= this.fireRate) {
                this.canFire = true;
            }
        }
        
        // Update accuracy system
        if (this.accuracySystem) {
            this.accuracySystem.update(deltaTime);
        }
        
        // Update animations
        this.updateAnimations(deltaTime);
    }
    
    /**
     * Load weapon model and animations
     */
    async loadModel() {
        if (!this.config.modelPath) return;
        
        try {
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                this.config.modelPath, 
                "", 
                this.scene
            );
            
            if (result.meshes.length > 0) {
                this.model = result.meshes[0];
                this.model.name = `${this.name}_model`;
                this.model.setEnabled(false); // Hidden by default
                
                // Store animation groups
                if (result.animationGroups) {
                    result.animationGroups.forEach(animGroup => {
                        this.animationGroups.set(animGroup.name.toLowerCase(), animGroup);
                        animGroup.stop(); // Stop all animations initially
                    });
                }
                
                console.log(`Loaded model for ${this.name}`);
            }
        } catch (error) {
            console.warn(`Failed to load model for ${this.name}:`, error);
        }
    }
    
    /**
     * Play reload animation
     */
    playReloadAnimation() {
        const reloadAnim = this.animationGroups.get('reload');
        if (reloadAnim) {
            // Stop current animation
            if (this.currentAnimation) {
                this.currentAnimation.stop();
            }
            
            // Play reload animation once
            reloadAnim.play(false);
            this.currentAnimation = reloadAnim;
        }
    }
    
    /**
     * Pause animation at idle (beginning of sequence)
     */
    pauseAtIdle() {
        // Stop current animation
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        
        // Find idle animation or use first available
        const idleAnim = this.animationGroups.get('idle') || 
                        this.animationGroups.values().next().value;
        
        if (idleAnim) {
            idleAnim.play(false);
            idleAnim.pause();
            idleAnim.goToFrame(0); // Go to beginning
            this.currentAnimation = idleAnim;
        }
    }
    
    /**
     * Apply visual recoil effects to weapon model
     */
    applyRecoil() {
        if (!this.model) return;
        
        // Apply recoil rotation to weapon model
        const recoilX = (Math.random() - 0.5) * this.recoilAmount * 0.1;
        const recoilY = (Math.random() - 0.5) * this.recoilAmount * 0.1;
        const recoilZ = Math.random() * this.recoilAmount * 0.05;
        
        // Apply recoil rotation
        this.model.rotation.x += recoilX;
        this.model.rotation.y += recoilY;
        this.model.rotation.z += recoilZ;
        
        // Gradually return to original position
        setTimeout(() => {
            if (this.model) {
                this.model.rotation.x -= recoilX * 0.8;
                this.model.rotation.y -= recoilY * 0.8;
                this.model.rotation.z -= recoilZ * 0.8;
            }
        }, 50);
        
        setTimeout(() => {
            if (this.model) {
                this.model.rotation.x -= recoilX * 0.2;
                this.model.rotation.y -= recoilY * 0.2;
                this.model.rotation.z -= recoilZ * 0.2;
            }
        }, 100);
    }
    
    /**
     * Create weapon-specific recoil pattern
     */
    createRecoilPattern() {
        // Base recoil pattern - can be overridden by subclasses
        return {
            horizontal: this.recoilAmount * 0.5,
            vertical: this.recoilAmount,
            recovery: WeaponConstants.ACCURACY_FACTORS.RECOVERY_RATE
        };
    }
    
    /**
     * Update animations
     */
    updateAnimations(deltaTime) {
        // Animation updates handled by Babylon.js animation system
        // This method can be overridden by subclasses for custom animation logic
    }
    
    /**
     * Get current ammunition count
     */
    getCurrentAmmo() {
        return this.currentAmmo;
    }
    
    /**
     * Get maximum ammunition capacity
     */
    getMaxAmmo() {
        return this.magazineSize;
    }
    
    /**
     * Check if weapon is currently reloading
     */
    isCurrentlyReloading() {
        return this.isReloading;
    }
    
    /**
     * Get weapon information for UI
     */
    getWeaponInfo() {
        return {
            name: this.name,
            type: this.type,
            firingMode: this.firingMode,
            damage: this.damage,
            fireRate: this.fireRate,
            currentAmmo: this.currentAmmo,
            maxAmmo: this.magazineSize,
            isReloading: this.isReloading,
            accuracy: this.accuracy,
            canFire: this.canFireWeapon()
        };
    }
    
    /**
     * Show/hide weapon model
     */
    setVisible(visible) {
        if (this.model) {
            this.model.setEnabled(visible);
        }
    }
    
    /**
     * Consume ammunition
     */
    consumeAmmo(amount = 1) {
        if (this.magazineSize === Infinity) {
            return; // Infinite ammo weapons don't consume ammo
        }
        
        this.currentAmmo = Math.max(0, this.currentAmmo - amount);
        
        // Trigger ammo changed event
        if (this.onAmmoChanged) {
            this.onAmmoChanged(this.currentAmmo, this.magazineSize);
        }
        
        // Check if weapon is empty
        if (this.currentAmmo <= 0 && this.onWeaponEmpty) {
            this.onWeaponEmpty();
        }
    }
    
    /**
     * Set firing cooldown
     */
    setFiringCooldown() {
        this.canFire = false;
        this.lastFireTime = performance.now() / 1000; // Convert to seconds
    }
    
    /**
     * Update movement penalty for accuracy system
     */
    updateMovementPenalty(velocity) {
        if (this.accuracySystem) {
            this.accuracySystem.updateMovementPenalty(velocity);
        }
    }
    
    /**
     * Add recoil to accuracy system when firing
     */
    addRecoilToAccuracy() {
        if (this.accuracySystem) {
            this.accuracySystem.addRecoil(this.type, this.recoilAmount);
        }
    }
    
    /**
     * Get current effective accuracy
     */
    getCurrentAccuracy() {
        if (this.accuracySystem) {
            return this.accuracySystem.getCurrentAccuracy(this.accuracy);
        }
        return this.accuracy;
    }
    
    /**
     * Apply accuracy and recoil to shot direction
     */
    applyAccuracyToDirection(direction) {
        if (!this.accuracySystem) {
            return direction.clone();
        }
        
        // Apply recoil pattern to direction
        const recoiledDirection = this.accuracySystem.applyRecoilToDirection(direction, this.type);
        
        // Apply accuracy spread
        const currentAccuracy = this.getCurrentAccuracy();
        const spreadAngle = this.accuracySystem.calculateShotSpread(currentAccuracy, 1.0);
        
        // Apply random spread based on accuracy
        const spreadRadians = (spreadAngle * Math.PI / 180) * (1.0 - currentAccuracy);
        
        if (spreadRadians > 0) {
            // Generate random spread within cone
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * spreadRadians;
            
            // Create perpendicular vectors for spread
            const up = new BABYLON.Vector3(0, 1, 0);
            const right = BABYLON.Vector3.Cross(recoiledDirection, up).normalize();
            const actualUp = BABYLON.Vector3.Cross(right, recoiledDirection).normalize();
            
            // Apply spread
            const spreadX = Math.cos(randomAngle) * randomRadius;
            const spreadY = Math.sin(randomAngle) * randomRadius;
            
            const spreadDirection = recoiledDirection.clone();
            spreadDirection.addInPlace(right.scale(spreadX));
            spreadDirection.addInPlace(actualUp.scale(spreadY));
            spreadDirection.normalize();
            
            return spreadDirection;
        }
        
        return recoiledDirection;
    }
    
    /**
     * Get accuracy system state for debugging
     */
    getAccuracyState() {
        if (this.accuracySystem) {
            return this.accuracySystem.getAccuracyState();
        }
        return null;
    }
    
    /**
     * Reset accuracy system (useful for weapon switching)
     */
    resetAccuracy() {
        if (this.accuracySystem) {
            this.accuracySystem.reset();
        }
    }
    
    /**
     * Dispose of weapon resources
     */
    dispose() {
        console.log(`Disposing weapon: ${this.name}`);
        
        // Stop all animations
        this.animationGroups.forEach(animGroup => {
            animGroup.stop();
            animGroup.dispose();
        });
        this.animationGroups.clear();
        
        // Dispose model
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        
        // Dispose accuracy system
        if (this.accuracySystem) {
            this.accuracySystem.dispose();
            this.accuracySystem = null;
        }
        
        // Clear references
        this.scene = null;
        this.config = null;
        this.effectsManager = null;
        this.currentAnimation = null;
        
        console.log(`Weapon ${this.name} disposed`);
    }
}

export default WeaponBase;