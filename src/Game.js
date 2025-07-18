/**
 * KILLtONE Game Framework - Main Game Class
 * Coordinates all game systems and manages the main game loop
 */

import { GameConfig } from './mainConfig.js';
import { StateManager } from './engine/StateManager.js';
import { InputManager } from './engine/InputManager.js';
import { AssetManager } from './engine/AssetManager.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { UIManager } from './engine/UIManager.js';
import { NetworkManager } from './engine/NetworkManager.js';
import { MapManager } from './engine/MapManager.js';
import { ProjectileManager } from './engine/ProjectileManager.js';
import { ParticleManager } from './effects/ParticleManager.js';
import { PhysicsManager } from './physics/PhysicsManager.js';
import { PerformanceMonitor } from './hud/PerformanceMonitor.js';
import { Player } from './entities/Player.js';

export class Game {
    constructor() {
        this.config = GameConfig;

        // Core Babylon.js components
        this.canvas = null;
        this.engine = null;
        this.scene = null;

        // Game managers
        this.stateManager = null;
        this.inputManager = null;
        this.assetManager = null;
        this.audioSystem = null;
        this.uiManager = null;
        this.networkManager = null;
        this.mapManager = null;
        this.projectileManager = null;
        this.particleManager = null;
        this.physicsManager = null;
        this.performanceMonitor = null;

        // Game entities
        this.player = null;

        // Game state
        this.isInitialized = false;
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.deltaTime = 0;

        // Performance tracking
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
    }

    /**
     * Initialize the game engine and core systems
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('Game already initialized');
            return;
        }

        try {
            console.log('Initializing KILLtONE Game Framework...');

            // Initialize Babylon.js engine
            await this.initializeEngine();

            // Initialize scene
            await this.initializeScene();

            // Initialize all managers
            await this.initializeManagers();

            // Setup event listeners
            this.setupEventListeners();

            // Setup error handling
            this.setupErrorHandling();

            this.isInitialized = true;
            console.log('Game initialization complete');

        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }

    /**
     * Initialize Babylon.js engine with configuration
     */
    async initializeEngine() {
        // Get canvas element
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Game canvas not found');
        }

        // Create Babylon.js engine
        this.engine = new BABYLON.Engine(this.canvas, true, {
            antialias: this.config.graphics.antialiasing,
            stencil: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        });

        // Set hardware scaling based on performance settings
        const scalingLevel = this.getScalingLevel();
        this.engine.setHardwareScalingLevel(scalingLevel);

