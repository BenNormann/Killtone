/**
 * KILLtONE Game Framework - Weapon Configuration
 * Defines weapon types, constants, and configuration data
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

// Muzzle flash type enumeration
export const MuzzleFlashType = {
    DONUT: 'donut',
    SPIKEY: 'spikey'
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
        muzzleFlashType: MuzzleFlashType.DONUT,
        modelPath: './assets/weapons/carbine/fps_animated_carbine.glb',
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
        muzzleFlashType: MuzzleFlashType.DONUT,
        modelPath: './assets/weapons/pistol/fps_pistol_animated.glb',
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
        muzzleFlashType: MuzzleFlashType.DONUT,
        modelPath: './assets/weapons/shotgun/shotgun_animated.glb',
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
        muzzleFlashType: MuzzleFlashType.SPIKEY,
        modelPath: './assets/weapons/smg/fps_smg9_animated.glb',
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
        muzzleFlashType: MuzzleFlashType.DONUT,
        modelPath: './assets/weapons/sniper/fps_50cal.glb',
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