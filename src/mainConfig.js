/**
 * KILLtONE Game Framework - Main Configuration
 * Central configuration hub for the entire game
 */

export const GameConfig = {
    // Graphics Settings
    graphics: {
        resolution: '1920x1080',
        quality: 'high', // 'low', 'medium', 'high', 'ultra'
        fov: 90,
        vsync: true,
        antialiasing: true,
        shadows: true,
        postProcessing: true,
        particleQuality: 'high'
    },

    // Audio Settings
    audio: {
        masterVolume: 1.0,
        musicVolume: 0.8,
        effectsVolume: 1.0,
        voiceVolume: 1.0,
        enable3DAudio: true,
        audioQuality: 'high'
    },

    // Control Settings
    controls: {
        mouseSensitivity: 1.0,
        invertY: false,
        keyBindings: {
            // Movement
            forward: 'KeyW',
            backward: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            jump: 'Space',
            crouch: 'KeyC',
            sprint: 'ShiftLeft',
            
            // Combat
            shoot: 'Mouse0',
            aim: 'Mouse1',
            reload: 'KeyR',
            switchWeapon: 'KeyQ',
            
            // Interface
            settings: 'Escape',
            scoreboard: 'Tab',
            chat: 'Enter',
            
            // Map Editor
            editorToggle: 'KeyE',
            editorSave: 'KeyS',
            editorLoad: 'KeyL',
            editorUndo: 'KeyZ',
            editorRedo: 'KeyY'
        }
    },

    // Performance Settings
    performance: {
        targetFPS: 60,
        maxFPS: 144,
        adaptiveQuality: true,
        memoryLimit: 512, // MB
        cullingDistance: 1000,
        lodDistance: 500
    },

    // Asset Paths
    assets: {
        basePath: './assets/',
        images: './assets/Images/',
        sounds: './assets/sounds/',
        maps: './assets/maps/',
        characters: './assets/characters/',
        weapons: './assets/weapons/',
        loadingImage: './assets/Images/LOADINGIMAGE.png'
    },

    // Game Settings
    game: {
        maxPlayers: 16,
        respawnTime: 3000, // milliseconds
        roundTime: 300000, // 5 minutes
        killStreakThresholds: [3, 5, 10, 15, 20],
        healthPackRespawnTime: 30000,
        weaponRespawnTime: 15000
    },

    // Network Settings
    network: {
        serverURL: 'ws://localhost:8080',
        timeout: 5000,
        reconnectAttempts: 3,
        tickRate: 64,
        interpolationDelay: 100
    },

    // Debug Settings
    debug: {
        enabled: false,
        showFPS: true,
        showMemory: false,
        showPhysics: false,
        showNetworkStats: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        enableConsole: true
    },

    // Map Editor Settings
    mapEditor: {
        gridSize: 1.0,
        snapToGrid: true,
        showGrid: true,
        maxUndoSteps: 50,
        autoSave: true,
        autoSaveInterval: 60000 // 1 minute
    },

    // Flowstate Effects Settings (for existing system integration)
    flowstate: {
        enabled: true,
        musicVolumeMultiplier: 1.5,
        effectIntensity: 1.0,
        highlightColor: '#ff0000',
        fadeTime: 2000,
        maxIntensity: 2.0
    }
};

// Default user settings (can be overridden by user preferences)
export const DefaultUserSettings = {
    graphics: { ...GameConfig.graphics },
    audio: { ...GameConfig.audio },
    controls: { ...GameConfig.controls },
    performance: { ...GameConfig.performance }
};

// Development overrides
if (GameConfig.debug.enabled) {
    GameConfig.performance.targetFPS = 30;
    GameConfig.debug.showFPS = true;
    GameConfig.debug.logLevel = 'debug';
}

export default GameConfig;