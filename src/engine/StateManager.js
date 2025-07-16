/**
 * StateManager - Manages game state transitions and cleanup
 * Handles LOADING, MAIN_MENU, IN_GAME, PAUSED, MAP_EDITOR states
 */

export class StateManager {
    // Game states
    static STATES = {
        LOADING: 'LOADING',
        MAIN_MENU: 'MAIN_MENU', 
        IN_GAME: 'IN_GAME',
        PAUSED: 'PAUSED',
        MAP_EDITOR: 'MAP_EDITOR'
    };

    constructor(game) {
        this.game = game;
        this.currentState = StateManager.STATES.LOADING;
        this.previousState = null;
        this.stateHandlers = new Map();
        this.isTransitioning = false;
        
        // Initialize state handlers
        this._initializeStateHandlers();
    }

    /**
     * Initialize default state handlers
     */
    _initializeStateHandlers() {
        // LOADING state handler
        this.registerStateHandler(StateManager.STATES.LOADING, {
            enter: async () => {
                console.log('Entering LOADING state');
                // Initialize loading screen
                if (this.game.uiManager) {
                    await this.game.uiManager.showLoadingScreen();
                }
            },
            exit: async () => {
                console.log('Exiting LOADING state');
                // Hide loading screen
                if (this.game.uiManager) {
                    this.game.uiManager.hideLoadingScreen();
                }
            }
        });

        // MAIN_MENU state handler
        this.registerStateHandler(StateManager.STATES.MAIN_MENU, {
            enter: async () => {
                console.log('Entering MAIN_MENU state');
                // Show main menu
                if (this.game.uiManager) {
                    await this.game.uiManager.showMainMenu();
                }
                // Disable game controls
                if (this.game.inputManager) {
                    this.game.inputManager.disableGameControls();
                }
            },
            exit: async () => {
                console.log('Exiting MAIN_MENU state');
                // Hide main menu
                if (this.game.uiManager) {
                    this.game.uiManager.hideMainMenu();
                }
            }
        });

        // IN_GAME state handler
        this.registerStateHandler(StateManager.STATES.IN_GAME, {
            enter: async () => {
                console.log('Entering IN_GAME state');
                // Enable game controls
                if (this.game.inputManager) {
                    this.game.inputManager.enableGameControls();
                }
                // Hide any UI overlays
                if (this.game.uiManager) {
                    this.game.uiManager.hideSettingsOverlay();
                    await this.game.uiManager.showGameHUD();
                }
                // Resume game systems
                this._resumeGameSystems();
            },
            exit: async () => {
                console.log('Exiting IN_GAME state');
                // Pause game systems when leaving
                this._pauseGameSystems();
            }
        });

        // PAUSED state handler
        this.registerStateHandler(StateManager.STATES.PAUSED, {
            enter: async () => {
                console.log('Entering PAUSED state');
                // Show settings overlay
                if (this.game.uiManager) {
                    await this.game.uiManager.showSettingsOverlay();
                }
                // Disable game controls but keep ESC key active
                if (this.game.inputManager) {
                    this.game.inputManager.disableGameControls();
                }
                // Pause game systems
                this._pauseGameSystems();
            },
            exit: async () => {
                console.log('Exiting PAUSED state');
                // Hide settings overlay
                if (this.game.uiManager) {
                    this.game.uiManager.hideSettingsOverlay();
                }
            }
        });

        // MAP_EDITOR state handler
        this.registerStateHandler(StateManager.STATES.MAP_EDITOR, {
            enter: async () => {
                console.log('Entering MAP_EDITOR state');
                // Initialize map editor
                if (this.game.mapManager) {
                    await this.game.mapManager.enterEditorMode();
                }
                // Show editor UI
                if (this.game.uiManager) {
                    await this.game.uiManager.showMapEditor();
                }
                // Enable editor controls
                if (this.game.inputManager) {
                    this.game.inputManager.enableEditorControls();
                }
            },
            exit: async () => {
                console.log('Exiting MAP_EDITOR state');
                // Exit map editor
                if (this.game.mapManager) {
                    await this.game.mapManager.exitEditorMode();
                }
                // Hide editor UI
                if (this.game.uiManager) {
                    this.game.uiManager.hideMapEditor();
                }
            }
        });
    }

