/**
 * KILLtONE Game Framework - AmmoUI
 * On-screen ammunition counter display with real-time updates
 */

// BABYLON is loaded globally from CDN in index.html
import { GameConfig } from '../mainConfig.js';
import { WeaponType } from './WeaponConfig.js';

export class AmmoUI {
    constructor(scene, fullscreenUI) {
        this.scene = scene;
        this.fullscreenUI = fullscreenUI;
        
        // UI elements
        this.ammoContainer = null;
        this.ammoText = null;
        this.weaponNameText = null;
        this.reloadIndicator = null;
        this.lowAmmoIndicator = null;
        
        // Current state
        this.currentWeaponType = null;
        this.currentAmmo = 0;
        this.maxAmmo = 0;
        this.isReloading = false;
        this.isInfiniteAmmo = false;
        this.isVisible = false;
        
        // Animation properties
        this.blinkTimer = 0;
        this.blinkInterval = 0.5; // seconds
        this.isBlinking = false;
        
        // Events
        this.onAmmoDisplayUpdate = null;
        
        console.log('AmmoUI initialized');
    }
    
    /**
     * Initialize the ammunition UI display
     */
    initialize() {
        this.createAmmoDisplay();
        console.log('AmmoUI display created');
    }
    
    /**
     * Create the ammunition display elements
     */
    createAmmoDisplay() {
        // Create main ammo container
        this.ammoContainer = new BABYLON.GUI.Rectangle("ammoContainer");
        this.ammoContainer.widthInPixels = 250;
        this.ammoContainer.heightInPixels = 80;
        this.ammoContainer.color = "transparent";
        this.ammoContainer.background = "transparent";
        this.ammoContainer.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.ammoContainer.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.ammoContainer.left = "-20px";
        this.ammoContainer.top = "-20px";
        this.ammoContainer.isVisible = false;
        this.fullscreenUI.addControl(this.ammoContainer);
        
        // Create weapon name display
        this.weaponNameText = new BABYLON.GUI.TextBlock("weaponNameText");
        this.weaponNameText.text = "";
        this.weaponNameText.color = GameConfig.theme.colors.textSecondary;
        this.weaponNameText.fontSize = 14;
        this.weaponNameText.fontFamily = GameConfig.theme.fonts.primary;
        this.weaponNameText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.weaponNameText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.weaponNameText.top = "0px";
        this.ammoContainer.addControl(this.weaponNameText);
        
        // Create main ammo text display
        this.ammoText = new BABYLON.GUI.TextBlock("ammoText");
        this.ammoText.text = "0/0";
        this.ammoText.color = GameConfig.theme.colors.textPrimary;
        this.ammoText.fontSize = 24;
        this.ammoText.fontFamily = GameConfig.theme.fonts.primary;
        this.ammoText.fontWeight = "bold";
        this.ammoText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.ammoText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.ammoText.top = "5px";
        this.ammoContainer.addControl(this.ammoText);
        
        // Create reload indicator
        this.reloadIndicator = new BABYLON.GUI.TextBlock("reloadIndicator");
        this.reloadIndicator.text = "RELOADING...";
        this.reloadIndicator.color = GameConfig.theme.colors.warning;
        this.reloadIndicator.fontSize = 16;
        this.reloadIndicator.fontFamily = GameConfig.theme.fonts.primary;
        this.reloadIndicator.fontWeight = "bold";
        this.reloadIndicator.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.reloadIndicator.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.reloadIndicator.top = "-5px";
        this.reloadIndicator.isVisible = false;
        this.ammoContainer.addControl(this.reloadIndicator);
        
        // Create low ammo warning background
        this.lowAmmoIndicator = new BABYLON.GUI.Rectangle("lowAmmoIndicator");
        this.lowAmmoIndicator.widthInPixels = 250;
        this.lowAmmoIndicator.heightInPixels = 80;
        this.lowAmmoIndicator.color = "transparent";
        this.lowAmmoIndicator.background = GameConfig.theme.colors.danger;
        this.lowAmmoIndicator.alpha = 0.3;
        this.lowAmmoIndicator.cornerRadius = GameConfig.theme.borderRadius.small;
        this.lowAmmoIndicator.isVisible = false;
        this.ammoContainer.addControl(this.lowAmmoIndicator);
        
        // Ensure text elements are on top
        this.ammoContainer.removeControl(this.weaponNameText);
        this.ammoContainer.removeControl(this.ammoText);
        this.ammoContainer.removeControl(this.reloadIndicator);
        this.ammoContainer.addControl(this.weaponNameText);
        this.ammoContainer.addControl(this.ammoText);
        this.ammoContainer.addControl(this.reloadIndicator);
    }
    
