/**
 * KILLtONE Game Framework - Carbine Weapon Implementation
 * Semi-automatic rifle with 50 damage and 12-round magazine
 */

import * as BABYLON from '@babylonjs/core';
import { WeaponBase } from './WeaponBase.js';
import { WeaponConfigs, WeaponType, MuzzleFlashType } from './WeaponConfig.js';

export class Carbine extends WeaponBase {
    constructor(scene, effectsManager, accuracySystem = null, raycastManager = null) {
        // Get carbine configuration
        const config = WeaponConfigs[WeaponType.CARBINE];
        
        super(config, scene, effectsManager, accuracySystem);
        
        this.raycastManager = raycastManager;
        
        // Carbine-specific properties
        this.lastShotTime = 0;
        this.muzzlePosition = new BABYLON.Vector3(0, 0, 0);
        this.muzzleDirection = new BABYLON.Vector3(0, 0, 1);
        
        // Animation state
        this.skeleton = null;
        this.isAnimationPaused = false;
        
        console.log(`Carbine weapon initialized - Damage: ${this.damage}, Magazine: ${this.magazineSize}, Fire Rate: ${this.fireRate}s`);
    }
    
    /**
     * Initialize the carbine weapon
     */
    async initialize() {
        console.log('Initializing Carbine weapon...');
        
        try {
            // Load the weapon model with proper animation handling
            await this.loadWeaponModel();
            
            // Set up initial state
            this.pauseAtIdle();
            
            console.log('Carbine weapon initialization complete');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Carbine weapon:', error);
            return false;
        }
    }
    
    /**
     * Load weapon model with proper animation handling
     */
    async loadWeaponModel() {
        if (!this.config.modelPath) {
            console.warn('Carbine: No model path specified');
            return;
        }
        
        try {
            // Use BABYLON.SceneLoader.ImportMesh for proper skeleton animation support
            const result = await new Promise((resolve, reject) => {
                BABYLON.SceneLoader.ImportMesh("", "", this.config.modelPath, this.scene, 
                    (meshes, particleSystems, skeletons) => {
                        resolve({ meshes, particleSystems, skeletons });
                    },
                    null, // onProgress
                    (scene, message, exception) => {
                        reject(new Error(`Failed to load carbine model: ${message}`));
                    }
                );
            });
            
            if (result.meshes.length > 0) {
                this.model = result.meshes[0];
                this.model.name = `${this.name}_model`;
                this.model.setEnabled(false); // Hidden by default
                
                // Handle skeleton animations
                if (result.skeletons && result.skeletons.length > 0) {
                    this.skeleton = result.skeletons[0];
                    
                    // Start animation but immediately pause it at the beginning
                    this.scene.beginAnimation(this.skeleton, 0, 100, true);
                    this.scene.stopAnimation(this.skeleton);
                    
                    console.log(`Carbine: Loaded model with skeleton animation`);
                } else {
                    console.log(`Carbine: Loaded model without skeleton animation`);
                }
                
                // Calculate muzzle position (front of the weapon)
                this.calculateMuzzlePosition();
                
                console.log(`Carbine: Model loaded successfully`);
            } else {
                throw new Error('No meshes found in carbine model');
            }
            
        } catch (error) {
            console.warn(`Carbine: Failed to load model - ${error.message}`);
            // Continue without model for testing
        }
    }
    
    /**
     * Calculate muzzle position relative to weapon model
     */
    calculateMuzzlePosition() {
        if (!this.model) return;
        
        // Get weapon bounds to estimate muzzle position
        const boundingInfo = this.model.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        
        // Muzzle is typically at the front of the weapon (positive Z direction)
        this.muzzlePosition = new BABYLON.Vector3(0, 0, size.z * 0.4);
        this.muzzleDirection = new BABYLON.Vector3(0, 0, 1);
    }
    
    /**
     * Fire the carbine weapon
     */
    fire(origin, direction) {
        // Check if weapon can fire
        if (!this.canFireWeapon()) {
            console.log('Carbine: Cannot fire - weapon not ready');
            return false;
        }
        
        // Check fire rate (semi-automatic)
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastShotTime < this.fireRate) {
            return false; // Too soon to fire again
        }
        
        console.log(`Carbine: Firing - Ammo: ${this.currentAmmo}/${this.magazineSize}`);
        
        // Perform raycast for hit detection
        const hitResult = this.performHitDetection(origin, direction);
        
        // Apply damage if hit detected
        if (hitResult && hitResult.hit) {
            this.applyDamage(hitResult);
        }
        
        // Create muzzle flash effect
        this.createMuzzleFlash(origin, direction);
        
        // Apply recoil effects
        this.applyRecoil();
        this.addRecoilToAccuracy();
        
        // Consume ammunition
        this.consumeAmmo(1);
        
        // Set firing cooldown
        this.setFiringCooldown();
        this.lastShotTime = currentTime;
        
        // Trigger fire event
        if (this.onFire) {
            this.onFire(this.getWeaponInfo());
        }
        
