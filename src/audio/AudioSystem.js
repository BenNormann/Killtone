/**
 * KILLtONE Game Framework - Unified Audio System
 * Combines core audio functionality with framework integration
 * Handles 3D audio, music playback, state management, and event coordination
 */

import { CommonUtils } from '../utils/CommonUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class AudioSystem {
    constructor(game) {
        this.game = game;

        // Core audio properties
        this.enabled = true;
        this.masterVolume = 1.0;
        this.soundCache = new Map();
        this.currentWalkingSound = null;
        this.activeAudioSources = new Map();
        this.maxConcurrentSources = 20;

        // Audio context for 3D audio
        this.audioContext = null;
        this.listener = null;

        // Performance optimizations
        this.lastListenerUpdate = 0;
        this.lastCleanup = 0;

        // Step sound rate limiting
        this.lastStepTime = 0;
        this.minStepInterval = 200;
        this.stepSoundPool = new Map();
        this.maxStepSounds = 5;

        // Remote player step tracking
        this.remotePlayerStepTimes = new Map();
        this.remotePlayerStepIntervals = new Map();

        // Preloading status
        this.preloadingComplete = false;
        this.preloadingPromise = null;

        // Framework integration properties
        this.currentState = null;
        this.settings = {
            masterVolume: 1.0,
            musicVolume: 0.8,
            effectsVolume: 1.0,
            enabled: true
        };

        // Flowstate music tracking
        this.flowstateMusic = null;
        this.selectedFlowstateTrack = null;
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
    }

    /**
     * Initialize the audio system - sets up core audio and framework listeners
     */
    initialize() {
        console.log('AudioSystem initializing...');

        // Initialize core audio
        this.initAudioContext();

        // Set up framework event listeners
        this.setupFrameworkListeners();

        // Apply initial settings
        this.applySettings(this.settings);

        console.log('AudioSystem initialized successfully');
    }

    // ===== CORE AUDIO FUNCTIONALITY =====

    /**
     * Initialize Web Audio API context for 3D spatial audio
     */
    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (window.AudioContext) {
                this.audioContext = new AudioContext();
                this.listener = this.audioContext.listener;

                if (this.listener.forwardX) {
                    const time = this.audioContext.currentTime;
                    this.listener.forwardX.setValueAtTime(0, time);
                    this.listener.forwardY.setValueAtTime(0, time);
                    this.listener.forwardZ.setValueAtTime(1, time);
                    this.listener.upX.setValueAtTime(0, time);
                    this.listener.upY.setValueAtTime(1, time);
                    this.listener.upZ.setValueAtTime(0, time);
                } else if (this.listener.setOrientation) {
                    this.listener.setOrientation(0, 0, 1, 0, 1, 0);
                }

                console.log('3D Audio context created successfully');
            }
        } catch (error) {
            console.warn('Could not create audio context:', error);
        }
    }

    /**
     * Resume suspended audio context (required for user interaction)
     */
    async resumeAudioContext() {
        if (this.audioContext?.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.warn('Could not resume audio context:', error);
            }
        }
    }

    /**
     * Update 3D audio listener position and orientation
     */
    updateListener(position, forward, up) {
        if (!this.listener || !this.audioContext) return;

        try {
            const currentTime = this.audioContext.currentTime;

            if (this.listener.positionX) {
                this.listener.positionX.setValueAtTime(position.x, currentTime);
                this.listener.positionY.setValueAtTime(position.y, currentTime);
                this.listener.positionZ.setValueAtTime(position.z, currentTime);
                this.listener.forwardX.setValueAtTime(-forward.x, currentTime);
                this.listener.forwardY.setValueAtTime(-forward.y, currentTime);
                this.listener.forwardZ.setValueAtTime(-forward.z, currentTime);
                this.listener.upX.setValueAtTime(up.x, currentTime);
                this.listener.upY.setValueAtTime(up.y, currentTime);
                this.listener.upZ.setValueAtTime(up.z, currentTime);
            } else if (this.listener.setPosition && this.listener.setOrientation) {
                this.listener.setPosition(position.x, position.y, position.z);
                this.listener.setOrientation(-forward.x, -forward.y, -forward.z, up.x, up.y, up.z);
            }
        } catch (error) {
            console.warn('Error updating 3D audio listener:', error);
        }
    }

    /**
     * Check if a sound file has been preloaded into cache
     */
    isSoundPreloaded(soundPath) {
        return this.soundCache.has(soundPath);
    }

    /**
     * Play a sound file with volume and loop options
     */
    async playSound(soundPath, volume = 1.0, loop = false) {
        if (!this.enabled) return null;

        try {
            await this.resumeAudioContext();

            let audio;
            if (this.soundCache.has(soundPath)) {
                const cachedAudio = this.soundCache.get(soundPath);
                audio = cachedAudio.cloneNode();
                console.log(`Using preloaded sound: ${soundPath}`);
            } else {
                console.warn(`Sound not preloaded, loading on-demand: ${soundPath}`);
                audio = new Audio(soundPath);
                audio.preload = 'auto';

                const isMusic = soundPath.includes('/songs/');
                if (!isMusic) {
                    this.soundCache.set(soundPath, audio.cloneNode());
                }
            }

            const safeVolume = isFinite(volume) ? volume : 1.0;
            const safeMasterVolume = isFinite(this.masterVolume) ? this.masterVolume : 1.0;
            audio.volume = Math.min(1.0, Math.max(0.0, safeVolume * safeMasterVolume));
            audio.loop = loop;

            audio.addEventListener('ended', () => audio.remove());

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                return playPromise.then(() => audio).catch(error => {
                    console.warn(`Could not play sound ${soundPath}:`, error);
                    return null;
                });
            }

            return audio;
        } catch (error) {
            console.error(`Error playing sound ${soundPath}:`, error);
            return null;
        }
    }

    /**
     * Calculate volume based on 3D distance with exponential falloff
     */
    calculateDistanceVolume(listenerPosition, sourcePosition, maxDistance = 200, baseVolume = 1.0) {
        const dx = listenerPosition.x - sourcePosition.x;
        const dy = listenerPosition.y - sourcePosition.y;
        const dz = listenerPosition.z - sourcePosition.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        const maxDistanceSquared = maxDistance * maxDistance;

        if (distanceSquared >= maxDistanceSquared) return 0;

        const distance = Math.sqrt(distanceSquared);
        const normalizedDistance = distance / maxDistance;
        const falloffFactor = Math.pow(1 - normalizedDistance, 1.25);
        return baseVolume * Math.max(0, falloffFactor);
    }

    /**
     * Play 3D positioned sound with distance-based volume falloff
     */
    async play3DSound(soundPath, listenerPosition, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        if (!this.enabled) return null;

        if (this.audioContext && this.listener) {
            return this.playPositionalAudio(soundPath, sourcePosition, baseVolume, maxDistance, loop);
        } else {
            const volume = this.calculateDistanceVolume(listenerPosition, sourcePosition, maxDistance, baseVolume);
            return volume <= 0.01 ? null : this.playSound(soundPath, volume, loop);
        }
    }

    /**
     * Play positional audio using Web Audio API panner node
     * @param {string} soundPath - Path to sound file
     * @param {Object} sourcePosition - 3D position of sound source
     * @param {number} baseVolume - Base volume level
     * @param {number} maxDistance - Maximum audible distance
     * @param {boolean} loop - Whether to loop the sound
     * @returns {AudioBufferSourceNode|null} Audio source node
     */
    async playPositionalAudio(soundPath, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        const result = await this.playPositionalAudioWithPanner(soundPath, sourcePosition, baseVolume, maxDistance, loop);
        return result?.source || null;
    }

    /**
     * Play positional audio with full Web Audio API setup including panner and gain nodes
     * @param {string} soundPath - Path to sound file
     * @param {Object} sourcePosition - 3D position of sound source
     * @param {number} baseVolume - Base volume level
     * @param {number} maxDistance - Maximum audible distance
     * @param {boolean} loop - Whether to loop the sound
     * @returns {Object|null} Object containing source and panner nodes
     */
    async playPositionalAudioWithPanner(soundPath, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        if (!this.audioContext || !this.listener) return null;

        if (this.activeAudioSources.size >= this.maxConcurrentSources) {
            console.warn('Too many concurrent audio sources, skipping sound');
            return null;
        }

        try {
            await this.resumeAudioContext();

            let audioBuffer;
            const bufferKey = soundPath + '_buffer';
            if (this.soundCache.has(bufferKey)) {
                audioBuffer = this.soundCache.get(bufferKey);
            } else {
                const response = await fetch(soundPath);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.soundCache.set(bufferKey, audioBuffer);
            }

            const source = this.audioContext.createBufferSource();
            const panner = this.audioContext.createPanner();
            const gainNode = this.audioContext.createGain();

            source.buffer = audioBuffer;
            source.loop = loop;

            panner.panningModel = 'HRTF';
            panner.distanceModel = 'linear';
            panner.refDistance = maxDistance * 0.1;
            panner.maxDistance = maxDistance;
            panner.rolloffFactor = 0.4;

            const currentTime = this.audioContext.currentTime;
            if (panner.positionX) {
                panner.positionX.setValueAtTime(sourcePosition.x, currentTime);
                panner.positionY.setValueAtTime(sourcePosition.y, currentTime);
                panner.positionZ.setValueAtTime(sourcePosition.z, currentTime);
            } else if (panner.setPosition) {
                panner.setPosition(sourcePosition.x, sourcePosition.y, sourcePosition.z);
            }

            gainNode.gain.setValueAtTime(baseVolume * this.masterVolume, currentTime);

            source.connect(panner);
            panner.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const sourceId = CommonUtils.generateAudioSourceId();
            this.activeAudioSources.set(sourceId, { source, panner, gainNode });

            source.onended = () => {
                this.activeAudioSources.delete(sourceId);
                try {
                    source.disconnect();
                    panner.disconnect();
                    gainNode.disconnect();
                } catch (error) {
                    // Ignore cleanup errors
                }
            };

            source.start(0);
            return { source, panner };

        } catch (error) {
            console.warn(`Error playing 3D positional audio ${soundPath}:`, error);
            return null;
        }
    }

    // ===== GAME-SPECIFIC AUDIO METHODS =====

    /**
     * Play weapon firing sound for local player
     * @param {Object} weaponConfig - Weapon configuration containing audio settings
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playWeaponSound(weaponConfig) {
        if (!weaponConfig?.audio?.fireSound) {
            console.warn('No fire sound configured for weapon');
            return;
        }
        return this.playSound(weaponConfig.audio.fireSound, weaponConfig.audio.volume || 1.0);
    }

    /**
     * Play 3D positioned weapon sound for remote players
     * @param {Object} weaponConfig - Weapon configuration containing audio settings
     * @param {Object} listenerPosition - Position of the audio listener
     * @param {Object} sourcePosition - Position where the weapon was fired
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playRemoteWeaponSound(weaponConfig, listenerPosition, sourcePosition) {
        if (!weaponConfig?.audio?.fireSound) return null;
        return this.play3DSound(weaponConfig.audio.fireSound, listenerPosition, sourcePosition, weaponConfig.audio.volume || 1.0, 1500);
    }

    /**
     * Play damage sound when local player takes damage
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playDamageSound() {
        return this.playSound('src/assets/sounds/OOF.m4a', 0.7);
    }

    /**
     * Play 3D positioned damage sound for remote players
     * @param {Object} listenerPosition - Position of the audio listener
     * @param {Object} sourcePosition - Position where damage occurred
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playRemoteDamageSound(listenerPosition, sourcePosition) {
        return this.play3DSound('src/assets/sounds/OOF.m4a', listenerPosition, sourcePosition, 0.7, 200);
    }

    /**
     * Play weapon reload sound
     * @param {Object} weaponConfig - Weapon configuration containing audio settings
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playReloadSound(weaponConfig) {
        if (!weaponConfig?.audio?.reloadSound) return null;
        return this.playSound(weaponConfig.audio.reloadSound, 0.6);
    }

    /**
     * Start playing walking/footstep sounds for local player
     * @param {boolean} isSprinting - Whether the player is sprinting
     * @returns {Promise<void>}
     */
    async playWalkingSound(isSprinting = false) {
        if (this.currentWalkingSound) {
            this.currentWalkingSound.pause();
            this.currentWalkingSound = null;
        }
        this.playLocalStepSequence(isSprinting);
    }

    /**
     * Play sequence of randomized footstep sounds for local player
     * @param {boolean} isSprinting - Whether the player is sprinting (affects timing and volume)
     */
    playLocalStepSequence(isSprinting) {
        const stepSounds = [
            'src/assets/sounds/steps/step1.mp3',
            'src/assets/sounds/steps/step2.mp3',
            'src/assets/sounds/steps/step3.mp3',
            'src/assets/sounds/steps/step4.mp3',
            'src/assets/sounds/steps/step5.mp3'
        ];

        const stepInterval = isSprinting ? 300 : 500;

        const playRandomStep = async () => {
            if (!this.enabled) return;

            const now = Date.now();
            if (now - this.lastStepTime < this.minStepInterval) {
                return;
            }

            if (this.stepSoundPool.size >= this.maxStepSounds) {
                return;
            }

            const randomStep = stepSounds[MathUtils.randomInt(0, stepSounds.length - 1)];
            const volume = isSprinting ? 0.4 : 0.3;

            try {
                let audio;
                if (this.soundCache.has(randomStep)) {
                    audio = this.soundCache.get(randomStep).cloneNode();
                } else {
                    audio = new Audio(randomStep);
                    audio.preload = 'auto';
                    this.soundCache.set(randomStep, audio.cloneNode());
                }

                audio.volume = Math.min(1.0, Math.max(0.0, volume * this.masterVolume));
                audio.loop = false;

                const stepId = CommonUtils.generateStepSoundId();
                this.stepSoundPool.set(stepId, audio);

                audio.addEventListener('ended', () => {
                    this.stepSoundPool.delete(stepId);
                });

                audio.addEventListener('error', () => {
                    this.stepSoundPool.delete(stepId);
                });

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn(`Could not play step sound ${randomStep}:`, error);
                        this.stepSoundPool.delete(stepId);
                    });
                }

                this.lastStepTime = now;
                this.currentWalkingSound = audio;
            } catch (error) {
                console.warn('Failed to play step sound:', error);
            }
        };

        playRandomStep();
        this.walkingInterval = setInterval(playRandomStep, stepInterval);
    }

    /**
     * Stop all walking/footstep sounds for local player
     */
    stopWalkingSound() {
        if (this.currentWalkingSound) {
            this.currentWalkingSound.pause();
            this.currentWalkingSound = null;
        }

        if (this.walkingInterval) {
            clearInterval(this.walkingInterval);
            this.walkingInterval = null;
        }

        this.stepSoundPool.forEach((audio, stepId) => {
            try {
                audio.pause();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        this.stepSoundPool.clear();
    }

    /**
     * Play 3D positioned walking sound for remote players
     * @param {string} playerId - Unique identifier for the remote player
     * @param {Object} sourcePosition - 3D position of the remote player
     * @param {boolean} isSprinting - Whether the remote player is sprinting
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if rate limited
     */
    async playRemoteWalkingSound(playerId, sourcePosition, isSprinting = false) {
        const now = Date.now();
        const lastStepTime = this.remotePlayerStepTimes.get(playerId) || 0;
        const minInterval = isSprinting ? 250 : 400;

        if (now - lastStepTime < minInterval) {
            return null;
        }

        const stepSounds = ['src/assets/sounds/steps/step1.mp3', 'src/assets/sounds/steps/step2.mp3'];
        const randomStep = stepSounds[MathUtils.randomInt(0, stepSounds.length - 1)];
        const volume = isSprinting ? 0.2 : 0.15;

        this.remotePlayerStepTimes.set(playerId, now);

        return this.play3DSound(randomStep, this.listenerPosition || { x: 0, y: 0, z: 0 }, sourcePosition, volume, 50);
    }

    /**
     * Update the 3D position of a remote player's walking sound
     * @param {string} playerId - Unique identifier for the remote player
     * @param {Object} newPosition - New 3D position of the remote player
     */
    updateWalkingSoundPosition(playerId, newPosition) {
        if (this.activeAudioSources.has(playerId)) {
            const audioSource = this.activeAudioSources.get(playerId);
            if (audioSource.panner && audioSource.panner.positionX) {
                const currentTime = this.audioContext.currentTime;
                audioSource.panner.positionX.setValueAtTime(newPosition.x, currentTime);
                audioSource.panner.positionY.setValueAtTime(newPosition.y, currentTime);
                audioSource.panner.positionZ.setValueAtTime(newPosition.z, currentTime);
            }
        }
    }

    /**
     * Stop walking sound for a specific remote player
     * @param {string} playerId - Unique identifier for the remote player
     */
    stopRemoteWalkingSound(playerId) {
        if (this.remoteWalkingIntervals && this.remoteWalkingIntervals.has(playerId)) {
            clearInterval(this.remoteWalkingIntervals.get(playerId));
            this.remoteWalkingIntervals.delete(playerId);
        }

        if (this.activeAudioSources.has(playerId)) {
            const audioSource = this.activeAudioSources.get(playerId);
            if (audioSource.source) {
                audioSource.source.stop();
            }
            this.activeAudioSources.delete(playerId);
        }

        this.remotePlayerStepTimes.delete(playerId);
    }

    // ===== MUSIC METHODS =====

    /**
     * Play music file with specified volume and loop settings
     * @param {string} musicPath - Path to music file
     * @param {number} volume - Volume level (0.0 to 1.0)
     * @param {boolean} loop - Whether to loop the music
     * @returns {Promise<HTMLAudioElement|null>} Audio element or null if failed
     */
    async playMusic(musicPath, volume = 0.8, loop = true) {
        return this.playSound(musicPath, volume, loop);
    }

    /**
     * Stop and reset an audio element
     * @param {HTMLAudioElement} audio - Audio element to stop
     */
    stopAudio(audio) {
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (error) {
                console.warn('Error stopping audio:', error);
            }
        }
    }

    // ===== FRAMEWORK INTEGRATION =====

    /**
     * Set up event listeners for framework integration
     */
    setupFrameworkListeners() {
        if (this.game.stateManager) {
            const stateListener = (newState, oldState) => this.onStateChange(newState, oldState);
            this.game.stateManager.on('stateChanged', stateListener);
            this.eventListeners.push({ target: this.game.stateManager, event: 'stateChanged', listener: stateListener });
        }

        if (this.game.uiManager) {
            const settingsListener = (newSettings) => this.onSettingsChange(newSettings);
            this.game.uiManager.on('settingsChanged', settingsListener);
            this.eventListeners.push({ target: this.game.uiManager, event: 'settingsChanged', listener: settingsListener });

            const musicSelectListener = (trackPath) => this.onMusicTrackSelected(trackPath);
            this.game.uiManager.on('musicTrackSelected', musicSelectListener);
            this.eventListeners.push({ target: this.game.uiManager, event: 'musicTrackSelected', listener: musicSelectListener });
        }

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

        if (this.game.flowstateManager) {
            const flowstateListener = (intensity, isActive) => this.onFlowstateChange(intensity, isActive);
            this.game.flowstateManager.on('flowstateChanged', flowstateListener);
            this.eventListeners.push({ target: this.game.flowstateManager, event: 'flowstateChanged', listener: flowstateListener });
        }
    }

    /**
     * Handle game state changes and adjust audio accordingly
     * @param {string} newState - New game state
     * @param {string} oldState - Previous game state
     */
    onStateChange(newState, oldState) {
        console.log(`AudioSystem: State changed from ${oldState} to ${newState}`);
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
                console.warn(`AudioSystem: Unknown state ${newState}`);
        }
    }

    /**
     * Handle loading state - stop music and start preloading sounds
     */
    handleLoadingState() {
        this.stopFlowstateMusic();
        this.resumeAudioContext();

        if (!this.isPreloadingComplete()) {
            this.preloadSounds().then((result) => {
                console.log('Audio preloading completed:', result);
            });
        }
    }

    /**
     * Handle main menu state - stop flowstate music and reduce volume
     */
    handleMainMenuState() {
        this.stopFlowstateMusic();
        this.isInFlowstate = false;
        this.setMasterVolume(this.settings.masterVolume * 0.8);
    }

    /**
     * Handle in-game state - restore full volume and resume audio context
     */
    handleInGameState() {
        this.setMasterVolume(this.settings.masterVolume);
        this.resumeAudioContext();
    }

    /**
     * Handle paused state - reduce music volume and stop walking sounds
     */
    handlePausedState() {
        if (this.flowstateMusic && this.isInFlowstate) {
            this.flowstateMusic.volume = this.settings.musicVolume * 0.3;
        }
        this.stopWalkingSound();
    }

    /**
     * Handle map editor state - stop flowstate music and set moderate volume
     */
    handleMapEditorState() {
        this.stopFlowstateMusic();
        this.isInFlowstate = false;
        this.setMasterVolume(this.settings.masterVolume * 0.6);
    }

    /**
     * Handle music track selection from UI
     * @param {string} trackPath - Path to selected music track
     */
    onMusicTrackSelected(trackPath) {
        console.log(`AudioSystem: Music track selected: ${trackPath}`);
        this.selectedFlowstateTrack = trackPath;
    }

    /**
     * Handle settings changes from UI
     * @param {Object} newSettings - New audio settings
     */
    onSettingsChange(newSettings) {
        console.log('AudioSystem: Settings changed', newSettings);

        if (newSettings.audio) {
            Object.assign(this.settings, newSettings.audio);
        }

        this.applySettings(this.settings);
    }

    /**
     * Apply audio settings to the system
     * @param {Object} settings - Audio settings to apply
     */
    applySettings(settings) {
        this.setMasterVolume(settings.masterVolume || 1.0);
        this.setEnabled(settings.enabled !== false);

        if (this.flowstateMusic && this.isInFlowstate) {
            this.flowstateMusic.volume = (settings.musicVolume || 0.8) * (settings.masterVolume || 1.0);
        }

        console.log('Audio settings applied:', settings);
    }

    /**
     * Handle player kill events - play kill sound effect
     * @param {Object} data - Kill event data
     */
    onPlayerKill(data) {
        this.playSound('src/assets/sounds/kill.wav', this.settings.effectsVolume * 0.8);
    }

    /**
     * Handle player death events - play damage sound and stop flowstate
     * @param {Object} data - Death event data
     */
    onPlayerDeath(data) {
        this.playDamageSound();
        this.stopWalkingSound();

        if (this.isInFlowstate) {
            this.stopFlowstateMusic();
            this.isInFlowstate = false;
        }
    }

    /**
     * Handle player movement events - update listener position and walking sounds
     * @param {Object} data - Movement event data containing position, direction, and movement state
     */
    onPlayerMove(data) {
        const { isMoving, isSprinting, position, forward, up } = data;

        if (position && forward && up) {
            this.updateListener(position, forward, up);
        }

        if (isMoving) {
            this.playWalkingSound(isSprinting);
        } else {
            this.stopWalkingSound();
        }
    }

    /**
     * Handle weapon fired events - play appropriate weapon sound
     * @param {Object} data - Weapon fire event data containing weapon config and position
     */
    onWeaponFired(data) {
        const { weapon, position, isLocal } = data;

        if (isLocal) {
            this.playWeaponSound(weapon);
        } else {
            const listenerPos = this.game.player?.getPosition() || { x: 0, y: 0, z: 0 };
            this.playRemoteWeaponSound(weapon, listenerPos, position);
        }
    }

    /**
     * Handle weapon reload events - play reload sound
     * @param {Object} data - Weapon reload event data
     */
    onWeaponReload(data) {
        const { weapon } = data;
        this.playReloadSound(weapon);
    }

    /**
     * Handle flowstate intensity changes - start/stop/adjust flowstate music
     * @param {number} intensity - Flowstate intensity (0-1)
     * @param {boolean} isActive - Whether flowstate is currently active
     */
    onFlowstateChange(intensity, isActive) {
        console.log(`AudioSystem: Flowstate changed - intensity: ${intensity}, active: ${isActive}`);

        this.flowstateIntensity = intensity;

        if (isActive && !this.isInFlowstate) {
            this.startFlowstateMusic();
            this.isInFlowstate = true;
        } else if (!isActive && this.isInFlowstate) {
            this.stopFlowstateMusic();
            this.isInFlowstate = false;
        } else if (isActive && this.isInFlowstate) {
            this.adjustFlowstateMusicVolume(intensity);
        }
    }

    /**
     * Start flowstate music using the selected track
     * @returns {Promise<void>}
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

            this.stopFlowstateMusic();

            this.flowstateMusic = await this.playMusic(
                this.selectedFlowstateTrack,
                this.settings.musicVolume * this.settings.masterVolume,
                true
            );

            if (this.flowstateMusic) {
                console.log('Flowstate music started successfully');

                this.flowstateMusic.addEventListener('ended', () => {
                    if (this.isInFlowstate && this.currentState === 'IN_GAME') {
                        this.startFlowstateMusic();
                    }
                });
            }
        } catch (error) {
            console.warn(`Failed to start flowstate music ${this.selectedFlowstateTrack}:`, error);
        }
    }

    /**
     * Stop flowstate music and reset music reference
     */
    stopFlowstateMusic() {
        if (this.flowstateMusic) {
            console.log('Flowstate music stopped');
            this.stopAudio(this.flowstateMusic);
            this.flowstateMusic = null;
        }
    }

    /**
     * Adjust flowstate music volume based on intensity level
     * @param {number} intensity - Flowstate intensity (0-1)
     */
    adjustFlowstateMusicVolume(intensity) {
        if (this.flowstateMusic) {
            const baseVolume = this.settings.musicVolume * this.settings.masterVolume;
            const intensityBoost = intensity * 0.5;
            this.flowstateMusic.volume = Math.min(1.0, baseVolume * (1 + intensityBoost));
        }
    }

    /**
     * Handle remote player audio events for multiplayer
     * @param {string} playerId - Remote player ID
     * @param {string} eventType - Type of audio event
     * @param {Object} data - Event data
     */
    handleRemotePlayerAudio(playerId, eventType, data) {
        const listenerPos = this.game.player?.getPosition() || { x: 0, y: 0, z: 0 };

        switch (eventType) {
            case 'weaponFired':
                this.playRemoteWeaponSound(data.weapon, listenerPos, data.position);
                break;
            case 'takeDamage':
                this.playRemoteDamageSound(listenerPos, data.position);
                break;
            case 'startWalking':
                this.playRemoteWalkingSound(playerId, data.position, data.isSprinting);
                break;
            case 'stopWalking':
                this.stopRemoteWalkingSound(playerId);
                break;
            case 'updatePosition':
                this.updateWalkingSoundPosition(playerId, data.position);
                break;
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get array of available music tracks for UI selection
     * @returns {Array<string>} Array of available track paths
     */
    getAvailableTracks() {
        return [...this.availableTracks];
    }

    /**
     * Get currently selected flowstate track
     * @returns {string|null} Currently selected track path or null
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
     * @returns {Object} Copy of current audio settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Update specific audio setting and apply changes
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.applySettings(this.settings);
    }

    /**
     * Check if audio system is enabled
     * @returns {boolean} True if audio is enabled
     */
    isEnabled() {
        return this.settings.enabled && this.enabled;
    }

    /**
     * Check if currently in flowstate mode
     * @returns {boolean} True if in flowstate
     */
    isFlowstateActive() {
        return this.isInFlowstate;
    }

    /**
     * Set master volume level
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable or disable the audio system
     * @param {boolean} enabled - Whether to enable audio
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAllSounds();
        }
    }

    /**
     * Resume the audio system (called from game pause/resume)
     */
    resume() {
        this.resumeAudioContext();
    }

    /**
     * Pause the audio system (called from game pause/resume)
     */
    pause() {
        // Stop walking sounds when paused
        this.stopWalkingSound();
        
        // Reduce music volume when paused
        if (this.flowstateMusic) {
            this.flowstateMusic.volume = this.settings.musicVolume * 0.3;
        }
    }

    // ===== PRELOADING =====

    /**
     * Check if sound preloading is complete
     * @returns {boolean} True if preloading is complete
     */
    isPreloadingComplete() {
        return this.preloadingComplete;
    }

    /**
     * Wait for sound preloading to complete
     * @returns {Promise<boolean>} Promise that resolves when preloading is complete
     */
    async waitForPreloading() {
        if (this.preloadingComplete) {
            return true;
        }

        if (this.preloadingPromise) {
            return await this.preloadingPromise;
        }

        this.preloadingPromise = this.preloadSounds();
        return await this.preloadingPromise;
    }

    /**
     * Preload all game sounds for better performance
     * @returns {Promise<Object>} Promise that resolves with preloading results
     */
    async preloadSounds() {
        const soundsToPreload = [
            'assets/sounds/GenericGunshot.wav',
            'src/assets/sounds/Bulldog.wav',
            'src/assets/sounds/Sniper.wav',
            'src/assets/sounds/Reload.wav',
            'src/assets/sounds/OOF.m4a',
            'src/assets/sounds/steps/step1.mp3',
            'src/assets/sounds/steps/step2.mp3',
            'src/assets/sounds/steps/step3.mp3',
            'src/assets/sounds/steps/step4.mp3',
            'src/assets/sounds/steps/step5.mp3',
            'src/assets/sounds/songs/Phonk1.mp3',
            'src/assets/sounds/songs/Phonk2.mp3',
            'src/assets/sounds/songs/Synthwave1.mp3',
            'src/assets/sounds/songs/Synthwave2.mp3'
        ];

        console.log('Starting comprehensive sound preloading...');

        const totalSounds = soundsToPreload.length;
        let loadedCount = 0;
        let failedCount = 0;
        const failedSounds = [];

        const updateProgress = () => {
            const progress = ((loadedCount + failedCount) / totalSounds) * 100;
            console.log(`Sound preloading progress: ${progress.toFixed(1)}% (${loadedCount} loaded, ${failedCount} failed)`);

            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = `Loading sounds... ${progress.toFixed(0)}%`;
            }
        };

        const preloadWithRetry = async (soundPath, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const audio = new Audio();
                    audio.preload = 'auto';
                    audio.crossOrigin = 'anonymous';

                    const loadPromise = new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Load timeout'));
                        }, 10000);

                        audio.addEventListener('canplaythrough', () => {
                            clearTimeout(timeout);
                            resolve(audio);
                        }, { once: true });

                        audio.addEventListener('error', (error) => {
                            clearTimeout(timeout);
                            reject(new Error(`Audio load error: ${error.message || 'Unknown error'}`));
                        }, { once: true });

                        audio.addEventListener('abort', () => {
                            clearTimeout(timeout);
                            reject(new Error('Audio load aborted'));
                        }, { once: true });
                    });

                    audio.src = soundPath;
                    audio.load();

                    const loadedAudio = await loadPromise;

                    const isMusic = soundPath.includes('/songs/');
                    if (!isMusic) {
                        this.soundCache.set(soundPath, loadedAudio);
                    }

                    console.log(`✓ Preloaded: ${soundPath}`);
                    return true;

                } catch (error) {
                    console.warn(`Attempt ${attempt}/${maxRetries} failed for ${soundPath}:`, error.message);

                    if (attempt === maxRetries) {
                        console.error(`Failed to preload ${soundPath} after ${maxRetries} attempts`);
                        failedSounds.push({ path: soundPath, error: error.message });
                        return false;
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        };

        const preloadPromises = soundsToPreload.map(async (soundPath) => {
            const success = await preloadWithRetry(soundPath);
            if (success) {
                loadedCount++;
            } else {
                failedCount++;
            }
            updateProgress();
        });

        try {
            await Promise.allSettled(preloadPromises);

            console.log(`Sound preloading complete! ${loadedCount} loaded, ${failedCount} failed`);

            if (failedSounds.length > 0) {
                console.warn('Failed to preload the following sounds:', failedSounds);
            }

            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = 'Sounds loaded successfully!';
            }

            console.log(`Sound cache contains ${this.soundCache.size} preloaded sounds`);

            this.preloadingComplete = true;

            return {
                success: true,
                loaded: loadedCount,
                failed: failedCount,
                total: totalSounds,
                failedSounds: failedSounds
            };

        } catch (error) {
            console.error('Critical error during sound preloading:', error);
            return {
                success: false,
                error: error.message,
                loaded: loadedCount,
                failed: failedCount,
                total: totalSounds,
                failedSounds: failedSounds
            };
        }
    }

    // ===== CLEANUP =====

    /**
     * Clean up stuck or orphaned audio sources and expired step sounds
     */
    cleanupStuckSounds() {
        const currentTime = Date.now();

        for (const [sourceId, audioSource] of this.activeAudioSources.entries()) {
            if (audioSource.source && audioSource.source.buffer) {
                const duration = audioSource.source.buffer.duration;
                const startTime = audioSource.startTime || 0;

                if (currentTime - startTime > duration * 1000 + 1000) {
                    console.log('Cleaning up stuck audio source:', sourceId);
                    try {
                        audioSource.source.stop();
                        audioSource.source.disconnect();
                        audioSource.panner.disconnect();
                        audioSource.gainNode.disconnect();
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                    this.activeAudioSources.delete(sourceId);
                }
            }
        }

        this.stepSoundPool.forEach((audio, stepId) => {
            try {
                if (audio.ended || audio.error) {
                    this.stepSoundPool.delete(stepId);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        for (const [playerId, lastStepTime] of this.remotePlayerStepTimes.entries()) {
            if (currentTime - lastStepTime > 10000) {
                this.remotePlayerStepTimes.delete(playerId);
            }
        }

        this.lastCleanup = currentTime;
    }

    /**
     * Stop all active audio sources and clear sound pools
     */
    stopAllSounds() {
        for (const [sourceId, audioSource] of this.activeAudioSources.entries()) {
            try {
                if (audioSource.source) {
                    audioSource.source.stop();
                }
                audioSource.source?.disconnect();
                audioSource.panner?.disconnect();
                audioSource.gainNode?.disconnect();
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        this.activeAudioSources.clear();

        this.stopWalkingSound();

        if (this.remoteWalkingIntervals) {
            for (const interval of this.remoteWalkingIntervals.values()) {
                clearInterval(interval);
            }
            this.remoteWalkingIntervals.clear();
        }

        console.log('All sounds stopped');
    }

    /**
     * Update method called from game loop for periodic maintenance
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        const currentTime = Date.now();
        if (currentTime - this.lastCleanup > 5000) {
            this.cleanupStuckSounds();
        }
    }

    /**
     * Cleanup and dispose of all audio resources
     */
    dispose() {
        console.log('AudioSystem disposing...');

        this.stopFlowstateMusic();

        this.eventListeners.forEach(({ target, event, listener }) => {
            if (target && typeof target.off === 'function') {
                target.off(event, listener);
            }
        });
        this.eventListeners = [];

        this.stopAllSounds();
        this.soundCache.clear();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.listener = null;
        console.log('AudioSystem disposed');
    }
}

export default AudioSystem;