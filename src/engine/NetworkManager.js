/**
 * KILLtONE Game Framework - Network Manager
 * Handles multiplayer communication and player state synchronization
 */

import { GameConfig } from '../mainConfig.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        
        // Connection state
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.sessionId = null;
        
        // WebSocket connection
        this.socket = null;
        this.serverURL = GameConfig.network.serverURL;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = GameConfig.network.reconnectAttempts;
        this.reconnectDelay = 1000; // Start with 1 second
        this.maxReconnectDelay = 30000; // Max 30 seconds
        
        // Network settings
        this.timeout = GameConfig.network.timeout;
        this.tickRate = GameConfig.network.tickRate;
        this.interpolationDelay = GameConfig.network.interpolationDelay;
        
        // Player state management
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.playerStates = new Map();
        this.lastStateUpdate = 0;
        this.stateUpdateInterval = 1000 / this.tickRate; // Convert to milliseconds
        
        // Message handling
        this.messageHandlers = new Map();
        this.messageQueue = [];
        this.pendingMessages = new Map();
        this.messageId = 0;
        
        // Network statistics
        this.stats = {
            ping: 0,
            packetLoss: 0,
            bytesReceived: 0,
            bytesSent: 0,
            messagesReceived: 0,
            messagesSent: 0,
            lastPingTime: 0,
            connectionTime: 0
        };
        
        // Event callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        this.onError = null;
        
        // Initialize message handlers
        this.initializeMessageHandlers();
        
        console.log('NetworkManager initialized');
    }
    
    initializeMessageHandlers() {
        // Connection messages
        this.registerMessageHandler('connection_established', this.handleConnectionEstablished.bind(this));
        this.registerMessageHandler('connection_rejected', this.handleConnectionRejected.bind(this));
        this.registerMessageHandler('player_joined', this.handlePlayerJoined.bind(this));
        this.registerMessageHandler('player_left', this.handlePlayerLeft.bind(this));
        
        // State synchronization
        this.registerMessageHandler('player_state', this.handlePlayerState.bind(this));
        this.registerMessageHandler('game_state', this.handleGameState.bind(this));
        this.registerMessageHandler('world_update', this.handleWorldUpdate.bind(this));
        
        // Game events
        this.registerMessageHandler('player_shot', this.handlePlayerShot.bind(this));
        this.registerMessageHandler('player_hit', this.handlePlayerHit.bind(this));
        this.registerMessageHandler('player_death', this.handlePlayerDeath.bind(this));
        this.registerMessageHandler('weapon_pickup', this.handleWeaponPickup.bind(this));
        
        // Network diagnostics
        this.registerMessageHandler('ping', this.handlePing.bind(this));
        this.registerMessageHandler('pong', this.handlePong.bind(this));
        
        // Error handling
        this.registerMessageHandler('error', this.handleNetworkError.bind(this));
    }
    
    // Connection Management
    connect(playerName = 'Player') {
        if (this.isConnected || this.socket) {
            console.warn('Already connected or connecting');
            return Promise.reject(new Error('Already connected'));
        }
        
        return new Promise((resolve, reject) => {
            try {
                console.log(`Connecting to ${this.serverURL}...`);
                
                this.socket = new WebSocket(this.serverURL);
                
                // Connection timeout
                const timeoutId = setTimeout(() => {
                    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
                        this.socket.close();
                        reject(new Error('Connection timeout'));
                    }
                }, this.timeout);
                
                this.socket.onopen = () => {
                    clearTimeout(timeoutId);
                    console.log('WebSocket connected');
                    
                    // Send connection request
                    this.sendMessage('connect', {
                        playerName,
                        version: '1.0.0',
                        timestamp: Date.now()
                    });
                    
                    // Start ping monitoring
                    this.startPingMonitoring();
                    
                    this.stats.connectionTime = Date.now();
                };
                
                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.socket.onclose = (event) => {
                    clearTimeout(timeoutId);
                    this.handleDisconnection(event);
                    
                    if (!this.isConnected) {
                        reject(new Error(`Connection failed: ${event.reason || 'Unknown error'}`));
                    }
                };
                
                this.socket.onerror = (error) => {
                    clearTimeout(timeoutId);
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                // Store resolve function for connection established handler
                this._connectionResolve = resolve;
                this._connectionReject = reject;
                
            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                reject(error);
            }
        });
    }
    
    disconnect() {
        if (this.socket) {
            console.log('Disconnecting from server...');
            
            // Send disconnect message
            if (this.isConnected) {
                this.sendMessage('disconnect', {
                    playerId: this.playerId,
                    timestamp: Date.now()
                });
            }
            
            // Close connection
            this.socket.close(1000, 'Client disconnect');
            this.socket = null;
        }
        
        this.cleanup();
    }
    
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
    
    attemptReconnection() {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect()
                    .then(() => {
                        console.log('Reconnection successful');
                        this.reconnectAttempts = 0;
                        this.reconnectDelay = 1000;
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
    
    cleanup() {
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.sessionId = null;
        
        // Clear player data
        this.remotePlayers.clear();
        this.playerStates.clear();
        
        // Clear pending messages
        this.pendingMessages.clear();
        this.messageQueue = [];
        
        // Stop ping monitoring
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    // Message Handling
    registerMessageHandler(messageType, handler) {
        this.messageHandlers.set(messageType, handler);
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            this.stats.messagesReceived++;
            this.stats.bytesReceived += data.length;
            
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.data, message);
            } else {
                console.warn('Unhandled message type:', message.type);
            }
            
        } catch (error) {
            console.error('Failed to parse message:', error, data);
        }
    }
    
    sendMessage(type, data = {}, requiresResponse = false) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send message: not connected');
            return Promise.reject(new Error('Not connected'));
        }
        
        const messageId = requiresResponse ? ++this.messageId : null;
        const message = {
            id: messageId,
            type,
            data,
            timestamp: Date.now()
        };
        
        try {
            const messageStr = JSON.stringify(message);
            this.socket.send(messageStr);
            
            this.stats.messagesSent++;
            this.stats.bytesSent += messageStr.length;
            
            // Handle response requirement
            if (requiresResponse) {
                return new Promise((resolve, reject) => {
                    this.pendingMessages.set(messageId, { resolve, reject });
                    
                    // Timeout for response
                    setTimeout(() => {
                        if (this.pendingMessages.has(messageId)) {
                            this.pendingMessages.delete(messageId);
                            reject(new Error('Message timeout'));
                        }
                    }, this.timeout);
                });
            }
            
            return Promise.resolve();
            
        } catch (error) {
            console.error('Failed to send message:', error);
            return Promise.reject(error);
        }
    }
    
    // Message Handlers
    handleConnectionEstablished(data) {
        console.log('Connection established:', data);
        
        this.isConnected = true;
        this.playerId = data.playerId;
        this.sessionId = data.sessionId;
        this.isHost = data.isHost || false;
        
        // Resolve connection promise
        if (this._connectionResolve) {
            this._connectionResolve(data);
            this._connectionResolve = null;
            this._connectionReject = null;
        }
        
        // Trigger callback
        if (this.onConnected) {
            this.onConnected(data);
        }
    }
    
    handleConnectionRejected(data) {
        console.error('Connection rejected:', data.reason);
        
        // Reject connection promise
        if (this._connectionReject) {
            this._connectionReject(new Error(data.reason));
            this._connectionResolve = null;
            this._connectionReject = null;
        }
    }
    
    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        
        this.remotePlayers.set(data.playerId, data);
        
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data);
        }
    }
    
    handlePlayerLeft(data) {
        console.log('Player left:', data);
        
        this.remotePlayers.delete(data.playerId);
        this.playerStates.delete(data.playerId);
        
        if (this.onPlayerLeft) {
            this.onPlayerLeft(data);
        }
    }
    
    handlePlayerState(data) {
        // Update remote player state
        this.playerStates.set(data.playerId, {
            ...data,
            timestamp: Date.now(),
            interpolationTime: Date.now() + this.interpolationDelay
        });
        
        if (this.onStateUpdate) {
            this.onStateUpdate(data);
        }
    }
    
    handleGameState(data) {
        // Handle game state updates (scores, round time, etc.)
        if (this.game && this.game.updateGameState) {
            this.game.updateGameState(data);
        }
    }
    
    handleWorldUpdate(data) {
        // Handle world object updates (pickups, destructibles, etc.)
        if (this.game && this.game.updateWorldState) {
            this.game.updateWorldState(data);
        }
    }
    
    handlePlayerShot(data) {
        // Handle remote player shooting
        if (this.game && this.game.handleRemoteShot) {
            this.game.handleRemoteShot(data);
        }
    }
    
    handlePlayerHit(data) {
        // Handle player hit events
        if (this.game && this.game.handlePlayerHit) {
            this.game.handlePlayerHit(data);
        }
    }
    
    handlePlayerDeath(data) {
        // Handle player death events
        if (this.game && this.game.handlePlayerDeath) {
            this.game.handlePlayerDeath(data);
        }
    }
    
    handleWeaponPickup(data) {
        // Handle weapon pickup events
        if (this.game && this.game.handleWeaponPickup) {
            this.game.handleWeaponPickup(data);
        }
    }
    
    handlePing(data) {
        // Respond to ping with pong
        this.sendMessage('pong', {
            timestamp: data.timestamp,
            responseTime: Date.now()
        });
    }
    
    handlePong(data) {
        // Calculate ping
        const now = Date.now();
        this.stats.ping = now - data.timestamp;
        this.stats.lastPingTime = now;
    }
    
    handleNetworkError(data) {
        console.error('Network error:', data);
        
        if (this.onError) {
            this.onError(data.message || 'Unknown network error');
        }
    }
    
    // Player State Synchronization
    updateLocalPlayerState(playerState) {
        if (!this.isConnected || !this.localPlayer) return;
        
        const now = Date.now();
        
        // Throttle state updates based on tick rate
        if (now - this.lastStateUpdate < this.stateUpdateInterval) {
            return;
        }
        
        // Send player state update
        this.sendMessage('player_state', {
            playerId: this.playerId,
            position: playerState.position,
            rotation: playerState.rotation,
            velocity: playerState.velocity,
            health: playerState.health,
            weapon: playerState.currentWeapon,
            animation: playerState.animation,
            timestamp: now
        });
        
        this.lastStateUpdate = now;
    }
    
    getInterpolatedPlayerState(playerId) {
        const state = this.playerStates.get(playerId);
        if (!state) return null;
        
        const now = Date.now();
        const age = now - state.timestamp;
        
        // If state is too old, don't interpolate
        if (age > this.interpolationDelay * 2) {
            return state;
        }
        
        // Simple interpolation (can be enhanced with prediction)
        const interpolationFactor = Math.min(age / this.interpolationDelay, 1);
        
        return {
            ...state,
            interpolationFactor
        };
    }
    
    // Network Diagnostics
    startPingMonitoring() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage('ping', {
                    timestamp: Date.now()
                });
            }
        }, 5000); // Ping every 5 seconds
    }
    
    getNetworkStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            playerId: this.playerId,
            playerCount: this.remotePlayers.size + (this.isConnected ? 1 : 0),
            uptime: this.stats.connectionTime ? Date.now() - this.stats.connectionTime : 0
        };
    }
    
    // Public API
    setLocalPlayer(player) {
        this.localPlayer = player;
    }
    
    getRemotePlayers() {
        return Array.from(this.remotePlayers.values());
    }
    
    getPlayerState(playerId) {
        return this.playerStates.get(playerId);
    }
    
    broadcastGameEvent(eventType, eventData) {
        if (!this.isConnected) return;
        
        this.sendMessage('game_event', {
            type: eventType,
            data: eventData,
            playerId: this.playerId,
            timestamp: Date.now()
        });
    }
    
    dispose() {
        this.disconnect();
        
        // Clear all handlers and data
        this.messageHandlers.clear();
        this.remotePlayers.clear();
        this.playerStates.clear();
        this.pendingMessages.clear();
        
        console.log('NetworkManager disposed');
    }
}

export default NetworkManager;