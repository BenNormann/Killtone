/**
 * KILLtONE Game Framework - Blood Effects System
 * Specialized blood particle effects with realistic physics and visuals
 */

// BABYLON is loaded globally from CDN in index.html
import GameConfig from '../mainConfig.js';

export class BloodEffects {
    constructor(game, particleManager) {
        this.game = game;
        this.scene = game.scene;
        this.particleManager = particleManager;
        
        // Blood effect settings
        this.bloodSettings = {
            enabled: true,
            intensity: 1.0,
            maxBloodSplatters: 50,
            decalLifetime: 30000, // 30 seconds
            particleLifetime: 2000 // 2 seconds
        };
        
        // Active blood effects tracking
        this.activeBloodEffects = new Set();
        this.bloodDecals = new Set();
        
        // Blood materials
        this.bloodMaterials = new Map();
        
        console.log('BloodEffects initialized');
    }

    /**
     * Initialize blood effects system
     */
    async initialize() {
        try {
            console.log('BloodEffects: Initializing...');
            
            // Create blood materials
            this.createBloodMaterials();
            
            console.log('BloodEffects: Initialization complete');
            return true;
        } catch (error) {
            console.error('BloodEffects: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Create blood materials for different effects
     */
    createBloodMaterials() {
        // Fresh blood material (bright red)
        const freshBloodMaterial = new BABYLON.StandardMaterial('freshBlood', this.scene);
        freshBloodMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        freshBloodMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.02, 0.02);
        freshBloodMaterial.specularColor = new BABYLON.Color3(0.3, 0.1, 0.1);
        freshBloodMaterial.roughness = 0.8;
        this.bloodMaterials.set('fresh', freshBloodMaterial);
        
        // Dried blood material (darker red-brown)
        const driedBloodMaterial = new BABYLON.StandardMaterial('driedBlood', this.scene);
        driedBloodMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.1, 0.05);
        driedBloodMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.01, 0.01);
        driedBloodMaterial.specularColor = new BABYLON.Color3(0.1, 0.05, 0.05);
        driedBloodMaterial.roughness = 0.9;
        this.bloodMaterials.set('dried', driedBloodMaterial);
        
        console.log('BloodEffects: Blood materials created');
    }

    /**
     * Create blood splatter effect when player is hit
     */
    createBloodSplatter(position, direction, intensity = 1.0, hitType = 'normal') {
        if (!this.bloodSettings.enabled) {
            return null;
        }

        try {
            // Adjust intensity based on hit type
            let effectIntensity = intensity * this.bloodSettings.intensity;
            
            switch (hitType) {
                case 'headshot':
                    effectIntensity *= 2.0;
                    break;
                case 'critical':
                    effectIntensity *= 1.5;
                    break;
                case 'graze':
                    effectIntensity *= 0.5;
                    break;
                default:
                    break;
            }

            // Create particle effect
            const particleEffect = this.particleManager.createBloodSplatter(
                position, 
                direction, 
                effectIntensity
            );

            if (particleEffect) {
                // Track the effect
                this.activeBloodEffects.add(particleEffect);
                
                // Create blood decal on nearby surfaces
                this.createBloodDecal(position, direction, effectIntensity);
                
                // Setup cleanup
                setTimeout(() => {
                    this.activeBloodEffects.delete(particleEffect);
                }, this.bloodSettings.particleLifetime);
                
                console.log(`BloodEffects: Created ${hitType} blood splatter at intensity ${effectIntensity}`);
            }

            return particleEffect;
            
        } catch (error) {
            console.error('BloodEffects: Error creating blood splatter:', error);
            return null;
        }
    }

    /**
     * Create blood decal on surfaces
     */
    createBloodDecal(position, direction, intensity) {
        try {
            // Cast ray to find nearby surface
            const ray = new BABYLON.Ray(position, direction.normalize());
            const hit = this.scene.pickWithRay(ray, (mesh) => {
                // Only hit environment meshes, not players or weapons
                return mesh.metadata && !mesh.metadata.isPlayerMesh && 
                       !mesh.metadata.isWeapon && !mesh.metadata.isHitEffect;
            });

            if (hit && hit.hit && hit.distance < 2.0) {
                // Create blood decal at hit point
                const decal = this.createBloodDecalMesh(hit.pickedPoint, hit.getNormal(), intensity);
                if (decal) {
                    this.bloodDecals.add(decal);
                    
                    // Auto-cleanup decal after lifetime
                    setTimeout(() => {
                        this.removeBloodDecal(decal);
                    }, this.bloodSettings.decalLifetime);
                }
            }
            
        } catch (error) {
            console.warn('BloodEffects: Error creating blood decal:', error);
        }
    }

