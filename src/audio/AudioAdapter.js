/**
 * KILLtONE Game Framework - Audio Adapter
 * Integrates existing AudioManager with the framework event system
 * Handles state changes, settings updates, and framework coordination
 * Music only plays during flowstate, selected from main menu dropdown
 */

export class AudioAdapter {
    constructor(game, audioManager) {
        this.game = game;
        this.audioManager = audioManager;
        this.currentState = null;
        this.settings = {
            masterVolume: 1.0,
            musicVolume: 0.8,
            effectsVolume: 1.0,
            enabled: true
        };
        
        // Track flowstate music
        this.flowstateMusic = null;
        this.selectedFlowstateTrack = null; // Set from main menu dropdown
        this.availableTracks = [
            'src/assets/sounds/songs/Phonk1.mp3',
            'src/assets/sounds/songs/Phonk2.mp3',
            'src/assets/sounds/songs/Synthwave1.mp3',
            'src/assets/sounds/songs/Synthwave2.mp3'
        ];
        
        // Flowstate state
        this.isInFlowstate = false;
        this.flowstateIntensity = 0;
        
        // Event listeners storage
        this.eventListeners = [];
        
        this.initialize();
    }

    /**
     * Initialize the audio adapter and set up event listeners
     */
    initialize() {
        console.log('AudioAdapter initializing...');
        
        // Listen for framework events
        this.setupFrameworkListeners();
        
        // Apply initial settings
        this.applySettings(this.settings);
        
        console.log('AudioAdapter initialized successfully');
    }

    /**
     * Set up listeners for framework events
     */
    setupFrameworkListeners() {
        // Listen for state changes from StateManager
        if (this.game.stateManager) {
            const stateListener = (newState, oldState) => this.onStateChange(newState, oldState);
            this.game.stateManager.on('stateChanged', stateListener);
            this.eventListeners.push({ target: this.game.stateManager, event: 'stateChanged', listener: stateListener });
        }

        // Listen for settings changes from UIManager
        if (this.game.uiManager) {
            const settingsListener = (newSettings) => this.onSettingsChange(newSettings);
            this.game.uiManager.on('settingsChanged', settingsListener);
            this.eventListeners.push({ target: this.game.uiManager, event: 'settingsChanged', listener: settingsListener });
        }

        // Listen for player events
        if (this.game.playerManager) {
            const killListener = (data) => this.onPlayerKill(data);
            const deathListener = (data) => this.onPlayerDeath(data);
            const moveListener = (data) => this.onPlayerMove(data);
            
            this.game.playerManager.on('playerKill', killListener);
            this.game.playerManager.on('playerDeath', deathListener);
            this.game.playerManager.on('playerMove', moveListener);
            
            this.eventListeners.push(
                { target: this.game.playerManager, event: 'playerKill', listener: killListener },
                { target: this.game.playerManager, event: 'playerDeath', listener: deathListener },
                { target: this.game.playerManager, event: 'playerMove', listener: moveListener }
            );
        }

        // Listen for weapon events
        if (this.game.weaponManager) {
            const fireListener = (data) => this.onWeaponFired(data);
            const reloadListener = (data) => this.onWeaponReload(data);
            
            this.game.weaponManager.on('weaponFired', fireListener);
            this.game.weaponManager.on('weaponReload', reloadListener);
            
            this.eventListeners.push(
                { target: this.game.weaponManager, event: 'weaponFired', listener: fireListener },
                { target: this.game.weaponManager, event: 'weaponReload', listener: reloadListener }
            );
        }

        // Listen for flowstate events (kill-streak system)
        if (this.game.flowstateManager) {
            const flowstateListener = (intensity, isActive) => this.onFlowstateChange(intensity, isActive);
            this.game.flowstateManager.on('flowstateChanged', flowstateListener);
            this.eventListeners.push({ target: this.game.flowstateManager, event: 'flowstateChanged', listener: flowstateListener });
        }

        // Listen for music selection from main menu
        if (this.game.uiManager) {
            const musicSelectListener = (trackPath) => this.onMusicTrackSelected(trackPath);
            this.game.uiManager.on('musicTrackSelected', musicSelectListener);
            this.eventListeners.push({ target: this.game.uiManager, event: 'musicTrackSelected', listener: musicSelectListener });
        }
    }

