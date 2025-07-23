/**
 * KILLtONE Game Framework - Player Class
 * Handles FPS player controls, camera, movement, and weapon management
 */

import { WeaponType, WeaponConfigs } from './weapons/WeaponConfig.js';
import { WeaponBase } from './weapons/WeaponBase.js';

export class Player {
    constructor(game, initialPosition = new BABYLON.Vector3(0, 2, 0)) {
        this.game = game;
        this.scene = game.scene;
        
        // Camera and movement
        this.camera = null;
        this.position = initialPosition.clone();
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.isGrounded = false;
        
        // Movement state
        this.movementInput = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };
        
        // Movement settings
        this.walkSpeed = 2.0;
        this.sprintSpeed = 4.0;
        this.crouchSpeed = 1.0;
        this.jumpForce = 3.0;
        this.acceleration = 10.0;
        this.friction = 5.0;
        this.airControl = 0.3;
        
        // Player state
        this.isSprinting = false;
        this.isCrouching = false;
        this.isAiming = false;
        this.health = 100;
        this.maxHealth = 100;
        
        // Mouse look settings
        this.mouseSensitivity = this.game.config.controls.mouseSensitivity;
        this.invertY = this.game.config.controls.invertY;
        this.rotationX = 0; // Pitch
        this.rotationY = 0; // Yaw
        this.maxLookUp = Math.PI / 2 - 0.1;
        this.maxLookDown = -Math.PI / 2 + 0.1;
        
        // Weapons
        this.weapons = new Map();
        this.currentWeapon = null;
        this.weaponSlots = ['primary', 'pistol', 'knife'];
        this.currentWeaponSlot = 0;
        this.primaryWeaponType = WeaponType.CARBINE; // Default primary
        
        // Weapon attachment point
        this.weaponAttachPoint = null;
        
        // Physics
        this.collisionRadius = 0.5;
        this.playerHeight = 1.8;
        this.crouchHeight = 1.2;
        
        // Firing state
        this.isFiring = false;
        this.canFire = true;
        
