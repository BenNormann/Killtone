/**
 * KILLtONE Game Framework - Projectile Manager
 * Manages all projectiles in the game with hit detection and effects
 */

import { Projectile } from '../entities/Projectile.js';

/**
 * ProjectileManager class - manages all projectiles in the game
 */
export class ProjectileManager {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        
        // Projectile tracking
        this.projectiles = new Map();
        this.activeProjectileCount = 0;
        this.totalProjectilesFired = 0;
        this.projectilesHit = 0;
        
        // Configuration
        this.config = {
            maxActiveProjectiles: 100,
            enableHitEffects: true,
            collisionLayers: ['player', 'environment']
        };
        
        // Glow layer for projectile effects
        this.glowLayer = null;
    }

    /**
     * Initialize the projectile manager
     */
    initialize() {
        // Create glow layer for projectile effects
        this.glowLayer = new BABYLON.GlowLayer('projectileGlow', this.scene);
        this.glowLayer.intensity = 0.8;
        
        // Add to scene effect layers
        if (!this.scene.effectLayers) {
            this.scene.effectLayers = [];
        }
        this.scene.effectLayers.push(this.glowLayer);
        
        console.log('ProjectileManager initialized');
    }

    /**
     * Fire a projectile from a position in a direction
     */
    fireProjectile(options = {}) {
        // Check projectile limit
        if (this.activeProjectileCount >= this.config.maxActiveProjectiles) {
            console.warn('Maximum projectile limit reached');
            return null;
        }
        
        // Create projectile with default settings
        const projectileOptions = {
            position: options.position || new BABYLON.Vector3.Zero(),
            velocity: options.velocity || options.direction?.normalize().scale(options.speed || 50) || new BABYLON.Vector3(0, 0, 50),
            speed: options.speed || 50,
            damage: options.damage || 25,
            ownerId: options.ownerId || null,
            maxDistance: options.maxDistance || 500,
            lifeTime: options.lifeTime || 10,
            ...options
        };
        
        // Create projectile
        const projectile = new Projectile(this.scene, projectileOptions);
        
        // Add to tracking
        this.projectiles.set(projectile.id, projectile);
        this.activeProjectileCount++;
        this.totalProjectilesFired++;
        
        return projectile;
    }

    /**
     * Update all active projectiles
     */
    update(deltaTime) {
        const projectilesToRemove = [];
        
        for (const [id, projectile] of this.projectiles) {
            // Update projectile
            const stillActive = projectile.update(deltaTime);
            
            if (!stillActive) {
                projectilesToRemove.push(id);
                continue;
            }
            
            // Check for collisions
            this.checkProjectileCollisions(projectile);
        }
        
        // Remove inactive projectiles
        for (const id of projectilesToRemove) {
            this.removeProjectile(id);
        }
    }

    /**
     * Check collisions for a specific projectile
     */
    checkProjectileCollisions(projectile) {
        if (!this.game.raycastManager) return;
        
        // Perform raycast for collision detection
        const hitInfo = this.game.raycastManager.bulletRaycast(
            projectile.lastPosition,
            projectile.velocity.normalize(),
            projectile.velocity.length() * 0.016, // Distance traveled this frame
            [projectile.mesh] // Exclude the projectile itself
        );
        
        if (hitInfo && hitInfo.hit) {
            // Check if we hit a valid target
            const hitMesh = hitInfo.mesh;
            
            if (this.isValidTarget(hitMesh, projectile)) {
                // Handle the hit
                const hitResult = projectile.onHit(hitInfo, this.game.particleManager);
                
                // Process hit effects
                this.processHit(hitResult, hitMesh);
                
                // Remove projectile
                this.removeProjectile(projectile.id);
                this.projectilesHit++;
            }
        }
    }

    /**
     * Check if a mesh is a valid target for the projectile
     */
    isValidTarget(mesh, projectile) {
        if (!mesh || !mesh.metadata) return true; // Default to true for environment
        
        // Don't hit the owner
        if (mesh.metadata.playerId === projectile.ownerId) {
            return false;
        }
        
        // Don't hit other projectiles
        if (mesh.metadata.type === 'projectile') {
            return false;
        }
        
        // Don't hit triggers unless specified
        if (mesh.metadata.isTrigger) {
            return false;
        }
        
        return true;
    }

    /**
     * Process hit effects and damage
     */
    processHit(hitResult, hitMesh) {
        // Emit hit event for game systems
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('projectileHit', {
                ...hitResult,
                targetMesh: hitMesh
            });
        }
        
        // Handle player hits
        if (hitMesh.metadata && hitMesh.metadata.type === 'player') {
            this.handlePlayerHit(hitResult, hitMesh);
        }
        
        // Create hit effects using particle manager
        if (this.config.enableHitEffects && this.game.particleManager) {
            this.game.particleManager.createHitSpark(hitResult.position, hitResult.normal);
        }
    }

    /**
     * Handle hits on players
     */
    handlePlayerHit(hitResult, playerMesh) {
        const playerId = playerMesh.metadata.playerId;
        
        // Apply damage through game systems
        if (this.game.playerManager) {
            this.game.playerManager.applyDamage(playerId, hitResult.damage, {
                source: 'projectile',
                attackerId: hitResult.ownerId,
                position: hitResult.position
            });
        }
        
        // Create blood effects using particle manager
        if (this.game.particleManager) {
            this.game.particleManager.createBloodSplatter(hitResult.position, hitResult.normal);
        }
    }

    /**
     * Remove a projectile by ID
     */
    removeProjectile(id) {
        const projectile = this.projectiles.get(id);
        if (projectile) {
            projectile.destroy();
            this.projectiles.delete(id);
            this.activeProjectileCount--;
        }
    }

    /**
     * Clear all projectiles
     */
    clearAllProjectiles() {
        for (const [id, projectile] of this.projectiles) {
            projectile.destroy();
        }
        this.projectiles.clear();
        this.activeProjectileCount = 0;
    }

    /**
     * Get projectile statistics
     */
    getStats() {
        return {
            activeProjectiles: this.activeProjectileCount,
            totalFired: this.totalProjectilesFired,
            totalHits: this.projectilesHit,
            hitRate: this.totalProjectilesFired > 0 ? 
                (this.projectilesHit / this.totalProjectilesFired * 100).toFixed(1) + '%' : '0%'
        };
    }

    /**
     * Configure projectile manager settings
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Dispose of the projectile manager and clean up resources
     */
    dispose() {
        // Clear all projectiles
        this.clearAllProjectiles();
        
        // Dispose glow layer
        if (this.glowLayer) {
            this.glowLayer.dispose();
            this.glowLayer = null;
        }
        
        console.log('ProjectileManager disposed');
    }
}

export default ProjectileManager;