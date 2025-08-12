import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Game state
const players = new Map();
const gameConfig = {
  maxHealth: 100,
  respawnTime: 3000
};

// Server-side map data for raycast calculations
const serverMapData = {
  objects: [],
  spawnPoints: [],
  loaded: false
};

// Weapon configurations for server-side damage calculation
const weaponConfigs = {
  carbine: { damage: 50, range: 500, fireRate: 0.15 },
  pistol: { damage: 20, range: 300, fireRate: 0.12 },
  shotgun: { damage: 80, range: 200, fireRate: 0.8 },
  smg: { damage: 25, range: 400, fireRate: 0.08 },
  sniper: { damage: 100, range: 1000, fireRate: 1.2 },
  knife: { damage: 75, range: 3, fireRate: 0.5 }
};

const PORT = process.env.PORT || 3000;

// Serve static files from root directory (where index.html is located)
app.use(express.static(join(__dirname, '..')));
// Serve static files from src directory for modular JS
app.use('/src', express.static(join(__dirname, '../src')));
// Serve static files from assets directory
app.use('/assets', express.static(join(__dirname, '../assets')));

// Helper function to generate spawn position
// This will be replaced by client-side map configuration
function getSpawnPosition() {
  // Default spawn position - client will handle map-specific spawns
  return { x: 0, y: 2, z: 0 };
}

/**
 * Load map data for server-side raycast calculations
 */
function loadServerMapData() {
  try {
    const mapPath = join(__dirname, '../assets/maps/default.json');
    const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    serverMapData.objects = mapData.objects || [];
    serverMapData.spawnPoints = mapData.spawnPoints || [];
    serverMapData.loaded = true;
    
    console.log(`Server: Loaded map data with ${serverMapData.objects.length} objects and ${serverMapData.spawnPoints.length} spawn points`);
  } catch (error) {
    console.error('Server: Failed to load map data:', error);
    // Create basic map data as fallback
    serverMapData.objects = [
      { type: 'ground', position: { x: 0, y: 0, z: 0 }, scale: { x: 100, y: 1, z: 100 } }
    ];
    serverMapData.spawnPoints = [{ position: { x: 0, y: 2, z: 0 } }];
    serverMapData.loaded = true;
  }
}

/**
 * Server-side raycast calculation
 * @param {Object} origin - Starting position {x, y, z}
 * @param {Object} direction - Direction vector {x, y, z}
 * @param {number} maxDistance - Maximum raycast distance
 * @returns {Object|null} Hit information or null if no hit
 */
function serverRaycast(origin, direction, maxDistance) {
  if (!serverMapData.loaded) {
    console.warn('Server: Map data not loaded, cannot perform raycast');
    return null;
  }
  
  // Normalize direction vector
  const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
  const normalizedDir = {
    x: direction.x / dirLength,
    y: direction.y / dirLength,
    z: direction.z / dirLength
  };
  
  let closestHit = null;
  let closestDistance = maxDistance;
  
  // Check collision with map objects
  for (const obj of serverMapData.objects) {
    const hit = checkObjectCollision(origin, normalizedDir, obj, maxDistance);
    if (hit && hit.distance < closestDistance) {
      closestHit = hit;
      closestDistance = hit.distance;
    }
  }
  
  // Check collision with other players
  for (const [playerId, player] of players) {
    if (player.alive) {
      const hit = checkPlayerCollision(origin, normalizedDir, player, maxDistance);
      if (hit && hit.distance < closestDistance) {
        closestHit = hit;
        closestDistance = hit.distance;
      }
    }
  }
  
  return closestHit;
}

/**
 * Check collision with a map object
 */
function checkObjectCollision(origin, direction, obj, maxDistance) {
  // Simple bounding box collision for now
  // This can be enhanced with more sophisticated collision detection
  
  const objPos = obj.position;
  const objScale = obj.scale || { x: 1, y: 1, z: 1 };
  
  // Calculate bounding box
  const halfSize = {
    x: objScale.x / 2,
    y: objScale.y / 2,
    z: objScale.z / 2
  };
  
  const min = {
    x: objPos.x - halfSize.x,
    y: objPos.y - halfSize.y,
    z: objPos.z - halfSize.z
  };
  
  const max = {
    x: objPos.x + halfSize.x,
    y: objPos.y + halfSize.y,
    z: objPos.z + halfSize.z
  };
  
  // Ray-box intersection
  const t1 = (min.x - origin.x) / direction.x;
  const t2 = (max.x - origin.x) / direction.x;
  const t3 = (min.y - origin.y) / direction.y;
  const t4 = (max.y - origin.y) / direction.y;
  const t5 = (min.z - origin.z) / direction.z;
  const t6 = (max.z - origin.z) / direction.z;
  
  const tmin = Math.max(
    Math.min(t1, t2),
    Math.min(t3, t4),
    Math.min(t5, t6)
  );
  
  const tmax = Math.min(
    Math.max(t1, t2),
    Math.max(t3, t4),
    Math.max(t5, t6)
  );
  
  if (tmax >= 0 && tmin <= tmax && tmin <= maxDistance) {
    const hitPoint = {
      x: origin.x + direction.x * tmin,
      y: origin.y + direction.y * tmin,
      z: origin.z + direction.z * tmin
    };
    
    return {
      point: hitPoint,
      distance: tmin,
      object: obj,
      type: 'map'
    };
  }
  
  return null;
}

