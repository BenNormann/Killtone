// Trun Character Configuration
const TrunCharacterConfig = {
    name: "Trun",
    type: "character",
    description: "Default character model with 3 animations",
    
    // Model properties
    model: {
        folder: "src/assets/characters/trun/",
        file: "scene.gltf",
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