/**
 * NetworkMessageHandler - Handles message routing and processing
 * Manages message handlers and provides message processing utilities
 */

export class NetworkMessageHandler {
    constructor() {
        // Message handling
        this.messageHandlers = new Map();
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.messageId = 0;
        
        // Statistics
        this.messagesReceived = 0;
        this.messagesSent = 0;
        this.bytesReceived = 0;
        this.bytesSent = 0;
    }

    /**
     * Register a message handler for a specific message type
     * @param {string} messageType - Type of message to handle
     * @param {Function} handler - Handler function
     */
    registerHandler(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }

    /**
     * Unregister a message handler
     * @param {string} messageType - Type of message to unregister
     */
    unregisterHandler(messageType) {
        this.messageHandlers.delete(messageType);
    }

    /**
     * Handle incoming message
     * @param {string} data - Raw message data
     */
    async handleMessage(data) {
        try {
            const message = JSON.parse(data);
            this.messagesReceived++;
            this.bytesReceived += data.length;
            
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                await handler(message.data, message);
            } else {
                console.warn('Unhandled message type:', message.type);
            }
            
        } catch (error) {
            console.error('Failed to parse message:', error, data);
        }
    }

    /**
     * Process a structured message object
     * @param {Object} message - Message object with type and data
     */
    async processMessage(message) {
        this.messagesReceived++;
        
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            try {
                await handler(message.data, message);
            } catch (error) {
                console.error(`Error handling message type ${message.type}:`, error);
            }
        } else {
            console.warn('Unhandled message type:', message.type);
        }
    }

    /**
     * Create a message object
     * @param {string} type - Message type
     * @param {*} data - Message data
     * @param {string} targetId - Optional target player ID
     * @returns {Object} Message object
     */
    createMessage(type, data = {}, targetId = null) {
        const message = {
            id: this.generateMessageId(),
            type: type,
            data: data,
            timestamp: Date.now()
        };

        if (targetId) {
            message.targetId = targetId;
        }

        return message;
    }

    /**
     * Generate unique message ID
     * @returns {string} Unique message ID
     */
    generateMessageId() {
        return `msg_${this.messageId++}_${Date.now()}`;
    }

    /**
     * Queue a message for later processing
     * @param {Object} message - Message to queue
     */
    queueMessage(message) {
        this.messageQueue.push(message);
    }

    /**
     * Process all queued messages
     */
    async processQueuedMessages() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            await this.processMessage(message);
        }
    }

    /**
     * Add a message to pending messages (waiting for response)
     * @param {string} messageId - Message ID
     * @param {Object} messageData - Message data
     */
    addPendingMessage(messageId, messageData) {
        this.pendingMessages.set(messageId, {
            ...messageData,
            timestamp: Date.now()
        });
    }

    /**
     * Remove a pending message
     * @param {string} messageId - Message ID to remove
     * @returns {Object|null} Removed message data or null
     */
    removePendingMessage(messageId) {
        const message = this.pendingMessages.get(messageId);
        if (message) {
            this.pendingMessages.delete(messageId);
            return message;
        }
        return null;
    }

    /**
     * Clean up old pending messages
     * @param {number} maxAge - Maximum age in milliseconds (default: 30 seconds)
     */
    cleanupPendingMessages(maxAge = 30000) {
        const now = Date.now();
        const expiredMessages = [];
        
        for (const [messageId, message] of this.pendingMessages) {
            if (now - message.timestamp > maxAge) {
                expiredMessages.push(messageId);
            }
        }
        
        expiredMessages.forEach(messageId => {
            this.pendingMessages.delete(messageId);
        });
        
        if (expiredMessages.length > 0) {
            console.log(`Cleaned up ${expiredMessages.length} expired pending messages`);
        }
    }

    /**
     * Get message statistics
     * @returns {Object} Message statistics
     */
    getStats() {
        return {
            messagesReceived: this.messagesReceived,
            messagesSent: this.messagesSent,
            bytesReceived: this.bytesReceived,
            bytesSent: this.bytesSent,
            queuedMessages: this.messageQueue.length,
            pendingMessages: this.pendingMessages.size,
            registeredHandlers: this.messageHandlers.size
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.messagesReceived = 0;
        this.messagesSent = 0;
        this.bytesReceived = 0;
        this.bytesSent = 0;
    }

    /**
     * Update sent message statistics
     * @param {number} bytes - Number of bytes sent
     */
    updateSentStats(bytes = 0) {
        this.messagesSent++;
        this.bytesSent += bytes;
    }

    /**
     * Get all registered message types
     * @returns {Array<string>} Array of registered message types
     */
    getRegisteredTypes() {
        return Array.from(this.messageHandlers.keys());
    }

    /**
     * Clear all message handlers
     */
    clearHandlers() {
        this.messageHandlers.clear();
    }

    /**
     * Dispose of the message handler
     */
    dispose() {
        this.clearHandlers();
        this.messageQueue = [];
        this.pendingMessages.clear();
        this.resetStats();
    }
}