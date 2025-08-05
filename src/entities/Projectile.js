/**
 * KILLtONE Game Framework - Projectile Class
 * Individual projectile entities with movement, collision detection, and visual effects
 */

import { MathUtils } from '../utils/MathUtils.js';

export class Projectile {
    constructor(data, scene, raycastManager = null) {
        // Projectile data
        this.id = data.id || this.generateId();
        this.position = data.position.clone();
        this.direction = data.direction.normalize();
        this.speed = data.speed || 800;
        this.damage = data.damage || 50;
        this.maxDistance = data.maxDistance || 500;
        this.ownerId = data.ownerId || 'local';
        this.weapon = data.weapon || { name: 'Unknown', type: 'unknown', damage: 50 };
        
        console.log('Projectile: Created projectile with ID:', this.id);
        console.log('Projectile: Position:', this.position.toString());
        console.log('Projectile: Direction:', this.direction.toString());
        console.log('Projectile: Speed:', this.speed);
        console.log('Projectile: Damage:', this.damage);
        console.log('Projectile: Owner ID:', this.ownerId);
        
        // Visual settings
        this.showTrail = data.showTrail !== undefined ? data.showTrail : true;
        this.trailColor = data.trailColor || new BABYLON.Color3(0.8, 0.2, 0.8); // Purple
        this.trailLength = data.trailLength || 0.3;
        
        // Scene and managers
        this.scene = scene;
        this.raycastManager = raycastManager;
        
        // Movement state
        this.velocity = this.direction.scale(this.speed);
        this.distanceTraveled = 0;
        this.startPosition = this.position.clone();
        this.lastPosition = this.position.clone();
        
        console.log('Projectile: Initial velocity:', this.velocity.toString());
        console.log('Projectile: Speed:', this.speed);
        console.log('Projectile: Direction:', this.direction.toString());
        
        // Timing
        this.createdTime = performance.now() / 1000;
        this.maxLifetime = 10; // Maximum 10 seconds before forced cleanup
        
        // Visual components
        this.mesh = null;
        this.trail = null;
        this.material = null;
        
        // State
        this.isActive = true;
        this.hasHit = false;
        this.hitPosition = null;
        this.hitNormal = null;
        this.hitTarget = null;
        this.hitObject = null; // For network transmission
        
        // Performance tracking
        this.updateCount = 0;
        this.lastUpdateTime = 0;
        
        // Create visual representation
        console.log('Projectile: Creating visuals for projectile:', this.id);
        this.createVisuals();
        console.log('Projectile: Visuals created, mesh:', this.mesh);
        
        // Make sure the mesh is visible
        if (this.mesh) {
            this.mesh.setEnabled(true);
            console.log('Projectile: Mesh enabled and visible');
        }
    }
    