    /**
     * Handle game state changes
     * @param {string} newState - New game state
     * @param {string} oldState - Previous game state
     */
    onStateChange(newState, oldState) {
        console.log(`AudioAdapter: State changed from ${oldState} to ${newState}`);
        this.currentState = newState;

        switch (newState) {
            case 'LOADING':
                this.handleLoadingState();
                break;
                
            case 'MAIN_MENU':
                this.handleMainMenuState();
                break;
                
            case 'IN_GAME':
                this.handleInGameState();
                break;
                
            case 'PAUSED':
                this.handlePausedState();
                break;
                
            case 'MAP_EDITOR':
                this.handleMapEditorState();
                break;
                
            default:
                console.warn(`AudioAdapter: Unknown state ${newState}`);
        }
    }

    /**
     * Handle loading state audio
     */
    handleLoadingState() {
        // Stop any current music
        this.stopFlowstateMusic();
        
        // Ensure audio context is ready
        this.audioManager.resumeAudioContext();
        
        // Start preloading sounds if not already done
        if (!this.audioManager.isPreloadingComplete()) {
            this.audioManager.preloadSounds().then((result) => {
                console.log('Audio preloading completed:', result);
            });
        }
    }

    /**
     * Handle main menu state audio
     */
    handleMainMenuState() {
        // Stop any flowstate music when returning to menu
        this.stopFlowstateMusic();
        this.isInFlowstate = false;
        
        // Reduce effects volume slightly for menu
        this.audioManager.setMasterVolume(this.settings.masterVolume * 0.8);
    }

    /**
     * Handle in-game state audio
     */
    handleInGameState() {
        // Set full effects volume for gameplay
        this.audioManager.setMasterVolume(this.settings.masterVolume);
        
        // Resume audio context if suspended
        this.audioManager.resumeAudioContext();
        
        // No background music - only flowstate music when triggered
    }

    /**
     * Handle paused state audio
     */
    handlePausedState() {
        // Lower flowstate music volume when paused
        if (this.flowstateMusic && this.isInFlowstate) {
            this.flowstateMusic.volume = this.settings.musicVolume * 0.3;
        }
        
        // Stop walking sounds
        this.audioManager.stopWalkingSound();
    }

    /**
     * Handle map editor state audio
     */
    handleMapEditorState() {
        // Stop any flowstate music in editor
        this.stopFlowstateMusic();
        this.isInFlowstate = false;
        
        // Set moderate volume for editor
        this.audioManager.setMasterVolume(this.settings.masterVolume * 0.6);
    }

    /**
     * Handle music track selection from main menu dropdown
     * @param {string} trackPath - Path to selected music track
     */
    onMusicTrackSelected(trackPath) {
        console.log(`AudioAdapter: Music track selected: ${trackPath}`);
        this.selectedFlowstateTrack = trackPath;
    }

    /**
     * Handle settings changes
     * @param {Object} newSettings - New audio settings
     */
    onSettingsChange(newSettings) {
        console.log('AudioAdapter: Settings changed', newSettings);
        
        // Update local settings
        if (newSettings.audio) {
            Object.assign(this.settings, newSettings.audio);
        }
        
        // Apply settings to audio manager
        this.applySettings(this.settings);
    }

    /**
     * Apply audio settings to the audio manager
     * @param {Object} settings - Audio settings to apply
     */
    applySettings(settings) {
        // Apply master volume
        this.audioManager.setMasterVolume(settings.masterVolume || 1.0);
        
        // Apply enabled state
        this.audioManager.setEnabled(settings.enabled !== false);
        
        // Apply music volume to current flowstate music
        if (this.flowstateMusic && this.isInFlowstate) {
            this.flowstateMusic.volume = (settings.musicVolume || 0.8) * (settings.masterVolume || 1.0);
        }
        
        console.log('Audio settings applied:', settings);
    }