    /**
     * Create blood decal mesh
     */
    createBloodDecalMesh(position, normal, intensity) {
        try {
            // Create decal plane
            const decalSize = 0.2 + (intensity * 0.3);
            const decal = BABYLON.MeshBuilder.CreatePlane(`bloodDecal_${Date.now()}`, {
                size: decalSize
            }, this.scene);

            // Position and orient the decal
            decal.position = position.add(normal.scale(0.01)); // Slightly offset from surface
            decal.lookAt(position.add(normal));
            
            // Apply blood material
            decal.material = this.bloodMaterials.get('fresh');
            
            // Set rendering properties
            decal.renderingGroupId = 1;
            decal.isPickable = false;
            
            // Add metadata
            decal.metadata = {
                isBloodDecal: true,
                creationTime: Date.now(),
                intensity: intensity
            };

            // Animate decal appearance
            this.animateDecalAppearance(decal);
            
            // Schedule material change to dried blood
            setTimeout(() => {
                if (decal && !decal.isDisposed()) {
                    decal.material = this.bloodMaterials.get('dried');
                }
            }, 5000); // Change to dried after 5 seconds

            return decal;
            
        } catch (error) {
            console.error('BloodEffects: Error creating decal mesh:', error);
            return null;
        }
    }

    /**
     * Animate decal appearance
     */
    animateDecalAppearance(decal) {
        // Start invisible and fade in
        decal.visibility = 0;
        
        const fadeInAnimation = BABYLON.Animation.CreateAndStartAnimation(
            'bloodDecalFadeIn',
            decal,
            'visibility',
            30, // 30 FPS
            15, // 0.5 seconds
            0,
            1,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    /**
     * Remove blood decal
     */
    removeBloodDecal(decal) {
        if (!decal || decal.isDisposed()) {
            return;
        }

        try {
            // Fade out animation
            const fadeOutAnimation = BABYLON.Animation.CreateAndStartAnimation(
                'bloodDecalFadeOut',
                decal,
                'visibility',
                30, // 30 FPS
                30, // 1 second
                decal.visibility,
                0,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                null,
                () => {
                    // Dispose after fade out
                    if (decal && !decal.isDisposed()) {
                        decal.dispose();
                    }
                }
            );
            
            this.bloodDecals.delete(decal);
            
        } catch (error) {
            console.error('BloodEffects: Error removing blood decal:', error);
            // Force disposal if animation fails
            if (decal && !decal.isDisposed()) {
                decal.dispose();
            }
        }
    }

    /**
     * Create blood trail effect for moving wounded players
     */
    createBloodTrail(startPosition, endPosition, intensity = 0.5) {
        if (!this.bloodSettings.enabled) {
            return;
        }

        try {
            // Create multiple small blood drops along the trail
            const distance = BABYLON.Vector3.Distance(startPosition, endPosition);
            const direction = endPosition.subtract(startPosition).normalize();
            const dropCount = Math.floor(distance * 2); // 2 drops per unit

            for (let i = 0; i < dropCount; i++) {
                const t = i / dropCount;
                const dropPosition = BABYLON.Vector3.Lerp(startPosition, endPosition, t);
                
                // Add some randomness to drop positions
                dropPosition.x += (Math.random() - 0.5) * 0.2;
                dropPosition.z += (Math.random() - 0.5) * 0.2;
                
                // Create small blood splatter
                setTimeout(() => {
                    this.createBloodSplatter(
                        dropPosition, 
                        new BABYLON.Vector3(0, -1, 0), 
                        intensity * 0.3, 
                        'trail'
                    );
                }, i * 100); // Stagger the drops
            }
            
        } catch (error) {
            console.error('BloodEffects: Error creating blood trail:', error);
        }
    }

    /**
     * Create blood pool effect for stationary wounded players
     */
    createBloodPool(position, intensity = 1.0) {
        if (!this.bloodSettings.enabled) {
            return null;
        }

        try {
            // Create larger blood decal for pool
            const poolSize = 0.5 + (intensity * 0.5);
            const bloodPool = BABYLON.MeshBuilder.CreatePlane(`bloodPool_${Date.now()}`, {
                size: poolSize
            }, this.scene);

            // Position on ground
            bloodPool.position = position.clone();
            bloodPool.position.y = 0.01; // Slightly above ground
            bloodPool.rotation.x = Math.PI / 2; // Lay flat

            // Apply blood material
            bloodPool.material = this.bloodMaterials.get('fresh');
            
            // Set rendering properties
            bloodPool.renderingGroupId = 1;
            bloodPool.isPickable = false;
            
            // Add metadata
            bloodPool.metadata = {
                isBloodPool: true,
                creationTime: Date.now(),
                intensity: intensity
            };

            // Animate pool growth
            this.animatePoolGrowth(bloodPool, poolSize);
            
            // Track the pool
            this.bloodDecals.add(bloodPool);
            
            // Schedule cleanup
            setTimeout(() => {
                this.removeBloodDecal(bloodPool);
            }, this.bloodSettings.decalLifetime * 2); // Pools last longer

            return bloodPool;
            
        } catch (error) {
            console.error('BloodEffects: Error creating blood pool:', error);
            return null;
        }
    }

    /**
     * Animate blood pool growth
     */
    animatePoolGrowth(pool, finalSize) {
        // Start small and grow
        pool.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        
        const growthAnimation = BABYLON.Animation.CreateAndStartAnimation(
            'bloodPoolGrowth',
            pool,
            'scaling',
            30, // 30 FPS
            60, // 2 seconds
            new BABYLON.Vector3(0.1, 0.1, 0.1),
            new BABYLON.Vector3(1, 1, 1),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    /**
     * Clean up old blood effects
     */
    cleanupOldEffects() {
        const currentTime = Date.now();
        const effectsToRemove = [];

        // Find old decals
        this.bloodDecals.forEach(decal => {
            if (decal.metadata && decal.metadata.creationTime) {
                const age = currentTime - decal.metadata.creationTime;
                if (age > this.bloodSettings.decalLifetime) {
                    effectsToRemove.push(decal);
                }
            }
        });

        // Remove old effects
        effectsToRemove.forEach(decal => {
            this.removeBloodDecal(decal);
        });

        if (effectsToRemove.length > 0) {
            console.log(`BloodEffects: Cleaned up ${effectsToRemove.length} old blood effects`);
        }
    }

    /**
     * Update blood effects (called from game loop)
     */
    update(deltaTime) {
        // Periodic cleanup of old effects
        if (Math.random() < 0.01) { // 1% chance per frame
            this.cleanupOldEffects();
        }
    }

    /**
     * Clear all blood effects
     */
    clearAllBloodEffects() {
        console.log('BloodEffects: Clearing all blood effects');
        
        // Clear active particle effects
        this.activeBloodEffects.forEach(effect => {
            if (effect && effect.stop) {
                effect.stop();
            }
        });
        this.activeBloodEffects.clear();
        
        // Clear blood decals
        this.bloodDecals.forEach(decal => {
            if (decal && !decal.isDisposed()) {
                decal.dispose();
            }
        });
        this.bloodDecals.clear();
    }

    /**
     * Set blood effects settings
     */
    setSettings(settings) {
        this.bloodSettings = { ...this.bloodSettings, ...settings };
        console.log('BloodEffects: Settings updated:', this.bloodSettings);
    }

    /**
     * Get blood effects statistics
     */
    getStats() {
        return {
            activeEffects: this.activeBloodEffects.size,
            activeDecals: this.bloodDecals.size,
            settings: this.bloodSettings
        };
    }

    /**
     * Dispose of blood effects system
     */
    dispose() {
        console.log('BloodEffects: Disposing...');
        
        // Clear all effects
        this.clearAllBloodEffects();
        
        // Dispose materials
        this.bloodMaterials.forEach(material => {
            if (material && material.dispose) {
                material.dispose();
            }
        });
        this.bloodMaterials.clear();
        
        console.log('BloodEffects: Disposed successfully');
    }
}

export default BloodEffects;