/**
 * Check collision with a player
 */
function checkPlayerCollision(origin, direction, player, maxDistance) {
  // Simple sphere collision for players
  const playerRadius = 1.0; // Player collision radius
  const playerPos = player.position;
  
  // Vector from origin to player center
  const toPlayer = {
    x: playerPos.x - origin.x,
    y: playerPos.y - origin.y,
    z: playerPos.z - origin.z
  };
  
  // Project toPlayer onto direction
  const projection = toPlayer.x * direction.x + toPlayer.y * direction.y + toPlayer.z * direction.z;
  
  // Closest point on ray to player center
  const closestPoint = {
    x: origin.x + direction.x * projection,
    y: origin.y + direction.y * projection,
    z: origin.z + direction.z * projection
  };
  
  // Distance from closest point to player center
  const distanceToPlayer = Math.sqrt(
    Math.pow(closestPoint.x - playerPos.x, 2) +
    Math.pow(closestPoint.y - playerPos.y, 2) +
    Math.pow(closestPoint.z - playerPos.z, 2)
  );
  
  if (distanceToPlayer <= playerRadius && projection >= 0 && projection <= maxDistance) {
    return {
      point: closestPoint,
      distance: projection,
      player: player,
      type: 'player'
    };
  }
  
  return null;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Initialize new player
  const spawnPos = getSpawnPosition();
  const newPlayer = {
    id: socket.id,
    position: spawnPos,
    rotation: { x: 0, y: 0, z: 0 },
    health: gameConfig.maxHealth,
    alive: true,
    score: 0, // Initialize kill score
    deaths: 0, // Initialize death count
    username: `Player ${socket.id.slice(-4)}`, // Default username
    movement: "standing", // Default movement state
    lastUpdate: Date.now()
  };
  
  players.set(socket.id, newPlayer);
  
  // Send initial game state to new player
  socket.emit('playerJoined', {
    playerId: socket.id,
    player: newPlayer,
    allPlayers: Array.from(players.values())
  });
  
  // Notify other players about new player
  socket.broadcast.emit('playerConnected', newPlayer);
  
  // Handle player movement updates
  socket.on('playerUpdate', (data) => {
    const player = players.get(socket.id);
    if (player && player.alive) {
      // Update player data
      player.position = data.position;
      player.rotation = data.rotation;
      player.movement = data.movement || "standing";
      player.lastUpdate = Date.now();
      
      // Update health if provided
      if (data.health !== undefined) {
        const healthChanged = player.health !== data.health;
        player.health = data.health;
        player.alive = data.alive !== undefined ? data.alive : player.health > 0;
        
        // Broadcast health update if it changed
        if (healthChanged) {
          socket.broadcast.emit('playerHealthUpdated', {
            playerId: socket.id,
            health: player.health,
            alive: player.alive
          });
        }
      }
      
      // Broadcast movement to other players
      const broadcastData = {
        playerId: socket.id,
        position: data.position,
        rotation: data.rotation,
        movement: player.movement
      };
      socket.broadcast.emit('playerMoved', broadcastData);
    }
  });

  // Handle weapon attacks with server-side raycast
  socket.on('weaponAttack', (data) => {
    const shooter = players.get(socket.id);
    if (!shooter || !shooter.alive) {
      return; // Invalid shooter
    }

    const { origin, direction, weaponType } = data;
    const weaponConfig = weaponConfigs[weaponType] || weaponConfigs.carbine;
    
    console.log(`Server: Player ${socket.id} fired ${weaponType} from ${JSON.stringify(origin)} in direction ${JSON.stringify(direction)}`);
    
    // Perform server-side raycast
    const hitResult = serverRaycast(origin, direction, weaponConfig.range);
    
    if (hitResult) {
      console.log(`Server: Hit detected at distance ${hitResult.distance} - Type: ${hitResult.type}`);
      
      if (hitResult.type === 'player') {
        // Player hit - calculate damage
        const targetPlayer = hitResult.player;
        const targetPlayerId = Array.from(players.entries()).find(([id, player]) => player === targetPlayer)?.[0];
        
        if (targetPlayerId && targetPlayerId !== socket.id) {
          // Apply damage to target player
          const damage = weaponConfig.damage;
          targetPlayer.health -= damage;
          
          console.log(`Server: Player ${targetPlayerId} hit for ${damage} damage (${targetPlayer.health} HP remaining)`);
          
          if (targetPlayer.health <= 0) {
            // Player killed
            targetPlayer.health = 0;
            targetPlayer.alive = false;
            
            // Update scores
            shooter.score = (shooter.score || 0) + 1;
            targetPlayer.deaths = (targetPlayer.deaths || 0) + 1;
            
            // Notify all players about the kill
            io.emit('playerKilled', {
              killerId: socket.id,
              victimId: targetPlayerId,
              killerScore: shooter.score,
              victimDeaths: targetPlayer.deaths,
              weaponType: weaponType,
              hitPosition: hitResult.point
            });
            
            console.log(`Server: Player ${targetPlayerId} killed by ${socket.id} with ${weaponType}`);
            
            // Schedule respawn
            setTimeout(() => {
              respawnPlayer(targetPlayerId);
            }, gameConfig.respawnTime);
          } else {
            // Player damaged but not killed
            io.to(targetPlayerId).emit('playerDamaged', {
              damage: damage,
              health: targetPlayer.health,
              shooterId: socket.id,
              weaponType: weaponType,
              hitPosition: hitResult.point
            });
            
            // Broadcast health update to all other players
            socket.broadcast.emit('playerHealthUpdated', {
              playerId: targetPlayerId,
              health: targetPlayer.health,
              damage: damage,
              shooterId: socket.id,
              weaponType: weaponType
            });
          }
        }
      }
      
      // Broadcast hit result to all players for visual effects
      io.emit('weaponHit', {
        shooterId: socket.id,
        weaponType: weaponType,
        hitPosition: hitResult.point,
        hitType: hitResult.type,
        hitObject: hitResult.object || hitResult.player,
        distance: hitResult.distance
      });
      
    } else {
      console.log(`Server: No hit detected for ${socket.id}'s ${weaponType} shot`);
      
      // Broadcast miss to all players for visual effects
      io.emit('weaponMiss', {
        shooterId: socket.id,
        weaponType: weaponType,
        origin: origin,
        direction: direction,
        maxDistance: weaponConfig.range
      });
    }
    
    // Broadcast weapon fire to all other players for visual/audio effects
    socket.broadcast.emit('playerShot', {
      playerId: socket.id,
      origin: origin,
      direction: direction,
      weaponType: weaponType
    });
  });
  
  // Handle respawn request
  socket.on('requestRespawn', () => {
    const player = players.get(socket.id);
    if (player && !player.alive) {
      respawnPlayer(socket.id);
    }
  });
  
  // Handle username updates
  socket.on('usernameUpdate', (data) => {
    const player = players.get(socket.id);
    if (player && data.username) {
      const sanitizedUsername = data.username.trim().substring(0, 20); // Limit length and trim
      const oldUsername = player.username;
      player.username = sanitizedUsername;
      
      console.log(`Player ${socket.id} updated username from "${oldUsername}" to: ${sanitizedUsername}`);
      
      // If this is the first real username (not the default), notify all players about the new player with correct name
      if (oldUsername.startsWith('Player ') && !sanitizedUsername.startsWith('Player ')) {
        console.log(`Player ${socket.id} set their first real username, re-broadcasting playerConnected with correct name`);
        socket.broadcast.emit('playerConnected', {
          ...player,
          username: sanitizedUsername
        });
      } else {
        // Regular username update
        socket.broadcast.emit('playerUsernameUpdated', {
          playerId: socket.id,
          username: sanitizedUsername
        });
      }
      
      // Also send back to the sender to confirm
      socket.emit('playerUsernameUpdated', {
        playerId: socket.id,
        username: sanitizedUsername
      });
    }
  });
  
  // Bot networking relay
  socket.on('botUpdate', (data) => {
    // Relay bot position updates to all other clients
    socket.broadcast.emit('botUpdate', data);
  });
  
  socket.on('botSpawned', (data) => {
    // Relay bot spawn notification to all other clients
    socket.broadcast.emit('botSpawned', data);
  });
  
  socket.on('botRemoved', (data) => {
    // Relay bot removal notification to all other clients
    socket.broadcast.emit('botRemoved', data);
  });
  
  socket.on('botKilled', (data) => {
    // Relay bot kill notification to all other clients
    console.log('Bot killed:', data.botId, 'by player:', data.killerId);
    socket.broadcast.emit('botKilled', data);
  });


  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    socket.broadcast.emit('playerDisconnected', socket.id);
  });
});


// Respawn player
function respawnPlayer(playerId) {
  const player = players.get(playerId);
  if (player) {
    player.position = getSpawnPosition();
    player.health = gameConfig.maxHealth;
    player.alive = true;
    player.movement = "standing"; // Reset movement state on respawn
    
    // Notify all players about respawn
    io.emit('playerRespawned', {
      playerId: playerId,
      player: player
    });
  }
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`KillTone FPS Server running on port ${PORT}`);
  console.log(`Connect from other devices on your network using your local IP:${PORT}`);
  
  // Load map data for server-side raycast calculations
  loadServerMapData();
  
  // Try to display local IP addresses
  const interfaces = os.networkInterfaces();
  console.log('\nLocal IP addresses:');
  Object.keys(interfaces).forEach(interfaceName => {
    interfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  ${interfaceName}: ${iface.address}:${PORT}`);
      }
    });
  });
}); 