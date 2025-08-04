/**
 * KILLtONE Game Framework - Remote Player Entity
 * Represents other players in multiplayer sessions
 */

import { GameConfig } from '../mainConfig.js';
import { PlayerUtils } from './PlayerUtils.js';

export class RemotePlayer {
    constructor(game, scene, playerData) {
        this.game = game;
        this.scene = scene;
        
        // Player identification
        this.id = playerData.id;
        this.username = PlayerUtils.getDisplayName(playerData);
        
        // Player state
        this.isAlive = playerData.alive !== undefined ? playerData.alive : true;
        this.health = playerData.health || 100;
        this.maxHealth = 100;
        this.score = playerData.score || 0;
        this.deaths = playerData.deaths || 0;
        
        // Position and movement
        this.position = new BABYLON.Vector3(
            playerData.position?.x || 0,
            playerData.position?.y || 2,
            playerData.position?.z || 0
        );
        this.rotation = new BABYLON.Vector3(
            playerData.rotation?.x || 0,
            playerData.rotation?.y || 0,
            playerData.rotation?.z || 0
        );
        
        // Interpolation for smooth movement
        this.targetPosition = this.position.clone();
        this.targetRotation = this.rotation.clone();
        this.interpolationSpeed = 10;
        
        // Visual representation
        this.mesh = null;
        this.nameTag = null;
        this.healthBar = null;
        this.lookRay = null; // Ray to show where player is looking
        
        // Animation state
        this.movementState = playerData.movement || "standing";
        this.lastMovementState = this.movementState;
        this.animationGroups = new Map();
        this.currentAnimation = null;
        this.isShooting = false;
    }
    
    /**
     * Initialize the remote player visual representation
     */
    async initialize() {
        try {
            await this.createPlayerMesh();
            this.createNameTag();
            this.createHealthBar();
            this.createLookRay();
            return true;
        } catch (error) {
            console.error(`Failed to initialize RemotePlayer ${this.username}:`, error);
            return false;
        }
    }
    
    /**
     * Create the visual mesh for the remote player
     */
    async createPlayerMesh() {
        try {
            // Try to load character model using AssetManager
            if (this.game.assetManager) {
                const characterAsset = this.game.assetManager.getAsset('trun_character');
                if (characterAsset?.meshes.length > 0) {
                    this.mesh = characterAsset.meshes[0].clone(`remotePlayer_${this.id}`);
                    
                    // Store animation groups
                    if (characterAsset.animationGroups) {
                        console.log(`RemotePlayer ${this.username}: Loading animation groups from character asset:`, characterAsset.animationGroups.map(ag => ag.name));
                        characterAsset.animationGroups.forEach(animGroup => {
                            this.animationGroups.set(animGroup.name.toLowerCase(), animGroup);
                            animGroup.stop();
                        });
                        console.log(`RemotePlayer ${this.username}: Stored animation groups:`, Array.from(this.animationGroups.keys()));
                    } else {
                        console.log(`RemotePlayer ${this.username}: No animation groups found in character asset`);
                    }
                } else {
                    this.createFallbackMesh();
                }
            } else {
                this.createFallbackMesh();
            }
            
            // Position and setup mesh
            this.mesh.position.copyFrom(this.position);
            
            // Clear rotationQuaternion to use rotation property instead
            this.mesh.rotationQuaternion = null;
            // Fix mesh direction - add PI to make it face the same direction as camera
            this.mesh.rotation.y = this.rotation.y + Math.PI;
            
            this.mesh.checkCollisions = true;
            
            // Start with standing animation
            this.playAnimation('standing');
            
        } catch (error) {
            console.error(`Failed to create player mesh for ${this.username}:`, error);
            this.createFallbackMesh();
        }
    }
    
