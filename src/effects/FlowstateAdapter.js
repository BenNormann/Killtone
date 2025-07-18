/**
 * FlowstateAdapter - Integration adapter for existing FlowstateEffects system
 * Connects the kill-streak system to the new event system and player management
 */

import { EventEmitter } from '../utils/EventEmitter.js';

export class FlowstateAdapter extends EventEmitter {
    constructor(game, flowstateManager) {
        super();
        
        this.game = game;
        this.flowstateManager = flowstateManager;
        this.isInitialized = false;
        
        // Event bindings
        this.onPlayerKillBound = this.onPlayerKill.bind(this);
        this.onPlayerDeathBound = this.onPlayerDeath.bind(this);
        this.onRemotePlayerDeathBound = this.onRemotePlayerDeath.bind(this);
        this.onStateChangeBound = this.onStateChange.bind(this);
        
        console.log('FlowstateAdapter: Created');
    }

    /**
     * Initialize the adapter and connect to framework events
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('FlowstateAdapter: Already initialized');
            return;
        }

        try {
            console.log('FlowstateAdapter: Initializing...');
            
            // Connect to game events
            this.connectToGameEvents();
            
            // Connect to state manager events
            this.connectToStateEvents();
            
            // Connect to player manager events
            this.connectToPlayerEvents();
            
            // Ensure flowstate manager has access to game systems
            this.updateFlowstateManagerReferences();
            
            this.isInitialized = true;
            console.log('FlowstateAdapter: Initialization complete');
            
        } catch (error) {
            console.error('FlowstateAdapter: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Connect to general game events
     */
    connectToGameEvents() {
        // Listen for game state changes that affect flowstate
        if (this.game.stateManager) {
            this.game.stateManager.on('stateChanged', this.onStateChangeBound);
        }
        
        // Listen for settings changes that might affect flowstate
        if (this.game.configManager) {
            this.game.configManager.on('settingsChanged', this.onSettingsChanged.bind(this));
        }
    }

    /**
     * Connect to state manager events
     */
    connectToStateEvents() {
        if (!this.game.stateManager) return;
        
        // Handle state transitions that affect flowstate
        this.game.stateManager.on('enterState', (state) => {
            switch (state) {
                case 'IN_GAME':
                    this.enableFlowstate();
                    break;
                case 'PAUSED':
                case 'MAIN_MENU':
                case 'MAP_EDITOR':
                    this.pauseFlowstate();
                    break;
            }
        });

        this.game.stateManager.on('exitState', (state) => {
            if (state === 'IN_GAME') {
                this.resetFlowstate();
            }
        });
    }

    /**
     * Connect to player manager events
     */
    connectToPlayerEvents() {
        if (!this.game.playerManager) {
            console.warn('FlowstateAdapter: PlayerManager not available, will connect later');
            return;
        }

        // Listen for kill events
        this.game.playerManager.on('playerKill', this.onPlayerKillBound);
        
        // Listen for death events
        this.game.playerManager.on('playerDeath', this.onPlayerDeathBound);
        this.game.playerManager.on('remotePlayerDeath', this.onRemotePlayerDeathBound);
        
        // Listen for player spawns/respawns
        this.game.playerManager.on('playerSpawn', this.onPlayerSpawn.bind(this));
        this.game.playerManager.on('remotePlayerSpawn', this.onRemotePlayerSpawn.bind(this));
        
        console.log('FlowstateAdapter: Connected to player events');
    }

    /**
     * Update flowstate manager with current game system references
     */
    updateFlowstateManagerReferences() {
        if (!this.flowstateManager) return;
        
        // Ensure flowstate manager has access to current game systems
        this.flowstateManager.game = this.game;
        this.flowstateManager.scene = this.game.scene;
        this.flowstateManager.camera = this.game.camera;
        
        console.log('FlowstateAdapter: Updated FlowstateManager references');
    }

