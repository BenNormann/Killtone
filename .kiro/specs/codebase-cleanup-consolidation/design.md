# Design Document

## Overview

This design outlines a phased, directory-by-directory cleanup strategy for the KILLtONE game framework. The goal is to make JavaScript files use each other more effectively, reducing length and complexity while eliminating the current 7.8% method duplication rate. Each phase focuses on one directory, ensuring systematic consolidation of duplicate functionality.

## Project Directory and File Structure

Based on the method catalog analysis, the current structure is:

```
src/
├── Game.js (38 methods) - Main orchestrator
├── audio/
│   ├── AudioAdapter.js (31 methods) - Event handling and state management
│   └── AudioManager.js (33 methods) - Core audio functionality
├── effects/
│   ├── BloodEffects.js (17 methods) - Blood particle effects
│   ├── FlowstateAdapter.js (22 methods) - Flowstate event integration
│   ├── FlowstateEffects.js (31 methods) - Flowstate visual effects
│   ├── MuzzleFlash.js (19 methods) - Muzzle flash effects
│   └── ParticleManager.js (22 methods) - General particle system
├── engine/
│   ├── AssetManager.js (20 methods) - Asset loading and management
│   ├── InputManager.js (34 methods) - Input handling
│   ├── MapManager.js (27 methods) - Map loading and management
│   ├── NetworkManager.js (47 methods) - **LARGEST FILE** - Networking
│   ├── StateManager.js (31 methods) - Game state management
│   └── UIManager.js (32 methods) - UI management
├── entities/
│   ├── Player.js (27 methods) - Local player logic
│   ├── Projectile.js (32 methods) - **LARGE FILE** - Projectile system
│   └── RemotePlayer.js (19 methods) - Remote player representation
├── entities/weapons/
│   ├── AccuracySystem.js (18 methods) - Weapon accuracy calculations
│   ├── AmmoRegistry.js (18 methods) - Ammunition management
│   ├── AmmoUI.js (22 methods) - Ammunition UI display
│   ├── Carbine.js (17 methods) - Carbine weapon implementation
│   ├── Pistol.js (17 methods) - Pistol weapon implementation
│   ├── WeaponBase.js (27 methods) - Base weapon class
│   └── WeaponEffects.js (20 methods) - Weapon visual effects
├── hud/
│   └── PerformanceMonitor.js (23 methods) - Performance tracking
├── mapEditing/
│   ├── EditorTools.js (40 methods) - **LARGE FILE** - Editor tools
│   └── MapEditor.js (49 methods) - **LARGEST FILE** - Map editor
├── physics/
│   ├── PhysicsManager.js (19 methods) - Physics simulation
│   └── RaycastManager.js (19 methods) - Raycast operations
└── utils/
    └── EventEmitter.js (8 methods) - Event system

assets/
├── AssetLoader.js (6 methods) - **DUPLICATE** of engine/AssetManager
└── AssetManager.js (6 methods) - **DUPLICATE** of engine/AssetManager
```

**Key Issues Identified:**
- 60 duplicate method names across 32 files
- 7 files with >25 methods (NetworkManager: 47, MapEditor: 49, EditorTools: 40)
- Duplicate functionality in assets/ vs src/engine/
- Common patterns (initialize, update, dispose) repeated 18-30 times each

## Architecture

### Phase-Based Cleanup Strategy

Each phase follows this pattern:
1. **Re-read method_catalog.json** before any file edits
2. Identify duplicate methods within the directory
3. Consolidate functionality into the most appropriate file
4. Update imports and references
5. Verify functionality preservation
6. Update method catalog

## Components and Interfaces

### Phase 1: Assets Directory Cleanup
**Target**: Eliminate duplicate AssetLoader/AssetManager in assets/

**Current Duplicates:**
- `loadModel` (4 occurrences)
- `loadAssets` (3 occurrences) 
- `getAsset` (3 occurrences)
- `cloneModel` (3 occurrences)

**Strategy:**
- Re-read method_catalog.json before each file edit
- Remove assets/AssetLoader.js and assets/AssetManager.js
- Ensure all functionality is in src/engine/AssetManager.js
- Update any imports pointing to assets/ directory

### Phase 2: Audio Directory Cleanup
**Target**: Merge AudioAdapter into AudioManager for unified audio system

**Current Duplicates:**
- Event handling methods scattered between files
- Settings management duplicated
- State change handling in both files

**Strategy:**
- Re-read method_catalog.json before each file edit
- Move AudioAdapter's event handling into AudioManager
- Consolidate settings management
- Create single audio entry point
- Update Game.js to use consolidated AudioManager

### Phase 3: Effects Directory Cleanup
**Target**: Consolidate duplicate effect creation methods

**Current Duplicates:**
- `createBloodSplatter` (2 occurrences)
- `createMuzzleFlash` (5 occurrences)
- `setSettings` (2 occurrences)
- `getStats` (3 occurrences)

**Strategy:**
- Re-read method_catalog.json before each file edit
- Move common effect creation to ParticleManager
- Consolidate settings and stats methods
- Make other effect classes use ParticleManager methods
- Reduce FlowstateEffects.js size by using shared methods

### Phase 4: Engine Directory Cleanup
**Target**: Split NetworkManager and standardize manager patterns

**Current Issues:**
- NetworkManager.js has 47 methods (too large)
- Duplicate initialization patterns across managers
- Duplicate event handling methods