    /**
     * Create fallback capsule mesh
     */
    createFallbackMesh() {
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(
            `remotePlayer_${this.id}`,
            { height: 1.8, radius: 0.3 },
            this.scene
        );
        
        const material = new BABYLON.StandardMaterial(`remotePlayerMat_${this.id}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        this.mesh.material = material;
    }
    
    /**
     * Create name tag above the player
     */
    createNameTag() {
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(`nameTag_${this.id}`);
        
        const nameText = new BABYLON.GUI.TextBlock(`nameText_${this.id}`);
        nameText.text = this.username;
        nameText.color = "white";
        nameText.fontSize = 16;
        nameText.fontFamily = "Arial";
        
        const nameBackground = new BABYLON.GUI.Rectangle(`nameBg_${this.id}`);
        nameBackground.widthInPixels = this.username.length * 8 + 20;
        nameBackground.heightInPixels = 25;
        nameBackground.cornerRadius = 5;
        nameBackground.color = "white";
        nameBackground.thickness = 1;
        nameBackground.background = "rgba(0, 0, 0, 0.7)";
        
        nameBackground.addControl(nameText);
        advancedTexture.addControl(nameBackground);
        
        this.nameTag = { texture: advancedTexture, background: nameBackground, text: nameText };
    }
    
    /**
     * Create health bar above the player
     */
    createHealthBar() {
        if (!this.nameTag) return;
        
        const healthBg = new BABYLON.GUI.Rectangle(`healthBg_${this.id}`);
        healthBg.widthInPixels = 60;
        healthBg.heightInPixels = 6;
        healthBg.cornerRadius = 2;
        healthBg.color = "white";
        healthBg.thickness = 1;
        healthBg.background = "rgba(0, 0, 0, 0.5)";
        healthBg.topInPixels = 30;
        
        const healthFill = new BABYLON.GUI.Rectangle(`healthFill_${this.id}`);
        healthFill.widthInPixels = 56;
        healthFill.heightInPixels = 4;
        healthFill.cornerRadius = 1;
        healthFill.color = "transparent";
        healthFill.thickness = 0;
        healthFill.background = this.getHealthColor();
        healthFill.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthFill.leftInPixels = 2;
        
        healthBg.addControl(healthFill);
        this.nameTag.texture.addControl(healthBg);
        
        this.healthBar = { background: healthBg, fill: healthFill };
    }
    
    /**
     * Create look ray to show where player is looking
     */
    createLookRay() {
        // Create a short ray from eye level showing direction
        const rayLength = 2.0;
        const eyeHeight = 1.6;
        
        this.lookRay = BABYLON.MeshBuilder.CreateLines(`lookRay_${this.id}`, {
            points: [
                new BABYLON.Vector3(0, 0, 0),
                new BABYLON.Vector3(0, 0, rayLength)
            ]
        }, this.scene);
        
        this.lookRay.color = new BABYLON.Color3(1, 0, 0); // Red ray
        this.lookRay.alpha = 0.7;
        
        // Position the ray at the player's eye level
        this.lookRay.position.copyFrom(this.position);
        this.lookRay.position.y += eyeHeight;
        
        // Set initial rotation - look ray shows exact camera direction
        this.lookRay.rotation.x = this.rotation.x;
        this.lookRay.rotation.y = this.rotation.y;
    }
    
    /**
     * Get health bar color based on health percentage
     */
    getHealthColor() {
        const healthPercent = PlayerUtils.getHealthPercentage(this);
        
        if (healthPercent > 0.6) {
            return GameConfig.theme.colors.healthHigh;
        } else if (healthPercent > 0.3) {
            return GameConfig.theme.colors.healthMedium;
        } else {
            return GameConfig.theme.colors.healthLow;
        }
    }
    
    /**
     * Update remote player each frame
     */
    update(deltaTime) {
        if (!this.mesh) return;
        
        this.interpolatePosition(deltaTime);
        this.updateUI();
        this.updateAnimations(deltaTime);
    }
    
    /**
     * Smoothly interpolate to target position
     */
    interpolatePosition(deltaTime) {
        const positionDistance = BABYLON.Vector3.Distance(this.position, this.targetPosition);
        const rotationDistance = Math.abs(this.rotation.y - this.targetRotation.y);
        
        if (positionDistance > 0.01) {
            this.position = BABYLON.Vector3.Lerp(
                this.position,
                this.targetPosition,
                this.interpolationSpeed * deltaTime
            );
            this.mesh.position.copyFrom(this.position);
            
            // Update look ray position
            if (this.lookRay) {
                this.lookRay.position.copyFrom(this.position);
                this.lookRay.position.y += 1.6; // Eye height
            }
        }
        
        // Always update rotation, even for small changes
        if (rotationDistance > 0.001) { // Lower threshold for rotation
            console.log(`RemotePlayer ${this.username}: Updating rotation from ${this.rotation.y} to ${this.targetRotation.y}`);
            this.rotation.y = BABYLON.Scalar.Lerp(
                this.rotation.y,
                this.targetRotation.y,
                this.interpolationSpeed * deltaTime
            );
            
            // Clear rotationQuaternion and apply Y rotation to mesh (horizontal facing direction)
            this.mesh.rotationQuaternion = null;
            this.mesh.rotation.y = this.rotation.y + Math.PI; // Add PI to fix mesh direction
            
            // Update look ray Y rotation to match mesh rotation exactly
            if (this.lookRay) {
                this.lookRay.rotation.y = this.rotation.y; // No longer parented, so no PI offset needed
            }
        }
        
        // Update X rotation for look ray (vertical look direction)
        const xRotationDistance = Math.abs(this.rotation.x - this.targetRotation.x);
        if (xRotationDistance > 0.001) {
            this.rotation.x = BABYLON.Scalar.Lerp(
                this.rotation.x,
                this.targetRotation.x,
                this.interpolationSpeed * deltaTime
            );
            
            // Update look ray X rotation to show vertical look direction (camera pitch)
            if (this.lookRay) {
                this.lookRay.rotation.x = this.rotation.x;
            }
        }
    }
    
    /**
     * Update UI elements position
     */
    updateUI() {
        if (!this.nameTag || !this.mesh) return;
        
        const camera = this.scene.activeCamera;
        if (!camera) return;
        
        // Get position above player's head
        const worldPosition = this.mesh.position.add(new BABYLON.Vector3(0, 1.2, 0));
        const screenPosition = BABYLON.Vector3.Project(
            worldPosition,
            BABYLON.Matrix.Identity(),
            camera.getViewMatrix(),
            camera.getProjectionMatrix(),
            this.scene.getEngine().getRenderingCanvasClientRect()
        );
        
        // Update name tag position
        this.nameTag.background.leftInPixels = screenPosition.x - (this.nameTag.background.widthInPixels / 2);
        this.nameTag.background.topInPixels = screenPosition.y - 40;
        
        // Update health bar position
        if (this.healthBar) {
            this.healthBar.background.leftInPixels = screenPosition.x - (this.healthBar.background.widthInPixels / 2);
            this.healthBar.background.topInPixels = screenPosition.y - 10;
        }
        
        // Hide UI if player is too far or behind camera
        const distance = BABYLON.Vector3.Distance(camera.position, this.mesh.position);
        const isVisible = screenPosition.z > 0 && screenPosition.z < 1 && distance < 50;
        
        this.nameTag.background.isVisible = isVisible;
        if (this.healthBar) {
            this.healthBar.background.isVisible = isVisible;
        }
    }
    
    /**
     * Play animation based on movement state
     */
    playAnimation(animationName) {
        console.log(`RemotePlayer ${this.username}: playAnimation called with: ${animationName}`);
        console.log(`RemotePlayer ${this.username}: Available animation groups:`, Array.from(this.animationGroups.keys()));
        
        if (!this.animationGroups.size) {
            console.log(`RemotePlayer ${this.username}: No animation groups available, using fallback scaling`);
            // Handle crouching state for fallback mesh
            if (this.mesh) {
                if (animationName === 'crouching') {
                    this.mesh.scaling.y = 0.7; // Scale down for crouching
                } else {
                    this.mesh.scaling.y = 1.0; // Normal scale
                }
            }
            return;
        }
        
        // Stop current animation
        if (this.currentAnimation) {
            console.log(`RemotePlayer ${this.username}: Stopping current animation: ${this.currentAnimation}`);
            this.animationGroups.get(this.currentAnimation)?.stop();
        }
        
        // Map movement state to animation name
        let animKey = animationName;
        switch (animationName) {
            case 'standing': animKey = 'idle'; break;
            case 'walking': animKey = 'walk'; break;
            case 'sprinting': animKey = 'run'; break;
            case 'crouching': animKey = 'idle'; break; // Use idle for crouching if no crouch anim
        }
        
        console.log(`RemotePlayer ${this.username}: Mapped ${animationName} to animation key: ${animKey}`);
        
        // Play the animation
        const animation = this.animationGroups.get(animKey);
        if (animation) {
            console.log(`RemotePlayer ${this.username}: Playing animation: ${animKey}`);
            animation.play(true);
            this.currentAnimation = animKey;
        } else {
            console.log(`RemotePlayer ${this.username}: Animation not found: ${animKey}`);
            console.log(`RemotePlayer ${this.username}: Available animations:`, Array.from(this.animationGroups.keys()));
        }
    }
    
    /**
     * Update animations based on state
     */
    updateAnimations(deltaTime) {
        if (!this.mesh) return;
        
        // Update animation based on movement state
        if (this.movementState !== this.lastMovementState) {
            this.playAnimation(this.movementState);
            this.lastMovementState = this.movementState;
        }
        
        // Flash effect when shooting
        if (this.isShooting) {
            const material = this.mesh.material;
            if (material?.emissiveColor) {
                material.emissiveColor = BABYLON.Color3.Lerp(
                    material.emissiveColor,
                    new BABYLON.Color3(1, 1, 0),
                    5 * deltaTime
                );
            }
            
            setTimeout(() => {
                this.isShooting = false;
                if (material?.emissiveColor) {
                    material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
                }
            }, 100);
        }
    }
    
    /**
     * Update player state from network data
     */
    updateFromNetworkData(data) {
        // Update target position and rotation for smooth interpolation
        if (data.position) {
            this.targetPosition.set(data.position.x, data.position.y, data.position.z);
        }
        
        if (data.rotation) {
            console.log(`RemotePlayer ${this.username}: Received rotation data:`, data.rotation);
            console.log(`RemotePlayer ${this.username}: Current rotation:`, this.rotation);
            this.targetRotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
            console.log(`RemotePlayer ${this.username}: Target rotation set to:`, this.targetRotation);
        }
        
        // Update movement state
        if (data.movement && data.movement !== this.movementState) {
            console.log(`RemotePlayer ${this.username}: Movement state changed from ${this.movementState} to ${data.movement}`);
            this.movementState = data.movement;
            // Immediately update animation when movement state changes
            this.playAnimation(this.movementState);
            this.lastMovementState = this.movementState;
        }
        
        // Update health
        if (data.health !== undefined && data.health !== this.health) {
            this.setHealth(data.health);
        }
        
        // Update alive state
        if (data.alive !== undefined) {
            this.setAlive(data.alive);
        }
        
        // Update username
        if (data.username && data.username !== this.username) {
            this.setUsername(data.username);
        }
        
        // Update score and deaths
        if (data.score !== undefined) this.score = data.score;
        if (data.deaths !== undefined) this.deaths = data.deaths;
    }
    
    /**
     * Set player health and update health bar
     */
    setHealth(health) {
        this.health = Math.max(0, Math.min(this.maxHealth, health));
        
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.fill.widthInPixels = 56 * healthPercent;
            this.healthBar.fill.background = this.getHealthColor();
        }
    }
    
    /**
     * Set player alive state
     */
    setAlive(alive) {
        this.isAlive = alive;
        
        if (this.mesh) {
            this.mesh.visibility = alive ? 1.0 : 0.5;
            this.mesh.material.alpha = alive ? 1.0 : 0.5;
        }
    }
    
    /**
     * Set player username and update name tag
     */
    setUsername(username) {
        this.username = username;
        
        if (this.nameTag) {
            this.nameTag.text.text = username;
            this.nameTag.background.widthInPixels = username.length * 8 + 20;
        }
    }
    
    /**
     * Trigger shooting animation
     */
    triggerShoot() {
        this.isShooting = true;
    }
    
    /**
     * Get player position using PlayerUtils
     */
    getPosition() {
        return PlayerUtils.getPosition(this);
    }
    
    /**
     * Get player mesh
     */
    getMesh() {
        return this.mesh;
    }
    
    /**
     * Check if player is alive using PlayerUtils
     */
    isPlayerAlive() {
        return PlayerUtils.isPlayerAlive(this);
    }
    
    /**
     * Dispose of remote player resources
     */
    dispose() {
        // Stop and clear animations
        if (this.animationGroups.size) {
            this.animationGroups.forEach(animGroup => animGroup.stop());
            this.animationGroups.clear();
        }
        
        // Dispose mesh
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
        // Dispose look ray
        if (this.lookRay) {
            this.lookRay.dispose();
            this.lookRay = null;
        }
        
        // Dispose name tag
        if (this.nameTag) {
            this.nameTag.texture.dispose();
            this.nameTag = null;
        }
        
        // Clear references
        this.healthBar = null;
        this.game = null;
        this.scene = null;
    }
} 