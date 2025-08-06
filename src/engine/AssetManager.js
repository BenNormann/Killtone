/**
 * KILLtONE Game Framework - Asset Manager
 * Provides asset loading with progress tracking and character transformation management
 */

import { GameConfig } from '../mainConfig.js';
import { BaseManager } from './BaseManager.js';

export class AssetManager extends BaseManager {
    constructor(game) {
        super(game);
        this.loadedAssets = new Map();
        this.progressCallbacks = [];
        this.isLoading = false;
        
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
     */
    addProgressCallback(callback) {
        if (typeof callback === 'function') {
            this.progressCallbacks.push(callback);
        }
    }

    /**
     * Remove a progress callback
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
     * Load a single model with progress tracking
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
            // Fallback to callback-based API
            else if (BABYLON.SceneLoader && typeof BABYLON.SceneLoader.ImportMesh === 'function') {
                result = await new Promise((resolve, reject) => {
                    BABYLON.SceneLoader.ImportMesh("", folder, filename, this.scene, 
                        (meshes, particleSystems, skeletons, animationGroups) => {
                            resolve({ meshes, particleSystems, skeletons, animationGroups });
                        },
                        (progress) => {
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

            // Hide weapon meshes from scene (they should only be used for cloning)
            if (category === 'weapon' || name.includes('weapon') || name.includes('carbine') || name.includes('pistol') || name.includes('shotgun') || name.includes('smg') || name.includes('sniper') || name.includes('knife')) {
                result.meshes.forEach(mesh => {
                    mesh.setEnabled(false);
                    console.log(`Hidden weapon mesh ${mesh.name} from scene (will be used for cloning)`);
                });
            }

            // Hide character meshes from scene (they should only be used for cloning)
            if (category === 'character') {
                this.applyCharacterTransformations(name, result.meshes);
                result.meshes.forEach(mesh => {
                    mesh.setEnabled(false);
                    console.log(`Hidden character mesh ${mesh.name} from scene (will be used for cloning)`);
                });
            }

            // Store the loaded asset
            const assetData = {
                name,
                category,
                meshes: result.meshes,
                particleSystems: result.particleSystems,
                skeletons: result.skeletons,
                animationGroups: result.animationGroups || [],
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
            
            if (category === 'essential') {
                throw error;
            } else {
                return this.createPlaceholderAsset(name, category);
            }
        }
    }

    /**
     * Create a placeholder asset for failed loads
     */
    createPlaceholderAsset(name, category) {
        console.warn(`Creating placeholder for failed asset: ${name}`);
        
        const placeholderMesh = BABYLON.MeshBuilder.CreateBox(name + "_placeholder", {size: 1}, this.scene);
        const placeholderMaterial = new BABYLON.StandardMaterial(name + "_placeholder_mat", this.scene);
        placeholderMaterial.diffuseColor = new BABYLON.Color3(1, 0, 1);
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
     * Load multiple assets
     */
    async loadAssets(assetList) {
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
            console.log('Loading assets...');
            const promises = assetList.map(asset =>
                this.loadModel(asset.name, asset.folder, asset.filename, asset.category)
            );
            await Promise.allSettled(promises);

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
     * Get a loaded asset
     */
    getAsset(name) {
        return this.loadedAssets.get(name) || null;
    }

    /**
     * Check if an asset is loaded
     */
    isAssetLoaded(name) {
        return this.loadedAssets.has(name);
    }

    /**
     * Clone a loaded model for reuse
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
     */
    disposeAsset(name) {
        const asset = this.getAsset(name);
        if (!asset) {
            console.warn(`Asset ${name} not found for disposal`);
            return;
        }

        asset.meshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });

        asset.particleSystems.forEach(ps => ps.dispose());
        asset.skeletons.forEach(skeleton => skeleton.dispose());

        this.loadedAssets.delete(name);
        console.log(`Disposed asset: ${name}`);
    }

    /**
     * Apply character-specific transformations
     */
    applyCharacterTransformations(characterName, meshes) {
        // Load character config
        const characterConfig = window.TrunCharacterConfig;
        if (!characterConfig || !characterConfig.transformations) {
            console.warn(`No character config found for: ${characterName}`);
            return;
        }

        const config = characterConfig.transformations[characterName];
        if (!config) {
            console.warn(`No transformation config found for character: ${characterName}`);
            return;
        }

        // Apply transformations
        meshes.forEach(mesh => {
            mesh.position = new BABYLON.Vector3(config.position.x, config.position.y, config.position.z);
            mesh.rotation = new BABYLON.Vector3(
                config.rotation.x * Math.PI / 180, 
                config.rotation.y * Math.PI / 180, 
                config.rotation.z * Math.PI / 180
            );
            mesh.scaling = new BABYLON.Vector3(config.scaling.x, config.scaling.y, config.scaling.z);
        });

        console.log(`Applied transformations for ${characterName}:`, config);
    }

    /**
     * Get loading progress information
     */
    getProgress() {
        return { ...this.loadingProgress };
    }

    /**
     * Load weapon assets
     */
    async loadWeaponAsset(weaponType, weaponConfig) {
        if (!weaponConfig.modelPath) {
            console.warn(`No model path specified for weapon: ${weaponType}`);
            return null;
        }

        const pathParts = weaponConfig.modelPath.split('/');
        const filename = pathParts.pop();
        const folder = pathParts.join('/') + '/';

        return await this.loadModel(weaponType, folder, filename, 'weapon');
    }

    /**
     * Load an image texture
     */
    async loadTexture(name, path) {
        try {
            console.log(`Loading texture ${name} from ${path}`);
            
            const texture = new BABYLON.Texture(path, this.scene);
            
            await new Promise((resolve, reject) => {
                texture.onLoadObservable.add(() => {
                    console.log(`Successfully loaded texture: ${name}`);
                    resolve();
                });
                texture.onErrorObservable.add(() => {
                    reject(new Error(`Failed to load texture: ${path}`));
                });
            });

            const assetData = {
                name,
                category: 'texture',
                texture: texture,
                loadedAt: Date.now()
            };

            this.loadedAssets.set(name, assetData);
            this.loadingProgress.loaded++;
            this.notifyProgress();
            
            return assetData;

        } catch (error) {
            console.error(`Failed to load texture ${name}:`, error);
            this.loadingProgress.failed++;
            this.loadingProgress.errors.push({ asset: name, error: error.message });
            this.notifyProgress();
            
            const placeholderTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);
            
            const assetData = {
                name,
                category: 'texture',
                texture: placeholderTexture,
                isPlaceholder: true,
                loadedAt: Date.now()
            };

            this.loadedAssets.set(name, assetData);
            return assetData;
        }
    }

