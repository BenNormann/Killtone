# Projectile System Requirements

## Overview

The projectile system consists of two core files: `Projectile.js` and `ProjectileManager.js`. This system handles weapon projectiles in a server-authoritative, client-predicted architecture that works in both online and offline modes.

## Projectile.js Requirements

### Purpose
`Projectile.js` represents individual projectile entities that are fired from weapons. Each projectile is a self-contained object that handles its own movement, collision detection, and lifecycle management.

### Core Functionality

#### Visual Representation
- **Shape**: Horizontal capsule (pill shape) that looks like a bullet or energy projectile
- **Size**: Configurable size, default should be visible but not overwhelming (around 0.3-0.5 units)
- **Material**: Glowing emissive material that stands out visually
- **Color**: Weapon-specific colors (typically bright colors like pink, red, purple)
- **Rendering**: Should render above other game elements and be clearly visible
- **Glow Effect**: Add to scene glow layer for enhanced visual impact

#### Physics & Movement
- **Movement Type**: Simple velocity-based movement (no gravity, no air resistance)
- **Speed**: Derived from weapon configuration, converted to units per second
- **Direction**: Oriented in the direction of travel, maintaining horizontal orientation
- **Collision Detection**: Uses raycast from previous position to current position
- **Lifetime**: Destroyed after maximum time or distance reached

#### State Management
- **Active State**: Track whether projectile is still active and should be updated
- **Position Tracking**: Current position, last position for collision detection
- **Distance Tracking**: Total distance traveled for max distance checking
- **Time Tracking**: Time alive for lifetime checking
- **Owner Information**: Track which player fired the projectile

#### Collision Handling
- **Hit Detection**: Detect collisions with players, environment, and other objects
- **Target Validation**: Skip invalid targets (owner, other projectiles, triggers)
- **Hit Effects**: Create visual effects at collision point
- **Damage Application**: Apply damage to hit targets through game systems
- **Cleanup**: Mark projectile for destruction on valid hit

#### Resource Management
- **Memory Cleanup**: Properly dispose of mesh, material, and other resources
- **Glow Layer Removal**: Remove from scene effects when destroyed
- **State Reset**: Clear all references and state when destroyed

## ProjectileManager.js Requirements

### Purpose
`ProjectileManager.js` is the central coordinator for all projectile-related activities. It manages projectile creation, updates, networking, and cleanup across the entire game.

### Core Functionality

#### Projectile Lifecycle Management
- **Creation**: Create projectiles from fire commands or network data
- **Tracking**: Maintain list of all active projectiles
- **Updates**: Update all projectiles each frame
- **Cleanup**: Remove destroyed or expired projectiles
- **Statistics**: Track total fired, hits, active count, hit rate

#### Network Integration
- **Server Communication**: Send fire commands to server for validation
- **Client Prediction**: Create local projectiles immediately for responsiveness
- **Offline Mode**: Work without network connection using local-only mode
- **Connection Awareness**: Check network status before sending commands
- **Error Handling**: Graceful fallback when network operations fail
- **Broadcasting**: Notify all clients of projectile creation and hits

#### Spawn Position Logic
- **Camera-Based**: Spawn projectiles at camera position (player's view)
- **No Offset**: Projectiles should appear exactly where the player is looking
- **Immediate Visibility**: Projectiles should be visible immediately upon firing
- **Consistent Positioning**: Same spawn logic for all weapon types

#### Speed & Distance Configuration
- **Weapon-Based**: Use weapon-specific speed and distance settings
- **Speed Conversion**: Convert weapon config speeds to appropriate game scale
- **Distance Limits**: Enforce maximum travel distances per weapon
- **Lifetime Calculation**: Calculate appropriate lifetime based on speed and distance

#### Collision System Integration
- **Raycast Manager**: Use game's raycast system for collision detection
- **Frame-Based Detection**: Check collisions each frame using deltaTime
- **Hit Processing**: Handle hits through game's damage and effect systems
- **Target Filtering**: Skip invalid collision targets

#### Performance Management
- **Max Limits**: Enforce maximum number of active projectiles
- **Efficient Updates**: Update all projectiles in single loop
- **Memory Management**: Prevent memory leaks through proper cleanup
- **Debug Mode**: Optional debug logging for development

### Configuration Options
- **Max Projectiles**: Limit total active projectiles (default: 100)
- **Hit Effects**: Enable/disable hit particle effects
- **Collision Layers**: Define which objects can be hit
- **Debug Logging**: Enable detailed logging for development
- **Network Settings**: Connection timeout and retry settings

### Error Handling
- **Network Failures**: Fallback to local mode when network unavailable
- **Invalid Data**: Handle malformed fire commands gracefully
- **Resource Limits**: Skip creation when limits reached
- **Performance Issues**: Force cleanup when performance degrades

## Integration Requirements

### Game Systems Integration
- **Raycast Manager**: For collision detection
- **Particle Manager**: For hit effects and muzzle flashes
- **Network Manager**: For server communication
- **Player Manager**: For damage application
- **Event System**: For game events and callbacks

### Weapon System Integration
- **Weapon Config**: Use weapon-specific projectile settings
- **Fire Commands**: Receive structured fire data from weapons
- **Muzzle Position**: Use weapon muzzle flash positions
- **Weapon Types**: Handle different weapon behaviors (single shot, shotgun, etc.)

### Network Protocol
- **Fire Commands**: Structured data for projectile creation
- **Projectile Data**: Complete projectile state for synchronization
- **Hit Events**: Collision and damage information
- **Error Handling**: Network failure and retry logic

## Performance Requirements

### Frame Rate
- **60 FPS Target**: System should handle 60 FPS without performance issues
- **Smooth Movement**: Projectiles should move smoothly without stuttering
- **Responsive Input**: Immediate projectile creation on fire command

### Memory Usage
- **Efficient Cleanup**: No memory leaks from destroyed projectiles
- **Resource Limits**: Enforce reasonable limits on active projectiles
- **Object Reuse**: Consider object pooling for future optimization

### Network Efficiency
- **Minimal Bandwidth**: Efficient data structures for network transmission
- **Client Prediction**: Reduce perceived latency through local creation
- **Error Recovery**: Graceful handling of network issues

## Visual Requirements

### Projectile Appearance
- **Clear Visibility**: Projectiles must be clearly visible to players
- **Weapon Differentiation**: Different weapons should have distinct projectile appearances
- **Size Appropriateness**: Projectiles should be appropriately sized for the game scale
- **Color Coding**: Use colors to indicate weapon type or damage

### Effect Integration
- **Muzzle Flash**: Coordinate with weapon muzzle flash effects
- **Hit Effects**: Create appropriate effects on collision
- **Trail Effects**: Consider visual trails for fast-moving projectiles
- **Glow Effects**: Use scene glow layers for enhanced visibility

## Future Considerations

### Scalability
- **Object Pooling**: Reuse projectile objects for better performance
- **Spatial Partitioning**: Optimize collision detection for large numbers
- **LOD System**: Reduce detail for distant projectiles
- **Network Optimization**: Compress data and reduce bandwidth

### Advanced Features
- **Physics**: Add gravity, air resistance, ricochet
- **Penetration**: Allow projectiles to pass through certain materials
- **Explosive Rounds**: Area damage and effects
- **Tracer Rounds**: Visible trajectory paths
- **Sound Integration**: Projectile travel and impact sounds 