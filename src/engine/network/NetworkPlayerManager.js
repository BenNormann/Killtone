/**
 * NetworkPlayerManager - Handles player-related network events
 * Manages remote players and player state synchronization
 */

import RemotePlayer from '../../entities/RemotePlayer.js';

export class NetworkPlayerManager {
    constructor(game) {
        this.game = game;
        
        // Player management
        this.localPlayer = null;
        this.remotePlayers = new Map();
        this.playerStates = new Map();
        
        // State synchronization
        this.lastStateUpdate = 0;
        this.stateUpdateInterval = 1000 / 20; // 20 Hz default
        this.interpolationDelay = 100; // 100ms default
        
        // Event callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
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
    handlePlayerJoined(data) {
        console.log(`Player ${data.player.username} joined the game`);
        
        // Initialize local player data if this is our join event
        if (data.playerId === this.game.networkManager?.playerId) {
            console.log('This is our player join event');
            // Create all existing players as remote players
            if (data.allPlayers) {
                data.allPlayers.forEach(playerData => {
                    if (playerData.id !== this.game.networkManager?.playerId) {
                        this.createRemotePlayer(playerData);
                    }
                });
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
    handleNewPlayerConnected(playerData) {
        console.log('New player connected:', playerData);
        
        // Don't create a remote player for ourselves
        if (playerData.id === this.game.networkManager?.playerId) {
            return;
        }
        
        this.createRemotePlayer(playerData);
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
        
        if (this.onPlayerLeft) {
            this.onPlayerLeft({ playerId });
        }
    }

    /**
     * Handle player movement event
     * @param {Object} data - Movement data
     */
    handlePlayerMoved(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.updateFromNetworkData({
                position: data.position,
                rotation: data.rotation
            });
        }
    }

    /**
     * Handle player killed event
     * @param {Object} data - Kill event data
     */
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
        if (data.victimId === this.game.networkManager?.playerId && this.localPlayer) {
            this.localPlayer.die();
        }
    }

    /**
     * Handle player respawned event
     * @param {Object} data - Respawn event data
     */
    handlePlayerRespawned(data) {
        console.log(`Player ${data.playerId} respawned`);
        
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.updateFromNetworkData(data.player);
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
    createRemotePlayer(playerData) {
        if (this.remotePlayers.has(playerData.id)) {
            return this.remotePlayers.get(playerData.id);
        }
        
        console.log(`Creating remote player: ${playerData.username} (${playerData.id})`);
        
        const remotePlayer = new RemotePlayer(this.game, this.game.scene, playerData);
        this.remotePlayers.set(playerData.id, remotePlayer);
        
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
        // Clean up old player states
        const now = Date.now();
        this.playerStates.forEach((state, playerId) => {
            if (now - state.timestamp > 5000) { // Remove states older than 5 seconds
                this.playerStates.delete(playerId);
            }
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
        
        // Clear callbacks
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onStateUpdate = null;
        
        this.localPlayer = null;
    }
}