    /**
     * Handle player kill events
     */
    onPlayerKill(killData) {
        if (!this.flowstateManager || !this.isFlowstateEnabled()) {
            return;
        }

        try {
            console.log('FlowstateAdapter: Player kill detected, triggering flowstate');
            
            // Call the existing flowstate system
            this.flowstateManager.onKill();
            
            // Emit adapter event for other systems
            this.emit('flowstateKill', {
                killStreak: this.flowstateManager.killStreak,
                intensity: this.flowstateManager.targetIntensity,
                killData: killData
            });
            
        } catch (error) {
            console.error('FlowstateAdapter: Error handling player kill:', error);
        }
    }

    /**
     * Handle player death events
     */
    onPlayerDeath(deathData) {
        if (!this.flowstateManager) {
            return;
        }

        try {
            console.log('FlowstateAdapter: Player death detected, resetting flowstate');
            
            // Call the existing flowstate system
            this.flowstateManager.onDeath();
            
            // Emit adapter event for other systems
            this.emit('flowstateReset', {
                reason: 'playerDeath',
                deathData: deathData
            });
            
        } catch (error) {
            console.error('FlowstateAdapter: Error handling player death:', error);
        }
    }

    /**
     * Handle remote player death events
     */
    onRemotePlayerDeath(playerId, deathData) {
        if (!this.flowstateManager || !this.flowstateManager.isActive) {
            return;
        }

        try {
            console.log(`FlowstateAdapter: Remote player ${playerId} death detected during flowstate`);
            
            // Call the existing flowstate system
            this.flowstateManager.onRemotePlayerDeath(playerId);
            
            // Emit adapter event for other systems
            this.emit('flowstateRemotePlayerDeath', {
                playerId: playerId,
                deathData: deathData
            });
            
        } catch (error) {
            console.error('FlowstateAdapter: Error handling remote player death:', error);
        }
    }

    /**
     * Handle player spawn events
     */
    onPlayerSpawn(spawnData) {
        // Player spawned, ensure flowstate is reset if needed
        if (this.flowstateManager && this.flowstateManager.isActive) {
            console.log('FlowstateAdapter: Player spawned, ensuring flowstate is properly reset');
            this.flowstateManager.onDeath(); // Reset flowstate on respawn
        }
    }

    /**
     * Handle remote player spawn events
     */
    onRemotePlayerSpawn(playerId, spawnData) {
        // Remote player spawned, update highlighting if flowstate is active
        if (this.flowstateManager && this.flowstateManager.isActive) {
            console.log(`FlowstateAdapter: Remote player ${playerId} spawned during flowstate, updating highlighting`);
            
            // Delay highlighting update to ensure player mesh is ready
            setTimeout(() => {
                this.flowstateManager.updatePlayerHighlighting();
            }, 100);
        }
    }

    /**
     * Handle game state changes
     */
    onStateChange(newState, previousState) {
        console.log(`FlowstateAdapter: State changed from ${previousState} to ${newState}`);
        
        // Update flowstate manager references when state changes
        this.updateFlowstateManagerReferences();
        
        // Emit state change event for flowstate-specific handling
        this.emit('stateChanged', { newState, previousState });
    }

    /**
     * Handle settings changes
     */
    onSettingsChanged(settings) {
        if (!this.flowstateManager) return;
        
        // Update flowstate settings if they exist
        if (settings.flowstate) {
            console.log('FlowstateAdapter: Flowstate settings changed');
            
            // Update base volume if changed
            if (settings.flowstate.baseVolume !== undefined) {
                this.flowstateManager.baseVolume = settings.flowstate.baseVolume;
            }
            
            // Update max kill streak if changed
            if (settings.flowstate.maxKillStreak !== undefined) {
                this.flowstateManager.maxKillStreak = settings.flowstate.maxKillStreak;
            }
            
            // Update inactivity timeout if changed
            if (settings.flowstate.inactivityTimeout !== undefined) {
                this.flowstateManager.inactivityTimeout = settings.flowstate.inactivityTimeout;
            }
        }
    }

