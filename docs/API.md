# API Reference

## Class: `World`

The central manager for all block data and terrain generation.

### Constructor
`new World(scene, seed = null)`
- `scene`: The THREE.Scene instance.
- `seed`: Optional integer seed for terrain generation.

### Methods

#### `updateChunks(playerPos)`
Updates the loaded chunks based on the player's position.
- `playerPos`: `THREE.Vector3` - Current player position.
- Generates new chunks within `renderDistance`.
- Unloads chunks outside range.

#### `getChunkKey(cx, cz)`
Returns the unique string key for a chunk coordinate.

#### `addBlock(x, y, z, type)`
Adds a block to the world and updates meshes.
- `x, y, z`: World coordinates.
- `type`: String block type ('grass', 'dirt', 'stone', 'wood', 'leaves').

#### `removeBlock(x, y, z)`
Removes a block and updates meshes.

#### `getBlock(x, y, z)`
Returns block data `{x, y, z, type}` or `null`.

#### `isBlockAt(x, y, z)`
Returns `true` if a block exists at the coordinates.

---

## Class: `Player`

Handles player physics and controls.

### Constructor
`new Player(camera, world)`
- `camera`: The THREE.Camera instance attached to the player.
- `world`: Reference to the `World` instance for collision checking.

### Methods

#### `update()`
Called every frame to update position, apply gravity, and handle input.

#### `lock()`
Locks the pointer for first-person control.

---

## Class: `GreedyMesher`

Static utility for mesh optimization.

### Static Methods

#### `createMeshGeometry(blocks, blockSize, neighborCheck)`
Generates an optimized `THREE.BufferGeometry` for a list of blocks.
- `blocks`: Array of block objects.
- `blockSize`: Size of a single block (default 1).
- `neighborCheck`: Function `(x, y, z) => boolean` to check for neighbors in adjacent chunks.

---

## Class: `NoiseGenerator`

Utility for Perlin noise.

### Constructor
`new NoiseGenerator(seed)`

### Methods

#### `octaveNoise2D(x, y, octaves, persistence, scale)`
Generates layered noise for terrain heightmaps.
