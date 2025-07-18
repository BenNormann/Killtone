/**
 * KILLtONE Game Framework - Particle Manager
 * Manages particle systems with pooling and optimization for visual effects
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from '../mainConfig.js';

export class ParticleManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.engine = game.engine;
        
        // Particle system pools
        this.particleSystemPools = new Map();
        this.activeParticleSystems = new Set();
        this.particleSystemTemplates = new Map();
        
        // Performance tracking
        this.maxActiveParticles = 1000;
        this.currentActiveParticles = 0;
        this.performanceLevel = GameConfig.graphics.particleQuality;
        
        // Effect templates
        this.effectTemplates = new Map();
        
        // Cleanup tracking
        this.cleanupInterval = null;
        this.lastCleanupTime = 0;
        
        console.log('ParticleManager initialized');
    }

    /**
     * Initialize the particle manager and create effect templates
     */
    async initialize() {
        try {
            console.log('ParticleManager: Initializing particle system templates...');
            
            // Create common effect templates
            this.createEffectTemplates();
            
            // Set up performance monitoring
            this.setupPerformanceMonitoring();
            
            // Start cleanup interval
            this.startCleanupInterval();
            
            console.log('ParticleManager: Initialization complete');
            return true;
        } catch (error) {
            console.error('ParticleManager: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Create common particle effect templates
     */
    createEffectTemplates() {
        // Blood splatter effect template
        this.effectTemplates.set('bloodSplatter', {
            name: 'bloodSplatter',
            particleCount: 50,
            emitRate: 200,
            lifetime: { min: 0.5, max: 1.5 },
            size: { min: 0.1, max: 0.3 },
            color1: new BABYLON.Color4(0.8, 0.1, 0.1, 1.0), // Dark red
            color2: new BABYLON.Color4(0.6, 0.0, 0.0, 1.0), // Darker red
            colorDead: new BABYLON.Color4(0.3, 0.0, 0.0, 0.0), // Fade to transparent
            gravity: new BABYLON.Vector3(0, -9.81, 0),
            direction1: new BABYLON.Vector3(-1, 0, -1),
            direction2: new BABYLON.Vector3(1, 2, 1),
            minEmitPower: 1,
            maxEmitPower: 3,
            blendMode: BABYLON.ParticleSystem.BLENDMODE_STANDARD,
            textureUrl: null // Will use default particle texture
        });

        // Hit spark effect template
        this.effectTemplates.set('hitSpark', {
            name: 'hitSpark',
            particleCount: 20,
            emitRate: 100,
            lifetime: { min: 0.2, max: 0.8 },
            size: { min: 0.05, max: 0.15 },
            color1: new BABYLON.Color4(1.0, 0.8, 0.2, 1.0), // Bright yellow
            color2: new BABYLON.Color4(1.0, 0.4, 0.0, 1.0), // Orange
            colorDead: new BABYLON.Color4(0.5, 0.2, 0.0, 0.0), // Fade to transparent
            gravity: new BABYLON.Vector3(0, -5, 0),
            direction1: new BABYLON.Vector3(-1, 0, -1),
            direction2: new BABYLON.Vector3(1, 1, 1),
            minEmitPower: 1,
            maxEmitPower: 3,
            blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
            textureUrl: null
        });

        // Explosion effect template
        this.effectTemplates.set('explosion', {
            name: 'explosion',
            particleCount: 100,
            emitRate: 500,
            lifetime: { min: 1.0, max: 3.0 },
            size: { min: 0.3, max: 1.0 },
            color1: new BABYLON.Color4(1.0, 0.5, 0.0, 1.0), // Orange
            color2: new BABYLON.Color4(0.8, 0.2, 0.0, 1.0), // Red-orange
            colorDead: new BABYLON.Color4(0.2, 0.1, 0.1, 0.0), // Dark fade
            gravity: new BABYLON.Vector3(0, -2, 0),
            direction1: new BABYLON.Vector3(-2, -1, -2),
            direction2: new BABYLON.Vector3(2, 3, 2),
            minEmitPower: 3,
            maxEmitPower: 8,
            blendMode: BABYLON.ParticleSystem.BLENDMODE_ADD,
            textureUrl: null
        });

        console.log(`ParticleManager: Created ${this.effectTemplates.size} effect templates`);
    }

    /**
     * Create a particle system from a template
     */
    createParticleSystem(templateName, position, options = {}) {
        const template = this.effectTemplates.get(templateName);
        if (!template) {
            console.warn(`ParticleManager: Template '${templateName}' not found`);
            return null;
        }

        try {
            // Check performance limits
            if (this.currentActiveParticles >= this.maxActiveParticles) {
                console.warn('ParticleManager: Maximum active particles reached, skipping effect');
                return null;
            }

            // Try to get from pool first
            let particleSystem = this.getFromPool(templateName);
            
            if (!particleSystem) {
                // Create new particle system
                particleSystem = this.createNewParticleSystem(template, templateName);
                if (!particleSystem) {
                    return null;
                }
            }

            // Configure the particle system
            this.configureParticleSystem(particleSystem, template, position, options);
            
            // Track active system
            this.activeParticleSystems.add(particleSystem);
            this.currentActiveParticles += template.particleCount;
            
            // Start the particle system
            particleSystem.start();
            
            // Set up auto-cleanup
            this.setupAutoCleanup(particleSystem, template);
            
            return particleSystem;
            
        } catch (error) {
            console.error(`ParticleManager: Error creating particle system '${templateName}':`, error);
            return null;
        }
    }

    /**
     * Create a new particle system from template
     */
    createNewParticleSystem(template, templateName) {
        try {
            const particleSystem = new BABYLON.ParticleSystem(
                `${templateName}_${Date.now()}`,
                template.particleCount,
                this.scene
            );

            // Set basic properties
            particleSystem.particleTexture = this.getParticleTexture(template.textureUrl);
            particleSystem.emitRate = template.emitRate;
            
            // Lifetime
            particleSystem.minLifeTime = template.lifetime.min;
            particleSystem.maxLifeTime = template.lifetime.max;
            
            // Size
            particleSystem.minSize = template.size.min;
            particleSystem.maxSize = template.size.max;
            
            // Colors
            particleSystem.color1 = template.color1;
            particleSystem.color2 = template.color2;
            particleSystem.colorDead = template.colorDead;
            
            // Physics
            particleSystem.gravity = template.gravity;
            particleSystem.direction1 = template.direction1;
            particleSystem.direction2 = template.direction2;
            particleSystem.minEmitPower = template.minEmitPower;
            particleSystem.maxEmitPower = template.maxEmitPower;
            
            // Blend mode
            particleSystem.blendMode = template.blendMode;
            
            // Performance optimizations
            particleSystem.updateSpeed = 0.01;
            particleSystem.targetStopDuration = 0.5;
            
            // Store template reference
            particleSystem._templateName = templateName;
            
            return particleSystem;
            
        } catch (error) {
            console.error('ParticleManager: Error creating new particle system:', error);
            return null;
        }
    }

    /**
     * Configure particle system with position and options
     */
    configureParticleSystem(particleSystem, template, position, options) {
        // Set position
        if (position) {
            particleSystem.emitter = position;
        }
        
        // Apply options overrides
        if (options.scale) {
            particleSystem.minSize *= options.scale;
            particleSystem.maxSize *= options.scale;
        }
        
        if (options.intensity) {
            particleSystem.emitRate *= options.intensity;
        }
        
        if (options.direction) {
            particleSystem.direction1 = options.direction.clone().scale(0.8);
            particleSystem.direction2 = options.direction.clone().scale(1.2);
        }
        
        if (options.color) {
            particleSystem.color1 = options.color;
            particleSystem.color2 = options.color.clone().scale(0.8);
        }
        
        if (options.lifetime) {
            particleSystem.minLifeTime = options.lifetime.min || template.lifetime.min;
            particleSystem.maxLifeTime = options.lifetime.max || template.lifetime.max;
        }
    }

    /**
     * Get particle texture (default or custom)
     */
    getParticleTexture(textureUrl) {
        if (textureUrl) {
            return new BABYLON.Texture(textureUrl, this.scene);
        }
        
        // Create default particle texture if not cached
        if (!this.defaultParticleTexture) {
            this.defaultParticleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
        }
        
        return this.defaultParticleTexture;
    }

    /**
     * Get particle system from pool
     */
    getFromPool(templateName) {
        const pool = this.particleSystemPools.get(templateName);
        if (pool && pool.length > 0) {
            const particleSystem = pool.pop();
            // Reset the system
            particleSystem.reset();
            return particleSystem;
        }
        return null;
    }

    /**
     * Return particle system to pool
     */
    returnToPool(particleSystem) {
        if (!particleSystem || !particleSystem._templateName) {
            return;
        }
        
        const templateName = particleSystem._templateName;
        
        // Stop the system
        particleSystem.stop();
        
        // Remove from active tracking
        this.activeParticleSystems.delete(particleSystem);
        
        // Update particle count
        const template = this.effectTemplates.get(templateName);
        if (template) {
            this.currentActiveParticles -= template.particleCount;
        }
        
        // Add to pool
        if (!this.particleSystemPools.has(templateName)) {
            this.particleSystemPools.set(templateName, []);
        }
        
        const pool = this.particleSystemPools.get(templateName);
        if (pool.length < 10) { // Limit pool size
            pool.push(particleSystem);
        } else {
            // Dispose if pool is full
            particleSystem.dispose();
        }
    }

    /**
     * Setup auto-cleanup for particle system
     */
    setupAutoCleanup(particleSystem, template) {
        // Calculate cleanup time based on lifetime
        const cleanupTime = (template.lifetime.max + 1) * 1000; // Add 1 second buffer
        
        setTimeout(() => {
            if (this.activeParticleSystems.has(particleSystem)) {
                this.returnToPool(particleSystem);
            }
        }, cleanupTime);
    }

    /**
     * Create blood splatter effect
     */
    createBloodSplatter(position, direction = null, intensity = 1.0) {
        const options = {
            intensity: intensity,
            scale: intensity
        };
        
        if (direction) {
            options.direction = direction;
        }
        
        return this.createParticleSystem('bloodSplatter', position, options);
    }

    /**
     * Create hit spark effect
     */
    createHitSpark(position, normal = null) {
        const options = {};
        
        if (normal) {
            // Reflect sparks off the surface
            options.direction = normal.clone().scale(-1);
        }
        
        return this.createParticleSystem('hitSpark', position, options);
    }

    /**
     * Create explosion effect
     */
    createExplosion(position, scale = 1.0) {
        const options = {
            scale: scale,
            intensity: scale
        };
        
        return this.createParticleSystem('explosion', position, options);
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Adjust max particles based on performance level
        switch (this.performanceLevel) {
            case 'low':
                this.maxActiveParticles = 200;
                break;
            case 'medium':
                this.maxActiveParticles = 500;
                break;
            case 'high':
                this.maxActiveParticles = 1000;
                break;
            case 'ultra':
                this.maxActiveParticles = 2000;
                break;
            default:
                this.maxActiveParticles = 1000;
        }
        
        console.log(`ParticleManager: Performance level '${this.performanceLevel}', max particles: ${this.maxActiveParticles}`);
    }

    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 5000); // Cleanup every 5 seconds
    }

    /**
     * Perform cleanup of inactive particle systems
     */
    performCleanup() {
        const currentTime = Date.now();
        const systemsToCleanup = [];
        
        // Find systems that should be cleaned up
        this.activeParticleSystems.forEach(particleSystem => {
            if (!particleSystem.isAlive() || particleSystem.isStopped()) {
                systemsToCleanup.push(particleSystem);
            }
        });
        
        // Clean up inactive systems
        systemsToCleanup.forEach(particleSystem => {
            this.returnToPool(particleSystem);
        });
        
        if (systemsToCleanup.length > 0) {
            console.log(`ParticleManager: Cleaned up ${systemsToCleanup.length} inactive particle systems`);
        }
        
        this.lastCleanupTime = currentTime;
    }

    /**
     * Update particle manager (called from game loop)
     */
    update(deltaTime) {
        // Performance monitoring could go here
        // For now, the cleanup interval handles maintenance
    }

    /**
     * Stop all particle systems
     */
    stopAllParticles() {
        console.log('ParticleManager: Stopping all particle systems');
        
        this.activeParticleSystems.forEach(particleSystem => {
            if (particleSystem && !particleSystem.isStopped()) {
                particleSystem.stop();
            }
        });
    }

    /**
     * Dispose of the particle manager
     */
    dispose() {
        console.log('ParticleManager: Disposing...');
        
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Stop all active particle systems
        this.stopAllParticles();
        
        // Dispose all active systems
        this.activeParticleSystems.forEach(particleSystem => {
            if (particleSystem && particleSystem.dispose) {
                particleSystem.dispose();
            }
        });
        this.activeParticleSystems.clear();
        
        // Dispose pooled systems
        this.particleSystemPools.forEach(pool => {
            pool.forEach(particleSystem => {
                if (particleSystem && particleSystem.dispose) {
                    particleSystem.dispose();
                }
            });
        });
        this.particleSystemPools.clear();
        
        // Dispose default texture
        if (this.defaultParticleTexture) {
            this.defaultParticleTexture.dispose();
            this.defaultParticleTexture = null;
        }
        
        // Clear templates
        this.effectTemplates.clear();
        this.particleSystemTemplates.clear();
        
        console.log('ParticleManager: Disposed successfully');
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            activeParticles: this.currentActiveParticles,
            maxParticles: this.maxActiveParticles,
            activeSystemsCount: this.activeParticleSystems.size,
            pooledSystemsCount: Array.from(this.particleSystemPools.values())
                .reduce((total, pool) => total + pool.length, 0),
            performanceLevel: this.performanceLevel
        };
    }
}

export default ParticleManager;