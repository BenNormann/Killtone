/**
 * KILLtONE Game Framework - WeaponEffects Manager
 * Manages all visual effects for weapons including muzzle flashes and knife trails
 */

// BABYLON is loaded globally from CDN in index.html
import { MuzzleFlashType, WeaponConstants } from './WeaponConfig.js';

export class WeaponEffects {
    constructor(scene) {
        this.scene = scene;
        
        // Effect pools for performance optimization
        this.muzzleFlashPool = {
            donut: [],
            spikey: []
        };
        this.knifeTrailPool = [];
        
        // Active effects tracking
        this.activeMuzzleFlashes = new Set();
        this.activeKnifeTrails = new Set();
        
        // Effect configuration
        this.muzzleFlashConfig = {
            donut: {
                size: 0.8,
                duration: 0.1, // seconds
                color: WeaponConstants.MUZZLE_FLASH_COLORS.PRIMARY,
                fadeSpeed: 10.0
            },
            spikey: {
                size: 1.2,
                duration: 0.08, // slightly faster for full-auto
                color: WeaponConstants.MUZZLE_FLASH_COLORS.PRIMARY,
                fadeSpeed: 12.0
            }
        };
        
        this.knifeTrailConfig = {
            width: 0.1,
            duration: 0.5, // seconds
            color: WeaponConstants.KNIFE_TRAIL_COLOR,
            fadeSpeed: 2.0,
            segments: 10
        };
        
        // Pool sizes for optimization
        this.maxPoolSize = {
            muzzleFlash: 20,
            knifeTrail: 5
        };
        
        console.log('WeaponEffects manager initialized');
    }
    
    /**
     * Create a muzzle flash effect at the specified position
     * @param {BABYLON.Vector3} position - World position for the muzzle flash
     * @param {BABYLON.Vector3} direction - Direction the weapon is facing
     * @param {string} type - Type of muzzle flash ('donut' or 'spikey')
     * @param {BABYLON.Mesh} weaponMesh - Weapon mesh to attach effect to (optional)
     * @returns {Object} Effect object for tracking
     */
    createMuzzleFlash(position, direction, type = MuzzleFlashType.DONUT, weaponMesh = null) {
        if (!this.scene || !position || !direction) {
            console.warn('WeaponEffects: Invalid parameters for muzzle flash creation');
            return null;
        }
        
        // Get or create muzzle flash mesh
        const flashMesh = this.getMuzzleFlashFromPool(type);
        if (!flashMesh) {
            console.warn('WeaponEffects: Failed to get muzzle flash from pool');
            return null;
        }
        
        // Configure the flash
        const config = this.muzzleFlashConfig[type];
        const effect = {
            id: `muzzleflash_${Date.now()}_${Math.random()}`,
            mesh: flashMesh,
            type: type,
            startTime: performance.now() / 1000,
            duration: config.duration,
            fadeSpeed: config.fadeSpeed,
            weaponMesh: weaponMesh,
            originalPosition: position.clone(),
            originalDirection: direction.clone()
        };
        
        // Position and orient the flash
        flashMesh.position = position.clone();
        flashMesh.lookAt(position.add(direction));
        
        // Attach to weapon if provided
        if (weaponMesh) {
            flashMesh.parent = weaponMesh;
            // Convert to local coordinates
            const localPosition = BABYLON.Vector3.TransformCoordinates(
                position, 
                BABYLON.Matrix.Invert(weaponMesh.getWorldMatrix())
            );
            flashMesh.position = localPosition;
        }
        
        // Set initial properties
        flashMesh.setEnabled(true);
        flashMesh.scaling = new BABYLON.Vector3(config.size, config.size, config.size);
        
        // Set material properties
        if (flashMesh.material) {
            flashMesh.material.alpha = 1.0;
            flashMesh.material.emissiveColor = new BABYLON.Color3(
                config.color.r,
                config.color.g,
                config.color.b
            );
        }
        
        // Add to active effects
        this.activeMuzzleFlashes.add(effect);
        
        return effect;
    }
    
