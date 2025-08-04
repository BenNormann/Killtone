import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

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
    console.log(`Server: Received playerUpdate from ${socket.id}:`, data);
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
      console.log(`Server: Broadcasting playerMoved:`, broadcastData);
      socket.broadcast.emit('playerMoved', broadcastData);
    }
  });
  
  // Handle shooting
  socket.on('playerShoot', (data) => {
    const shooter = players.get(socket.id);
    if (shooter && shooter.alive) {
      // Broadcast shot to all other players to create their own projectiles
      socket.broadcast.emit('playerShot', {
        playerId: socket.id,
        origin: data.origin,
        direction: data.direction,
        weaponType: data.weaponType || 'bulldog' // Forward weapon type with fallback
      });
    }
  });
  
  // Handle bullet hits (projectile-based)
  socket.on('bulletHit', (data) => {
    const { bulletId, targetPlayerId, damage, shooterId } = data;
    
    const shooter = players.get(shooterId);
    const target = players.get(targetPlayerId);
    
    if (!shooter || !target || !target.alive) {
      return; // Invalid hit
    }
    
    // Prevent self-damage
    if (shooterId === targetPlayerId) {
      return;
    }
    
    console.log(`Bullet ${bulletId} hit player ${targetPlayerId} for ${damage} damage`);
    
    // Apply damage
    target.health -= damage;
    
    if (target.health <= 0) {
      target.health = 0;
      target.alive = false;
      
      // Increment killer's score and victim's deaths
      shooter.score = (shooter.score || 0) + 1;
      target.deaths = (target.deaths || 0) + 1;
      
      // Notify all players about the kill
      io.emit('playerKilled', {
        killerId: shooterId,
        victimId: targetPlayerId,
        killerScore: shooter.score,
        victimDeaths: target.deaths
      });
      
      console.log(`Player ${targetPlayerId} killed by ${shooterId}. Killer score: ${shooter.score}, Victim deaths: ${target.deaths}`);
      
      // Schedule respawn
      setTimeout(() => {
        respawnPlayer(targetPlayerId);
      }, gameConfig.respawnTime);
    } else {
      // Notify target about damage (for their own UI)
      io.to(targetPlayerId).emit('playerDamaged', {
        damage: damage,
        health: target.health,
        shooterId: shooterId
      });
      
      // CRITICAL FIX: Broadcast health update to ALL OTHER players so they can see the damage
      socket.broadcast.emit('playerHealthUpdated', {
        playerId: targetPlayerId,
        health: target.health,
        damage: damage,
        shooterId: shooterId
      });
      
      console.log(`Player ${targetPlayerId} took ${damage} damage (${target.health} HP remaining)`);
    }
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
      player.username = sanitizedUsername;
      
      console.log(`Player ${socket.id} updated username to: ${sanitizedUsername}`);
      
      // Broadcast the username update to all other players
      socket.broadcast.emit('playerUsernameUpdated', {
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

// Note: Hit detection is now handled client-side through projectile collision
// The server validates hits when clients report bulletHit events

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
  console.log(`Kronkar FPS Server running on port ${PORT}`);
  console.log(`Connect from other devices on your network using your local IP:${PORT}`);
  
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