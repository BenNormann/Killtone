/**
 * KILLtONE Game Framework - HUD Module Exports
 * Central export point for all HUD components
 */

export { HUDConfig } from './HUDConfig.js';
export { HUDManager } from './HUDManager.js';
export { CrosshairComponent } from './CrosshairComponent.js';
export { LeftInfoPanel } from './LeftInfoPanel.js';
export { RightInfoPanel } from './RightInfoPanel.js';

// Import the classes for the factory function
import { HUDManager } from './HUDManager.js';
import { CrosshairComponent } from './CrosshairComponent.js';
import { LeftInfoPanel } from './LeftInfoPanel.js';
import { RightInfoPanel } from './RightInfoPanel.js';

/**
 * Create and configure a complete HUD system
 * @param {Object} game - Game instance
 * @returns {HUDManager} Configured HUD manager
 */
export function createHUDSystem(game) {
    const hudManager = new HUDManager(game);
    
    // Register default components
    hudManager.registerComponent('crosshair', new CrosshairComponent(), 100);
    hudManager.registerComponent('leftPanel', new LeftInfoPanel(), 10);
    hudManager.registerComponent('rightPanel', new RightInfoPanel(), 10);
    
    return hudManager;
}