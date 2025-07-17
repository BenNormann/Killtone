/**
 * KILLtONE Game Framework - Player Entity
 * First-person player controller with movement, health, and shooting
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from '../mainConfig.js';

export class Player {
    constructor(game, scene, spawnPosition = new BABYLON.Vector3(0, 2, 0)) {
        this.game = game;
        this.scene = scene;

        // Player state
        this.isAlive = true;
        this.health = 100;
        this.maxHealth = 100;
        this.armor = 0;
        this.maxArmor = 100;

        // Movement state
        this.position = spawnPosition.clone();
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        this.isGrounded = false;
        this.isJumping = false;
        this.isSprinting = false;
        this.isCrouching = false;

        // Camera and view
        this.camera = null;
        this.cameraHeight = 1.8; // Standing height
        this.crouchHeight = 1.2; // Crouching height
        this.currentHeight = this.cameraHeight;

        // Movement settings
        this.walkSpeed = 5.0;
        this.sprintSpeed = 8.0;
        this.crouchSpeed = 2.5;
        this.jumpForce = 8.0;
        this.mouseSensitivity = GameConfig.controls.mouseSensitivity;

        // Shooting state
        this.canShoot = true;
        this.lastShotTime = 0;
        this.currentWeapon = null;
        this.weapons = new Map();

        // Input state
        this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            crouch: false,
            sprint: false,
            shoot: false,
            aim: false
        };

        // Physics
        this.gravity = -9.81;
        this.groundCheckDistance = 0.1;

        // Events
        this.onHealthChanged = null;
        this.onDeath = null;
        this.onRespawn = null;
        this.onWeaponChanged = null;
        this.onShoot = null;

        // Initialize the player
        this.initialize();
    }

    /**
     * Initialize the player systems
     */
    async initialize() {
        try {
            console.log('Initializing Player...');

            // Create first-person camera
            this.createCamera();

            // Set up input handling
            this.setupInputHandling();

            // Set up physics
            this.setupPhysics();

            console.log('Player initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Player:', error);
            return false;
        }
    }

    /**
     * Create and configure the first-person camera
     */
    createCamera() {
        // Remove existing temporary camera if it exists
        if (this.game.camera && this.game.camera !== this.camera) {
            this.game.camera.dispose();
        }

        // Create FPS camera
        this.camera = new BABYLON.FreeCamera(
            "playerCamera",
            new BABYLON.Vector3(this.position.x, this.position.y + this.currentHeight, this.position.z),
            this.scene
        );

        // Set initial camera target to look forward (toward the test objects)
        this.camera.setTarget(new BABYLON.Vector3(0, this.position.y + this.currentHeight, 0));

        // Configure camera settings
        this.camera.fov = BABYLON.Tools.ToRadians(GameConfig.graphics.fov);
        this.camera.minZ = 0.1;
        this.camera.maxZ = GameConfig.performance.cullingDistance;

        // Set camera as active
        this.scene.activeCamera = this.camera;
        this.game.camera = this.camera;

        // Attach camera to canvas for mouse look
        this.camera.attachControl(this.game.canvas, true);

        // Configure mouse sensitivity
        this.camera.angularSensibility = 2000 / this.mouseSensitivity;

        // Invert Y if configured
        if (GameConfig.controls.invertY) {
            this.camera.invertY = true;
        }

        console.log('First-person camera created');
    }

    /**
     * Set up input handling for player controls
     */
    setupInputHandling() {
        // Keyboard input handling
        this.scene.actionManager = this.scene.actionManager || new BABYLON.ActionManager(this.scene);

        // Movement keys
        this.setupKeyBinding('forward', GameConfig.controls.keyBindings.forward);
        this.setupKeyBinding('backward', GameConfig.controls.keyBindings.backward);
        this.setupKeyBinding('left', GameConfig.controls.keyBindings.left);
        this.setupKeyBinding('right', GameConfig.controls.keyBindings.right);
        this.setupKeyBinding('jump', GameConfig.controls.keyBindings.jump);
        this.setupKeyBinding('crouch', GameConfig.controls.keyBindings.crouch);
        this.setupKeyBinding('sprint', GameConfig.controls.keyBindings.sprint);

        // Combat keys
        this.setupKeyBinding('shoot', GameConfig.controls.keyBindings.shoot);
        this.setupKeyBinding('aim', GameConfig.controls.keyBindings.aim);

        // Mouse input for shooting
        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (pointerInfo.event.button === 0) { // Left mouse button
                        this.inputState.shoot = true;
                    } else if (pointerInfo.event.button === 2) { // Right mouse button
                        this.inputState.aim = true;
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERUP:
                    if (pointerInfo.event.button === 0) { // Left mouse button
                        this.inputState.shoot = false;
                    } else if (pointerInfo.event.button === 2) { // Right mouse button
                        this.inputState.aim = false;
                    }
                    break;
            }
        });

        console.log('Input handling configured');
    }

    /**
     * Set up key binding for a specific action
     */
    setupKeyBinding(action, keyCode) {
        // Key down
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyDownTrigger,
            (evt) => {
                if (evt.sourceEvent.code === keyCode) {
                    this.inputState[action] = true;
                }
            }
        ));

        // Key up
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyUpTrigger,
            (evt) => {
                if (evt.sourceEvent.code === keyCode) {
                    this.inputState[action] = false;
                }
            }
        ));
    }

    /**
     * Set up basic physics for the player
     */
    setupPhysics() {
        // Create invisible collision mesh for the player
        this.collisionMesh = BABYLON.MeshBuilder.CreateCapsule(
            "playerCollision",
            { height: this.cameraHeight, radius: 0.5 },
            this.scene
        );

        this.collisionMesh.position = this.position.clone();
        this.collisionMesh.visibility = 0; // Make invisible
        this.collisionMesh.checkCollisions = true;

        console.log('Player physics configured');
    }

    /**
     * Update player logic each frame
     */
    update(deltaTime) {
        if (!this.isAlive) return;

        // Update movement
        this.updateMovement(deltaTime);

        // Update camera position
        this.updateCamera(deltaTime);

        // Update shooting
        this.updateShooting(deltaTime);

        // Update health regeneration (if applicable)
        this.updateHealth(deltaTime);
    }

    /**
     * Update player movement based on input
     */
    updateMovement(deltaTime) {
        // Calculate movement direction
        const moveVector = new BABYLON.Vector3(0, 0, 0);

        // Get camera forward and right vectors
        const forward = this.camera.getForwardRay().direction;
        const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());

        // Normalize and flatten to ground plane
        forward.y = 0;
        forward.normalize();
        right.y = 0;
        right.normalize();

        // Apply input to movement vector
        if (this.inputState.forward) {
            moveVector.addInPlace(forward);
        }
        if (this.inputState.backward) {
            moveVector.subtractInPlace(forward);
        }
        if (this.inputState.left) {
            moveVector.subtractInPlace(right);
        }
        if (this.inputState.right) {
            moveVector.addInPlace(right);
        }

        // Normalize movement vector
        if (moveVector.length() > 0) {
            moveVector.normalize();
        }

        // Apply speed modifiers
        let currentSpeed = this.walkSpeed;

        if (this.inputState.sprint && !this.isCrouching) {
            currentSpeed = this.sprintSpeed;
            this.isSprinting = true;
        } else {
            this.isSprinting = false;
        }

        if (this.inputState.crouch) {
            currentSpeed = this.crouchSpeed;
            this.isCrouching = true;
            this.currentHeight = this.crouchHeight;
        } else {
            this.isCrouching = false;
            this.currentHeight = this.cameraHeight;
        }

        // Apply movement
        moveVector.scaleInPlace(currentSpeed * deltaTime);
        this.velocity.x = moveVector.x;
        this.velocity.z = moveVector.z;

        // Handle jumping
        if (this.inputState.jump && this.isGrounded && !this.isJumping) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.isGrounded = false;
        }

        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }

        // Ground check (simplified)
        this.checkGrounded();

        // Update position
        this.position.addInPlace(this.velocity.scale(deltaTime));

        // Update collision mesh position
        if (this.collisionMesh) {
            this.collisionMesh.position.copyFrom(this.position);
        }
    }

    /**
     * Simple ground check
     */
    checkGrounded() {
        // Simplified ground check - in a real implementation, you'd use raycasting
        if (this.position.y <= 2.0) { // Assuming ground level at y=0 + player height
            this.position.y = 2.0;
            this.velocity.y = 0;
            this.isGrounded = true;
            this.isJumping = false;
        } else {
            this.isGrounded = false;
        }
    }

    /**
     * Update camera position and height
     */
    updateCamera(deltaTime) {
        if (!this.camera) return;

        // Smoothly adjust camera height for crouching
        const targetY = this.position.y + this.currentHeight;
        const currentY = this.camera.position.y;
        const heightDiff = targetY - currentY;

        if (Math.abs(heightDiff) > 0.01) {
            this.camera.position.y += heightDiff * 10 * deltaTime; // Smooth transition
        }

        // Update camera X and Z position
        this.camera.position.x = this.position.x;
        this.camera.position.z = this.position.z;
    }

    /**
     * Update shooting mechanics
     */
    updateShooting(deltaTime) {
        if (!this.canShoot) {
            // Check if enough time has passed since last shot
            const currentTime = performance.now();
            if (currentTime - this.lastShotTime > this.getFireRate()) {
                this.canShoot = true;
            }
        }

        // Handle shooting input
        if (this.inputState.shoot && this.canShoot) {
            this.shoot();
        }
    }

    /**
     * Perform shooting action
     */
    async shoot() {
        if (!this.canShoot) return;

        console.log('Player shooting');

        // Get shooting direction from camera
        const shootDirection = this.camera.getForwardRay().direction.clone();
        const shootOrigin = this.camera.position.clone();

        // Create default weapon if none exists
        if (!this.currentWeapon) {
            this.currentWeapon = { name: 'bulldog', fireRate: 500 };
        }

        // Use WeaponBase system if available
        if (this.currentWeapon && this.currentWeapon.fire && typeof this.currentWeapon.fire === 'function') {
            // Use the weapon's own fire method
            if (this.currentWeapon.canFireWeapon()) {
                this.currentWeapon.fire(shootOrigin, shootDirection);
                this.currentWeapon.applyRecoil(); // Apply visual recoil
                this.currentWeapon.consumeAmmo(); // Consume ammo
                this.currentWeapon.setFiringCooldown(); // Set cooldown
            }
        } else {
            // Fallback for simple weapon objects
            // Create shooting event data
            const shootData = {
                origin: shootOrigin,
                direction: shootDirection,
                weapon: this.currentWeapon,
                playerId: this.id || 'local'
            };

            // Trigger network shooting event
            if (this.onShoot) {
                this.onShoot(shootData);
            }

            // Trigger local shooting event (will be handled by weapon system)
            if (this.game.eventEmitter) {
                this.game.eventEmitter.emit('player.shoot', shootData);
            }

            // Set cooldown
            this.canShoot = false;
            this.lastShotTime = performance.now();

            // Play shooting sound (if audio manager available)
            if (this.game.audioManager && this.currentWeapon) {
                this.game.audioManager.playWeaponSound(this.currentWeapon);
            }

            // Reduce ammo
            if (this.currentWeapon.ammo > 0) {
                this.currentWeapon.ammo--;
            }
        }
    }

    /**
     * Reload current weapon
     */
    async reload() {
        if (!this.currentWeapon || !this.isAlive) return;
        
        // Use WeaponBase system if available
        if (this.currentWeapon && this.currentWeapon.reload && typeof this.currentWeapon.reload === 'function') {
            // Use the weapon's own reload method
            this.currentWeapon.reload();
        } else {
            // Fallback for simple weapon objects
            // Check if reload is needed
            if (this.currentWeapon.ammo >= this.currentWeapon.magazineSize) {
                console.log('Weapon already fully loaded');
                return;
            }
            
            // Check if we have reserve ammo
            if (this.currentWeapon.reserveAmmo <= 0) {
                console.log('No reserve ammo available');
                return;
            }

            console.log('Player reloading weapon');

            // Disable shooting during reload
            this.canShoot = false;

            // Fallback delay if no animation system
            await new Promise(resolve => setTimeout(resolve, (this.currentWeapon.reloadTime || 3) * 1000));

            // Calculate ammo to reload
            const ammoNeeded = this.currentWeapon.magazineSize - this.currentWeapon.ammo;
            const ammoToReload = Math.min(ammoNeeded, this.currentWeapon.reserveAmmo);

            // Update ammo counts
            this.currentWeapon.ammo += ammoToReload;
            this.currentWeapon.reserveAmmo -= ammoToReload;

            // Re-enable shooting
            this.canShoot = true;

            // Play reload sound
            if (this.game.audioManager && this.currentWeapon.audio && this.currentWeapon.audio.reloadSound) {
                this.game.audioManager.playSound(this.currentWeapon.audio.reloadSound, 0.6);
            }

            console.log(`Reload complete. Ammo: ${this.currentWeapon.ammo}/${this.currentWeapon.reserveAmmo}`);
        }
    }

    /**
     * Get current weapon fire rate
     */
    getFireRate() {
        if (!this.currentWeapon) return 500; // Default 500ms between shots
        return this.currentWeapon.fireRate || 500;
    }

    /**
     * Update health and status effects
     */
    updateHealth(deltaTime) {
        // Health regeneration could be implemented here
        // For now, just ensure health stays within bounds
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        this.armor = Math.max(0, Math.min(this.maxArmor, this.armor));

        // Check for death
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }

    /**
     * Take damage
     */
    takeDamage(damage, source = null) {
        if (!this.isAlive) return;

        let actualDamage = damage;

        // Apply armor reduction
        if (this.armor > 0) {
            const armorAbsorption = Math.min(this.armor, damage * 0.5);
            this.armor -= armorAbsorption;
            actualDamage -= armorAbsorption;
        }

        // Apply damage to health
        this.health -= actualDamage;

        console.log(`Player took ${actualDamage} damage (${damage} original). Health: ${this.health}`);

        // Trigger health changed event
        if (this.onHealthChanged) {
            this.onHealthChanged(this.health, this.maxHealth, actualDamage);
        }

        // Check for death
        if (this.health <= 0) {
            this.die(source);
        }
    }

    /**
     * Heal the player
     */
    heal(amount) {
        if (!this.isAlive) return;

        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        const actualHealing = this.health - oldHealth;

        console.log(`Player healed ${actualHealing}. Health: ${this.health}`);

        // Trigger health changed event
        if (this.onHealthChanged) {
            this.onHealthChanged(this.health, this.maxHealth, -actualHealing);
        }
    }

    /**
     * Handle player death
     */
    die(source = null) {
        if (!this.isAlive) return;

        console.log('Player died');

        this.isAlive = false;
        this.health = 0;

        // Disable input
        this.clearInputState();

        // Trigger death event
        if (this.onDeath) {
            this.onDeath(source);
        }

        // Trigger game event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('player.death', { player: this, source: source });
        }
    }

    /**
     * Respawn the player
     */
    respawn(spawnPosition = null) {
        console.log('Player respawning');

        // Reset health and state
        this.health = this.maxHealth;
        this.armor = 0;
        this.isAlive = true;

        // Reset position
        if (spawnPosition) {
            this.position.copyFrom(spawnPosition);
        }

        // Reset movement state
        this.velocity.set(0, 0, 0);
        this.isGrounded = false;
        this.isJumping = false;

        // Update camera position
        if (this.camera) {
            this.camera.position.set(
                this.position.x,
                this.position.y + this.currentHeight,
                this.position.z
            );
        }

        // Update collision mesh
        if (this.collisionMesh) {
            this.collisionMesh.position.copyFrom(this.position);
        }

        // Clear input state
        this.clearInputState();

        // Trigger respawn event
        if (this.onRespawn) {
            this.onRespawn();
        }

        // Trigger game event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('player.respawn', { player: this });
        }
    }

    /**
     * Clear all input states
     */
    clearInputState() {
        Object.keys(this.inputState).forEach(key => {
            this.inputState[key] = false;
        });
    }

    /**
     * Set weapon using existing WeaponBase system
     * @param {string} weaponType - Weapon type from WeaponType enum
     * @param {Object} weaponConfig - Weapon configuration from WeaponConfigs
     */
    async setWeapon(weaponType, weaponConfig) {
        try {
            // Import weapon classes
            const { WeaponType } = await import('./weapons/WeaponConfig.js');
            
            // Dispose current weapon if exists
            if (this.currentWeapon && this.currentWeapon.dispose) {
                this.currentWeapon.dispose();
            }

            if (weaponConfig) {
                // Create weapon instance based on type
                let WeaponClass;
                switch (weaponType) {
                    case WeaponType.CARBINE:
                        const { Carbine } = await import('./weapons/Carbine.js');
                        WeaponClass = Carbine;
                        break;
                    case WeaponType.PISTOL:
                        const { Pistol } = await import('./weapons/Pistol.js');
                        WeaponClass = Pistol;
                        break;
                    // Add other weapon types as needed
                    default:
                        console.warn(`Weapon type ${weaponType} not implemented, using base config`);
                        this.currentWeapon = {
                            type: weaponType,
                            ...weaponConfig,
                            ammo: weaponConfig.magazineSize,
                            reserveAmmo: weaponConfig.magazineSize * 3
                        };
                        break;
                }

                // Create weapon instance if class is available
                if (WeaponClass) {
                    this.currentWeapon = new WeaponClass(
                        weaponConfig, 
                        this.scene, 
                        this.game.effectsManager,
                        this.game.accuracySystem
                    );
                    
                    // Initialize the weapon with AssetManager
                    await this.currentWeapon.initialize();
                    
                    // Load weapon model using AssetManager
                    await this.currentWeapon.loadModel(this.game.assetManager);
                    
                    // Position weapon relative to camera
                    if (this.currentWeapon.model && this.camera) {
                        this.currentWeapon.model.parent = this.camera;
                        this.currentWeapon.model.position = new BABYLON.Vector3(0.3, -0.2, 0.5);
                        this.currentWeapon.model.rotation = new BABYLON.Vector3(0, Math.PI, 0);
                        this.currentWeapon.setVisible(true);
                    }
                }
            } else {
                // Fallback for old format
                this.currentWeapon = weaponType;
            }

            if (this.onWeaponChanged) {
                this.onWeaponChanged(this.currentWeapon);
            }

            console.log(`Player equipped weapon: ${this.currentWeapon ? this.currentWeapon.name || this.currentWeapon.type : 'none'}`);
        } catch (error) {
            console.error('Error setting weapon:', error);
            // Fallback to simple weapon object
            this.currentWeapon = {
                type: weaponType,
                ...weaponConfig,
                ammo: weaponConfig?.magazineSize || 30,
                reserveAmmo: (weaponConfig?.magazineSize || 30) * 3
            };
        }
    }

    /**
     * Get player position
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Get camera position
     */
    getCameraPosition() {
        return this.camera ? this.camera.position.clone() : this.position.clone();
    }

    /**
     * Get camera direction
     */
    getCameraDirection() {
        return this.camera ? this.camera.getForwardRay().direction.clone() : new BABYLON.Vector3(0, 0, 1);
    }

    /**
     * Check if player is alive
     */
    isPlayerAlive() {
        return this.isAlive;
    }

    /**
     * Get player health percentage
     */
    getHealthPercentage() {
        return this.health / this.maxHealth;
    }

    /**
     * Get player armor percentage
     */
    getArmorPercentage() {
        return this.armor / this.maxArmor;
    }

    /**
     * Dispose of player resources
     */
    dispose() {
        console.log('Disposing Player...');

        // Clear input state
        this.clearInputState();

        // Dispose camera
        if (this.camera) {
            this.camera.dispose();
            this.camera = null;
        }

        // Dispose collision mesh
        if (this.collisionMesh) {
            this.collisionMesh.dispose();
            this.collisionMesh = null;
        }

        // Clear references
        this.game = null;
        this.scene = null;
        this.currentWeapon = null;
        this.weapons.clear();

        console.log('Player disposed');
    }
}

export default Player;