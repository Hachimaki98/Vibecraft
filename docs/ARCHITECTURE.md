# Architecture Guide

This document provides a high-level overview of the Minecraft-like game architecture.

## System Overview

The application is built using standard HTML5 and ES6 JavaScript modules, utilizing **Three.js** for rendering. The architecture is component-based, separating concerns into World management, Player control, and Rendering.

### Core Components

1.  **Game (main.js)**: The entry point and coordinator.
2.  **World (world.js)**: Manages terrain data, chunks, and generation.
3.  **Player (player.js)**: Handles input, physics, and camera control.
4.  **Renderer**: Managed via Three.js in `Game` class.

## Data Flow

1.  **Initialization**: `Game` initializes `World` and `Player`.
2.  **Game Loop (`animate`)**:
    *   `Player.update()`: Calculates movement and physics.
    *   `World.updateChunks()`: Checks player position and loads/unloads chunks.
    *   `Renderer.render()`: Draws the scene.
3.  **Input**:
    *   Events in `Game` trigger `Player` actions (move) or `World` actions (modify blocks).

## Subsystems

### 1. World Generation & Management

The world is infinite and procedurally generated.

*   **Coordinate System**: Standard 3D Cartesian coordinates (x, y, z). Y is up.
*   **Chunk System**:
    *   The world is divided into **16x16** vertical columns called Chunks.
    *   Chunks are identified by a key `"chunkX,chunkZ"`.
    *   Chunks are generated on demand as the player moves.
*   **Procedural Generation**:
    *   Uses **Perlin Noise** (via `noise.js`) to generate heightmaps.
    *   A seed ensures deterministic generation.
    *   Biomes/Features (Trees) are placed using seeded randoms.

### 2. Rendering Strategy (Optimization)

Rendering voxel worlds requires heavy optimization to maintain 60 FPS.

*   **Greedy Meshing**:
    *   Instead of rendering 6 faces for every block (which would result in millions of triangles), we combine adjacent faces of the same type into a single large quad.
    *   This is handled in `greedy-mesh.js`.
*   **Face Culling**:
    *   Faces touching other opaque blocks are completely removed.
    *   The `GreedyMesher` checks neighbors (including across chunk boundaries) to determine visibility.
*   **Chunk Meshes**:
    *   Each chunk produces one `THREE.Mesh` per block type (e.g., one mesh for all stone in chunk 0,0).
    *   This minimizes draw calls while allowing distinct materials.

### 3. Physics & Collision

*   **AABB Collision**: Axis-Aligned Bounding Box collision is used.
*   The `Player` class checks for collisions against the `World` block data.
*   **Continuous Collision**: Checks multiple steps per frame to prevent tunneling.

## Directory Structure

```
src/
├── main.js        # Entry point, Game Loop, Event Handling
├── world.js       # Chunk Manager, Terrain Generation
├── player.js      # Player Controller, Physics
├── noise.js       # Perlin Noise & Random Utilities
└── greedy-mesh.js # Mesh Optimization Algorithm
```