    /**
     * Create a knife trail effect following the blade movement
     * @param {BABYLON.Vector3} startPosition - Starting position of the trail
     * @param {BABYLON.Vector3} endPosition - Ending position of the trail
     * @param {BABYLON.Mesh} knifeMesh - Knife mesh to follow (optional)
     * @returns {Object} Effect object for tracking
     */
    createKnifeTrail(startPosition, endPosition, knifeMesh = null) {
        if (!this.scene || !startPosition || !endPosition) {
            console.warn('WeaponEffects: Invalid parameters for knife trail creation');
            return null;
        }
        
        // Get or create trail mesh
        const trailMesh = this.getKnifeTrailFromPool();
        if (!trailMesh) {
            console.warn('WeaponEffects: Failed to get knife trail from pool');
            return null;
        }
        
        const config = this.knifeTrailConfig;
        const effect = {
            id: `knifetrail_${Date.now()}_${Math.random()}`,
            mesh: trailMesh,
            startTime: performance.now() / 1000,
            duration: config.duration,
            fadeSpeed: config.fadeSpeed,
            knifeMesh: knifeMesh,
            startPosition: startPosition.clone(),
            endPosition: endPosition.clone(),
            currentPosition: startPosition.clone(),
            previousPositions: [startPosition.clone()], // Track blade path
            maxPositions: config.segments,
            bladeLength: 0.8, // Approximate blade length
            trailWidth: config.width
        };
        
        // Create initial trail path
        this.updateKnifeTrailPath(effect);
        
        // Set initial properties
        trailMesh.setEnabled(true);
        
        // Set material properties with bright purple
        if (trailMesh.material) {
            trailMesh.material.alpha = 1.0;
            trailMesh.material.emissiveColor = new BABYLON.Color3(
                config.color.r * 1.3, // Boost purple brightness
                config.color.g * 0.2, // Minimal green
                config.color.b * 1.2  // Strong blue component
            );
            
            // Add some diffuse for depth
            trailMesh.material.diffuseColor = new BABYLON.Color3(
                config.color.r * 0.8,
                config.color.g * 0.1,
                config.color.b * 1.0
            );
        }
        
        // Add to active effects
        this.activeKnifeTrails.add(effect);
        
        return effect;
    }
    
    /**
     * Update knife trail with new blade position during swing
     * @param {Object} effect - Knife trail effect object
     * @param {BABYLON.Vector3} newPosition - New blade tip position
     */
    updateKnifeTrailPosition(effect, newPosition = null) {
        if (!effect || !effect.mesh) return;
        
        // If no new position provided, try to get from knife mesh
        if (!newPosition && effect.knifeMesh) {
            // Calculate blade tip position based on knife mesh transform
            const knifeTransform = effect.knifeMesh.getWorldMatrix();
            const bladeTipOffset = new BABYLON.Vector3(0, 0, effect.bladeLength); // Blade extends forward
            newPosition = BABYLON.Vector3.TransformCoordinates(bladeTipOffset, knifeTransform);
        }
        
        if (newPosition) {
            // Add new position to trail
            effect.currentPosition = newPosition.clone();
            effect.previousPositions.push(newPosition.clone());
            
            // Limit the number of positions to maintain performance
            if (effect.previousPositions.length > effect.maxPositions) {
                effect.previousPositions.shift(); // Remove oldest position
            }
            
            // Update the trail mesh to follow the blade path
            this.updateKnifeTrailPath(effect);
        }
    }
    
    /**
     * Create a continuous knife trail that follows the blade during swing animation
     * This method should be called repeatedly during the knife swing to create a smooth trail
     * @param {BABYLON.Mesh} knifeMesh - The knife mesh to track
     * @param {number} swingDuration - Duration of the swing in seconds (default 4.83s)
     * @returns {Object} Effect object for tracking
     */
    createContinuousKnifeTrail(knifeMesh, swingDuration = 4.83) {
        if (!knifeMesh) {
            console.warn('WeaponEffects: No knife mesh provided for continuous trail');
            return null;
        }
        
        // Get initial blade tip position
        const knifeTransform = knifeMesh.getWorldMatrix();
        const bladeTipOffset = new BABYLON.Vector3(0, 0, 0.8); // Blade tip offset
        const initialPosition = BABYLON.Vector3.TransformCoordinates(bladeTipOffset, knifeTransform);
        
        // Create the trail effect
        const effect = this.createKnifeTrail(initialPosition, initialPosition, knifeMesh);
        if (!effect) return null;
        
        // Override duration to match swing
        effect.duration = swingDuration;
        effect.swingStartTime = performance.now() / 1000;
        effect.isContinuous = true;
        
        // Set up continuous tracking
        effect.updateInterval = setInterval(() => {
            if (effect.mesh && effect.mesh.isEnabled()) {
                this.updateKnifeTrailPosition(effect);
            }
        }, 16); // Update at ~60fps
        
        return effect;
    }
    