    /**
     * Generate unique projectile ID
     */
    generateId() {
        return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Create visual representation of the projectile
     */
    createVisuals() {
        console.log('Projectile: Creating capsule mesh...');
        // Create capsule mesh (horizontal pill shape) - make it larger for visibility
        this.mesh = BABYLON.MeshBuilder.CreateCapsule("projectile_" + this.id, {
            height: 0.5,
            radius: 0.07,
            orientation: BABYLON.Vector3.Right()
        }, this.scene);
        
        console.log('Projectile: Mesh created:', this.mesh);
        
        // Position the mesh
        this.mesh.position = this.position.clone();
        console.log('Projectile: Mesh positioned at:', this.mesh.position.toString());
        
        // Create glowing emissive material
        this.material = new BABYLON.StandardMaterial("projectileMat_" + this.id, this.scene);
        
        // Set weapon-specific colors
        const weaponColors = {
            'carbine': new BABYLON.Color3(0.8, 0.2, 0.8), // Purple
            'pistol': new BABYLON.Color3(1.0, 0.4, 0.8),  // Pink
            'shotgun': new BABYLON.Color3(0.6, 0.2, 1.0), // Blue-purple
            'smg': new BABYLON.Color3(0.8, 0.4, 0.2),     // Orange
            'sniper': new BABYLON.Color3(0.2, 0.8, 0.4),  // Green
            'knife': new BABYLON.Color3(1.0, 0.2, 0.2)    // Red
        };
        
        const color = weaponColors[this.weapon.type] || weaponColors['carbine'];
        this.material.emissiveColor = color;
        this.material.diffuseColor = color.scale(0.3);
        this.material.specularColor = color.scale(0.5);
        
        // Make it glow more intensely
        this.material.emissiveIntensity = 1.0;
        
        // Apply material
        this.mesh.material = this.material;
        
        // Add to glow layer for enhanced visibility
        console.log('Projectile: Checking glow layer...');
        if (this.scene.glowLayer) {
            console.log('Projectile: Adding to glow layer');
            this.scene.glowLayer.addIncludedOnlyMesh(this.mesh);
        } else {
            console.log('Projectile: No glow layer available');
        }
        
        // Create trail effect if enabled
        if (this.showTrail) {
            this.createTrail();
        }
    }
    
    /**
     * Create particle trail effect
     */
    createTrail() {
        // Create particle system
        this.trail = new BABYLON.ParticleSystem("trail_" + this.id, 50, this.scene);
        
        // Configure particles
        this.trail.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        // Emission
        this.trail.emitter = this.mesh;
        this.trail.emitRate = 100;
        this.trail.minEmitBox = new BABYLON.Vector3(0, 0, 0);
        this.trail.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
        
        // Particle properties
        this.trail.minSize = 0.01;
        this.trail.maxSize = 0.03;
        this.trail.minLifeTime = 0.1;
        this.trail.maxLifeTime = 0.3;
        
        // Colors
        this.trail.color1 = this.trailColor;
        this.trail.color2 = this.trailColor.scale(0.5);
        this.trail.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        // Movement
        this.trail.minEmitPower = 0.1;
        this.trail.maxEmitPower = 0.3;
        this.trail.updateSpeed = 0.01;
        
        // Direction
        this.trail.gravity = new BABYLON.Vector3(0, 0, 0);
        this.trail.direction1 = new BABYLON.Vector3(-0.1, -0.1, -0.1);
        this.trail.direction2 = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        // Start the trail
        this.trail.start();
    }
    
    /**
     * Update projectile position and check for collisions
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.updateCount++;
        this.lastUpdateTime = performance.now() / 1000;
        
        // Store last position for collision detection
        this.lastPosition = this.position.clone();
        
        // Update position based on velocity
        const movement = this.velocity.scale(deltaTime);
        this.position.addInPlace(movement);
        
        // Update distance traveled
        this.distanceTraveled = BABYLON.Vector3.Distance(this.startPosition, this.position);
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position = this.position.clone();
        } else {
            console.warn(`Projectile ${this.id}: No mesh to update position`);
        }
        
        // Check for collisions
        this.checkCollision();
        
        // Check lifetime and distance limits
        this.checkLimits();
    }
    
    /**
     * Check for collisions using raycast
     */
    checkCollision() {
        if (!this.raycastManager || this.hasHit) return;
        
        // Raycast from last position to current position
        const hit = this.raycastManager.bulletRaycast(
            this.lastPosition,
            this.direction,
            this.speed * 0.016, // One frame's worth of movement
            [this.mesh] // Exclude self
        );
        
        if (hit) {
            console.log(`Projectile ${this.id}: Hit detected at`, hit.point.toString());
            this.processHit(hit);
        }
    }
    
    /**
     * Process collision hit
     */
    processHit(hit) {
        this.hasHit = true;
        this.hitPosition = hit.point.clone();
        this.hitNormal = hit.normal;
        this.hitTarget = hit.mesh;
        this.hitObject = {
            name: hit.mesh ? hit.mesh.name : 'unknown',
            type: hit.mesh ? hit.mesh.type || 'mesh' : 'unknown'
        };
        
        // Update position to hit point
        this.position = this.hitPosition.clone();
        if (this.mesh) {
            this.mesh.position = this.position.clone();
        }
        
        // Create hit effects
        this.createHitEffects();
        
        // Apply damage if hitting a player
        this.applyDamage();
        
        // Mark for destruction
        this.isActive = false;
    }
    
    /**
     * Create visual effects at hit location
     */
    createHitEffects() {
        if (!this.scene) return;
        
        // Create hit sparks
        const sparkSystem = new BABYLON.ParticleSystem("sparks_" + this.id, 20, this.scene);
        sparkSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        sparkSystem.emitter = this.hitPosition;
        sparkSystem.emitRate = 50;
        sparkSystem.minSize = 0.01;
        sparkSystem.maxSize = 0.05;
        sparkSystem.minLifeTime = 0.1;
        sparkSystem.maxLifeTime = 0.3;
        sparkSystem.color1 = new BABYLON.Color4(1, 1, 0, 1); // Yellow sparks
        sparkSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1); // Orange sparks
        sparkSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        sparkSystem.minEmitPower = 1;
        sparkSystem.maxEmitPower = 3;
        sparkSystem.updateSpeed = 0.01;
        sparkSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        sparkSystem.start();
        
        // Auto-dispose after effect duration
        setTimeout(() => {
            sparkSystem.dispose();
        }, 1000);
        
        // Create blood splatter if hitting a player
        if (this.hitTarget && this.hitTarget.name && this.hitTarget.name.includes('player')) {
            this.createBloodSplatter();
        }
    }
    
