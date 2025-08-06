/**
 * KILLtONE Game Framework - Physics Manager
 * Main physics system coordinator with Babylon.js integration
 */

import { GameConfig } from '../mainConfig.js';
import { CommonUtils } from '../utils/CommonUtils.js';
import { RaycastManager } from './RaycastManager.js';

export class PhysicsManager {
    constructor(scene) {
        this.scene = scene;
        this.physicsEngine = null;
        this.physicsPlugin = null;
        this.isInitialized = false;
        this.collisionLayers = GameConfig.physics.collisionLayers;
        this.debugRenderer = null;
        this.raycastManager = null;
        
        // Physics bodies registry
        this.physicsBodies = new Map();
        this.collisionCallbacks = new Map();
        
        // Performance tracking
        this.lastStepTime = 0;
        this.averageStepTime = 0;
        this.stepCount = 0;
    }

    /**
     * Initialize the physics world with the configured engine
     */
    async initialize() {
        try {
            const config = GameConfig.physics;
            
            // Initialize physics plugin based on configuration
            if (config.engine === 'cannon') {
                await this.initializeCannonJS();
            } else if (config.engine === 'ammo') {
                await this.initializeAmmoJS();
            } else {
                throw new Error(`Unsupported physics engine: ${config.engine}`);
            }

            // Only enable physics if we have a valid plugin
            if (this.physicsPlugin) {
                // Check if enablePhysics method exists on scene
                if (typeof this.scene.enablePhysics === 'function') {
                    // Enable physics on the scene
                    this.scene.enablePhysics(
                        new BABYLON.Vector3(0, config.gravity, 0),
                        this.physicsPlugin
                    );
                } else {
                    // Alternative approach for newer Babylon.js versions
                    this.scene.physicsEnabled = true;
                    this.scene._physicsEngine = this.physicsPlugin;
                    console.log('Physics enabled using alternative method');
                }
            } else {
                console.warn('Physics plugin not available, running without physics');
                this.isInitialized = true;
                return;
            }

            // Initialize raycast manager
            this.raycastManager = new RaycastManager(this.scene, this);

            // Set up collision detection
            this.setupCollisionDetection();

            // Initialize debug renderer if enabled
            if (config.enableDebugRenderer || GameConfig.debug.showPhysics) {
                this.initializeDebugRenderer();
            }

            this.isInitialized = true;
            console.log(`PhysicsManager initialized with ${config.engine} engine`);
            
        } catch (error) {
            console.error('Failed to initialize PhysicsManager:', error);
            throw error;
        }
    }

    /**
     * Initialize CannonJS physics plugin
     */
    async initializeCannonJS() {
        // Check if CANNON UMD is available
        if (typeof CANNON === 'undefined') {
            console.warn('CANNON library not found. Skipping physics initialization.');
            return;
        }

        // Create CannonJS plugin with UMD version
        this.physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
        
        // Configure CannonJS world settings
        const world = this.physicsPlugin.world;
        if (world) {
            world.broadphase = new CANNON.NaiveBroadphase();
            world.solver.iterations = 10;
            world.defaultContactMaterial.friction = 0.4;
            world.defaultContactMaterial.restitution = 0.3;
        }
        
        console.log('CannonJS physics plugin initialized');
    }

    /**
     * Initialize AmmoJS physics plugin
     */
    async initializeAmmoJS() {
        // Check if AmmoJS is available
        if (typeof Ammo === 'undefined') {
            console.warn('AmmoJS library not found. Skipping physics initialization.');
            return;
        }

        // Wait for Ammo to be ready
        await Ammo();
        
        this.physicsPlugin = new BABYLON.AmmoJSPlugin(true);
        console.log('AmmoJS physics plugin initialized');
    }