        console.log(`Carbine: Shot fired - Remaining ammo: ${this.currentAmmo}`);
        return true;
    }
    
    /**
     * Perform hit detection using raycast
     */
    performHitDetection(origin, direction) {
        if (!this.raycastManager) {
            console.warn('Carbine: No raycast manager available for hit detection');
            return null;
        }
        
        // Apply accuracy to shot direction
        const accurateDirection = this.applyAccuracyToDirection(direction);
        
        // Perform bullet raycast
        const hitResult = this.raycastManager.bulletRaycast(
            origin,
            accurateDirection,
            500, // Max distance for carbine
            [this.model] // Exclude own weapon model
        );
        
        if (hitResult && hitResult.hit) {
            console.log(`Carbine: Hit detected at distance ${hitResult.distance.toFixed(2)}m`);
            
            // Add hit point and normal information
            hitResult.damage = this.damage;
            hitResult.weaponType = this.type;
            hitResult.weaponName = this.name;
        }
        
        return hitResult;
    }
    
    /**
     * Apply damage to hit target
     */
    applyDamage(hitResult) {
        if (!hitResult || !hitResult.mesh) return;
        
        const targetMesh = hitResult.mesh;
        
        // Check if target has health component or damage handler
        if (targetMesh.metadata && targetMesh.metadata.takeDamage) {
            // Call target's damage handler
            targetMesh.metadata.takeDamage(this.damage, hitResult.point, hitResult.normal, this.type);
            console.log(`Carbine: Applied ${this.damage} damage to ${targetMesh.name}`);
        } else if (targetMesh.metadata && targetMesh.metadata.isPlayer) {
            // Handle player damage
            console.log(`Carbine: Hit player ${targetMesh.name} for ${this.damage} damage`);
            // TODO: Integrate with player health system
        } else {
            // Hit environment or other object
            console.log(`Carbine: Hit environment object ${targetMesh.name}`);
            // TODO: Create impact effects on environment
        }
    }
    
    /**
     * Create muzzle flash effect
     */
    createMuzzleFlash(origin, direction) {
        if (!this.effectsManager) {
            console.warn('Carbine: No effects manager available for muzzle flash');
            return;
        }
        
        // Calculate world muzzle position
        let muzzleWorldPos = origin.clone();
        let muzzleWorldDir = direction.clone();
        
        if (this.model && this.model.isEnabled()) {
            // Transform muzzle position to world coordinates
            const worldMatrix = this.model.getWorldMatrix();
            muzzleWorldPos = BABYLON.Vector3.TransformCoordinates(this.muzzlePosition, worldMatrix);
            muzzleWorldDir = BABYLON.Vector3.TransformNormal(this.muzzleDirection, worldMatrix);
        }
        
        // Create donut-style muzzle flash for semi-automatic weapon
        const flashEffect = this.effectsManager.createMuzzleFlash(
            muzzleWorldPos,
            muzzleWorldDir,
            MuzzleFlashType.DONUT,
            this.model
        );
        
        if (flashEffect) {
            console.log('Carbine: Muzzle flash effect created');
        }
    }
    
    /**
     * Play reload animation with proper skeleton handling
     */
    playReloadAnimation() {
        if (this.skeleton) {
            // Stop current animation
            this.scene.stopAnimation(this.skeleton);
            
            // Play reload animation (assuming it's in frames 100-200)
            this.scene.beginAnimation(this.skeleton, 100, 200, false);
            this.isAnimationPaused = false;
            
            console.log('Carbine: Playing reload animation');
        } else {
            console.log('Carbine: No skeleton available for reload animation');
        }
    }
    
    /**
     * Pause animation at idle (beginning of sequence)
     */
    pauseAtIdle() {
        if (this.skeleton) {
            // Stop any current animation
            this.scene.stopAnimation(this.skeleton);
            
            // Start animation but pause it at the beginning
            this.scene.beginAnimation(this.skeleton, 0, 100, true);
            this.scene.stopAnimation(this.skeleton);
            this.isAnimationPaused = true;
            
            console.log('Carbine: Animation paused at idle');
        }
    }
    
    /**
     * Resume animation from current frame
     */
    resumeAnimation() {
        if (this.skeleton && this.isAnimationPaused) {
            const currentFrame = this.skeleton.currentFrame || 0;
            this.scene.beginAnimation(this.skeleton, currentFrame, 100, true);
            this.isAnimationPaused = false;
            
            console.log(`Carbine: Animation resumed from frame ${currentFrame}`);
        }
    }
    
    /**
     * Finish reloading the weapon (override to handle animation)
     */
    finishReload() {
        // Call parent reload finish
        super.finishReload();
        
        // Return to idle animation
        this.pauseAtIdle();
    }
    
    /**
     * Show/hide weapon model (override to handle animation state)
     */
    setVisible(visible) {
        super.setVisible(visible);
        
        if (visible && this.isAnimationPaused) {
            // Ensure animation is properly paused when showing weapon
            this.pauseAtIdle();
        }
    }
    
    /**
     * Update weapon logic each frame
     */
    update(deltaTime) {
        // Call parent update
        super.update(deltaTime);
        
        // Carbine-specific updates can be added here
        // For example, checking for animation completion, etc.
    }
    
    /**
     * Get carbine-specific weapon information
     */
    getWeaponInfo() {
        const baseInfo = super.getWeaponInfo();
        
        return {
            ...baseInfo,
            lastShotTime: this.lastShotTime,
            muzzlePosition: this.muzzlePosition.clone(),
            muzzleDirection: this.muzzleDirection.clone(),
            hasModel: !!this.model,
            hasSkeleton: !!this.skeleton,
            isAnimationPaused: this.isAnimationPaused
        };
    }
    
    /**
     * Dispose of carbine resources
     */
    dispose() {
        console.log('Disposing Carbine weapon...');
        
        // Stop any running animations
        if (this.skeleton) {
            this.scene.stopAnimation(this.skeleton);
            this.skeleton = null;
        }
        
        // Clear references
        this.raycastManager = null;
        
        // Call parent dispose
        super.dispose();
        
        console.log('Carbine weapon disposed');
    }
}

export default Carbine;