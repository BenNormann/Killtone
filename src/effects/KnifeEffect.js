/**
 * KILLtONE Game Framework - Knife Effect System
 * Handles knife trail effects and melee attack visuals
 */

import { WeaponConstants } from '../entities/weapons/WeaponConfig.js';
import { CommonUtils } from '../utils/CommonUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class KnifeEffect {
    constructor(scene) {
        this.scene = scene;
        
        // Effect pools for performance optimization
        this.knifeTrailPool = [];
        
        // Active effects tracking
        this.activeKnifeTrails = new Set();
        
        // Effect configuration
        this.knifeTrailConfig = {
            width: 0.1,
            duration: 0.5, // seconds
            color: WeaponConstants.KNIFE_TRAIL_COLOR,
            fadeSpeed: 2.0,
            segments: 10
        };
        
        // Pool sizes for optimization
        this.maxPoolSize = {
            knifeTrail: 5
        };
        
        console.log('KnifeEffect system initialized');
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
            console.warn('KnifeEffect: Invalid parameters for knife trail creation');
            return null;
        }
        
        // Get or create trail mesh
        const trailMesh = this.getKnifeTrailFromPool();
        if (!trailMesh) {
            console.warn('KnifeEffect: Failed to get knife trail from pool');
            return null;
        }
        
        const config = this.knifeTrailConfig;
        const effect = {
            id: CommonUtils.generateKnifeTrailId(),
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
            console.warn('KnifeEffect: No knife mesh provided for continuous trail');
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
     * Update all active knife trail effects
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        const currentTime = performance.now() / 1000;
        
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
            console.warn('KnifeEffect: Failed to create knife trail mesh');
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
     * Update knife trail fade effect
     * @param {Object} effect - Knife trail effect object
     * @param {number} progress - Progress from 0 to 1
     */
    updateKnifeTrailFade(effect, progress) {
        if (!effect.mesh || !effect.mesh.material) return;
        
        // Smooth fade out
        const alpha = MathUtils.clamp(1.0 - (progress * effect.fadeSpeed), 0, 1);
        effect.mesh.material.alpha = alpha;
    }
    
    /**
     * Update knife trail path based on blade movement
     * @param {Object} effect - Knife trail effect object
     */
    updateKnifeTrailPath(effect) {
        if (!effect.mesh || !effect.previousPositions || effect.previousPositions.length < 2) return;
        
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
            console.warn('KnifeEffect: Error updating knife trail path:', error);
        }
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
            knifeTrails: this.activeKnifeTrails.size,
            poolSizes: {
                knifeTrails: this.knifeTrailPool.length
            }
        };
    }
    
    /**
     * Clean up all effects and dispose resources
     */
    dispose() {
        console.log('KnifeEffect: Disposing all effects');
        
        // Dispose active effects
        this.activeKnifeTrails.forEach(effect => {
            this.disposeKnifeTrail(effect);
        });
        
        // Dispose pooled meshes
        this.knifeTrailPool.forEach(mesh => {
            if (mesh && mesh.dispose) {
                mesh.dispose();
            }
        });
        
        // Clear collections
        this.activeKnifeTrails.clear();
        this.knifeTrailPool = [];
        
        this.scene = null;
        
        console.log('KnifeEffect: Disposal complete');
    }
}

export default KnifeEffect;