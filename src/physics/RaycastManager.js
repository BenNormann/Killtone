/**
 * KILLtONE Game Framework - Raycast Manager
 * Optimized raycasting for bullets and line-of-sight calculations
 */

import { GameConfig } from '../mainConfig.js';
import MathUtils from '../utils/MathUtils.js';

export class RaycastManager {
    constructor(scene, physicsManager = null) {
        this.scene = scene;
        this.physicsManager = physicsManager;
        
        // Ray pooling for performance optimization
        this.rayPool = [];
        this.maxPoolSize = 100;
        this.activeRays = new Set();
        
        // Performance tracking
        this.raycastCount = 0;
        this.lastFrameRaycastCount = 0;
        this.averageRaycastsPerFrame = 0;
        
        // Raycast configuration
        this.config = {
            maxDistance: 1000,
            bulletMaxDistance: 500,
            lineOfSightMaxDistance: 200,
            enablePhysicsRaycast: true,
            enableMeshRaycast: true
        };
        
        // Initialize ray pool
        this.initializeRayPool();
    }

    /**
     * Initialize the ray pool for performance optimization
     */
    initializeRayPool() {
        for (let i = 0; i < this.maxPoolSize; i++) {
            this.rayPool.push(new BABYLON.Ray());
        }
        console.log(`RaycastManager initialized with pool size: ${this.maxPoolSize}`);
    }

    /**
     * Get a ray from the pool or create a new one
     */
    getRay() {
        if (this.rayPool.length > 0) {
            const ray = this.rayPool.pop();
            this.activeRays.add(ray);
            return ray;
        } else {
            // Pool exhausted, create new ray
            const ray = new BABYLON.Ray();
            this.activeRays.add(ray);
            return ray;
        }
    }

    /**
     * Return a ray to the pool
     */
    returnRay(ray) {
        if (this.activeRays.has(ray)) {
            this.activeRays.delete(ray);
            if (this.rayPool.length < this.maxPoolSize) {
                this.rayPool.push(ray);
            }
        }
    }

    /**
     * Perform optimized bullet raycast for hit detection
     */
    bulletRaycast(origin, direction, maxDistance = null, excludeMeshes = []) {
        const ray = this.getRay();
        const distance = maxDistance || this.config.bulletMaxDistance;
        
        try {
            // Set up the ray
            ray.origin = origin.clone();
            ray.direction = direction.normalize();
            ray.length = distance;
            
            // Perform the raycast
            const hit = this.performRaycast(ray, excludeMeshes, {
                includeTriggers: false,
                includePickups: false,
                sortByDistance: true
            });
            
            this.raycastCount++;
            return hit;
            
        } finally {
            this.returnRay(ray);
        }
    }

    /**
     * Perform line-of-sight raycast between two points
     */
    lineOfSightRaycast(fromPosition, toPosition, excludeMeshes = []) {
        const ray = this.getRay();
        
        try {
            // Calculate direction and distance
            const direction = toPosition.subtract(fromPosition);
            const distance = Math.min(direction.length(), this.config.lineOfSightMaxDistance);
            direction.normalize();
            
            // Set up the ray
            ray.origin = fromPosition.clone();
            ray.direction = direction;
            ray.length = distance;
            
            // Perform the raycast
            const hit = this.performRaycast(ray, excludeMeshes, {
                includeTriggers: false,
                includePickups: false,
                stopAtFirstHit: true
            });
            
            this.raycastCount++;
            
            // Return true if no obstacles found
            return !hit || hit.distance >= distance * 0.95; // Allow small tolerance
            
        } finally {
            this.returnRay(ray);
        }
    }

    /**
     * Perform mouse picking raycast for map editor
     */
    mousePickRaycast(pickInfo, excludeMeshes = []) {
        if (!pickInfo || !pickInfo.ray) {
            return null;
        }
        
        const ray = this.getRay();
        
        try {
            // Use the pick ray from mouse position
            ray.origin = pickInfo.ray.origin.clone();
            ray.direction = pickInfo.ray.direction.clone();
            ray.length = this.config.maxDistance;
            
            // Perform the raycast
            const hit = this.performRaycast(ray, excludeMeshes, {
                includeTriggers: true,
                includePickups: true,
                sortByDistance: true
            });
            
            this.raycastCount++;
            return hit;
            
        } finally {
            this.returnRay(ray);
        }
    }

    /**
     * Perform multi-ray raycast for shotgun-style weapons
     */
    multiRaycast(origin, baseDirection, spreadAngle, rayCount, maxDistance = null) {
        const results = [];
        const distance = maxDistance || this.config.bulletMaxDistance;
        
        for (let i = 0; i < rayCount; i++) {
            const ray = this.getRay();
            
            try {
                // Calculate spread direction
                const spreadDirection = this.calculateSpreadDirection(baseDirection, spreadAngle);
                
                // Set up the ray
                ray.origin = origin.clone();
                ray.direction = spreadDirection.normalize();
                ray.length = distance;
                
                // Perform the raycast
                const hit = this.performRaycast(ray, [], {
                    includeTriggers: false,
                    includePickups: false,
                    sortByDistance: true
                });
                
                if (hit) {
                    results.push(hit);
                }
                
                this.raycastCount++;
                
            } finally {
                this.returnRay(ray);
            }
        }
        
        return results;
    }

