/**
 * KILLtONE Game Framework - Weapon Configuration
 * 
 * This file contains all weapon configurations including:
 * - Basic weapon stats (damage, fire rate, etc.)
 * - Model configuration (scaling, positioning, handedness)
 * - Muzzle flash settings (position, alignment)
 * - Audio and visual effects
 */

// Weapon type enumeration
export const WeaponType = {
    CARBINE: 'carbine',
    PISTOL: 'pistol',
    SHOTGUN: 'shotgun',
    SMG: 'smg',
    SNIPER: 'sniper',
    KNIFE: 'knife'
};

// Firing mode enumeration
export const FiringMode = {
    SEMI_AUTO: 'semi-auto',
    FULL_AUTO: 'full-auto',
    MELEE: 'melee'
};

// Weapon configuration data structure
export const WeaponConfigs = {
    [WeaponType.CARBINE]: {
        name: 'Carbine',
        type: WeaponType.CARBINE,
        firingMode: FiringMode.SEMI_AUTO,
        damage: 50,
        fireRate: 0.15, // seconds between shots
        magazineSize: 12,
        reloadTime: 3.0,
        accuracy: 0.95,
        recoilAmount: 0.1,
        reloadStartFrame: 40,
        reloadEndFrame: 138,
        modelPath: './assets/weapons/carbine/fps_animated_carbine.glb',
        animations: {
            idle: 'idle',
            reload: 'reload',
            fire: 'fire',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: .7, y: .7, z: .7 }, // Normal scale
            position: { x: -0.3, y: 0.2, z: -0.5 }, // Move right and closer to camera
            rotation: { x: 0.05, y: 0.0, z: 0.0 }, // Slight rotation
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: {
            color: 'PRIMARY',
            size: 0.1,
            length: 0.6,
            duration: 100,
            position: { x: 0.00, y: 0.234, z: 1.2 }
        },
        recoilPattern: {
            horizontal: 0.05,
            vertical: 0.1,
            recovery: 2.0
        },
        projectile: {
            speed: 800, // m/s - moderate speed for carbine
            maxDistance: 500
        },
        audio: {
            fireSound: 'assets/sounds/GenericGunshot.wav',
            reloadSound: 'assets/sounds/Reload.wav',
            volume: 0.8
        }
    },
    
    [WeaponType.PISTOL]: {
        name: 'Pistol',
        type: WeaponType.PISTOL,
        firingMode: FiringMode.SEMI_AUTO,
        damage: 20,
        fireRate: 0.12, // seconds between shots (high fire rate)
        magazineSize: 14,
        reloadTime: 3.0,
        accuracy: 0.90,
        recoilAmount: 0.08,
        modelPath: './assets/weapons/pistol/fps_pistol_animated.glb',
        animations: {
            idle: 'idle',
            reload: 'reload',
            fire: 'fire',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: 0.01, y: 0.01, z: 0.01 }, // Model scale
            position: { x: -0.4, y: 0.35, z: -0.6 }, // Model position offset
            rotation: { x: 0.0, y: 0.0, z: 0.0 }, // Model rotation offset
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: {
            color: 'SECONDARY',
            size: 0.15,
            length: 0.6,
            duration: 80,
            position: { x: -0.077, y: 0.1, z: 1 },
        },
        recoilPattern: {
            horizontal: 0.04,
            vertical: 0.08,
            recovery: 2.5
        },
        projectile: {
            speed: 400, // m/s - slower speed for pistol
            maxDistance: 300
        },
        audio: {
            fireSound: 'assets/sounds/GenericGunshot.wav',
            reloadSound: 'assets/sounds/Reload.wav',
            volume: 0.7
        }
    },
    
    [WeaponType.SHOTGUN]: {
        name: 'Shotgun',
        type: WeaponType.SHOTGUN,
        firingMode: FiringMode.SEMI_AUTO,
        damage: 10, // per pellet
        pelletCount: 10,
        spreadAngle: 15, // degrees
        fireRate: 0.8, // seconds between shots
        magazineSize: 4,
        reloadTime: 3.0,
        accuracy: 0.85,
        recoilAmount: 0.25,
        modelPath: './assets/weapons/shotgun/shotgun_animated.glb',
        animations: {
            idle: 'idle',
            reload: 'reload',
            fire: 'fire',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: 0.01, y: 0.01, z: 0.01 }, // Model scale
            position: { x: -0.4, y: 0.30, z: -0.6 }, // Model position offset
            rotation: { x: 0.0, y: 0.0, z: 0.0 }, // Model rotation offset
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: {
            color: 'PRIMARY',
            size: 0.4,
            length: 1.0,
            duration: 120,
            position: { x: -0.077, y: 0.1, z: 1.5 },
        },
        recoilPattern: {
            horizontal: 0.12,
            vertical: 0.25,
            recovery: 1.5
        },
        projectile: {
            speed: 450, // m/s - moderate speed for shotgun pellets
            maxDistance: 200
        },
        audio: {
            fireSound: 'assets/sounds/GenericGunshot.wav',
            reloadSound: 'assets/sounds/Reload.wav',
            volume: 0.9
        }
    },
    
    [WeaponType.SMG]: {
        name: 'SMG',
        type: WeaponType.SMG,
        firingMode: FiringMode.FULL_AUTO,
        damage: 25,
        fireRate: 0.08, // seconds between shots (full-auto)
        magazineSize: 23,
        reloadTime: 3.0,
        accuracy: 0.80,
        recoilAmount: 0.12,
        modelPath: './assets/weapons/smg/fps_smg9_animated.glb',
        animations: {
            idle: 'idle',
            reload: 'reload',
            fire: 'fire',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: 0.01, y: 0.01, z: 0.01 }, // Model scale
            position: { x: -0.4, y: 0.30, z: -0.6 }, // Model position offset
            rotation: { x: 0.0, y: 0.0, z: 0.0 }, // Model rotation offset
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: {
            color: 'PRIMARY',
            size: 0.28,
            length: 0.7,
            duration: 90,
            position: { x: -0.077, y: 0, z: 1.2 },
        },
        recoilPattern: {
            horizontal: 0.06,
            vertical: 0.12,
            recovery: 2.2
        },
        projectile: {
            speed: 600, // m/s - fast speed for SMG
            maxDistance: 400
        },
        audio: {
            fireSound: 'assets/sounds/GenericGunshot.wav',
            reloadSound: 'assets/sounds/Reload.wav',
            volume: 0.8
        }
    },
    
    [WeaponType.SNIPER]: {
        name: 'Sniper',
        type: WeaponType.SNIPER,
        firingMode: FiringMode.SEMI_AUTO,
        damage: 100,
        fireRate: 1.2, // seconds between shots (slower)
        magazineSize: 5,
        reloadTime: 3.0,
        accuracy: 0.98,
        recoilAmount: 0.3,
        modelPath: './assets/weapons/sniper/fps_50cal.glb',
        animations: {
            idle: 'idle',
            reload: 'reload',
            fire: 'fire',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: 0.01, y: 0.01, z: 0.01 }, // Model scale
            position: { x: -0.4, y: 0.30, z: -0.6 }, // Model position offset
            rotation: { x: 0.0, y: 0.0, z: 0.0 }, // Model rotation offset
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: {
            color: 'PRIMARY',
            size: 0.35,
            length: 1.2,
            duration: 150,
            position: { x: 0, y: 0, z: 1.8 },
        },
        recoilPattern: {
            horizontal: 0.15,
            vertical: 0.3,
            recovery: 1.2
        },
        projectile: {
            speed: 1200, // m/s - very fast speed for sniper
            maxDistance: 800
        },
        audio: {
            fireSound: 'assets/sounds/Sniper.wav',
            reloadSound: 'assets/sounds/Reload.wav',
            volume: 1.0
        }
    },
    
    [WeaponType.KNIFE]: {
        name: 'Knife',
        type: WeaponType.KNIFE,
        firingMode: FiringMode.MELEE,
        damage: 50,
        fireRate: 0.5, // swing cooldown
        magazineSize: Infinity, // infinite ammunition
        reloadTime: 0,
        accuracy: 1.0,
        range: 2.0, // meters
        swingAngle: 60, // degrees
        animationDuration: 4.83, // seconds
        modelPath: './assets/weapons/knife/knife_animated.glb',
        animations: {
            idle: 'idle',
            swing: 'swing',
            draw: 'draw',
            holster: 'holster'
        },
        // Weapon model positioning and scaling
        modelConfig: {
            scaling: { x: 0.01, y: 0.01, z: 0.01 }, // Model scale
            position: { x: -0.5, y: 0.40, z: -0.6 }, // Model position offset
            rotation: { x: 0.0, y: 0.0, z: 0.0 }, // Model rotation offset
            handedness: 'left' // 'left' or 'right' - flips model horizontally
        },
        muzzleFlash: null, // No muzzle flash for melee
        recoilPattern: null, // No recoil for melee
        audio: {
            fireSound: 'assets/sounds/Knife.wav', // swing sound
            reloadSound: null, // knife doesn't reload
            volume: 0.8
        }
    }
};

