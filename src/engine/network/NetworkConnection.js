/**
 * NetworkConnection - Handles Socket.IO connection management
 * Manages connection, disconnection, and reconnection logic
 */

import { GameConfig } from '../../mainConfig.js';

export class NetworkConnection {
    constructor() {
        // Connection state
        this.isConnected = false;
        this.socket = null;
        this.serverURL = window.location.origin;
        
        // Reconnection settings
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = GameConfig.network.reconnectAttempts;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        
        // Network settings
        this.timeout = GameConfig.network.timeout;
        
        // Event callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onError = null;
    }

    /**
     * Connect to the server
     * @param {string} playerName - Player name for connection
     * @returns {Promise} Promise resolving when connected
     */
    async connect(playerName = 'Player') {
        if (this.isConnected || this.socket) {
            console.warn('Already connected or connecting');
            return Promise.reject(new Error('Already connected'));
        }
        
        return new Promise(async (resolve, reject) => {
            try {
                console.log(`Connecting to ${this.serverURL}...`);
                
                // Load Socket.IO client library
                if (typeof io === 'undefined') {
                    await this.loadSocketIO();
                }
                
                // Create Socket.IO connection
                this.socket = io(this.serverURL, {
                    transports: ['websocket', 'polling'],
                    timeout: this.timeout
                });
                
                // Set up basic connection handlers
                this.setupConnectionHandlers(resolve, reject);
                
            } catch (error) {
                console.error('Failed to create Socket.IO connection:', error);
                reject(error);
            }
        });
    }

    /**
     * Load Socket.IO client library
     * @returns {Promise} Promise resolving when library is loaded
     */
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Socket.IO client'));
            document.head.appendChild(script);
        });
    }

    /**
     * Set up basic connection event handlers
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    setupConnectionHandlers(resolve, reject) {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            
            const connectionData = { playerId: this.socket.id };
            
            if (this.onConnected) {
                this.onConnected(connectionData);
            }
            
            resolve(connectionData);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            reject(error);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.handleDisconnection({ reason });
        });
    }

    /**
     * Register additional event handler on the socket
     * @param {string} event - Event name
     * @param {Function} handler - Event handler function
     */
    on(event, handler) {
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }

    /**
     * Emit an event to the server
     * @param {string} event - Event name
     * @param {*} data - Data to send
     * @returns {Promise} Promise resolving when sent
     */
    emit(event, data = {}) {
        if (!this.socket || !this.isConnected) {
            console.warn('Cannot emit: not connected');
            return Promise.reject(new Error('Not connected'));
        }
        
        try {
            this.socket.emit(event, data);
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to emit event:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Disconnect from the server
     */
    disconnect() {
        if (this.socket) {
            console.log('Disconnecting from server...');
            
            // Send disconnect message if connected
            if (this.isConnected) {
                this.emit('disconnect', {
                    timestamp: Date.now()
                });
            }
            
            // Close connection
            this.socket.close(1000, 'Client disconnect');
            this.socket = null;
        }
        
        this.cleanup();
    }

    /**
     * Handle disconnection event
     * @param {Object} event - Disconnection event data
     */
    handleDisconnection(event) {
        console.log('Disconnected from server:', event.reason);
        
        const wasConnected = this.isConnected;
        this.cleanup();
        
        // Trigger callback
        if (wasConnected && this.onDisconnected) {
            this.onDisconnected(event.reason);
        }
        
        // Attempt reconnection if not intentional
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
        }
    }

    /**
     * Attempt to reconnect to the server
     */
    attemptReconnection() {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect()
                    .then(() => {
                        console.log('Reconnection successful');
                    })
                    .catch((error) => {
                        console.error('Reconnection failed:', error);
                        
                        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                            console.error('Max reconnection attempts reached');
                            if (this.onError) {
                                this.onError('Max reconnection attempts reached');
                            }
                        }
                    });
            }
        }, delay);
    }

    /**
     * Clean up connection state
     */
    cleanup() {
        this.isConnected = false;
    }

    /**
     * Get connection status
     * @returns {Object} Connection status information
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            playerId: this.socket?.id || null,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Dispose of the connection
     */
    dispose() {
        this.disconnect();
        
        // Clear callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onError = null;
    }
}