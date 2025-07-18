/**
 * KILLtONE Game Framework - Editor Tools
 * Tools for placing and manipulating objects in the map editor
 */

import { CommonUtils } from '../utils/CommonUtils.js';

export class EditorTools {
    constructor(mapEditor) {
        this.mapEditor = mapEditor;
        this.scene = mapEditor.scene;
        this.canvas = mapEditor.canvas;

        // Tool state
        this.currentTool = 'SELECT'; // SELECT, PLACE_ENTITY, PLACE_SPAWN, PLACE_PROP, PLACE_PRIMITIVE
        this.placementMode = false;
        this.selectedEntityType = 'health';
        this.selectedPrimitiveType = 'box';
        
        // Grid snapping
        this.snapToGrid = true;
        this.gridSize = 1;

        // Gizmo system
        this.gizmoManager = null;
        this.currentGizmo = null;

        // Entity types available for placement
        this.entityTypes = {
            health: {
                name: 'Health Pack',
                color: new BABYLON.Color3(0, 1, 0), // Green
                size: 0.5,
                icon: '❤️'
            },
            weapon: {
                name: 'Weapon',
                color: new BABYLON.Color3(1, 1, 0), // Yellow
                size: 0.6,
                icon: '🔫'
            },
            ammo: {
                name: 'Ammo',
                color: new BABYLON.Color3(0, 0, 1), // Blue
                size: 0.4,
                icon: '📦'
            },
            armor: {
                name: 'Armor',
                color: new BABYLON.Color3(0.5, 0.5, 1), // Light Blue
                size: 0.5,
                icon: '🛡️'
            },
            powerup: {
                name: 'Power-up',
                color: new BABYLON.Color3(1, 0, 1), // Magenta
                size: 0.3,
                icon: '⚡'
            }
        };

        // Primitive types available for placement
        this.primitiveTypes = {
            box: {
                name: 'Box',
                color: new BABYLON.Color3(0.8, 0.8, 0.8), // Light Gray
                dimensions: { width: 2, height: 2, depth: 2 },
                icon: '📦'
            },
            ramp: {
                name: 'Ramp',
                color: new BABYLON.Color3(0.6, 0.4, 0.2), // Brown
                dimensions: { width: 4, height: 2, depth: 2 },
                icon: '📐'
            },
            cylinder: {
                name: 'Cylinder',
                color: new BABYLON.Color3(0.4, 0.6, 0.8), // Blue-Gray
                dimensions: { diameter: 2, height: 3 },
                icon: '🛢️'
            }
        };

        // Preview mesh for placement
        this.previewMesh = null;
        this.isPreviewVisible = false;

        // Material/texture system
        this.availableMaterials = {
            concrete: {
                name: 'Concrete',
                color: new BABYLON.Color3(0.7, 0.7, 0.7),
                roughness: 0.8,
                metallic: 0.1
            },
            metal: {
                name: 'Metal',
                color: new BABYLON.Color3(0.5, 0.5, 0.6),
                roughness: 0.3,
                metallic: 0.9
            },
            wood: {
                name: 'Wood',
                color: new BABYLON.Color3(0.6, 0.4, 0.2),
                roughness: 0.7,
                metallic: 0.0
            },
            brick: {
                name: 'Brick',
                color: new BABYLON.Color3(0.8, 0.3, 0.2),
                roughness: 0.9,
                metallic: 0.0
            },
            glass: {
                name: 'Glass',
                color: new BABYLON.Color3(0.8, 0.9, 1.0),
                roughness: 0.1,
                metallic: 0.0,
                alpha: 0.3
            }
        };
        this.selectedMaterial = 'concrete';
    }

    /**
     * Initialize editor tools
     */
    initialize() {
        console.log('Initializing EditorTools...');

        // Create gizmo manager
        this.gizmoManager = new BABYLON.GizmoManager(this.scene);
        this.gizmoManager.positionGizmoEnabled = true;
        this.gizmoManager.rotationGizmoEnabled = true;
        this.gizmoManager.scaleGizmoEnabled = false;
        this.gizmoManager.boundingBoxGizmoEnabled = false;

        // Configure gizmo behavior
        this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = false;
        this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;

        // Set up gizmo event listeners
        this.setupGizmoEvents();

        // Set up placement preview
        this.setupPlacementPreview();

        console.log('EditorTools initialized');
    }

