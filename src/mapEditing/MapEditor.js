/**
 * KILLtONE Game Framework - Map Editor
 * 3D map editor core functionality with state management and serialization
 */

import { GameConfig } from '../mainConfig.js';
import { EditorTools } from './EditorTools.js';
import { CommonUtils } from '../utils/CommonUtils.js';
import { MathUtils } from '../utils/MathUtils.js';

export class MapEditor {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.engine = game.engine;
        this.canvas = game.canvas;

        // Editor state
        this.isActive = false;
        this.mode = 'EDIT'; // 'EDIT' or 'PLAY'
        this.previousGameState = null;

        // Cameras
        this.editorCamera = null;
        this.gameCamera = null;
        this.originalCamera = null;

        // Editor data
        this.currentMapData = {
            id: '',
            name: 'Untitled Map',
            version: '1.0.0',
            author: 'Unknown',
            description: '',
            spawnPoints: [],
            props: [],
            entities: [],
            assets: [],
            settings: {
                gravity: GameConfig.physics.gravity,
                skybox: null,
                lighting: 'default'
            }
        };

        // Editor state tracking
        this.selectedObjects = new Set();
        this.clipboard = [];
        this.isDirty = false; // Has unsaved changes

        // Undo/Redo system
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = GameConfig.mapEditor.maxUndoSteps || 50;

        // Auto-save
        this.autoSaveEnabled = GameConfig.mapEditor.autoSave || false;
        this.autoSaveInterval = GameConfig.mapEditor.autoSaveInterval || 60000;
        this.autoSaveTimer = null;

        // Event callbacks
        this.onModeChanged = null;
        this.onSelectionChanged = null;
        this.onMapChanged = null;
        this.onSaved = null;
        this.onLoaded = null;

        // Editor tools
        this.editorTools = null;

