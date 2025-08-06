/**
 * KILLtONE Game Framework - HUD Manager
 * Central manager for all HUD components with modular registration system
 */

import { HUDConfig } from './HUDConfig.js';
import { BaseManager } from '../engine/BaseManager.js';

export class HUDManager extends BaseManager {
    constructor(game) {
        super(game);
        
        // HUD configuration
        this.config = new HUDConfig();
        
        // Component registry
        this.components = new Map();
        this.componentOrder = [];
        
        // Update timing
        this.lastPerformanceUpdate = 0;
        this.lastAudioUpdate = 0;
        this.lastPlayerUpdate = 0;
        
        // HUD state
        this.isVisible = true;
        this.isInitialized = false;
        
        // Babylon.js references
        this.scene = game.scene;
        this.camera = game.camera;
        
        console.log('HUDManager initialized');
    }
    
    /**
     * Initialize the HUD system
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('HUDManager already initialized');
            return;
        }
        
        try {
            console.log('Initializing HUD system...');
            
            // Initialize all registered components
            for (const [name, component] of this.components) {
                if (component.initialize) {
                    await component.initialize();
                    console.log(`HUD component '${name}' initialized`);
                }
            }
            
            this.isInitialized = true;
            console.log('HUD system initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize HUD system:', error);
            throw error;
        }
    }
    
    /**
     * Register a HUD component
     * @param {string} name - Component name
     * @param {Object} component - Component instance
     * @param {number} order - Display order (lower = rendered first)
     */
    registerComponent(name, component, order = 0) {
        if (this.components.has(name)) {
            console.warn(`HUD component '${name}' already registered, replacing`);
        }
        
        // Set component references
        component.game = this.game;
        component.scene = this.scene;
        component.camera = this.camera;
        component.config = this.config;
        component.hudManager = this;
        
        this.components.set(name, component);
        
        // Update order list
        this.componentOrder = Array.from(this.components.keys())
            .sort((a, b) => {
                const compA = this.components.get(a);
                const compB = this.components.get(b);
                return (compA.order || 0) - (compB.order || 0);
            });
        
        console.log(`HUD component '${name}' registered with order ${order}`);
    }
    
    /**
     * Unregister a HUD component
     * @param {string} name - Component name
     */
    unregisterComponent(name) {
        const component = this.components.get(name);
        if (component) {
            if (component.dispose) {
                component.dispose();
            }
            this.components.delete(name);
            this.componentOrder = this.componentOrder.filter(n => n !== name);
            console.log(`HUD component '${name}' unregistered`);
        }
    }
    
    /**
     * Get a registered component
     * @param {string} name - Component name
     * @returns {Object|null} Component instance
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }
    
    /**
     * Update all HUD components
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.isVisible) {
            return;
        }
        
        const now = performance.now();
        
        // Determine what needs updating based on intervals
        const shouldUpdatePerformance = now - this.lastPerformanceUpdate >= this.config.UPDATE_INTERVALS.performance;
        const shouldUpdateAudio = now - this.lastAudioUpdate >= this.config.UPDATE_INTERVALS.audio;
        const shouldUpdatePlayer = now - this.lastPlayerUpdate >= this.config.UPDATE_INTERVALS.player;
        
        // Update components in order
        for (const name of this.componentOrder) {
            const component = this.components.get(name);
            if (component && component.update) {
                try {
                    component.update(deltaTime, {
                        shouldUpdatePerformance,
                        shouldUpdateAudio,
                        shouldUpdatePlayer
                    });
                } catch (error) {
                    console.error(`Error updating HUD component '${name}':`, error);
                }
            }
        }
        
        // Update timing
        if (shouldUpdatePerformance) this.lastPerformanceUpdate = now;
        if (shouldUpdateAudio) this.lastAudioUpdate = now;
        if (shouldUpdatePlayer) this.lastPlayerUpdate = now;
    }
    
    /**
     * Show the HUD
     */
    show() {
        this.isVisible = true;
        for (const [name, component] of this.components) {
            if (component.show) {
                component.show();
            }
        }
    }
    
    /**
     * Hide the HUD
     */
    hide() {
        this.isVisible = false;
        for (const [name, component] of this.components) {
            if (component.hide) {
                component.hide();
            }
        }
    }
    
    /**
     * Set HUD visibility
     * @param {boolean} visible - Visibility state
     */
    setVisible(visible) {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    /**
     * Update HUD color scheme
     * @param {string} color - New HUD color
     */
    setHUDColor(color) {
        this.config.setHUDColor(color);
        
        // Notify all components of color change
        for (const [name, component] of this.components) {
            if (component.onColorChange) {
                component.onColorChange(color);
            }
        }
    }
    
    /**
     * Update HUD transparency
     * @param {number} alpha - New alpha value (0-1)
     */
    setHUDAlpha(alpha) {
        this.config.setHUDAlpha(alpha);
        
        // Notify all components of alpha change
        for (const [name, component] of this.components) {
            if (component.onAlphaChange) {
                component.onAlphaChange(alpha);
            }
        }
    }
    
    /**
     * Get current HUD configuration
     * @returns {HUDConfig} Current configuration
     */
    getConfig() {
        return this.config;
    }
    
    /**
     * Dispose of the HUD system
     */
    dispose() {
        console.log('Disposing HUD system...');
        
        // Dispose all components
        for (const [name, component] of this.components) {
            if (component.dispose) {
                component.dispose();
            }
        }
        
        this.components.clear();
        this.componentOrder = [];
        this.isInitialized = false;
        
        console.log('HUD system disposed');
    }
}