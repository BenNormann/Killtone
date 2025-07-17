/**
 * KILLtONE Game Framework - Projectile System
 * Handles bullet physics, hit detection, and damage application
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from '../mainConfig.js';

export class Projectile {
    constructor(game, scene, projectileData) {
        this.game = game;
        this.scene = scene;
        
        // Projectile properties
        this.origin = projectileData.origin.clone();
        this.direction = projectileData.direction.clone().normalize();
        this.weapon = projectileData.weapon;
        this.damage = projectileData.damage;
        this.range = projectileData.range;
        this.speed = projectileData.speed;
        this.playerId = projectileData.playerId || 'unknown';
        
        // Current state
        this.currentPosition = this.origin.clone();
        this.distanceTraveled = 0;
        this.isActive = true;
        this.hasHit = false;
        
        // Visual representation (optional)
        this.trailMesh = null;
        this.showTrail = projectileData.showTrail || false;
        
        // Hit detection
        this.hitTargets = new Set(); // Prevent multiple hits on same target
        
        // Events
        this.onHit = null;
        this.onDestroy = null;
        
        // Initialize projectile
        this.initialize();
    }

    /**
     * Initialize the projectile
     */
    initialize() {
        // Create visual trail if enabled
        if (this.showTrail) {
            this.createTrail();
        }
        
        // Perform immediate raycast for hitscan weapons
        this.performRaycast();
    }

    /**
     * Create visual trail for the projectile
     */
    createTrail() {
        // Create a simple line mesh for bullet trail
        const points = [
            this.origin,
            this.origin.add(this.direction.scale(0.1))
        ];
        
        this.trailMesh = BABYLON.MeshBuilder.CreateLines("bulletTrail", {
            points: points,
            updatable: true
        }, this.scene);
        
        // Set trail color based on weapon
        const trailColor = this.getTrailColor();
        this.trailMesh.color = trailColor;
        
        // Make trail fade out quickly
        setTimeout(() => {
            if (this.trailMesh) {
                this.trailMesh.dispose();
                this.trailMesh = null;
            }
        }, 100);
    }

    /**
     * Get trail color based on weapon type
     */
    getTrailColor() {
        if (!this.weapon) return new BABYLON.Color3(1, 1, 0); // Yellow default
        
        switch (this.weapon.type) {
            case 'sniper':
                return new BABYLON.Color3(1, 0, 0); // Red
            case 'bulldog':
                return new BABYLON.Color3(1, 0.5, 0); // Orange
            case 'pistol':
                return new BABYLON.Color3(1, 1, 0); // Yellow
            default:
                return new BABYLON.Color3(1, 1, 1); // White
        }
    }

    /**
     * Perform raycast for hit detection
     */
    performRaycast() {
        if (!this.isActive) return;
        
        // Create ray from origin in direction
        const ray = new BABYLON.Ray(this.origin, this.direction, this.range);
        
        // Perform raycast
        const hit = this.scene.pickWithRay(ray, (mesh) => {
            return this.isValidTarget(mesh);
        });
        
        if (hit && hit.hit) {
            this.handleHit(hit);
        } else {
            // No hit, projectile travels full range
            this.handleMiss();
        }
    }

    /**
     * Check if a mesh is a valid target for this projectile
     */
    isValidTarget(mesh) {
        if (!mesh || !mesh.name) return false;
        
        // Don't hit the shooter's own collision mesh
        if (mesh.name === 'playerCollision' && this.playerId === 'local') {
            return false;
        }
        
        // Valid targets include:
        // - Player collision meshes (other players)
        // - Map geometry
        // - Destructible objects
        return (
            mesh.name.includes('player') ||
            mesh.name.includes('wall') ||
            mesh.name.includes('ground') ||
            mesh.name.includes('prop') ||
            mesh.checkCollisions === true
        );
    }

    /**
     * Handle projectile hit
     */
    handleHit(hitInfo) {
        if (this.hasHit) return;
        
        this.hasHit = true;
        this.isActive = false;
        
        const hitPosition = hitInfo.pickedPoint;
        const hitMesh = hitInfo.pickedMesh;
        const hitNormal = hitInfo.getNormal(true);
        
        console.log(`Projectile hit: ${hitMesh.name} at distance ${hitInfo.distance}`);
        
        // Create hit data
        const hitData = {
            position: hitPosition,
            normal: hitNormal,
            mesh: hitMesh,
            distance: hitInfo.distance,
            damage: this.damage,
            weapon: this.weapon,
            projectile: this,
            playerId: this.playerId
        };
        
        // Determine hit type and apply effects
        this.processHit(hitData);
        
        // Trigger hit event
        if (this.onHit) {
            this.onHit(hitData);
        }
        
        // Emit game event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('projectile.hit', hitData);
        }
        
        // Create hit effects
        this.createHitEffects(hitData);
        
        // Destroy projectile
        this.destroy();
    }

    /**
     * Process the hit and apply appropriate effects
     */
    processHit(hitData) {
        const hitMesh = hitData.mesh;
        
        // Check if hit a player
        if (this.isPlayerHit(hitMesh)) {
            this.handlePlayerHit(hitData);
        }
        // Check if hit a destructible object
        else if (this.isDestructibleHit(hitMesh)) {
            this.handleDestructibleHit(hitData);
        }
        // Regular surface hit
        else {
            this.handleSurfaceHit(hitData);
        }
    }

    /**
     * Check if the hit mesh belongs to a player
     */
    isPlayerHit(mesh) {
        return mesh && (
            mesh.name.includes('player') ||
            mesh.name === 'playerCollision' ||
            mesh.metadata?.isPlayer === true
        );
    }

    /**
     * Check if the hit mesh is destructible
     */
    isDestructibleHit(mesh) {
        return mesh && (
            mesh.metadata?.destructible === true ||
            mesh.name.includes('destructible')
        );
    }

    /**
     * Handle hit on a player
     */
    handlePlayerHit(hitData) {
        console.log(`Player hit for ${this.damage} damage`);
        
        // Apply damage to player
        const playerData = {
            mesh: hitData.mesh,
            damage: this.damage,
            position: hitData.position,
            weapon: this.weapon,
            attackerId: this.playerId
        };
        
        // Emit player damage event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('player.takeDamage', playerData);
        }
        
        // Create blood effects
        this.createBloodEffect(hitData);
        
        // Play hit sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('player_hit', hitData.position);
        }
    }

    /**
     * Handle hit on a destructible object
     */
    handleDestructibleHit(hitData) {
        console.log('Destructible object hit');
        
        // Apply damage to destructible object
        const destructibleData = {
            mesh: hitData.mesh,
            damage: this.damage,
            position: hitData.position,
            weapon: this.weapon
        };
        
        // Emit destructible damage event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('destructible.takeDamage', destructibleData);
        }
        
        // Create debris effects
        this.createDebrisEffect(hitData);
    }

    /**
     * Handle hit on a regular surface
     */
    handleSurfaceHit(hitData) {
        console.log('Surface hit');
        
        // Play impact sound
        if (this.game.audioManager) {
            this.game.audioManager.playSound('impact_default', hitData.position);
        }
    }

    /**
     * Handle projectile miss (no hit)
     */
    handleMiss() {
        console.log('Projectile missed');
        
        this.isActive = false;
        this.destroy();
    }

    /**
     * Create hit effects based on hit type
     */
    createHitEffects(hitData) {
        // Create spark/impact particles
        this.createSparkEffect(hitData);
        
        // Create bullet hole decal (if supported)
        this.createBulletHole(hitData);
    }

    /**
     * Create blood effect for player hits
     */
    createBloodEffect(hitData) {
        // Use the existing BloodEffects system
        if (this.game.bloodEffects) {
            this.game.bloodEffects.createBloodSplatter(
                hitData.position,
                hitData.normal,
                1.0,
                'normal'
            );
        } else if (this.game.particleManager) {
            // Fallback to ParticleManager
            this.game.particleManager.createBloodSplatter(
                hitData.position,
                hitData.normal,
                1.0
            );
        }
    }

    /**
     * Create spark effect for surface impacts
     */
    createSparkEffect(hitData) {
        // Use the existing ParticleManager
        if (this.game.particleManager) {
            this.game.particleManager.createHitSpark(
                hitData.position,
                hitData.normal
            );
        }
    }

    /**
     * Create debris effect for destructible hits
     */
    createDebrisEffect(hitData) {
        // Use the existing ParticleManager for explosion-like effect
        if (this.game.particleManager) {
            this.game.particleManager.createExplosion(
                hitData.position,
                0.3 // Small scale for debris
            );
        }
    }

    /**
     * Create bullet hole decal
     */
    createBulletHole(hitData) {
        // Simplified bullet hole - in a full implementation, you'd create a decal
        // For now, just log that a bullet hole should be created
        console.log('Bullet hole created at', hitData.position);
        
        // Could create a small dark circle mesh as a simple bullet hole
        const hole = BABYLON.MeshBuilder.CreateDisc("bulletHole", {
            radius: 0.05,
            tessellation: 8
        }, this.scene);
        
        hole.position = hitData.position.add(hitData.normal.scale(0.001));
        hole.lookAt(hitData.position.add(hitData.normal));
        
        // Make it dark
        const holeMaterial = new BABYLON.StandardMaterial("bulletHoleMat", this.scene);
        holeMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        hole.material = holeMaterial;
        
        // Auto-dispose after some time
        setTimeout(() => {
            hole.dispose();
        }, 30000); // 30 seconds
    }

    /**
     * Update projectile (for non-hitscan projectiles)
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        // For hitscan weapons, projectiles are resolved immediately
        // This method would be used for slower projectiles like rockets
        
        // Move projectile
        const movement = this.direction.scale(this.speed * deltaTime);
        this.currentPosition.addInPlace(movement);
        this.distanceTraveled += movement.length();
        
        // Check if projectile has traveled maximum range
        if (this.distanceTraveled >= this.range) {
            this.handleMiss();
            return;
        }
        
        // Update trail if it exists
        if (this.trailMesh) {
            const points = [
                this.currentPosition.subtract(this.direction.scale(0.5)),
                this.currentPosition
            ];
            this.trailMesh = BABYLON.MeshBuilder.CreateLines("bulletTrail", {
                points: points,
                instance: this.trailMesh
            });
        }
    }

    /**
     * Destroy the projectile
     */
    destroy() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Dispose trail mesh
        if (this.trailMesh) {
            this.trailMesh.dispose();
            this.trailMesh = null;
        }
        
        // Trigger destroy event
        if (this.onDestroy) {
            this.onDestroy(this);
        }
        
        // Emit game event
        if (this.game.eventEmitter) {
            this.game.eventEmitter.emit('projectile.destroy', { projectile: this });
        }
        
        console.log('Projectile destroyed');
    }

    /**
     * Get projectile info
     */
    getInfo() {
        return {
            origin: this.origin,
            direction: this.direction,
            currentPosition: this.currentPosition,
            distanceTraveled: this.distanceTraveled,
            damage: this.damage,
            range: this.range,
            speed: this.speed,
            isActive: this.isActive,
            hasHit: this.hasHit,
            weapon: this.weapon ? this.weapon.name : 'unknown'
        };
    }
}

