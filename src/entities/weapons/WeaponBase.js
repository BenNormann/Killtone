/**
 * KILLtONE Game Framework - WeaponBase Abstract Class
 * Base class for all weapons with common functionality
 */

// BABYLON is loaded globally from CDN in index.html
import { WeaponConstants } from './WeaponConfig.js';
import { AccuracySystem } from './AccuracySystem.js';
import { MathUtils } from '../../utils/MathUtils.js';

export class WeaponBase {
    constructor(config, scene, effectsManager, accuracySystem = null, game = null) {
        // WeaponBase is now a concrete class that handles all weapon types generically
        
        this.config = config;
        this.scene = scene;
        this.effectsManager = effectsManager;
        this.game = game;
        
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
     * Initialize the weapon - now generic for all weapon types
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
                success = this.fireProjectile(origin, direction, game);
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
                this.applyRecoil();
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
     * Fire a single projectile (rifles, pistols, SMGs, snipers)
     */
    fireProjectile(origin, direction, game) {
        // Apply accuracy to shot direction
        const accurateDirection = this.applyAccuracyToDirection(direction);

        // Create projectile data
        const projectileData = this.createProjectileData(origin, accurateDirection, game);

        // Create projectile through game's projectile manager
        if (game && game.projectileManager) {
            game.projectileManager.fireProjectile(projectileData);
            return true;
        } else {
            console.warn(`${this.name}: No projectile manager available`);
            return false;
        }
    }
    
    /**
     * Fire shotgun pellets
     */
    fireShotgun(origin, direction, game) {
        if (!game || !game.projectileManager) {
            console.warn(`${this.name}: No projectile manager available for shotgun`);
            return false;
        }

        const pelletCount = this.pelletCount || 10;
        const spreadAngle = this.spreadAngle || 15;
        
        // Fire multiple pellets with spread
        for (let i = 0; i < pelletCount; i++) {
            // Calculate spread for this pellet
            const spreadDirection = this.calculateShotgunSpread(direction, spreadAngle);
            
            // Create projectile data for this pellet
            const projectileData = this.createProjectileData(origin, spreadDirection, game);
            projectileData.damage = this.damage; // Each pellet does full damage
            
            // Fire the pellet
            game.projectileManager.fireProjectile(projectileData);
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
        const originalPosition = this.model.position.clone();
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
     * Create projectile data (can be overridden by subclasses)
     */
    createProjectileData(origin, direction, gameInstance = null) {
        return {
            origin: origin.clone(),
            direction: direction,
            weapon: {
                name: this.name,
                type: this.type,
                damage: this.damage
            },
            damage: this.damage,
            range: 400, // Default range
            speed: 700, // Default speed
            showTrail: true,
            playerId: 'local' // TODO: Get from player system
        };
    }

    /**
     * Create muzzle flash effect using configuration
     */
    createMuzzleFlash(origin, direction) {
        // Skip muzzle flash for melee weapons
        if (!this.config.muzzleFlash) {
            return;
        }

        if (!this.effectsManager || !this.effectsManager.muzzleFlash) {
            console.warn(`${this.name}: No muzzle flash system available`);
            return;
        }

        // Calculate muzzle position
        let muzzleWorldPos = origin.clone();
        let muzzleWorldDir = direction.clone();

        if (this.model && this.model.isEnabled()) {
            // Use configured muzzle position relative to weapon
            const muzzleConfig = this.config.muzzleFlash.position;
            const muzzleOffset = new BABYLON.Vector3(muzzleConfig.x, muzzleConfig.y, muzzleConfig.z);
            
            const worldMatrix = this.model.getWorldMatrix();
            muzzleWorldPos = BABYLON.Vector3.TransformCoordinates(muzzleOffset, worldMatrix);
            muzzleWorldDir = BABYLON.Vector3.TransformNormal(direction, worldMatrix);
        }

        // Create muzzle flash with weapon-specific configuration
        this.effectsManager.muzzleFlash.createMuzzleFlash(
            muzzleWorldPos, 
            muzzleWorldDir, 
            this.model,
            this.config.muzzleFlash
        );
    }

    /**
     * Play weapon fire sound
     */
    playFireSound() {
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playWeaponSound(this.config);
        } else {
            console.warn(`${this.name}: No audio manager available for fire sound`);
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
        if (this.game && this.game.ammoRegistry) {
            if (this.isReloading || 
                this.game.ammoRegistry.isFull(this.type) || 
                this.game.ammoRegistry.isInfiniteAmmo(this.type)) {
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
        if (this.game && this.game.ammoRegistry) {
            this.game.ammoRegistry.reloadWeapon(this.type);
            this.currentAmmo = this.game.ammoRegistry.getCurrentAmmo(this.type);
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
        if (this.game && this.game.audioManager) {
            this.game.audioManager.playReloadSound(this.config);
        } else {
            console.warn(`${this.name}: No audio manager available for reload sound`);
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
     * Play reload animation
     */
    playReloadAnimation() {
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
            console.warn(`No reload animation found for ${this.name}. Available animations:`, 
                Array.from(this.animationGroups.keys()));
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
        const recoilX = MathUtils.random(-0.5, 0.5) * this.recoilAmount * 0.1;
        const recoilY = MathUtils.random(-0.5, 0.5) * this.recoilAmount * 0.1;
        const recoilZ = MathUtils.random(0, 1) * this.recoilAmount * 0.05;
        
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
     * Get current ammunition count (delegated to AmmoRegistry)
     */
    getCurrentAmmo() {
        // If AmmoRegistry is available, use it; otherwise fallback to local state
        if (this.game && this.game.ammoRegistry) {
            return this.game.ammoRegistry.getCurrentAmmo(this.type);
        }
        return this.currentAmmo;
    }
    
    /**
     * Get maximum ammunition capacity (delegated to AmmoRegistry)
     */
    getMaxAmmo() {
        // If AmmoRegistry is available, use it; otherwise fallback to local state
        if (this.game && this.game.ammoRegistry) {
            return this.game.ammoRegistry.getMaxAmmo(this.type);
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
        if (this.game && this.game.ammoRegistry) {
            const consumed = this.game.ammoRegistry.consumeAmmo(this.type, amount);
            if (consumed) {
                // Update local state for compatibility
                this.currentAmmo = this.game.ammoRegistry.getCurrentAmmo(this.type);
                
                // Trigger ammo changed event
                if (this.onAmmoChanged) {
                    this.onAmmoChanged(this.currentAmmo, this.getMaxAmmo());
                }
                
                // Check if weapon is empty
                if (this.game.ammoRegistry.isEmpty(this.type) && this.onWeaponEmpty) {
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
