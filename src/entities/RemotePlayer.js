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
        this.lookRay = null; // Pie-slice to show where player is looking
        this.lookRayEyeHeight = 0.26; // Height offset for look ray positioning
        
        // Animation state
        this.movementState = playerData.movement || "standing";
        this.lastMovementState = this.movementState;
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
            const animationFile = this.getAnimationFileForState(this.movementState);
            console.log(`RemotePlayer ${this.username}: Creating mesh with animation file: ${animationFile}`);
            
            if (this.game.assetManager) {
                await this.loadAnimationAsset(animationFile);
                
                const characterAsset = this.game.assetManager.getAsset(animationFile);
                console.log(`RemotePlayer ${this.username}: Character asset:`, characterAsset);
                
                if (characterAsset?.meshes.length > 0) {
                    const sourceMesh = characterAsset.meshes[0];
                    
                    // Temporarily enable source mesh for cloning, then restore its state
                    const wasSourceEnabled = sourceMesh.isEnabled();
                    sourceMesh.setEnabled(true);
                    
                    this.mesh = sourceMesh.clone(`remotePlayer_${this.id}`);
                    
                    // Restore source mesh state
                    sourceMesh.setEnabled(wasSourceEnabled);
                    
                    // Ensure cloned mesh is enabled
                    this.mesh.setEnabled(true);
                    
                    // Enable all child meshes recursively
                    this.enableAllChildMeshes(this.mesh);
                    
                    console.log(`RemotePlayer ${this.username}: Cloned mesh enabled:`, this.mesh.isEnabled(), 'visible:', this.mesh.isVisible);
                    
                    // Position mesh
                    this.mesh.position.x = this.position.x;
                    this.mesh.position.z = this.position.z;
                    this.mesh.position.y = this.position.y + this.mesh.position.y;
                    
                    this.mesh.rotationQuaternion = null;
                    this.mesh.rotation.y = this.rotation.y + Math.PI;
                    
                    this.mesh.checkCollisions = true;
                    
                    console.log(`RemotePlayer ${this.username}: Successfully created character mesh`);
                } else {
                    console.warn(`RemotePlayer ${this.username}: No meshes found in character asset, using fallback`);
                    this.createFallbackMesh();
                }
            } else {
                console.warn(`RemotePlayer ${this.username}: No asset manager available, using fallback`);
                this.createFallbackMesh();
            }
            
        } catch (error) {
            console.error(`Failed to create player mesh for ${this.username}:`, error);
            this.createFallbackMesh();
        }
    }
    
    /**
     * Get the appropriate animation file name based on movement state
     */
    getAnimationFileForState(movementState) {
        switch (movementState) {
            case 'walking': return 'trun_walking';
            case 'sprinting': return 'trun_running';
            case 'standing':
            default: return 'trun_standing';
        }
    }
    
    /**
     * Load animation asset if not already loaded
     */
    async loadAnimationAsset(assetName) {
        if (!this.game.assetManager.isAssetLoaded(assetName)) {
            const characterConfig = window.TrunCharacterConfig;
            console.log(`RemotePlayer ${this.username}: Loading animation asset ${assetName}, config:`, characterConfig);
            
            if (characterConfig && characterConfig.animationFiles && characterConfig.animationFiles[assetName]) {
                const config = characterConfig.animationFiles[assetName];
                console.log(`RemotePlayer ${this.username}: Loading with config:`, config);
                
                await this.game.assetManager.loadModel(
                    assetName,
                    config.folder,
                    config.filename,
                    config.category
                );
            } else {
                console.error(`RemotePlayer ${this.username}: No config found for ${assetName}`);
            }
        }
    }
    
    /**
     * Swap mesh for new movement state
     */
    async swapMeshForMovementState(newMovementState) {
        try {
            const newAnimationFile = this.getAnimationFileForState(newMovementState);
            
            await this.loadAnimationAsset(newAnimationFile);
            
            const newCharacterAsset = this.game.assetManager.getAsset(newAnimationFile);
            if (!newCharacterAsset?.meshes.length) {
                console.error(`RemotePlayer ${this.username}: Failed to load new animation asset: ${newAnimationFile}`);
                return;
            }
            
            const currentPosition = this.mesh ? this.mesh.position.clone() : this.position.clone();
            const currentRotation = this.mesh ? this.mesh.rotation.clone() : this.rotation.clone();
            
            if (this.mesh) {
                this.mesh.dispose();
            }
            
            const sourceMesh = newCharacterAsset.meshes[0];
            
            // Temporarily enable source mesh for cloning, then restore its state
            const wasSourceEnabled = sourceMesh.isEnabled();
            sourceMesh.setEnabled(true);
            
            this.mesh = sourceMesh.clone(`remotePlayer_${this.id}`);
            
            // Restore source mesh state
            sourceMesh.setEnabled(wasSourceEnabled);
            
            // Ensure cloned mesh is enabled
            this.mesh.setEnabled(true);
            
            // Enable all child meshes recursively
            this.enableAllChildMeshes(this.mesh);
            
            console.log(`RemotePlayer ${this.username}: Swapped mesh enabled:`, this.mesh.isEnabled(), 'visible:', this.mesh.isVisible);
            
            this.mesh.position.x = currentPosition.x;
            this.mesh.position.z = currentPosition.z;
            this.mesh.rotationQuaternion = null;
            this.mesh.rotation.copyFrom(currentRotation);
            
            this.mesh.checkCollisions = true;
            
            console.log(`RemotePlayer ${this.username}: Successfully swapped to ${newMovementState} animation`);
            
        } catch (error) {
            console.error(`RemotePlayer ${this.username}: Failed to swap mesh for movement state ${newMovementState}:`, error);
        }
    }
    
    /**
     * Recursively enable all child meshes
     */
    enableAllChildMeshes(mesh) {
        if (!mesh) return;
        
        // Enable the current mesh
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.visibility = 1.0;
        
        // Enable all child meshes
        const childMeshes = mesh.getChildMeshes();
        childMeshes.forEach(childMesh => {
            this.enableAllChildMeshes(childMesh);
        });
    }
    
    /**
     * Create fallback capsule mesh
     */
    createFallbackMesh() {
        console.log(`RemotePlayer ${this.username}: Creating fallback mesh`);
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(
            `remotePlayer_${this.id}`,
            { height: 3.6, radius: 0.3 },
            this.scene
        );
        
        const material = new BABYLON.StandardMaterial(`remotePlayerMat_${this.id}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0);
        material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        this.mesh.material = material;
    }
    
    /**
     * Create look slice to show where player is looking
     */
    createLookRay() {
        const sliceRadius = 0.24; // Head size radius
        const sliceAngle = Math.PI / 6; // 45 degrees in radians
        const radialSegments = 8; // Number of segments along the arc
        const heightSegments = 6; // Number of segments from center to edge
        
        // Create spherical slice geometry using spherical coordinates
        const positions = [];
        const indices = [];
        const normals = [];
        
        const verticalSegments = 10; // From bottom to top of sphere
        const horizontalSegments = radialSegments; // Along the 45-degree arc
        
        // Generate vertices using spherical coordinates
        for (let v = 0; v <= verticalSegments; v++) {
            // Phi: vertical angle from 0 (bottom) to PI (top)
            const phi = (v / verticalSegments) * Math.PI;
            
            for (let h = 0; h <= horizontalSegments; h++) {
                // Theta: horizontal angle within the degree slice
                const theta = (h / horizontalSegments) * sliceAngle - sliceAngle / 2;
                
                // Convert spherical to cartesian coordinates
                const x = sliceRadius * Math.sin(phi) * Math.sin(theta);
                const y = sliceRadius * Math.cos(phi); // Y goes from +radius (top) to -radius (bottom)
                const z = sliceRadius * Math.sin(phi) * Math.cos(theta);
                
                positions.push(x, y, z);
                
                // Normal is just the normalized position vector (pointing outward from center)
                const length = Math.sqrt(x * x + y * y + z * z);
                if (length > 0) {
                    normals.push(x / length, y / length, z / length);
                } else {
                    normals.push(0, 1, 0);
                }
            }
        }
        
        // Create faces connecting the grid of vertices
        for (let v = 0; v < verticalSegments; v++) {
            for (let h = 0; h < horizontalSegments; h++) {
                const current = v * (horizontalSegments + 1) + h;
                const next = current + horizontalSegments + 1;
                
                // Two triangles per quad
                indices.push(current, current + 1, next);
                indices.push(current + 1, next + 1, next);
            }
        }
        
        // Create side faces to close the slice edges
        // Left edge (theta = -sliceAngle/2)
        for (let v = 0; v < verticalSegments; v++) {
            const bottom = v * (horizontalSegments + 1);
            const top = (v + 1) * (horizontalSegments + 1);
            
            // Add triangles to close the left edge (these will be degenerate at poles)
            if (v > 0 && v < verticalSegments - 1) {
                indices.push(bottom, top, bottom + horizontalSegments);
                indices.push(top, top + horizontalSegments, bottom + horizontalSegments);
            }
        }
        
        // Right edge (theta = +sliceAngle/2)
        for (let v = 0; v < verticalSegments; v++) {
            const bottom = v * (horizontalSegments + 1) + horizontalSegments;
            const top = (v + 1) * (horizontalSegments + 1) + horizontalSegments;
            
            // Add triangles to close the right edge
            if (v > 0 && v < verticalSegments - 1) {
                indices.push(bottom, bottom - horizontalSegments, top);
                indices.push(top, bottom - horizontalSegments, top - horizontalSegments);
            }
        }
        
        // Create custom mesh
        this.lookRay = new BABYLON.Mesh(`lookSlice_${this.id}`, this.scene);
        
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        
        vertexData.applyToMesh(this.lookRay);
        
        // Create glowing pink material (same as muzzle flash)
        const material = new BABYLON.StandardMaterial(`lookSliceMaterial_${this.id}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.5); // Pink (same as muzzle flash)
        material.emissiveColor = new BABYLON.Color3(1.0, 0.0, 0.5); // Pink glow (same as muzzle flash)
        material.alpha = 0.6; // Semitransparent
        material.backFaceCulling = false; // Show both sides
        
        this.lookRay.material = material;
        
        // Position and rotation
        this.lookRay.position.copyFrom(this.position);
        this.lookRay.position.y += this.lookRayEyeHeight; // Add 0.2 to move sphere center down relative to attachment point
        
        this.lookRay.rotation.x = this.rotation.x;
        this.lookRay.rotation.y = this.rotation.y;
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
            
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
            
            if (this.lookRay) {
                this.lookRay.position.copyFrom(this.position);
                this.lookRay.position.y += this.lookRayEyeHeight;
            }
        }
        
        if (rotationDistance > 0.001) {
            this.rotation.y = BABYLON.Scalar.Lerp(
                this.rotation.y,
                this.targetRotation.y,
                this.interpolationSpeed * deltaTime
            );
            
            this.mesh.rotationQuaternion = null;
            this.mesh.rotation.y = this.rotation.y + Math.PI;
            
            if (this.lookRay) {
                this.lookRay.rotation.y = this.rotation.y;
            }
        }
        
        const xRotationDistance = Math.abs(this.rotation.x - this.targetRotation.x);
        if (xRotationDistance > 0.001) {
            this.rotation.x = BABYLON.Scalar.Lerp(
                this.rotation.x,
                this.targetRotation.x,
                this.interpolationSpeed * deltaTime
            );
            
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
        
        const worldPosition = this.mesh.position.add(new BABYLON.Vector3(0, 1.2, 0));
        const screenPosition = BABYLON.Vector3.Project(
            worldPosition,
            BABYLON.Matrix.Identity(),
            camera.getViewMatrix(),
            camera.getProjectionMatrix(),
            this.scene.getEngine().getRenderingCanvasClientRect()
        );
        
        this.nameTag.background.leftInPixels = screenPosition.x - (this.nameTag.background.widthInPixels / 2);
        this.nameTag.background.topInPixels = screenPosition.y - 40;
        
        if (this.healthBar) {
            this.healthBar.background.leftInPixels = screenPosition.x - (this.healthBar.background.widthInPixels / 2);
            this.healthBar.background.topInPixels = screenPosition.y - 10;
        }
        
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
        if (this.mesh) {
            if (animationName === 'crouching') {
                this.mesh.scaling.y = 0.7;
            } else {
                this.mesh.scaling.y = 1.0;
            }
        }
    }
    
    /**
     * Update animations based on state
     */
    updateAnimations(deltaTime) {
        if (!this.mesh) return;
        
        if (this.movementState !== this.lastMovementState) {
            this.playAnimation(this.movementState);
            this.lastMovementState = this.movementState;
        }
        
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
    async updateFromNetworkData(data) {
        if (data.position) {
            this.targetPosition.set(data.position.x, data.position.y, data.position.z);
        }
        
        if (data.rotation) {
            this.targetRotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
        
        if (data.movement && data.movement !== this.movementState) {
            this.movementState = data.movement;
            await this.swapMeshForMovementState(this.movementState);
            this.lastMovementState = this.movementState;
        }
        
        if (data.health !== undefined && data.health !== this.health) {
            this.setHealth(data.health);
        }
        
        if (data.alive !== undefined) {
            this.setAlive(data.alive);
        }
        
        if (data.username && data.username !== this.username) {
            this.setUsername(data.username);
        }
        
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
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
        if (this.lookRay) {
            this.lookRay.dispose();
            this.lookRay = null;
        }
        
        if (this.nameTag) {
            this.nameTag.texture.dispose();
            this.nameTag = null;
        }
        
        this.healthBar = null;
        this.game = null;
        this.scene = null;
    }
} 