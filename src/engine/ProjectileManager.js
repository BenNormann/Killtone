/**
 * KILLtONE Game Framework - ProjectileManager
 * Central coordinator for all projectile-related activities
 */

import { Projectile } from '../entities/Projectile.js';

export class ProjectileManager {
    constructor(game, scene) {
        this.game = game;
        this.scene = scene;
        
        // Active projectiles storage
        this.activeProjectiles = new Map();
        this.projectileCounter = 0;
        
        // Configuration
        this.config = {
            maxProjectiles: 100,
            enableHitEffects: true,
            enableTrails: true,
            debugMode: false,
            networkTimeout: 5000,
            maxRetries: 3,
            cleanupInterval: 5, // seconds
            maxAge: 10 // seconds
        };
        
        // Performance tracking
        this.stats = {
            totalFired: 0,
            totalHits: 0,
            activeCount: 0,
            hitRate: 0,
            lastCleanupTime: 0
        };
        
        // Network state
        this.isOnline = false;
        this.pendingProjectiles = new Map();
        this.networkQueue = [];
        
        // Projectile network updates
        this.projectileUpdates = new Map(); // Track projectiles that need network updates
        
        // Cleanup timer
        this.lastCleanupTime = 0;
        
        // Initialize glow layer for projectiles
        this.initializeGlowLayer();
    }
    
    /**
     * Initialize the projectile manager
     */
    async initialize() {
        console.log('Initializing ProjectileManager...');
        
        // Set up network connection if available
        if (this.game.networkManager) {
            this.setupNetworkHandlers();
            this.isOnline = true;
        }
        
        // Set up periodic cleanup
        this.setupCleanupTimer();
        
        console.log('ProjectileManager initialized');
    }
    
    /**
     * Initialize glow layer for enhanced projectile visibility
     */
    initializeGlowLayer() {
        console.log('ProjectileManager: Initializing glow layer...');
        if (!this.scene.glowLayer) {
            console.log('ProjectileManager: Creating new glow layer');
            this.scene.glowLayer = new BABYLON.GlowLayer("projectileGlow", this.scene, {
                mainTextureSamples: 4,
                blurHorizontalSize: 0.3,
                blurVerticalSize: 0.3,
                glowIntensity: 0.8
            });
            console.log('ProjectileManager: Glow layer created:', this.scene.glowLayer);
        } else {
            console.log('ProjectileManager: Glow layer already exists');
        }
    }
    
    /**
     * Fire a new projectile
     */
    fireProjectile(projectileData, isRemote = false) {
        console.log('ProjectileManager: Received projectile data:', projectileData, 'isRemote:', isRemote);
        
        // Validate projectile data
        if (!this.validateProjectileData(projectileData)) {
            console.warn('Invalid projectile data:', projectileData);
            return null;
        }
        
        // Check projectile limit
        if (this.activeProjectiles.size >= this.config.maxProjectiles) {
            console.warn('Projectile limit reached, cannot fire new projectile');
            return null;
        }
        
        // Generate unique ID if not provided
        if (!projectileData.id) {
            projectileData.id = this.generateProjectileId();
        }
        
        console.log('ProjectileManager: Creating projectile with ID:', projectileData.id);
        
        // Create projectile instance
        const projectile = new Projectile(
            projectileData,
            this.scene,
            this.game.physicsManager ? this.game.physicsManager.raycastManager : null
        );
        
        console.log('ProjectileManager: Projectile created, mesh:', projectile.mesh);
        
        // Add to active projectiles
        this.activeProjectiles.set(projectile.id, projectile);
        
        // Update statistics
        this.stats.totalFired++;
        this.stats.activeCount = this.activeProjectiles.size;
        this.updateHitRate();
        
        // Log if in debug mode
        if (this.config.debugMode) {
            console.log(`Fired projectile ${projectile.id} from ${projectileData.position.toString()}`);
        }
        
        // Send to network if online and not a remote projectile
        if (this.isOnline && !isRemote) {
            console.log('ProjectileManager: Sending projectile to server:', projectileData);
            this.sendProjectileToServer(projectileData);
        }
        
        // Track for network updates (only for local projectiles)
        if (!isRemote) {
            this.projectileUpdates.set(projectile.id, {
                lastUpdate: 0,
                needsUpdate: true
            });
        }
        
        console.log('ProjectileManager: Returning projectile ID:', projectile.id);
        return projectile.id;
    }
    
