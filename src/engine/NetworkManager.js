/**
 * NetworkManager - Refactored multiplayer communication manager
 * Coordinates between NetworkConnection, NetworkMessageHandler, NetworkPlayerManager, and NetworkStats
 */

import { GameConfig } from '../mainConfig.js';
import { BaseManager } from './BaseManager.js';
import { NetworkConnection } from './network/NetworkConnection.js';
import { NetworkMessageHandler } from './network/NetworkMessageHandler.js';
import { NetworkPlayerManager } from './network/NetworkPlayerManager.js';
import { NetworkStats } from './network/NetworkStats.js';

export class NetworkManager extends BaseManager {
    constructor(game) {
        super(game);
        
        // Core components
        this.connection = new NetworkConnection();
        this.messageHandler = new NetworkMessageHandler();
        this.playerManager = new NetworkPlayerManager(game);
        this.stats = new NetworkStats();
        
        // Connection state
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.sessionId = null;
        
        // Network settings from config
        this.tickRate = GameConfig.network.tickRate;
        this.interpolationDelay = GameConfig.network.interpolationDelay;
        
        // Event callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        this.onError = null;
        
        // Initialize components
        this.initializeComponents();
    }

    /**
     * Initialize all network components
     */
    initializeComponents() {
        // Set up connection callbacks
        this.connection.onConnected = (data) => this.handleConnectionEstablished(data);
        this.connection.onDisconnected = (reason) => this.handleDisconnection(reason);
        this.connection.onError = (error) => this.handleNetworkError(error);
        
        // Set up player manager callbacks
        this.playerManager.onPlayerJoined = (data) => {
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        };
        this.playerManager.onPlayerLeft = (data) => {
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        };
        this.playerManager.onStateUpdate = (data) => {
            if (this.onStateUpdate) this.onStateUpdate(data);
        };
        
        // Set up player manager settings
        this.playerManager.setTickRate(this.tickRate);
        this.playerManager.setInterpolationDelay(this.interpolationDelay);
        
        // Register message handlers
        this.registerMessageHandlers();
        
        console.log('NetworkManager components initialized');
    }

    /**
     * Register all message handlers
     */
    registerMessageHandlers() {
        // Connection handlers
        this.messageHandler.registerHandler('connectionEstablished', (data) => this.handleConnectionEstablished(data));
        this.messageHandler.registerHandler('connectionRejected', (data) => this.handleConnectionRejected(data));
        
        // Player handlers
        this.messageHandler.registerHandler('playerJoined', (data) => {
            console.log('DEBUG: NetworkManager received playerJoined event:', data);
            this.playerManager.handlePlayerJoined(data);
        });
        this.messageHandler.registerHandler('playerConnected', (data) => {
            console.log('DEBUG: NetworkManager received playerConnected event:', data);
            this.playerManager.handleNewPlayerConnected(data);
        });
        this.messageHandler.registerHandler('playerDisconnected', (playerId) => {
            console.log('DEBUG: NetworkManager received playerDisconnected event:', playerId);
            this.playerManager.handlePlayerDisconnected(playerId);
        });
        this.messageHandler.registerHandler('playerMoved', (data) => this.playerManager.handlePlayerMoved(data));
        this.messageHandler.registerHandler('playerKilled', (data) => this.playerManager.handlePlayerKilled(data));
        this.messageHandler.registerHandler('playerRespawned', (data) => this.playerManager.handlePlayerRespawned(data));
        this.messageHandler.registerHandler('playerDamaged', (data) => this.playerManager.handlePlayerDamaged(data));
        this.messageHandler.registerHandler('playerHealthUpdated', (data) => this.playerManager.handlePlayerHealthUpdated(data));
        this.messageHandler.registerHandler('playerUsernameUpdated', (data) => this.playerManager.handlePlayerUsernameUpdated(data));
        this.messageHandler.registerHandler('playerState', (data) => this.playerManager.handlePlayerState(data));
        
        // Game handlers
        this.messageHandler.registerHandler('gameState', (data) => this.handleGameState(data));
        this.messageHandler.registerHandler('worldUpdate', (data) => this.handleWorldUpdate(data));
        this.messageHandler.registerHandler('playerShot', (data) => this.handlePlayerShot(data));
        this.messageHandler.registerHandler('playerHit', (data) => this.handlePlayerHit(data));
        this.messageHandler.registerHandler('playerDeath', (data) => this.handlePlayerDeath(data));
        this.messageHandler.registerHandler('weaponPickup', (data) => this.handleWeaponPickup(data));
        
        // Network handlers
        this.messageHandler.registerHandler('ping', (data) => this.handlePing(data));
        this.messageHandler.registerHandler('pong', (data) => this.stats.handlePong(data));
        this.messageHandler.registerHandler('networkError', (data) => this.handleNetworkError(data));
    }

