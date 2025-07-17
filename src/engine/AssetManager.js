/**
 * KILLtONE Game Framework - Enhanced Asset Manager
 * Provides asset loading with progress tracking and dependency resolution
 */

import { GameConfig } from '../mainConfig.js';

export class AssetManager {
    constructor(scene) {
        this.scene = scene;
        this.loadedAssets = new Map();
        this.loadingQueue = [];
        this.dependencies = new Map();
        this.progressCallbacks = [];
        this.totalAssets = 0;
        this.loadedCount = 0;
        this.isLoading = false;
        
        // Asset categories for organized loading
        this.assetCategories = {
            essential: [], // Must load first (UI, loading screen assets)
            gameplay: [], // Core gameplay assets
            optional: []  // Nice-to-have assets that can load later
        };
        
        // Progress tracking
        this.loadingProgress = {
            total: 0,
            loaded: 0,
            failed: 0,
            percentage: 0,
            currentAsset: null,
            errors: []
        };
    }

    /**
     * Add a progress callback to receive loading updates
     * @param {Function} callback - Function to call with progress updates
     */
    addProgressCallback(callback) {
        if (typeof callback === 'function') {
            this.progressCallbacks.push(callback);
        }
    }

    /**
     * Remove a progress callback
     * @param {Function} callback - Function to remove
     */
    removeProgressCallback(callback) {
        const index = this.progressCallbacks.indexOf(callback);
        if (index > -1) {
            this.progressCallbacks.splice(index, 1);
        }
    }

    /**
     * Notify all progress callbacks with current progress
     */
    notifyProgress() {
        this.loadingProgress.percentage = this.loadingProgress.total > 0 
            ? (this.loadingProgress.loaded / this.loadingProgress.total) * 100 
            : 0;
            
        this.progressCallbacks.forEach(callback => {
            try {
                callback(this.loadingProgress);
            } catch (error) {
                console.error('Error in progress callback:', error);
            }
        });
    }

    /**
     * Add asset dependency relationship
     * @param {string} assetName - Name of the dependent asset
     * @param {string[]} dependencies - Array of asset names this asset depends on
     */
    addDependency(assetName, dependencies) {
        if (!Array.isArray(dependencies)) {
            dependencies = [dependencies];
        }
        this.dependencies.set(assetName, dependencies);
    }

    /**
     * Resolve loading order based on dependencies
     * @param {Array} assetList - List of assets to resolve
     * @returns {Array} - Ordered list of assets to load
     */
    resolveDependencies(assetList) {
        const resolved = [];
        const resolving = new Set();
        const visited = new Set();

        const resolve = (assetName) => {
            if (visited.has(assetName)) return;
            if (resolving.has(assetName)) {
                throw new Error(`Circular dependency detected involving ${assetName}`);
            }

            resolving.add(assetName);
            
            const deps = this.dependencies.get(assetName) || [];
            deps.forEach(dep => {
                if (assetList.find(asset => asset.name === dep)) {
                    resolve(dep);
                }
            });

            resolving.delete(assetName);
            visited.add(assetName);
            
            const asset = assetList.find(a => a.name === assetName);
            if (asset && !resolved.includes(asset)) {
                resolved.push(asset);
            }
        };

        assetList.forEach(asset => resolve(asset.name));
        return resolved;
    }

    /**
     * Load a single model with progress tracking
     * @param {string} name - Asset name
     * @param {string} folder - Folder path
     * @param {string} filename - File name
     * @param {string} category - Asset category (essential, gameplay, optional)
     * @returns {Promise} - Promise resolving to loaded asset data
     */
    async loadModel(name, folder, filename, category = 'gameplay') {
        try {
            this.loadingProgress.currentAsset = name;
            this.notifyProgress();

            console.log(`Loading model ${name} from ${folder}${filename}`);
            
            // Check if already loaded
            if (this.loadedAssets.has(name)) {
                console.log(`Asset ${name} already loaded, returning cached version`);
                return this.loadedAssets.get(name);
            }

            let result;

            // Try the modern async API first
            if (BABYLON.SceneLoader && typeof BABYLON.SceneLoader.ImportMeshAsync === 'function') {
                result = await BABYLON.SceneLoader.ImportMeshAsync("", folder, filename, this.scene);
            }
            // Fallback to callback-based API with progress tracking
            else if (BABYLON.SceneLoader && typeof BABYLON.SceneLoader.ImportMesh === 'function') {
                result = await new Promise((resolve, reject) => {
                    BABYLON.SceneLoader.ImportMesh("", folder, filename, this.scene, 
                        (meshes, particleSystems, skeletons) => {
                            resolve({ meshes, particleSystems, skeletons });
                        },
                        (progress) => {
                            // Individual asset progress (not used for overall progress)
                            const assetProgress = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                            console.log(`Loading ${name}: ${assetProgress.toFixed(2)}%`);
                        },
                        (error) => {
                            reject(error);
                        }
                    );
                });
            } else {
                throw new Error('BABYLON.SceneLoader is not available. Make sure Babylon.js loaders are properly loaded.');
            }

            // Store the loaded asset
            const assetData = {
                name,
                category,
                meshes: result.meshes,
                particleSystems: result.particleSystems,
                skeletons: result.skeletons,
                loadedAt: Date.now()
            };

            this.loadedAssets.set(name, assetData);
            this.loadingProgress.loaded++;
            
            console.log(`Successfully loaded model: ${name}`);
            this.notifyProgress();
            
            return assetData;

        } catch (error) {
            console.error(`Failed to load model ${name}:`, error);
            this.loadingProgress.failed++;
            this.loadingProgress.errors.push({ asset: name, error: error.message });
            this.notifyProgress();
            
            // Return placeholder or rethrow based on category
            if (category === 'essential') {
                throw error; // Essential assets must load
            } else {
                return this.createPlaceholderAsset(name, category);
            }
        }
    }

