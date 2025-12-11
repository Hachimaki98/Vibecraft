import * as THREE from 'three';
import { NoiseGenerator, SeededRandom } from './noise.js';
import { GreedyMesher } from './greedy-mesh.js';

export class World {
    constructor(scene, seed = null) {
        this.scene = scene;
        this.blocks = new Map(); // Block data storage "x,y,z" -> {x,y,z,type}
        this.blockSize = 1;
        this.chunkSize = 16;
        this.renderDistance = 8;
        
        // Generate random seed if not provided
        this.seed = seed !== null ? seed : Math.floor(Math.random() * 1000000);
        this.noise = new NoiseGenerator(this.seed);
        // We use local randoms for chunks to ensure determinism
        
        // Callbacks for block add/remove events
        this.onBlockAdded = null;
        this.onBlockRemoved = null;
        
        // Chunks storage
        // Key: "chunkX,chunkZ"
        // Value: { meshes: Map<type, THREE.Mesh> }
        this.chunks = new Map();
        
        // Individual meshes for dynamically added blocks are mostly for
        // things that don't fit into chunks or temporary visual updates
        // In this implementation, we'll try to keep everything in chunk meshes
        this.dynamicMeshes = new Map();
        
        // Block materials
        this.materials = {
            grass: new THREE.MeshLambertMaterial({ color: 0x5a8c3a }),
            dirt: new THREE.MeshLambertMaterial({ color: 0x8b7355 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
            leaves: new THREE.MeshLambertMaterial({ color: 0x2d5016, transparent: true, opacity: 0.8 }),
            sand: new THREE.MeshLambertMaterial({ color: 0xe1c699 }),
            glass: new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 }),
            brick: new THREE.MeshLambertMaterial({ color: 0xb54b35 }),
            plank: new THREE.MeshLambertMaterial({ color: 0xa07040 }),
            water: new THREE.MeshLambertMaterial({ color: 0x0064ff, transparent: true, opacity: 0.6 }),
            snow: new THREE.MeshLambertMaterial({ color: 0xffffff }),
            ornament_red: new THREE.MeshLambertMaterial({ color: 0xff0000 }),
            ornament_blue: new THREE.MeshLambertMaterial({ color: 0x0000ff }),
            ornament_gold: new THREE.MeshLambertMaterial({ color: 0xffd700 })
        };
        
        this.transparentBlocks = new Set(['leaves', 'glass', 'water', 'ornament_red', 'ornament_blue', 'ornament_gold']);
        
        // Initial generation will happen via updateChunks
        console.log(`World initialized with seed: ${this.seed}`);
    }

    updateChunks(playerPos) {
        const cx = Math.floor(playerPos.x / this.chunkSize);
        const cz = Math.floor(playerPos.z / this.chunkSize);

        // Generate/load chunks around player
        for (let x = cx - this.renderDistance; x <= cx + this.renderDistance; x++) {
            for (let z = cz - this.renderDistance; z <= cz + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                if (!this.chunks.has(key)) {
                    this.generateChunk(x, z);
                }
            }
        }

        // Unload chunks that are too far
        for (const [key, chunk] of this.chunks) {
            const [mx, mz] = key.split(',').map(Number);
            if (Math.abs(mx - cx) > this.renderDistance + 2 || 
                Math.abs(mz - cz) > this.renderDistance + 2) {
                this.unloadChunk(mx, mz);
            }
        }
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    generateChunk(cx, cz) {
        const chunkRandom = new SeededRandom(this.seed + cx * 4321 + cz * 9876);
        
        const startX = cx * this.chunkSize;
        const endX = (cx + 1) * this.chunkSize;
        const startZ = cz * this.chunkSize;
        const endZ = (cz + 1) * this.chunkSize;
        
        const baseHeight = 8;
        const heightVariation = 12;
        const seaLevel = 4;

        // Generate base terrain
        for (let x = startX; x < endX; x++) {
            for (let z = startZ; z < endZ; z++) {
                const noiseValue = this.noise.octaveNoise2D(
                    x * 0.05, 
                    z * 0.05, 
                    4, 0.5, 1.0
                );
                
                const terrainHeight = Math.floor(baseHeight + noiseValue * heightVariation);
                const finalHeight = Math.max(1, terrainHeight);
                
                for (let y = 0; y < finalHeight; y++) {
                    let type = 'stone';
                    if (y === 0) type = 'stone';
                    else if (y < finalHeight - 3) type = 'stone';
                    else if (y < finalHeight - 1) type = 'dirt';
                    else {
                        if (y <= seaLevel + 1) type = 'sand';
                        else type = 'grass';
                    }
                    
                    // Force set for terrain (overwrites anything that spilled over, which is usually fine)
                    this.setBlockData(x, y, z, type);
                }
                
                // Water filling
                for (let y = finalHeight; y <= seaLevel; y++) {
                    // Don't overwrite terrain
                    if (!this.isBlockAt(x, y, z)) {
                        this.setBlockData(x, y, z, 'water');
                    }
                }

                // Trees
                if (finalHeight > seaLevel + 1 && chunkRandom.next() < 0.015) {
                    if (chunkRandom.next() < 0.2) {
                        this.generateChristmasTree(x, finalHeight, z, chunkRandom);
                    } else {
                        this.generateTree(x, finalHeight, z, chunkRandom);
                    }
                }
            }
        }

        // Register chunk
        this.chunks.set(this.getChunkKey(cx, cz), {
            meshes: new Map()
        });

        // Build mesh
        this.buildChunkMesh(cx, cz);
    }

    unloadChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        const chunk = this.chunks.get(key);
        if (chunk) {
            // Remove meshes from scene
            chunk.meshes.forEach(mesh => {
                this.scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
            });
            this.chunks.delete(key);
            
            // Optionally remove blocks from this.blocks map to save memory
            // But this is complex because of trees spilling over. 
            // For now, we keep block data, only unload meshes. 
            // Memory optimization can be a future task.
        }
    }