        this.initialize();
    }

    /**
     * Initialize the map editor
     */
    initialize() {
        console.log('Initializing MapEditor...');

        // Create editor camera
        this.createEditorCamera();

        // Initialize editor tools
        this.editorTools = new EditorTools(this);

        // Set up event listeners
        this.setupEventListeners();

        // Initialize auto-save if enabled
        if (this.autoSaveEnabled) {
            this.startAutoSave();
        }

        console.log('MapEditor initialized');
    }

    /**
     * Create the editor camera (ArcRotateCamera)
     */
    createEditorCamera() {
        // Create ArcRotateCamera for editor view
        this.editorCamera = new BABYLON.ArcRotateCamera(
            'editorCamera',
            -MathUtils.HALF_PI, // Alpha (horizontal rotation)
            MathUtils.PI / 2.5, // Beta (vertical rotation)
            50, // Radius (distance from target)
            new BABYLON.Vector3(0, 0, 0), // Target position
            this.scene
        );

        // Configure camera controls
        this.editorCamera.setTarget(BABYLON.Vector3.Zero());
        this.editorCamera.attachControl(this.canvas);

        // Set camera limits
        this.editorCamera.lowerBetaLimit = 0.1;
        this.editorCamera.upperBetaLimit = MathUtils.HALF_PI;
        this.editorCamera.lowerRadiusLimit = 2;
        this.editorCamera.upperRadiusLimit = 200;

        // Configure camera behavior
        this.editorCamera.wheelPrecision = 50;
        this.editorCamera.panningSensibility = 1000;
        this.editorCamera.angularSensibilityX = 1000;
        this.editorCamera.angularSensibilityY = 1000;

        // Enable panning
        this.editorCamera.panningAxis = new BABYLON.Vector3(1, 1, 0);

        console.log('Editor camera created');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for key presses
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (!this.isActive) return;

            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    this.handleKeyDown(kbInfo.event);
                    break;
            }
        });

        // Listen for pointer events (mouse clicks)
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.isActive) return;

            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    this.handlePointerDown(pointerInfo);
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    this.handlePointerUp(pointerInfo);
                    break;
            }
        });
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        const key = event.code;
        const ctrl = event.ctrlKey;
        const shift = event.shiftKey;

        // Prevent default browser behavior for editor shortcuts
        const editorKeys = ['KeyS', 'KeyL', 'KeyZ', 'KeyY', 'KeyC', 'KeyV', 'KeyX', 'Delete'];
        if (ctrl && editorKeys.includes(key)) {
            event.preventDefault();
        }

        switch (key) {
            case 'KeyS':
                if (ctrl) {
                    this.saveMap();
                }
                break;

            case 'KeyL':
                if (ctrl) {
                    this.showLoadDialog();
                }
                break;

            case 'KeyZ':
                if (ctrl && !shift) {
                    this.undo();
                } else if (ctrl && shift) {
                    this.redo();
                }
                break;

            case 'KeyY':
                if (ctrl) {
                    this.redo();
                }
                break;

            case 'KeyC':
                if (ctrl) {
                    this.copySelected();
                }
                break;

            case 'KeyV':
                if (ctrl) {
                    this.paste();
                }
                break;

            case 'KeyX':
                if (ctrl) {
                    this.cutSelected();
                }
                break;

            case 'Delete':
                this.deleteSelected();
                break;

            case 'Escape':
                this.clearSelection();
                break;

            case 'KeyE':
                if (ctrl) {
                    this.toggleMode();
                }
                break;
        }
    }

    /**
     * Handle pointer down events
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    handlePointerDown(pointerInfo) {
        if (pointerInfo.pickInfo.hit) {
            const pickedMesh = pointerInfo.pickInfo.pickedMesh;

            // Check if clicked on an editor object
            if (pickedMesh && pickedMesh.metadata && pickedMesh.metadata.isEditorObject) {
                this.selectObject(pickedMesh, pointerInfo.event.ctrlKey);
            } else {
                // Clicked on empty space or non-editor object
                if (!pointerInfo.event.ctrlKey) {
                    this.clearSelection();
                }
            }
        }
    }

    /**
     * Handle pointer up events
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    handlePointerUp(pointerInfo) {
        // Handle object placement if in placement mode
        if (this.editorTools && this.editorTools.placementMode) {
            this.editorTools.handlePlacementClick(pointerInfo);
            return;
        }
        
        // Handle other pointer up events (dragging end, etc.)
    }

    /**
     * Activate the map editor
     * @param {Object} mapData - Optional map data to load
     * @returns {Promise} - Promise resolving when editor is activated
     */
    async activate(mapData = null) {
        if (this.isActive) {
            console.warn('Map editor is already active');
            return;
        }

        console.log('Activating map editor...');

        // Store previous game state
        if (this.game.stateManager) {
            this.previousGameState = this.game.stateManager.getCurrentState();
        }

        // Store original camera
        this.originalCamera = this.scene.activeCamera;

        // Switch to editor camera
        this.scene.activeCamera = this.editorCamera;

        // Load map data if provided
        if (mapData) {
            this.loadMapData(mapData);
        } else {
            // Create new map
            this.createNewMap();
        }

        // Set editor as active
        this.isActive = true;
        this.mode = 'EDIT';

        // Notify UI about activation
        if (this.game.uiManager) {
            this.game.uiManager.showMapEditor();
        }

        // Update game state
        if (this.game.stateManager) {
            this.game.stateManager.transitionTo('MAP_EDITOR');
        }

        console.log('Map editor activated');

        // Notify mode change
        if (this.onModeChanged) {
            this.onModeChanged('EDIT', null);
        }
    }

    /**
     * Deactivate the map editor
     * @param {boolean} saveChanges - Whether to save changes before deactivating
     * @returns {Promise} - Promise resolving when editor is deactivated
     */
    async deactivate(saveChanges = false) {
        if (!this.isActive) {
            console.warn('Map editor is not active');
            return;
        }

        console.log('Deactivating map editor...');

        // Check for unsaved changes
        if (this.isDirty && saveChanges) {
            await this.saveMap();
        }

        // Clear selection
        this.clearSelection();

        // Restore original camera
        if (this.originalCamera) {
            this.scene.activeCamera = this.originalCamera;
        }

        // Hide editor UI
        if (this.game.uiManager) {
            this.game.uiManager.hideMapEditor();
        }

        // Restore previous game state
        if (this.game.stateManager && this.previousGameState) {
            this.game.stateManager.transitionTo(this.previousGameState);
        }

        // Set editor as inactive
        this.isActive = false;
        this.mode = 'EDIT';

        console.log('Map editor deactivated');

        // Notify mode change
        if (this.onModeChanged) {
            this.onModeChanged(null, 'EDIT');
        }
    }

    /**
     * Toggle between EDIT and PLAY modes
     */
    toggleMode() {
        if (!this.isActive) return;

        const newMode = this.mode === 'EDIT' ? 'PLAY' : 'EDIT';
        this.setMode(newMode);
    }

    /**
     * Set the editor mode
     * @param {string} mode - Mode to set ('EDIT' or 'PLAY')
     */
    setMode(mode) {
        if (!this.isActive || this.mode === mode) return;

        const oldMode = this.mode;
        this.mode = mode;

        console.log(`Switching editor mode: ${oldMode} -> ${mode}`);

        if (mode === 'PLAY') {
            // Switch to play mode (first-person testing)
            this.enterPlayMode();
        } else {
            // Switch to edit mode
            this.enterEditMode();
        }

        // Notify mode change
        if (this.onModeChanged) {
            this.onModeChanged(mode, oldMode);
        }
    }

    /**
     * Enter play mode for testing
     */
    enterPlayMode() {
        // Clear selection
        this.clearSelection();

        // Create or switch to game camera (first-person)
        if (!this.gameCamera) {
            this.gameCamera = new BABYLON.FreeCamera('editorPlayCamera', new BABYLON.Vector3(0, 1.8, 0), this.scene);
            this.gameCamera.attachControl(this.canvas);
            this.gameCamera.setTarget(new BABYLON.Vector3(0, 1.8, 1));
        }

        // Position camera at a spawn point if available
        if (this.currentMapData.spawnPoints.length > 0) {
            const spawn = this.currentMapData.spawnPoints[0];
            this.gameCamera.position.set(spawn.position.x, spawn.position.y + 1.8, spawn.position.z);

            if (spawn.rotation) {
                this.gameCamera.rotation.set(
                    BABYLON.Tools.ToRadians(spawn.rotation.x || 0),
                    BABYLON.Tools.ToRadians(spawn.rotation.y || 0),
                    BABYLON.Tools.ToRadians(spawn.rotation.z || 0)
                );
            }
        }

        // Switch to game camera
        this.scene.activeCamera = this.gameCamera;

        console.log('Entered play mode');
    }

    /**
     * Enter edit mode
     */
    enterEditMode() {
        // Switch back to editor camera
        this.scene.activeCamera = this.editorCamera;

        console.log('Entered edit mode');
    }

    /**
     * Create a new map
     */
    createNewMap() {
        console.log('Creating new map...');

        // Reset map data
        this.currentMapData = {
            id: this.generateMapId(),
            name: 'Untitled Map',
            version: '1.0.0',
            author: 'Unknown',
            description: '',
            spawnPoints: [],
            props: [],
            entities: [],
            assets: [],
            settings: {
                gravity: GameConfig.physics.gravity,
                skybox: null,
                lighting: 'default'
            }
        };

        // Clear undo/redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.isDirty = false;

        // Add default spawn points
        this.addDefaultSpawnPoints();

        console.log('New map created');

        // Notify map change
        if (this.onMapChanged) {
            this.onMapChanged(this.currentMapData);
        }
    }

    /**
     * Add default spawn points to a new map
     */
    addDefaultSpawnPoints() {
        const defaultSpawns = [
            { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
            { position: { x: 10, y: 0, z: 0 }, rotation: { x: 0, y: 180, z: 0 } }
        ];

        defaultSpawns.forEach((spawn, index) => {
            this.currentMapData.spawnPoints.push(spawn);
            this.createSpawnPointVisual(spawn, index);
        });

        this.markDirty();
    }

    /**
     * Create visual representation of a spawn point
     * @param {Object} spawnData - Spawn point data
     * @param {number} index - Spawn point index
     * @returns {BABYLON.Mesh} - Created spawn point mesh
     */
    createSpawnPointVisual(spawnData, index) {
        // Create spawn point visual
        const spawnMesh = BABYLON.MeshBuilder.CreateCylinder(
            `spawn_${index}`,
            { height: 2, diameter: 1 },
            this.scene
        );

        // Position the spawn point
        spawnMesh.position.set(spawnData.position.x, spawnData.position.y + 1, spawnData.position.z);

        // Create material
        const material = new BABYLON.StandardMaterial(`spawn_mat_${index}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
        material.alpha = 0.7;
        spawnMesh.material = material;

        // Add metadata
        spawnMesh.metadata = {
            isEditorObject: true,
            objectType: 'spawnPoint',
            spawnIndex: index,
            spawnData: spawnData
        };

        return spawnMesh;
    }

    /**
     * Load map data into the editor
     * @param {Object} mapData - Map data to load
     */
    loadMapData(mapData) {
        console.log('Loading map data into editor:', mapData);

        // Clear current map
        this.clearMap();

        // Load the map data
        this.currentMapData = JSON.parse(JSON.stringify(mapData)); // Deep copy

        // Create visual representations
        this.createMapVisuals();

        // Clear undo/redo stacks
        this.undoStack = [];
        this.redoStack = [];
        this.isDirty = false;

        console.log('Map data loaded into editor');

        // Notify map change
        if (this.onMapChanged) {
            this.onMapChanged(this.currentMapData);
        }
    }

    /**
     * Create visual representations of map objects
     */
    createMapVisuals() {
        // Create spawn point visuals
        this.currentMapData.spawnPoints.forEach((spawn, index) => {
            this.createSpawnPointVisual(spawn, index);
        });

        // Create prop visuals (would integrate with actual prop system)
        this.currentMapData.props.forEach((prop, index) => {
            this.createPropVisual(prop, index);
        });

        // Create entity visuals
        this.currentMapData.entities.forEach((entity, index) => {
            this.createEntityVisual(entity, index);
        });
    }

    /**
     * Create visual representation of a prop
     * @param {Object} propData - Prop data
     * @param {number} index - Prop index
     * @returns {BABYLON.Mesh} - Created prop mesh
     */
    createPropVisual(propData, index) {
        // For now, create a placeholder box
        const propMesh = BABYLON.MeshBuilder.CreateBox(
            `prop_${propData.id}`,
            { size: 1 },
            this.scene
        );

        // Position and rotate
        propMesh.position.set(propData.position.x, propData.position.y, propData.position.z);

        if (propData.rotation) {
            propMesh.rotation.set(
                BABYLON.Tools.ToRadians(propData.rotation.x || 0),
                BABYLON.Tools.ToRadians(propData.rotation.y || 0),
                BABYLON.Tools.ToRadians(propData.rotation.z || 0)
            );
        }

        if (propData.scale) {
            propMesh.scaling.set(
                propData.scale.x || 1,
                propData.scale.y || 1,
                propData.scale.z || 1
            );
        }

        // Create material
        const material = new BABYLON.StandardMaterial(`prop_mat_${propData.id}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray
        propMesh.material = material;

        // Add metadata
        propMesh.metadata = {
            isEditorObject: true,
            objectType: 'prop',
            propIndex: index,
            propData: propData
        };

        return propMesh;
    }

    /**
     * Create visual representation of an entity
     * @param {Object} entityData - Entity data
     * @param {number} index - Entity index
     * @returns {BABYLON.Mesh} - Created entity mesh
     */
    createEntityVisual(entityData, index) {
        // Create entity visual based on type
        const entityMesh = BABYLON.MeshBuilder.CreateBox(
            `entity_${entityData.id}`,
            { size: 0.5 },
            this.scene
        );

        // Position
        entityMesh.position.set(entityData.position.x, entityData.position.y, entityData.position.z);

        // Create material based on entity type
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

        // Add metadata
        entityMesh.metadata = {
            isEditorObject: true,
            objectType: 'entity',
            entityIndex: index,
            entityData: entityData
        };

        return entityMesh;
    }

    /**
     * Clear the current map
     */
    clearMap() {
        // Remove all editor objects from scene
        const editorObjects = this.scene.meshes.filter(mesh =>
            mesh.metadata && mesh.metadata.isEditorObject
        );

        editorObjects.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });

        // Clear selection
        this.clearSelection();
    }

    /**
     * Select an object
     * @param {BABYLON.Mesh} mesh - Mesh to select
     * @param {boolean} addToSelection - Whether to add to existing selection
     */
    selectObject(mesh, addToSelection = false) {
        if (!addToSelection) {
            this.clearSelection();
        }

        this.selectedObjects.add(mesh);
        this.highlightMesh(mesh, true);

        // Attach gizmo to the selected object if only one object is selected
        if (this.selectedObjects.size === 1 && this.editorTools) {
            this.editorTools.attachGizmoToObject(mesh);
        } else if (this.selectedObjects.size > 1 && this.editorTools) {
            // Detach gizmo when multiple objects are selected
            this.editorTools.detachGizmo();
        }

        console.log(`Selected object: ${mesh.name}`);

        // Notify selection change
        if (this.onSelectionChanged) {
            this.onSelectionChanged(Array.from(this.selectedObjects));
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedObjects.forEach(mesh => {
            this.highlightMesh(mesh, false);
        });

        this.selectedObjects.clear();

        // Detach gizmo when clearing selection
        if (this.editorTools) {
            this.editorTools.detachGizmo();
        }

        // Notify selection change
        if (this.onSelectionChanged) {
            this.onSelectionChanged([]);
        }
    }

    /**
     * Highlight or unhighlight a mesh
     * @param {BABYLON.Mesh} mesh - Mesh to highlight
     * @param {boolean} highlight - Whether to highlight or unhighlight
     */
    highlightMesh(mesh, highlight) {
        if (!mesh.material) return;

        if (highlight) {
            // Store original emissive color
            if (!mesh.metadata.originalEmissive) {
                mesh.metadata.originalEmissive = mesh.material.emissiveColor.clone();
            }

            // Set highlight color
            mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 0); // Yellow highlight
        } else {
            // Restore original emissive color
            if (mesh.metadata.originalEmissive) {
                mesh.material.emissiveColor = mesh.metadata.originalEmissive;
            }
        }
    }

    /**
     * Delete selected objects
     */
    deleteSelected() {
        if (this.selectedObjects.size === 0) return;

        console.log(`Deleting ${this.selectedObjects.size} selected objects`);

        // Create undo state
        this.saveUndoState('Delete Objects');

        // Delete each selected object
        this.selectedObjects.forEach(mesh => {
            this.deleteObject(mesh);
        });

        // Clear selection
        this.clearSelection();

        this.markDirty();
    }

    /**
     * Delete a specific object
     * @param {BABYLON.Mesh} mesh - Mesh to delete
     */
    deleteObject(mesh) {
        if (!mesh.metadata || !mesh.metadata.isEditorObject) return;

        const objectType = mesh.metadata.objectType;

        // Remove from map data
        switch (objectType) {
            case 'spawnPoint':
                const spawnIndex = mesh.metadata.spawnIndex;
                this.currentMapData.spawnPoints.splice(spawnIndex, 1);
                break;

            case 'prop':
                const propIndex = mesh.metadata.propIndex;
                this.currentMapData.props.splice(propIndex, 1);
                break;

            case 'entity':
                const entityIndex = mesh.metadata.entityIndex;
                this.currentMapData.entities.splice(entityIndex, 1);
                break;
        }

        // Remove from scene
        if (mesh.material) {
            mesh.material.dispose();
        }
        mesh.dispose();

        console.log(`Deleted ${objectType}: ${mesh.name}`);
    }

    /**
     * Copy selected objects to clipboard
     */
    copySelected() {
        if (this.selectedObjects.size === 0) return;

        this.clipboard = [];

        this.selectedObjects.forEach(mesh => {
            if (mesh.metadata && mesh.metadata.isEditorObject) {
                const objectData = this.getObjectData(mesh);
                if (objectData) {
                    this.clipboard.push(objectData);
                }
            }
        });

        console.log(`Copied ${this.clipboard.length} objects to clipboard`);
    }

    /**
     * Cut selected objects to clipboard
     */
    cutSelected() {
        this.copySelected();
        this.deleteSelected();
    }

    /**
     * Paste objects from clipboard
     */
    paste() {
        if (this.clipboard.length === 0) return;

        console.log(`Pasting ${this.clipboard.length} objects from clipboard`);

        // Create undo state
        this.saveUndoState('Paste Objects');

        // Clear current selection
        this.clearSelection();

        // Paste each object
        this.clipboard.forEach(objectData => {
            // Offset position slightly
            const newData = JSON.parse(JSON.stringify(objectData));
            newData.position.x += 2;
            newData.position.z += 2;

            this.createObjectFromData(newData);
        });

        this.markDirty();
    }

    /**
     * Get object data from mesh
     * @param {BABYLON.Mesh} mesh - Mesh to get data from
     * @returns {Object|null} - Object data or null
     */
    getObjectData(mesh) {
        if (!mesh.metadata || !mesh.metadata.isEditorObject) return null;

        const objectType = mesh.metadata.objectType;

        switch (objectType) {
            case 'spawnPoint':
                return {
                    type: 'spawnPoint',
                    position: { x: mesh.position.x, y: mesh.position.y - 1, z: mesh.position.z },
                    rotation: {
                        x: BABYLON.Tools.ToDegrees(mesh.rotation.x),
                        y: BABYLON.Tools.ToDegrees(mesh.rotation.y),
                        z: BABYLON.Tools.ToDegrees(mesh.rotation.z)
                    }
                };

            case 'prop':
                return {
                    type: 'prop',
                    ...mesh.metadata.propData
                };

            case 'entity':
                return {
                    type: 'entity',
                    ...mesh.metadata.entityData
                };

            default:
                return null;
        }
    }

    /**
     * Create object from data
     * @param {Object} objectData - Object data
     */
    createObjectFromData(objectData) {
        switch (objectData.type) {
            case 'spawnPoint':
                const spawnIndex = this.currentMapData.spawnPoints.length;
                this.currentMapData.spawnPoints.push({
                    position: objectData.position,
                    rotation: objectData.rotation
                });
                this.createSpawnPointVisual(objectData, spawnIndex);
                break;

            case 'prop':
                const propIndex = this.currentMapData.props.length;
                this.currentMapData.props.push(objectData);
                this.createPropVisual(objectData, propIndex);
                break;

            case 'entity':
                const entityIndex = this.currentMapData.entities.length;
                this.currentMapData.entities.push(objectData);
                this.createEntityVisual(objectData, entityIndex);
                break;
        }
    }

    /**
     * Save undo state
     * @param {string} description - Description of the action
     */
    saveUndoState(description) {
        // Create deep copy of current map data
        const undoState = {
            description,
            timestamp: Date.now(),
            mapData: JSON.parse(JSON.stringify(this.currentMapData))
        };

        // Add to undo stack
        this.undoStack.push(undoState);

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }

        // Clear redo stack
        this.redoStack = [];

        console.log(`Saved undo state: ${description}`);
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return;
        }

        // Save current state to redo stack
        const redoState = {
            description: 'Redo',
            timestamp: Date.now(),
            mapData: JSON.parse(JSON.stringify(this.currentMapData))
        };
        this.redoStack.push(redoState);

        // Get undo state
        const undoState = this.undoStack.pop();

        // Restore state
        this.loadMapData(undoState.mapData);

        console.log(`Undid: ${undoState.description}`);
        this.markDirty();
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return;
        }

        // Save current state to undo stack
        this.saveUndoState('Undo');

        // Get redo state
        const redoState = this.redoStack.pop();

        // Restore state
        this.loadMapData(redoState.mapData);

        console.log('Redid action');
        this.markDirty();
    }

    /**
     * Serialize current map to JSON
     * @returns {string} - JSON string of map data
     */
    serializeMap() {
        // Clean up map data before serialization
        const cleanMapData = this.cleanMapData(this.currentMapData);

        // Convert to JSON with formatting
        return JSON.stringify(cleanMapData, null, 2);
    }

    /**
     * Clean map data for serialization
     * @param {Object} mapData - Map data to clean
     * @returns {Object} - Cleaned map data
     */
    cleanMapData(mapData) {
        const cleaned = JSON.parse(JSON.stringify(mapData));

        // Ensure required fields
        if (!cleaned.id) cleaned.id = this.generateMapId();
        if (!cleaned.version) cleaned.version = '1.0.0';
        if (!cleaned.spawnPoints) cleaned.spawnPoints = [];
        if (!cleaned.props) cleaned.props = [];
        if (!cleaned.entities) cleaned.entities = [];
        if (!cleaned.assets) cleaned.assets = [];

        // Round position/rotation values to avoid floating point precision issues
        const roundVector = (vec) => {
            return CommonUtils.roundVector(vec, 3);
        };

        cleaned.spawnPoints.forEach(spawn => {
            roundVector(spawn.position);
            roundVector(spawn.rotation);
        });

        cleaned.props.forEach(prop => {
            roundVector(prop.position);
            roundVector(prop.rotation);
            roundVector(prop.scale);
        });

        cleaned.entities.forEach(entity => {
            roundVector(entity.position);
            roundVector(entity.rotation);
        });

        return cleaned;
    }

    /**
     * Save the current map
     * @param {string} filename - Optional filename
     * @returns {Promise} - Promise resolving when map is saved
     */
    async saveMap(filename = null) {
        console.log('Saving map...');

        try {
            const mapJson = this.serializeMap();
            const mapName = filename || `${this.currentMapData.id}.json`;

            // For now, just log the JSON (in a real implementation, this would save to file)
            console.log('Map JSON:', mapJson);

            // In a browser environment, we could trigger a download
            this.downloadMapFile(mapJson, mapName);

            // Mark as saved
            this.isDirty = false;

            console.log(`Map saved as: ${mapName}`);

            // Notify save
            if (this.onSaved) {
                this.onSaved(this.currentMapData, mapJson);
            }

        } catch (error) {
            console.error('Failed to save map:', error);
            throw error;
        }
    }

    /**
     * Download map file (browser implementation)
     * @param {string} mapJson - Map JSON string
     * @param {string} filename - Filename
     */
    downloadMapFile(mapJson, filename) {
        const blob = new Blob([mapJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    /**
     * Show load dialog (placeholder)
     */
    showLoadDialog() {
        console.log('Load dialog would be shown here');
        // In a real implementation, this would show a file picker or map list
    }

    /**
     * Generate a unique map ID
     * @returns {string} - Generated map ID
     */
    generateMapId() {
        return CommonUtils.generateMapId();
    }

    /**
     * Mark the map as dirty (has unsaved changes)
     */
    markDirty() {
        this.isDirty = true;

        // Notify map change
        if (this.onMapChanged) {
            this.onMapChanged(this.currentMapData);
        }
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty && this.isActive) {
                console.log('Auto-saving map...');
                this.saveMap(`${this.currentMapData.id}_autosave.json`);
            }
        }, this.autoSaveInterval);

        console.log(`Auto-save started (interval: ${this.autoSaveInterval}ms)`);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('Auto-save stopped');
        }
    }

    /**
     * Get current map data
     * @returns {Object} - Current map data
     */
    getMapData() {
        return JSON.parse(JSON.stringify(this.currentMapData));
    }

    /**
     * Check if editor is active
     * @returns {boolean} - True if editor is active
     */
    isEditorActive() {
        return this.isActive;
    }

    /**
     * Get current mode
     * @returns {string} - Current mode ('EDIT' or 'PLAY')
     */
    getCurrentMode() {
        return this.mode;
    }

    /**
     * Check if map has unsaved changes
     * @returns {boolean} - True if map has unsaved changes
     */
    hasUnsavedChanges() {
        return this.isDirty;
    }

    /**
     * Set event callbacks
     * @param {Object} callbacks - Object containing callback functions
     */
    setCallbacks(callbacks) {
        if (callbacks.onModeChanged) this.onModeChanged = callbacks.onModeChanged;
        if (callbacks.onSelectionChanged) this.onSelectionChanged = callbacks.onSelectionChanged;
        if (callbacks.onMapChanged) this.onMapChanged = callbacks.onMapChanged;
        if (callbacks.onSaved) this.onSaved = callbacks.onSaved;
        if (callbacks.onLoaded) this.onLoaded = callbacks.onLoaded;
    }

    /**
     * Dispose of the MapEditor and clean up resources
     */
    dispose() {
        console.log('Disposing MapEditor...');

        // Deactivate if active
        if (this.isActive) {
            this.deactivate();
        }

        // Stop auto-save
        this.stopAutoSave();

        // Clear map
        this.clearMap();

        // Dispose cameras
        if (this.editorCamera) {
            this.editorCamera.dispose();
        }
        if (this.gameCamera) {
            this.gameCamera.dispose();
        }

        // Clear all data
        this.selectedObjects.clear();
        this.clipboard = [];
        this.undoStack = [];
        this.redoStack = [];

        // Clear callbacks
        this.onModeChanged = null;
        this.onSelectionChanged = null;
        this.onMapChanged = null;
        this.onSaved = null;
        this.onLoaded = null;

        console.log('MapEditor disposed');
    }
}