    /**
     * Handle player kill events
     * @param {Object} data - Kill event data
     */
    onPlayerKill(data) {
        // Play kill sound effect
        this.audioManager.playSound('src/assets/sounds/kill.wav', this.settings.effectsVolume * 0.8);
    }

    /**
     * Handle player death events
     * @param {Object} data - Death event data
     */
    onPlayerDeath(data) {
        // Play death sound
        this.audioManager.playDamageSound();
        
        // Stop walking sounds
        this.audioManager.stopWalkingSound();
        
        // Stop flowstate music on death
        if (this.isInFlowstate) {
            this.stopFlowstateMusic();
            this.isInFlowstate = false;
        }
    }

    /**
     * Handle player movement events
     * @param {Object} data - Movement event data
     */
    onPlayerMove(data) {
        const { isMoving, isSprinting, position, forward, up } = data;
        
        // Update 3D audio listener position
        if (position && forward && up) {
            this.audioManager.updateListener(position, forward, up);
        }
        
        // Handle walking sounds
        if (isMoving) {
            this.audioManager.playWalkingSound(isSprinting);
        } else {
            this.audioManager.stopWalkingSound();
        }
    }

    /**
     * Handle weapon fired events
     * @param {Object} data - Weapon fire event data
     */
    onWeaponFired(data) {
        const { weapon, position, isLocal } = data;
        
        if (isLocal) {
            // Play local weapon sound
            this.audioManager.playWeaponSound(weapon);
        } else {
            // Play 3D positioned weapon sound for remote players
            const listenerPos = this.game.player?.getPosition() || { x: 0, y: 0, z: 0 };
            this.audioManager.playRemoteWeaponSound(weapon, listenerPos, position);
        }
    }

    /**
     * Handle weapon reload events
     * @param {Object} data - Weapon reload event data
     */
    onWeaponReload(data) {
        const { weapon } = data;
        this.audioManager.playReloadSound(weapon);
    }

    /**
     * Handle flowstate intensity changes (kill-streak system)
     * @param {number} intensity - Flowstate intensity (0-1)
     * @param {boolean} isActive - Whether flowstate is currently active
     */
    onFlowstateChange(intensity, isActive) {
        console.log(`AudioAdapter: Flowstate changed - intensity: ${intensity}, active: ${isActive}`);
        
        this.flowstateIntensity = intensity;
        
        if (isActive && !this.isInFlowstate) {
            // Entering flowstate - start music
            this.startFlowstateMusic();
            this.isInFlowstate = true;
        } else if (!isActive && this.isInFlowstate) {
            // Exiting flowstate - stop music
            this.stopFlowstateMusic();
            this.isInFlowstate = false;
        } else if (isActive && this.isInFlowstate) {
            // Already in flowstate - adjust music volume based on intensity
            this.adjustFlowstateMusicVolume(intensity);
        }
    }

    /**
     * Start flowstate music using the selected track
     */
    async startFlowstateMusic() {
        if (!this.selectedFlowstateTrack) {
            console.warn('No flowstate music track selected');
            return;
        }

        if (this.currentState !== 'IN_GAME') {
            console.log('Not in game state, skipping flowstate music');
            return;
        }

        try {
            console.log(`Starting flowstate music: ${this.selectedFlowstateTrack}`);
            
            // Stop any existing music
            this.stopFlowstateMusic();
            
            // Play selected flowstate track
            this.flowstateMusic = await this.audioManager.playSound(
                this.selectedFlowstateTrack,
                this.settings.musicVolume * this.settings.masterVolume,
                true // loop
            );
            
            if (this.flowstateMusic) {
                console.log('Flowstate music started successfully');
                
                // Set up music ended handler for non-looping fallback
                this.flowstateMusic.addEventListener('ended', () => {
                    if (this.isInFlowstate && this.currentState === 'IN_GAME') {
                        this.startFlowstateMusic(); // Restart if still in flowstate
                    }
                });
            }
        } catch (error) {
            console.warn(`Failed to start flowstate music ${this.selectedFlowstateTrack}:`, error);
        }
    }

