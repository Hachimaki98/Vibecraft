# Minecraft-like Block Game

A 3D voxel-based game inspired by Minecraft, built with Three.js. Features infinite procedural world generation, GPU-optimized rendering, and smooth first-person controls.

## Features

- **Infinite 3D World**: Procedurally generated terrain that expands infinitely as you explore.
- **Chunk-Based Generation**: Terrain is generated and loaded in chunks for optimal performance.
- **First-Person Controls**: WASD movement with mouse look.
- **Block Interaction**: Break and place blocks dynamically.
- **Multiple Block Types**: Grass, dirt, stone, wood, and leaves.
- **Physics**: Gravity, jumping, and robust collision detection.
- **Procedural Generation**: Random terrain generation using Perlin noise - each game start creates a unique world.
- **Seeded Random Generation**: Worlds can be reproduced using seeds.
- **Natural Terrain**: Varied heights, hills, valleys, and randomly placed trees.
- **GPU-Optimized Rendering**: Greedy meshing algorithm reduces geometry by 50-70% and draw calls by 99%+.
- **Real-time Rendering**: Smooth 3D graphics with shadows and fog.

## Controls

- **WASD**: Move around (Rebindable)
- **Mouse**: Look around
- **Space**: Jump (Rebindable)
- **Left Shift**: Fly down (creative mode) (Rebindable)
- **Left Click**: Break block
- **Right Click**: Place block
- **1-5 or Scroll Wheel**: Select block type (Grass, Dirt, Stone, Wood, Leaves)
- **Settings Menu**: Click "Settings" in top-right to rebind controls

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

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Architecture Guide](docs/ARCHITECTURE.md) - High-level overview of the system design.
- [API Reference](docs/API.md) - Detailed documentation of classes and methods.
- [Contributing Guide](docs/CONTRIBUTING.md) - Guidelines for contributing to the project.

## Game Architecture Overview

- `main.js`: Main game loop, initialization, and block interaction.
- `world.js`: Chunk management, world generation, and mesh handling.
- `player.js`: Player movement, physics, and collision detection.
- `noise.js`: Perlin noise generator and seeded random number generator.
- `greedy-mesh.js`: Greedy meshing algorithm for optimization.

## Performance Optimizations

The game includes several GPU-optimized rendering techniques:

- **Chunk System**: The world is divided into 16x16 chunks that load/unload based on player distance.
- **Greedy Meshing**: Adjacent block faces are combined into single geometries, reducing vertex count.
- **Face Culling**: Hidden faces (between blocks) are not rendered.
- **Shared Geometry**: Blocks of the same type in a chunk share a single mesh.

## License

MIT