    /**
     * Create a placeholder asset for failed loads
     * @param {string} name - Asset name
     * @param {string} category - Asset category
     * @returns {Object} - Placeholder asset data
     */
    createPlaceholderAsset(name, category) {
        console.warn(`Creating placeholder for failed asset: ${name}`);
        
        // Create a simple box as placeholder
        const placeholderMesh = BABYLON.MeshBuilder.CreateBox(name + "_placeholder", {size: 1}, this.scene);
        const placeholderMaterial = new BABYLON.StandardMaterial(name + "_placeholder_mat", this.scene);
        placeholderMaterial.diffuseColor = new BABYLON.Color3(1, 0, 1); // Magenta to indicate placeholder
        placeholderMesh.material = placeholderMaterial;

        const assetData = {
            name,
            category,
            meshes: [placeholderMesh],
            particleSystems: [],
            skeletons: [],
            isPlaceholder: true,
            loadedAt: Date.now()
        };

        this.loadedAssets.set(name, assetData);
        return assetData;
    }

    /**
     * Load multiple assets with dependency resolution and progress tracking
     * @param {Array} assetList - Array of asset objects {name, folder, filename, category, dependencies}
     * @param {boolean} resolveOrder - Whether to resolve dependency order
     * @returns {Promise} - Promise resolving when all assets are loaded
     */
    async loadAssets(assetList, resolveOrder = true) {
        if (this.isLoading) {
            console.warn('Asset loading already in progress');
            return;
        }

        this.isLoading = true;
        this.loadingProgress.total = assetList.length;
        this.loadingProgress.loaded = 0;
        this.loadingProgress.failed = 0;
        this.loadingProgress.errors = [];

        try {
            // Add dependencies if specified
            assetList.forEach(asset => {
                if (asset.dependencies) {
                    this.addDependency(asset.name, asset.dependencies);
                }
            });

            // Resolve loading order if requested
            const orderedAssets = resolveOrder ? this.resolveDependencies(assetList) : assetList;
            
            // Categorize assets
            this.categorizeAssets(orderedAssets);

            // Load essential assets first (sequential)
            if (this.assetCategories.essential.length > 0) {
                console.log('Loading essential assets...');
                for (const asset of this.assetCategories.essential) {
                    await this.loadModel(asset.name, asset.folder, asset.filename, asset.category);
                }
            }

            // Load gameplay assets (parallel for better performance)
            if (this.assetCategories.gameplay.length > 0) {
                console.log('Loading gameplay assets...');
                const gameplayPromises = this.assetCategories.gameplay.map(asset =>
                    this.loadModel(asset.name, asset.folder, asset.filename, asset.category)
                );
                await Promise.allSettled(gameplayPromises);
            }

            // Load optional assets (parallel, failures allowed)
            if (this.assetCategories.optional.length > 0) {
                console.log('Loading optional assets...');
                const optionalPromises = this.assetCategories.optional.map(asset =>
                    this.loadModel(asset.name, asset.folder, asset.filename, asset.category)
                );
                await Promise.allSettled(optionalPromises);
            }

            console.log(`Asset loading complete. Loaded: ${this.loadingProgress.loaded}, Failed: ${this.loadingProgress.failed}`);
            
            if (this.loadingProgress.errors.length > 0) {
                console.warn('Some assets failed to load:', this.loadingProgress.errors);
            }

        } catch (error) {
            console.error('Critical error during asset loading:', error);
            throw error;
        } finally {
            this.isLoading = false;
            this.notifyProgress();
        }
    }