    /**
     * Stop flowstate music
     */
    stopFlowstateMusic() {
        if (this.flowstateMusic) {
            try {
                this.flowstateMusic.pause();
                this.flowstateMusic.currentTime = 0;
                console.log('Flowstate music stopped');
            } catch (error) {
                console.warn('Error stopping flowstate music:', error);
            }
            this.flowstateMusic = null;
        }
    }

    /**
     * Adjust flowstate music volume based on intensity
     * @param {number} intensity - Flowstate intensity (0-1)
     */
    adjustFlowstateMusicVolume(intensity) {
        if (this.flowstateMusic) {
            const baseVolume = this.settings.musicVolume * this.settings.masterVolume;
            // Volume increases with intensity (up to 50% boost at max intensity)
            const intensityBoost = intensity * 0.5;
            this.flowstateMusic.volume = Math.min(1.0, baseVolume * (1 + intensityBoost));
        }
    }

    /**
     * Handle remote player audio events
     * @param {string} playerId - Remote player ID
     * @param {string} eventType - Type of audio event
     * @param {Object} data - Event data
     */
    handleRemotePlayerAudio(playerId, eventType, data) {
        const listenerPos = this.game.player?.getPosition() || { x: 0, y: 0, z: 0 };
        
        switch (eventType) {
            case 'weaponFired':
                this.audioManager.playRemoteWeaponSound(data.weapon, listenerPos, data.position);
                break;
                
            case 'takeDamage':
                this.audioManager.playRemoteDamageSound(listenerPos, data.position);
                break;
                
            case 'startWalking':
                this.audioManager.playRemoteWalkingSound(playerId, data.position, data.isSprinting);
                break;
                
            case 'stopWalking':
                this.audioManager.stopRemoteWalkingSound(playerId);
                break;
                
            case 'updatePosition':
                this.audioManager.updateWalkingSoundPosition(playerId, data.position);
                break;
        }
    }

    /**
     * Get available music tracks for dropdown selection
     * @returns {Array} Array of available track paths
     */
    getAvailableTracks() {
        return [...this.availableTracks];
    }

    /**
     * Get currently selected flowstate track
     * @returns {string|null} Currently selected track path
     */
    getSelectedTrack() {
        return this.selectedFlowstateTrack;
    }

    /**
     * Set flowstate music track (called from UI)
     * @param {string} trackPath - Path to music track
     */
    setFlowstateTrack(trackPath) {
        if (this.availableTracks.includes(trackPath)) {
            this.selectedFlowstateTrack = trackPath;
            console.log(`Flowstate track set to: ${trackPath}`);
        } else {
            console.warn(`Invalid track path: ${trackPath}`);
        }
    }

    /**
     * Get current audio settings
     * @returns {Object} Current audio settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Update specific audio setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings(this.settings);
    }

    /**
     * Get audio manager instance
     * @returns {AudioManager} The audio manager instance
     */
    getAudioManager() {
        return this.audioManager;
    }

    /**
     * Check if audio is enabled
     * @returns {boolean} True if audio is enabled
     */
    isEnabled() {
        return this.settings.enabled && this.audioManager.enabled;
    }

    /**
     * Check if currently in flowstate
     * @returns {boolean} True if in flowstate
     */
    isFlowstateActive() {
        return this.isInFlowstate;
    }

    /**
     * Cleanup and dispose of resources
     */
    dispose() {
        console.log('AudioAdapter disposing...');
        
        // Stop flowstate music
        this.stopFlowstateMusic();
        
        // Remove all event listeners
        this.eventListeners.forEach(({ target, event, listener }) => {
            if (target && typeof target.off === 'function') {
                target.off(event, listener);
            }
        });
        this.eventListeners = [];
        
        // Clean up audio manager
        if (this.audioManager) {
            this.audioManager.stopAllSounds();
        }
        
        console.log('AudioAdapter disposed');
    }
}

export default AudioAdapter;