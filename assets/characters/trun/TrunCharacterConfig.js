// Trun Character Configuration
const TrunCharacterConfig = {
    name: "Trun",
    type: "character",
    description: "Default character model with 3 animations",
    
    // Model properties
    model: {
        folder: "assets/characters/trun/",
        scale: { x: 1, y: 1, z: 1 },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 }
    },
    
    // Animation mappings
    animations: {
        idle: "idle",
        walking: "walk", 
        running: "run"
    },
    
    // Animation file configurations
    animationFiles: {
        'trun_standing': {
            folder: 'assets/characters/trun/',
            filename: 'Animation_Standing.glb',
            category: 'character'
        },
        'trun_walking': {
            folder: 'assets/characters/trun/',
            filename: 'Animation_Walking_withSkin.glb',
            category: 'character'
        },
        'trun_running': {
            folder: 'assets/characters/trun/',
            filename: 'Animation_Running_withSkin.glb',
            category: 'character'
        }
    },
    
    // Character-specific transformation configurations
    transformations: {
        'trun_standing': {
            position: { x: 0, y: 0.55, z: 0 },
            rotation: { x: 0, y: 180, z: 0 }, // 180 degrees
            scaling: { x: 1.1, y: 1.1, z: 1.1 }
        },
        'trun_walking': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 180, z: 0 }, // 180 degrees
            scaling: { x: 1.2, y: 1.2, z: 1.2 }
        },
        'trun_running': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 180, z: 0 }, // 180 degrees
            scaling: { x: 1.2, y: 1.2, z: 1.2 }
        }
    },
    
    // Physics properties
    physics: {
        radius: 1.2,
        height: 16,
        mass: 1
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrunCharacterConfig;
} else {
    window.TrunCharacterConfig = TrunCharacterConfig;
}