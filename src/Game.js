/**
 * KILLtONE Game Framework - Main Game Orchestrator
 * Entry point and central coordinator for all game systems
 */

import * as BABYLON from '@babylonjs/core';
import GameConfig from './mainConfig.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        
        // Game state
        this.isInitialized = false;
        this.isRunning = false;
        this.deltaTime = 0;
        this.lastFrameTime = 0;
        
        // Manager instances (will be initialized later in phases)
        this.stateManager = null;
        this.assetManager = null;
        this.audioManager = null; // Existing system
        this.uiManager = null;
        this.inputManager = null;
        this.playerManager = null;
        this.mapManager = null;
        this.flowstateManager = null; // Existing system
        this.networkManager = null;
        this.performanceMonitor = null;
        
        // Bind methods to maintain context
        this.update = this.update.bind(this);
        this.render = this.render.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onError = this.onError.bind(this);
    }

    /**
     * Initialize the game engine and core systems
     */
    async initialize() {
        try {
            console.log('KILLtONE Framework: Initializing...');
            
            // Initialize Babylon.js engine
            await this.initializeEngine();
            
            // Create the main scene
            await this.initializeScene();
            
            // Set up error handling
            this.setupErrorHandling();
            
            // Set up window event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('KILLtONE Framework: Core initialization complete');
            
            return true;
        } catch (error) {
            console.error('KILLtONE Framework: Initialization failed:', error);
            this.onError(error);
            return false;
        }
    }

    /**
     * Initialize Babylon.js engine with configuration
     */
    async initializeEngine() {
        console.log('Initializing Babylon.js engine...');
        
        // Create engine with configuration
        this.engine = new BABYLON.Engine(this.canvas, GameConfig.graphics.antialiasing, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: GameConfig.graphics.antialiasing,
            alpha: false,
            premultipliedAlpha: false,
            powerPreference: "high-performance"
        });

        // Configure engine settings
        this.engine.setHardwareScalingLevel(this.getScalingLevel());
        
        // Enable WebGL extensions if available
        if (this.engine.getCaps().textureFloat) {
            console.log('Float textures supported');
        }
        
        if (this.engine.getCaps().textureHalfFloat) {
            console.log('Half-float textures supported');
        }

        console.log('Babylon.js engine initialized successfully');
    }

    /**
     * Initialize the main Babylon.js scene
     */
    async initializeScene() {
        console.log('Creating main scene...');
        
        // Create scene
        this.scene = new BABYLON.Scene(this.engine);
        
        // Configure scene settings
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        
        // Set up basic lighting (will be enhanced by specific systems later)
        const hemisphericLight = new BABYLON.HemisphericLight(
            "hemisphericLight", 
            new BABYLON.Vector3(0, 1, 0), 
            this.scene
        );
        hemisphericLight.intensity = 0.7;
        
        // Create temporary camera (will be replaced by Player system)
        this.camera = new BABYLON.FreeCamera(
            "tempCamera", 
            new BABYLON.Vector3(0, 5, -10), 
            this.scene
        );
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.attachToCanvas(this.canvas, true);
        
        // Configure camera settings
        this.camera.fov = BABYLON.Tools.ToRadians(GameConfig.graphics.fov);
        this.camera.minZ = 0.1;
        this.camera.maxZ = GameConfig.performance.cullingDistance;
        
        console.log('Main scene created successfully');
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Babylon.js error handling
        this.engine.onContextLostObservable.add(() => {
            console.warn('WebGL context lost');
        });

        this.engine.onContextRestoredObservable.add(() => {
            console.log('WebGL context restored');
        });

        // Global error handlers
        window.addEventListener('error', this.onError);
        window.addEventListener('unhandledrejection', this.onError);
    }

    /**
     * Set up window event listeners
     */
    setupEventListeners() {
        // Window resize handling
        window.addEventListener('resize', this.onResize);
        
        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }

    /**
     * Start the game loop
     */
    start() {
        if (!this.isInitialized) {
            console.error('Cannot start game: not initialized');
            return false;
        }

        console.log('Starting game loop...');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        
        // Start the render loop
        this.engine.runRenderLoop(this.update);
        
        return true;
    }

    /**
     * Main game update loop
     */
    update() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        try {
            // Update all managers (will be implemented in later phases)
            this.updateManagers(this.deltaTime);
            
            // Render the scene
            this.render();
            
        } catch (error) {
            console.error('Error in game loop:', error);
            this.onError(error);
        }
    }

    /**
     * Update all game managers
     */
    updateManagers(deltaTime) {
        // Performance monitoring
        if (this.performanceMonitor) {
            this.performanceMonitor.update(deltaTime);
        }

        // State management
        if (this.stateManager) {
            this.stateManager.update(deltaTime);
        }

        // Input handling
        if (this.inputManager) {
            this.inputManager.update(deltaTime);
        }

        // Player updates
        if (this.playerManager) {
            this.playerManager.update(deltaTime);
        }

        // Audio updates
        if (this.audioManager) {
            this.audioManager.update(deltaTime);
        }

        // Effects updates
        if (this.flowstateManager) {
            this.flowstateManager.update(deltaTime);
        }

        // Network updates
        if (this.networkManager) {
            this.networkManager.update(deltaTime);
        }
    }

    /**
     * Render the scene
     */
    render() {
        if (this.scene && this.scene.activeCamera) {
            this.scene.render();
        }
    }

    /**
     * Pause the game
     */
    pause() {
        console.log('Game paused');
        this.isRunning = false;
        
        // Pause audio
        if (this.audioManager && this.audioManager.pause) {
            this.audioManager.pause();
        }
    }

    /**
     * Resume the game
     */
    resume() {
        console.log('Game resumed');
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        
        // Resume audio
        if (this.audioManager && this.audioManager.resume) {
            this.audioManager.resume();
        }
    }

    /**
     * Stop the game and cleanup
     */
    stop() {
        console.log('Stopping game...');
        this.isRunning = false;
        
        // Stop render loop
        this.engine.stopRenderLoop();
        
        // Cleanup managers
        this.disposeManagers();
        
        console.log('Game stopped');
    }

    /**
     * Dispose of all managers and resources
     */
    disposeManagers() {
        const managers = [
            'networkManager',
            'flowstateManager', 
            'audioManager',
            'playerManager',
            'inputManager',
            'uiManager',
            'assetManager',
            'stateManager',
            'performanceMonitor'
        ];

        managers.forEach(managerName => {
            if (this[managerName] && typeof this[managerName].dispose === 'function') {
                try {
                    this[managerName].dispose();
                    this[managerName] = null;
                } catch (error) {
                    console.error(`Error disposing ${managerName}:`, error);
                }
            }
        });
    }

    /**
     * Complete cleanup and disposal
     */
    dispose() {
        console.log('Disposing game...');
        
        // Stop the game first
        this.stop();
        
        // Remove event listeners
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('error', this.onError);
        window.removeEventListener('unhandledrejection', this.onError);
        
        // Dispose scene and engine
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }
        
        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }
        
        this.canvas = null;
        this.camera = null;
        
        console.log('Game disposed successfully');
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (this.engine) {
            this.engine.resize();
        }
    }

    /**
     * Handle errors
     */
    onError(error) {
        console.error('Game Error:', error);
        
        // In production, you might want to report errors to a service
        if (GameConfig.debug.enabled) {
            // Show error details in debug mode
            console.trace();
        }
        
        // Attempt graceful recovery
        try {
            this.pause();
            // Could show error UI here
        } catch (recoveryError) {
            console.error('Error during error recovery:', recoveryError);
        }
    }

    /**
     * Get hardware scaling level based on performance settings
     */
    getScalingLevel() {
        switch (GameConfig.graphics.quality) {
            case 'low': return 2.0;
            case 'medium': return 1.5;
            case 'high': return 1.0;
            case 'ultra': return 0.8;
            default: return 1.0;
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.engine ? this.engine.getFps() : 0;
    }

    /**
     * Get engine information
     */
    getEngineInfo() {
        if (!this.engine) return null;
        
        return {
            fps: this.engine.getFps(),
            drawCalls: this.engine.getGlInfo().drawCalls,
            textureCollisions: this.engine.getGlInfo().textureCollisions,
            version: this.engine.version
        };
    }
}

export default Game;