    /**
     * Load game assets based on configuration
     */
    async loadGameAssets() {
        const { WeaponConfigs, WeaponConstants } = await import('../entities/weapons/WeaponConfig.js');
        
        const gameAssets = [];

        // Add weapon assets
        const allWeaponTypes = [...WeaponConstants.PRIMARY_WEAPONS, ...WeaponConstants.SECONDARY_WEAPONS];
        
        for (const weaponType of allWeaponTypes) {
            const config = WeaponConfigs[weaponType];
            if (config && config.modelPath) {
                const cleanPath = config.modelPath.replace(/^\.\//, '');
                const pathParts = cleanPath.split('/');
                const filename = pathParts.pop();
                const folder = pathParts.join('/') + '/';
                
                gameAssets.push({
                    name: weaponType,
                    folder: folder,
                    filename: filename,
                    category: 'gameplay'
                });
            }
        }

        // Add character assets from config
        const characterConfig = window.TrunCharacterConfig;
        if (characterConfig && characterConfig.animationFiles) {
            Object.entries(characterConfig.animationFiles).forEach(([name, config]) => {
                gameAssets.push({
                    name: name,
                    folder: config.folder,
                    filename: config.filename,
                    category: config.category
                });
            });
        }

        console.log('Loading game assets...');
        await this.loadAssets(gameAssets);
    }

    /**
     * Subclass-specific initialization
     */
    async _doInitialize() {
        await this.loadGameAssets();
    }

    /**
     * Load map-specific assets
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
    _doDispose() {
        this.loadedAssets.forEach((asset, name) => {
            this.disposeAsset(name);
        });

        this.loadedAssets.clear();
        this.progressCallbacks = [];
        
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