    /**
     * Set up collision detection and callbacks
     */
    setupCollisionDetection() {
        // Check if physics observables are available
        if (this.scene.onBeforePhysicsObservable && this.scene.onAfterPhysicsObservable) {
            // Register collision event handlers using observables
            this.scene.onBeforePhysicsObservable.add(() => {
                this.beforePhysicsStep();
            });

            this.scene.onAfterPhysicsObservable.add(() => {
                this.afterPhysicsStep();
            });
        } else {
            // Alternative approach - use render loop integration
            console.log('Physics observables not available, using alternative collision detection setup');
            
            // We'll handle physics updates in the main game loop instead
            // This is a fallback for when the scene doesn't have physics observables
            this.useManualPhysicsUpdates = true;
        }
    }

    /**
     * Initialize debug renderer for physics visualization
     */
    initializeDebugRenderer() {
        if (this.physicsPlugin && this.physicsPlugin.world) {
            // For CannonJS
            if (GameConfig.physics.engine === 'cannon') {
                this.debugRenderer = new BABYLON.CannonJSPlugin.CreateCannonDebugMesh(
                    this.scene,
                    this.physicsPlugin.world
                );
            }
            // For AmmoJS, debug rendering is handled differently
            else if (GameConfig.physics.engine === 'ammo') {
                // AmmoJS debug rendering would be implemented here if needed
                console.log('AmmoJS debug rendering not implemented yet');
            }
        }
    }

    /**
     * Register a physics body with collision layer
     */
    registerPhysicsBody(mesh, layer = this.collisionLayers.ENVIRONMENT, options = {}) {
        if (!this.isInitialized) {
            console.warn('PhysicsManager not initialized, cannot register physics body');
            return null;
        }

        const defaultOptions = {
            mass: 0,
            restitution: 0.3,
            friction: 0.4,
            ...options
        };

        // Create physics impostor
        const impostor = new BABYLON.PhysicsImpostor(
            mesh,
            defaultOptions.shape || BABYLON.PhysicsImpostor.BoxImpostor,
            defaultOptions,
            this.scene
        );

        // Set collision layer
        this.setCollisionLayer(impostor, layer);

        // Register in our tracking system
        const bodyId = this.generateBodyId();
        this.physicsBodies.set(bodyId, {
            mesh,
            impostor,
            layer,
            options: defaultOptions
        });

        return bodyId;
    }

    /**
     * Set collision layer for a physics impostor
     */
    setCollisionLayer(impostor, layer) {
        if (impostor && impostor.physicsBody) {
            // Set collision group and mask based on layer
            const collisionGroup = layer;
            let collisionMask = 0;

            // Define which layers can collide with each other
            switch (layer) {
                case this.collisionLayers.PLAYER:
                    collisionMask = this.collisionLayers.ENVIRONMENT | 
                                   this.collisionLayers.PICKUP | 
                                   this.collisionLayers.TRIGGER;
                    break;
                case this.collisionLayers.PROJECTILE:
                    collisionMask = this.collisionLayers.PLAYER | 
                                   this.collisionLayers.ENVIRONMENT;
                    break;
                case this.collisionLayers.ENVIRONMENT:
                    collisionMask = this.collisionLayers.PLAYER | 
                                   this.collisionLayers.PROJECTILE;
                    break;
                case this.collisionLayers.PICKUP:
                    collisionMask = this.collisionLayers.PLAYER;
                    break;
                case this.collisionLayers.TRIGGER:
                    collisionMask = this.collisionLayers.PLAYER;
                    break;
                default:
                    collisionMask = 0xFFFFFFFF; // Collide with everything
            }

            // Apply collision filtering based on physics engine
            if (GameConfig.physics.engine === 'cannon') {
                impostor.physicsBody.collisionFilterGroup = collisionGroup;
                impostor.physicsBody.collisionFilterMask = collisionMask;
            } else if (GameConfig.physics.engine === 'ammo') {
                // AmmoJS collision filtering would be implemented here
                console.log('AmmoJS collision filtering not implemented yet');
            }
        }
    }

