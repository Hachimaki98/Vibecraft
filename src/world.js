import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map();
        this.blockSize = 1;
        
        // Callbacks for block add/remove events
        this.onBlockAdded = null;
        this.onBlockRemoved = null;
        
        // Block materials
        this.materials = {
            grass: this.createGrassMaterial(),
            dirt: new THREE.MeshLambertMaterial({ color: 0x8b7355 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
            leaves: new THREE.MeshLambertMaterial({ color: 0x2d5016, transparent: true, opacity: 0.8 })
        };
        
        this.blockGeometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        
        // Generate initial terrain
        this.generateTerrain();
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
        const size = 20;
        const height = 5;
        
        // Generate flat terrain with some variation
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
                const terrainHeight = Math.floor(height + noise);
                
                // Bedrock/stone layer
                for (let y = 0; y < terrainHeight - 2; y++) {
                    this.addBlock(x, y, z, 'stone');
                }
                
                // Dirt layer
                if (terrainHeight > 1) {
                    this.addBlock(x, terrainHeight - 2, z, 'dirt');
                }
                
                // Grass top
                this.addBlock(x, terrainHeight - 1, z, 'grass');
                
                // Add some trees randomly
                if (Math.random() < 0.02 && terrainHeight > 2) {
                    this.generateTree(x, terrainHeight, z);
                }
            }
        }
    }
    
    generateTree(x, y, z) {
        // Tree trunk
        const trunkHeight = 4;
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlock(x, y + i, z, 'wood');
        }
        
        // Tree leaves
        const leavesY = y + trunkHeight;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; // Skip corners
                    if (dx === 0 && dy === -1 && dz === 0) continue; // Skip center bottom (trunk)
                    
                    if (Math.random() < 0.8) {
                        this.addBlock(x + dx, leavesY + dy, z + dz, 'leaves');
                    }
                }
            }
        }
    }
    
    getBlockKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }
    
    addBlock(x, y, z, type = 'grass') {
        const key = this.getBlockKey(x, y, z);
        
        if (this.blocks.has(key)) {
            return; // Block already exists
        }
        
        const material = this.materials[type];
        const mesh = new THREE.Mesh(this.blockGeometry, material);
        
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        mesh.userData.blockType = type;
        mesh.userData.position = { x, y, z };
        
        this.scene.add(mesh);
        this.blocks.set(key, mesh);
        
        // Notify callback if set
        if (this.onBlockAdded) {
            this.onBlockAdded(mesh);
        }
    }
    
    removeBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        const block = this.blocks.get(key);
        
        if (block) {
            this.scene.remove(block);
            this.blocks.delete(key);
            
            // Notify callback if set
            if (this.onBlockRemoved) {
                this.onBlockRemoved(block);
            }
        }
    }
    
    getBlock(x, y, z) {
        const key = this.getBlockKey(x, y, z);
        return this.blocks.get(key);
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