    /**
     * Core raycast implementation
     */
    performRaycast(ray, excludeMeshes = [], options = {}) {
        const defaultOptions = {
            includeTriggers: false,
            includePickups: false,
            stopAtFirstHit: false,
            sortByDistance: true,
            ...options
        };

        let bestHit = null;
        let allHits = [];

        // Perform mesh-based raycast
        if (this.config.enableMeshRaycast) {
            const meshHit = this.performMeshRaycast(ray, excludeMeshes, defaultOptions);
            if (meshHit) {
                allHits.push(meshHit);
                if (!bestHit || meshHit.distance < bestHit.distance) {
                    bestHit = meshHit;
                }
            }
        }

        // Perform physics-based raycast if physics manager is available
        if (this.config.enablePhysicsRaycast && this.physicsManager && this.physicsManager.isInitialized) {
            const physicsHit = this.performPhysicsRaycast(ray, excludeMeshes, defaultOptions);
            if (physicsHit) {
                allHits.push(physicsHit);
                if (!bestHit || physicsHit.distance < bestHit.distance) {
                    bestHit = physicsHit;
                }
            }
        }

        // Sort hits by distance if requested
        if (defaultOptions.sortByDistance && allHits.length > 1) {
            allHits.sort((a, b) => a.distance - b.distance);
            bestHit = allHits[0];
        }

        return bestHit;
    }

    /**
     * Perform mesh-based raycast using Babylon.js scene picking
     */
    performMeshRaycast(ray, excludeMeshes, options) {
        // Create predicate function to filter meshes
        const predicate = (mesh) => {
            // Exclude specified meshes
            if (excludeMeshes.includes(mesh)) {
                return false;
            }
            
            // Check if mesh should be included based on options
            if (!options.includeTriggers && mesh.metadata && mesh.metadata.isTrigger) {
                return false;
            }
            
            if (!options.includePickups && mesh.metadata && mesh.metadata.isPickup) {
                return false;
            }
            
            // Include mesh if it's visible and has collision
            return mesh.isVisible && mesh.isEnabled() && 
                   (!mesh.metadata || mesh.metadata.allowRaycast !== false);
        };

        // Perform the scene raycast
        const pickInfo = this.scene.pickWithRay(ray, predicate);
        
        if (pickInfo && pickInfo.hit) {
            return {
                hit: true,
                mesh: pickInfo.pickedMesh,
                point: pickInfo.pickedPoint,
                normal: pickInfo.getNormal(true),
                distance: pickInfo.distance,
                uv: pickInfo.getTextureCoordinates(),
                type: 'mesh'
            };
        }
        
        return null;
    }

    /**
     * Perform physics-based raycast using the physics engine
     */
    performPhysicsRaycast(ray, excludeMeshes, options) {
        // This would integrate with the physics engine for more accurate collision detection
        // For now, we'll return null as this requires deeper physics engine integration
        
        // TODO: Implement physics-based raycast when physics bodies are properly set up
        // This would use the physics world's raycast functionality for more accurate results
        
        return null;
    }

    /**
     * Calculate spread direction for multi-ray weapons
     */
    calculateSpreadDirection(baseDirection, spreadAngle) {
        // Generate random angles within the spread cone
        const randomAngleX = MathUtils.random(-0.5, 0.5) * spreadAngle;
        const randomAngleY = MathUtils.random(-0.5, 0.5) * spreadAngle;
        
        // Create rotation matrix for the spread
        const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(randomAngleY, randomAngleX, 0);
        
        // Apply rotation to base direction
        const spreadDirection = BABYLON.Vector3.TransformCoordinates(baseDirection, rotationMatrix);
        
        return spreadDirection;
    }

    /**
     * Get raycast from camera for mouse picking
     */
    getRayFromCamera(camera, screenX, screenY) {
        // Convert screen coordinates to world ray
        const ray = this.scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), camera);
        return ray;
    }

    /**
     * Check if point is visible from another point (line of sight)
     */
    isPointVisible(fromPosition, toPosition, excludeMeshes = []) {
        return this.lineOfSightRaycast(fromPosition, toPosition, excludeMeshes);
    }

    /**
     * Find all meshes along a ray path
     */
    getAllMeshesAlongRay(origin, direction, maxDistance = null) {
        const ray = this.getRay();
        const distance = maxDistance || this.config.maxDistance;
        const hits = [];
        
        try {
            ray.origin = origin.clone();
            ray.direction = direction.normalize();
            ray.length = distance;
            
            // Use scene.multiPickWithRay for multiple hits
            const pickInfos = this.scene.multiPickWithRay(ray);
            
            for (const pickInfo of pickInfos) {
                if (pickInfo.hit) {
                    hits.push({
                        mesh: pickInfo.pickedMesh,
                        point: pickInfo.pickedPoint,
                        normal: pickInfo.getNormal(true),
                        distance: pickInfo.distance,
                        uv: pickInfo.getTextureCoordinates()
                    });
                }
            }
            
            // Sort by distance
            hits.sort((a, b) => a.distance - b.distance);
            
            this.raycastCount++;
            return hits;
            
        } finally {
            this.returnRay(ray);
        }
    }

    /**
     * Update performance metrics (call once per frame)
     */
    updatePerformanceMetrics() {
        this.lastFrameRaycastCount = this.raycastCount;
        this.averageRaycastsPerFrame = (this.averageRaycastsPerFrame * 0.9) + (this.raycastCount * 0.1);
        this.raycastCount = 0;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            lastFrameRaycastCount: this.lastFrameRaycastCount,
            averageRaycastsPerFrame: this.averageRaycastsPerFrame,
            activeRays: this.activeRays.size,
            poolSize: this.rayPool.length,
            maxPoolSize: this.maxPoolSize
        };
    }

    /**
     * Configure raycast settings
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Dispose of the raycast manager and clean up resources
     */
    dispose() {
        // Clear active rays
        this.activeRays.clear();
        
        // Clear ray pool
        this.rayPool.length = 0;
        
        // Reset counters
        this.raycastCount = 0;
        this.lastFrameRaycastCount = 0;
        this.averageRaycastsPerFrame = 0;
        
        console.log('RaycastManager disposed');
    }
}

export default RaycastManager;