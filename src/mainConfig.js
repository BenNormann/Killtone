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
            weapon1: 'Digit1',  // Primary weapon
            weapon2: 'Digit2',  // Pistol
            weapon3: 'Digit3',  // Knife
            
            // Interface
            settings: 'Escape',
            scoreboard: 'Tab',
            chat: 'Enter',
            
            // Map Editor
            editorToggle: 'KeyE',
            editorSave: 'ControlLeft+KeyS',
            editorLoad: 'ControlLeft+KeyL',
            editorUndo: 'ControlLeft+KeyZ',
            editorRedo: 'ControlLeft+KeyY'
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
        loadingImage: './assets/Images/LoadingImage.png'
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

    // Physics Settings
    physics: {
        engine: 'cannon', // 'cannon' or 'ammo'
        gravity: -9.81,
        timeStep: 1/60,
        maxSubSteps: 3,
        collisionLayers: {
            PLAYER: 1,
            PROJECTILE: 2,
            ENVIRONMENT: 4,
            PICKUP: 8,
            TRIGGER: 16
        },
        enableDebugRenderer: false
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
        highlightColor: '#FD342B',
        fadeTime: 2000,
        maxIntensity: 2.0
    },

    // Theme Colors (Red/Pink/Purple Cyber Aesthetic)
    theme: {
        colors: {
            // Primary colors
            primary: '#fd342B',        // Bright red-pink
            primaryDark: '#cc0033',    // Darker red
            primaryLight: '#ff3366',   // Lighter red-pink
            
            // Secondary colors
            secondary: '#8800ff',      // Purple
            secondaryDark: '#6600cc',  // Darker purple
            secondaryLight: '#aa33ff', // Lighter purple
            
            // Accent colors
            accent: '#ff0080',         // Hot pink
            accentDark: '#cc0066',     // Darker pink
            accentLight: '#ff33aa',    // Lighter pink
            
            // UI colors
            background: '#000000',     // Pure black
            backgroundPanel: 'rgba(0, 0, 0, 0.85)',     // Semi-transparent black
            backgroundOverlay: 'rgba(0, 0, 0, 0.8)',    // Overlay background
            backgroundButton: 'rgba(255, 255, 255, 0.1)', // Button background
            backgroundButtonHover: 'rgba(255, 0, 64, 0.4)', // Button hover
            
            // Text colors
            textPrimary: '#ffffff',    // White text
            textSecondary: '#cccccc',  // Light gray text
            textAccent: '#ff0040',     // Red-pink accent text
            textSuccess: '#00ff88',    // Green for success/health
            textWarning: '#ffaa00',    // Orange for warnings
            textDanger: '#ff0040',     // Red for danger/low health
            
            // Progress and status colors
            progressBar: '#FD342B',    // Red-pink progress
            progressBackground: 'rgba(255, 255, 255, 0.2)', // Progress bg
            healthHigh: '#FD342B',     // High health (green)
            healthMedium: '#FD342B',   // Medium health (orange)
            healthLow: '#FD342B',      // Low health (red)
            
            // Border and outline colors
            border: '#ff0040',         // Primary border color
            borderSecondary: '#8800ff', // Secondary border color
            borderHover: '#ff3366',    // Hover border color
        },
        
        // Typography
        fonts: {
            primary: 'Arial, sans-serif',
            secondary: 'Arial, sans-serif',
            monospace: 'Courier New, monospace'
        },
        
        // Sizing and spacing
        spacing: {
            small: 8,
            medium: 15,
            large: 20,
            xlarge: 40
        },
        
        // Border radius
        borderRadius: {
            small: 4,
            medium: 8,
            large: 12
        },
        
        // Animation durations
        animation: {
            fast: 150,
            normal: 300,
            slow: 500
        }
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