// Weapon constants
export const WeaponConstants = {
    // Primary weapons (selectable in main menu)
    PRIMARY_WEAPONS: [
        WeaponType.CARBINE,
        WeaponType.SHOTGUN,
        WeaponType.SMG,
        WeaponType.SNIPER
    ],
    
    // Secondary weapons (always available)
    SECONDARY_WEAPONS: [
        WeaponType.PISTOL,
        WeaponType.KNIFE
    ],
    
    // Weapon switching order
    WEAPON_CYCLE_ORDER: [
        'primary', // Selected primary weapon
        WeaponType.PISTOL,
        WeaponType.KNIFE
    ],
    
    // Effect colors
    MUZZLE_FLASH_COLORS: {
        PRIMARY: { r: 1.0, g: 0.0, b: 1.0, a: 1.0 }, // Bright purple
        SECONDARY: { r: 1.0, g: 0.0, b: 0.5, a: 1.0 } // Pink
    },
    
    KNIFE_TRAIL_COLOR: { r: 0.8, g: 0.0, b: 1.0, a: 1.0 }, // Purple
    
    // Animation states
    ANIMATION_STATES: {
        IDLE: 'idle',
        RELOAD: 'reload',
        FIRE: 'fire',
        SWING: 'swing'
    },
    
    // Accuracy factors
    ACCURACY_FACTORS: {
        MOVEMENT_PENALTY_MAX: 0.4,
        RECOIL_ACCUMULATION_MAX: 0.6,
        RECOVERY_RATE: 2.0 // per second
    }
};

export default WeaponConfigs;