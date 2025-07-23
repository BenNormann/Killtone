# KILLtONE Game Framework

Developers: Ben, Eli, Slate

---

KILLtONE is a first-person shooter game framework built with Babylon.js, featuring a modular weapon system, multiplayer support, and a modern game engine architecture.

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Killtone.git
cd Killtone
```

### 2. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/) installed (v14+ recommended).

```bash
npm install
```

### 3. Run the Game Locally

Start the local server:

```bash
npm start
```

This will launch an Express server (default: [http://localhost:3000](http://localhost:3000)). Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to play.

---

## 🎮 Controls

| Action         | Key/Mouse      |
| -------------- | -------------- |
| Move Forward   | W              |
| Move Backward  | S              |
| Move Left      | A              |
| Move Right     | D              |
| Jump           | Space          |
| Crouch         | C              |
| Sprint         | Shift (Left)   |
| Shoot          | Left Mouse     |
| Aim            | Right Mouse    |
| Reload         | R              |
| Switch Weapon  | Q              |
| Primary Weapon | 1              |
| Pistol         | 2              |
| Knife          | 3              |
| Settings       | Escape         |
| Scoreboard     | Tab            |
| Chat           | Enter          |
| Map Editor     | E              |
| Editor Save    | Ctrl+S         |
| Editor Load    | Ctrl+L         |
| Editor Undo    | Ctrl+Z         |
| Editor Redo    | Ctrl+Y         |

---

## 📁 Project Structure

- `src/` - Main game source code (engine, entities, effects, UI, etc.)
- `assets/` - Game assets (models, textures, sounds, maps)
- `server/` - Node.js/Express server for multiplayer
- `index.html` - Main HTML entry point
- `package.json` - Project metadata and dependencies

---

## 📦 Dependencies

- [Babylon.js](https://www.babylonjs.com/) (`@babylonjs/core`, `@babylonjs/loaders`, `@babylonjs/gui`, `@babylonjs/materials`)
- [Cannon-es](https://github.com/pmndrs/cannon-es) (physics)
- [Express](https://expressjs.com/) (server)
- [Socket.IO](https://socket.io/) (multiplayer networking)

---

## 📄 License

Not relevant quite yet 