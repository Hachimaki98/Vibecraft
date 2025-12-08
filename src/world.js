import * as THREE from 'three';
import { NoiseGenerator, SeededRandom } from './noise.js';
import { GreedyMesher } from './greedy-mesh.js';

export class World {
    constructor(scene, seed = null) {
        this.scene = scene;
        this.blocks = new Map(); // Block data storage
        this.blockSize = 1;
        
        // Generate random seed if not provided
        this.seed = seed !== null ? seed : Math.floor(Math.random() * 1000000);
        this.noise = new NoiseGenerator(this.seed);
        this.random = new SeededRandom(this.seed);
        
        // Callbacks for block add/remove events
        this.onBlockAdded = null;
        this.onBlockRemoved = null;
        
        // Instanced meshes for each block type (GPU-optimized)
        this.instancedMeshes = new Map();
        
        // Individual meshes for dynamically added blocks (after initial generation)
        this.dynamicMeshes = new Map();
        
        // Block materials
        this.materials = {
            grass: new THREE.MeshLambertMaterial({ color: 0x5a8c3a }),
            dirt: new THREE.MeshLambertMaterial({ color: 0x8b7355 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
            leaves: new THREE.MeshLambertMaterial({ color: 0x2d5016, transparent: true, opacity: 0.8 })
        };
        
        // Store block data during generation
        this.blockData = [];
        
        // Generate initial terrain
        this.generateTerrain();
        
        // Build optimized meshes after generation
        this.buildOptimizedMeshes();
        
        console.log(`World generated with seed: ${this.seed}`);
        console.log(`Total blocks: ${this.blocks.size}`);
    }
    
    createGrassMaterial() {
        const materials = [
            new THREE.MeshLambertMaterial({ color: 0x5a8c3a }), // right
            new THREE.MeshLambertMaterial({ color: 0x5a8c3a }), // left
            new THREE.MeshLambertMaterial({ color: 0x5a8c3a }), // top (grass)
            new THREE.MeshLambertMaterial({ color: 0x8b7355 }), // bottom (dirt)
            new THREE.MeshLambertMaterial({ color: 0x5a8c3a }), // front
            new THREE.MeshLambertMaterial({ color: 0x5a8c3a })  // back
        ];
        return materials;
    }
    
    generateTerrain() {
        const size = 40; // Increased world size
        const baseHeight = 8;
        const heightVariation = 12;
        
        // Generate terrain using noise - collect block data first
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                // Use octave noise for natural-looking terrain
                const noiseValue = this.noise.octaveNoise2D(
                    x * 0.05, 
                    z * 0.05, 
                    4,      // octaves
                    0.5,    // persistence
                    1.0     // scale
                );
                
                // Calculate terrain height with variation
                const terrainHeight = Math.floor(baseHeight + noiseValue * heightVariation);
                
                // Ensure minimum height
                const finalHeight = Math.max(1, terrainHeight);
                
                // Generate layers from bottom to top
                for (let y = 0; y < finalHeight; y++) {
                    let type = 'stone';
                    if (y === 0) {
                        type = 'stone'; // Bedrock layer at bottom
                    } else if (y < finalHeight - 3) {
                        type = 'stone';
                    } else if (y < finalHeight - 1) {
                        type = 'dirt';
                    } else {
                        type = 'grass';
                    }
                    this.addBlockData(x, y, z, type);
                }
                
                // Add trees randomly (using seeded random)
                if (finalHeight > 3 && this.random.next() < 0.015) {
                    this.generateTree(x, finalHeight, z);
                }
            }
        }
    }
    
    addBlockData(x, y, z, type) {
        const key = this.getBlockKey(x, y, z);
        if (!this.blocks.has(key)) {
            this.blocks.set(key, { x, y, z, type });
            this.blockData.push({ x, y, z, type });
        }
    }
    
    generateTree(x, y, z) {
        // Variable tree height using seeded random
        const trunkHeight = 3 + this.random.nextInt(0, 4); // 3-6 blocks tall
        
        // Tree trunk
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlockData(x, y + i, z, 'wood');
        }
        
        // Tree leaves - more natural shape
        const leavesY = y + trunkHeight;
        const leavesRadius = 2;
        