    /**
     * Add a position to an existing knife trail (for manual trail building)
     * @param {Object} effect - Knife trail effect object
     * @param {BABYLON.Vector3} position - New position to add to trail
     */
    addPositionToKnifeTrail(effect, position) {
        if (!effect || !position) return;
        
        effect.previousPositions.push(position.clone());
        
        // Limit positions for performance
        if (effect.previousPositions.length > effect.maxPositions) {
            effect.previousPositions.shift();
        }
        
        // Update the trail path
        this.updateKnifeTrailPath(effect);
    }
    
    /**
     * Update all active effects
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    updateEffects(deltaTime) {
        const currentTime = performance.now() / 1000;
        
        // Update muzzle flashes
        const expiredMuzzleFlashes = [];
        this.activeMuzzleFlashes.forEach(effect => {
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1.0) {
                // Effect expired
                expiredMuzzleFlashes.push(effect);
            } else {
                // Update fade
                this.updateMuzzleFlashFade(effect, progress);
            }
        });
        
        // Clean up expired muzzle flashes
        expiredMuzzleFlashes.forEach(effect => {
            this.disposeMuzzleFlash(effect);
        });
        
        // Update knife trails
        const expiredKnifeTrails = [];
        this.activeKnifeTrails.forEach(effect => {
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1.0) {
                // Effect expired
                expiredKnifeTrails.push(effect);
            } else {
                // Update fade and position
                this.updateKnifeTrailFade(effect, progress);
                if (effect.knifeMesh) {
                    this.updateKnifeTrailPosition(effect);
                }
            }
        });
        
        // Clean up expired knife trails
        expiredKnifeTrails.forEach(effect => {
            this.disposeKnifeTrail(effect);
        });
    }
    
    /**
     * Get a muzzle flash mesh from the pool or create a new one
     * @param {string} type - Type of muzzle flash ('donut' or 'spikey')
     * @returns {BABYLON.Mesh} Muzzle flash mesh
     */
    getMuzzleFlashFromPool(type) {
        const pool = this.muzzleFlashPool[type];
        
        // Try to get from pool
        for (let i = 0; i < pool.length; i++) {
            const mesh = pool[i];
            if (!mesh.isEnabled()) {
                return mesh;
            }
        }
        
        // Create new mesh if pool is not at capacity
        if (pool.length < this.maxPoolSize.muzzleFlash) {
            const mesh = this.createMuzzleFlashMesh(type);
            if (mesh) {
                pool.push(mesh);
                return mesh;
            }
        }
        
        // Pool is full, reuse oldest active mesh
        return pool[0];
    }
    