**Strategy:**
- Re-read method_catalog.json before each file edit
- Split NetworkManager into NetworkManager + NetworkEvents + NetworkState
- Create BaseManager class for common patterns (initialize, update, dispose)
- Migrate all managers to extend BaseManager
- Consolidate duplicate manager methods

### Phase 5: Entities Directory Cleanup
**Target**: Eliminate duplicate player and projectile methods

**Current Duplicates:**
- `getPosition` (2 occurrences)
- `isPlayerAlive` (2 occurrences)
- `updateUI` (2 occurrences)
- `performRaycast` (2 occurrences)

**Strategy:**
- Re-read method_catalog.json before each file edit
- Create shared PlayerUtils for common player methods
- Consolidate projectile handling in Projectile.js
- Make RemotePlayer use Player methods where possible
- Split Projectile.js if still too large after consolidation

### Phase 6: Weapons Directory Cleanup
**Target**: Strengthen WeaponBase inheritance and eliminate duplicates

**Current Duplicates:**
- `reload` (4 occurrences)
- `fire` (3 occurrences)
- `playReloadSound` (3 occurrences)
- `getCurrentAccuracy` (2 occurrences)
- `setVisible` (4 occurrences)

**Strategy:**
- Re-read method_catalog.json before each file edit
- Move all common weapon methods to WeaponBase
- Make Carbine and Pistol extend WeaponBase properly
- Consolidate ammunition methods in AmmoRegistry
- Merge WeaponEffects common methods into WeaponBase

### Phase 7: Map Editing Directory Cleanup
**Target**: Split MapEditor.js (49 methods) into focused modules

**Strategy:**
- Re-read method_catalog.json before each file edit
- Split MapEditor.js into:
  - MapEditor.js (core editor logic)
  - MapEditorUI.js (UI management)
  - MapEditorEvents.js (event handling)
- Consolidate duplicate methods between MapEditor and EditorTools
- Ensure EditorTools.js stays under 25 methods

### Phase 8: Physics Directory Cleanup
**Target**: Consolidate duplicate performance metrics

**Current Duplicates:**
- `updatePerformanceMetrics` (2 occurrences)
- `getPerformanceMetrics` (2 occurrences)

**Strategy:**
- Re-read method_catalog.json before each file edit
- Create shared PhysicsUtils for common methods
- Consolidate performance tracking
- Make both managers use shared utilities

### Phase 9: Utils Directory Enhancement
**Target**: Create shared utilities for remaining duplicates

**Strategy:**
- Re-read method_catalog.json before each file edit
- Create CommonUtils.js for frequently duplicated methods
- Create MathUtils.js for mathematical operations
- Update all files to use shared utilities
- Ensure EventEmitter is used consistently across codebase

### Phase 10: Final Integration and Game.js Cleanup
**Target**: Update Game.js to use consolidated systems

**Strategy:**
- Re-read method_catalog.json before each file edit
- Update Game.js imports to use consolidated systems
- Remove duplicate initialization methods
- Ensure all manager references point to consolidated versions
- Verify entire system works with consolidated architecture

## Data Models

### Consolidation Tracking
```javascript
const ConsolidationMetrics = {
    beforeCleanup: {
        totalFiles: 32,
        totalMethods: 772,
        duplicateMethodNames: 60,
        duplicationRate: 7.8
    },
    afterCleanup: {
        targetDuplicationRate: 3.0, // <50% reduction
        targetLargeFiles: 0, // No files >25 methods
        expectedMethodReduction: 150 // ~20% method reduction
    }
};
```

### File Size Targets
```javascript
const FileSizeTargets = {
    maxMethodsPerFile: 25,
    currentLargeFiles: [
        'MapEditor.js: 49 methods',
        'NetworkManager.js: 47 methods', 
        'EditorTools.js: 40 methods',
        'Game.js: 38 methods',
        'InputManager.js: 34 methods',
        'AudioManager.js: 33 methods',
        'Projectile.js: 32 methods'
    ]
};
```

## Error Handling

Each phase includes:
- Method catalog verification before file edits
- Functionality preservation testing
- Import/export validation
- Rollback capability if issues arise

## Testing Strategy

### Per-Phase Testing
1. **Re-read method_catalog.json** before starting phase
2. Document current method count and duplicates
3. Perform consolidation
4. Test affected functionality
5. Regenerate method catalog
6. Verify duplication reduction

### Integration Testing
- Full game functionality test after each phase
- Performance benchmarking
- Memory usage monitoring
- Load testing for consolidated systems

## Success Metrics

### Quantitative Goals
- Reduce duplication rate from 7.8% to <3%
- Eliminate all files with >25 methods
- Reduce total method count by ~20%
- Improve code reuse by consolidating common patterns

### Qualitative Goals
- Cleaner file organization
- Better separation of concerns
- Easier maintenance and debugging
- More consistent code patterns
- Improved developer experience

## Implementation Notes

### Critical Requirements
1. **Always re-read method_catalog.json before each file edit**
2. Preserve all existing functionality
3. Maintain backward compatibility during transition
4. Update imports/exports correctly
5. Test thoroughly after each phase

### Risk Mitigation
- Phase-by-phase approach allows rollback
- Method catalog verification catches issues early
- Comprehensive testing prevents regressions
- Clear documentation of changes made