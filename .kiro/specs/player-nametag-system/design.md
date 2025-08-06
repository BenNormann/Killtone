# Design Document

## Overview

The player nametag system will be implemented as a lightweight addition to the existing game architecture. It will integrate with the current Player class, RemotePlayer class, UIManager, and server networking without creating duplicate functionality. The system will use existing rendering methods and network protocols to minimize code bloat.

## Architecture

### Core Components

1. **NameGenerator** - Utility class for generating random player names
2. **Player Class Extension** - Add name property and methods to existing Player class
3. **RemotePlayer Enhancement** - Extend existing nametag rendering in RemotePlayer
4. **UIManager Extension** - Add nametag input field to existing main menu
5. **Server Integration** - Extend existing player data structure and networking
6. **Leaderboard Update** - Enhance existing leaderboard with proper player data

### Data Flow

```
Player joins → NameGenerator assigns random name → Player class stores name → 
Server receives name → Broadcasts to all clients → RemotePlayer displays nametag → 
Leaderboard shows name with stats
```

## Components and Interfaces

### NameGenerator Class

```javascript
class NameGenerator {
    static generateRandomName()
    static isNameAvailable(name, usedNames)
    static getRandomNameParts()
}
```

**Purpose**: Generate unique random names like "ShadowKiller", "DeathStrike", etc.
**Integration**: New utility class, minimal footprint

### Player Class Extension

```javascript
// Add to existing Player class
class Player {
    // Existing properties...
    name: string
    
    // New methods
    setName(name)
    getName()
    validateName(name)
}
```

**Purpose**: Store and manage player's name
**Integration**: Extends existing Player class without breaking current functionality

### RemotePlayer Enhancement

```javascript
// Extend existing RemotePlayer class
class RemotePlayer {
    // Existing properties...
    
    // Enhanced methods
    createNameTag() // Use existing BABYLON.GUI methods
    updateNameTag() // Use existing update patterns
    positionNameTag() // Use existing positioning logic
}
```

**Purpose**: Display nametags above remote players
**Integration**: Uses existing nameTag property and rendering methods

### UIManager Extension

```javascript
// Add to existing UIManager showMainMenu method
showMainMenu() {
    // Existing menu creation...
    
    // Add nametag input between killtone and PLAY button
    const nametagInput = this._createNametagInput();
    // Position using existing layout methods
}
```

**Purpose**: Allow players to view/edit their nametag
**Integration**: Uses existing UI creation methods and styling

### Server Integration

```javascript
// Extend existing player data structure
const newPlayer = {
    // Existing properties...
    name: string, // Add name field
    // Existing properties...
};

// Extend existing socket handlers
socket.on('nameUpdate', (data) => {
    // Validate and broadcast name change
});
```

**Purpose**: Synchronize names across all clients
**Integration**: Uses existing player data structure and socket event patterns

## Data Models

### Player Data Structure (Enhanced)

```javascript
{
    id: string,
    position: {x, y, z},
    rotation: {x, y, z},
    health: number,
    alive: boolean,
    score: number,
    deaths: number,
    name: string,        // NEW: Player's display name
    movement: string,
    lastUpdate: number
}
```

### Name Generation Data

```javascript
const NAME_PARTS = {
    prefixes: ["Shadow", "Death", "Dark", "Blood", "Steel", "Fire", "Ice", "Storm"],
    suffixes: ["Killer", "Strike", "Blade", "Wolf", "Hawk", "Viper", "Reaper", "Hunter"]
};
```

## Error Handling

### Name Validation
- Length validation (1-20 characters)
- Character validation (alphanumeric + basic symbols)
- Uniqueness validation (no duplicate names)
- Fallback to generated name if validation fails

### Network Failures
- Retry name synchronization on failure
- Use existing error handling patterns from server.js
- Graceful degradation if nametag rendering fails

### UI Failures
- Continue game functionality if nametag input fails
- Use existing UI error handling patterns
- Fallback to default names if generation fails

## Testing Strategy

### Unit Tests
- NameGenerator functionality
- Name validation logic
- Player class name methods

### Integration Tests
- Name synchronization across clients
- Leaderboard updates with names
- UI integration with existing menu

### Manual Testing
- Multiple players with different names
- Name changes during gameplay
- Leaderboard accuracy with kills/deaths
- Performance with many players

## Implementation Notes

### Existing Method Reuse
- Use existing `PlayerUtils.getDisplayName()` method
- Leverage existing `RemotePlayer.nameTag` property
- Utilize existing `UIManager._createCleanMenuButton()` patterns
- Extend existing `socket.on('playerUpdate')` handler

### Performance Considerations
- Minimal additional network traffic (name sent once on join/change)
- Reuse existing nametag rendering in RemotePlayer
- No additional render loops or managers needed

### Integration Points
- Player class constructor: Initialize with generated name
- UIManager.showMainMenu(): Add nametag input field
- RemotePlayer.createNameTag(): Use player.name instead of generic text
- Server player initialization: Include name in player data
- Leaderboard rendering: Display player.name instead of placeholder

This design ensures minimal code bloat while providing full nametag functionality by leveraging existing systems and patterns throughout the codebase.