    /**
     * Create a new muzzle flash mesh
     * @param {string} type - Type of muzzle flash ('donut' or 'spikey')
     * @returns {BABYLON.Mesh} New muzzle flash mesh
     */
    createMuzzleFlashMesh(type) {
        let mesh;
        const config = this.muzzleFlashConfig[type];
        
        if (type === MuzzleFlashType.DONUT) {
            // Create donut/disk shape for semi-auto weapons
            // Use a combination of torus and disk for better visual effect
            const outerDisk = BABYLON.MeshBuilder.CreateDisc(`muzzleFlash_donut_outer_${Date.now()}`, {
                radius: 0.6,
                tessellation: 12
            }, this.scene);
            
            const innerTorus = BABYLON.MeshBuilder.CreateTorus(`muzzleFlash_donut_inner_${Date.now()}`, {
                diameter: 0.8,
                thickness: 0.2,
                tessellation: 8
            }, this.scene);
            
            // Merge the meshes for better performance
            mesh = BABYLON.Mesh.MergeMeshes([outerDisk, innerTorus], true, true);
            if (mesh) {
                mesh.name = `muzzleFlash_donut_${Date.now()}`;
            }
            
        } else if (type === MuzzleFlashType.SPIKEY) {
            // Create spikey shape for full-auto weapons using multiple star-like projections
            const centerSphere = BABYLON.MeshBuilder.CreateSphere(`muzzleFlash_spikey_center_${Date.now()}`, {
                diameter: 0.4,
                segments: 8
            }, this.scene);
            
            // Create spikes around the center
            const spikes = [];
            const spikeCount = 8;
            for (let i = 0; i < spikeCount; i++) {
                const angle = (i / spikeCount) * Math.PI * 2;
                const spike = BABYLON.MeshBuilder.CreateCylinder(`spike_${i}`, {
                    height: 0.8,
                    diameterTop: 0.02,
                    diameterBottom: 0.15,
                    tessellation: 6
                }, this.scene);
                
                // Position and rotate spike
                const distance = 0.3;
                spike.position.x = Math.cos(angle) * distance;
                spike.position.y = Math.sin(angle) * distance;
                spike.rotation.z = angle + Math.PI / 2;
                
                // Add some randomness to spike length and angle
                const randomScale = 0.8 + Math.random() * 0.4;
                spike.scaling.y = randomScale;
                spike.rotation.z += (Math.random() - 0.5) * 0.3;
                
                spikes.push(spike);
            }
            
            // Add some random smaller spikes
            for (let i = 0; i < 4; i++) {
                const smallSpike = BABYLON.MeshBuilder.CreateCylinder(`smallSpike_${i}`, {
                    height: 0.4,
                    diameterTop: 0.01,
                    diameterBottom: 0.08,
                    tessellation: 4
                }, this.scene);
                
                // Random position around center
                const angle = Math.random() * Math.PI * 2;
                const distance = 0.15 + Math.random() * 0.2;
                smallSpike.position.x = Math.cos(angle) * distance;
                smallSpike.position.y = Math.sin(angle) * distance;
                smallSpike.rotation.z = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                
                spikes.push(smallSpike);
            }
            
            // Merge all spike meshes with center
            const allMeshes = [centerSphere, ...spikes];
            mesh = BABYLON.Mesh.MergeMeshes(allMeshes, true, true);
            if (mesh) {
                mesh.name = `muzzleFlash_spikey_${Date.now()}`;
            }
        }
        
        if (!mesh) {
            console.warn(`WeaponEffects: Failed to create muzzle flash mesh of type ${type}`);
            return null;
        }
        
        // Create bright pink-purple material
        const material = new BABYLON.StandardMaterial(`muzzleFlashMat_${type}_${Date.now()}`, this.scene);
        
        // Bright pink-purple emissive color
        material.emissiveColor = new BABYLON.Color3(
            config.color.r * 1.2, // Boost brightness
            config.color.g * 0.3, // Keep some pink
            config.color.b * 1.1  // Strong purple
        );
        
        // Add some diffuse for depth
        material.diffuseColor = new BABYLON.Color3(
            config.color.r * 0.8,
            config.color.g * 0.2,
            config.color.b * 0.9
        );
        
        material.disableLighting = false; // Enable lighting for better depth
        material.alpha = 1.0;
        material.alphaMode = BABYLON.Engine.ALPHA_ADD; // Additive blending for bright effect
        
        // Add some glow effect
        material.useEmissiveAsIllumination = true;
        
        mesh.material = material;
        mesh.setEnabled(false); // Start disabled
        mesh.renderingGroupId = 1; // Render after opaque objects
        
        return mesh;
    }
    
    /**
     * Get a knife trail mesh from the pool or create a new one
     * @returns {BABYLON.Mesh} Knife trail mesh
     */
    getKnifeTrailFromPool() {
        const pool = this.knifeTrailPool;
        
        // Try to get from pool
        for (let i = 0; i < pool.length; i++) {
            const mesh = pool[i];
            if (!mesh.isEnabled()) {
                return mesh;
            }
        }
        
        // Create new mesh if pool is not at capacity
        if (pool.length < this.maxPoolSize.knifeTrail) {
            const mesh = this.createKnifeTrailMesh();
            if (mesh) {
                pool.push(mesh);
                return mesh;
            }
        }
        
        // Pool is full, reuse oldest active mesh
        return pool[0];
    }
    
