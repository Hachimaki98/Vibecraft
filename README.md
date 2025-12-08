# Minecraft-like Block Game

A 3D voxel-based game inspired by Minecraft, built with Three.js. Features procedural world generation, GPU-optimized rendering, and smooth first-person controls.

## Features

- **3D Block World**: Procedurally generated terrain with different block types
- **First-Person Controls**: WASD movement with mouse look
- **Block Interaction**: Break and place blocks dynamically
- **Multiple Block Types**: Grass, dirt, stone, wood, and leaves
- **Physics**: Gravity, jumping, and robust collision detection
- **Procedural Generation**: Random terrain generation using Perlin noise - each game start creates a unique world
- **Seeded Random Generation**: Worlds can be reproduced using seeds (displayed in console)
- **Natural Terrain**: Varied heights, hills, valleys, and randomly placed trees with variable heights
- **GPU-Optimized Rendering**: Greedy meshing algorithm reduces geometry by 50-70% and draw calls by 99%+
- **Performance Optimized**: Efficient rendering system handles large worlds smoothly
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

- `main.js`: Main game loop, initialization, and block interaction (breaking/placing)
- `world.js`: World generation, block management, and optimized mesh system
- `player.js`: Player movement, physics, and collision detection
- `noise.js`: Perlin noise generator and seeded random number generator for procedural terrain
- `greedy-mesh.js`: Greedy meshing algorithm for GPU-optimized rendering
- `index.html`: UI and HTML structure

## Procedural Generation

The game uses a Perlin noise-based procedural generation system that creates unique terrain each time you start the game. The system includes:

- **Noise-based Height Maps**: Uses octave noise (fractal noise) for natural-looking terrain variation
- **Seeded Randomness**: Each world has a seed that determines its generation (displayed in browser console)
- **Layered Terrain**: Stone base, dirt middle layer, and grass top layer
- **Random Tree Placement**: Trees are randomly placed using seeded random for consistency
- **Variable Tree Heights**: Trees have varying heights (3-6 blocks) for more natural appearance
- **World Size**: Generates a 40x40 block area with varied terrain heights

## Performance Optimizations

The game includes several GPU-optimized rendering techniques for smooth performance:

- **Greedy Meshing**: Only renders visible block faces, reducing geometry by 50-70%
- **Optimized Mesh System**: Groups blocks by type into single meshes, reducing draw calls from thousands to just a few
- **Efficient Raycasting**: Fast block interaction detection
- **Dynamic Block Management**: Optimized meshes for static terrain, individual meshes for dynamically placed blocks
- **Automatic Mesh Rebuilding**: Optimized meshes rebuild when blocks are removed for optimal performance

## Technical Details

### Rendering System
- Uses Three.js WebGL renderer with shadow mapping
- Greedy meshing combines adjacent block faces into single geometries
- Only visible faces are rendered (faces not touching other blocks)
- Blocks are grouped by type for efficient rendering

### Collision Detection
- Robust ground collision detection with wide range checking
- Horizontal collision detection for walls
- Prevents falling through terrain
- Handles fast movement and falling

### Block System
- Blocks stored in a Map for O(1) lookup
- Optimized meshes for initial terrain generation
- Dynamic meshes for player-placed blocks
- Automatic mesh rebuilding when blocks are removed

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
- Block preview when placing

## License

MIT
