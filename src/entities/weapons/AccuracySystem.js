/**
 * KILLtONE Game Framework - Accuracy System
 * Manages weapon accuracy with movement and recoil penalties
 */

import { WeaponConstants } from '../WeaponConfig.js';

export class AccuracySystem {
    constructor() {
        // Base accuracy state
        this.baseAccuracy = 1.0;
        this.movementPenalty = 0.0;
        this.recoilAccumulation = 0.0;
        
        // Recovery settings
        this.recoveryRate = WeaponConstants.ACCURACY_FACTORS.RECOVERY_RATE;
        this.maxMovementPenalty = WeaponConstants.ACCURACY_FACTORS.MOVEMENT_PENALTY_MAX;
        this.maxRecoilAccumulation = WeaponConstants.ACCURACY_FACTORS.RECOIL_ACCUMULATION_MAX;
        
        // Weapon-specific recoil patterns
        this.recoilPatterns = new Map();
        this.initializeRecoilPatterns();
        
        // Current weapon context
        this.currentWeapon = null;
        this.lastShotTime = 0;
        
        console.log('AccuracySystem initialized');
    }
    
    /**
     * Initialize weapon-specific recoil patterns
     */
    initializeRecoilPatterns() {
        // Carbine - moderate vertical recoil with slight horizontal drift
        this.recoilPatterns.set('carbine', {
            horizontal: { min: -0.05, max: 0.05, accumulation: 0.08 },
            vertical: { min: 0.08, max: 0.12, accumulation: 0.1 },
            recovery: 2.5,
            maxAccumulation: 0.4
        });
        
        // Pistol - quick recovery, low recoil
        this.recoilPatterns.set('pistol', {
            horizontal: { min: -0.03, max: 0.03, accumulation: 0.06 },
            vertical: { min: 0.05, max: 0.08, accumulation: 0.08 },
            recovery: 3.0,
            maxAccumulation: 0.3
        });
        
        // Shotgun - high vertical kick, moderate horizontal spread
        this.recoilPatterns.set('shotgun', {
            horizontal: { min: -0.1, max: 0.1, accumulation: 0.15 },
            vertical: { min: 0.15, max: 0.25, accumulation: 0.25 },
            recovery: 1.8,
            maxAccumulation: 0.6
        });
        
        // SMG - high horizontal drift with sustained fire
        this.recoilPatterns.set('smg', {
            horizontal: { min: -0.08, max: 0.08, accumulation: 0.12 },
            vertical: { min: 0.06, max: 0.1, accumulation: 0.12 },
            recovery: 1.5,
            maxAccumulation: 0.7
        });
        
        // Sniper - very high recoil but single shots
        this.recoilPatterns.set('sniper', {
            horizontal: { min: -0.15, max: 0.15, accumulation: 0.3 },
            vertical: { min: 0.2, max: 0.3, accumulation: 0.3 },
            recovery: 1.2,
            maxAccumulation: 0.5
        });
        
        // Knife - no recoil (melee weapon)
        this.recoilPatterns.set('knife', {
            horizontal: { min: 0, max: 0, accumulation: 0 },
            vertical: { min: 0, max: 0, accumulation: 0 },
            recovery: 0,
            maxAccumulation: 0
        });
    }
    
    /**
     * Update accuracy system each frame
     */
    update(deltaTime) {
        // Recover from recoil over time
        if (this.recoilAccumulation > 0) {
            const currentPattern = this.getCurrentRecoilPattern();
            const recoveryRate = currentPattern ? currentPattern.recovery : this.recoveryRate;
            
            this.recoilAccumulation = Math.max(
                0, 
                this.recoilAccumulation - (recoveryRate * deltaTime)
            );
        }
        
        // Recover from movement penalty (instant when not moving)
        // Movement penalty is updated externally via updateMovementPenalty
    }
    
    /**
     * Update movement penalty based on player velocity
     */
    updateMovementPenalty(velocity) {
        if (!velocity) {
            this.movementPenalty = 0;
            return;
        }
        
        // Calculate speed from velocity vector
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // Apply movement penalty based on speed
        // Penalty increases with speed, maxing out at sprint speed
        const normalizedSpeed = Math.min(speed / 8.0, 1.0); // 8.0 is sprint speed
        this.movementPenalty = normalizedSpeed * this.maxMovementPenalty;
    }
    
    /**
     * Add recoil when weapon fires
     */
    addRecoil(weaponType, amount = null) {
        const pattern = this.recoilPatterns.get(weaponType);
        if (!pattern) return;
        
        // Use weapon-specific recoil amount or provided amount
        const recoilAmount = amount !== null ? amount : pattern.horizontal.accumulation;
        
        // Add to recoil accumulation
        this.recoilAccumulation = Math.min(
            this.recoilAccumulation + recoilAmount,
            pattern.maxAccumulation
        );
        
        this.lastShotTime = performance.now() / 1000;
    }
    
    /**
     * Get current accuracy for a weapon
     */
    getCurrentAccuracy(weaponBaseAccuracy = 1.0) {
        // Start with weapon's base accuracy
        let currentAccuracy = weaponBaseAccuracy;
        
        // Apply movement penalty
        currentAccuracy *= (1.0 - this.movementPenalty);
        
        // Apply recoil penalty
        currentAccuracy *= (1.0 - this.recoilAccumulation);
        
        // Ensure accuracy stays within valid bounds
        return Math.max(0.1, Math.min(1.0, currentAccuracy));
    }
    
