# Implementation Plan

## Phase 1: Assets Directory Cleanup

- [x] 1. Assets directory duplicate elimination






  - Re-read method_catalog.json to identify current duplicate methods in assets/ vs src/engine/
  - Remove assets/AssetLoader.js and assets/AssetManager.js files completely
  - Verify all functionality exists in src/engine/AssetManager.js
  - Update any imports that reference assets/AssetLoader.js or assets/AssetManager.js
  - Test asset loading functionality to ensure no regressions
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Phase 2: Audio Directory Cleanup

- [x] 2. Audio system consolidation






  - Re-read method_catalog.json to identify duplicate methods between AudioAdapter.js and AudioManager.js
  - Move event handling methods from AudioAdapter.js into AudioManager.js
  - Consolidate settings management into single location within AudioManager.js
  - Update Game.js to use consolidated AudioManager instead of separate AudioAdapter
  - Remove AudioAdapter.js file after successful migration
  - Test all audio functionality including state changes, music, and sound effects
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Phase 3: Effects Directory Cleanup

- [-] 3. Effects system duplicate method removal



  - Re-read method_catalog.json to identify duplicate effect creation methods across effects files
  - Move createBloodSplatter method from BloodEffects.js to ParticleManager.js
  - Consolidate all createMuzzleFlash methods into single implementation in ParticleManager.js
  - Merge setSettings and getStats methods into ParticleManager.js base implementation
  - Update BloodEffects.js, MuzzleFlash.js, and FlowstateEffects.js to use ParticleManager methods
  - Test all visual effects to ensure proper functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Phase 4: Engine Directory Cleanup

- [ ] 4. NetworkManager file splitting
  - Re-read method_catalog.json to analyze NetworkManager.js methods and identify logical groupings
  - Create NetworkEvents.js file for event handling methods
  - Create NetworkState.js file for state management methods
  - Keep core networking logic in NetworkManager.js (target <25 methods)
  - Update imports in Game.js and other files that use NetworkManager
  - Test multiplayer functionality to ensure network operations work correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4.1 BaseManager class creation
  - Re-read method_catalog.json to identify common patterns across all manager files
  - Create src/engine/BaseManager.js with common initialize, update, dispose methods
  - Update AssetManager.js to extend BaseManager and remove duplicate methods
  - Update InputManager.js to extend BaseManager and remove duplicate methods
  - Update MapManager.js to extend BaseManager and remove duplicate methods
  - Update StateManager.js to extend BaseManager and remove duplicate methods
  - Update UIManager.js to extend BaseManager and remove duplicate methods
  - Test all manager functionality to ensure inheritance works correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Phase 5: Entities Directory Cleanup

- [ ] 5. Player and projectile method consolidation
  - Re-read method_catalog.json to identify duplicate methods between Player.js and RemotePlayer.js
  - Create src/entities/PlayerUtils.js for shared player methods (getPosition, isPlayerAlive)
  - Move common player methods from Player.js and RemotePlayer.js to PlayerUtils.js
  - Update Player.js and RemotePlayer.js to use PlayerUtils methods
  - Consolidate updateUI method to eliminate duplication
  - Test local and remote player functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5.1 Projectile system optimization
  - Re-read method_catalog.json to analyze Projectile.js methods for consolidation opportunities
  - Move performRaycast method to src/physics/RaycastManager.js if not already there
  - Consolidate projectile update methods to reduce file size
  - Split Projectile.js into Projectile.js and ProjectileManager.js if still >25 methods
  - Test projectile physics and hit detection
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Phase 6: Weapons Directory Cleanup

- [ ] 6. WeaponBase inheritance strengthening
  - Re-read method_catalog.json to identify all duplicate methods across weapon files
  - Move reload method implementation to WeaponBase.js, remove from Carbine.js and Pistol.js
  - Move fire method template to WeaponBase.js, keep weapon-specific implementations in subclasses
  - Move playReloadSound method to WeaponBase.js, remove duplicates
  - Move getCurrentAccuracy and setVisible methods to WeaponBase.js
  - Update Carbine.js and Pistol.js to properly extend WeaponBase methods
  - Test all weapon functionality including firing, reloading, and accuracy
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6.1 Ammunition system consolidation
  - Re-read method_catalog.json to identify duplicate ammunition methods
  - Consolidate consumeAmmo, getCurrentAmmo, getMaxAmmo methods in AmmoRegistry.js
  - Remove duplicate ammunition methods from WeaponBase.js
  - Update all weapon classes to use AmmoRegistry methods
  - Test ammunition tracking and UI updates
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Phase 7: Map Editing Directory Cleanup

- [ ] 7. MapEditor.js file splitting
  - Re-read method_catalog.json to analyze MapEditor.js methods and group by functionality
  - Create src/mapEditing/MapEditorUI.js for UI-related methods
  - Create src/mapEditing/MapEditorEvents.js for event handling methods
  - Keep core editor logic in MapEditor.js (target <25 methods)
  - Update imports and ensure proper communication between split files
  - Test map editor functionality including UI interactions and event handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 7.1 EditorTools consolidation
  - Re-read method_catalog.json to identify duplicate methods between MapEditor and EditorTools
  - Consolidate duplicate tool methods into EditorTools.js
  - Remove duplicate methods from MapEditor.js
  - Ensure EditorTools.js stays under 25 methods after consolidation
  - Test all editor tools and functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Phase 8: Physics Directory Cleanup

- [ ] 8. Physics performance metrics consolidation
  - Re-read method_catalog.json to identify duplicate performance methods
  - Create src/physics/PhysicsUtils.js for shared performance tracking methods
  - Move updatePerformanceMetrics and getPerformanceMetrics to PhysicsUtils.js
  - Update PhysicsManager.js and RaycastManager.js to use PhysicsUtils methods
  - Test physics performance monitoring and metrics collection
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Phase 9: Utils Directory Enhancement

- [ ] 9. Shared utilities creation
  - Re-read method_catalog.json to identify remaining duplicate methods across all files
  - Create src/utils/CommonUtils.js for frequently duplicated utility methods
  - Create src/utils/MathUtils.js for mathematical operations used across files
  - Move appropriate duplicate methods to utility files
  - Update all files to import and use shared utility methods
  - Test functionality to ensure utility methods work correctly
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 9.1 EventEmitter consistency
  - Re-read method_catalog.json to verify EventEmitter usage across codebase
  - Ensure all files use src/utils/EventEmitter.js consistently
  - Remove any duplicate event handling implementations
  - Test event system functionality across all components
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

## Phase 10: Final Integration and Game.js Cleanup

- [ ] 10. Game.js integration updates
  - Re-read method_catalog.json to verify all consolidation changes
  - Update Game.js imports to use consolidated systems (AudioManager, BaseManager, etc.)
  - Remove duplicate initialization methods from Game.js
  - Update manager references to point to consolidated versions
  - Ensure Game.js uses shared utilities where appropriate
  - Test complete game functionality with all consolidated systems
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 10.1 Final verification and optimization
  - Re-read method_catalog.json to generate final consolidation report
  - Verify duplication rate has been reduced by at least 50%
  - Confirm no files have more than 25 methods
  - Run comprehensive testing of all game features
  - Document all changes made and new file structure
  - Generate updated method catalog to verify success metrics
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_