/**
 * KILLtONE Game Framework - WeaponBase Abstract Class
 * Base class for all weapons with common functionality
 */

// BABYLON is loaded globally from CDN in index.html
import { WeaponConstants } from './WeaponConfig.js';
import { AccuracySystem } from './AccuracySystem.js';
import { MathUtils } from '../../utils/MathUtils.js';

export class WeaponBase {
    constructor(config, scene, effectsManager, accuracySystem = null, game = null, ammoRegistry = null) {
        // WeaponBase is now a concrete class that handles all weapon types generically

        this.config = config;
        this.scene = scene;
        this.effectsManager = effectsManager;
        this.game = game;
        this.ammoRegistry = ammoRegistry;

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
        this.reloadStartFrame = config.reloadStartFrame
        this.reloadEndFrame = config.reloadEndFrame

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

        this.baseRotation = null;
        this.basePosition = null;

        // Accuracy system integration
        this.accuracySystem = accuracySystem || new AccuracySystem();
        this.accuracySystem.setCurrentWeapon(this.type);

        // Recoil pattern for this weapon
        this.recoilPattern = null;

        // Events
        this.onFire = null;
        this.onReload = null;
        this.onAmmoChanged = null;
        this.onWeaponEmpty = null;
    }

    /**
     * Initialize the weapon - generic for all weapon types
     */
    async initialize(assetManager = null) {
        console.log(`Initializing weapon: ${this.name}`);

        // Load weapon model and animations
        await this.loadModel(assetManager);

        // Set up weapon-specific configurations
        this.setupWeaponSpecifics();

        // Initialize to idle state
        this.pauseAtIdle();

        console.log(`${this.name} initialized successfully`);
        return true;
    }

    /**
     * Setup weapon-specific configurations
     */
    setupWeaponSpecifics() {
        // Use recoil pattern from config if available
        if (this.config.recoilPattern) {
            this.recoilPattern = {
                horizontal: this.config.recoilPattern.horizontal,
                vertical: this.config.recoilPattern.vertical,
                recovery: this.config.recoilPattern.recovery
            };
        }

        // Set up weapon-specific properties
        if (this.config.pelletCount) {
            this.pelletCount = this.config.pelletCount;
            this.spreadAngle = this.config.spreadAngle || 15;
        }

        if (this.config.range) {
            this.meleeRange = this.config.range;
            this.swingAngle = this.config.swingAngle || 60;
        }
    }

    /**
     * Fire the weapon (generic method handling all weapon types)
     * @param {BABYLON.Vector3} origin - The starting position of the shot
     * @param {BABYLON.Vector3} direction - The direction vector of the shot
     * @param {Object} game - The game instance containing managers and systems
     * @returns {boolean} - True if the shot was fired successfully, false otherwise
     */
    fire(origin, direction, gameInstance = null) {
        // Use the game instance passed in or fall back to this.game
        const game = gameInstance || this.game;

        // Check if weapon can fire
        if (!this.canFireWeapon()) {
            console.log(`${this.name}: Cannot fire - weapon not ready`);
            return false;
        }

        // Check fire rate
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastFireTime < this.fireRate) {
            return false; // Too soon to fire again
        }

        console.log(`${this.name}: Firing - Ammo: ${this.getCurrentAmmo()}/${this.getMaxAmmo()}`);

        // Handle different weapon types
        let success = false;
        switch (this.type) {
            case 'shotgun':
                success = this.fireShotgun(origin, direction, game);
                break;
            case 'knife':
                success = this.performMeleeAttack(origin, direction, game);
                break;
            default:
                success = this.fireHitscan(origin, direction, game);
                break;
        }

        if (success) {
            // Play firing animation
            this.playFiringAnimation();

            // Create muzzle flash effect (not for melee)
            if (this.type !== 'knife') {
                this.createMuzzleFlash(origin, direction);
            }

            // Play weapon fire sound
            this.playFireSound();

            // Apply recoil effects (not for melee)
            if (this.type !== 'knife') {
                this.addRecoilToAccuracy();
            }

            // Consume ammunition
            this.consumeAmmo(1);

            // Set firing cooldown
            this.setFiringCooldown();
            this.lastFireTime = currentTime;

            // Trigger fire event
            if (this.onFire) {
                this.onFire(this.getWeaponInfo());
            }

            console.log(`${this.name}: Attack completed - Remaining ammo: ${this.getCurrentAmmo()}`);
        }

