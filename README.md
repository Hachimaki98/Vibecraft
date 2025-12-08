# Minecraft-like Block Game

A 3D voxel-based game inspired by Minecraft, built with Three.js.

## Features

- **3D Block World**: Procedurally generated terrain with different block types
- **First-Person Controls**: WASD movement with mouse look
- **Block Interaction**: Break and place blocks
- **Multiple Block Types**: Grass, dirt, stone, wood, and leaves
- **Physics**: Gravity, jumping, and collision detection
- **Procedural Generation**: Random terrain generation using Perlin noise - each game start creates a unique world
- **Seeded Random Generation**: Worlds can be reproduced using seeds
- **Natural Terrain**: Varied heights, hills, valleys, and randomly placed trees
- **Real-time Rendering**: Smooth 3D graphics with shadows and fog

## Controls

- **WASD**: Move around
- **Mouse**: Look around
- **Space**: Jump
- **Left Shift**: Fly down (creative mode)
- **Left Click**: Break block
- **Right Click**: Place block
- **1-5**: Select block type (Grass, Dirt, Stone, Wood, Leaves)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the local server URL (usually http://localhost:5173)

4. Click on the screen to start playing!

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technology Stack

- **Three.js**: 3D graphics library
- **Vite**: Build tool and development server
- **ES6 Modules**: Modern JavaScript

## Game Architecture

- `main.js`: Main game loop and initialization
- `world.js`: World generation and block management
- `player.js`: Player movement and physics
- `noise.js`: Perlin noise generator for procedural terrain
- `index.html`: UI and HTML structure

## Procedural Generation

The game uses a Perlin noise-based procedural generation system that creates unique terrain each time you start the game. The system includes:

- **Noise-based Height Maps**: Uses octave noise (fractal noise) for natural-looking terrain variation
- **Seeded Randomness**: Each world has a seed that determines its generation (displayed in console)
- **Layered Terrain**: Stone base, dirt middle layer, and grass top layer
- **Random Tree Placement**: Trees are randomly placed using seeded random for consistency
- **Variable Tree Heights**: Trees have varying heights for more natural appearance

## Future Enhancements

- Inventory system
- More block types
- Biome generation (deserts, forests, mountains, etc.)
- Cave generation
- Ore generation
- Multiplayer support
- Save/load world state with seed
- Texture atlases for better performance
- Chunk-based rendering for larger worlds
- Day/night cycle
- Crafting system

## License

MIT
