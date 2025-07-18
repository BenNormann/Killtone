/**
 * KILLtONE Game Framework - Network Manager
 * Handles multiplayer communication and player state synchronization
 */

import { GameConfig } from '../mainConfig.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { BaseManager } from './BaseManager.js';

export class NetworkManager extends BaseManager {
    constructor(game) {
        super(game);
        
        // Connection state
        this.isConnected = false;
        this.isHost = false;
        this.playerId = null;
        this.sessionId = null;
        
        // Socket.IO connection
        this.socket = null;
        this.serverURL = window.location.origin; // Use current origin for Socket.IO
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
        // Socket.IO event handlers will be set up in connect method
        console.log('NetworkManager message handlers initialized');
    }
    
    // Connection Management
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
                
                // Set up Socket.IO event handlers
                this.setupSocketHandlers(resolve, reject);
                
                this.stats.connectionTime = Date.now();
                
            } catch (error) {
                console.error('Failed to create Socket.IO connection:', error);
                reject(error);
            }
        });
    }
    
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Socket.IO client'));
            document.head.appendChild(script);
        });
    }
    
    setupSocketHandlers(resolve, reject) {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.isConnected = true;
            this.playerId = this.socket.id;
            resolve({ playerId: this.playerId });
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            reject(error);
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.handleDisconnection({ reason });
        });
        
        // Player events
        this.socket.on('playerJoined', (data) => {
            console.log(`Player ${data.player.username} joined the game`);
            this.handlePlayerJoined(data);
        });
        
        this.socket.on('playerConnected', (playerData) => {
            console.log('New player connected:', playerData);
            this.handleNewPlayerConnected(playerData);
        });
        
        this.socket.on('playerDisconnected', (playerId) => {
            console.log('Player disconnected:', playerId);
            this.handlePlayerDisconnected(playerId);
        });
        
        this.socket.on('playerMoved', (data) => {
            this.handlePlayerMoved(data);
        });
        
        this.socket.on('playerShot', (data) => {
            this.handlePlayerShot(data);
        });
        
        this.socket.on('playerKilled', (data) => {
            this.handlePlayerKilled(data);
        });
        
        this.socket.on('playerRespawned', (data) => {
            this.handlePlayerRespawned(data);
        });
        
        this.socket.on('playerDamaged', (data) => {
            this.handlePlayerDamaged(data);
        });
        
        this.socket.on('playerHealthUpdated', (data) => {
            this.handlePlayerHealthUpdated(data);
        });
        
        this.socket.on('playerUsernameUpdated', (data) => {
            this.handlePlayerUsernameUpdated(data);
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
    
    // Socket.IO message sending
    emit(eventName, data = {}) {
        if (!this.socket || !this.isConnected) {
            console.warn('Cannot send message: not connected');
            return Promise.reject(new Error('Not connected'));
        }
        
        try {
            this.socket.emit(eventName, data);
            this.stats.messagesSent++;
            return Promise.resolve();
        } catch (error) {
            console.error('Failed to emit message:', error);
            return Promise.reject(error);
        }
    }
    
    // Legacy sendMessage method for compatibility
    sendMessage(type, data = {}) {
        return this.emit(type, data);
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
        console.log(`Player ${data.player.username} joined the game`);
        
        // Initialize local player data if this is our join event
        if (data.playerId === this.playerId) {
            console.log('This is our player join event');
            // Create all existing players as remote players
            if (data.allPlayers) {
                data.allPlayers.forEach(playerData => {
                    if (playerData.id !== this.playerId) {
                        this.createRemotePlayer(playerData);
                    }
                });
            }
        }
        
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data);
        }
    }
    
    handleNewPlayerConnected(playerData) {
        console.log('New player connected:', playerData);
        
        // Don't create a remote player for ourselves
        if (playerData.id === this.playerId) {
            return;
        }
        
        this.createRemotePlayer(playerData);
    }
    
    handlePlayerDisconnected(playerId) {
        console.log('Player disconnected:', playerId);
        
        // Remove remote player
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            remotePlayer.dispose();
            this.remotePlayers.delete(playerId);
        }
        
        this.playerStates.delete(playerId);
        
        if (this.onPlayerLeft) {
            this.onPlayerLeft({ playerId });
        }
    }
    
    handlePlayerMoved(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.updateFromNetworkData({
                position: data.position,
                rotation: data.rotation
            });
        }
    }
    
    handlePlayerKilled(data) {
        console.log(`Player ${data.victimId} killed by ${data.killerId}`);
        
        // Update victim
        const victim = this.remotePlayers.get(data.victimId);
        if (victim) {
            victim.setAlive(false);
            victim.deaths = data.victimDeaths;
        }
        
        // Update killer
        const killer = this.remotePlayers.get(data.killerId);
        if (killer) {
            killer.score = data.killerScore;
        }
        
        // Handle local player death
        if (data.victimId === this.playerId && this.localPlayer) {
            this.localPlayer.die();
        }
    }
    
    handlePlayerRespawned(data) {
        console.log(`Player ${data.playerId} respawned`);
        
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.updateFromNetworkData(data.player);
            remotePlayer.setAlive(true);
        }
        
        // Handle local player respawn
        if (data.playerId === this.playerId && this.localPlayer) {
            this.localPlayer.respawn(new BABYLON.Vector3(
                data.player.position.x,
                data.player.position.y,
                data.player.position.z
            ));
        }
    }
    
    handlePlayerDamaged(data) {
        // This is for local player damage feedback
        if (this.localPlayer) {
            console.log(`Took ${data.damage} damage from player ${data.shooterId}`);
            // Update local UI or effects
        }
    }
    
    handlePlayerHealthUpdated(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.setHealth(data.health);
        }
    }
    
    handlePlayerUsernameUpdated(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.setUsername(data.username);
        }
    }
    
    createRemotePlayer(playerData) {
        if (this.remotePlayers.has(playerData.id)) {
            return; // Already exists
        }
        
        console.log(`Creating remote player: ${playerData.username} (${playerData.id})`);
        
        const remotePlayer = new RemotePlayer(this.game, this.game.scene, playerData);
        this.remotePlayers.set(playerData.id, remotePlayer);
        
        return remotePlayer;
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
    
    // Player State Synchronization
    updateLocalPlayerState(playerState) {
        if (!this.isConnected || !this.localPlayer) return;
        
        const now = Date.now();
        
        // Throttle state updates based on tick rate
        if (now - this.lastStateUpdate < this.stateUpdateInterval) {
            return;
        }
        
        // Send player state update
        this.emit('playerUpdate', {
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

    // Network Diagnostics
    startPingMonitoring() {
        // Socket.IO handles ping/pong automatically
        console.log('Socket.IO ping monitoring is automatic');
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
    
    // Update method for game loop
    update(deltaTime) {
        // Update network statistics
        if (this.isConnected && this.socket) {
            // Update connection uptime
            if (this.stats.connectionTime) {
                this.stats.uptime = Date.now() - this.stats.connectionTime;
            }
            
            // Clean up old player states
            const now = Date.now();
            this.playerStates.forEach((state, playerId) => {
                if (now - state.timestamp > 5000) { // Remove states older than 5 seconds
                    this.playerStates.delete(playerId);
                }
            });
        }
    }

    _doDispose() {
        this.disconnect();
        
        // Clear all handlers and data
        this.messageHandlers.clear();
        this.remotePlayers.clear();
        this.playerStates.clear();
        this.pendingMessages.clear();
    }
}

export default NetworkManager;