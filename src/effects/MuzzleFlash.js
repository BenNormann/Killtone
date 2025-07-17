/**
 * KILLtONE Game Framework - Muzzle Flash Effects System
 * Specialized muzzle flash and weapon firing effects
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from '../mainConfig.js';

export class MuzzleFlash {
    constructor(game, particleManager) {
        this.game = game;
        this.scene = game.scene;
        this.particleManager = particleManager;
        
        // Muzzle flash settings
        this.flashSettings = {
            enabled: true,
            intensity: 1.0,
            lightEnabled: true,
            lightIntensity: 2.0,
            lightRange: 5.0,
            flashDuration: 100, // milliseconds
            shellEjectionEnabled: true
        };
        
        // Active muzzle flashes
        this.activeMuzzleFlashes = new Set();
        this.muzzleFlashLights = new Set();
        
        // Weapon-specific configurations
        this.weaponConfigs = new Map();
        
        console.log('MuzzleFlash initialized');
    }

    /**
     * Initialize muzzle flash system
     */
    async initialize() {
        try {
            console.log('MuzzleFlash: Initializing...');
            
            // Create weapon-specific configurations
            this.createWeaponConfigs();
            
            console.log('MuzzleFlash: Initialization complete');
            return true;
        } catch (error) {
            console.error('MuzzleFlash: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Create weapon-specific muzzle flash configurations
     */
    createWeaponConfigs() {
        // Assault Rifle configuration
        this.weaponConfigs.set('assault_rifle', {
            particleCount: 30,
            flashSize: 1.0,
            lightIntensity: 2.0,
            lightColor: new BABYLON.Color3(1.0, 0.8, 0.4), // Orange-yellow
            flashColor: new BABYLON.Color4(1.0, 0.6, 0.2, 1.0), // Orange
            shellEjection: true,
            shellDirection: new BABYLON.Vector3(1, 0.5, 0),
            flashDuration: 80
        });

        // Sniper Rifle configuration
        this.weaponConfigs.set('sniper_rifle', {
            particleCount: 50,
            flashSize: 1.8,
            lightIntensity: 3.0,
            lightColor: new BABYLON.Color3(1.0, 0.9, 0.6), // Bright yellow
            flashColor: new BABYLON.Color4(1.0, 0.8, 0.3, 1.0), // Bright orange
            shellEjection: true,
            shellDirection: new BABYLON.Vector3(1.2, 0.8, 0),
            flashDuration: 120
        });

        // Shotgun configuration
        this.weaponConfigs.set('shotgun', {
            particleCount: 60,
            flashSize: 1.5,
            lightIntensity: 2.5,
            lightColor: new BABYLON.Color3(1.0, 0.7, 0.3), // Orange
            flashColor: new BABYLON.Color4(1.0, 0.5, 0.1, 1.0), // Deep orange
            shellEjection: true,
            shellDirection: new BABYLON.Vector3(0.8, 0.6, 0),
            flashDuration: 150
        });

        // Pistol configuration
        this.weaponConfigs.set('pistol', {
            particleCount: 20,
            flashSize: 0.8,
            lightIntensity: 1.5,
            lightColor: new BABYLON.Color3(1.0, 0.8, 0.5), // Yellow-orange
            flashColor: new BABYLON.Color4(1.0, 0.7, 0.3, 1.0), // Light orange
            shellEjection: true,
            shellDirection: new BABYLON.Vector3(0.6, 0.4, 0),
            flashDuration: 60
        });

        // SMG configuration
        this.weaponConfigs.set('smg', {
            particleCount: 25,
            flashSize: 0.9,
            lightIntensity: 1.8,
            lightColor: new BABYLON.Color3(1.0, 0.8, 0.4), // Orange-yellow
            flashColor: new BABYLON.Color4(1.0, 0.6, 0.2, 1.0), // Orange
            shellEjection: true,
            shellDirection: new BABYLON.Vector3(0.8, 0.5, 0),
            flashDuration: 70
        });

        console.log(`MuzzleFlash: Created ${this.weaponConfigs.size} weapon configurations`);
    }

    /**
     * Create muzzle flash effect
     */
    createMuzzleFlash(position, direction, weaponType = 'assault_rifle', options = {}) {
        if (!this.flashSettings.enabled) {
            return null;
        }

        try {
            const config = this.weaponConfigs.get(weaponType) || this.weaponConfigs.get('assault_rifle');
            const effectIntensity = (options.intensity || 1.0) * this.flashSettings.intensity;

            // Create particle effect
            const particleEffect = this.createMuzzleFlashParticles(
                position, 
                direction, 
                config, 
                effectIntensity
            );

            // Create muzzle flash light
            let flashLight = null;
            if (this.flashSettings.lightEnabled) {
                flashLight = this.createMuzzleFlashLight(
                    position, 
                    config, 
                    effectIntensity
                );
            }

            // Create shell ejection effect
            if (this.flashSettings.shellEjectionEnabled && config.shellEjection) {
                this.createShellEjection(position, direction, config);
            }

            // Track the flash effect
            const flashEffect = {
                particles: particleEffect,
                light: flashLight,
                creationTime: Date.now(),
                duration: config.flashDuration,
                weaponType: weaponType
            };

            this.activeMuzzleFlashes.add(flashEffect);

            // Setup cleanup
            setTimeout(() => {
                this.cleanupMuzzleFlash(flashEffect);
            }, config.flashDuration);

            console.log(`MuzzleFlash: Created ${weaponType} muzzle flash`);
            return flashEffect;
            
        } catch (error) {
            console.error('MuzzleFlash: Error creating muzzle flash:', error);
            return null;
        }
    }

    /**
     * Create muzzle flash particle effect
     */
    createMuzzleFlashParticles(position, direction, config, intensity) {
        try {
            // Create custom particle system for muzzle flash
            const particleSystem = new BABYLON.ParticleSystem(
                `muzzleFlash_${Date.now()}`,
                config.particleCount * intensity,
                this.scene
            );

            // Set emitter
            particleSystem.emitter = position;

            // Particle texture (create a simple bright texture)
            particleSystem.particleTexture = this.getMuzzleFlashTexture();

            // Emission properties
            particleSystem.emitRate = 1000; // High emit rate for instant flash
            particleSystem.minLifeTime = 0.05;
            particleSystem.maxLifeTime = 0.15;

            // Size properties
            particleSystem.minSize = 0.1 * config.flashSize * intensity;
            particleSystem.maxSize = 0.4 * config.flashSize * intensity;

            // Color properties
            particleSystem.color1 = config.flashColor;
            particleSystem.color2 = config.flashColor.clone().scale(0.8);
            particleSystem.colorDead = new BABYLON.Color4(
                config.flashColor.r * 0.3,
                config.flashColor.g * 0.1,
                config.flashColor.b * 0.0,
                0.0
            );

            // Direction properties (cone-shaped flash)
            const flashDirection = direction.normalize();
            particleSystem.direction1 = flashDirection.clone().scale(0.5);
            particleSystem.direction2 = flashDirection.clone().scale(2.0);
            
            // Add some spread to the flash
            particleSystem.minAngularSpeed = -2;
            particleSystem.maxAngularSpeed = 2;

            // Emission power
            particleSystem.minEmitPower = 1.0;
            particleSystem.maxEmitPower = 3.0 * intensity;

            // No gravity for muzzle flash
            particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);

            // Blend mode for bright flash
            particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

            // Start the system
            particleSystem.start();

            // Stop emission quickly to create flash effect
            setTimeout(() => {
                if (particleSystem && !particleSystem.isStopped()) {
                    particleSystem.stop();
                }
            }, 50); // Stop emission after 50ms

            return particleSystem;
            
        } catch (error) {
            console.error('MuzzleFlash: Error creating particle effect:', error);
            return null;
        }
    }

    /**
     * Create muzzle flash light
     */
    createMuzzleFlashLight(position, config, intensity) {
        try {
            // Create point light for muzzle flash
            const flashLight = new BABYLON.PointLight(
                `muzzleFlashLight_${Date.now()}`,
                position,
                this.scene
            );

            // Set light properties
            flashLight.diffuse = config.lightColor;
            flashLight.specular = config.lightColor.clone().scale(0.5);
            flashLight.intensity = config.lightIntensity * intensity * this.flashSettings.lightIntensity;
            flashLight.range = this.flashSettings.lightRange;

            // Animate light intensity (quick flash)
            this.animateMuzzleFlashLight(flashLight, config);

            this.muzzleFlashLights.add(flashLight);

            return flashLight;
            
        } catch (error) {
            console.error('MuzzleFlash: Error creating flash light:', error);
            return null;
        }
    }

    /**
     * Animate muzzle flash light
     */
    animateMuzzleFlashLight(light, config) {
        const originalIntensity = light.intensity;
        
        // Quick fade out animation
        const fadeAnimation = BABYLON.Animation.CreateAndStartAnimation(
            'muzzleFlashFade',
            light,
            'intensity',
            60, // 60 FPS
            Math.floor(config.flashDuration * 0.06), // Convert ms to frames
            originalIntensity,
            0,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            null,
            () => {
                // Dispose light after animation
                if (light && !light.isDisposed()) {
                    light.dispose();
                }
                this.muzzleFlashLights.delete(light);
            }
        );
    }

    /**
     * Create shell ejection effect
     */
    createShellEjection(position, weaponDirection, config) {
        try {
            // Calculate shell ejection direction (perpendicular to weapon direction)
            const ejectionDirection = config.shellDirection.clone();
            
            // Transform ejection direction based on weapon orientation
            // This is a simplified calculation - in a real game you'd use the weapon's transform
            const rightVector = BABYLON.Vector3.Cross(weaponDirection, BABYLON.Vector3.Up()).normalize();
            const finalEjectionDirection = rightVector.scale(ejectionDirection.x)
                .add(BABYLON.Vector3.Up().scale(ejectionDirection.y))
                .add(weaponDirection.scale(ejectionDirection.z));

            // Create shell ejection particle effect
            const shellEffect = this.particleManager.createShellEjection(
                position,
                finalEjectionDirection
            );

            return shellEffect;
            
        } catch (error) {
            console.error('MuzzleFlash: Error creating shell ejection:', error);
            return null;
        }
    }

    /**
     * Get muzzle flash texture
     */
    getMuzzleFlashTexture() {
        if (!this.muzzleFlashTexture) {
            // Create a simple bright circular texture
            this.muzzleFlashTexture = new BABYLON.DynamicTexture(
                'muzzleFlashTexture',
                { width: 64, height: 64 },
                this.scene
            );

            const context = this.muzzleFlashTexture.getContext();
            
            // Create radial gradient
            const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)');
            gradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

            context.fillStyle = gradient;
            context.fillRect(0, 0, 64, 64);
            
            this.muzzleFlashTexture.update();
        }

        return this.muzzleFlashTexture;
    }

    /**
     * Create suppressed weapon flash (smaller, dimmer)
     */
    createSuppressedFlash(position, direction, weaponType = 'assault_rifle') {
        const suppressedOptions = {
            intensity: 0.3 // Much dimmer flash
        };

        // Modify the weapon config for suppressed effect
        const config = this.weaponConfigs.get(weaponType) || this.weaponConfigs.get('assault_rifle');
        const suppressedConfig = {
            ...config,
            particleCount: Math.floor(config.particleCount * 0.4),
            flashSize: config.flashSize * 0.5,
            lightIntensity: config.lightIntensity * 0.2,
            shellEjection: false, // Suppressors typically don't eject shells visibly
            flashDuration: config.flashDuration * 0.6
        };

        // Temporarily replace config
        const originalConfig = this.weaponConfigs.get(weaponType);
        this.weaponConfigs.set(weaponType, suppressedConfig);

        const flash = this.createMuzzleFlash(position, direction, weaponType, suppressedOptions);

        // Restore original config
        this.weaponConfigs.set(weaponType, originalConfig);

        return flash;
    }

    /**
     * Cleanup muzzle flash effect
     */
    cleanupMuzzleFlash(flashEffect) {
        try {
            // Stop particle system
            if (flashEffect.particles && !flashEffect.particles.isStopped()) {
                flashEffect.particles.stop();
            }

            // Light cleanup is handled by animation callback
            
            this.activeMuzzleFlashes.delete(flashEffect);
            
        } catch (error) {
            console.error('MuzzleFlash: Error cleaning up muzzle flash:', error);
        }
    }

    /**
     * Update muzzle flash system (called from game loop)
     */
    update(deltaTime) {
        // Clean up old effects
        const currentTime = Date.now();
        const effectsToCleanup = [];

        this.activeMuzzleFlashes.forEach(effect => {
            const age = currentTime - effect.creationTime;
            if (age > effect.duration + 1000) { // Add 1 second buffer
                effectsToCleanup.push(effect);
            }
        });

        effectsToCleanup.forEach(effect => {
            this.cleanupMuzzleFlash(effect);
        });
    }

    /**
     * Set muzzle flash settings
     */
    setSettings(settings) {
        this.flashSettings = { ...this.flashSettings, ...settings };
        console.log('MuzzleFlash: Settings updated:', this.flashSettings);
    }

    /**
     * Get muzzle flash statistics
     */
    getStats() {
        return {
            activeFlashes: this.activeMuzzleFlashes.size,
            activeLights: this.muzzleFlashLights.size,
            weaponConfigs: this.weaponConfigs.size,
            settings: this.flashSettings
        };
    }

    /**
     * Dispose of muzzle flash system
     */
    dispose() {
        console.log('MuzzleFlash: Disposing...');
        
        // Clean up active effects
        this.activeMuzzleFlashes.forEach(effect => {
            this.cleanupMuzzleFlash(effect);
        });
        this.activeMuzzleFlashes.clear();

        // Dispose lights
        this.muzzleFlashLights.forEach(light => {
            if (light && !light.isDisposed()) {
                light.dispose();
            }
        });
        this.muzzleFlashLights.clear();

        // Dispose texture
        if (this.muzzleFlashTexture) {
            this.muzzleFlashTexture.dispose();
            this.muzzleFlashTexture = null;
        }

        // Clear configs
        this.weaponConfigs.clear();
        
        console.log('MuzzleFlash: Disposed successfully');
    }
}

export default MuzzleFlash;