    /**
     * Connect to the server
     * @param {string} playerName - Player name for connection
     * @returns {Promise} Promise resolving when connected
     */
    async connect(playerName = 'Player') {
        try {
            const connectionData = await this.connection.connect(playerName);
            
            // Set up Socket.IO event handlers for message processing
            this.connection.on('playerJoined', (data) => {
                console.log('DEBUG: NetworkManager received playerJoined socket event:', data);
                this.messageHandler.processMessage({ type: 'playerJoined', data });
            });
            this.connection.on('playerConnected', (data) => {
                console.log('DEBUG: NetworkManager received playerConnected socket event:', data);
                this.messageHandler.processMessage({ type: 'playerConnected', data });
            });
            this.connection.on('playerDisconnected', (playerId) => {
                console.log('DEBUG: NetworkManager received playerDisconnected socket event:', playerId);
                this.messageHandler.processMessage({ type: 'playerDisconnected', data: playerId });
            });
            this.connection.on('playerMoved', (data) => {
                this.messageHandler.processMessage({ type: 'playerMoved', data });
            });
            this.connection.on('playerShot', (data) => this.messageHandler.processMessage({ type: 'playerShot', data }));
            this.connection.on('playerKilled', (data) => this.messageHandler.processMessage({ type: 'playerKilled', data }));
            this.connection.on('playerRespawned', (data) => this.messageHandler.processMessage({ type: 'playerRespawned', data }));
            this.connection.on('playerDamaged', (data) => this.messageHandler.processMessage({ type: 'playerDamaged', data }));
            this.connection.on('playerHealthUpdated', (data) => this.messageHandler.processMessage({ type: 'playerHealthUpdated', data }));
            this.connection.on('playerUsernameUpdated', (data) => this.messageHandler.processMessage({ type: 'playerUsernameUpdated', data }));
            
            // Start ping monitoring
            this.stats.startPingMonitoring((pingData) => this.emit('ping', pingData));
            this.stats.setConnectionTime(Date.now());
            
            return connectionData;
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the server
     */
    disconnect() {
        this.connection.disconnect();
        this.stats.stopPingMonitoring();
    }

    /**
     * Emit an event to the server
     * @param {string} event - Event name
     * @param {*} data - Data to send
     * @returns {Promise} Promise resolving when sent
     */
    async emit(event, data = {}) {
        const result = await this.connection.emit(event, data);
        
        // Update stats
        const dataSize = JSON.stringify(data).length;
        this.messageHandler.updateSentStats(dataSize);
        this.stats.updateBandwidth(0, dataSize);
        
        return result;
    }

    /**
     * Legacy sendMessage method for compatibility
     * @param {string} type - Message type
     * @param {*} data - Message data
     * @returns {Promise} Promise resolving when sent
     */
    sendMessage(type, data = {}) {
        return this.emit(type, data);
    }

    /**
     * Handle connection established
     * @param {Object} data - Connection data
     */
    handleConnectionEstablished(data) {
        console.log('DEBUG: Connection established:', data);
        console.log('DEBUG: Setting playerId to:', data.playerId);
        
        this.isConnected = true;
        this.playerId = data.playerId;
        this.sessionId = data.sessionId;
        this.isHost = data.isHost || false;
        
        console.log('DEBUG: NetworkManager connection state - isConnected:', this.isConnected, 'playerId:', this.playerId);
        
        if (this.onConnected) {
            this.onConnected(data);
        }
    }

    /**
     * Handle connection rejected
     * @param {Object} data - Rejection data
     */
    handleConnectionRejected(data) {
        console.error('Connection rejected:', data.reason);
        
        if (this.onError) {
            this.onError(new Error(data.reason));
        }
    }

    /**
     * Handle disconnection
     * @param {string} reason - Disconnection reason
     */
    handleDisconnection(reason) {
        console.log('Disconnected from server:', reason);
        
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.sessionId = null;
        
        if (this.onDisconnected) {
            this.onDisconnected(reason);
        }
    }

    /**
     * Handle network error
     * @param {Error|Object} error - Error object or data
     */
    handleNetworkError(error) {
        console.error('Network error:', error);
        
        if (this.onError) {
            this.onError(error.message || error || 'Unknown network error');
        }
    }

    /**
     * Handle game state updates
     * @param {Object} data - Game state data
     */
    handleGameState(data) {
        if (this.game && this.game.updateGameState) {
            this.game.updateGameState(data);
        }
    }

    /**
     * Handle world updates
     * @param {Object} data - World update data
     */
    handleWorldUpdate(data) {
        if (this.game && this.game.updateWorldState) {
            this.game.updateWorldState(data);
        }
    }

    /**
     * Handle player shot events
     * @param {Object} data - Shot event data
     */
    handlePlayerShot(data) {
        if (this.game && this.game.handleRemoteShot) {
            this.game.handleRemoteShot(data);
        }
    }

    /**
     * Handle player hit events
     * @param {Object} data - Hit event data
     */
    handlePlayerHit(data) {
        if (this.game && this.game.handlePlayerHit) {
            this.game.handlePlayerHit(data);
        }
    }

    /**
     * Handle player death events
     * @param {Object} data - Death event data
     */
    handlePlayerDeath(data) {
        if (this.game && this.game.handlePlayerDeath) {
            this.game.handlePlayerDeath(data);
        }
    }

    /**
     * Handle weapon pickup events
     * @param {Object} data - Pickup event data
     */
    handleWeaponPickup(data) {
        if (this.game && this.game.handleWeaponPickup) {
            this.game.handleWeaponPickup(data);
        }
    }

    /**
     * Handle ping requests
     * @param {Object} data - Ping data
     */
    handlePing(data) {
        // Respond to ping with pong
        this.emit('pong', {
            timestamp: data.timestamp,
            responseTime: Date.now()
        });
    }

    // Public API methods that delegate to components

    /**
     * Set local player reference
     * @param {Object} player - Local player object
     */
    setLocalPlayer(player) {
        this.playerManager.setLocalPlayer(player);
    }

    /**
     * Get all remote players
     * @returns {Array} Array of remote players
     */
    getRemotePlayers() {
        return this.playerManager.getRemotePlayers();
    }

    /**
     * Get player state by ID
     * @param {string} playerId - Player ID
     * @returns {Object|null} Player state or null
     */
    getPlayerState(playerId) {
        return this.playerManager.getPlayerState(playerId);
    }

    /**
     * Update local player state
     * @param {Object} playerState - Current player state
     */
    updateLocalPlayerState(playerState) {
        this.playerManager.updateLocalPlayerState(playerState);
    }

    /**
     * Broadcast game event
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    broadcastGameEvent(eventType, eventData) {
        if (!this.isConnected) return;
        
        this.emit('game_event', {
            type: eventType,
            data: eventData,
            playerId: this.playerId,
            timestamp: Date.now()
        });
    }

    /**
     * Get network statistics
     * @returns {Object} Network statistics
     */
    getNetworkStats() {
        const connectionStats = this.connection.getStatus();
        const messageStats = this.messageHandler.getStats();
        const networkStats = this.stats.getStats();
        
        return {
            ...connectionStats,
            ...messageStats,
            ...networkStats,
            playerCount: this.playerManager.getRemotePlayers().length + (this.isConnected ? 1 : 0)
        };
    }

    /**
     * Update method called from game loop
     * @param {number} deltaTime - Time since last update
     */
    _doUpdate(deltaTime) {
        // Update components
        this.playerManager.update(deltaTime);
        this.stats.update(deltaTime);
        
        // Process any queued messages
        this.messageHandler.processQueuedMessages();
        
        // Clean up old pending messages
        this.messageHandler.cleanupPendingMessages();
    }

    /**
     * Dispose of the network manager
     */
    _doDispose() {
        // Disconnect if connected
        this.disconnect();
        
        // Dispose components
        this.connection.dispose();
        this.messageHandler.dispose();
        this.playerManager.dispose();
        this.stats.dispose();
        
        // Clear callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        this.onError = null;
    }
}

export default NetworkManager;