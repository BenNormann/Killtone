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
        this.username = playerData.username || `Player ${this.id.slice(-4)}`;
        
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
        this.velocity = new BABYLON.Vector3(0, 0, 0);
        
        // Interpolation for smooth movement
        this.targetPosition = this.position.clone();
        this.targetRotation = this.rotation.clone();
        this.lastUpdateTime = Date.now();
        this.interpolationSpeed = 10; // How fast to interpolate to target position
        
        // Visual representation
        this.mesh = null;
        this.nameTag = null;
        this.healthBar = null;
        
        // Animation state
        this.isMoving = false;
        this.isShooting = false;
        this.currentWeapon = null;
        
        // Initialize the remote player
        this.initialize();
    }
    
    /**
     * Initialize the remote player visual representation
     */
    async initialize() {
        try {
            console.log(`Initializing RemotePlayer: ${this.username} (${this.id})`);
            
            // Create player mesh
            this.createPlayerMesh();
            
            // Create name tag
            this.createNameTag();
            
            // Create health bar
            this.createHealthBar();
            
            console.log(`RemotePlayer ${this.username} initialized successfully`);
            return true;
            
        } catch (error) {
            console.error(`Failed to initialize RemotePlayer ${this.username}:`, error);
            return false;
        }
    }
    
    /**
     * Create the visual mesh for the remote player
     */
    createPlayerMesh() {
        // Create a simple capsule to represent the player
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(
            `remotePlayer_${this.id}`,
            { height: 1.8, radius: 0.3 },
            this.scene
        );
        
        // Position the mesh
        this.mesh.position.copyFrom(this.position);
        this.mesh.rotation.copyFrom(this.rotation);
        
        // Create material
        const material = new BABYLON.StandardMaterial(`remotePlayerMat_${this.id}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0); // Blue color for other players
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        this.mesh.material = material;
        
        // Add collision detection
        this.mesh.checkCollisions = true;
        
        console.log(`Created mesh for RemotePlayer: ${this.username}`);
    }
    
    /**
     * Create name tag above the player
     */
    createNameTag() {
        // Create name tag using Babylon.js GUI
        const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(`nameTag_${this.id}`);
        
        // Create text block for name
        const nameText = new BABYLON.GUI.TextBlock(`nameText_${this.id}`);
        nameText.text = this.username;
        nameText.color = "white";
        nameText.fontSize = 16;
        nameText.fontFamily = "Arial";
        
        // Create rectangle background
        const nameBackground = new BABYLON.GUI.Rectangle(`nameBg_${this.id}`);
        nameBackground.widthInPixels = this.username.length * 8 + 20;
        nameBackground.heightInPixels = 25;
        nameBackground.cornerRadius = 5;
        nameBackground.color = "white";
        nameBackground.thickness = 1;
        nameBackground.background = "rgba(0, 0, 0, 0.7)";
        
        nameBackground.addControl(nameText);
        advancedTexture.addControl(nameBackground);
        
        this.nameTag = {
            texture: advancedTexture,
            background: nameBackground,
            text: nameText
        };
        
        console.log(`Created name tag for RemotePlayer: ${this.username}`);
    }
    
    /**
     * Create health bar above the player
     */
    createHealthBar() {
        if (!this.nameTag) return;
        
        // Create health bar background
        const healthBg = new BABYLON.GUI.Rectangle(`healthBg_${this.id}`);
        healthBg.widthInPixels = 60;
        healthBg.heightInPixels = 6;
        healthBg.cornerRadius = 2;
        healthBg.color = "white";
        healthBg.thickness = 1;
        healthBg.background = "rgba(0, 0, 0, 0.5)";
        healthBg.topInPixels = 30; // Position below name tag
        
        // Create health bar fill
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
        
        this.healthBar = {
            background: healthBg,
            fill: healthFill
        };
        
        console.log(`Created health bar for RemotePlayer: ${this.username}`);
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
        
        // Interpolate position
        this.interpolatePosition(deltaTime);
        
        // Update name tag and health bar position
        this.updateUI();
        
        // Update animation state
        this.updateAnimations(deltaTime);
    }
    
    /**
     * Smoothly interpolate to target position
     */
    interpolatePosition(deltaTime) {
        // Calculate distance to target
        const positionDistance = BABYLON.Vector3.Distance(this.position, this.targetPosition);
        const rotationDistance = BABYLON.Vector3.Distance(this.rotation, this.targetRotation);
        
        // Only interpolate if there's a significant difference
        if (positionDistance > 0.01) {
            // Interpolate position
            this.position = BABYLON.Vector3.Lerp(
                this.position,
                this.targetPosition,
                this.interpolationSpeed * deltaTime
            );
            
            this.mesh.position.copyFrom(this.position);
            this.isMoving = positionDistance > 0.1;
        } else {
            this.isMoving = false;
        }
        
        if (rotationDistance > 0.01) {
            // Interpolate rotation
            this.rotation = BABYLON.Vector3.Lerp(
                this.rotation,
                this.targetRotation,
                this.interpolationSpeed * deltaTime
            );
            
            this.mesh.rotation.copyFrom(this.rotation);
        }
    }
    
    /**
     * Update UI elements (name tag, health bar) position
     */
    updateUI() {
        if (!this.nameTag || !this.mesh) return;
        
        // Project 3D position to screen coordinates
        const engine = this.scene.getEngine();
        const camera = this.scene.activeCamera;
        
        if (!camera) return;
        
        // Get position above player's head
        const worldPosition = this.mesh.position.add(new BABYLON.Vector3(0, 1.2, 0));
        const screenPosition = BABYLON.Vector3.Project(
            worldPosition,
            BABYLON.Matrix.Identity(),
            camera.getViewMatrix(),
            camera.getProjectionMatrix(),
            engine.getRenderingCanvasClientRect()
        );
        
        // Update name tag position
        this.nameTag.background.leftInPixels = screenPosition.x - (this.nameTag.background.widthInPixels / 2);
        this.nameTag.background.topInPixels = screenPosition.y - 40;
        
        // Update health bar position if it exists
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
     * Update animations based on state
     */
    updateAnimations(deltaTime) {
        if (!this.mesh) return;
        
        // Simple bob animation when moving
        if (this.isMoving) {
            const time = Date.now() * 0.005;
            const bobOffset = Math.sin(time) * 0.05;
            this.mesh.position.y = this.position.y + bobOffset;
        }
        
        // Flash effect when shooting
        if (this.isShooting) {
            const material = this.mesh.material;
            if (material && material.emissiveColor) {
                material.emissiveColor = BABYLON.Color3.Lerp(
                    material.emissiveColor,
                    new BABYLON.Color3(1, 1, 0), // Yellow flash
                    5 * deltaTime
                );
            }
            
            // Reset shooting state after a short time
            setTimeout(() => {
                this.isShooting = false;
                if (material && material.emissiveColor) {
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
            this.targetRotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
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
        
        // Update score
        if (data.score !== undefined) {
            this.score = data.score;
        }
        
        // Update deaths
        if (data.deaths !== undefined) {
            this.deaths = data.deaths;
        }
        
        this.lastUpdateTime = Date.now();
    }
    
    /**
     * Set player health and update health bar
     */
    setHealth(health) {
        this.health = Math.max(0, Math.min(this.maxHealth, health));
        
        // Update health bar
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.fill.widthInPixels = 56 * healthPercent;
            this.healthBar.fill.background = this.getHealthColor();
        }
        
        console.log(`RemotePlayer ${this.username} health updated: ${this.health}`);
    }
    
    /**
     * Set player alive state
     */
    setAlive(alive) {
        this.isAlive = alive;
        
        if (this.mesh) {
            if (alive) {
                this.mesh.visibility = 1.0;
                this.mesh.material.alpha = 1.0;
            } else {
                // Make player semi-transparent when dead
                this.mesh.visibility = 0.5;
                this.mesh.material.alpha = 0.5;
            }
        }
        
        console.log(`RemotePlayer ${this.username} alive state: ${alive}`);
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
        
        console.log(`RemotePlayer username updated: ${username}`);
    }
    
    /**
     * Trigger shooting animation
     */
    triggerShoot() {
        this.isShooting = true;
        console.log(`RemotePlayer ${this.username} is shooting`);
    }
    
    /**
     * Get player position
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
     * Check if player is alive
     */
    isPlayerAlive() {
        return PlayerUtils.isPlayerAlive(this);
    }
    
    /**
     * Dispose of remote player resources
     */
    dispose() {
        console.log(`Disposing RemotePlayer: ${this.username}`);
        
        // Dispose mesh
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
        // Dispose name tag
        if (this.nameTag) {
            this.nameTag.texture.dispose();
            this.nameTag = null;
        }
        
        // Clear health bar reference
        this.healthBar = null;
        
        // Clear references
        this.game = null;
        this.scene = null;
        
        console.log(`RemotePlayer ${this.username} disposed`);
    }
}