/**
 * Projectile Manager - Handles multiple projectiles
 */
export class ProjectileManager {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        
        this.projectiles = [];
        this.maxProjectiles = 100; // Limit for performance
        
        // Object pooling for better performance
        this.projectilePool = [];
        this.poolSize = 20;
        
        // Performance tracking
        this.stats = {
            created: 0,
            destroyed: 0,
            poolHits: 0,
            poolMisses: 0
        };
        
        // Initialize object pool
        this.initializePool();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize object pool for projectiles
     */
    initializePool() {
        // Pre-create projectiles for pooling (not implemented in this basic version)
        // In a full implementation, you'd create reusable projectile objects
        console.log(`ProjectileManager: Initialized with pool size ${this.poolSize}`);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (this.game.eventEmitter) {
            // Listen for weapon fire events
            this.game.eventEmitter.on('weapon.fire', (projectileData) => {
                this.createProjectile(projectileData);
            });
        }
    }

    /**
     * Create a new projectile
     */
    createProjectile(projectileData) {
        // Limit number of active projectiles
        if (this.projectiles.length >= this.maxProjectiles) {
            // Remove oldest projectile
            const oldestProjectile = this.projectiles.shift();
            oldestProjectile.destroy();
        }
        
        // Create new projectile
        const projectile = new Projectile(this.game, this.scene, projectileData);
        
        // Set up projectile events
        projectile.onDestroy = (proj) => {
            this.removeProjectile(proj);
        };
        
        this.projectiles.push(projectile);
        
        console.log(`Created projectile. Active: ${this.projectiles.length}`);
        return projectile;
    }

