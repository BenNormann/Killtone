/**
 * KILLtONE Game Framework - HUD Configuration
 * Centralized configuration for HUD colors, transparency, and styling
 */

import { GameConfig } from '../mainConfig.js';

export class HUDConfig {
    constructor() {
        // Global HUD styling (from main config)
        this.HUD_COLOR = GameConfig.hud.color;
        this.HUD_ALPHA = GameConfig.hud.alpha;
        
        // Secondary colors for different states
        this.HUD_COLOR_WARNING = GameConfig.hud.colorWarning;
        this.HUD_COLOR_DANGER = GameConfig.hud.colorDanger;
        this.HUD_COLOR_SUCCESS = GameConfig.hud.colorSuccess;
        
        // Text properties
        this.HUD_FONT_SIZE_SMALL = 12;
        this.HUD_FONT_SIZE_MEDIUM = 16;
        this.HUD_FONT_SIZE_LARGE = 24;
        this.HUD_FONT_FAMILY = 'Orbitron, monospace';
        
        // Angled text properties
        this.ANGLED_TEXT_ROTATION = {
            x: -0.1,  // Pitch angle for forward tilt
            y: 0,     // Yaw angle
            z: 0      // Roll angle
        };
        
        // Position offsets for left/right panels
        this.LEFT_PANEL_OFFSET = { x: -0.8, y: -.2, z: 0.7 };
        this.RIGHT_PANEL_OFFSET = { x: 0.8, y: -.2, z: 0.7 };
        
        // Crosshair configuration (from main config)
        this.CROSSHAIR = {
            thickness: GameConfig.hud.crosshair.thickness,
            length: GameConfig.hud.crosshair.length,
            gap: GameConfig.hud.crosshair.gap,
            style: GameConfig.hud.crosshair.style
        };
        
        // Performance update intervals (from main config)
        this.UPDATE_INTERVALS = {
            performance: GameConfig.hud.updateIntervals.performance,
            audio: GameConfig.hud.updateIntervals.audio,
            player: GameConfig.hud.updateIntervals.player
        };
    }
    
    /**
     * Set the global HUD color
     * @param {string} color - Hex color string
     */
    setHUDColor(color) {
        this.HUD_COLOR = color;
    }
    
    /**
     * Set the global HUD alpha
     * @param {number} alpha - Alpha value (0-1)
     */
    setHUDAlpha(alpha) {
        this.HUD_ALPHA = Math.max(0, Math.min(1, alpha));
    }
    
    /**
     * Get color with current alpha applied
     * @param {string} color - Base color
     * @returns {string} RGBA color string
     */
    getColorWithAlpha(color = this.HUD_COLOR) {
        // Convert hex to RGB and apply alpha
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${this.HUD_ALPHA})`;
    }
    
    /**
     * Get Babylon.js Color3 with alpha
     * @param {string} color - Base color
     * @returns {BABYLON.Color4} Babylon color with alpha
     */
    getBabylonColorWithAlpha(color = this.HUD_COLOR) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return new BABYLON.Color4(r, g, b, this.HUD_ALPHA);
    }
    
    /**
     * Get Babylon.js Color3 without alpha
     * @param {string} color - Base color
     * @returns {BABYLON.Color3} Babylon color
     */
    getBabylonColor(color = this.HUD_COLOR) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        return new BABYLON.Color3(r, g, b);
    }
}