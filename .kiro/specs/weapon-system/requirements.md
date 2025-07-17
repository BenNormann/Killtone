# Weapon System Requirements

## Introduction

The weapon system provides players with a variety of firearms and melee weapons for combat in the KILLtONE game framework. The system includes six distinct weapons with unique characteristics, animations, and gameplay mechanics. Players can select a primary weapon in the main menu, while pistol and knife are always available as secondary and tertiary weapons respectively.

## Requirements

### Requirement 1: Weapon Selection and Management

**User Story:** As a player, I want to select my primary weapon in the main menu and have access to pistol and knife as backup weapons, so that I can customize my loadout while maintaining consistent secondary options.

#### Acceptance Criteria

1. WHEN the player accesses the main menu THEN the system SHALL display weapon selection interface for primary weapons (carbine, shotgun, SMG, sniper)
2. WHEN the player selects a primary weapon THEN the system SHALL save this selection for the game session
3. WHEN the player spawns THEN the system SHALL equip the selected primary weapon, pistol as secondary, and knife as tertiary
4. WHEN the player presses weapon switch keys THEN the system SHALL cycle between available weapons in order (primary → pistol → knife → primary)

### Requirement 2: Weapon Characteristics and Damage

**User Story:** As a player, I want each weapon to have distinct damage, fire rate, and magazine capacity characteristics, so that I can choose weapons that match my playstyle and tactical needs.

#### Acceptance Criteria

1. WHEN using the carbine THEN the system SHALL apply 50 damage per shot with semi-automatic fire and 12 rounds per magazine
2. WHEN using the pistol THEN the system SHALL apply 20 damage per shot with semi-automatic fire and 14 rounds per magazine
3. WHEN using the shotgun THEN the system SHALL fire 10 projectiles per shot with spread pattern, 4 shots per magazine, and 10 damage per pellet
4. WHEN using the SMG THEN the system SHALL apply 25 damage per shot with full-automatic fire and 23 rounds per magazine
5. WHEN using the sniper THEN the system SHALL apply 100 damage per shot with slower semi-automatic fire and 5 rounds per magazine
6. WHEN using the knife THEN the system SHALL apply 50 damage with infinite usage and close-range detection

### Requirement 3: Ammunition and Reload System

**User Story:** As a player, I want to manage ammunition and reload weapons when magazines are empty, so that I must make tactical decisions about when to reload during combat.

#### Acceptance Criteria

1. WHEN a weapon's magazine is empty THEN the system SHALL prevent firing until reload is completed
2. WHEN the player initiates reload THEN the system SHALL play reload animation and prevent firing for 3 seconds
3. WHEN reload completes THEN the system SHALL restore the weapon's magazine to full capacity
4. WHEN using the knife THEN the system SHALL never require reloading (infinite ammunition)
5. WHEN the player attempts to reload a full magazine THEN the system SHALL ignore the reload command

### Requirement 4: Weapon Animations and Visual Feedback

**User Story:** As a player, I want to see realistic weapon animations and visual feedback, so that the combat feels immersive and responsive.

#### Acceptance Criteria

1. WHEN a weapon is equipped THEN the system SHALL display the weapon model paused at the beginning of its animation sequence
2. WHEN the player reloads THEN the system SHALL play the full reload animation from the GLB file
3. WHEN the knife is idle THEN the system SHALL keep the animation paused at the beginning
4. WHEN the player attacks with the knife THEN the system SHALL play the 4.83-second swing animation
5. WHEN firing any weapon THEN the system SHALL apply visual recoil effects to the weapon model

### Requirement 5: Accuracy and Recoil System

**User Story:** As a player, I want weapon accuracy to be affected by movement and recoil, so that tactical positioning and controlled firing become important gameplay elements.

#### Acceptance Criteria

1. WHEN the player is stationary THEN the system SHALL provide maximum weapon accuracy
2. WHEN the player is moving THEN the system SHALL decrease weapon accuracy based on movement speed
3. WHEN the player fires rapidly THEN the system SHALL accumulate recoil that decreases accuracy
4. WHEN the player stops firing THEN the system SHALL gradually restore accuracy to baseline
5. WHEN using different weapons THEN the system SHALL apply weapon-specific recoil patterns and recovery rates

### Requirement 6: Ammunition Display Interface

**User Story:** As a player, I want to see my current ammunition count and magazine capacity on screen, so that I can make informed decisions about reloading and ammunition management.

#### Acceptance Criteria

1. WHEN any weapon is equipped THEN the system SHALL display current rounds in magazine and total magazine capacity
2. WHEN ammunition count changes THEN the system SHALL update the display in real-time
3. WHEN the magazine is empty THEN the system SHALL highlight the ammunition display to indicate reload needed
4. WHEN using the knife THEN the system SHALL display "∞" or hide ammunition counter since it has infinite usage
5. WHEN switching weapons THEN the system SHALL immediately update the ammunition display for the new weapon

### Requirement 7: Projectile and Hit Detection

**User Story:** As a player, I want accurate hit detection and projectile behavior for all weapons, so that combat feels fair and responsive.

#### Acceptance Criteria

1. WHEN firing projectile weapons THEN the system SHALL use raycast-based hit detection for instant bullet travel
2. WHEN using the shotgun THEN the system SHALL fire multiple raycasts with spread pattern to simulate pellets
3. WHEN using the knife THEN the system SHALL detect hits in a cone area in front of the player within melee range
4. WHEN projectiles hit targets THEN the system SHALL apply appropriate damage and visual effects
5. WHEN projectiles hit environment THEN the system SHALL create impact effects without damage

### Requirement 8: Audio and Effects Integration

**User Story:** As a player, I want appropriate sound effects and visual effects for weapon actions, so that combat feels impactful and immersive.

#### Acceptance Criteria

1. WHEN firing any weapon THEN the system SHALL play appropriate gunshot sound effects
2. WHEN reloading any weapon THEN the system SHALL play reload sound effects
3. WHEN using the knife THEN the system SHALL play swing and impact sound effects
4. WHEN projectiles impact THEN the system SHALL create impact particle effects at hit locations
5. WHEN weapons are switched THEN the system SHALL play weapon switching sound effects

### Requirement 9: Muzzle Flash and Visual Effects

**User Story:** As a player, I want distinctive muzzle flashes and weapon effects that match the game's aesthetic, so that weapons feel powerful and visually appealing.

#### Acceptance Criteria

1. WHEN firing full-automatic weapons (SMG) THEN the system SHALL display bright pink-purple spikey muzzle flash effects
2. WHEN firing semi-automatic weapons (carbine, pistol, shotgun, sniper) THEN the system SHALL display bright pink-purple disk/donut muzzle flash effects
3. WHEN any weapon fires THEN the system SHALL attach muzzle flash effects to the weapon model so they move with the gun
4. WHEN the knife swings THEN the system SHALL create purple trail effects that follow the blade's path through the air
5. WHEN muzzle flash effects are created THEN the system SHALL ensure they fade quickly and don't persist between shots