    /**
     * Validate projectile data
     */
    validateProjectileData(data) {
        return data &&
               data.position &&
               data.direction &&
               data.speed > 0 &&
               data.damage > 0 &&
               data.maxDistance > 0;
    }
    
    /**
     * Generate unique projectile ID
     */
    generateProjectileId() {
        this.projectileCounter++;
        return `proj_${Date.now()}_${this.projectileCounter}`;
    }
    
    /**
     * Update all active projectiles
     */
    update(deltaTime) {
        // Update each active projectile
        for (const [id, projectile] of this.activeProjectiles) {
            projectile.update(deltaTime);
            
            // Remove inactive projectiles
            if (!projectile.isActive) {
                this.removeProjectile(id);
            }
        }
        
        // Send projectile updates to server
        this.sendProjectileUpdates();
        
        // Periodic cleanup
        this.performPeriodicCleanup();
        
        // Process network queue
        this.processNetworkQueue();
    }
    
    /**
     * Remove a projectile from active list
     */
    removeProjectile(id) {
        const projectile = this.activeProjectiles.get(id);
        if (projectile) {
            // Update hit statistics
            if (projectile.hasHit) {
                this.stats.totalHits++;
                this.updateHitRate();
                
                // Send hit notification to server
                this.sendProjectileHitToServer(projectile);
            }
            
            // Dispose resources
            projectile.dispose();
            
            // Remove from active list
            this.activeProjectiles.delete(id);
            
            // Remove from network updates
            this.projectileUpdates.delete(id);
            
            // Update statistics
            this.stats.activeCount = this.activeProjectiles.size;
            
            if (this.config.debugMode) {
                console.log(`Removed projectile ${id}, active: ${this.stats.activeCount}`);
            }
        }
    }
    
    /**
     * Perform periodic cleanup of old projectiles
     */
    performPeriodicCleanup() {
        const currentTime = performance.now() / 1000;
        
        if (currentTime - this.lastCleanupTime >= this.config.cleanupInterval) {
            this.lastCleanupTime = currentTime;
            
            const projectilesToRemove = [];
            
            for (const [id, projectile] of this.activeProjectiles) {
                const age = currentTime - projectile.createdTime;
                
                if (age >= this.config.maxAge) {
                    projectilesToRemove.push(id);
                }
            }
            
            // Remove old projectiles
            for (const id of projectilesToRemove) {
                this.removeProjectile(id);
            }
            
            if (projectilesToRemove.length > 0 && this.config.debugMode) {
                console.log(`Cleaned up ${projectilesToRemove.length} old projectiles`);
            }
        }
    }
    
