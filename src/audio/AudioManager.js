class AudioManager {
    constructor() {
        this.enabled = true;
        this.masterVolume = 1.0;
        this.soundCache = new Map();
        this.currentWalkingSound = null;
        this.activeAudioSources = new Map();
        this.maxConcurrentSources = 20;
        
        // Audio context
        this.audioContext = null;
        this.listener = null;
        
        // Performance optimizations
        this.lastListenerUpdate = 0;
        this.lastCleanup = 0;
        
        // Step sound rate limiting
        this.lastStepTime = 0;
        this.minStepInterval = 200; // Minimum 200ms between step sounds
        this.stepSoundPool = new Map(); // Pool of step sound instances
        this.maxStepSounds = 5; // Maximum concurrent step sounds
        
        // Remote player step tracking
        this.remotePlayerStepTimes = new Map();
        this.remotePlayerStepIntervals = new Map();
        
        // Preloading status
        this.preloadingComplete = false;
        this.preloadingPromise = null;
        
        this.initAudioContext();
        console.log('AudioManager initialized');
    }
    
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
    
    async resumeAudioContext() {
        if (this.audioContext?.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.warn('Could not resume audio context:', error);
            }
        }
    }

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
    
    isSoundPreloaded(soundPath) {
        return this.soundCache.has(soundPath);
    }
    
    async playSound(soundPath, volume = 1.0, loop = false) {
        if (!this.enabled) return null;
        
        try {
            await this.resumeAudioContext();
            
            let audio;
            if (this.soundCache.has(soundPath)) {
                // Use preloaded sound
                const cachedAudio = this.soundCache.get(soundPath);
                audio = cachedAudio.cloneNode();
                console.log(`Using preloaded sound: ${soundPath}`);
            } else {
                // Fallback to loading on-demand
                console.warn(`Sound not preloaded, loading on-demand: ${soundPath}`);
                audio = new Audio(soundPath);
                audio.preload = 'auto';
                
                // Cache for future use (but don't cache music files)
                const isMusic = soundPath.includes('/songs/');
                if (!isMusic) {
                    this.soundCache.set(soundPath, audio.cloneNode());
                }
            }
            
            audio.volume = Math.min(1.0, Math.max(0.0, volume * this.masterVolume));
            audio.loop = loop;
            
            // Auto-cleanup
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
    
    // Optimized distance calculation using squared distance with steeper falloff
    calculateDistanceVolume(listenerPosition, sourcePosition, maxDistance = 200, baseVolume = 1.0) {
        const dx = listenerPosition.x - sourcePosition.x;
        const dy = listenerPosition.y - sourcePosition.y;
        const dz = listenerPosition.z - sourcePosition.z;
        const distanceSquared = dx * dx + dy * dy + dz * dz;
        const maxDistanceSquared = maxDistance * maxDistance;
        
        if (distanceSquared >= maxDistanceSquared) return 0;
        
        const distance = Math.sqrt(distanceSquared);
        const normalizedDistance = distance / maxDistance;
        // Apply exponential falloff for steeper decay (25% more aggressive)
        const falloffFactor = Math.pow(1 - normalizedDistance, 1.25);
        return baseVolume * Math.max(0, falloffFactor);
    }

    async play3DSound(soundPath, listenerPosition, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        if (!this.enabled) return null;
        
        if (this.audioContext && this.listener) {
            return this.playPositionalAudio(soundPath, sourcePosition, baseVolume, maxDistance, loop);
        } else {
            const volume = this.calculateDistanceVolume(listenerPosition, sourcePosition, maxDistance, baseVolume);
            return volume <= 0.01 ? null : this.playSound(soundPath, volume, loop);
        }
    }

    async playPositionalAudio(soundPath, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        const result = await this.playPositionalAudioWithPanner(soundPath, sourcePosition, baseVolume, maxDistance, loop);
        return result?.source || null;
    }

    async playPositionalAudioWithPanner(soundPath, sourcePosition, baseVolume = 1.0, maxDistance = 200, loop = false) {
        if (!this.audioContext || !this.listener) return null;
        
        // Limit concurrent sources
        if (this.activeAudioSources.size >= this.maxConcurrentSources) {
            console.warn('Too many concurrent audio sources, skipping sound');
            return null;
        }
        
        try {
            await this.resumeAudioContext();
            
            // Get or create audio buffer
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
            
            // Create audio nodes
            const source = this.audioContext.createBufferSource();
            const panner = this.audioContext.createPanner();
            const gainNode = this.audioContext.createGain();
            
            // Configure
            source.buffer = audioBuffer;
            source.loop = loop;
            
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'linear';
            panner.refDistance = maxDistance * 0.1;
            panner.maxDistance = maxDistance;
            panner.rolloffFactor = 0.4;
            
            // Set position
            const currentTime = this.audioContext.currentTime;
            if (panner.positionX) {
                panner.positionX.setValueAtTime(sourcePosition.x, currentTime);
                panner.positionY.setValueAtTime(sourcePosition.y, currentTime);
                panner.positionZ.setValueAtTime(sourcePosition.z, currentTime);
            } else if (panner.setPosition) {
                panner.setPosition(sourcePosition.x, sourcePosition.y, sourcePosition.z);
            }
            
            gainNode.gain.setValueAtTime(baseVolume * this.masterVolume, currentTime);
            
            // Connect
            source.connect(panner);
            panner.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Track and cleanup
            const sourceId = Date.now() + '_' + Math.random();
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

    // Weapon sounds
    async playWeaponSound(weaponConfig) {
        if (!weaponConfig?.audio?.fireSound) {
            console.warn('No fire sound configured for weapon');
            return;
        }
        return this.playSound(weaponConfig.audio.fireSound, weaponConfig.audio.volume || 1.0);
    }

    async playRemoteWeaponSound(weaponConfig, listenerPosition, sourcePosition) {
        if (!weaponConfig?.audio?.fireSound) return null;
        return this.play3DSound(weaponConfig.audio.fireSound, listenerPosition, sourcePosition, weaponConfig.audio.volume || 1.0, 1500);
    }

    // Damage sounds
    async playDamageSound() {
        return this.playSound('src/assets/sounds/OOF.m4a', 0.7);
    }

    async playRemoteDamageSound(listenerPosition, sourcePosition) {
        return this.play3DSound('src/assets/sounds/OOF.m4a', listenerPosition, sourcePosition, 0.7, 200);
    }

    async playReloadSound(weaponConfig) {
        if (!weaponConfig?.audio?.reloadSound) return null;
        return this.playSound(weaponConfig.audio.reloadSound, 0.6);
    }

    async playWalkingSound(isSprinting = false) {
        if (this.currentWalkingSound) {
            this.currentWalkingSound.pause();
            this.currentWalkingSound = null;
        }
        
        this.playLocalStepSequence(isSprinting);
    }

    playLocalStepSequence(isSprinting) {
        const stepSounds = [
            'src/assets/sounds/steps/step1.mp3',
            'src/assets/sounds/steps/step2.mp3',
            'src/assets/sounds/steps/step3.mp3',
            'src/assets/sounds/steps/step4.mp3',
            'src/assets/sounds/steps/step5.mp3'
        ];
        
        const stepInterval = isSprinting ? 300 : 500; // Faster steps when sprinting
        
        const playRandomStep = async () => {
            if (!this.enabled) return;
            
            // Rate limiting: don't play steps too frequently
            const now = Date.now();
            if (now - this.lastStepTime < this.minStepInterval) {
                return;
            }
            
            // Check if we have too many concurrent step sounds
            if (this.stepSoundPool.size >= this.maxStepSounds) {
                return;
            }
            
            const randomStep = stepSounds[Math.floor(Math.random() * stepSounds.length)];
            const volume = isSprinting ? 0.4 : 0.3; // Quieter when sprinting
            
            try {
                // Use pooled audio instance if available
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
                
                // Add to step sound pool
                const stepId = `step_${Date.now()}_${Math.random()}`;
                this.stepSoundPool.set(stepId, audio);
                
                // Auto-cleanup from pool
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
        
        // Play first step immediately
        playRandomStep();
        
        // Set up interval for subsequent steps
        this.walkingInterval = setInterval(playRandomStep, stepInterval);
    }

    stopWalkingSound() {
        if (this.currentWalkingSound) {
            this.currentWalkingSound.pause();
            this.currentWalkingSound = null;
        }
        
        if (this.walkingInterval) {
            clearInterval(this.walkingInterval);
            this.walkingInterval = null;
        }
        
        // Clear step sound pool
        this.stepSoundPool.forEach((audio, stepId) => {
            try {
                audio.pause();
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        this.stepSoundPool.clear();
    }

    async playRemoteWalkingSound(playerId, sourcePosition, isSprinting = false) {
        // Rate limiting for remote player steps
        const now = Date.now();
        const lastStepTime = this.remotePlayerStepTimes.get(playerId) || 0;
        const minInterval = isSprinting ? 250 : 400; // Slightly longer intervals for remote players
        
        if (now - lastStepTime < minInterval) {
            return null;
        }
        
        const stepSounds = ['src/assets/sounds/steps/step1.mp3', 'src/assets/sounds/steps/step2.mp3'];
        const randomStep = stepSounds[Math.floor(Math.random() * stepSounds.length)];
        const volume = isSprinting ? 0.2 : 0.15;
        
        this.remotePlayerStepTimes.set(playerId, now);
        
        return this.play3DSound(randomStep, this.listenerPosition || BABYLON.Vector3.Zero(), sourcePosition, volume, 50);
    }

    updateWalkingSoundPosition(playerId, newPosition) {
        // Update position for remote walking sounds
        if (this.activeAudioSources.has(playerId)) {
            const audioSource = this.activeAudioSources.get(playerId);
            // Update panner position if available
            if (audioSource.panner && audioSource.panner.positionX) {
                const currentTime = this.audioContext.currentTime;
                audioSource.panner.positionX.setValueAtTime(newPosition.x, currentTime);
                audioSource.panner.positionY.setValueAtTime(newPosition.y, currentTime);
                audioSource.panner.positionZ.setValueAtTime(newPosition.z, currentTime);
            }
        }
    }

    playStepSequence(playerId, initialPosition, isSprinting) {
        // Don't create multiple step sequences for the same player
        if (this.remoteWalkingIntervals && this.remoteWalkingIntervals.has(playerId)) {
            return;
        }
        
        const stepSounds = ['src/assets/sounds/steps/step1.mp3', 'src/assets/sounds/steps/step2.mp3'];
        const stepInterval = isSprinting ? 350 : 550; // Slightly longer intervals to reduce frequency
        
        const playRandomStep = async () => {
            // Check if player still exists and is moving
            if (!this.remotePlayerStepTimes.has(playerId)) {
                this.stopRemoteWalkingSound(playerId);
                return;
            }
            
            const randomStep = stepSounds[Math.floor(Math.random() * stepSounds.length)];
            const volume = isSprinting ? 0.2 : 0.15;
            
            await this.play3DSound(randomStep, this.listenerPosition || BABYLON.Vector3.Zero(), initialPosition, volume, 50);
        };
        
        playRandomStep();
        const interval = setInterval(playRandomStep, stepInterval);
        
        // Store interval for cleanup
        this.remoteWalkingIntervals = this.remoteWalkingIntervals || new Map();
        this.remoteWalkingIntervals.set(playerId, interval);
    }

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
        
        // Clean up step tracking
        this.remotePlayerStepTimes.delete(playerId);
    }

    isPreloadingComplete() {
        return this.preloadingComplete;
    }
    
    async waitForPreloading() {
        if (this.preloadingComplete) {
            return true;
        }
        
        if (this.preloadingPromise) {
            return await this.preloadingPromise;
        }
        
        // If preloading hasn't started, start it
        this.preloadingPromise = this.preloadSounds();
        return await this.preloadingPromise;
    }
    
    async preloadSounds() {
        const soundsToPreload = [
            // Weapon sounds
            'src/assets/sounds/Bulldog.wav',
            'src/assets/sounds/Sniper.wav',
            'src/assets/sounds/Reload.wav',
            'src/assets/sounds/OOF.m4a',
            
            // Step sounds
            'src/assets/sounds/steps/step1.mp3',
            'src/assets/sounds/steps/step2.mp3',
            'src/assets/sounds/steps/step3.mp3',
            'src/assets/sounds/steps/step4.mp3',
            'src/assets/sounds/steps/step5.mp3',
            
            // Background music (preload but don't cache for memory management)
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
        
        // Create a progress tracking function
        const updateProgress = () => {
            const progress = ((loadedCount + failedCount) / totalSounds) * 100;
            console.log(`Sound preloading progress: ${progress.toFixed(1)}% (${loadedCount} loaded, ${failedCount} failed)`);
            
            // Update loading screen if it exists
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = `Loading sounds... ${progress.toFixed(0)}%`;
            }
        };
        
        // Preload with retry logic and better error handling
        const preloadWithRetry = async (soundPath, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const audio = new Audio();
                    audio.preload = 'auto';
                    
                    // Set crossOrigin for CORS issues
                    audio.crossOrigin = 'anonymous';
                    
                    // Create a promise that resolves when the audio is loaded
                    const loadPromise = new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Load timeout'));
                        }, 10000); // 10 second timeout
                        
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
                    
                    // Set the source and start loading
                    audio.src = soundPath;
                    audio.load();
                    
                    const loadedAudio = await loadPromise;
                    
                    // Only cache non-music sounds to save memory
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
                    
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        };
        
        // Preload all sounds concurrently with progress tracking
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
            
            // Update loading screen with completion message
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.textContent = 'Sounds loaded successfully!';
            }
            
            // Log cache statistics
            console.log(`Sound cache contains ${this.soundCache.size} preloaded sounds`);
            
            // Mark preloading as complete
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

    cleanupStuckSounds() {
        const currentTime = Date.now();
        
        // Clean up old audio sources
        for (const [sourceId, audioSource] of this.activeAudioSources.entries()) {
            if (audioSource.source && audioSource.source.buffer) {
                const duration = audioSource.source.buffer.duration;
                const startTime = audioSource.startTime || 0;
                
                if (currentTime - startTime > duration * 1000 + 1000) { // 1 second buffer
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
        
        // Clean up step sound pool
        this.stepSoundPool.forEach((audio, stepId) => {
            try {
                if (audio.ended || audio.error) {
                    this.stepSoundPool.delete(stepId);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        
        // Clean up old remote player step times (older than 10 seconds)
        for (const [playerId, lastStepTime] of this.remotePlayerStepTimes.entries()) {
            if (currentTime - lastStepTime > 10000) {
                this.remotePlayerStepTimes.delete(playerId);
            }
        }
        
        this.lastCleanup = currentTime;
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAllSounds();
        }
    }

    stopAllSounds() {
        // Stop all active audio sources
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
        
        // Stop walking sounds
        this.stopWalkingSound();
        
        // Stop remote walking sounds
        if (this.remoteWalkingIntervals) {
            for (const interval of this.remoteWalkingIntervals.values()) {
                clearInterval(interval);
            }
            this.remoteWalkingIntervals.clear();
        }
        
        console.log('All sounds stopped');
    }

    update(deltaTime) {
        // Perform periodic cleanup of stuck sounds
        const currentTime = Date.now();
        if (currentTime - this.lastCleanup > 5000) { // Clean up every 5 seconds
            this.cleanupStuckSounds();
        }
    }

    dispose() {
        this.stopAllSounds();
        this.soundCache.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.listener = null;
        console.log('AudioManager disposed');
    }
}

// Export for use in other modules
export { AudioManager }; 