    /**
     * Set up gizmo event listeners
     */
    setupGizmoEvents() {
        // Listen for gizmo drag start
        this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(() => {
            if (this.mapEditor.selectedObjects.size > 0) {
                this.mapEditor.saveUndoState('Move Object');
            }
        });

        this.gizmoManager.gizmos.rotationGizmo.onDragStartObservable.add(() => {
            if (this.mapEditor.selectedObjects.size > 0) {
                this.mapEditor.saveUndoState('Rotate Object');
            }
        });

        // Listen for gizmo drag end
        this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
            this.updateObjectData();
            this.mapEditor.markDirty();
        });

        this.gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(() => {
            this.updateObjectData();
            this.mapEditor.markDirty();
        });
    }

    /**
     * Set up placement preview system
     */
    setupPlacementPreview() {
        // Listen for pointer move to show placement preview
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (this.placementMode && pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
                this.updatePlacementPreview(pointerInfo);
            }
        });
    }

    /**
     * Set the current tool
     * @param {string} tool - Tool name (SELECT, PLACE_ENTITY, PLACE_SPAWN, PLACE_PROP, PLACE_PRIMITIVE)
     */
    setTool(tool) {
        if (this.currentTool === tool) return;

        console.log(`Switching tool: ${this.currentTool} -> ${tool}`);

        // Exit current tool
        this.exitCurrentTool();

        // Set new tool
        this.currentTool = tool;

        // Enter new tool
        this.enterCurrentTool();
    }

    /**
     * Exit current tool
     */
    exitCurrentTool() {
        switch (this.currentTool) {
            case 'PLACE_ENTITY':
            case 'PLACE_SPAWN':
            case 'PLACE_PROP':
            case 'PLACE_PRIMITIVE':
                this.exitPlacementMode();
                break;
        }
    }

    /**
     * Enter current tool
     */
    enterCurrentTool() {
        switch (this.currentTool) {
            case 'PLACE_ENTITY':
                this.enterPlacementMode('entity');
                break;
            case 'PLACE_SPAWN':
                this.enterPlacementMode('spawn');
                break;
            case 'PLACE_PROP':
                this.enterPlacementMode('prop');
                break;
            case 'PLACE_PRIMITIVE':
                this.enterPlacementMode('primitive');
                break;
        }
    }

    /**
     * Enter placement mode
     * @param {string} objectType - Type of object to place
     */
    enterPlacementMode(objectType) {
        this.placementMode = true;
        this.placementObjectType = objectType;

        // Clear selection when entering placement mode
        this.mapEditor.clearSelection();

        // Create preview mesh
        this.createPlacementPreview();

        console.log(`Entered placement mode: ${objectType}`);
    }

    /**
     * Exit placement mode
     */
    exitPlacementMode() {
        this.placementMode = false;
        this.placementObjectType = null;

        // Hide preview mesh
        this.hidePlacementPreview();

        console.log('Exited placement mode');
    }

    /**
     * Create placement preview mesh
     */
    createPlacementPreview() {
        if (this.previewMesh) {
            this.previewMesh.dispose();
        }

        switch (this.placementObjectType) {
            case 'entity':
                this.previewMesh = this.createEntityPreview();
                break;
            case 'spawn':
                this.previewMesh = this.createSpawnPreview();
                break;
            case 'prop':
                this.previewMesh = this.createPropPreview();
                break;
            case 'primitive':
                this.previewMesh = this.createPrimitivePreview();
                break;
        }

        if (this.previewMesh) {
            this.previewMesh.isVisible = false;
            this.previewMesh.isPickable = false;
        }
    }

    /**
     * Create entity placement preview
     * @returns {BABYLON.Mesh} Preview mesh
     */
    createEntityPreview() {
        const entityType = this.entityTypes[this.selectedEntityType];
        if (!entityType) return null;

        const preview = BABYLON.MeshBuilder.CreateBox(
            'entityPreview',
            { size: entityType.size },
            this.scene
        );

        // Create preview material
        const material = new BABYLON.StandardMaterial('entityPreviewMat', this.scene);
        material.diffuseColor = entityType.color;
        material.emissiveColor = entityType.color.scale(0.3);
        material.alpha = 0.7;
        material.wireframe = true;
        preview.material = material;

        return preview;
    }

    /**
     * Create spawn point placement preview
     * @returns {BABYLON.Mesh} Preview mesh
     */
    createSpawnPreview() {
        const preview = BABYLON.MeshBuilder.CreateCylinder(
            'spawnPreview',
            { height: 2, diameter: 1 },
            this.scene
        );

        // Create preview material
        const material = new BABYLON.StandardMaterial('spawnPreviewMat', this.scene);
        material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Green
        material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
        material.alpha = 0.5;
        material.wireframe = true;
        preview.material = material;

        return preview;
    }

    /**
     * Create prop placement preview
     * @returns {BABYLON.Mesh} Preview mesh
     */
    createPropPreview() {
        const preview = BABYLON.MeshBuilder.CreateBox(
            'propPreview',
            { size: 1 },
            this.scene
        );

        // Create preview material
        const material = new BABYLON.StandardMaterial('propPreviewMat', this.scene);
        material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Gray
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.alpha = 0.5;
        material.wireframe = true;
        preview.material = material;

        return preview;
    }

    /**
     * Create primitive placement preview
     * @returns {BABYLON.Mesh} Preview mesh
     */
    createPrimitivePreview() {
        const primitiveType = this.primitiveTypes[this.selectedPrimitiveType];
        if (!primitiveType) return null;

        let preview;

        switch (this.selectedPrimitiveType) {
            case 'box':
                preview = BABYLON.MeshBuilder.CreateBox(
                    'primitivePreview',
                    {
                        width: primitiveType.dimensions.width,
                        height: primitiveType.dimensions.height,
                        depth: primitiveType.dimensions.depth
                    },
                    this.scene
                );
                break;

            case 'ramp':
                // Create a ramp using a wedge shape (box with angled top)
                preview = BABYLON.MeshBuilder.CreateBox(
                    'primitivePreview',
                    {
                        width: primitiveType.dimensions.width,
                        height: primitiveType.dimensions.height,
                        depth: primitiveType.dimensions.depth
                    },
                    this.scene
                );
                
                // Apply a transformation to create ramp shape
                const positions = preview.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                const indices = preview.getIndices();
                
                // Modify vertices to create ramp shape (slope the top face)
                for (let i = 0; i < positions.length; i += 3) {
                    const x = positions[i];
                    const y = positions[i + 1];
                    const z = positions[i + 2];
                    
                    // If this is a top vertex (y > 0), slope it based on z position
                    if (y > 0) {
                        positions[i + 1] = y * (1 - (z + primitiveType.dimensions.depth / 2) / primitiveType.dimensions.depth);
                    }
                }
                
                preview.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
                preview.createNormals(true);
                break;

            case 'cylinder':
                preview = BABYLON.MeshBuilder.CreateCylinder(
                    'primitivePreview',
                    {
                        diameter: primitiveType.dimensions.diameter,
                        height: primitiveType.dimensions.height
                    },
                    this.scene
                );
                break;

            default:
                return null;
        }

        // Create preview material
        const material = new BABYLON.StandardMaterial('primitivePreviewMat', this.scene);
        material.diffuseColor = primitiveType.color;
        material.emissiveColor = primitiveType.color.scale(0.3);
        material.alpha = 0.7;
        material.wireframe = true;
        preview.material = material;

        return preview;
    }

    /**
     * Update placement preview position
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     */
    updatePlacementPreview(pointerInfo) {
        if (!this.previewMesh || !this.placementMode) return;

        // Raycast to find placement position
        const ray = this.scene.createPickingRay(
            pointerInfo.event.offsetX,
            pointerInfo.event.offsetY,
            BABYLON.Matrix.Identity(),
            this.scene.activeCamera
        );

        // Cast ray to ground plane (y = 0)
        const groundPlane = BABYLON.Plane.FromPositionAndNormal(
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0, 1, 0)
        );

        const distance = ray.intersectsPlane(groundPlane);
        if (distance !== null) {
            const position = ray.origin.add(ray.direction.scale(distance));
            
            // Snap to grid if enabled
            if (this.mapEditor.snapToGrid) {
                const gridSize = this.mapEditor.gridSize || 1;
                position = CommonUtils.snapToGrid(position, gridSize);
            }

            // Update preview position
            this.previewMesh.position.copyFrom(position);
            
            // Adjust Y position based on object type
            switch (this.placementObjectType) {
                case 'entity':
                    this.previewMesh.position.y = this.entityTypes[this.selectedEntityType].size / 2;
                    break;
                case 'spawn':
                    this.previewMesh.position.y = 1; // Half height of cylinder
                    break;
                case 'prop':
                    this.previewMesh.position.y = 0.5; // Half size of box
                    break;
                case 'primitive':
                    const primitiveType = this.primitiveTypes[this.selectedPrimitiveType];
                    if (primitiveType) {
                        if (this.selectedPrimitiveType === 'cylinder') {
                            this.previewMesh.position.y = primitiveType.dimensions.height / 2;
                        } else {
                            this.previewMesh.position.y = primitiveType.dimensions.height / 2;
                        }
                    }
                    break;
            }

            // Show preview
            if (!this.isPreviewVisible) {
                this.previewMesh.isVisible = true;
                this.isPreviewVisible = true;
            }
        }
    }

    /**
     * Hide placement preview
     */
    hidePlacementPreview() {
        if (this.previewMesh) {
            this.previewMesh.isVisible = false;
            this.isPreviewVisible = false;
        }
    }

    /**
     * Handle placement click
     * @param {BABYLON.PointerInfo} pointerInfo - Pointer event info
     * @returns {boolean} True if placement was handled
     */
    handlePlacementClick(pointerInfo) {
        if (!this.placementMode || !this.previewMesh || !this.isPreviewVisible) {
            return false;
        }

        console.log(`Placing ${this.placementObjectType} at position:`, this.previewMesh.position);

        // Save undo state
        this.mapEditor.saveUndoState(`Place ${this.placementObjectType}`);

        // Place the object
        switch (this.placementObjectType) {
            case 'entity':
                this.placeEntity();
                break;
            case 'spawn':
                this.placeSpawnPoint();
                break;
            case 'prop':
                this.placeProp();
                break;
            case 'primitive':
                this.placePrimitive();
                break;
        }

        // Mark map as dirty
        this.mapEditor.markDirty();

        return true;
    }

    /**
     * Place an entity at the preview position
     */
    placeEntity() {
        const position = this.previewMesh.position.clone();
        position.y -= this.entityTypes[this.selectedEntityType].size / 2; // Adjust to ground level

        const entityData = {
            id: this.generateEntityId(),
            type: this.selectedEntityType,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: { x: 0, y: 0, z: 0 },
            properties: {}
        };

        // Add to map data
        const entityIndex = this.mapEditor.currentMapData.entities.length;
        this.mapEditor.currentMapData.entities.push(entityData);

        // Create visual representation
        const entityMesh = this.mapEditor.createEntityVisual(entityData, entityIndex);

        // Select the newly placed entity
        this.mapEditor.selectObject(entityMesh);

        console.log(`Placed entity: ${this.selectedEntityType} at`, position);
    }

    /**
     * Place a spawn point at the preview position
     */
    placeSpawnPoint() {
        const position = this.previewMesh.position.clone();
        position.y = 0; // Spawn points are at ground level

        const spawnData = {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: { x: 0, y: 0, z: 0 }
        };

        // Add to map data
        const spawnIndex = this.mapEditor.currentMapData.spawnPoints.length;
        this.mapEditor.currentMapData.spawnPoints.push(spawnData);

        // Create visual representation
        const spawnMesh = this.mapEditor.createSpawnPointVisual(spawnData, spawnIndex);

        // Select the newly placed spawn point
        this.mapEditor.selectObject(spawnMesh);

        console.log('Placed spawn point at', position);
    }

    /**
     * Place a prop at the preview position
     */
    placeProp() {
        const position = this.previewMesh.position.clone();
        position.y -= 0.5; // Adjust to ground level

        const propData = {
            id: this.generatePropId(),
            type: 'generic',
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            properties: {}
        };

        // Add to map data
        const propIndex = this.mapEditor.currentMapData.props.length;
        this.mapEditor.currentMapData.props.push(propData);

        // Create visual representation
        const propMesh = this.mapEditor.createPropVisual(propData, propIndex);

        // Select the newly placed prop
        this.mapEditor.selectObject(propMesh);

        console.log('Placed prop at', position);
    }

    /**
     * Place a primitive at the preview position
     */
    placePrimitive() {
        const position = this.previewMesh.position.clone();
        const primitiveType = this.primitiveTypes[this.selectedPrimitiveType];
        
        // Adjust position to ground level
        position.y -= primitiveType.dimensions.height / 2;

        const primitiveData = {
            id: this.generatePrimitiveId(),
            type: this.selectedPrimitiveType,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            dimensions: primitiveType.dimensions,
            properties: {}
        };

        // Add to map data (store as props for now)
        const primitiveIndex = this.mapEditor.currentMapData.props.length;
        this.mapEditor.currentMapData.props.push(primitiveData);

        // Create visual representation
        const primitiveMesh = this.mapEditor.createPrimitiveVisual(primitiveData, primitiveIndex);

        // Select the newly placed primitive
        this.mapEditor.selectObject(primitiveMesh);

        console.log(`Placed primitive: ${this.selectedPrimitiveType} at`, position);
    }

    /**
     * Set the selected entity type for placement
     * @param {string} entityType - Entity type to select
     */
    setSelectedEntityType(entityType) {
        if (this.entityTypes[entityType]) {
            this.selectedEntityType = entityType;
            
            // Update preview if in placement mode
            if (this.placementMode && this.placementObjectType === 'entity') {
                this.createPlacementPreview();
            }
            
            console.log(`Selected entity type: ${entityType}`);
        }
    }

    /**
     * Set the selected primitive type for placement
     * @param {string} primitiveType - Primitive type to select
     */
    setSelectedPrimitiveType(primitiveType) {
        if (this.primitiveTypes[primitiveType]) {
            this.selectedPrimitiveType = primitiveType;
            
            // Update preview if in placement mode
            if (this.placementMode && this.placementObjectType === 'primitive') {
                this.createPlacementPreview();
            }
            
            console.log(`Selected primitive type: ${primitiveType}`);
        }
    }

    /**
     * Get available entity types
     * @returns {Object} Entity types configuration
     */
    getEntityTypes() {
        return this.entityTypes;
    }

    /**
     * Get available primitive types
     * @returns {Object} Primitive types configuration
     */
    getPrimitiveTypes() {
        return this.primitiveTypes;
    }

    /**
     * Attach gizmo to selected object
     * @param {BABYLON.Mesh} mesh - Mesh to attach gizmo to
     */
    attachGizmoToObject(mesh) {
        if (!mesh || !this.gizmoManager) return;

        this.gizmoManager.attachToMesh(mesh);
        this.currentGizmo = mesh;

        console.log(`Attached gizmo to: ${mesh.name}`);
    }

    /**
     * Detach gizmo from current object
     */
    detachGizmo() {
        if (this.gizmoManager) {
            this.gizmoManager.attachToMesh(null);
            this.currentGizmo = null;
        }
    }

    /**
     * Update object data after gizmo manipulation
     */
    updateObjectData() {
        if (!this.currentGizmo || !this.currentGizmo.metadata) return;

        const mesh = this.currentGizmo;
        const metadata = mesh.metadata;

        if (!metadata.isEditorObject) return;

        // Update position and rotation in map data
        switch (metadata.objectType) {
            case 'spawnPoint':
                const spawnData = this.mapEditor.currentMapData.spawnPoints[metadata.spawnIndex];
                if (spawnData) {
                    spawnData.position.x = mesh.position.x;
                    spawnData.position.y = mesh.position.y - 1; // Adjust for visual offset
                    spawnData.position.z = mesh.position.z;
                    spawnData.rotation.x = BABYLON.Tools.ToDegrees(mesh.rotation.x);
                    spawnData.rotation.y = BABYLON.Tools.ToDegrees(mesh.rotation.y);
                    spawnData.rotation.z = BABYLON.Tools.ToDegrees(mesh.rotation.z);
                }
                break;

            case 'entity':
                const entityData = this.mapEditor.currentMapData.entities[metadata.entityIndex];
                if (entityData) {
                    entityData.position.x = mesh.position.x;
                    entityData.position.y = mesh.position.y;
                    entityData.position.z = mesh.position.z;
                    entityData.rotation.x = BABYLON.Tools.ToDegrees(mesh.rotation.x);
                    entityData.rotation.y = BABYLON.Tools.ToDegrees(mesh.rotation.y);
                    entityData.rotation.z = BABYLON.Tools.ToDegrees(mesh.rotation.z);
                }
                break;

            case 'prop':
                const propData = this.mapEditor.currentMapData.props[metadata.propIndex];
                if (propData) {
                    propData.position.x = mesh.position.x;
                    propData.position.y = mesh.position.y;
                    propData.position.z = mesh.position.z;
                    propData.rotation.x = BABYLON.Tools.ToDegrees(mesh.rotation.x);
                    propData.rotation.y = BABYLON.Tools.ToDegrees(mesh.rotation.y);
                    propData.rotation.z = BABYLON.Tools.ToDegrees(mesh.rotation.z);
                }
                break;
        }
    }

    /**
     * Generate unique entity ID
     * @returns {string} Unique entity ID
     */
    generateEntityId() {
        return CommonUtils.generateEntityId();
    }

    /**
     * Generate unique prop ID
     * @returns {string} Unique prop ID
     */
    generatePropId() {
        return CommonUtils.generatePropId();
    }

    /**
     * Generate unique primitive ID
     * @returns {string} Unique primitive ID
     */
    generatePrimitiveId() {
        return CommonUtils.generatePrimitiveId();
    }

    /**
     * Apply material to selected objects
     * @param {string} materialName - Name of material to apply
     */
    applyMaterialToSelected(materialName) {
        if (!this.availableMaterials[materialName]) {
            console.warn(`Material not found: ${materialName}`);
            return;
        }

        if (this.mapEditor.selectedObjects.size === 0) {
            console.warn('No objects selected to apply material to');
            return;
        }

        console.log(`Applying material ${materialName} to ${this.mapEditor.selectedObjects.size} objects`);

        // Save undo state
        this.mapEditor.saveUndoState('Apply Material');

        const materialConfig = this.availableMaterials[materialName];

        this.mapEditor.selectedObjects.forEach(mesh => {
            if (mesh.material) {
                // Update existing material
                mesh.material.diffuseColor = materialConfig.color.clone();
                if (materialConfig.alpha !== undefined) {
                    mesh.material.alpha = materialConfig.alpha;
                }
                
                // If it's a PBR material, set roughness and metallic
                if (mesh.material.roughness !== undefined) {
                    mesh.material.roughness = materialConfig.roughness;
                    mesh.material.metallic = materialConfig.metallic;
                }
            }
        });

        this.mapEditor.markDirty();
    }

    /**
     * Set selected material for new objects
     * @param {string} materialName - Name of material to select
     */
    setSelectedMaterial(materialName) {
        if (this.availableMaterials[materialName]) {
            this.selectedMaterial = materialName;
            console.log(`Selected material: ${materialName}`);
        }
    }

    /**
     * Get available materials
     * @returns {Object} Available materials configuration
     */
    getAvailableMaterials() {
        return this.availableMaterials;
    }

    /**
     * Toggle grid snapping
     */
    toggleGridSnapping() {
        this.snapToGrid = !this.snapToGrid;
        console.log(`Grid snapping: ${this.snapToGrid ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set grid size
     * @param {number} size - Grid size
     */
    setGridSize(size) {
        if (size > 0) {
            this.gridSize = size;
            console.log(`Grid size set to: ${size}`);
        }
    }

    /**
     * Enable scale gizmo
     */
    enableScaleGizmo() {
        if (this.gizmoManager) {
            this.gizmoManager.scaleGizmoEnabled = true;
            console.log('Scale gizmo enabled');
        }
    }

    /**
     * Disable scale gizmo
     */
    disableScaleGizmo() {
        if (this.gizmoManager) {
            this.gizmoManager.scaleGizmoEnabled = false;
            console.log('Scale gizmo disabled');
        }
    }

    /**
     * Set gizmo coordinate system (local or world)
     * @param {boolean} useLocal - Whether to use local coordinate system
     */
    setGizmoCoordinateSystem(useLocal) {
        if (this.gizmoManager) {
            this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = useLocal;
            this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = useLocal;
            console.log(`Gizmo coordinate system: ${useLocal ? 'local' : 'world'}`);
        }
    }

    /**
     * Dispose of editor tools
     */
    dispose() {
        // Dispose gizmo manager
        if (this.gizmoManager) {
            this.gizmoManager.dispose();
            this.gizmoManager = null;
        }

        // Dispose preview mesh
        if (this.previewMesh) {
            if (this.previewMesh.material) {
                this.previewMesh.material.dispose();
            }
            this.previewMesh.dispose();
            this.previewMesh = null;
        }

        console.log('EditorTools disposed');
    }
}