    /**
     * Update hit rate calculation
     */
    updateHitRate() {
        if (this.stats.totalFired > 0) {
            this.stats.hitRate = (this.stats.totalHits / this.stats.totalFired) * 100;
        }
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            pendingCount: this.pendingProjectiles.size,
            networkQueueSize: this.networkQueue.length,
            isOnline: this.isOnline
        };
    }
    
    /**
     * Get list of active projectiles
     */
    getActiveProjectiles() {
        return Array.from(this.activeProjectiles.values()).map(projectile => ({
            id: projectile.id,
            position: projectile.position.clone(),
            stats: projectile.getStats()
        }));
    }
    
    /**
     * Configure projectile manager settings
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.config.debugMode) {
            console.log('ProjectileManager configuration updated:', this.config);
        }
    }
    
    /**
     * Test function to create a visible projectile
     */
    testProjectile() {
        console.log('ProjectileManager: Creating test projectile...');
        
        const testData = {
            position: new BABYLON.Vector3(0, 5, 0), // Start high up
            direction: new BABYLON.Vector3(0, 0, 1), // Move forward
            speed: 100, // Slow speed for visibility
            damage: 50,
            maxDistance: 1000,
            ownerId: 'test',
            weapon: {
                name: 'Test Weapon',
                type: 'carbine',
                damage: 50
            },
            showTrail: true
        };
        
        const projectileId = this.fireProjectile(testData);
        console.log('ProjectileManager: Test projectile created with ID:', projectileId);
        return projectileId;
    }
    
    /**
     * Setup network event handlers
     */
    setupNetworkHandlers() {
        if (!this.game.networkManager) return;
        
        // Handle projectile hit events from server
        this.game.networkManager.on('projectileHit', (data) => {
            this.handleServerProjectileHit(data);
        });
        
        // Handle projectile creation from server
        this.game.networkManager.on('projectileCreated', (data) => {
            console.log('ProjectileManager: call handleServerProjectileCreated');
            this.handleServerProjectileCreated(data);
        });
        
        // Handle projectile updates from server
        this.game.networkManager.on('projectileUpdated', (data) => {
            this.handleServerProjectileUpdated(data);
        });
        
        // Handle network connection status
        this.game.networkManager.on('connected', () => {
            this.isOnline = true;
            this.flushPendingProjectiles();
        });
        
        this.game.networkManager.on('disconnected', () => {
            this.isOnline = false;
        });
    }
    
    /**
     * Send projectile to server
     */
    sendProjectileToServer(projectileData) {
        if (!this.game.networkManager || !this.isOnline) {
            // Store for later if offline
            this.pendingProjectiles.set(projectileData.id, projectileData);
            return;
        }
        
        const networkData = {
            type: 'projectileFire',
            data: {
                projectileId: projectileData.id,
                position: projectileData.position,
                direction: projectileData.direction,
                speed: projectileData.speed,
                damage: projectileData.damage,
                maxDistance: projectileData.maxDistance,
                weapon: projectileData.weapon,
                timestamp: Date.now()
            }
        };
        
        console.log('ProjectileManager: Sending projectile to server:', networkData);
        this.game.networkManager.emit('projectileFire', networkData);
    }
    
    /**
     * Send projectile updates to server
     */
    sendProjectileUpdates() {
        if (!this.game.networkManager || !this.isOnline) return;
        
        for (const [id, updateInfo] of this.projectileUpdates) {
            const projectile = this.activeProjectiles.get(id);
            if (projectile && projectile.isActive) {
                // Send position update
                const updateData = {
                    type: 'projectileUpdate',
                    data: {
                        projectileId: id,
                        position: {
                            x: projectile.position.x,
                            y: projectile.position.y,
                            z: projectile.position.z
                        },
                        timestamp: Date.now()
                    }
                };
                
                this.game.networkManager.emit('projectileUpdate', updateData);
            }
        }
    }
    
    /**
     * Send projectile hit to server
     */
    sendProjectileHitToServer(projectile) {
        if (!this.game.networkManager || !this.isOnline) return;
        
        const hitData = {
            type: 'projectileHit',
            data: {
                projectileId: projectile.id,
                hitPosition: projectile.hitPosition ? {
                    x: projectile.hitPosition.x,
                    y: projectile.hitPosition.y,
                    z: projectile.hitPosition.z
                } : null,
                hitObject: projectile.hitObject || null,
                timestamp: Date.now()
            }
        };
        
        this.game.networkManager.emit('projectileHit', hitData);
    }
    
    /**
     * Handle projectile hit from server
     */
    handleServerProjectileHit(data) {
        const projectile = this.activeProjectiles.get(data.projectileId);
        if (projectile) {
            // Server confirmed hit, mark projectile as hit
            projectile.hasHit = true;
            projectile.isActive = false;
        }
    }
    
    /**
     * Handle projectile creation from server (other players)
     */
    handleServerProjectileCreated(data) {
        console.log('ProjectileManager: handleServerProjectileCreated called with data:', data);
        
        // Create projectile from other player
        const projectileData = {
            id: data.projectileId,
            position: new BABYLON.Vector3(data.position.x, data.position.y, data.position.z),
            direction: new BABYLON.Vector3(data.direction.x, data.direction.y, data.direction.z),
            speed: data.speed,
            damage: data.damage,
            maxDistance: data.maxDistance,
            weapon: data.weapon,
            ownerId: data.ownerId,
            showTrail: false // Don't show trails for other players' projectiles
        };
        
        console.log('ProjectileManager: Handling server projectile created:', projectileData);
        this.fireProjectile(projectileData, true); // Pass true for isRemote
    }
    
    /**
     * Handle projectile updates from server (other players)
     */
    handleServerProjectileUpdated(data) {
        const projectile = this.activeProjectiles.get(data.projectileId);
        if (projectile) {
            // Update position from server data
            projectile.position.set(data.position.x, data.position.y, data.position.z);
            
            // Update mesh position if it exists
            if (projectile.mesh) {
                projectile.mesh.position.copyFrom(projectile.position);
            }
        }
    }
    
    /**
     * Flush pending projectiles when coming online
     */
    flushPendingProjectiles() {
        for (const [id, data] of this.pendingProjectiles) {
            this.sendProjectileToServer(data);
        }
        this.pendingProjectiles.clear();
    }
    
    /**
     * Process network queue
     */
    processNetworkQueue() {
        if (this.networkQueue.length === 0) return;
        
        const currentTime = performance.now();
        const processed = [];
        
        for (const item of this.networkQueue) {
            if (currentTime - item.timestamp > this.config.networkTimeout) {
                // Timeout, remove from queue
                processed.push(item);
                continue;
            }
            
            if (this.isOnline) {
                // Try to send again
                this.game.networkManager.emit(item.data.type, item.data);
                processed.push(item);
            }
        }
        
        // Remove processed items
        for (const item of processed) {
            const index = this.networkQueue.indexOf(item);
            if (index > -1) {
                this.networkQueue.splice(index, 1);
            }
        }
    }
    
    /**
     * Setup cleanup timer
     */
    setupCleanupTimer() {
        // Cleanup is handled in the update loop
        // This method is for future expansion if needed
    }
    
    /**
     * Clear all projectiles (for level reset, etc.)
     */
    clearAllProjectiles() {
        const count = this.activeProjectiles.size;
        
        for (const [id, projectile] of this.activeProjectiles) {
            projectile.dispose();
        }
        
        this.activeProjectiles.clear();
        this.stats.activeCount = 0;
        
        if (this.config.debugMode) {
            console.log(`Cleared ${count} projectiles`);
        }
    }
    
    /**
     * Get projectile by ID
     */
    getProjectile(id) {
        return this.activeProjectiles.get(id);
    }
    
    /**
     * Check if projectile exists
     */
    hasProjectile(id) {
        return this.activeProjectiles.has(id);
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            activeProjectiles: this.activeProjectiles.size,
            totalFired: this.stats.totalFired,
            totalHits: this.stats.totalHits,
            hitRate: this.stats.hitRate,
            memoryUsage: this.activeProjectiles.size * 1024, // Rough estimate
            networkQueueSize: this.networkQueue.length,
            pendingProjectiles: this.pendingProjectiles.size
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Clear all projectiles
        this.clearAllProjectiles();
        
        // Clear network queue
        this.networkQueue = [];
        this.pendingProjectiles.clear();
        
        // Remove network handlers
        if (this.game.networkManager) {
            this.game.networkManager.off('projectileHit');
            this.game.networkManager.off('projectileCreated');
            this.game.networkManager.off('projectileUpdated'); // Added this line
            this.game.networkManager.off('connected');
            this.game.networkManager.off('disconnected');
        }
        
        // Clear references
        this.game = null;
        this.scene = null;
        
        console.log('ProjectileManager disposed');
    }
} 