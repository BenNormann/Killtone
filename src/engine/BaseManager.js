/**
 * BaseManager - Base class for all game managers
 * Provides common lifecycle methods and patterns
 */

export class BaseManager {
    constructor(game) {
        this.game = game;
        this.scene = game?.scene || null;
        this.isInitialized = false;
        this.isDisposed = false;
        
        // Common event callbacks
        this.onInitialized = null;
        this.onDisposed = null;
        this.onError = null;
    }

    /**
     * Initialize the manager - override in subclasses
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn(`${this.constructor.name} already initialized`);
            return;
        }

        try {
            console.log(`Initializing ${this.constructor.name}...`);
            
            // Call subclass initialization
            await this._doInitialize();
            
            this.isInitialized = true;
            console.log(`${this.constructor.name} initialized`);
            
            // Trigger callback
            if (this.onInitialized) {
                this.onInitialized();
            }
        } catch (error) {
            console.error(`Failed to initialize ${this.constructor.name}:`, error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * Subclass-specific initialization - override in subclasses
     * @protected
     */
    async _doInitialize() {
        // Override in subclasses
    }

    /**
     * Update method called from game loop - override in subclasses
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        if (!this.isInitialized || this.isDisposed) {
            return;
        }
        
        // Call subclass update
        this._doUpdate(deltaTime);
    }

    /**
     * Subclass-specific update - override in subclasses
     * @param {number} deltaTime - Time elapsed since last update
     * @protected
     */
    _doUpdate(deltaTime) {
        // Override in subclasses
    }

    /**
     * Dispose of the manager and clean up resources
     */
    dispose() {
        if (this.isDisposed) {
            console.warn(`${this.constructor.name} already disposed`);
            return;
        }

        try {
            console.log(`Disposing ${this.constructor.name}...`);
            
            // Call subclass disposal
            this._doDispose();
            
            this.isDisposed = true;
            this.isInitialized = false;
            
            console.log(`${this.constructor.name} disposed`);
            
            // Trigger callback
            if (this.onDisposed) {
                this.onDisposed();
            }
        } catch (error) {
            console.error(`Error disposing ${this.constructor.name}:`, error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    /**
     * Subclass-specific disposal - override in subclasses
     * @protected
     */
    _doDispose() {
        // Override in subclasses
    }

    /**
     * Check if manager is ready for use
     * @returns {boolean}
     */
    isReady() {
        return this.isInitialized && !this.isDisposed;
    }

    /**
     * Get manager status information
     * @returns {Object}
     */
    getStatus() {
        return {
            name: this.constructor.name,
            initialized: this.isInitialized,
            disposed: this.isDisposed,
            ready: this.isReady()
        };
    }
}