    /**
     * Register a state handler
     * @param {string} state - The state name
     * @param {Object} handler - Handler with enter/exit methods
     */
    registerStateHandler(state, handler) {
        if (!StateManager.STATES[state] && !Object.values(StateManager.STATES).includes(state)) {
            console.warn(`Unknown state: ${state}`);
        }
        this.stateHandlers.set(state, handler);
    }

    /**
     * Transition to a new state
     * @param {string} newState - The target state
     * @returns {Promise<boolean>} - Success of transition
     */
    async transitionTo(newState) {
        // Validate state
        if (!this._isValidState(newState)) {
            console.error(`Invalid state: ${newState}`);
            return false;
        }

        // Prevent concurrent transitions
        if (this.isTransitioning) {
            console.warn(`Already transitioning to state. Ignoring transition to ${newState}`);
            return false;
        }

        // Validate transition
        if (!this._isValidTransition(this.currentState, newState)) {
            console.error(`Invalid transition from ${this.currentState} to ${newState}`);
            return false;
        }

        this.isTransitioning = true;

        try {
            console.log(`State transition: ${this.currentState} -> ${newState}`);

            // Exit current state
            const currentHandler = this.stateHandlers.get(this.currentState);
            if (currentHandler && currentHandler.exit) {
                await currentHandler.exit();
            }

            // Update state
            this.previousState = this.currentState;
            this.currentState = newState;

            // Enter new state
            const newHandler = this.stateHandlers.get(newState);
            if (newHandler && newHandler.enter) {
                await newHandler.enter();
            }

            console.log(`State transition completed: ${newState}`);
            return true;

        } catch (error) {
            console.error(`Error during state transition to ${newState}:`, error);
            // Attempt to rollback
            this.currentState = this.previousState;
            return false;
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get previous state
     * @returns {string} Previous state
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Check if currently in a specific state
     * @param {string} state - State to check
     * @returns {boolean}
     */
    isInState(state) {
        return this.currentState === state;
    }

    /**
     * Check if state is valid
     * @param {string} state - State to validate
     * @returns {boolean}
     */
    _isValidState(state) {
        return Object.values(StateManager.STATES).includes(state);
    }

    /**
     * Validate state transition
     * @param {string} fromState - Current state
     * @param {string} toState - Target state
     * @returns {boolean}
     */
    _isValidTransition(fromState, toState) {
        // Same state transition is not allowed
        if (fromState === toState) {
            return false;
        }

        // Define valid transitions
        const validTransitions = {
            [StateManager.STATES.LOADING]: [
                StateManager.STATES.MAIN_MENU
            ],
            [StateManager.STATES.MAIN_MENU]: [
                StateManager.STATES.IN_GAME,
                StateManager.STATES.MAP_EDITOR
            ],
            [StateManager.STATES.IN_GAME]: [
                StateManager.STATES.PAUSED,
                StateManager.STATES.MAIN_MENU
            ],
            [StateManager.STATES.PAUSED]: [
                StateManager.STATES.IN_GAME,
                StateManager.STATES.MAIN_MENU
            ],
            [StateManager.STATES.MAP_EDITOR]: [
                StateManager.STATES.MAIN_MENU,
                StateManager.STATES.IN_GAME // For play mode testing
            ]
        };

        const allowedTransitions = validTransitions[fromState] || [];
        return allowedTransitions.includes(toState);
    }

    /**
     * Pause game systems (physics, audio, etc.)
     */
    _pauseGameSystems() {
        // Pause physics
        if (this.game.physicsManager) {
            this.game.physicsManager.pause();
        }

        // Pause audio (but keep UI sounds)
        if (this.game.audioManager) {
            this.game.audioManager.pauseGameAudio();
        }

        // Pause game entities
        if (this.game.entityManager) {
            this.game.entityManager.pauseAll();
        }
    }

    /**
     * Resume game systems
     */
    _resumeGameSystems() {
        // Resume physics
        if (this.game.physicsManager) {
            this.game.physicsManager.resume();
        }

        // Resume audio
        if (this.game.audioManager) {
            this.game.audioManager.resumeGameAudio();
        }

        // Resume game entities
        if (this.game.entityManager) {
            this.game.entityManager.resumeAll();
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.stateHandlers.clear();
        this.currentState = null;
        this.previousState = null;
        this.game = null;
    }
}