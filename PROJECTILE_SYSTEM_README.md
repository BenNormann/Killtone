# KILLtONE Projectile System

## Overview

The projectile system consists of two core components:

1. **Projectile.js** - Individual projectile entities with movement, collision detection, and visual effects
2. **ProjectileManager.js** - Central coordinator for all projectile-related activities

## Features

### Projectile Class Features
- **Visual Representation**: Horizontal capsule (pill shape) with glowing emissive materials
- **Weapon-Specific Colors**: Different colors for each weapon type (purple for most, pink for pistol)
- **Trail Effects**: Optional particle trails for enhanced visual impact
- **Physics Movement**: Simple velocity-based movement without gravity
- **Collision Detection**: Raycast-based hit detection using the game's RaycastManager
- **Lifetime Management**: Automatic destruction after max distance or time
- **Hit Effects**: Visual effects on collision (sparks, blood splatter)
- **Damage Application**: Integrates with player damage system

### ProjectileManager Features
- **Projectile Lifecycle**: Creation, tracking, updates, and cleanup
- **Performance Management**: Limits active projectiles and periodic cleanup
- **Statistics Tracking**: Fired count, hits, hit rate, and performance metrics
- **Network Integration**: Server communication for multiplayer (local-only mode for now)
- **Configuration**: Configurable settings for max projectiles, effects, etc.

## Integration

### Game Integration
The projectile system is integrated into the main Game class:

```javascript
// In Game.js
this.projectileManager = new ProjectileManager(this, this.scene);
await this.projectileManager.initialize();
```

### Weapon Integration
Weapons use the projectile system through the WeaponBase class:

```javascript
// In WeaponBase.js
fireProjectile(origin, direction, game) {
    const projectileData = this.createProjectileData(origin, direction, game);
    if (game && game.projectileManager) {
        game.projectileManager.fireProjectile(projectileData);
        return true;
    }
    return false;
}
```

### Network Integration
The system is designed for server-authoritative multiplayer but currently works in local-only mode:

```javascript
// ProjectileManager automatically handles:
// - Local projectile creation for client prediction
// - Server communication when online
// - Fallback to local-only mode when offline
```

## Usage

### Basic Projectile Firing
```javascript
const projectileData = {
    position: camera.position.clone(),
    direction: camera.getForwardRay().direction,
    speed: 800,
    damage: 50,
    maxDistance: 500,
    ownerId: 'local',
    weapon: {
        name: 'Carbine',
        type: 'carbine',
        damage: 50
    },
    showTrail: true
};

const projectileId = game.projectileManager.fireProjectile(projectileData);
```

### Weapon-Specific Configuration
Each weapon type has specific projectile settings defined in WeaponConfig.js:

```javascript
// Example weapon config
[WeaponType.CARBINE]: {
    // ... other weapon properties
    projectile: {
        speed: 800, // m/s
        maxDistance: 500
    }
}
```

### Statistics and Monitoring
```javascript
const stats = game.projectileManager.getStats();
console.log(`Active: ${stats.activeCount}, Fired: ${stats.totalFired}, Hits: ${stats.totalHits}`);
```

## Configuration

### ProjectileManager Configuration
```javascript
game.projectileManager.configure({
    maxProjectiles: 100,
    enableHitEffects: true,
    enableTrails: true,
    debugMode: false,
    networkTimeout: 5000,
    maxRetries: 3
});
```

### Performance Settings
- **Max Projectiles**: Default 100 active projectiles
- **Cleanup Interval**: 5 seconds for old projectile cleanup
- **Max Age**: 10 seconds before forced cleanup

## Visual Effects

### Projectile Appearance
- **Shape**: Horizontal capsule (0.1 height, 0.02 radius)
- **Material**: Glowing emissive material with weapon-specific colors
- **Glow Layer**: Enhanced visibility through scene glow effects

### Trail Effects
- **Particle System**: 50 particles per trail
- **Colors**: Purple to pink gradient
- **Lifetime**: 0.1-0.3 seconds per particle
- **Emission Rate**: 100 particles per second

### Hit Effects
- **Hit Sparks**: Created at collision point
- **Blood Splatter**: Created when hitting players
- **Mesh Flash**: Brief red flash on hit targets

## Collision Detection

### Raycast-Based Detection
- Uses game's RaycastManager for optimized collision detection
- Checks from last position to current position each frame
- Supports mesh-based and physics-based collision detection

### Hit Processing
- Validates hit targets (excludes invalid meshes)
- Applies damage through player damage system
- Creates visual effects at hit location
- Destroys projectile on valid hit

## Network Protocol

### Fire Commands
```javascript
{
    projectileId: "proj_1234567890_1",
    position: { x: 0, y: 2, z: 0 },
    direction: { x: 0, y: 0, z: 1 },
    speed: 800,
    damage: 50,
    maxDistance: 500,
    weapon: { name: "Carbine", type: "carbine", damage: 50 },
    timestamp: 1234567890
}
```

### Hit Events
```javascript
{
    projectileId: "proj_1234567890_1",
    targetId: "player_123",
    position: { x: 0, y: 2, z: 10 },
    normal: { x: 0, y: 1, z: 0 },
    distance: 10,
    damage: 50
}
```

## Testing

### Test File
Use `test_projectile_system.html` to test the projectile system:

1. Open the test file in a web server
2. Click to fire projectiles
3. Use WASD to move, mouse to look around
4. Monitor statistics in the top-left panel

### Debug Mode
Enable debug mode for detailed logging:

```javascript
game.projectileManager.configure({ debugMode: true });
```

## Performance Considerations

### Optimization Features
- **Ray Pooling**: Reuses ray objects for collision detection
- **Object Cleanup**: Automatic disposal of destroyed projectiles
- **Performance Limits**: Configurable limits on active projectiles
- **Efficient Updates**: Single update loop for all projectiles

### Memory Management
- **Resource Disposal**: Proper cleanup of meshes, materials, and effects
- **Glow Layer Management**: Automatic removal from scene effects
- **Reference Clearing**: Nullifies references to prevent memory leaks

## Future Enhancements

### Planned Features
- **Object Pooling**: Reuse projectile objects for better performance
- **Advanced Physics**: Gravity, air resistance, ricochet
- **Penetration System**: Projectiles passing through certain materials
- **Explosive Rounds**: Area damage and effects
- **Tracer Rounds**: Visible trajectory paths
- **Sound Integration**: Projectile travel and impact sounds

### Network Improvements
- **Server Validation**: Full server-authoritative projectile validation
- **Interpolation**: Smooth projectile movement in multiplayer
- **Prediction**: Client-side prediction with server reconciliation
- **Bandwidth Optimization**: Compressed projectile data transmission

## Troubleshooting

### Common Issues
1. **Projectiles not visible**: Check if glow layer is created
2. **No collision detection**: Verify RaycastManager is initialized
3. **Performance issues**: Reduce maxProjectiles or enable cleanup
4. **Memory leaks**: Ensure proper disposal in dispose() methods

### Debug Information
Enable debug mode and check console for:
- Projectile creation/destruction logs
- Collision detection results
- Performance statistics
- Network communication status 