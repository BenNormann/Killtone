/**
 * KILLtONE Game Framework - AmmoRegistry
 * Tracks ammunition for all weapon types with support for infinite ammunition
 */

import { WeaponType, WeaponConfigs } from './WeaponConfig.js';
import MathUtils from '../../utils/MathUtils.js';

export class AmmoRegistry {
    constructor() {
        // Ammunition storage for each weapon type
        this.ammoStorage = new Map();
        
        // Events
        this.onAmmoChanged = null;
        this.onAmmoEmpty = null;
        this.onAmmoFull = null;
        
        // Initialize ammunition for all weapon types
        this.initializeAmmo();
        
        console.log('AmmoRegistry initialized');
    }
    
    /**
     * Initialize ammunition for all weapon types based on their configurations
     */
    initializeAmmo() {
        Object.values(WeaponType).forEach(weaponType => {
            const config = WeaponConfigs[weaponType];
            if (config) {
                this.ammoStorage.set(weaponType, {
                    current: config.magazineSize,
                    max: config.magazineSize,
                    isInfinite: config.magazineSize === Infinity
                });
            }
        });
        
        console.log('Ammunition initialized for all weapon types');
    }
    
    /**
     * Set ammunition for a specific weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @param {number} current - Current ammunition count
     * @param {number} max - Maximum ammunition capacity
     */
    setAmmo(weaponType, current, max) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return false;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        
        // Don't modify infinite ammo weapons
        if (ammoData.isInfinite) {
            return false;
        }
        
        const oldCurrent = ammoData.current;
        const oldMax = ammoData.max;
        
        ammoData.current = MathUtils.clamp(current, 0, max);
        ammoData.max = Math.max(1, max);
        
        // Trigger events if values changed
        if (oldCurrent !== ammoData.current || oldMax !== ammoData.max) {
            this.triggerAmmoChanged(weaponType, ammoData.current, ammoData.max);
        }
        