    /**
     * Update the ammunition display for a specific weapon
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @param {number} current - Current ammunition count
     * @param {number} max - Maximum ammunition capacity
     */
    updateDisplay(weaponType, current, max) {
        if (!this.ammoContainer) return;
        
        this.currentWeaponType = weaponType;
        this.currentAmmo = current;
        this.maxAmmo = max;
        this.isInfiniteAmmo = max === Infinity;
        
        // Update weapon name
        const weaponName = this.getWeaponDisplayName(weaponType);
        this.weaponNameText.text = weaponName.toUpperCase();
        
        // Update ammo text based on weapon type
        if (this.isInfiniteAmmo) {
            this.showInfiniteAmmo();
        } else {
            this.ammoText.text = `${current}/${max}`;
            this.ammoText.color = this.getAmmoColor(current, max);
        }
        
        // Update low ammo warning
        this.updateLowAmmoWarning(current, max);
        
        // Show the display if hidden
        if (!this.isVisible) {
            this.show();
        }
        
        // Trigger update event
        if (this.onAmmoDisplayUpdate) {
            this.onAmmoDisplayUpdate(weaponType, current, max);
        }
    }
    
    /**
     * Show infinite ammunition display (for knife)
     */
    showInfiniteAmmo() {
        if (!this.ammoText) return;
        
        this.ammoText.text = "∞";
        this.ammoText.color = GameConfig.theme.colors.textPrimary;
        this.ammoText.fontSize = 32;
        
        // Hide low ammo warning for infinite weapons
        this.hideLowAmmoWarning();
    }
    
    /**
     * Show reload indicator
     */
    showReloadIndicator() {
        if (!this.reloadIndicator) return;
        
        this.isReloading = true;
        this.reloadIndicator.isVisible = true;
        this.startBlinking(this.reloadIndicator);
        
        console.log('Showing reload indicator');
    }
    
    /**
     * Hide reload indicator
     */
    hideReloadIndicator() {
        if (!this.reloadIndicator) return;
        
        this.isReloading = false;
        this.reloadIndicator.isVisible = false;
        this.stopBlinking();
        
        console.log('Hiding reload indicator');
    }
    
    /**
     * Highlight low ammunition warning
     */
    highlightLowAmmo() {
        if (!this.lowAmmoIndicator || this.isInfiniteAmmo) return;
        
        this.lowAmmoIndicator.isVisible = true;
        this.startBlinking(this.lowAmmoIndicator);
        
        console.log('Highlighting low ammo warning');
    }
    
    /**
     * Hide low ammunition warning
     */
    hideLowAmmoWarning() {
        if (!this.lowAmmoIndicator) return;
        
        this.lowAmmoIndicator.isVisible = false;
        this.stopBlinking();
    }
    
    /**
     * Update low ammo warning based on current ammunition
     * @param {number} current - Current ammunition count
     * @param {number} max - Maximum ammunition capacity
     */
    updateLowAmmoWarning(current, max) {
        if (this.isInfiniteAmmo) {
            this.hideLowAmmoWarning();
            return;
        }
        
        const ammoPercentage = (current / max) * 100;
        
        if (current === 0) {
            // Empty magazine - show critical warning
            this.highlightLowAmmo();
            this.ammoText.color = GameConfig.theme.colors.danger;
        } else if (ammoPercentage <= 25) {
            // Low ammo - show warning
            this.highlightLowAmmo();
        } else {
            // Normal ammo levels
            this.hideLowAmmoWarning();
        }
    }
    
    /**
     * Get appropriate color for ammunition display
     * @param {number} current - Current ammunition count
     * @param {number} max - Maximum ammunition capacity
     * @returns {string} - Color string
     */
    getAmmoColor(current, max) {
        if (current === 0) {
            return GameConfig.theme.colors.danger;
        }
        
        const percentage = (current / max) * 100;
        
        if (percentage <= 25) {
            return GameConfig.theme.colors.warning;
        } else if (percentage <= 50) {
            return GameConfig.theme.colors.textSecondary;
        } else {
            return GameConfig.theme.colors.textPrimary;
        }
    }
    
