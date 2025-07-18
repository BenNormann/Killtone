/**
 * EventEmitter - Custom event system for inter-system communication
 * Enables loose coupling between game systems
 */

export class EventEmitter {
    constructor() {
        this.events = new Map();
        this.maxListeners = 50; // Prevent memory leaks
    }

    /**
     * Register an event listener
     */
    on(event, listener, options = {}) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        const listeners = this.events.get(event);
        
        // Check max listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${event}`);
        }

        // Create listener object
        const listenerObj = {
            fn: listener,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null
        };

        listeners.push(listenerObj);
        return this;
    }

    /**
     * Register a one-time event listener
     */
    once(event, listener, options = {}) {
        return this.on(event, listener, { ...options, once: true });
    }

    /**
     * Remove event listener(s)
     */
    off(event, listener = null) {
        if (!this.events.has(event)) {
            return this;
        }

        const listeners = this.events.get(event);

        if (listener === null) {
            // Remove all listeners for this event
            this.events.delete(event);
        } else {
            // Remove specific listener
            const index = listeners.findIndex(l => l.fn === listener);
            if (index !== -1) {
                listeners.splice(index, 1);
                
                // Clean up empty event arrays
                if (listeners.length === 0) {
                    this.events.delete(event);
                }
            }
        }

        return this;
    }

    /**
     * Emit an event to all listeners
     */
    emit(event, ...args) {
        if (!this.events.has(event)) {
            return false;
        }

        const listeners = this.events.get(event);
        const toRemove = [];

        // Call all listeners
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i];
            
            try {
                // Call with context if provided
                if (listener.context) {
                    listener.fn.call(listener.context, ...args);
                } else {
                    listener.fn(...args);
                }

                // Mark one-time listeners for removal
                if (listener.once) {
                    toRemove.push(i);
                }
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        }

        // Remove one-time listeners (in reverse order to maintain indices)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            listeners.splice(toRemove[i], 1);
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(event);
        }

        return true;
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.events.clear();
        return this;
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.removeAllListeners();
        this.events = null;
    }
}
