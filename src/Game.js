/**
 * KILLtONE Game Framework - Main Game Orchestrator
 * Entry point and central coordinator for all game systems
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from './mainConfig.js';
// import FlowstateAdapter from './effects/FlowstateAdapter.js';
// import FlowstateManager from './effects/FlowstateEffects.js';

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
        // this.flowstateManager = null; // Existing system - commented out until implemented
        // this.flowstateAdapter = null; // Integration adapter for flowstate system - commented out until implemented
        this.networkManager = null;
        this.performanceMonitor = null;

        // Player instances
        this.localPlayer = null;
        this.remotePlayers = new Map();

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

        // Create default ground plane
        this.createGroundPlane();

        console.log('Main scene created successfully');
    }

    /**
     * Create a default ground plane for the game
     */
    createGroundPlane() {
        // Create ground plane
        const ground = BABYLON.MeshBuilder.CreateGround(
            "ground",
            { width: 100, height: 100 },
            this.scene
        );

        // Create ground material
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Dark gray
        groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Add some texture variation
        groundMaterial.bumpTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);

        ground.material = groundMaterial;
        ground.checkCollisions = true;
        ground.receiveShadows = true;

        console.log('Ground plane created');
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

        // Flowstate adapter updates
        if (this.flowstateAdapter) {
            this.flowstateAdapter.update(deltaTime);
        }

        // Network updates
        if (this.networkManager) {
            this.networkManager.update(deltaTime);
        }

        // Update local player
        if (this.localPlayer) {
            this.localPlayer.update(deltaTime);
        }

        // Update remote players from network manager
        if (this.networkManager) {
            this.networkManager.remotePlayers.forEach(remotePlayer => {
                remotePlayer.update(deltaTime);
            });
        }

        // Update UI with game state
        this.updateUI(deltaTime);
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
            'flowstateAdapter',
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
     * Initialize FlowstateAdapter with existing FlowstateManager
     * This method should be called after both systems are available
     */
    async initializeFlowstateIntegration() {
        if (!this.flowstateManager) {
            console.warn('FlowstateAdapter: FlowstateManager not available for integration');
            return false;
        }

        try {
            console.log('Initializing FlowstateAdapter integration...');

            // Create the adapter
            this.flowstateAdapter = new FlowstateAdapter(this, this.flowstateManager);

            // Initialize the adapter
            await this.flowstateAdapter.initialize();

            console.log('FlowstateAdapter integration complete');
            return true;

        } catch (error) {
            console.error('Failed to initialize FlowstateAdapter:', error);
            return false;
        }
    }

    /**
     * Initialize the existing FlowstateManager
     * This method should be called when the game systems are ready
     */
    initializeFlowstateManager() {
        if (this.flowstateManager) {
            console.warn('FlowstateManager already initialized');
            return;
        }

        try {
            // Create the existing FlowstateManager
            this.flowstateManager = new FlowstateManager(this);
            console.log('FlowstateManager initialized');
        } catch (error) {
            console.error('Failed to initialize FlowstateManager:', error);
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

    /**
     * Initialize State Manager
     */
    async initializeStateManager() {
        try {
            console.log('Initializing State Manager...');

            // Import StateManager
            const { StateManager } = await import('./engine/StateManager.js');

            // Create StateManager instance
            this.stateManager = new StateManager(this);

            console.log('State Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize State Manager:', error);
            return false;
        }
    }

    /**
     * Initialize multiplayer networking
     */
    async initializeNetworking() {
        try {
            console.log('Initializing networking...');

            // Import NetworkManager
            const { NetworkManager } = await import('./engine/NetworkManager.js');

            // Create NetworkManager instance
            this.networkManager = new NetworkManager(this);

            // Connect to server
            await this.networkManager.connect();

            console.log('Networking initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize networking:', error);
            return false;
        }
    }

    /**
     * Initialize UI Manager
     */
    async initializeUIManager() {
        try {
            console.log('Initializing UI Manager...');

            // Import UIManager
            const { UIManager } = await import('./engine/UIManager.js');

            // Create UIManager instance
            this.uiManager = new UIManager(this);

            console.log('UI Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize UI Manager:', error);
            return false;
        }
    }

    /**
     * Initialize local player
     */
    async initializePlayer() {
        try {
            console.log('Initializing local player...');

            // Import Player class
            const { Player } = await import('./entities/Player.js');

            // Create local player
            this.localPlayer = new Player(this, this.scene);

            // Initialize player
            await this.localPlayer.initialize();

            // Set up player event handlers
            this.setupPlayerEventHandlers();

            // Set local player reference in network manager
            if (this.networkManager) {
                this.networkManager.setLocalPlayer(this.localPlayer);
            }

            console.log('Local player initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize local player:', error);
            return false;
        }
    }

    /**
     * Set up player event handlers
     */
    setupPlayerEventHandlers() {
        if (!this.localPlayer) return;

        // Handle player movement updates
        let lastMovementUpdate = 0;
        const movementUpdateInterval = 1000 / 20; // 20 updates per second

        const updatePlayerMovement = () => {
            const now = Date.now();
            if (now - lastMovementUpdate > movementUpdateInterval && this.networkManager && this.networkManager.isConnected) {
                this.networkManager.emit('playerUpdate', {
                    position: this.localPlayer.getPosition(),
                    rotation: this.localPlayer.getCameraDirection()
                });
                lastMovementUpdate = now;
            }
        };

        // Set up movement update interval
        setInterval(updatePlayerMovement, movementUpdateInterval);

        // Handle shooting
        this.localPlayer.onShoot = (shootData) => {
            if (this.networkManager && this.networkManager.isConnected) {
                this.networkManager.emit('playerShoot', {
                    origin: shootData.origin,
                    direction: shootData.direction,
                    weaponType: shootData.weapon?.name || 'bulldog'
                });
            }
        };

        // Handle death
        this.localPlayer.onDeath = (source) => {
            console.log('Local player died');
            // Death is handled by the server when it receives bulletHit events
        };

        // Handle respawn
        this.localPlayer.onRespawn = () => {
            if (this.networkManager && this.networkManager.isConnected) {
                this.networkManager.emit('requestRespawn');
            }
        };
    }

    /**
     * Initialize Asset Manager
     */
    async initializeAssetManager() {
        try {
            console.log('Initializing Asset Manager...');

            const { AssetManager } = await import('./engine/AssetManager.js');
            this.assetManager = new AssetManager(this);

            // Load game assets including weapons
            await this.assetManager.loadGameAssets();

            console.log('Asset Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Asset Manager:', error);
            return false;
        }
    }

    /**
     * Initialize Audio Manager
     */
    async initializeAudioManager() {
        try {
            console.log('Initializing Audio Manager...');

            const { AudioManager } = await import('./audio/AudioManager.js');
            this.audioManager = new AudioManager(this);

            console.log('Audio Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Audio Manager:', error);
            return false;
        }
    }

    /**
     * Initialize Input Manager
     */
    async initializeInputManager() {
        try {
            console.log('Initializing Input Manager...');

            const { InputManager } = await import('./engine/InputManager.js');
            this.inputManager = new InputManager(this);

            console.log('Input Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Input Manager:', error);
            return false;
        }
    }

    /**
     * Initialize Map Manager
     */
    async initializeMapManager() {
        try {
            console.log('Initializing Map Manager...');

            const { MapManager } = await import('./engine/MapManager.js');
            this.mapManager = new MapManager(this);

            console.log('Map Manager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Map Manager:', error);
            return false;
        }
    }

    /**
     * Initialize Performance Monitor
     */
    async initializePerformanceMonitor() {
        try {
            console.log('Initializing Performance Monitor...');

            const { PerformanceMonitor } = await import('./engine/PerformanceMonitor.js');
            this.performanceMonitor = new PerformanceMonitor(this);

            console.log('Performance Monitor initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Performance Monitor:', error);
            return false;
        }
    }

    /**
     * Start the game with networking
     */
    async startMultiplayer() {
        try {
            console.log('Starting multiplayer game...');

            // Initialize core managers first
            await this.initializeAssetManager();
            await this.initializeAudioManager();
            await this.initializeInputManager();
            await this.initializeMapManager();
            await this.initializePerformanceMonitor();

            // Initialize State Manager
            await this.initializeStateManager();

            // Initialize UI Manager
            await this.initializeUIManager();

            // Initialize networking
            await this.initializeNetworking();

            // Initialize local player
            await this.initializePlayer();

            // Start the game loop
            this.start();

            // Transition from LOADING to MAIN_MENU
            await this.stateManager.transitionTo('MAIN_MENU');

            console.log('Multiplayer game started successfully');
            console.log(`Player ${this.networkManager.playerId} joined the game`);

            return true;

        } catch (error) {
            console.error('Failed to start multiplayer game:', error);
            return false;
        }
    }

    /**
     * Handle remote player shooting
     */
    handleRemoteShot(data) {
        console.log(`Remote player ${data.playerId} is shooting`);

        // Get remote player from network manager and trigger shooting animation
        const remotePlayer = this.networkManager.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.triggerShoot();
        }

        // Create projectile for remote shot (if projectile system exists)
        // This would be handled by the weapon/projectile system
    }

    /**
     * Handle player hit events
     */
    handlePlayerHit(data) {
        console.log('Player hit event:', data);
        // This would be handled by the combat system
    }

    /**
     * Handle player death events
     */
    handlePlayerDeath(data) {
        console.log('Player death event:', data);
        // This would be handled by the game state system
    }

    /**
     * Update UI elements with current game state
     */
    updateUI(deltaTime) {
        if (!this.uiManager || !this.stateManager) return;

        // Only update HUD when in game
        if (this.stateManager.isInState('IN_GAME') && this.localPlayer) {
            const gameState = {
                health: this.localPlayer.health,
                maxHealth: this.localPlayer.maxHealth,
                ammo: {
                    current: this.localPlayer.currentWeapon?.ammo || 30,
                    reserve: this.localPlayer.currentWeapon?.reserveAmmo || 90
                },
                weapon: this.localPlayer.currentWeapon?.name || 'Bulldog',
                fps: this.getFPS()
            };

            this.uiManager.updateHUD(gameState);
        }
    }
}

export default Game;