/**
 * KILLtONE Game Framework - Projectile System
 * Handles projectile physics, rendering, and hit detection
 */

import { MathUtils } from '../utils/MathUtils.js';

/**
 * Individual Projectile class
 */
export class Projectile {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.id = MathUtils.generateId();
        
        // Projectile properties
        this.position = options.position || new BABYLON.Vector3.Zero();
        this.velocity = options.velocity || new BABYLON.Vector3(0, 0, 0);
        this.speed = options.speed || 1200;
        this.damage = options.damage || 25;
        this.maxDistance = options.maxDistance || 2000;
        this.lifeTime = options.lifeTime || 10; // seconds
        
        // Visual properties - pink pill
        this.color = new BABYLON.Color3(1, 0.4, 0.8); // Pink
        this.size = 0.2;
        
        // State tracking
        this.isActive = true;
        this.distanceTraveled = 0;
        this.timeAlive = 0;
        this.startPosition = this.position.clone();
        
        // Owner information
        this.ownerId = options.ownerId || null;
        
        // Mesh and materials
        this.mesh = null;
        this.material = null;
        
        // Physics
        this.lastPosition = this.position.clone();
        
        this.createVisuals();
    }

    /**
     * Create the visual representation of the projectile
     */
    createVisuals() {
        // Create pill-shaped projectile (capsule)
        this.mesh = BABYLON.MeshBuilder.CreateCapsule(`projectile_${this.id}`, {
            radius: this.size * 0.3,
            height: this.size * 2,
            tessellation: 8
        }, this.scene);
        
        // Position the mesh
        this.mesh.position = this.position.clone();
        
        // Rotate capsule to be horizontal (default is vertical along Y-axis)
        // Rotate 90 degrees around X-axis to make it point forward (along Z-axis)
        this.mesh.rotation.x = Math.PI / 2;
        
        // Create glowing material
        this.material = new BABYLON.StandardMaterial(`projectile_mat_${this.id}`, this.scene);
        this.material.emissiveColor = this.color;
        this.material.diffuseColor = this.color;
        this.material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        this.material.disableLighting = true;
        
        this.mesh.material = this.material;
        
        // Set rendering group for proper depth sorting
        this.mesh.renderingGroupId = 0; // Same as most other objects for proper depth testing
        
        // Add glow effect
        if (this.scene.effectLayers) {
            this.glowLayer = this.scene.effectLayers.find(layer => 
                layer instanceof BABYLON.GlowLayer
            );
            
            if (this.glowLayer) {
                this.glowLayer.addIncludedOnlyMesh(this.mesh);
                // Set emissive color for glow effect
                if (this.mesh.material) {
                    this.mesh.material.emissiveColor = this.color;
                }
            }
        }
        
        // Set collision properties
        this.mesh.metadata = {
            type: 'projectile',
            projectileId: this.id,
            ownerId: this.ownerId,
            damage: this.damage
        };
        
        // Make it small for collision detection
        this.mesh.scaling = new BABYLON.Vector3(1, 1, 1);
    }

    /**
     * Update projectile position and check for collisions
     */
    update(deltaTime) {
        if (!this.isActive) return false;
        
        // Update lifetime
        this.timeAlive += deltaTime;
        if (this.timeAlive >= this.lifeTime) {
            this.destroy();
            return false;
        }
        
        // Store last position for collision detection
        this.lastPosition = this.position.clone();
        
        // Update position based on velocity
        const movement = this.velocity.scale(deltaTime);
        this.position.addInPlace(movement);
        this.distanceTraveled += movement.length();
        
        // Check max distance
        if (this.distanceTraveled >= this.maxDistance) {
            this.destroy();
            return false;
        }
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position = this.position.clone();
            
            // Orient the projectile in the direction of travel
            const lookDirection = this.velocity.normalize();
            this.mesh.lookAt(this.position.add(lookDirection));
        }
        
        return true;
    }

    /**
     * Get the projectile's current ray for collision detection
     */
    getRay() {
        const direction = this.velocity.normalize();
        return new BABYLON.Ray(this.lastPosition, direction, this.velocity.length() * 0.016); // Assume 60fps
    }

    /**
     * Handle collision with a target
     */
    onHit(hitInfo, particleManager = null) {
        // Create hit effect at collision point using particle manager
        if (particleManager && particleManager.createHitSpark) {
            particleManager.createHitSpark(hitInfo.point, hitInfo.normal);
        }
        
        // Mark as inactive
        this.destroy();
        
        return {
            damage: this.damage,
            position: hitInfo.point,
            normal: hitInfo.normal,
            ownerId: this.ownerId,
            projectileId: this.id
        };
    }

    /**
     * Destroy the projectile and clean up resources
     */
    destroy() {
        this.isActive = false;
        
        if (this.mesh) {
            // Remove from glow layer
            if (this.glowLayer) {
                this.glowLayer.removeIncludedOnlyMesh(this.mesh);
            }
            
            // Dispose mesh and material
            this.mesh.dispose();
            this.mesh = null;
        }
        
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
    }

    /**
     * Get projectile info for networking
     */
    getNetworkData() {
        return {
            id: this.id,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            velocity: {
                x: this.velocity.x,
                y: this.velocity.y,
                z: this.velocity.z
            },
            ownerId: this.ownerId,
            damage: this.damage,
            timeAlive: this.timeAlive
        };
    }
}
