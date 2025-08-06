/**
 * NetworkPlayerManager - Handles player-related network events
 * Manages remote players and player state synchronization
 */

import { RemotePlayer } from '../../entities/RemotePlayer.js';

export class NetworkPlayerManager {
    constructor(game) {
        this.game = game;
        
        // Player management
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.playerStates = new Map();
        this.playerStats = new Map(); // Track kills, deaths, ping for all players
        
        // State synchronization
        this.lastStateUpdate = 0;
        this.stateUpdateInterval = 1000 / 20; // 20 Hz default
        this.interpolationDelay = 100; // 100ms default
        
        // Event callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        this.onPlayerStatsUpdated = null;
    }

    /**
     * Set the local player reference
     * @param {Object} player - Local player object
     */
    setLocalPlayer(player) {
        this.localPlayer = player;
    }

    /**
     * Handle player joined event
     * @param {Object} data - Player join data
     */
    async handlePlayerJoined(data) {
        console.log(`DEBUG: Player ${data.player?.username || 'Unknown'} joined the game`);
        console.log(`DEBUG: Player join data:`, data);
        
        // Initialize local player data if this is our join event
        if (data.playerId === this.game.networkManager?.playerId) {
            console.log('DEBUG: This is our player join event');
            // Initialize our own stats
            this.initializePlayerStats(data.player);
            
            // Create all existing players as remote players
            if (data.allPlayers) {
                console.log(`DEBUG: Creating ${data.allPlayers.length} existing players as remote players`);
                for (const playerData of data.allPlayers) {
                    if (playerData.id !== this.game.networkManager?.playerId) {
                        console.log(`DEBUG: Creating existing player: ${playerData.username} (${playerData.id})`);
                        await this.createRemotePlayer(playerData);
                        this.initializePlayerStats(playerData);
                    }
                }
            } else {
                console.log('DEBUG: No existing players to create');
            }
        }
        
        if (this.onPlayerJoined) {
            this.onPlayerJoined(data);
        }
    }

    /**
     * Handle new player connected event
     * @param {Object} playerData - New player data
     */
    async handleNewPlayerConnected(playerData) {
        console.log('DEBUG: New player connected:', playerData);
        console.log('DEBUG: Our player ID:', this.game.networkManager?.playerId);
        
        // Don't create a remote player for ourselves
        if (playerData.id === this.game.networkManager?.playerId) {
            console.log('DEBUG: Skipping remote player creation for ourselves');
            return;
        }
        
        await this.createRemotePlayer(playerData);
        this.initializePlayerStats(playerData);
        
        // Notify about stats update
        if (this.onPlayerStatsUpdated) {
            this.onPlayerStatsUpdated(this.getAllPlayerStats());
        }
    }

    /**
     * Handle player disconnected event
     * @param {string} playerId - ID of disconnected player
     */
    handlePlayerDisconnected(playerId) {
        console.log('Player disconnected:', playerId);
        
        // Remove remote player
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            remotePlayer.dispose();
            this.remotePlayers.delete(playerId);
        }
        
        this.playerStates.delete(playerId);
        this.playerStats.delete(playerId);
        
        if (this.onPlayerLeft) {
            this.onPlayerLeft({ playerId });
        }
        