    /**
     * Enable flowstate system
     */
    enableFlowstate() {
        if (!this.flowstateManager) return;
        
        console.log('FlowstateAdapter: Enabling flowstate system');
        
        // Ensure flowstate manager has current references
        this.updateFlowstateManagerReferences();
        
        // Emit enable event
        this.emit('flowstateEnabled');
    }

    /**
     * Pause flowstate system (during pause/menu states)
     */
    pauseFlowstate() {
        if (!this.flowstateManager || !this.flowstateManager.isActive) return;
        
        console.log('FlowstateAdapter: Pausing flowstate system');
        
        // Pause background music but keep visual effects
        if (this.flowstateManager.backgroundMusic) {
            this.flowstateManager.backgroundMusic.pause();
        }
        
        // Emit pause event
        this.emit('flowstatePaused');
    }

    /**
     * Reset flowstate system (when leaving game)
     */
    resetFlowstate() {
        if (!this.flowstateManager) return;
        
        console.log('FlowstateAdapter: Resetting flowstate system');
        
        // Stop flowstate completely
        this.flowstateManager.stopFlowstate();
        
        // Emit reset event
        this.emit('flowstateReset', { reason: 'stateChange' });
    }

    /**
     * Check if flowstate should be enabled based on current game state
     */
    isFlowstateEnabled() {
        if (!this.game.stateManager) return false;
        
        const currentState = this.game.stateManager.getCurrentState();
        return currentState === 'IN_GAME';
    }

    /**
     * Get current flowstate status
     */
    getFlowstateStatus() {
        if (!this.flowstateManager) {
            return {
                isActive: false,
                killStreak: 0,
                intensity: 0
            };
        }
        
        return {
            isActive: this.flowstateManager.isActive,
            killStreak: this.flowstateManager.killStreak,
            intensity: this.flowstateManager.targetIntensity,
            maxKillStreak: this.flowstateManager.maxKillStreak
        };
    }

    /**
     * Force update player highlighting (useful for debugging or manual refresh)
     */
    updatePlayerHighlighting() {
        if (this.flowstateManager && this.flowstateManager.isActive) {
            console.log('FlowstateAdapter: Manually updating player highlighting');
            this.flowstateManager.updatePlayerHighlighting();
        }
    }

    /**
     * Connect to player manager if it becomes available later
     */
    connectToPlayerManagerLater() {
        if (this.game.playerManager && !this._playerEventsConnected) {
            console.log('FlowstateAdapter: PlayerManager now available, connecting events');
            this.connectToPlayerEvents();
            this._playerEventsConnected = true;
        }
    }

    /**
     * Update method called from game loop
     */
    update(deltaTime) {
        // Check if we need to connect to player manager
        if (!this._playerEventsConnected && this.game.playerManager) {
            this.connectToPlayerManagerLater();
        }
        
        // Update flowstate manager if it has an update method
        if (this.flowstateManager && typeof this.flowstateManager.update === 'function') {
            this.flowstateManager.update(deltaTime);
        }
    }

    /**
     * Cleanup and dispose
     */
    dispose() {
        console.log('FlowstateAdapter: Disposing...');
        
        // Disconnect from all events
        if (this.game.stateManager) {
            this.game.stateManager.off('stateChanged', this.onStateChangeBound);
            this.game.stateManager.off('enterState');
            this.game.stateManager.off('exitState');
        }
        
        if (this.game.playerManager) {
            this.game.playerManager.off('playerKill', this.onPlayerKillBound);
            this.game.playerManager.off('playerDeath', this.onPlayerDeathBound);
            this.game.playerManager.off('remotePlayerDeath', this.onRemotePlayerDeathBound);
        }
        
        if (this.game.configManager) {
            this.game.configManager.off('settingsChanged');
        }
        
        // Reset flowstate
        this.resetFlowstate();
        
        // Clear references
        this.flowstateManager = null;
        this.game = null;
        this.isInitialized = false;
        
        // Call parent dispose
        super.dispose();
        
        console.log('FlowstateAdapter: Disposed');
    }
}

export default FlowstateAdapter;