    /**
     * Categorize assets into loading priorities
     * @param {Array} assetList - List of assets to categorize
     */
    categorizeAssets(assetList) {
        this.assetCategories.essential = [];
        this.assetCategories.gameplay = [];
        this.assetCategories.optional = [];

        assetList.forEach(asset => {
            const category = asset.category || 'gameplay';
            if (this.assetCategories[category]) {
                this.assetCategories[category].push(asset);
            } else {
                this.assetCategories.gameplay.push(asset);
            }
        });
    }

    /**
     * Get a loaded asset
     * @param {string} name - Asset name
     * @returns {Object|null} - Asset data or null if not found
     */
    getAsset(name) {
        return this.loadedAssets.get(name) || null;
    }

    /**
     * Check if an asset is loaded
     * @param {string} name - Asset name
     * @returns {boolean} - True if asset is loaded
     */
    isAssetLoaded(name) {
        return this.loadedAssets.has(name);
    }

    /**
     * Clone a loaded model for reuse
     * @param {string} name - Original asset name
     * @param {string} newName - New instance name
     * @returns {Array|null} - Array of cloned meshes or null if asset not found
     */
    cloneModel(name, newName) {
        const asset = this.getAsset(name);
        if (!asset) {
            console.error(`Asset ${name} not found`);
            return null;
        }

        const clonedMeshes = asset.meshes.map((mesh) => {
            const clonedMesh = mesh.clone(newName + '_' + mesh.name);
            return clonedMesh;
        });

        return clonedMeshes;
    }

    /**
     * Dispose of an asset and free memory
     * @param {string} name - Asset name to dispose
     */
    disposeAsset(name) {
        const asset = this.getAsset(name);
        if (!asset) {
            console.warn(`Asset ${name} not found for disposal`);
            return;
        }

        // Dispose meshes
        asset.meshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });

        // Dispose particle systems
        asset.particleSystems.forEach(ps => ps.dispose());

        // Dispose skeletons
        asset.skeletons.forEach(skeleton => skeleton.dispose());

        this.loadedAssets.delete(name);
        console.log(`Disposed asset: ${name}`);
    }

    /**
     * Get loading progress information
     * @returns {Object} - Current loading progress
     */
    getProgress() {
        return { ...this.loadingProgress };
    }

    /**
     * Load game assets based on configuration
     * @returns {Promise} - Promise resolving when all game assets are loaded
     */
    async loadGameAssets() {
        const gameAssets = [
            // Essential UI assets
            {
                name: 'loadingImage',
                folder: GameConfig.assets.images,
                filename: 'LoadingImage.png',
                category: 'essential'
            },
            
            // Weapons
            {
                name: 'ak47',
                folder: GameConfig.assets.weapons,
                filename: 'ak47.glb',
                category: 'gameplay'
            },
            {
                name: 'pistol',
                folder: GameConfig.assets.weapons,
                filename: 'pistol.gltf',
                category: 'gameplay'
            },
            {
                name: 'sniper',
                folder: GameConfig.assets.weapons,
                filename: 'sniper.glb',
                category: 'gameplay'
            },
            
            // Map props
            {
                name: 'crate',
                folder: GameConfig.assets.basePath + 'props/',
                filename: 'crate.glb',
                category: 'gameplay'
            },
            {
                name: 'barrel',
                folder: GameConfig.assets.basePath + 'props/',
                filename: 'barrel.glb',
                category: 'optional'
            }
        ];

        await this.loadAssets(gameAssets);
    }

    /**
     * Load map-specific assets
     * @param {Object} mapData - Map data containing asset requirements
     * @returns {Promise} - Promise resolving when map assets are loaded
     */
    async loadMapAssets(mapData) {
        if (!mapData || !mapData.assets) {
            console.warn('No map assets to load');
            return;
        }

        const mapAssets = mapData.assets.map(asset => ({
            name: asset.name || asset.path.split('/').pop().split('.')[0],
            folder: asset.path.substring(0, asset.path.lastIndexOf('/') + 1),
            filename: asset.path.split('/').pop(),
            category: asset.essential ? 'essential' : 'gameplay'
        }));

        await this.loadAssets(mapAssets);
    }

    /**
     * Clear all loaded assets and free memory
     */
    dispose() {
        console.log('Disposing AssetManager...');
        
        this.loadedAssets.forEach((asset, name) => {
            this.disposeAsset(name);
        });

        this.loadedAssets.clear();
        this.dependencies.clear();
        this.progressCallbacks = [];
        this.loadingQueue = [];
        
        // Reset progress
        this.loadingProgress = {
            total: 0,
            loaded: 0,
            failed: 0,
            percentage: 0,
            currentAsset: null,
            errors: []
        };
    }
}

export default AssetManager;