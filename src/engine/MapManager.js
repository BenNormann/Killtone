/**
 * KILLtONE Game Framework - Map Manager
 * Handles map loading, validation, and coordination
 */

import { GameConfig } from '../mainConfig.js';
import { BaseManager } from './BaseManager.js';
import CommonUtils from '../utils/CommonUtils.js';

export class MapManager extends BaseManager {
    constructor(game) {
        super(game);
        this.assetManager = game.assetManager;
        
        // Current map state
        this.currentMap = null;
        this.currentMapData = null;
        this.loadedMapAssets = new Map();
        
        // Available maps registry
        this.availableMaps = new Map();
        this.defaultMaps = [];
        
        // Map loading state
        this.isLoading = false;
        this.loadingProgress = {
            stage: 'idle', // 'loading', 'validating', 'assets', 'spawning', 'complete'
            progress: 0,
            message: ''
        };
        
        // Map validation rules
        this.validationRules = {
            requiredFields: ['id', 'name', 'version', 'spawnPoints'],
            maxSpawnPoints: 32,
            minSpawnPoints: 2,
            maxMapSize: { x: 1000, y: 100, z: 1000 },
            allowedAssetTypes: ['model', 'texture', 'sound', 'material'],
            maxAssets: 100
        };
        
        // Event callbacks
        this.onMapLoadStart = null;
        this.onMapLoadProgress = null;
        this.onMapLoadComplete = null;
        this.onMapLoadError = null;
        
    }

