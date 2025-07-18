/**
 * InputManager - Centralized input handling with configurable key bindings
 * Handles keyboard, mouse input and context-sensitive controls
 */

import { BaseManager } from './BaseManager.js';

export class InputManager extends BaseManager {
    constructor(game) {
        super(game);
        this.canvas = game.canvas;
        
        // Input state
        this.activeKeys = new Set();
        this.mouseState = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            buttons: 0,
            wheel: 0
        };
        
        // Key bindings - configurable
        this.keyBindings = new Map();
        this.actionHandlers = new Map();
        
        // Input contexts
        this.currentContext = 'menu'; // 'menu', 'game', 'editor'
        this.contextHandlers = new Map();
        
        // Control states
        this.gameControlsEnabled = false;
        this.editorControlsEnabled = false;
        this.pointerLocked = false;
        
        // Event listeners
        this.boundEventHandlers = new Map();
        
        // Initialize default key bindings
        this._initializeDefaultBindings();
        
        // Setup event listeners
        this._setupEventListeners();
    }

    /**
     * Initialize default key bindings from config
     */
    _initializeDefaultBindings() {
        // Get default bindings from mainConfig if available
        const defaultBindings = this.game.config?.controls?.keyBindings || {
            // Movement
            forward: 'KeyW',
            backward: 'KeyS',
            left: 'KeyA', 
            right: 'KeyD',
            jump: 'Space',
            crouch: 'KeyC',
            sprint: 'ShiftLeft',
            
            // Combat
            shoot: 'Mouse0',
            aim: 'Mouse1',
            reload: 'KeyR',
            
            // UI
            settings: 'Escape',
            
            // Editor
            delete: 'Delete',
            duplicate: 'KeyD',
            undo: 'KeyZ',
            redo: 'KeyY'
        };

        // Register default bindings
        for (const [action, key] of Object.entries(defaultBindings)) {
            this.bindKey(key, action);
            // Debug logging for movement keys
            if (action === 'backward' || action === 'forward') {
                console.log(`Bound ${action} to ${key}`);
            }
        }
    }

    /**
     * Setup event listeners for input capture
     */
    _setupEventListeners() {
        // Keyboard events
        const keyDownHandler = (event) => this._handleKeyDown(event);
        const keyUpHandler = (event) => this._handleKeyUp(event);
        
        // Mouse events
        const mouseDownHandler = (event) => this._handleMouseDown(event);
        const mouseUpHandler = (event) => this._handleMouseUp(event);
        const mouseMoveHandler = (event) => this._handleMouseMove(event);
        const mouseWheelHandler = (event) => this._handleMouseWheel(event);
        
        // Pointer lock events
        const pointerLockChangeHandler = () => this._handlePointerLockChange();
        
        // Add event listeners
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);
        
        this.canvas.addEventListener('mousedown', mouseDownHandler);
        this.canvas.addEventListener('mouseup', mouseUpHandler);
        this.canvas.addEventListener('mousemove', mouseMoveHandler);
        this.canvas.addEventListener('wheel', mouseWheelHandler);
        
        document.addEventListener('pointerlockchange', pointerLockChangeHandler);
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock failed');
        });
        
        // Store bound handlers for cleanup
        this.boundEventHandlers.set('keydown', keyDownHandler);
        this.boundEventHandlers.set('keyup', keyUpHandler);
        this.boundEventHandlers.set('mousedown', mouseDownHandler);
        this.boundEventHandlers.set('mouseup', mouseUpHandler);
        this.boundEventHandlers.set('mousemove', mouseMoveHandler);
        this.boundEventHandlers.set('wheel', mouseWheelHandler);
        this.boundEventHandlers.set('pointerlockchange', pointerLockChangeHandler);
    }

    /**
     * Bind a key to an action
     * @param {string} key - Key code (e.g., 'KeyW', 'Mouse0')
     * @param {string} action - Action name
     * @param {Function} handler - Optional custom handler
     */
    bindKey(key, action, handler = null) {
        this.keyBindings.set(key, action);
        
        if (handler) {
            this.actionHandlers.set(action, handler);
        }
    }

    /**
     * Register an action handler
     * @param {string} action - Action name
     * @param {Function} handler - Handler function
     */
    registerActionHandler(action, handler) {
        this.actionHandlers.set(action, handler);
    }

    /**
     * Set input context (menu, game, editor)
     * @param {string} context - Input context
     */
    setContext(context) {
        if (this.currentContext !== context) {
            console.log(`Input context changed: ${this.currentContext} -> ${context}`);
            this.currentContext = context;
            
            // Call context change handler if registered
            const handler = this.contextHandlers.get(context);
            if (handler) {
                handler();
            }
        }
    }

    /**
     * Register context change handler
     * @param {string} context - Context name
     * @param {Function} handler - Handler function
     */
    registerContextHandler(context, handler) {
        this.contextHandlers.set(context, handler);
    }

    /**
     * Enable game controls (FPS movement, shooting)
     */
    enableGameControls() {
        this.gameControlsEnabled = true;
        this.setContext('game');
        
        // Request pointer lock for FPS controls
        this._requestPointerLock();
        
        console.log('Game controls enabled');
    }

    /**
     * Disable game controls
     */
    disableGameControls() {
        this.gameControlsEnabled = false;
        
        // Exit pointer lock
        this._exitPointerLock();
        
        // Clear active keys
        this.activeKeys.clear();
        
        console.log('Game controls disabled');
    }

    /**
     * Enable editor controls
     */
    enableEditorControls() {
        this.editorControlsEnabled = true;
        this.setContext('editor');
        
        console.log('Editor controls enabled');
    }

    /**
     * Disable editor controls
     */
    disableEditorControls() {
        this.editorControlsEnabled = false;
        this.activeKeys.clear();
        
        console.log('Editor controls disabled');
    }

    /**
     * Handle key down events
     */
    _handleKeyDown(event) {
        const key = event.code;
        
        // Add to active keys
        this.activeKeys.add(key);
        
        // Handle ESC key specially - always works regardless of context
        if (key === 'Escape') {
            this._handleESCKey();
            event.preventDefault();
            return;
        }
        
        // Handle TAB key specially - show/hide leaderboard
        if (key === 'Tab') {
            this._handleTABKey();
            event.preventDefault();
            return;
        }
        
        // Get bound action
        const action = this.keyBindings.get(key);
        if (!action) {
            // Debug: log when no action is found for a key
            if (key === 'KeyS') {
                console.log('No action bound to KeyS');
            }
            return;
        }
        

        
        // Check if input should be processed in current context
        if (!this._shouldProcessInput(action)) {
            return;
        }
        
        // Call action handler
        const handler = this.actionHandlers.get(action);
        if (handler) {
            handler(true, event); // true for key down
        }
        
        // Prevent default for game keys
        if (this._isGameKey(action)) {
            event.preventDefault();
        }
    }

    /**
     * Handle key up events
     */
    _handleKeyUp(event) {
        const key = event.code;
        
        // Remove from active keys
        this.activeKeys.delete(key);
        
        // Get bound action
        const action = this.keyBindings.get(key);
        if (!action) return;
        
        // Check if input should be processed in current context
        if (!this._shouldProcessInput(action)) {
            return;
        }
        
        // Call action handler
        const handler = this.actionHandlers.get(action);
        if (handler) {
            handler(false, event); // false for key up
        }
    }

    /**
     * Handle mouse down events
     */
    _handleMouseDown(event) {
        const mouseKey = `Mouse${event.button}`;
        this.mouseState.buttons |= (1 << event.button);
        
        // Treat as key press
        const action = this.keyBindings.get(mouseKey);
        if (action && this._shouldProcessInput(action)) {
            const handler = this.actionHandlers.get(action);
            if (handler) {
                handler(true, event);
            }
        }
        
        // Request pointer lock on first click in game mode
        if (this.currentContext === 'game' && !this.pointerLocked) {
            this._requestPointerLock();
        }
        
        event.preventDefault();
    }

    /**
     * Handle mouse up events
     */
    _handleMouseUp(event) {
        const mouseKey = `Mouse${event.button}`;
        this.mouseState.buttons &= ~(1 << event.button);
        
        // Treat as key release
        const action = this.keyBindings.get(mouseKey);
        if (action && this._shouldProcessInput(action)) {
            const handler = this.actionHandlers.get(action);
            if (handler) {
                handler(false, event);
            }
        }
        
        event.preventDefault();
    }

    /**
     * Handle mouse move events
     */
    _handleMouseMove(event) {
        // Update mouse position
        this.mouseState.x = event.clientX;
        this.mouseState.y = event.clientY;
        
        // Calculate delta for pointer locked mode
        if (this.pointerLocked) {
            this.mouseState.deltaX = event.movementX || 0;
            this.mouseState.deltaY = event.movementY || 0;
            
            // Send mouse movement to game if in game context
            if (this.currentContext === 'game' && this.gameControlsEnabled) {
                this._handleMouseLook(this.mouseState.deltaX, this.mouseState.deltaY);
            }
        }
    }

    /**
     * Handle mouse wheel events
     */
    _handleMouseWheel(event) {
        this.mouseState.wheel = event.deltaY;
        
        // Handle weapon switching in game context
        if (this.currentContext === 'game' && this.gameControlsEnabled) {
            const direction = event.deltaY > 0 ? 'down' : 'up';
            this._handleWeaponSwitch(direction);
        }
        
        event.preventDefault();
    }

    /**
     * Handle ESC key - context-sensitive behavior
     */
    _handleESCKey() {
        const stateManager = this.game.stateManager;
        if (!stateManager) return;
        
        const currentState = stateManager.getCurrentState();
        
        switch (currentState) {
            case 'IN_GAME':
                // Pause game and show settings
                stateManager.transitionTo('PAUSED');
                break;
                
            case 'PAUSED':
                // Resume game
                stateManager.transitionTo('IN_GAME');
                break;
                
            case 'MAP_EDITOR':
                // Exit editor to main menu
                stateManager.transitionTo('MAIN_MENU');
                break;
                
            case 'MAIN_MENU':
                // Could close game or do nothing
                break;
        }
    }

    /**
     * Handle TAB key - show/hide leaderboard
     */
    _handleTABKey() {
        const uiManager = this.game.uiManager;
        if (!uiManager) return;
        
        const currentState = this.game.stateManager?.getCurrentState();
        
        // Only show leaderboard in game states
        if (currentState === 'IN_GAME' || currentState === 'PAUSED') {
            if (uiManager.leaderboard && uiManager.leaderboard.isVisible) {
                uiManager.hideLeaderboard();
            } else {
                uiManager.showLeaderboard();
            }
        }
    }

    /**
     * Handle mouse look for FPS camera
     */
    _handleMouseLook(deltaX, deltaY) {
        if (this.game.player) {
            this.game.player.handleMouseLook(deltaX, deltaY);
        }
    }

    /**
     * Handle weapon switching
     */
    _handleWeaponSwitch(direction) {
        if (this.game.player) {
            this.game.player.switchWeapon(direction);
        }
    }

    /**
     * Check if input should be processed in current context
     */
    _shouldProcessInput(action) {
        switch (this.currentContext) {
            case 'menu':
                return this._isMenuAction(action);
            case 'game':
                return this.gameControlsEnabled && this._isGameAction(action);
            case 'editor':
                return this.editorControlsEnabled && this._isEditorAction(action);
            default:
                return false;
        }
    }

    /**
     * Check if action is a menu action
     */
    _isMenuAction(action) {
        const menuActions = ['settings'];
        return menuActions.includes(action);
    }

    /**
     * Check if action is a game action
     */
    _isGameAction(action) {
        const gameActions = [
            'forward', 'backward', 'left', 'right', 'jump', 'crouch', 'sprint',
            'shoot', 'aim', 'reload'
        ];
        return gameActions.includes(action);
    }

    /**
     * Check if action is an editor action
     */
    _isEditorAction(action) {
        const editorActions = [
            'delete', 'duplicate', 'undo', 'redo'
        ];
        return editorActions.includes(action);
    }

    /**
     * Check if action corresponds to a game key
     */
    _isGameKey(action) {
        return this._isGameAction(action);
    }

    /**
     * Request pointer lock
     */
    _requestPointerLock() {
        if (this.canvas.requestPointerLock) {
            this.canvas.requestPointerLock();
        }
    }

    /**
     * Exit pointer lock
     */
    _exitPointerLock() {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    /**
     * Handle pointer lock change
     */
    _handlePointerLockChange() {
        this.pointerLocked = document.pointerLockElement === this.canvas;
        console.log(`Pointer lock: ${this.pointerLocked ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if key is currently pressed
     * @param {string} key - Key code
     * @returns {boolean}
     */
    isKeyPressed(key) {
        return this.activeKeys.has(key);
    }

    /**
     * Check if action is currently active
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionActive(action) {
        // Find key bound to this action
        for (const [key, boundAction] of this.keyBindings) {
            if (boundAction === action) {
                if (key.startsWith('Mouse')) {
                    const button = parseInt(key.replace('Mouse', ''));
                    return (this.mouseState.buttons & (1 << button)) !== 0;
                } else {
                    return this.activeKeys.has(key);
                }
            }
        }
        return false;
    }

    /**
     * Get mouse state
     * @returns {Object} Mouse state
     */
    getMouseState() {
        return { ...this.mouseState };
    }

    /**
     * Update method - called each frame
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Reset mouse deltas after processing
        this.mouseState.deltaX = 0;
        this.mouseState.deltaY = 0;
        this.mouseState.wheel = 0;
    }

    /**
     * Cleanup resources
     */
    _doDispose() {
        // Remove event listeners
        for (const [eventType, handler] of this.boundEventHandlers) {
            if (eventType === 'keydown' || eventType === 'keyup') {
                document.removeEventListener(eventType, handler);
            } else if (eventType.startsWith('mouse') || eventType === 'wheel') {
                this.canvas.removeEventListener(eventType, handler);
            } else {
                document.removeEventListener(eventType, handler);
            }
        }
        
        // Exit pointer lock
        this._exitPointerLock();
        
        // Clear collections
        this.keyBindings.clear();
        this.actionHandlers.clear();
        this.contextHandlers.clear();
        this.activeKeys.clear();
        this.boundEventHandlers.clear();
        
        this.canvas = null;
    }
}