        return success;
    }

    /**
     * Fire a hitscan weapon
     * @param {BABYLON.Vector3} origin - The starting position of the shot
     * @param {BABYLON.Vector3} direction - The direction vector of the shot
     * @param {Object} game - The game instance containing managers and systems
     * @returns {boolean} - True if the shot was fired successfully, false otherwise
     */
    fireHitscan(origin, direction, game) {
        // Apply accuracy to shot direction
        const accurateDirection = this.applyAccuracyToDirection(direction);

        // Send weapon attack to server for server-side raycast
        if (game && game.networkManager && game.networkManager.isConnected) {
            const weaponAttackData = {
                origin: {
                    x: origin.x,
                    y: origin.y,
                    z: origin.z
                },
                direction: {
                    x: accurateDirection.x,
                    y: accurateDirection.y,
                    z: accurateDirection.z
                },
                weaponType: this.type
            };
            
            console.log(`${this.name}: Sending weapon attack to server:`, weaponAttackData);
            game.networkManager.emit('weaponAttack', weaponAttackData);
            
            return true;
        } else {
            // Fallback to client-side raycast if not connected
            console.warn(`${this.name}: Not connected to server`);
            
            return true;
        }
    }

    /**
     * Fire shotgun pellets
     * @param {BABYLON.Vector3} origin - The starting position of the shot
     * @param {BABYLON.Vector3} direction - The direction vector of the shot
     * @param {Object} game - The game instance containing managers and systems
     * @returns {boolean} - True if the shot was fired successfully, false otherwise
     */
    fireShotgun(origin, direction, game) {

        const pelletCount = this.pelletCount || 10;
        const spreadAngle = this.spreadAngle || 15;

        // Fire multiple pellets with spread
        for (let i = 0; i < pelletCount; i++) {
            // Calculate spread for this pellet
            const spreadDirection = this.calculateShotgunSpread(direction, spreadAngle);

            // Fire the pellet
            this.fireHitscan(origin, spreadDirection, game);
        }

        return true;
    }

    /**
     * Perform melee attack (knife)
     */
    performMeleeAttack(origin, direction, game) {
        if (!game || !game.raycastManager) {
            console.warn(`${this.name}: No raycast manager available for melee attack`);
            return false;
        }

        const meleeRange = this.meleeRange || 2.0;
        const swingAngle = this.swingAngle || 60;

        // Perform raycast for melee hit detection
        const hitInfo = game.raycastManager.bulletRaycast(
            origin,
            direction,
            meleeRange,
            [] // No exclusions for melee
        );

        if (hitInfo && hitInfo.hit) {
            // Check if target is within swing angle
            const targetDirection = hitInfo.point.subtract(origin).normalize();
            const angle = Math.acos(BABYLON.Vector3.Dot(direction, targetDirection));
            const angleDegrees = MathUtils.radToDeg(angle);

            if (angleDegrees <= swingAngle / 2) {
                // Valid hit - apply damage
                this.processMeleeHit(hitInfo, game);
                return true;
            }
        }

        // No hit, but still a valid attack
        return true;
    }

    /**
     * Process melee hit
     */
    processMeleeHit(hitInfo, game) {
        // Create hit effect
        if (game.particleManager) {
            game.particleManager.createHitSpark(hitInfo.point, hitInfo.normal);
        }

        // Handle player hits
        if (hitInfo.mesh && hitInfo.mesh.metadata && hitInfo.mesh.metadata.type === 'player') {
            const playerId = hitInfo.mesh.metadata.playerId;

            if (game.playerManager) {
                game.playerManager.applyDamage(playerId, this.damage, {
                    source: 'melee',
                    attackerId: 'local',
                    position: hitInfo.point
                });
            }

            // Create blood effects
            if (game.particleManager) {
                game.particleManager.createBloodSplatter(hitInfo.point, hitInfo.normal);
            }
        }

        // Emit melee hit event
        if (game.eventEmitter) {
            game.eventEmitter.emit('melee.hit', {
                weapon: this.name,
                damage: this.damage,
                position: hitInfo.point,
                target: hitInfo.mesh
            });
        }
    }

    /**
     * Calculate shotgun pellet spread
     * @param {BABYLON.Vector3} baseDirection - initial vector direction of each shot
     * @param {Number} spreadAngle - degree at which pellets can diverge from baseDirection
     * @returns {BABYLON.Vector3} - final direction of individual shotgun pellet
     */
    calculateShotgunSpread(baseDirection, spreadAngle) {
        const spreadRadians = MathUtils.degToRad(spreadAngle);

        // Generate random spread within cone
        const randomAngle = MathUtils.random(0, MathUtils.TWO_PI);
        const randomRadius = MathUtils.random(0, spreadRadians / 2);

        // Create perpendicular vectors for spread
        const up = new BABYLON.Vector3(0, 1, 0);
        const right = BABYLON.Vector3.Cross(baseDirection, up).normalize();
        const actualUp = BABYLON.Vector3.Cross(right, baseDirection).normalize();

        // Apply spread
        const spreadX = Math.cos(randomAngle) * randomRadius;
        const spreadY = Math.sin(randomAngle) * randomRadius;

        const spreadDirection = baseDirection.clone();
        spreadDirection.addInPlace(right.scale(spreadX));
        spreadDirection.addInPlace(actualUp.scale(spreadY));
        spreadDirection.normalize();

        return spreadDirection;
    }

    /**
     * Play firing animation (manual animation for firing/swapping)
     */
    playFiringAnimation() {
        if (!this.model) return;

        // For firing, we manually animate the weapon position
        const originalPosition = this.basePosition;
        const recoilOffset = new BABYLON.Vector3(0, 0, -0.1); // Pull back slightly

        // Quick recoil animation
        const recoilAnim = BABYLON.Animation.CreateAndStartAnimation(
            'weaponRecoil',
            this.model,
            'position',
            60, // 60 FPS
            3, // 3 frames
            originalPosition,
            originalPosition.add(recoilOffset),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            () => {
                // Return to original position
                BABYLON.Animation.CreateAndStartAnimation(
                    'weaponReturn',
                    this.model,
                    'position',
                    60,
                    5, // 5 frames to return
                    this.model.position,
                    originalPosition,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
            }
        );
    }

    /**
     * Play weapon swap animation (manual animation)
     */
    playSwapAnimation(isDrawing = true) {
        if (!this.model) return;

        const startY = isDrawing ? -2.0 : 0.0; // Start below screen or at normal position
        const endY = isDrawing ? 0.0 : -2.0;   // End at normal position or below screen

        const startPos = new BABYLON.Vector3(this.model.position.x, startY, this.model.position.z);
        const endPos = new BABYLON.Vector3(this.model.position.x, endY, this.model.position.z);

        this.model.position = startPos;

        // Animate weapon swap
        BABYLON.Animation.CreateAndStartAnimation(
            isDrawing ? 'weaponDraw' : 'weaponHolster',
            this.model,
            'position',
            60, // 60 FPS
            15, // 15 frames (0.25 seconds)
            startPos,
            endPos,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            () => {
                if (!isDrawing) {
                    // Hide weapon after holstering
                    this.setVisible(false);
                }
            }
        );
    }

    /**
     * Create muzzle flash effect using configuration
     */
    createMuzzleFlash(origin, direction) {
        // Skip muzzle flash for melee weapons
        if (!this.config.muzzleFlash) {
            console.log(`${this.name}: No muzzle flash config, skipping`);
            return;
        }

        if (!this.effectsManager || !this.effectsManager.muzzleFlash) {
            console.warn(`${this.name}: No muzzle flash system available`);
            return;
        }

        console.log(`${this.name}: Creating muzzle flash`);

        // Create muzzle flash with weapon-specific configuration
        // The MuzzleFlash system will handle positioning based on the config
        this.effectsManager.muzzleFlash.createMuzzleFlash(
            origin,
            direction,
            this.model,
            this.config.muzzleFlash
        );
        console.log(`${this.name}: Muzzle flash created`);
    }

    /**
     * Play weapon fire sound
     */
    playFireSound() {
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.playWeaponSound(this.config);
        } else {
            console.warn(`${this.name}: No audio system available for fire sound`);
        }
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
        // Check reload conditions using AmmoRegistry if available
        if (this.game && this.ammoRegistry) {
            if (this.isReloading ||
                this.ammoRegistry.isFull(this.type) ||
                this.ammoRegistry.isInfiniteAmmo(this.type)) {
                return false;
            }
        } else {
            // Fallback to local state
            if (this.isReloading ||
                this.currentAmmo >= this.magazineSize ||
                this.magazineSize === Infinity) {
                return false;
            }
        }

        console.log(`Reloading ${this.name}...`);

        this.isReloading = true;

        this.model.rotation = this.baseRotation.clone();
        this.model.position = this.basePosition.clone();

        // Play reload animation
        this.playReloadAnimation();

        // Play reload sound
        this.playReloadSound();

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

        // Reload using AmmoRegistry if available
        if (this.game && this.ammoRegistry) {
            this.ammoRegistry.reloadWeapon(this.type);
            this.currentAmmo = this.ammoRegistry.getCurrentAmmo(this.type);
        } else {
            // Fallback to local state
            this.currentAmmo = this.magazineSize;
        }

        this.isReloading = false;

        // Return to idle animation
        this.pauseAtIdle();

        console.log(`${this.name} reloaded. Ammo: ${this.currentAmmo}/${this.getMaxAmmo()}`);

        // Trigger events
        if (this.onReload) {
            this.onReload(false);
        }

        if (this.onAmmoChanged) {
            this.onAmmoChanged(this.currentAmmo, this.getMaxAmmo());
        }
    }

    /**
     * Play reload sound
     */
    playReloadSound() {
        if (this.game && this.game.audioSystem) {
            this.game.audioSystem.playReloadSound(this.config);
        } else {
            console.warn(`${this.name}: No audio system available for reload sound`);
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
     * Load weapon model and animations using AssetManager
     */
    async loadModel(assetManager = null) {
        if (!this.config.modelPath) return;

        try {
            // Try to use AssetManager if available
            if (assetManager && assetManager.getAsset) {
                const weaponAsset = assetManager.getAsset(this.type);
                if (weaponAsset && weaponAsset.meshes.length > 0) {
                    // Clone the asset for this weapon instance
                    this.model = weaponAsset.meshes[0].clone(`${this.name}_model`);
                    this.model.setEnabled(false); // Hidden by default

                    // Apply model configuration
                    this.applyModelConfiguration();

                    // Store animation groups (don't clone, use references)
                    if (weaponAsset.animationGroups && weaponAsset.animationGroups.length > 0) {
                        weaponAsset.animationGroups.forEach(animGroup => {
                            // Use the original animation group, don't clone
                            this.animationGroups.set(animGroup.name.toLowerCase(), animGroup);
                            animGroup.stop(); // Stop all animations initially
                        });

                        console.log(`Loaded ${weaponAsset.animationGroups.length} animations for ${this.name}:`,
                            Array.from(this.animationGroups.keys()));
                    } else {
                        console.warn(`No animations found for weapon ${this.name}`);
                    }

                    console.log(`Loaded model for ${this.name} from AssetManager`);
                    return;
                }
            }

            // Fallback to direct loading with proper GLB support
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "",
                this.config.modelPath,
                this.scene
            );

            if (result.meshes.length > 0) {
                this.model = result.meshes[0];
                this.model.name = `${this.name}_model`;
                this.model.setEnabled(false); // Hidden by default

                // NORMALIZE WEAPON TRANSFORMATIONS
                // Reset any transformations that might be stored in the GLB file
                console.log(`${this.name} - Before normalization:`, {
                    position: this.model.position.toString(),
                    rotation: this.model.rotation.toString(),
                    scaling: this.model.scaling.toString()
                });

                // Reset all transformations to identity
                this.model.position = new BABYLON.Vector3(0, 0, 0);
                this.model.rotation = new BABYLON.Vector3(0, 0, 0);
                this.model.scaling = new BABYLON.Vector3(1, 1, 1);

                this.baseRotation = new BABYLON.Vector3(0, 0, 0);
                this.basePosition = new BABYLON.Vector3(0, 0, 0);

                // Also normalize any child meshes that might have transformations
                result.meshes.forEach(mesh => {
                    if (mesh !== this.model) {
                        mesh.position = new BABYLON.Vector3(0, 0, 0);
                        mesh.rotation = new BABYLON.Vector3(0, 0, 0);
                        mesh.scaling = new BABYLON.Vector3(1, 1, 1);
                    }
                });

                // Apply model configuration after normalization
                this.applyModelConfiguration();

                console.log(`${this.name} - After configuration:`, {
                    position: this.model.position.toString(),
                    rotation: this.model.rotation.toString(),
                    scaling: this.model.scaling.toString()
                });

                // Ensure proper material setup for GLB files
                if (this.model.material) {
                    // Enable proper lighting for PBR materials (common in GLB files)
                    if (this.model.material.getClassName() === 'PBRMaterial') {
                        this.model.material.environmentIntensity = 1.0;
                        this.model.material.directIntensity = 1.0;
                    }
                }

                // Handle child meshes for complex GLB models
                result.meshes.forEach(mesh => {
                    if (mesh !== this.model && mesh.material) {
                        // Apply same material fixes to child meshes
                        if (mesh.material.getClassName() === 'PBRMaterial') {
                            mesh.material.environmentIntensity = 1.0;
                            mesh.material.directIntensity = 1.0;
                        }
                    }
                });

                // Store animation groups
                if (result.animationGroups) {
                    result.animationGroups.forEach(animGroup => {
                        this.animationGroups.set(animGroup.name.toLowerCase(), animGroup);
                        animGroup.stop(); // Stop all animations initially
                    });

                    console.log(`Loaded ${result.animationGroups.length} animations for ${this.name}:`,
                        Array.from(this.animationGroups.keys()));
                }

                console.log(`Loaded GLB model for ${this.name} with ${result.meshes.length} meshes`);
            }
        } catch (error) {
            console.warn(`Failed to load model for ${this.name}:`, error);
        }
    }

    /**
     * Apply model configuration settings (scaling, position, rotation, handedness)
     */
    applyModelConfiguration() {
        if (!this.model || !this.config.modelConfig) return;

        const config = this.config.modelConfig;

        // Apply scaling
        if (config.scaling) {
            this.model.scaling = new BABYLON.Vector3(
                config.scaling.x || 1.0,
                config.scaling.y || 1.0,
                config.scaling.z || 1.0
            );
        }

        // Apply position offset
        if (config.position) {
            this.model.position = new BABYLON.Vector3(
                config.position.x || 0.0,
                config.position.y || 0.0,
                config.position.z || 0.0
            );
            this.basePosition = this.model.position.clone();
        }

        // Apply rotation offset
        if (config.rotation) {
            this.model.rotation = new BABYLON.Vector3(
                config.rotation.x || 0.0,
                config.rotation.y || 0.0,
                config.rotation.z || 0.0
            );
            this.baseRotation = this.model.rotation.clone();
        }

        // Apply handedness (flip model horizontally if needed)
        if (config.handedness === 'left') {
            // Flip the model horizontally by scaling X axis to -1
            this.model.scaling.x *= -1;
            console.log(`${this.name}: Applied left-handed configuration`);
        }

        console.log(`${this.name}: Applied model configuration:`, {
            scaling: this.model.scaling.toString(),
            position: this.model.position.toString(),
            rotation: this.model.rotation.toString(),
            handedness: config.handedness || 'right'
        });
    }

    /**
     * Play reload animation
     */
    playReloadAnimation() {
        // Try to find specific reload animation first
        const reloadAnim = this.animationGroups.get('reload') ||
            this.animationGroups.get('reloadaction') ||
            this.animationGroups.get('action');

        if (reloadAnim) {
            // Stop current animation
            if (this.currentAnimation) {
                this.currentAnimation.stop();
            }

            // Play reload animation once
            reloadAnim.play(false);
            this.currentAnimation = reloadAnim;

            console.log(`Playing reload animation for ${this.name}`);
        } else {
            // Fallback: use the main animation group and play a specific range for reload
            const mainAnim = this.animationGroups.get('allanims');
            if (mainAnim) {
                // Stop current animation
                if (this.currentAnimation) {
                    this.currentAnimation.stop();
                }

                // Debug: Log animation info to help find correct frame range
                console.log(`Animation '${mainAnim.name}' - From: ${mainAnim.from}, To: ${mainAnim.to}, Total frames: ${mainAnim.to - mainAnim.from}`);

                // Get reload frame range from config, with fallback defaults
                const reloadStartFrame = this.config.reloadStartFrame || 60;
                const reloadEndFrame = this.config.reloadEndFrame || 120;

                mainAnim.start(false, 1.0, reloadStartFrame, reloadEndFrame, false);
                this.currentAnimation = mainAnim;

                console.log(`Playing reload animation from main animation group for ${this.name} (frames ${reloadStartFrame}-${reloadEndFrame})`);
            } else {
                console.warn(`No reload animation found for ${this.name}. Available animations:`,
                    Array.from(this.animationGroups.keys()));
            }
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
     * Update animations
     */
    updateAnimations(deltaTime) {
        // Animation updates handled by Babylon.js animation system
        // This method can be overridden by subclasses for custom animation logic
    }

    /**
     * Get current ammunition count (delegated to AmmoRegistry)
     */
    getCurrentAmmo() {
        // If AmmoRegistry is available, use it; otherwise fallback to local state
        if (this.game && this.ammoRegistry) {
            return this.ammoRegistry.getCurrentAmmo(this.type);
        }
        return this.currentAmmo;
    }

    /**
     * Get maximum ammunition capacity (delegated to AmmoRegistry)
     */
    getMaxAmmo() {
        // If AmmoRegistry is available, use it; otherwise fallback to local state
        if (this.game && this.ammoRegistry) {
            return this.ammoRegistry.getMaxAmmo(this.type);
        }
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
     * Set aiming state for weapon
     */
    setAiming(aiming) {
        this.isAiming = aiming;

        // Could adjust weapon position, FOV, or accuracy when aiming
        if (this.accuracySystem) {
            this.accuracySystem.setAiming(aiming);
        }

        // Visual feedback for aiming (could be overridden by subclasses)
        if (this.model && aiming) {
            // Slightly adjust weapon position when aiming
            this.model.position.z += 0.1;
        } else if (this.model && !aiming) {
            // Return to normal position
            this.model.position.z -= 0.1;
        }
    }

    /**
     * Consume ammunition (delegated to AmmoRegistry)
     */
    consumeAmmo(amount = 1) {
        // If AmmoRegistry is available, use it; otherwise fallback to local state
        if (this.game && this.ammoRegistry) {
            const consumed = this.ammoRegistry.consumeAmmo(this.type, amount);
            if (consumed) {
                // Update local state for compatibility
                this.currentAmmo = this.ammoRegistry.getCurrentAmmo(this.type);

                // Trigger ammo changed event
                if (this.onAmmoChanged) {
                    this.onAmmoChanged(this.currentAmmo, this.getMaxAmmo());
                }

                // Check if weapon is empty
                if (this.ammoRegistry.isEmpty(this.type) && this.onWeaponEmpty) {
                    this.onWeaponEmpty();
                }
            }
            return consumed;
        }

        // Fallback to local state management
        if (this.magazineSize === Infinity) {
            return true; // Infinite ammo weapons don't consume ammo
        }

        if (this.currentAmmo < amount) {
            return false;
        }

        this.currentAmmo = MathUtils.clamp(this.currentAmmo - amount, 0, this.magazineSize);

        // Trigger ammo changed event
        if (this.onAmmoChanged) {
            this.onAmmoChanged(this.currentAmmo, this.magazineSize);
        }

        // Check if weapon is empty
        if (this.currentAmmo <= 0 && this.onWeaponEmpty) {
            this.onWeaponEmpty();
        }

        return true;
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
        const spreadRadians = MathUtils.degToRad(spreadAngle) * (1.0 - currentAccuracy);

        if (spreadRadians > 0) {
            // Generate random spread within cone
            const randomAngle = MathUtils.random(0, MathUtils.TWO_PI);
            const randomRadius = MathUtils.random(0, spreadRadians);

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