    /**
     * Initialize the MapManager
     */
    async _doInitialize() {
        // Register default maps
        this.registerDefaultMaps();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Register default maps that come with the game
     */
    registerDefaultMaps() {
        this.defaultMaps = [
            {
                id: 'default',
                name: 'Default Map',
                description: 'Basic default map with ground plane and some obstacles',
                version: '1.0.0',
                author: 'KILLtONE Team',
                thumbnail: GameConfig.assets.maps + 'default_thumb.jpg',
                mapFile: GameConfig.assets.maps + 'default.json',
                isDefault: true
            },
            {
                id: 'cyber_city',
                name: 'Cyber City',
                description: 'A futuristic cityscape with neon lights and towering buildings',
                version: '1.0.0',
                author: 'KILLtONE Team',
                thumbnail: GameConfig.assets.maps + 'cyber_city_thumb.jpg',
                mapFile: GameConfig.assets.maps + 'cyber_city.json',
                isDefault: true
            },
            {
                id: 'warehouse',
                name: 'Abandoned Warehouse',
                description: 'Close-quarters combat in an industrial setting',
                version: '1.0.0',
                author: 'KILLtONE Team',
                thumbnail: GameConfig.assets.maps + 'warehouse_thumb.jpg',
                mapFile: GameConfig.assets.maps + 'warehouse.json',
                isDefault: true
            }
        ];

        // Register default maps
        this.defaultMaps.forEach(mapInfo => {
            this.availableMaps.set(mapInfo.id, mapInfo);
        });

        console.log(`Registered ${this.defaultMaps.length} default maps`);
    }

    /**
     * Set up event listeners for map-related events
     */
    setupEventListeners() {
        // Listen for game state changes
        if (this.game.stateManager) {
            this.game.stateManager.on('stateChanged', (newState, oldState) => {
                this.onGameStateChanged(newState, oldState);
            });
        }
    }

    /**
     * Handle game state changes
     * @param {string} newState - New game state
     * @param {string} oldState - Previous game state
     */
    onGameStateChanged(newState, oldState) {
        if (newState === 'IN_GAME' && !this.currentMap) {
            // Load default map if no map is loaded
            this.loadDefaultMap();
        } else if (newState === 'MAIN_MENU' && this.currentMap) {
            // Optionally unload map when returning to menu
            // this.unloadCurrentMap();
        }
    }

    /**
     * Load a map by ID
     * @param {string} mapId - Map identifier
     * @returns {Promise<Object>} - Promise resolving to loaded map data
     */
    async loadMap(mapId) {
        if (this.isLoading) {
            throw new Error('Map loading already in progress');
        }

        console.log(`Loading map: ${mapId}`);
        this.isLoading = true;
        this.updateLoadingProgress('loading', 0, `Loading map ${mapId}...`);

        try {
            // Get map info
            const mapInfo = this.availableMaps.get(mapId);
            if (!mapInfo) {
                throw new Error(`Map ${mapId} not found in registry`);
            }

            // Notify loading start
            if (this.onMapLoadStart) {
                this.onMapLoadStart(mapId, mapInfo);
            }

            // Unload current map if any
            if (this.currentMap) {
                await this.unloadCurrentMap();
            }

            // Load map data
            this.updateLoadingProgress('loading', 20, 'Loading map data...');
            const mapData = await this.loadMapData(mapInfo.mapFile);

            // Validate map data
            this.updateLoadingProgress('validating', 40, 'Validating map data...');
            this.validateMapData(mapData);

            // Load map assets
            this.updateLoadingProgress('assets', 60, 'Loading map assets...');
            await this.loadMapAssets(mapData);

            // Spawn map objects
            this.updateLoadingProgress('spawning', 80, 'Spawning map objects...');
            await this.spawnMapObjects(mapData);

            // Set current map
            this.currentMap = mapId;
            this.currentMapData = mapData;

            this.updateLoadingProgress('complete', 100, 'Map loaded successfully');
            console.log(`Successfully loaded map: ${mapId}`);

            // Notify loading complete
            if (this.onMapLoadComplete) {
                this.onMapLoadComplete(mapId, mapData);
            }

            return mapData;

        } catch (error) {
            console.error(`Failed to load map ${mapId}:`, error);
            this.updateLoadingProgress('error', 0, `Failed to load map: ${error.message}`);
            
            if (this.onMapLoadError) {
                this.onMapLoadError(mapId, error);
            }
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load map data from file
     * @param {string} mapFile - Path to map file
     * @returns {Promise<Object>} - Promise resolving to map data
     */
    async loadMapData(mapFile) {
        try {
            const response = await fetch(mapFile);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const mapData = await response.json();
            console.log('Map data loaded:', mapData);
            return mapData;
            
        } catch (error) {
            console.error(`Failed to load map data from ${mapFile}:`, error);
            throw new Error(`Failed to load map data: ${error.message}`);
        }
    }

    /**
     * Validate map data against rules
     * @param {Object} mapData - Map data to validate
     * @throws {Error} - Throws error if validation fails
     */
    validateMapData(mapData) {
        console.log('Validating map data...');
        
        // Check required fields
        for (const field of this.validationRules.requiredFields) {
            if (!mapData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate spawn points
        if (!Array.isArray(mapData.spawnPoints)) {
            throw new Error('spawnPoints must be an array');
        }

        if (mapData.spawnPoints.length < this.validationRules.minSpawnPoints) {
            throw new Error(`Map must have at least ${this.validationRules.minSpawnPoints} spawn points`);
        }

        if (mapData.spawnPoints.length > this.validationRules.maxSpawnPoints) {
            throw new Error(`Map cannot have more than ${this.validationRules.maxSpawnPoints} spawn points`);
        }

        // Validate spawn point structure
        mapData.spawnPoints.forEach((spawn, index) => {
            if (!spawn.position || typeof spawn.position.x !== 'number' || 
                typeof spawn.position.y !== 'number' || typeof spawn.position.z !== 'number') {
                throw new Error(`Invalid spawn point ${index}: position must have x, y, z coordinates`);
            }
            
            if (!spawn.rotation) {
                spawn.rotation = { x: 0, y: 0, z: 0 }; // Set default rotation
            }
        });

        // Validate assets if present
        if (mapData.assets) {
            if (!Array.isArray(mapData.assets)) {
                throw new Error('assets must be an array');
            }

            if (mapData.assets.length > this.validationRules.maxAssets) {
                throw new Error(`Map cannot have more than ${this.validationRules.maxAssets} assets`);
            }

            mapData.assets.forEach((asset, index) => {
                if (!asset.type || !this.validationRules.allowedAssetTypes.includes(asset.type)) {
                    throw new Error(`Invalid asset type at index ${index}: ${asset.type}`);
                }
                
                if (!asset.path) {
                    throw new Error(`Asset at index ${index} missing path`);
                }
            });
        }

        // Validate props if present
        if (mapData.props) {
            if (!Array.isArray(mapData.props)) {
                throw new Error('props must be an array');
            }

            mapData.props.forEach((prop, index) => {
                if (!prop.id || !prop.model) {
                    throw new Error(`Prop at index ${index} missing id or model`);
                }
                
                if (!prop.position || typeof prop.position.x !== 'number' || 
                    typeof prop.position.y !== 'number' || typeof prop.position.z !== 'number') {
                    throw new Error(`Invalid prop ${index}: position must have x, y, z coordinates`);
                }
            });
        }

        console.log('Map data validation passed');
    }

    /**
     * Load assets required by the map
     * @param {Object} mapData - Map data containing asset requirements
     * @returns {Promise} - Promise resolving when assets are loaded
     */
    async loadMapAssets(mapData) {
        if (!mapData.assets || mapData.assets.length === 0) {
            console.log('No map assets to load');
            return;
        }

        console.log(`Loading ${mapData.assets.length} map assets...`);
        
        // Use AssetManager to load map assets
        await this.assetManager.loadMapAssets(mapData);
        
        // Store reference to loaded assets for cleanup
        mapData.assets.forEach(asset => {
            const assetName = asset.name || asset.path.split('/').pop().split('.')[0];
            this.loadedMapAssets.set(assetName, asset);
        });

        console.log('Map assets loaded successfully');
    }

    /**
     * Spawn map objects in the scene
     * @param {Object} mapData - Map data containing objects to spawn
     * @returns {Promise} - Promise resolving when objects are spawned
     */
    async spawnMapObjects(mapData) {
        console.log('Spawning map objects...');
        
        // Spawn basic objects from our default map format
        if (mapData.objects && mapData.objects.length > 0) {
            for (const obj of mapData.objects) {
                await this.spawnBasicObject(obj);
            }
        }
        
        // Spawn props (legacy format)
        if (mapData.props && mapData.props.length > 0) {
            for (const prop of mapData.props) {
                await this.spawnProp(prop);
            }
        }

        // Spawn spawn points (visual indicators)
        if (mapData.spawnPoints && mapData.spawnPoints.length > 0) {
            this.spawnSpawnPoints(mapData.spawnPoints);
        }

        // Spawn other entities (health packs, weapons, etc.)
        if (mapData.entities) {
            for (const entity of mapData.entities) {
                await this.spawnEntity(entity);
            }
        }

        console.log('Map objects spawned successfully');
    }

    /**
     * Spawn a basic object (box, wall, ground, etc.)
     * @param {Object} objData - Object data
     * @returns {Promise} - Promise resolving when object is spawned
     */
    async spawnBasicObject(objData) {
        try {
            let mesh;
            const objName = CommonUtils.generateId(objData.type);

            // Create mesh based on type
            switch (objData.type) {
                case 'ground':
                    // Skip ground as it's already created by Game.js
                    console.log('Skipping ground object - already exists');
                    return;
                    
                case 'box':
                    mesh = BABYLON.MeshBuilder.CreateBox(objName, {
                        width: objData.scale?.x || 1,
                        height: objData.scale?.y || 1,
                        depth: objData.scale?.z || 1
                    }, this.scene);
                    break;
                    
                case 'wall':
                    mesh = BABYLON.MeshBuilder.CreateBox(objName, {
                        width: objData.scale?.x || 1,
                        height: objData.scale?.y || 1,
                        depth: objData.scale?.z || 1
                    }, this.scene);
                    break;
                    
                case 'cylinder':
                    mesh = BABYLON.MeshBuilder.CreateCylinder(objName, {
                        height: objData.scale?.y || 1,
                        diameter: objData.scale?.x || 1
                    }, this.scene);
                    break;
                    
                case 'sphere':
                    mesh = BABYLON.MeshBuilder.CreateSphere(objName, {
                        diameter: objData.scale?.x || 1
                    }, this.scene);
                    break;
                    
                default:
                    console.warn(`Unknown object type: ${objData.type}`);
                    return;
            }

            // Position the object
            if (objData.position) {
                mesh.position.set(
                    objData.position.x || 0,
                    objData.position.y || 0,
                    objData.position.z || 0
                );
            }

            // Create material based on material type
            const material = new BABYLON.StandardMaterial(`${objName}_material`, this.scene);
            
            switch (objData.material) {
                case 'metal':
                    material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.8);
                    material.specularColor = new BABYLON.Color3(0.9, 0.9, 1.0);
                    material.roughness = 0.3;
                    break;
                    
                case 'concrete':
                    material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
                    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                    material.roughness = 0.8;
                    break;
                    
                case 'wood':
                    material.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
                    material.specularColor = new BABYLON.Color3(0.2, 0.1, 0.05);
                    material.roughness = 0.7;
                    break;
                    
                default:
                    material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                    break;
            }
            
            mesh.material = material;

            // Enable collisions
            mesh.checkCollisions = true;

            // Tag as map object for cleanup
            mesh.metadata = {
                isMapObject: true,
                objectType: objData.type,
                mapId: this.currentMap
            };

            console.log(`Spawned ${objData.type} object at`, objData.position);

        } catch (error) {
            console.error(`Failed to spawn object ${objData.type}:`, error);
        }
    }

    /**
     * Spawn a prop object
     * @param {Object} propData - Prop data
     * @returns {Promise} - Promise resolving when prop is spawned
     */
    async spawnProp(propData) {
        try {
            // Get the model from asset manager
            const asset = this.assetManager.getAsset(propData.model);
            if (!asset) {
                console.warn(`Asset ${propData.model} not found for prop ${propData.id}`);
                return;
            }

            // Clone the model
            const clonedMeshes = this.assetManager.cloneModel(propData.model, propData.id);
            if (!clonedMeshes) {
                console.warn(`Failed to clone model ${propData.model} for prop ${propData.id}`);
                return;
            }

            // Position and rotate the prop
            clonedMeshes.forEach(mesh => {
                mesh.position.set(propData.position.x, propData.position.y, propData.position.z);
                
                if (propData.rotation) {
                    mesh.rotation.set(
                        BABYLON.Tools.ToRadians(propData.rotation.x || 0),
                        BABYLON.Tools.ToRadians(propData.rotation.y || 0),
                        BABYLON.Tools.ToRadians(propData.rotation.z || 0)
                    );
                }

                if (propData.scale) {
                    mesh.scaling.set(
                        propData.scale.x || 1,
                        propData.scale.y || 1,
                        propData.scale.z || 1
                    );
                }

                // Add physics if specified
                if (propData.physics) {
                    this.addPhysicsToMesh(mesh, propData.physics);
                }

                // Tag mesh as map object for cleanup
                mesh.metadata = {
                    isMapObject: true,
                    propId: propData.id,
                    mapId: this.currentMap
                };
            });

            console.log(`Spawned prop: ${propData.id}`);

        } catch (error) {
            console.error(`Failed to spawn prop ${propData.id}:`, error);
        }
    }

    /**
     * Spawn visual indicators for spawn points
     * @param {Array} spawnPoints - Array of spawn point data
     */
    spawnSpawnPoints(spawnPoints) {
        spawnPoints.forEach((spawn, index) => {
            // Create a simple visual indicator for spawn points
            const spawnIndicator = BABYLON.MeshBuilder.CreateCylinder(
                `spawn_${index}`, 
                { height: 2, diameter: 1 }, 
                this.scene
            );

            // Position the indicator
            spawnIndicator.position.set(spawn.position.x, spawn.position.y + 1, spawn.position.z);

            // Create material
            const material = new BABYLON.StandardMaterial(`spawn_mat_${index}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green color
            material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
            spawnIndicator.material = material;

            // Make it slightly transparent
            material.alpha = 0.7;

            // Tag as map object
            spawnIndicator.metadata = {
                isMapObject: true,
                isSpawnPoint: true,
                spawnIndex: index,
                mapId: this.currentMap
            };

            console.log(`Created spawn point indicator ${index}`);
        });
    }

    /**
     * Spawn an entity (health pack, weapon, etc.)
     * @param {Object} entityData - Entity data
     * @returns {Promise} - Promise resolving when entity is spawned
     */
    async spawnEntity(entityData) {
        // This would integrate with entity system when available
        console.log(`Spawning entity: ${entityData.type} at`, entityData.position);
        
        // For now, create a placeholder
        const entityMesh = BABYLON.MeshBuilder.CreateBox(
            `entity_${entityData.id}`, 
            { size: 0.5 }, 
            this.scene
        );

        entityMesh.position.set(entityData.position.x, entityData.position.y, entityData.position.z);

        // Color based on entity type
        const material = new BABYLON.StandardMaterial(`entity_mat_${entityData.id}`, this.scene);
        switch (entityData.type) {
            case 'health':
                material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
                break;
            case 'weapon':
                material.diffuseColor = new BABYLON.Color3(1, 1, 0); // Yellow
                break;
            case 'ammo':
                material.diffuseColor = new BABYLON.Color3(0, 0, 1); // Blue
                break;
            default:
                material.diffuseColor = new BABYLON.Color3(1, 0, 1); // Magenta
        }
        entityMesh.material = material;

        // Tag as map object
        entityMesh.metadata = {
            isMapObject: true,
            isEntity: true,
            entityType: entityData.type,
            entityId: entityData.id,
            mapId: this.currentMap
        };
    }

    /**
     * Add physics to a mesh
     * @param {BABYLON.Mesh} mesh - Mesh to add physics to
     * @param {Object} physicsData - Physics configuration
     */
    addPhysicsToMesh(mesh, physicsData) {
        if (!this.game.physicsManager) {
            console.warn('PhysicsManager not available, skipping physics for mesh');
            return;
        }

        // This would integrate with PhysicsManager when available
        console.log(`Adding physics to mesh: ${mesh.name}`, physicsData);
        
        // For now, just set up basic physics impostor
        if (BABYLON.PhysicsImpostor) {
            const impostorType = physicsData.type === 'box' ? BABYLON.PhysicsImpostor.BoxImpostor : 
                               physicsData.type === 'sphere' ? BABYLON.PhysicsImpostor.SphereImpostor :
                               BABYLON.PhysicsImpostor.MeshImpostor;

            mesh.physicsImpostor = new BABYLON.PhysicsImpostor(mesh, impostorType, {
                mass: physicsData.mass || 0,
                restitution: physicsData.restitution || 0.3,
                friction: physicsData.friction || 0.5
            }, this.scene);
        }
    }

    /**
     * Load the default map
     * @returns {Promise} - Promise resolving when default map is loaded
     */
    async loadDefaultMap() {
        const defaultMapId = this.defaultMaps.length > 0 ? this.defaultMaps[0].id : null;
        if (defaultMapId) {
            console.log(`Loading default map: ${defaultMapId}`);
            await this.loadMap(defaultMapId);
        } else {
            console.warn('No default maps available');
        }
    }

    /**
     * Unload the current map and clean up resources
     * @returns {Promise} - Promise resolving when map is unloaded
     */
    async unloadCurrentMap() {
        if (!this.currentMap) {
            console.log('No map to unload');
            return;
        }

        console.log(`Unloading map: ${this.currentMap}`);

        // Remove all map objects from scene
        const mapObjects = this.scene.meshes.filter(mesh => 
            mesh.metadata && mesh.metadata.isMapObject && mesh.metadata.mapId === this.currentMap
        );

        mapObjects.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            if (mesh.physicsImpostor) {
                mesh.physicsImpostor.dispose();
            }
            mesh.dispose();
        });

        // Dispose map-specific assets
        this.loadedMapAssets.forEach((asset, name) => {
            this.assetManager.disposeAsset(name);
        });
        this.loadedMapAssets.clear();

        // Clear current map
        this.currentMap = null;
        this.currentMapData = null;

        console.log('Map unloaded successfully');
    }

    /**
     * Get list of available maps
     * @returns {Array} - Array of map information objects
     */
    getAvailableMaps() {
        return Array.from(this.availableMaps.values());
    }

    /**
     * Get current map information
     * @returns {Object|null} - Current map data or null if no map loaded
     */
    getCurrentMap() {
        return this.currentMapData;
    }

    /**
     * Get current map ID
     * @returns {string|null} - Current map ID or null if no map loaded
     */
    getCurrentMapId() {
        return this.currentMap;
    }

    /**
     * Check if a map is currently loaded
     * @returns {boolean} - True if a map is loaded
     */
    isMapLoaded() {
        return this.currentMap !== null;
    }

    /**
     * Get loading progress
     * @returns {Object} - Loading progress information
     */
    getLoadingProgress() {
        return { ...this.loadingProgress };
    }

    /**
     * Update loading progress and notify callbacks
     * @param {string} stage - Current loading stage
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateLoadingProgress(stage, progress, message) {
        this.loadingProgress.stage = stage;
        this.loadingProgress.progress = progress;
        this.loadingProgress.message = message;

        if (this.onMapLoadProgress) {
            this.onMapLoadProgress(this.loadingProgress);
        }
    }

    /**
     * Register a custom map
     * @param {Object} mapInfo - Map information object
     */
    registerMap(mapInfo) {
        if (!mapInfo.id) {
            throw new Error('Map must have an ID');
        }

        this.availableMaps.set(mapInfo.id, mapInfo);
        console.log(`Registered map: ${mapInfo.id}`);
    }

    /**
     * Unregister a map
     * @param {string} mapId - Map ID to unregister
     */
    unregisterMap(mapId) {
        if (this.availableMaps.has(mapId)) {
            this.availableMaps.delete(mapId);
            console.log(`Unregistered map: ${mapId}`);
        }
    }

    /**
     * Set event callbacks
     * @param {Object} callbacks - Object containing callback functions
     */
    setCallbacks(callbacks) {
        if (callbacks.onMapLoadStart) this.onMapLoadStart = callbacks.onMapLoadStart;
        if (callbacks.onMapLoadProgress) this.onMapLoadProgress = callbacks.onMapLoadProgress;
        if (callbacks.onMapLoadComplete) this.onMapLoadComplete = callbacks.onMapLoadComplete;
        if (callbacks.onMapLoadError) this.onMapLoadError = callbacks.onMapLoadError;
    }

    /**
     * Dispose of the MapManager and clean up resources
     */
    _doDispose() {
        // Unload current map
        if (this.currentMap) {
            this.unloadCurrentMap();
        }

        // Clear all references
        this.availableMaps.clear();
        this.loadedMapAssets.clear();
        this.defaultMaps = [];
        
        // Clear callbacks
        this.onMapLoadStart = null;
        this.onMapLoadProgress = null;
        this.onMapLoadComplete = null;
        this.onMapLoadError = null;
    }
}

export default MapManager;