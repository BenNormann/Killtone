/**
 * CommonUtils - Shared utility functions used across the codebase
 * Consolidates frequently duplicated utility methods
 */

export class CommonUtils {
    /**
     * Generate a unique ID with optional prefix
     * @param {string} prefix - Optional prefix for the ID
     * @returns {string} Unique ID string
     */
    static generateId(prefix = 'id') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Generate a physics body ID
     * @returns {string} Physics body ID
     */
    static generatePhysicsBodyId() {
        return this.generateId('physics_body');
    }

    /**
     * Generate a map ID
     * @returns {string} Map ID
     */
    static generateMapId() {
        return this.generateId('map');
    }

    /**
     * Generate an entity ID
     * @returns {string} Entity ID
     */
    static generateEntityId() {
        return this.generateId('entity');
    }

    /**
     * Generate a prop ID
     * @returns {string} Prop ID
     */
    static generatePropId() {
        return this.generateId('prop');
    }

    /**
     * Generate a primitive ID
     * @returns {string} Primitive ID
     */
    static generatePrimitiveId() {
        return this.generateId('primitive');
    }

    /**
     * Generate a muzzle flash effect ID
     * @returns {string} Muzzle flash effect ID
     */
    static generateMuzzleFlashId() {
        return this.generateId('muzzleflash');
    }

    /**
     * Generate a knife trail effect ID
     * @returns {string} Knife trail effect ID
     */
    static generateKnifeTrailId() {
        return this.generateId('knifetrail');
    }

    /**
     * Generate an audio source ID
     * @returns {string} Audio source ID
     */
    static generateAudioSourceId() {
        return this.generateId('audio');
    }

    /**
     * Generate a step sound ID
     * @returns {string} Step sound ID
     */
    static generateStepSoundId() {
        return this.generateId('step');
    }

    /**
     * Round a vector's components to specified decimal places
     * @param {Object} vector - Vector with x, y, z properties
     * @param {number} decimals - Number of decimal places (default: 3)
     * @returns {Object} Rounded vector
     */
    static roundVector(vector, decimals = 3) {
        if (!vector) return vector;
        
        const multiplier = Math.pow(10, decimals);
        const result = { ...vector };
        
        if (typeof result.x === 'number') {
            result.x = Math.round(result.x * multiplier) / multiplier;
        }
        if (typeof result.y === 'number') {
            result.y = Math.round(result.y * multiplier) / multiplier;
        }
        if (typeof result.z === 'number') {
            result.z = Math.round(result.z * multiplier) / multiplier;
        }
        
        return result;
    }

    /**
     * Snap position to grid
     * @param {Object} position - Position with x, z properties
     * @param {number} gridSize - Grid size for snapping
     * @returns {Object} Snapped position
     */
    static snapToGrid(position, gridSize = 1) {
        if (!position || gridSize <= 0) return position;
        
        return {
            ...position,
            x: Math.round(position.x / gridSize) * gridSize,
            z: Math.round(position.z / gridSize) * gridSize
        };
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * this.clamp(t, 0, 1);
    }

    /**
     * Check if a value is within a range
     * @param {number} value - Value to check
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean} True if value is within range
     */
    static isInRange(value, min, max) {
        return value >= min && value <= max;
    }

    /**
     * Deep clone an object (simple implementation for game objects)
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    /**
     * Debounce a function call
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Throttle a function call
     * @param {Function} func - Function to throttle
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }

    /**
     * Format a number with specified decimal places
     * @param {number} value - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number string
     */
    static formatNumber(value, decimals = 2) {
        return Number(value).toFixed(decimals);
    }

    /**
     * Check if an object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if object is empty
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Safe property access with default value
     * @param {Object} obj - Object to access
     * @param {string} path - Property path (e.g., 'a.b.c')
     * @param {*} defaultValue - Default value if property doesn't exist
     * @returns {*} Property value or default
     */
    static safeGet(obj, path, defaultValue = null) {
        if (!obj || !path) return defaultValue;
        
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current;
    }
}