    /**
     * Register collision callback for specific body interactions
     */
    registerCollisionCallback(bodyId1, bodyId2, callback) {
        const key = `${bodyId1}-${bodyId2}`;
        this.collisionCallbacks.set(key, callback);
        
        // Also register the reverse combination
        const reverseKey = `${bodyId2}-${bodyId1}`;
        this.collisionCallbacks.set(reverseKey, callback);
    }

    /**
     * Remove physics body from the system
     */
    removePhysicsBody(bodyId) {
        const body = this.physicsBodies.get(bodyId);
        if (body) {
            // Dispose of the physics impostor
            if (body.impostor) {
                body.impostor.dispose();
            }
            
            // Remove from tracking
            this.physicsBodies.delete(bodyId);
        }
    }

    /**
     * Update physics world (called before physics step)
     */
    beforePhysicsStep() {
        this.lastStepTime = performance.now();
        
        // Update any dynamic physics properties here
        // This is called before each physics simulation step
    }

    /**
     * Handle post-physics updates (called after physics step)
     */
    afterPhysicsStep() {
        const stepTime = performance.now() - this.lastStepTime;
        this.updatePerformanceMetrics(stepTime);
        
        // Handle collision callbacks
        this.processCollisions();
        
        // Update debug renderer if enabled
        if (this.debugRenderer && GameConfig.debug.showPhysics) {
            this.debugRenderer.update();
        }
    }

    /**
     * Process collision events and trigger callbacks
     */
    processCollisions() {
        // This would be implemented based on the specific physics engine
        // For now, we'll set up the framework for collision processing
        
        // Collision detection would be handled by the physics engine
        // and we would process the results here
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(stepTime) {
        this.stepCount++;
        this.averageStepTime = (this.averageStepTime * (this.stepCount - 1) + stepTime) / this.stepCount;
        
        // Reset metrics periodically to prevent overflow
        if (this.stepCount > 1000) {
            this.stepCount = 100;
            this.averageStepTime = stepTime;
        }
    }

    /**
     * Manual update method for physics when observables aren't available
     * This should be called from the main game loop
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.useManualPhysicsUpdates) {
            return;
        }

        // Manual physics step handling
        this.beforePhysicsStep();
        
        // The physics engine will handle the actual simulation
        // We just need to handle our custom logic
        
        this.afterPhysicsStep();
    }

    /**
     * Get physics performance metrics
     */
    getPerformanceMetrics() {
        return {
            averageStepTime: this.averageStepTime,
            lastStepTime: this.lastStepTime,
            activeBodies: this.physicsBodies.size,
            isInitialized: this.isInitialized,
            useManualUpdates: this.useManualPhysicsUpdates || false
        };
    }

    /**
     * Generate unique body ID
     */
    generateBodyId() {
        return CommonUtils.generatePhysicsBodyId();
    }

    /**
     * Enable/disable debug rendering
     */
    setDebugRendering(enabled) {
        if (this.debugRenderer) {
            this.debugRenderer.isEnabled = enabled;
        }
    }

    /**
     * Get physics world reference (for advanced usage)
     */
    getPhysicsWorld() {
        return this.physicsPlugin ? this.physicsPlugin.world : null;
    }

    /**
     * Dispose of the physics manager and clean up resources
     */
    dispose() {
        // Dispose all physics bodies
        for (const [bodyId, body] of this.physicsBodies) {
            if (body.impostor) {
                body.impostor.dispose();
            }
        }
        this.physicsBodies.clear();
        
        // Clear collision callbacks
        this.collisionCallbacks.clear();
        
        // Dispose debug renderer
        if (this.debugRenderer) {
            this.debugRenderer.dispose();
            this.debugRenderer = null;
        }
        
        // Disable physics on scene
        if (this.scene && this.isInitialized) {
            this.scene.disablePhysicsEngine();
        }
        
        this.isInitialized = false;
        console.log('PhysicsManager disposed');
    }
}