    /**
     * Remove a projectile from the manager
     */
    removeProjectile(projectile) {
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
            this.projectiles.splice(index, 1);
        }
    }

    /**
     * Update all projectiles (optimized)
     */
    update(deltaTime) {
        // Batch process projectiles for better performance
        const activeProjectiles = [];
        
        for (let i = 0; i < this.projectiles.length; i++) {
            const projectile = this.projectiles[i];
            
            if (projectile.isActive) {
                projectile.update(deltaTime);
                activeProjectiles.push(projectile);
            } else {
                // Track destroyed projectiles
                this.stats.destroyed++;
            }
        }
        
        // Replace array with active projectiles only
        this.projectiles = activeProjectiles;
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeProjectiles: this.projectiles.length,
            maxProjectiles: this.maxProjectiles
        };
    }

    /**
     * Get active projectile count
     */
    getActiveProjectileCount() {
        return this.projectiles.filter(p => p.isActive).length;
    }

    /**
     * Clear all projectiles
     */
    clearAllProjectiles() {
        this.projectiles.forEach(projectile => {
            projectile.destroy();
        });
        this.projectiles = [];
    }

    /**
     * Dispose of projectile manager
     */
    dispose() {
        console.log('Disposing ProjectileManager...');
        
        this.clearAllProjectiles();
        
        // Remove event listeners
        if (this.game.eventEmitter) {
            this.game.eventEmitter.off('weapon.fire');
        }
        
        this.game = null;
        this.scene = null;
        
        console.log('ProjectileManager disposed');
    }
}

export default Projectile;