        this.isInitialized = false;
    }

    /**
     * Initialize the player
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('Player already initialized');
            return;
        }

        try {
            console.log('Initializing player...');
            
            // Create camera
            this.createCamera();
            // Ensure grounded state is correct at spawn
            this.updateGroundCheck();
            
            // Create weapon attach point
            this.createWeaponAttachPoint();
            
            // Load and equip default weapons
            await this.loadDefaultWeapons();
            
            // Equip default weapon (carbine)
            this.equipWeapon('primary');
            
            this.isInitialized = true;
            console.log('Player initialized');
            
        } catch (error) {
            console.error('Failed to initialize player:', error);
            throw error;
        }
    }

    /**
     * Create FPS camera using UniversalCamera
     */
    createCamera() {
        // Create UniversalCamera for FPS controls
        this.camera = new BABYLON.UniversalCamera("playerCamera", this.position.clone(), this.scene);
        
        // Configure camera settings
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.fov = (this.game.config.graphics.fov * Math.PI) / 180; // Convert to radians
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
        
        // Enable collisions
        this.camera.checkCollisions = true;

        // gravity is handled by the physics engine
        this.camera.applyGravity = false;
        this.camera.ellipsoid = new BABYLON.Vector3(this.collisionRadius, this.playerHeight / 2, this.collisionRadius);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, this.playerHeight / 2, 0);
        
        // Disable default controls - we'll handle input manually
        this.camera.inputs.clear();
        
        // Set as active camera
        this.scene.activeCamera = this.camera;
        
        console.log('FPS camera created');
    }

    /**
     * Attach camera controls for game mode
     */
    attachControls() {
        if (this.camera && this.game.canvas) {
            // Use Babylon's built-in pointer lock handling
            this.camera.attachControl(this.game.canvas, true);
            console.log('Camera controls attached');
        }
    }

    /**
     * Detach camera controls
     */
    detachControls() {
        if (this.camera) {
            this.camera.detachControl();
            console.log('Camera controls detached');
        }
    }

    /**
     * Create weapon attachment point
     */
    createWeaponAttachPoint() {
        // Create invisible mesh as weapon attach point
        this.weaponAttachPoint = new BABYLON.TransformNode("weaponAttach", this.scene);
        this.weaponAttachPoint.parent = this.camera;
        
        // Position weapon - moved down by ~1/4 screen and right by ~1/8 screen
        // Original: (0.3, -0.3, 0.8)
        // New: (0.5, -0.6, 0.8) - moved right by 0.2, down by 0.3
        this.weaponAttachPoint.position = new BABYLON.Vector3(0.5, -0.6, 0.8);
        
        console.log('Weapon attach point created');
    }

    /**
     * Load default weapons
     */
    async loadDefaultWeapons() {
        console.log('Loading default weapons...');
        
        try {
            // Load carbine (primary) using WeaponBase
            const carbine = new WeaponBase(
                WeaponConfigs[WeaponType.CARBINE],
                this.scene,
                this.game.particleManager,
                null,
                this.game
            );
            await carbine.initialize();
            this.weapons.set('primary', carbine);
            
            // Load pistol (secondary) using WeaponBase
            const pistol = new WeaponBase(
                WeaponConfigs[WeaponType.PISTOL],
                this.scene,
                this.game.particleManager,
                null,
                this.game
            );
            await pistol.initialize();
            this.weapons.set('pistol', pistol);
            
            // Load knife using WeaponBase
            const knife = new WeaponBase(
                WeaponConfigs[WeaponType.KNIFE],
                this.scene,
                this.game.particleManager,
                null,
                this.game
            );
            await knife.initialize();
            this.weapons.set('knife', knife);
            
            console.log('Default weapons loaded');
            
        } catch (error) {
            console.error('Failed to load weapons:', error);
            throw error;
        }
    }

    /**
     * Equip weapon by slot name
     */
    equipWeapon(slotName) {
        const weapon = this.weapons.get(slotName);
        if (!weapon) {
            console.warn(`No weapon found in slot: ${slotName}`);
            return;
        }
        
        // Hide current weapon
        if (this.currentWeapon) {
            this.currentWeapon.setVisible(false);
        }
        
        // Equip new weapon
        this.currentWeapon = weapon;
        this.currentWeaponSlot = this.weaponSlots.indexOf(slotName);
        
        // Attach weapon to attach point
        if (weapon.model) {
            weapon.model.parent = this.weaponAttachPoint;
            
            // Apply model configuration (scaling, position, rotation, handedness)
            // This is now handled by the weapon's applyModelConfiguration method
            // No need to reset scaling here as it's managed by the weapon config
            
            weapon.setVisible(true);
        }
        
        console.log(`Equipped weapon: ${weapon.name}`);
    }

    /**
     * Switch to next weapon
     */
    switchWeapon(direction = 'up') {
        const increment = direction === 'up' ? 1 : -1;
        this.currentWeaponSlot = (this.currentWeaponSlot + increment + this.weaponSlots.length) % this.weaponSlots.length;
        
        const slotName = this.weaponSlots[this.currentWeaponSlot];
        this.equipWeapon(slotName);
    }

    /**
     * Set weapon type for primary slot (called from settings menu)
     */
    async setWeapon(weaponType, weaponConfig) {
        try {
            // Create new weapon instance
            const weapon = new WeaponBase(
                weaponConfig,
                this.scene,
                this.game.particleManager,
                null,
                this.game
            );
            await weapon.initialize();
            
            // Replace the primary weapon
            this.weapons.set('primary', weapon);
            
            // If primary is currently equipped, re-equip it to show the new weapon
            if (this.currentWeaponSlot === 0) {
                this.equipWeapon('primary');
            }
            
            console.log(`Set primary weapon to: ${weaponConfig.name}`);
        } catch (error) {
            console.error('Failed to set weapon:', error);
        }
    }

    /**
     * Set movement input state
     */
    setMovementInput(direction, pressed) {
        if (this.movementInput.hasOwnProperty(direction)) {
            this.movementInput[direction] = pressed;
        }
    }

    /**
     * Handle mouse look for FPS camera
     */
    handleMouseLook(deltaX, deltaY) {
        if (!this.camera) return;
        
        // Apply sensitivity
        const sensitivity = this.mouseSensitivity * 0.002;
        
        // Update rotation
        this.rotationY += deltaX * sensitivity; // Yaw (horizontal) - fixed
        this.rotationX += deltaY * sensitivity * (this.invertY ? -1 : 1); // Pitch (vertical) - fixed
        
        // Clamp vertical rotation
        this.rotationX = Math.max(this.maxLookDown, Math.min(this.maxLookUp, this.rotationX));
        
        // Apply rotation to camera
        this.camera.rotation.x = this.rotationX;
        this.camera.rotation.y = this.rotationY;
    }

    /**
     * Jump
     */
    jump() {
        console.log("grounded: " + this.isGrounded);
        console.log("crouching: " + this.isCrouching);
        if (this.isGrounded && !this.isCrouching) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
        }
    }

    /**
     * Check if player can stand up (no obstacle above head)
     * Returns true if there is enough clearance to stand, false if blocked
     */
    checkCrouched() {
        if (!this.isCrouching) return true; // Only relevant if currently crouched
        if (!this.camera || !this.scene) return true;

        // Calculate the top of the crouched head
        const ellipsoid = this.camera.ellipsoid || new BABYLON.Vector3(0.5, this.playerHeight / 2, 0.5);
        const crouchedTop = this.camera.position.clone();
        crouchedTop.y += ellipsoid.y; // top of crouched head

        // How much higher the head would be if standing
        const standHeight = this.playerHeight - this.crouchHeight;
        if (standHeight <= 0) return true;

        // Raycast upward from crouched head to standing head height
        const ray = new BABYLON.Ray(crouchedTop, new BABYLON.Vector3(0, 1, 0), standHeight);
        const pick = this.scene.pickWithRay(
            ray,
            mesh => mesh.isPickable !== false && mesh.isEnabled() && mesh.checkCollisions
        );
        if (pick && pick.hit && pick.distance < standHeight) {
            // Obstacle detected above head
            return false;
        }
        return true;
    }

    /**
     * Set crouch state
     */
    setCrouch(crouching) {
        if (!crouching && this.isCrouching) {
            // Trying to stand up: check for head clearance
            if (!this.checkCrouched()) {
                // Not enough clearance, stay crouched
                return;
            }
        }
        this.isCrouching = crouching;
        
        // Adjust camera height
        if (this.camera) {
            const targetHeight = crouching ? this.crouchHeight : this.playerHeight;
            this.camera.ellipsoid.y = targetHeight / 2;
            this.camera.ellipsoidOffset.y = targetHeight / 2;
        }
    }

    /**
     * Set sprint state
     */
    setSprint(sprinting) {
        this.isSprinting = sprinting && !this.isCrouching;
    }

    /**
     * Set aiming state
     */
    setAiming(aiming) {
        this.isAiming = aiming;
        
        // Could adjust FOV or weapon position for aiming
        if (this.currentWeapon) {
            this.currentWeapon.setAiming(aiming);
        }
    }

    /**
     * Start firing current weapon
     */
    startFiring() {
        if (!this.currentWeapon || !this.canFire) return;
        
        this.isFiring = true;
        this.fireWeapon();
    }

    /**
     * Stop firing current weapon
     */
    stopFiring() {
        this.isFiring = false;
    }

    /**
     * Fire current weapon
     */
    fireWeapon() {
        if (!this.currentWeapon || !this.canFire) return;
        
        // Get camera direction for projectile
        const forward = this.camera.getForwardRay().direction;
        const origin = this.camera.position.clone();
        
        console.log('Player: Firing weapon from position:', origin.toString());
        console.log('Player: Firing direction:', forward.toString());
        
        // Fire weapon
        this.currentWeapon.fire(origin, forward);
        
        // Handle automatic firing
        if (this.isFiring && this.currentWeapon.firingMode === 'full-auto') {
            setTimeout(() => {
                if (this.isFiring) {
                    this.fireWeapon();
                }
            }, this.currentWeapon.fireRate * 1000);
        }
    }

    /**
     * Reload current weapon
     */
    reload() {
        if (this.currentWeapon && !this.currentWeapon.isReloading) {
            this.currentWeapon.reload();
        }
    }

    /**
     * Update player (called each frame)
     */
    update(deltaTime) {
        if (!this.isInitialized) return;
        
        // Continuous crouch check: if crouched and crouch key is not pressed, try to stand up
        if (this.isCrouching && this.game.inputManager && !this.game.inputManager.isActionActive('crouch')) {
            console.log("trying to stand up");
            this.setCrouch(false); // Will only stand if head clearance
        }
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update weapon
        if (this.currentWeapon) {
            this.currentWeapon.update(deltaTime);
        }
        
        // Update ground check
        this.updateGroundCheck();
    }

    /**
     * Update player movement with smooth physics
     */
    updateMovement(deltaTime) {
        if (!this.camera) return;
        
        // Get movement direction from input
        const moveVector = new BABYLON.Vector3(0, 0, 0);
        
        if (this.movementInput.forward) moveVector.z += 1;
        if (this.movementInput.backward) moveVector.z -= 1;
        if (this.movementInput.left) moveVector.x -= 1;
        if (this.movementInput.right) moveVector.x += 1;
        
        // Normalize movement vector
        if (moveVector.length() > 0) {
            moveVector.normalize();
        }
        
        // Transform movement to camera space (only Y rotation)
        const cameraMatrix = BABYLON.Matrix.RotationY(this.camera.rotation.y);
        const worldMoveVector = BABYLON.Vector3.TransformCoordinates(moveVector, cameraMatrix);
        
        // Determine speed based on state
        let targetSpeed = this.walkSpeed;
        if (this.isSprinting) {
            targetSpeed = this.sprintSpeed;
        } else if (this.isCrouching) {
            targetSpeed = this.crouchSpeed;
        }
        
        // Apply acceleration
        const targetVelocity = worldMoveVector.scale(targetSpeed);
        const accelerationRate = this.isGrounded ? this.acceleration : this.acceleration * this.airControl;
        
        // Smooth velocity interpolation
        this.velocity.x = BABYLON.Scalar.Lerp(this.velocity.x, targetVelocity.x, accelerationRate * deltaTime);
        this.velocity.z = BABYLON.Scalar.Lerp(this.velocity.z, targetVelocity.z, accelerationRate * deltaTime);
        
        // Apply friction when not moving
        if (moveVector.length() === 0 && this.isGrounded) {
            this.velocity.x = BABYLON.Scalar.Lerp(this.velocity.x, 0, this.friction * deltaTime);
            this.velocity.z = BABYLON.Scalar.Lerp(this.velocity.z, 0, this.friction * deltaTime);
        }
        
        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y += this.game.config.physics.gravity * deltaTime;
        }
        
        // Move camera
        const movement = this.velocity.scale(deltaTime);
        //console.log(
        //    `movement: (${movement.x.toFixed(2)}, ${movement.y.toFixed(2)}, ${movement.z.toFixed(2)})`
        //);
        this.camera.cameraDirection.addInPlace(movement);
        
        // Update position reference
        this.position.copyFrom(this.camera.position);
    }

    /**
     * Update ground check
     */
    updateGroundCheck() {
        if (!this.camera || !this.game.scene) return;

        // Raycast from the bottom of the player's ellipsoid
        const ellipsoid = this.camera.ellipsoid || new BABYLON.Vector3(0.5, this.playerHeight / 2, 0.5);
        const rayOrigin = this.camera.position.clone();
        rayOrigin.y -= ellipsoid.y; // bottom of the ellipsoid
        // Get ray direction and length from config
        const rayConfig = this.game.config.player || {};
        const rayDirection = new BABYLON.Vector3(
            (rayConfig.groundRayDirection?.x ?? 0),
            (rayConfig.groundRayDirection?.y ?? -1),
            (rayConfig.groundRayDirection?.z ?? 0)
        );
        const rayLength = rayConfig.groundRayLength ?? 0.3;
        const threshold = rayConfig.groundRayThreshold ?? 0.05;
        const ray = new BABYLON.Ray(rayOrigin, rayDirection, rayLength);

        const pick = this.game.scene.pickWithRay(ray, (mesh) => mesh.isPickable !== false && mesh.isEnabled() && mesh.checkCollisions);

        if (pick && pick.hit && pick.pickedPoint) {
            // If the hit is very close to the bottom of the ellipsoid, consider grounded
            const distance = rayOrigin.y - pick.pickedPoint.y;
            //console.log("distance: " + distance);
            if (distance >= 0 && distance <= threshold && this.velocity.y <= 0) {
                // Snap player to the ground
                this.camera.position.y = pick.pickedPoint.y + ellipsoid.y;
                this.velocity.y = 0;
                this.isGrounded = true;
                //console.log("grounded");
                return;
            }
        }
        this.isGrounded = false;
    }

    /**
     * Get player position
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Get camera direction
     */
    getDirection() {
        if (!this.camera) return new BABYLON.Vector3(0, 0, 1);
        return this.camera.getForwardRay().direction;
    }

    /**
     * Get current weapon
     */
    getCurrentWeapon() {
        return this.currentWeapon;
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.onDeath();
        }
        
        // Trigger damage effects
        if (this.game.particleManager) {
            // Could create blood effects here
        }
        
        console.log(`Player took ${amount} damage. Health: ${this.health}`);
    }

    /**
     * Heal player
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        console.log(`Player healed ${amount}. Health: ${this.health}`);
    }

    /**
     * Handle player death
     */
    onDeath() {
        console.log('Player died');
        
        // Stop firing
        this.stopFiring();
        
        // Could trigger death effects, respawn timer, etc.
        if (this.game.stateManager) {
            // Could transition to death/respawn state
        }
    }

    /**
     * Respawn player
     */
    respawn(position = null) {
        this.health = this.maxHealth;
        
        if (position) {
            this.camera.position.copyFrom(position);
            this.position.copyFrom(position);
        }
        
        // Reset velocity
        this.velocity.set(0, 0, 0);
        
        // Reset weapon
        if (this.currentWeapon) {
            this.currentWeapon.reset();
        }
        
        console.log('Player respawned');
    }

    /**
     * Dispose of player resources
     */
    dispose() {
        console.log('Disposing player...');
        
        // Dispose weapons
        for (const weapon of this.weapons.values()) {
            if (weapon.dispose) {
                weapon.dispose();
            }
        }
        this.weapons.clear();
        
        // Dispose camera
        if (this.camera) {
            this.camera.dispose();
            this.camera = null;
        }
        
        // Dispose weapon attach point
        if (this.weaponAttachPoint) {
            this.weaponAttachPoint.dispose();
            this.weaponAttachPoint = null;
        }
        
        this.currentWeapon = null;
        this.isInitialized = false;
        
        console.log('Player disposed');
    }
}