    /**
     * Get display name for weapon type
     * @param {string} weaponType - The weapon type from WeaponType enum
     * @returns {string} - Display name
     */
    getWeaponDisplayName(weaponType) {
        const displayNames = {
            [WeaponType.CARBINE]: 'Carbine',
            [WeaponType.PISTOL]: 'Pistol',
            [WeaponType.SHOTGUN]: 'Shotgun',
            [WeaponType.SMG]: 'SMG',
            [WeaponType.SNIPER]: 'Sniper',
            [WeaponType.KNIFE]: 'Knife'
        };
        
        return displayNames[weaponType] || 'Unknown';
    }
    
    /**
     * Start blinking animation for an element
     * @param {BABYLON.GUI.Control} element - Element to blink
     */
    startBlinking(element) {
        if (!element) return;
        
        this.isBlinking = true;
        this.blinkTimer = 0;
        
        // Start blink animation loop
        this.blinkAnimation(element);
    }
    
    /**
     * Stop blinking animation
     */
    stopBlinking() {
        this.isBlinking = false;
        this.blinkTimer = 0;
    }
    
    /**
     * Blink animation loop
     * @param {BABYLON.GUI.Control} element - Element to blink
     */
    blinkAnimation(element) {
        if (!this.isBlinking || !element) return;
        
        // Toggle visibility based on timer
        const shouldShow = Math.floor(this.blinkTimer / this.blinkInterval) % 2 === 0;
        element.alpha = shouldShow ? 1.0 : 0.3;
        
        // Continue animation
        setTimeout(() => {
            this.blinkAnimation(element);
        }, 100); // Update every 100ms
    }
    
    /**
     * Update animation timers
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (this.isBlinking) {
            this.blinkTimer += deltaTime;
        }
    }
    
    /**
     * Show the ammunition display
     */
    show() {
        if (this.ammoContainer) {
            this.ammoContainer.isVisible = true;
            this.isVisible = true;
        }
    }
    
    /**
     * Hide the ammunition display
     */
    hide() {
        if (this.ammoContainer) {
            this.ammoContainer.isVisible = false;
            this.isVisible = false;
        }
    }
    
    /**
     * Set visibility of the ammunition display
     * @param {boolean} visible - Whether to show or hide the display
     */
    setVisible(visible) {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    /**
     * Get current display state
     * @returns {object} - Current display state information
     */
    getDisplayState() {
        return {
            weaponType: this.currentWeaponType,
            currentAmmo: this.currentAmmo,
            maxAmmo: this.maxAmmo,
            isInfiniteAmmo: this.isInfiniteAmmo,
            isReloading: this.isReloading,
            isVisible: this.isVisible,
            isBlinking: this.isBlinking
        };
    }
    
    /**
     * Reset the display to default state
     */
    reset() {
        this.currentWeaponType = null;
        this.currentAmmo = 0;
        this.maxAmmo = 0;
        this.isReloading = false;
        this.isInfiniteAmmo = false;
        
        this.hideReloadIndicator();
        this.hideLowAmmoWarning();
        
        if (this.ammoText) {
            this.ammoText.text = "0/0";
            this.ammoText.color = GameConfig.theme.colors.textPrimary;
            this.ammoText.fontSize = 24;
        }
        
        if (this.weaponNameText) {
            this.weaponNameText.text = "";
        }
        
        console.log('AmmoUI reset to default state');
    }
    
    /**
     * Dispose of the AmmoUI
     */
    dispose() {
        console.log('Disposing AmmoUI...');
        
        this.stopBlinking();
        
        // Remove UI elements
        if (this.ammoContainer && this.fullscreenUI) {
            this.fullscreenUI.removeControl(this.ammoContainer);
        }
        
        // Clear references
        this.ammoContainer = null;
        this.ammoText = null;
        this.weaponNameText = null;
        this.reloadIndicator = null;
        this.lowAmmoIndicator = null;
        this.scene = null;
        this.fullscreenUI = null;
        this.onAmmoDisplayUpdate = null;
        
        console.log('AmmoUI disposed');
    }
}

export default AmmoUI;