        console.log(`Engine initialized with scaling level: ${scalingLevel}`);
    }

    /**
     * Initialize the main Babylon.js scene
     */
    async initializeScene() {
        // Create scene
        this.scene = new BABYLON.Scene(this.engine);

        // Configure scene settings
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        this.scene.collisionsEnabled = true;
        this.scene.gravity = new BABYLON.Vector3(0, this.config.physics.gravity, 0);

        // Set background color to black for cyber aesthetic
        this.scene.clearColor = new BABYLON.Color3(0, 0, 0);

        // Create camera (required for GUI rendering)
        console.log("Create camera (required for GUI rendering)");
        this.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 5, -10), this.scene);
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.attachControl(this.canvas, true);

        // Create basic lighting
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // Create ground plane for testing
        this.createGroundPlane();

        console.log('Scene initialized with camera');
    }

    /**
     * Create a default ground plane for the game
     */
    createGroundPlane() {
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 100,
            height: 100
        }, this.scene);

        // Create material with cyber aesthetic
        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        groundMaterial.specularColor = new BABYLON.Color3(0.2, 0.0, 0.2);
        ground.material = groundMaterial;

        // Enable collisions
        ground.checkCollisions = true;

        return ground;
    }

    /**
     * Initialize all game managers
     */
    async initializeManagers() {
        console.log('Initializing game managers...');

        // Initialize managers in dependency order
        this.stateManager = new StateManager(this);
        await this.stateManager.initialize();

        this.inputManager = new InputManager(this);
        await this.inputManager.initialize();

        this.assetManager = new AssetManager(this);
        await this.assetManager.initialize();

        this.audioSystem = new AudioSystem(this);
        await this.audioSystem.initialize();

        this.physicsManager = new PhysicsManager(this);
        await this.physicsManager.initialize();

        this.uiManager = new UIManager(this);
        await this.uiManager.initialize();

        this.networkManager = new NetworkManager(this);
        await this.networkManager.initialize();

        this.mapManager = new MapManager(this);
        await this.mapManager.initialize();

        this.projectileManager = new ProjectileManager(this, this.scene);
        await this.projectileManager.initialize();

        this.particleManager = new ParticleManager(this);
        await this.particleManager.initialize();

        this.performanceMonitor = new PerformanceMonitor(this);
        await this.performanceMonitor.initialize();

        console.log('All managers initialized');
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.onError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.onError(event.reason);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onResize());

        // Window focus/blur
        window.addEventListener('blur', () => this.onFocusLost());
        window.addEventListener('focus', () => this.onFocusGained());

        // State change events
        if (this.stateManager) {
            this.stateManager.on('stateChanged', (newState, oldState) => {
                this.onStateChanged(newState, oldState);
            });
        }
    }

    /**
     * Start the game loop
     */
    start() {
        if (!this.isInitialized) {
            throw new Error('Game must be initialized before starting');
        }

        if (this.isRunning) {
            console.warn('Game is already running');
            return;
        }

        console.log('Starting game loop...');

        this.isRunning = true;
        this.lastFrameTime = performance.now();

        // Start render loop
        this.engine.runRenderLoop(() => {
            this.update();
            this.render();
        });

        console.log('Game started');
    }

    /**
     * Main game update loop
     */
    update() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = currentTime;

        // Update FPS counter
        this.updateFPS();

        // Update all managers
        this.updateManagers();

        // Update player if in game
        if (this.player && this.stateManager.getCurrentState() === 'IN_GAME') {
            this.player.update(this.deltaTime);
        }
    }

    /**
     * Update all game managers
     */
    updateManagers() {
        if (this.inputManager) this.inputManager.update(this.deltaTime);
        if (this.audioSystem) this.audioSystem.update(this.deltaTime);
        if (this.physicsManager) this.physicsManager.update(this.deltaTime);
        if (this.projectileManager) this.projectileManager.update(this.deltaTime);
        if (this.particleManager) this.particleManager.update(this.deltaTime);
        if (this.networkManager) this.networkManager.update(this.deltaTime);
        if (this.performanceMonitor) this.performanceMonitor.update(this.deltaTime);
    }

    /**
     * Update FPS counter
     */
    updateFPS() {
        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
    }

    /**
     * Render the scene
     */
    render() {
        if (this.scene && this.isRunning) {
            this.scene.render();
        }
    }

    /**
     * Handle state changes
     */
    onStateChanged(newState, oldState) {
        console.log(`State changed: ${oldState} -> ${newState}`);

        switch (newState) {
            case 'IN_GAME':
                this.initializePlayer();
                this.inputManager.enableGameControls();
                break;

            case 'MAIN_MENU':
            case 'PAUSED':
                this.inputManager.disableGameControls();
                break;

            case 'MAP_EDITOR':
                this.inputManager.enableEditorControls();
                break;
        }
    }

    /**
     * Initialize local player
     */
    async initializePlayer() {
        if (this.player) {
            console.log('Player already initialized');
            return;
        }

        try {
            console.log('Initializing player...');

            this.player = new Player(this);
            await this.player.initialize();

            // Setup player event handlers
            this.setupPlayerEventHandlers();

            console.log('Player initialized');

        } catch (error) {
            console.error('Failed to initialize player:', error);
            throw error;
        }
    }

    /**
     * Set up player event handlers
     */
    setupPlayerEventHandlers() {
        if (!this.player || !this.inputManager) return;

        // Register input handlers with InputManager
        this.inputManager.registerActionHandler('forward', (pressed) => {
            this.player.setMovementInput('forward', pressed);
        });

        this.inputManager.registerActionHandler('backward', (pressed) => {
            this.player.setMovementInput('backward', pressed);
        });

        this.inputManager.registerActionHandler('left', (pressed) => {
            this.player.setMovementInput('left', pressed);
        });

        this.inputManager.registerActionHandler('right', (pressed) => {
            this.player.setMovementInput('right', pressed);
        });

        this.inputManager.registerActionHandler('jump', (pressed) => {
            if (pressed) this.player.jump();
        });

        this.inputManager.registerActionHandler('crouch', (pressed) => {
            this.player.setCrouch(pressed);
        });

        this.inputManager.registerActionHandler('sprint', (pressed) => {
            this.player.setSprint(pressed);
        });

        this.inputManager.registerActionHandler('shoot', (pressed) => {
            if (pressed) {
                this.player.startFiring();
            } else {
                this.player.stopFiring();
            }
        });

        this.inputManager.registerActionHandler('aim', (pressed) => {
            this.player.setAiming(pressed);
        });

        this.inputManager.registerActionHandler('reload', (pressed) => {
            if (pressed) this.player.reload();
        });
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
     * Handle window focus loss
     */
    onFocusLost() {
        if (this.audioSystem) {
            this.audioSystem.pause();
        }
    }

    /**
     * Handle window focus gain
     */
    onFocusGained() {
        if (this.audioSystem) {
            this.audioSystem.resume();
        }
    }

    /**
     * Handle errors
     */
    onError(error) {
        console.error('Game error:', error);

        // Could show error UI or attempt recovery
        if (this.uiManager) {
            this.uiManager.showError('An error occurred: ' + error.message);
        }
    }

    /**
     * Get hardware scaling level based on performance settings
     */
    getScalingLevel() {
        switch (this.config.graphics.quality) {
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
        return this.fps;
    }

    /**
     * Get engine information
     */
    getEngineInfo() {
        return {
            fps: this.fps,
            deltaTime: this.deltaTime,
            isRunning: this.isRunning,
            scalingLevel: this.engine?.getHardwareScalingLevel() || 1.0
        };
    }

    /**
     * Start multiplayer mode
     */
    async startMultiplayer() {
        console.log('Starting multiplayer mode...');

        try {
            // Start the game loop first
            this.start();
            
            // Transition to main menu state
            // Player will be initialized when transitioning to IN_GAME state
            if (this.stateManager) {
                await this.stateManager.transitionTo('MAIN_MENU');
            }

            console.log('Multiplayer mode started');

        } catch (error) {
            console.error('Failed to start multiplayer mode:', error);
            throw error;
        }
    }

    /**
     * Stop the game and cleanup
     */
    stop() {
        if (!this.isRunning) {
            console.warn('Game is not running');
            return;
        }

        console.log('Stopping game...');

        this.isRunning = false;

        // Stop render loop
        if (this.engine) {
            this.engine.stopRenderLoop();
        }

        // Dispose of player
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }

        console.log('Game stopped');
    }

    /**
     * Complete cleanup and disposal
     */
    dispose() {
        console.log('Disposing game...');

        // Stop game if running
        this.stop();

        // Dispose of all managers
        this.disposeManagers();

        // Dispose of scene and engine
        if (this.scene) {
            this.scene.dispose();
            this.scene = null;
        }

        if (this.engine) {
            this.engine.dispose();
            this.engine = null;
        }

        this.isInitialized = false;

        console.log('Game disposed');
    }

    /**
     * Dispose of all managers and resources
     */
    disposeManagers() {
        const managers = [
            'performanceMonitor',
            'particleManager',
            'projectileManager',
            'mapManager',
            'networkManager',
            'uiManager',
            'physicsManager',
            'audioSystem',
            'assetManager',
            'inputManager',
            'stateManager'
        ];

        managers.forEach(managerName => {
            if (this[managerName]) {
                try {
                    this[managerName].dispose();
                    this[managerName] = null;
                } catch (error) {
                    console.error(`Error disposing ${managerName}:`, error);
                }
            }
        });
    }
}