    /**
     * Get recoil pattern for current weapon
     */
    getCurrentRecoilPattern() {
        if (!this.currentWeapon) return null;
        return this.recoilPatterns.get(this.currentWeapon);
    }
    
    /**
     * Calculate shot spread based on current accuracy
     */
    calculateShotSpread(weaponBaseAccuracy = 1.0, baseSpreadAngle = 1.0) {
        const accuracy = this.getCurrentAccuracy(weaponBaseAccuracy);
        
        // Invert accuracy to get spread (lower accuracy = higher spread)
        const spreadMultiplier = (1.0 - accuracy) * 5.0; // Scale spread
        
        return baseSpreadAngle * (1.0 + spreadMultiplier);
    }
    
    /**
     * Clone direction vector (handles both BABYLON Vector3 and plain objects)
     */
    cloneDirection(direction) {
        if (direction && typeof direction.clone === 'function') {
            return direction.clone();
        }
        return { 
            x: direction.x, 
            y: direction.y, 
            z: direction.z,
            normalize() {
                const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                if (length > 0) {
                    this.x /= length;
                    this.y /= length;
                    this.z /= length;
                }
                return this;
            }
        };
    }
    
    /**
     * Apply recoil pattern to shot direction
     */
    applyRecoilToDirection(direction, weaponType) {
        const pattern = this.recoilPatterns.get(weaponType);
        if (!pattern || this.recoilAccumulation <= 0) {
            return this.cloneDirection(direction);
        }
        
        // Calculate recoil offset based on current accumulation
        const recoilStrength = this.recoilAccumulation / pattern.maxAccumulation;
        
        // Generate random recoil within pattern bounds
        const horizontalRecoil = (Math.random() - 0.5) * 2 * 
                               pattern.horizontal.max * recoilStrength;
        const verticalRecoil = pattern.vertical.min + 
                              (pattern.vertical.max - pattern.vertical.min) * 
                              Math.random() * recoilStrength;
        
        // Apply recoil to direction vector
        const recoiledDirection = this.cloneDirection(direction);
        
        // Convert recoil to radians and apply
        const horizontalRadians = horizontalRecoil * Math.PI / 180;
        const verticalRadians = verticalRecoil * Math.PI / 180;
        
        // Apply horizontal recoil (yaw)
        const cosH = Math.cos(horizontalRadians);
        const sinH = Math.sin(horizontalRadians);
        const newX = recoiledDirection.x * cosH - recoiledDirection.z * sinH;
        const newZ = recoiledDirection.x * sinH + recoiledDirection.z * cosH;
        recoiledDirection.x = newX;
        recoiledDirection.z = newZ;
        
        // Apply vertical recoil (pitch)
        const cosV = Math.cos(verticalRadians);
        const sinV = Math.sin(verticalRadians);
        const newY = recoiledDirection.y * cosV - 
                    Math.sqrt(recoiledDirection.x * recoiledDirection.x + 
                             recoiledDirection.z * recoiledDirection.z) * sinV;
        const horizontalLength = Math.sqrt(recoiledDirection.x * recoiledDirection.x + 
                                         recoiledDirection.z * recoiledDirection.z);
        const newHorizontalLength = horizontalLength * cosV + recoiledDirection.y * sinV;
        
        if (horizontalLength > 0) {
            const scale = newHorizontalLength / horizontalLength;
            recoiledDirection.x *= scale;
            recoiledDirection.z *= scale;
        }
        recoiledDirection.y = newY;
        
        // Normalize the direction
        recoiledDirection.normalize();
        
        return recoiledDirection;
    }
    
    /**
     * Set current weapon for context-aware calculations
     */
    setCurrentWeapon(weaponType) {
        this.currentWeapon = weaponType;
    }
    
    /**
     * Reset accuracy system (useful for weapon switching)
     */
    reset() {
        this.movementPenalty = 0.0;
        this.recoilAccumulation = 0.0;
        this.lastShotTime = 0;
    }
    
    /**
     * Get accuracy system state for debugging/UI
     */
    getAccuracyState() {
        return {
            baseAccuracy: this.baseAccuracy,
            movementPenalty: this.movementPenalty,
            recoilAccumulation: this.recoilAccumulation,
            currentWeapon: this.currentWeapon,
            effectiveAccuracy: this.getCurrentAccuracy()
        };
    }
    
    /**
     * Check if weapon is affected by movement
     */
    isMovementAffected() {
        return this.movementPenalty > 0.01;
    }
    
    /**
     * Check if weapon has recoil accumulation
     */
    hasRecoilAccumulation() {
        return this.recoilAccumulation > 0.01;
    }
    
    /**
     * Get time since last shot
     */
    getTimeSinceLastShot() {
        return (performance.now() / 1000) - this.lastShotTime;
    }
    
    /**
     * Dispose of accuracy system resources
     */
    dispose() {
        console.log('Disposing AccuracySystem...');
        
        this.recoilPatterns.clear();
        this.currentWeapon = null;
        
        console.log('AccuracySystem disposed');
    }
}

export default AccuracySystem;