    /**
     * Create blood splatter effect
     */
    createBloodSplatter() {
        const bloodSystem = new BABYLON.ParticleSystem("blood_" + this.id, 30, this.scene);
        bloodSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        
        bloodSystem.emitter = this.hitPosition;
        bloodSystem.emitRate = 100;
        bloodSystem.minSize = 0.02;
        bloodSystem.maxSize = 0.08;
        bloodSystem.minLifeTime = 0.5;
        bloodSystem.maxLifeTime = 1.5;
        bloodSystem.color1 = new BABYLON.Color4(0.8, 0, 0, 1); // Dark red
        bloodSystem.color2 = new BABYLON.Color4(1, 0, 0, 1);   // Bright red
        bloodSystem.colorDead = new BABYLON.Color4(0.3, 0, 0, 0.5);
        bloodSystem.minEmitPower = 2;
        bloodSystem.maxEmitPower = 5;
        bloodSystem.updateSpeed = 0.01;
        bloodSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        bloodSystem.start();
        
        // Auto-dispose after effect duration
        setTimeout(() => {
            bloodSystem.dispose();
        }, 2000);
    }
    
    /**
     * Apply damage to hit target
     */
    applyDamage() {
        if (!this.hitTarget) return;
        
        // Check if target has damage method (player)
        if (this.hitTarget.takeDamage) {
            this.hitTarget.takeDamage(this.damage);
        }
        
        // Create mesh flash effect
        if (this.hitTarget.material) {
            const originalEmissive = this.hitTarget.material.emissiveColor;
            this.hitTarget.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
            
            setTimeout(() => {
                if (this.hitTarget && this.hitTarget.material) {
                    this.hitTarget.material.emissiveColor = originalEmissive;
                }
            }, 100);
        }
    }
    
    /**
     * Check lifetime and distance limits
     */
    checkLimits() {
        const currentTime = performance.now() / 1000;
        
        // Check distance limit
        if (this.distanceTraveled >= this.maxDistance) {
            console.log(`Projectile ${this.id}: Deactivated due to distance limit (${this.distanceTraveled}/${this.maxDistance})`);
            this.isActive = false;
            return;
        }
        
        // Check lifetime limit
        if (currentTime - this.createdTime >= this.maxLifetime) {
            console.log(`Projectile ${this.id}: Deactivated due to lifetime limit (${currentTime - this.createdTime}/${this.maxLifetime})`);
            this.isActive = false;
            return;
        }
    }
    
    /**
     * Get projectile statistics
     */
    getStats() {
        return {
            id: this.id,
            position: this.position.clone(),
            velocity: this.velocity.clone(),
            distanceTraveled: this.distanceTraveled,
            maxDistance: this.maxDistance,
            isActive: this.isActive,
            hasHit: this.hasHit,
            updateCount: this.updateCount,
            age: (performance.now() / 1000) - this.createdTime
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Stop trail
        if (this.trail) {
            this.trail.stop();
            this.trail.dispose();
            this.trail = null;
        }
        
        // Remove from glow layer
        if (this.scene && this.scene.glowLayer && this.mesh) {
            this.scene.glowLayer.removeIncludedOnlyMesh(this.mesh);
        }
        
        // Dispose mesh and material
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        
        // Clear references
        this.scene = null;
        this.raycastManager = null;
        this.isActive = false;
    }
} 