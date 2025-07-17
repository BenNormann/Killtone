/**
 * KILLtONE Game Framework - Carbine Weapon Implementation
 * Semi-automatic rifle with 50 damage and 12-round magazine
 */

import { WeaponBase } from './WeaponBase.js';
import { WeaponConfigs, WeaponType, MuzzleFlashType } from './WeaponConfig.js';
import { MuzzleFlash } from '../../effects/MuzzleFlash.js';

export class Carbine extends WeaponBase {
    constructor(scene, effectsManager, accuracySystem = null, game = null) {
        // Get carbine configuration
        const config = WeaponConfigs[WeaponType.CARBINE];

        super(config, scene, effectsManager, accuracySystem, game);

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
     * Create carbine-specific projectile data
     */
    createProjectileData(origin, direction, game = null) {
        return {
            origin: origin.clone(),
            direction: direction,
            weapon: {
                name: this.name,
                type: this.type,
                damage: this.damage
            },
            damage: this.damage,
            range: 500, // Carbine effective range
            speed: 800, // High velocity for hitscan behavior
            showTrail: true,
            playerId: 'local' // TODO: Get from player system
        };
    }

    /**
     * Create carbine-specific muzzle flash effect
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

        // Create muzzle flash using MuzzleFlash system for assault rifle
        const muzzleFlash = new MuzzleFlash(this.game, this.game?.particleManager);
        muzzleFlash.createMuzzleFlash(muzzleWorldPos, muzzleWorldDir, 'assault_rifle');
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
        this.game = null;

        // Call parent dispose
        super.dispose();

        console.log('Carbine weapon disposed');
    }
}

export default Carbine;