        // Notify about stats update
        if (this.onPlayerStatsUpdated) {
            this.onPlayerStatsUpdated(this.getAllPlayerStats());
        }
    }

    /**
     * Handle player movement event
     * @param {Object} data - Movement data
     */
    async handlePlayerMoved(data) {
        console.log(`NetworkPlayerManager: Received playerMoved event:`, data);
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            await remotePlayer.updateFromNetworkData({
                position: data.position,
                rotation: data.rotation,
                movement: data.movement
            });
        }
    }

    /**
     * Handle player killed event
     * @param {Object} data - Kill event data
     */
    handlePlayerKilled(data) {
        console.log(`Player ${data.victimId} killed by ${data.killerId}`);
        
        // Update victim stats
        const victim = this.remotePlayers.get(data.victimId);
        if (victim) {
            victim.setAlive(false);
            victim.deaths = data.victimDeaths;
        }
        
        // Update killer stats
        const killer = this.remotePlayers.get(data.killerId);
        if (killer) {
            killer.score = data.killerScore;
        }
        
        // Update player statistics tracking
        this.updatePlayerStats(data.killerId, { kills: data.killerScore });
        this.updatePlayerStats(data.victimId, { deaths: data.victimDeaths });
        
        // Handle local player events
        if (data.victimId === this.game.networkManager?.playerId && this.localPlayer) {
            // Local player died
            this.localPlayer.recordDeath();
            this.localPlayer.onDeath();
        } else if (data.killerId === this.game.networkManager?.playerId && this.localPlayer) {
            // Local player got a kill
            this.localPlayer.recordKill();
        }
        
        // Notify about stats update
        if (this.onPlayerStatsUpdated) {
            this.onPlayerStatsUpdated(this.getAllPlayerStats());
        }
    }

    /**
     * Handle player respawned event
     * @param {Object} data - Respawn event data
     */
    async handlePlayerRespawned(data) {
        console.log(`Player ${data.playerId} respawned`);
        
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            await remotePlayer.updateFromNetworkData(data.player);
            remotePlayer.setAlive(true);
        }
        
        // Handle local player respawn
        if (data.playerId === this.game.networkManager?.playerId && this.localPlayer) {
            this.localPlayer.respawn(new BABYLON.Vector3(
                data.player.position.x,
                data.player.position.y,
                data.player.position.z
            ));
        }
    }

    /**
     * Handle player damaged event
     * @param {Object} data - Damage event data
     */
    handlePlayerDamaged(data) {
        // This is for local player damage feedback
        if (this.localPlayer) {
            console.log(`Took ${data.damage} damage from player ${data.shooterId}`);
            // Update local UI or effects
        }
    }

    /**
     * Handle player health updated event
     * @param {Object} data - Health update data
     */
    handlePlayerHealthUpdated(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.setHealth(data.health);
        }
    }

    /**
     * Handle player username updated event
     * @param {Object} data - Username update data
     */
    handlePlayerUsernameUpdated(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.setUsername(data.username);
        }
    }

    /**
     * Create a remote player
     * @param {Object} playerData - Player data
     * @returns {RemotePlayer} Created remote player
     */
    async createRemotePlayer(playerData) {
        if (this.remotePlayers.has(playerData.id)) {
            console.log(`DEBUG: Remote player ${playerData.id} already exists, returning existing`);
            return this.remotePlayers.get(playerData.id);
        }
        
        console.log(`DEBUG: Creating remote player: ${playerData.username} (${playerData.id})`);
        console.log(`DEBUG: Player data:`, playerData);
        console.log(`DEBUG: Game scene available:`, !!this.game.scene);
        
        const remotePlayer = new RemotePlayer(this.game, this.game.scene, playerData);
        this.remotePlayers.set(playerData.id, remotePlayer);
        
        // Initialize the remote player visual representation
        try {
            const initialized = await remotePlayer.initialize();
            if (initialized) {
                console.log(`DEBUG: Remote player ${playerData.username} initialized successfully`);
            } else {
                console.error(`DEBUG: Failed to initialize remote player ${playerData.username}`);
            }
        } catch (error) {
            console.error(`DEBUG: Error initializing remote player ${playerData.username}:`, error);
        }
        
        console.log(`DEBUG: Total remote players now: ${this.remotePlayers.size}`);
        
        return remotePlayer;
    }

    /**
     * Update local player state to server
     * @param {Object} playerState - Current player state
     */
    updateLocalPlayerState(playerState) {
        if (!this.game.networkManager?.isConnected || !this.localPlayer) return;
        
        const now = Date.now();
        
        // Throttle state updates based on tick rate
        if (now - this.lastStateUpdate < this.stateUpdateInterval) {
            return;
        }
        
        // Send player state update
        this.game.networkManager.emit('playerUpdate', {
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

    /**
     * Handle player state update
     * @param {Object} data - Player state data
     */
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

    /**
     * Get interpolated player state
     * @param {string} playerId - Player ID
     * @returns {Object|null} Interpolated player state or null
     */
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

    /**
     * Get all remote players
     * @returns {Array<RemotePlayer>} Array of remote players
     */
    getRemotePlayers() {
        return Array.from(this.remotePlayers.values());
    }

    /**
     * Get player state by ID
     * @param {string} playerId - Player ID
     * @returns {Object|null} Player state or null
     */
    getPlayerState(playerId) {
        return this.playerStates.get(playerId);
    }

    /**
     * Set state update interval
     * @param {number} tickRate - Updates per second
     */
    setTickRate(tickRate) {
        this.stateUpdateInterval = 1000 / tickRate;
    }

    /**
     * Set interpolation delay
     * @param {number} delay - Delay in milliseconds
     */
    setInterpolationDelay(delay) {
        this.interpolationDelay = delay;
    }

    /**
     * Update method called from game loop
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update all remote players
        this.remotePlayers.forEach((remotePlayer, playerId) => {
            if (remotePlayer && remotePlayer.update) {
                remotePlayer.update(deltaTime);
            }
        });
        
        // Clean up old player states
        const now = Date.now();
        this.playerStates.forEach((state, playerId) => {
            if (now - state.timestamp > 5000) { // Remove states older than 5 seconds
                this.playerStates.delete(playerId);
            }
        });
        
        // Debug logging every 5 seconds
        if (now % 5000 < 100) {
            console.log(`DEBUG: NetworkPlayerManager has ${this.remotePlayers.size} remote players`);
            this.remotePlayers.forEach((player, id) => {
                console.log(`DEBUG: Remote player ${id}: ${player.username}, mesh: ${!!player.mesh}, alive: ${player.isAlive}`);
            });
        }
    }

    /**
     * Update player statistics
     * @param {string} playerId - Player ID
     * @param {Object} stats - Stats to update (kills, deaths, ping, etc.)
     */
    updatePlayerStats(playerId, stats) {
        if (!this.playerStats.has(playerId)) {
            this.playerStats.set(playerId, {
                id: playerId,
                username: 'Unknown',
                kills: 0,
                deaths: 0,
                ping: 0,
                isAlive: true,
                isLocal: playerId === this.game.networkManager?.playerId
            });
        }
        
        const playerStats = this.playerStats.get(playerId);
        Object.assign(playerStats, stats);
        
        // Update username from remote player if available
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer && remotePlayer.username) {
            playerStats.username = remotePlayer.username;
        }
    }

    /**
     * Get all player statistics for leaderboard
     * @returns {Array} Array of player stats sorted by score
     */
    getAllPlayerStats() {
        const allStats = [];
        
        // Add local player stats
        if (this.localPlayer && this.game.networkManager?.playerId) {
            const localId = this.game.networkManager.playerId;
            if (!this.playerStats.has(localId)) {
                this.updatePlayerStats(localId, {
                    username: this.localPlayer.getName(),
                    kills: this.localPlayer.kills || 0,
                    deaths: this.localPlayer.deaths || 0,
                    isAlive: this.localPlayer.health > 0
                });
            }
            
            const localStats = this.playerStats.get(localId);
            if (localStats) {
                allStats.push({
                    ...localStats,
                    username: this.localPlayer.getName(),
                    kills: this.localPlayer.kills || 0,
                    deaths: this.localPlayer.deaths || 0,
                    isAlive: this.localPlayer.health > 0,
                    ping: this.game.networkManager?.stats?.getStats().ping || 0
                });
            }
        }
        
        // Add remote player stats
        this.remotePlayers.forEach((remotePlayer, playerId) => {
            if (!this.playerStats.has(playerId)) {
                this.updatePlayerStats(playerId, {
                    username: remotePlayer.username || 'Unknown',
                    kills: remotePlayer.score || 0,
                    deaths: remotePlayer.deaths || 0,
                    isAlive: remotePlayer.isAlive
                });
            }
            
            const stats = this.playerStats.get(playerId);
            allStats.push({
                ...stats,
                username: remotePlayer.username || 'Unknown',
                kills: remotePlayer.score || 0,
                deaths: remotePlayer.deaths || 0,
                isAlive: remotePlayer.isAlive,
                ping: stats.ping || 0
            });
        });
        
        // Calculate K/D ratio and score for each player
        allStats.forEach(player => {
            player.kdr = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
            player.score = player.kills * 15 - player.deaths * 5; // Basic scoring system
        });
        
        // Sort by score (kills weighted more than deaths)
        allStats.sort((a, b) => b.score - a.score);
        
        // Add rank
        allStats.forEach((player, index) => {
            player.rank = index + 1;
        });
        
        return allStats;
    }

    /**
     * Update ping for a specific player
     * @param {string} playerId - Player ID
     * @param {number} ping - Ping value in ms
     */
    updatePlayerPing(playerId, ping) {
        this.updatePlayerStats(playerId, { ping });
    }

    /**
     * Initialize player stats from server data
     * @param {Object} playerData - Player data from server
     */
    initializePlayerStats(playerData) {
        this.updatePlayerStats(playerData.id, {
            username: playerData.username || 'Unknown',
            kills: playerData.score || 0,
            deaths: playerData.deaths || 0,
            isAlive: playerData.alive !== false,
            ping: 0
        });
    }

    /**
     * Dispose of the player manager
     */
    dispose() {
        // Dispose all remote players
        this.remotePlayers.forEach(player => player.dispose());
        this.remotePlayers.clear();
        this.playerStates.clear();
        this.playerStats.clear();
        
        // Clear callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        this.onPlayerStatsUpdated = null;
        
        this.localPlayer = null;
    }
}