    setBlockData(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        this.blocks.set(key, { x, y, z, type });
    }

    // Safer add for trees/decorations
    addBlockData(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        if (!this.blocks.has(key)) {
            this.blocks.set(key, { x, y, z, type });
        }
    }
    
    generateChristmasTree(x, y, z, random) {
        const trunkHeight = 4 + random.nextInt(0, 3);
        
        // Trunk
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlockData(x, y + i, z, 'wood');
        }
        
        // Leaves (Cone shape)
        const leavesStart = y + 2;
        const leavesHeight = trunkHeight + 2;
        
        for (let ly = 0; ly < leavesHeight; ly++) {
            const currentY = leavesStart + ly;
            // Radius gets smaller as we go up
            const radius = Math.floor(2.5 - (ly / leavesHeight) * 2.5);
            
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    // Circular check
                    if (dx*dx + dz*dz <= radius*radius + 1) {
                        // Don't overwrite trunk
                        if (!this.isBlockAt(x + dx, currentY, z + dz)) {
                            let blockType = 'leaves';
                            // Chance for ornaments
                            if (random.next() < 0.15) {
                                const rand = random.next();
                                if (rand < 0.33) blockType = 'ornament_red';
                                else if (rand < 0.66) blockType = 'ornament_blue';
                                else blockType = 'ornament_gold';
                            }
                            this.addBlockData(x + dx, currentY, z + dz, blockType);
                        }
                    }
                }
            }
        }
        
        // Star on top
        this.addBlockData(x, leavesStart + leavesHeight, z, 'ornament_gold');
    }
    
    generateTree(x, y, z, random) {
        const trunkHeight = 3 + random.nextInt(0, 4);
        
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlockData(x, y + i, z, 'wood');
        }
        
        const leavesY = y + trunkHeight;
        const leavesRadius = 2;
        
        for (let dx = -leavesRadius; dx <= leavesRadius; dx++) {
            for (let dy = -1; dy <= 2; dy++) {
                for (let dz = -leavesRadius; dz <= leavesRadius; dz++) {
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist > leavesRadius + 0.5) continue;
                    if (dx === 0 && dy === -1 && dz === 0) continue;
                    
                    const leafChance = 1.0 - (dist / (leavesRadius + 1)) * 0.3;
                    if (random.next() < leafChance) {
                        this.addBlockData(x + dx, leavesY + dy, z + dz, 'leaves');
                    }
                }
            }
        }
    }

    getBlocksInChunk(cx, cz) {
        const blocks = [];
        const startX = cx * this.chunkSize;
        const endX = (cx + 1) * this.chunkSize;
        const startZ = cz * this.chunkSize;
        const endZ = (cz + 1) * this.chunkSize;
        
        // Scan bounds - including a bit of vertical buffer or just known height range
        // Since we store all blocks in a map, iterating the map is O(TotalBlocks). 
        // Iterating the bounds is O(ChunkVolume).
        // Map lookup is O(1).
        // Iterating bounds is better if map is huge.
        // Assuming max height 100 for now.
        for(let x = startX; x < endX; x++) {
            for(let z = startZ; z < endZ; z++) {
                // Determine height to scan?
                // Scanning entire vertical column
                for(let y = -5; y < 100; y++) {
                    const key = this.getBlockKey(x, y, z);
                    const block = this.blocks.get(key);
                    if (block) {
                        blocks.push(block);
                    }
                }
            }
        }
        return blocks;
    }

    buildChunkMesh(cx, cz) {
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return;

        // Remove old meshes
        chunk.meshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
        });
        chunk.meshes.clear();

        const blocks = this.getBlocksInChunk(cx, cz);
        if (blocks.length === 0) return;

        // Group by type
        const blocksByType = new Map();
        blocks.forEach(block => {
            if (!blocksByType.has(block.type)) {
                blocksByType.set(block.type, []);
            }
            blocksByType.get(block.type).push(block);
        });

        // Build meshes
        blocksByType.forEach((typeBlocks, type) => {
            // Smart neighbor check handling transparency
            const neighborCheck = (nx, ny, nz) => {
                const neighborBlock = this.getBlock(nx, ny, nz);
                
                // If no neighbor (empty space), face is visible -> Keep it
                if (!neighborBlock) return false;
                
                // If neighbor is same type, cull face (internal face) -> Hide it
                if (neighborBlock.type === type) return true;
                
                // If neighbor is opaque, it blocks view -> Hide face
                // (Unless current block is also opaque? No, opaque vs opaque is covered by neighborBlock logic mostly, 
                // but strictly: Stone vs Dirt -> Stone face hidden by Dirt? Yes.)
                if (!this.transparentBlocks.has(neighborBlock.type)) return true;
                
                // If neighbor is transparent (and different type), we can see through it -> Keep face
                // e.g. Water next to Glass -> Show Water face
                return false;
            };

            const geometry = GreedyMesher.createMeshGeometry(typeBlocks, this.blockSize, neighborCheck);
            
            if (geometry.attributes.position.count > 0) {
                const material = this.materials[type];
                const mesh = new THREE.Mesh(geometry, material);
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData.blockType = type;
                mesh.userData.isOptimizedMesh = true;
                mesh.userData.chunkX = cx;
                mesh.userData.chunkZ = cz;
                
                this.scene.add(mesh);
                chunk.meshes.set(type, mesh);
            }
        });
    }

    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }
    
    addBlock(x, y, z, type = 'grass') {
        const key = this.getBlockKey(x, y, z);
        if (this.blocks.has(key)) return;
        
        this.blocks.set(key, { x, y, z, type });
        
        // Find chunk
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        
        // Rebuild chunk mesh
        this.buildChunkMesh(cx, cz);
        
        // Also rebuild neighbors if on edge? 
        // Greedy mesher might have culled neighbor face.
        // For correctness, we should update neighbors.
        // For now, let's just update self.
        
        // Check neighbors
        const locals = [[0,0,1], [0,0,-1], [1,0,0], [-1,0,0]];
        const neighborsToUpdate = new Set();
        
        locals.forEach(([dx, dy, dz]) => {
             const ncx = Math.floor((x + dx) / this.chunkSize);
             const ncz = Math.floor((z + dz) / this.chunkSize);
             if (ncx !== cx || ncz !== cz) {
                 neighborsToUpdate.add(`${ncx},${ncz}`);
             }
        });
        
        neighborsToUpdate.forEach(key => {
            const [nx, nz] = key.split(',').map(Number);
            this.buildChunkMesh(nx, nz);
        });
    }
    
    removeBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        if (!this.blocks.has(key)) return;
        
        this.blocks.delete(key);
        
        // Find chunk
        const cx = Math.floor(x / this.chunkSize);
        const cz = Math.floor(z / this.chunkSize);
        
        this.buildChunkMesh(cx, cz);
        
        // Neighbors logic same as add
        const locals = [[0,0,1], [0,0,-1], [1,0,0], [-1,0,0]];
        const neighborsToUpdate = new Set();
        
        locals.forEach(([dx, dy, dz]) => {
             const ncx = Math.floor((x + dx) / this.chunkSize);
             const ncz = Math.floor((z + dz) / this.chunkSize);
             if (ncx !== cx || ncz !== cz) {
                 neighborsToUpdate.add(`${ncx},${ncz}`);
             }
        });
        
        neighborsToUpdate.forEach(key => {
            const [nx, nz] = key.split(',').map(Number);
            this.buildChunkMesh(nx, nz);
        });
    }
    
    getBlock(x, y, z) {
        return this.blocks.get(this.getBlockKey(x, y, z));
    }
    
    isBlockAt(x, y, z) {
        return this.blocks.has(this.getBlockKey(x, y, z));
    }
    
    getBlockCount() {
        return this.blocks.size;
    }
    
    getHighestBlockAt(x, z) {
        for (let y = 50; y >= -50; y--) {
            if (this.isBlockAt(x, y, z)) {
                return y;
            }
        }
        return -1;
    }
}