        for (let dx = -leavesRadius; dx <= leavesRadius; dx++) {
            for (let dy = -1; dy <= 2; dy++) {
                for (let dz = -leavesRadius; dz <= leavesRadius; dz++) {
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    
                    // Skip corners for more natural shape
                    if (dist > leavesRadius + 0.5) continue;
                    
                    // Skip center bottom where trunk is
                    if (dx === 0 && dy === -1 && dz === 0) continue;
                    
                    // Use seeded random for consistent tree generation
                    const leafChance = 1.0 - (dist / (leavesRadius + 1)) * 0.3;
                    if (this.random.next() < leafChance) {
                        this.addBlockData(x + dx, leavesY + dy, z + dz, 'leaves');
                    }
                }
            }
        }
    }
    
    buildOptimizedMeshes() {
        // Group blocks by type
        const blocksByType = new Map();
        this.blockData.forEach(block => {
            if (!blocksByType.has(block.type)) {
                blocksByType.set(block.type, []);
            }
            blocksByType.get(block.type).push(block);
        });
        
        // Create optimized meshes for each block type using greedy meshing
        blocksByType.forEach((blocks, type) => {
            const geometry = GreedyMesher.createMeshGeometry(blocks, this.blockSize);
            const material = this.materials[type];
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.blockType = type;
            mesh.userData.isOptimizedMesh = true;
            
            this.scene.add(mesh);
            this.instancedMeshes.set(type, mesh);
            
            // Store mesh reference for callbacks
            blocks.forEach(block => {
                const key = this.getBlockKey(block.x, block.y, block.z);
                if (this.onBlockAdded) {
                    // Create a virtual mesh reference for callbacks
                    const virtualMesh = {
                        userData: {
                            blockType: type,
                            position: { x: block.x, y: block.y, z: block.z }
                        }
                    };
                    this.onBlockAdded(virtualMesh);
                }
            });
        });
        
        console.log(`Created ${this.instancedMeshes.size} optimized meshes`);
    }
    
    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }
    
    addBlock(x, y, z, type = 'grass') {
        const key = this.getBlockKey(x, y, z);
        
        if (this.blocks.has(key)) {
            return; // Block already exists
        }
        
        // Store block data
        this.blocks.set(key, { x, y, z, type });
        
        // For dynamically added blocks (after initial generation), create individual mesh
        // This is less optimal but necessary for dynamic block placement
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = this.materials[type];
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData.blockType = type;
        mesh.userData.position = { x, y, z };
        mesh.userData.isDynamic = true;
        
        this.scene.add(mesh);
        this.dynamicMeshes.set(key, mesh);
        
        // Notify callback if set
        if (this.onBlockAdded) {
            this.onBlockAdded(mesh);
        }
    }
    
    removeBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        const blockData = this.blocks.get(key);
        
        if (!blockData) {
            return;
        }
        
        // Check if it's a dynamic mesh (individually created)
        const dynamicMesh = this.dynamicMeshes.get(key);
        if (dynamicMesh) {
            this.scene.remove(dynamicMesh);
            dynamicMesh.geometry.dispose();
            this.dynamicMeshes.delete(key);
            
            if (this.onBlockRemoved) {
                this.onBlockRemoved(dynamicMesh);
            }
        } else {
            // Block is part of optimized mesh - need to rebuild that mesh type
            const blockType = blockData.type;
            const optimizedMesh = this.instancedMeshes.get(blockType);
            
            if (optimizedMesh) {
                // Remove old mesh from scene
                this.scene.remove(optimizedMesh);
                optimizedMesh.geometry.dispose();
                this.instancedMeshes.delete(blockType);
                
                // Rebuild mesh for this block type with remaining blocks
                const remainingBlocks = [];
                this.blocks.forEach((data, blockKey) => {
                    if (data.type === blockType && blockKey !== key) {
                        remainingBlocks.push(data);
                    }
                });
                
                // Only rebuild if there are remaining blocks of this type
                if (remainingBlocks.length > 0) {
                    const geometry = GreedyMesher.createMeshGeometry(remainingBlocks, this.blockSize);
                    const material = this.materials[blockType];
                    const newMesh = new THREE.Mesh(geometry, material);
                    
                    newMesh.castShadow = true;
                    newMesh.receiveShadow = true;
                    newMesh.userData.blockType = blockType;
                    newMesh.userData.isOptimizedMesh = true;
                    
                    this.scene.add(newMesh);
                    this.instancedMeshes.set(blockType, newMesh);
                }
            }
            
            if (this.onBlockRemoved) {
                const virtualMesh = {
                    userData: {
                        blockType: blockData.type,
                        position: { x, y, z }
                    }
                };
                this.onBlockRemoved(virtualMesh);
            }
        }
        
        this.blocks.delete(key);
    }
    
    getBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        const blockData = this.blocks.get(key);
        if (!blockData) return null;
        
        // Return dynamic mesh if it exists, otherwise return block data
        const dynamicMesh = this.dynamicMeshes.get(key);
        return dynamicMesh || blockData;
    }
    
    isBlockAt(x, y, z) {
        return this.blocks.has(this.getBlockKey(x, y, z));
    }
    
    getBlockCount() {
        return this.blocks.size;
    }
    
    getHighestBlockAt(x, z) {
        // Find the highest block at given x, z coordinates
        // Check from top down (start high and go down)
        for (let y = 50; y >= -50; y--) {
            if (this.isBlockAt(x, y, z)) {
                return y;
            }
        }
        return -1; // No block found
    }
}