        return true;
    }
    
    /**
     * Consume ammunition for a specific weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @param {number} amount - Amount of ammunition to consume (default: 1)
     * @returns {boolean} - True if ammunition was consumed, false if not enough ammo
     */
    consumeAmmo(weaponType, amount = 1) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return false;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        
        // Infinite ammo weapons never consume ammunition
        if (ammoData.isInfinite) {
            return true;
        }
        
        // Check if enough ammunition is available
        if (ammoData.current < amount) {
            // Trigger empty event if trying to consume more than available
            if (ammoData.current === 0) {
                this.triggerAmmoEmpty(weaponType);
            }
            return false;
        }
        
        const oldCurrent = ammoData.current;
        ammoData.current = MathUtils.clamp(ammoData.current - amount, 0, ammoData.max);
        
        // Trigger events
        this.triggerAmmoChanged(weaponType, ammoData.current, ammoData.max);
        
        if (ammoData.current === 0 && oldCurrent > 0) {
            this.triggerAmmoEmpty(weaponType);
        }
        
        return true;
    }
    
    /**
     * Reload weapon to full magazine capacity
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {boolean} - True if reload was performed, false if not needed or infinite ammo
     */
    reloadWeapon(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return false;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        
        // Cannot reload infinite ammo weapons or already full magazines
        if (ammoData.isInfinite || ammoData.current >= ammoData.max) {
            return false;
        }
        
        const oldCurrent = ammoData.current;
        ammoData.current = ammoData.max;
        
        // Trigger events
        this.triggerAmmoChanged(weaponType, ammoData.current, ammoData.max);
        this.triggerAmmoFull(weaponType);
        
        console.log(`${weaponType} reloaded: ${oldCurrent} -> ${ammoData.current}`);
        return true;
    }
    
    /**
     * Get current ammunition count for a weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {number} - Current ammunition count (Infinity for infinite ammo weapons)
     */
    getCurrentAmmo(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return 0;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return ammoData.isInfinite ? Infinity : ammoData.current;
    }
    
    /**
     * Get maximum ammunition capacity for a weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {number} - Maximum ammunition capacity (Infinity for infinite ammo weapons)
     */
    getMaxAmmo(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return 0;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return ammoData.isInfinite ? Infinity : ammoData.max;
    }
    
    /**
     * Check if weapon magazine is empty
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {boolean} - True if magazine is empty (always false for infinite ammo)
     */
    isEmpty(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return true;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return !ammoData.isInfinite && ammoData.current <= 0;
    }
    
    /**
     * Check if weapon magazine is full
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {boolean} - True if magazine is full (always true for infinite ammo)
     */
    isFull(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return false;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return ammoData.isInfinite || ammoData.current >= ammoData.max;
    }
    
    /**
     * Check if weapon has infinite ammunition
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {boolean} - True if weapon has infinite ammunition
     */
    isInfiniteAmmo(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return false;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return ammoData.isInfinite;
    }
    
    /**
     * Get ammunition information for a weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {object} - Ammunition information object
     */
    getAmmoInfo(weaponType) {
        if (!this.ammoStorage.has(weaponType)) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return null;
        }
        
        const ammoData = this.ammoStorage.get(weaponType);
        return {
            weaponType: weaponType,
            current: ammoData.isInfinite ? Infinity : ammoData.current,
            max: ammoData.isInfinite ? Infinity : ammoData.max,
            isInfinite: ammoData.isInfinite,
            isEmpty: !ammoData.isInfinite && ammoData.current <= 0,
            isFull: ammoData.isInfinite || ammoData.current >= ammoData.max,
            percentage: ammoData.isInfinite ? 100 : (ammoData.current / ammoData.max) * 100
        };
    }
    
    /**
     * Get ammunition information for all weapon types
     * @returns {Map} - Map of weapon types to ammunition information
     */
    getAllAmmoInfo() {
        const allAmmoInfo = new Map();
        
        this.ammoStorage.forEach((ammoData, weaponType) => {
            allAmmoInfo.set(weaponType, this.getAmmoInfo(weaponType));
        });
        
        return allAmmoInfo;
    }
    
    /**
     * Reset ammunition for a specific weapon type to its default values
     * @param {string} weaponType - The weapon type from WeaponType enum
     */
    resetAmmo(weaponType) {
        const config = WeaponConfigs[weaponType];
        if (!config) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return;
        }
        
        this.ammoStorage.set(weaponType, {
            current: config.magazineSize,
            max: config.magazineSize,
            isInfinite: config.magazineSize === Infinity
        });
        
        const ammoData = this.ammoStorage.get(weaponType);
        this.triggerAmmoChanged(weaponType, ammoData.current, ammoData.max);
        
        console.log(`Reset ammunition for ${weaponType}`);
    }
    
    /**
     * Reset ammunition for all weapon types to their default values
     */
    resetAllAmmo() {
        Object.values(WeaponType).forEach(weaponType => {
            this.resetAmmo(weaponType);
        });
        
        console.log('Reset ammunition for all weapon types');
    }
    
    /**
     * Trigger ammunition changed event
     * @private
     */
    triggerAmmoChanged(weaponType, current, max) {
        if (this.onAmmoChanged) {
            this.onAmmoChanged(weaponType, current, max);
        }
    }
    
    /**
     * Trigger ammunition empty event
     * @private
     */
    triggerAmmoEmpty(weaponType) {
        if (this.onAmmoEmpty) {
            this.onAmmoEmpty(weaponType);
        }
    }
    
    /**
     * Trigger ammunition full event
     * @private
     */
    triggerAmmoFull(weaponType) {
        if (this.onAmmoFull) {
            this.onAmmoFull(weaponType);
        }
    }
    
    /**
     * Dispose of the AmmoRegistry
     */
    dispose() {
        console.log('Disposing AmmoRegistry...');
        
        this.ammoStorage.clear();
        this.onAmmoChanged = null;
        this.onAmmoEmpty = null;
        this.onAmmoFull = null;
        
        console.log('AmmoRegistry disposed');
    }
}

export default AmmoRegistry;