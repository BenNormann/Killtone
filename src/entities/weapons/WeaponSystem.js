/**
 * KILLtONE Game Framework - Weapon System
 * Main export file for weapon system components
 */

// Export weapon configuration and constants
export {
    WeaponType,
    FiringMode,
    MuzzleFlashType,
    WeaponConfigs,
    WeaponConstants
} from './WeaponConfig.js';

// Export base weapon class
export { WeaponBase } from './WeaponBase.js';

// Export weapon implementations
export { Carbine } from './Carbine.js';

// Export accuracy system
export { AccuracySystem } from './AccuracySystem.js';

// Export projectile system
export { Projectile, ProjectileManager } from '../Projectile.js';

// WeaponEffects removed - using different approach