    /**
     * Create a new knife trail mesh
     * @returns {BABYLON.Mesh} New knife trail mesh
     */
    createKnifeTrailMesh() {
        // Create a ribbon mesh for the trail
        const mesh = BABYLON.MeshBuilder.CreateRibbon(`knifeTrail_${Date.now()}`, {
            pathArray: [
                [new BABYLON.Vector3(0, 0, 0), new BABYLON.Vector3(1, 0, 0)],
                [new BABYLON.Vector3(0, 0.1, 0), new BABYLON.Vector3(1, 0.1, 0)]
            ],
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, this.scene);
        
        if (!mesh) {
            console.warn('WeaponEffects: Failed to create knife trail mesh');
            return null;
        }
        
        // Create material
        const config = this.knifeTrailConfig;
        const material = new BABYLON.StandardMaterial(`knifeTrailMat_${Date.now()}`, this.scene);
        material.emissiveColor = new BABYLON.Color3(config.color.r, config.color.g, config.color.b);
        material.diffuseColor = new BABYLON.Color3(0, 0, 0); // No diffuse, only emissive
        material.disableLighting = true;
        material.alpha = 1.0;
        material.alphaMode = BABYLON.Engine.ALPHA_BLEND; // Alpha blending for smooth fade
        
        mesh.material = material;
        mesh.setEnabled(false); // Start disabled
        mesh.renderingGroupId = 1; // Render after opaque objects
        
        return mesh;
    }
    
    /**
     * Update muzzle flash fade effect
     * @param {Object} effect - Muzzle flash effect object
     * @param {number} progress - Progress from 0 to 1
     */
    updateMuzzleFlashFade(effect, progress) {
        if (!effect.mesh || !effect.mesh.material) return;
        
        // Quick fade out
        const alpha = Math.max(0, 1.0 - (progress * effect.fadeSpeed));
        effect.mesh.material.alpha = alpha;
        
        // Scale down slightly as it fades
        const config = this.muzzleFlashConfig[effect.type];
        const scale = config.size * (0.8 + 0.2 * (1.0 - progress));
        effect.mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
    }
    
    /**
     * Update knife trail fade effect
     * @param {Object} effect - Knife trail effect object
     * @param {number} progress - Progress from 0 to 1
     */
    updateKnifeTrailFade(effect, progress) {
        if (!effect.mesh || !effect.mesh.material) return;
        
        // Smooth fade out
        const alpha = Math.max(0, 1.0 - (progress * effect.fadeSpeed));
        effect.mesh.material.alpha = alpha;
    }
    
    /**
     * Update knife trail path based on blade movement
     * @param {Object} effect - Knife trail effect object
     */
    updateKnifeTrailPath(effect) {
        if (!effect.mesh || !effect.previousPositions || effect.previousPositions.length < 2) return;
        
        const config = this.knifeTrailConfig;
        const pathArray = [];
        const positions = effect.previousPositions;
        
        // Create trail path following the blade's movement
        for (let i = 0; i < positions.length; i++) {
            const currentPos = positions[i];
            let direction;
            
            if (i < positions.length - 1) {
                // Direction to next position
                direction = positions[i + 1].subtract(currentPos).normalize();
            } else if (i > 0) {
                // Direction from previous position
                direction = currentPos.subtract(positions[i - 1]).normalize();
            } else {
                // Fallback direction
                direction = new BABYLON.Vector3(0, 0, 1);
            }
            
            // Create perpendicular vector for width
            const up = new BABYLON.Vector3(0, 1, 0);
            let right = BABYLON.Vector3.Cross(direction, up);
            
            // Handle case where direction is parallel to up vector
            if (right.length() < 0.001) {
                right = new BABYLON.Vector3(1, 0, 0);
            } else {
                right.normalize();
            }
            
            // Calculate width scaling (taper from start to end)
            const t = i / (positions.length - 1);
            const widthScale = 1.0 - (t * 0.7); // Taper to 30% width at end
            const actualHalfWidth = (effect.trailWidth * 0.5) * widthScale;
            
            // Create trail segment with proper width
            pathArray.push([
                currentPos.add(right.scale(-actualHalfWidth)),
                currentPos.add(right.scale(actualHalfWidth))
            ]);
        }
        
        // Update the ribbon mesh with the new path
        try {
            if (pathArray.length >= 2) {
                effect.mesh = BABYLON.MeshBuilder.CreateRibbon(effect.mesh.name, {
                    pathArray: pathArray,
                    instance: effect.mesh,
                    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
                    updatable: true
                });
            }
        } catch (error) {
            console.warn('WeaponEffects: Error updating knife trail path:', error);
        }
    }
    
    /**
     * Update knife trail position if attached to knife mesh
     * @param {Object} effect - Knife trail effect object
     */
    updateKnifeTrailPosition(effect) {
        if (!effect.knifeMesh || !effect.mesh) return;
        
        // Update trail position based on knife movement
        // This would be called during knife swing animation
        const knifePosition = effect.knifeMesh.getAbsolutePosition();
        const offset = knifePosition.subtract(effect.startPosition);
        
        // Update trail positions
        effect.startPosition.addInPlace(offset);
        effect.endPosition.addInPlace(offset);
        
        // Recreate path with new positions
        this.updateKnifeTrailPath(effect);
    }
    
    /**
     * Dispose of a muzzle flash effect
     * @param {Object} effect - Muzzle flash effect object
     */
    disposeMuzzleFlash(effect) {
        if (effect.mesh) {
            effect.mesh.setEnabled(false);
            effect.mesh.parent = null; // Detach from weapon
        }
        
        this.activeMuzzleFlashes.delete(effect);
    }
    
    /**
     * Dispose of a knife trail effect
     * @param {Object} effect - Knife trail effect object
     */
    disposeKnifeTrail(effect) {
        if (effect.mesh) {
            effect.mesh.setEnabled(false);
        }
        
        // Clear continuous update interval if it exists
        if (effect.updateInterval) {
            clearInterval(effect.updateInterval);
            effect.updateInterval = null;
        }
        
        this.activeKnifeTrails.delete(effect);
    }
    
    /**
     * Dispose of a specific effect by ID
     * @param {string} effectId - Effect ID to dispose
     */
    disposeEffect(effectId) {
        // Find and dispose muzzle flash
        for (const effect of this.activeMuzzleFlashes) {
            if (effect.id === effectId) {
                this.disposeMuzzleFlash(effect);
                return true;
            }
        }
        
        // Find and dispose knife trail
        for (const effect of this.activeKnifeTrails) {
            if (effect.id === effectId) {
                this.disposeKnifeTrail(effect);
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get count of active effects for debugging
     * @returns {Object} Effect counts
     */
    getActiveEffectCounts() {
        return {
            muzzleFlashes: this.activeMuzzleFlashes.size,
            knifeTrails: this.activeKnifeTrails.size,
            poolSizes: {
                donutFlashes: this.muzzleFlashPool.donut.length,
                spikeyFlashes: this.muzzleFlashPool.spikey.length,
                knifeTrails: this.knifeTrailPool.length
            }
        };
    }
    
    /**
     * Clean up all effects and dispose resources
     */
    dispose() {
        console.log('WeaponEffects: Disposing all effects');
        
        // Dispose active effects
        this.activeMuzzleFlashes.forEach(effect => {
            this.disposeMuzzleFlash(effect);
        });
        this.activeKnifeTrails.forEach(effect => {
            this.disposeKnifeTrail(effect);
        });
        
        // Dispose pooled meshes
        Object.values(this.muzzleFlashPool).forEach(pool => {
            pool.forEach(mesh => {
                if (mesh && mesh.dispose) {
                    mesh.dispose();
                }
            });
        });
        
        this.knifeTrailPool.forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        
        // Clear collections
        this.activeMuzzleFlashes.clear();
        this.activeKnifeTrails.clear();
        this.muzzleFlashPool.donut = [];
        this.muzzleFlashPool.spikey = [];
        this.knifeTrailPool = [];
        
        this.scene = null;
        
        console.log('WeaponEffects: Disposal complete');
    }
}

export default WeaponEffects;