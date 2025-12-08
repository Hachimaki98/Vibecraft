import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { WeatherSystem } from './weather.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.id = 'game-canvas';
        document.body.appendChild(this.renderer.domElement);
        
        // Set up scene
        this.scene.background = new THREE.Color(0x87CEEB);
        // Changed from THREE.Fog (linear) to THREE.FogExp2 (exponential) for WeatherSystem compatibility.
        // Adjusted density to visually approximate original linear fog (near=50, far=200).
        // If visual appearance is not as intended, further tuning of density or lighting may be needed.
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Raycaster for block interaction
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 10;
        
        // Store block meshes for efficient raycaster queries (must be initialized before world)
        this.blockMeshes = [];
        
        // Initialize game components
        this.world = new World(this.scene);
        this.weatherSystem = new WeatherSystem(this.scene);
        this.weatherSystem.setWeather('sunny');
        
        // Generate initial world around spawn
        this.world.updateChunks(new THREE.Vector3(0, 0, 0));

        this.world.onBlockAdded = (mesh) => {
            if (mesh && !mesh.userData.isOptimizedMesh) {
                this.blockMeshes.push(mesh);
            }
        };
        this.world.onBlockRemoved = (mesh) => {
            if (mesh && !mesh.userData.isOptimizedMesh) {
                const index = this.blockMeshes.indexOf(mesh);
                if (index > -1) this.blockMeshes.splice(index, 1);
            }
        };
        // Get all meshes (optimized + dynamic) for raycasting
        this.updateBlockMeshesList();
        this.player = new Player(this.camera, this.world);
        
        // Set player spawn position on top of terrain
        const spawnX = 0;
        const spawnZ = 0;
        const highestBlock = this.world.getHighestBlockAt(spawnX, spawnZ);
        if (highestBlock >= 0) {
            // Block center is at highestBlock, top is at highestBlock + 0.5
            // Player feet should be at top, so player center = top + height
            this.player.controls.getObject().position.set(spawnX, highestBlock + 0.5 + this.player.height, spawnZ);
        }
        
        // Selected block type
        this.blockTypes = ['grass', 'dirt', 'stone', 'wood', 'leaves'];
        this.selectedBlock = 'grass';
        this.selectedBlockIndex = 0;
        
        // FPS counter
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        
        // Event listeners
        this.setupEventListeners();
        this.setupSettings();
        
        // Start game loop
        this.animate();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('click', (event) => {
            // Don't lock if clicking inside settings menu or settings button
            if (event.target.closest('#settings-menu') || event.target.closest('#settings-button')) {
                return;
            }
            this.player.lock();
        });
        
        window.addEventListener('mousedown', (event) => {
            if (this.player.controls.isLocked) {
                if (event.button === 0) { // Left click - break block
                    this.breakBlock();
                } else if (event.button === 2) { // Right click - place block
                    this.placeBlock();
                }
            }
        });
        
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Block selection
        document.querySelectorAll('.block-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.block-option').forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedBlock = e.target.dataset.block;
            });
        });
        
        // Keyboard block selection
        window.addEventListener('keydown', (event) => {
            if (event.code === 'KeyR') {
                this.weatherSystem.cycleWeather();
            }
            const key = parseInt(event.key);
            if (key >= 1 && key <= 5) {
                this.selectBlock(key - 1);
            }
        });

        // Scroll wheel block selection
        window.addEventListener('wheel', (event) => {
            if (event.deltaY > 0) {
                // Scroll down
                this.selectedBlockIndex = (this.selectedBlockIndex + 1) % this.blockTypes.length;
            } else {
                // Scroll up
                this.selectedBlockIndex = (this.selectedBlockIndex - 1 + this.blockTypes.length) % this.blockTypes.length;
            }
            this.selectBlock(this.selectedBlockIndex);
        });
    }
    
    selectBlock(index) {
        this.selectedBlockIndex = index;
        this.selectedBlock = this.blockTypes[index];
        document.querySelectorAll('.block-option').forEach((opt, idx) => {
            opt.classList.toggle('active', idx === index);
        });
    }
    
    setupSettings() {
        const settingsButton = document.getElementById('settings-button');
        const settingsMenu = document.getElementById('settings-menu');
        const closeSettings = document.getElementById('close-settings');
        const controlsList = document.getElementById('controls-list');

        // Toggle settings menu
        settingsButton.addEventListener('click', () => {
            const isVisible = settingsMenu.style.display === 'block';
            if (!isVisible) {
                // Open menu
                this.player.controls.unlock();
                settingsMenu.style.display = 'block';
                this.updateControlsList();
            }
        });

        // Close settings menu
        closeSettings.addEventListener('click', () => {
            settingsMenu.style.display = 'none';
            this.player.lock();
        });

        // Key remapping logic
        this.currentRemapAction = null;
        
        window.addEventListener('keydown', (e) => {
            if (this.currentRemapAction) {
                e.preventDefault();
                this.player.setKeyBinding(this.currentRemapAction, e.code);
                this.currentRemapAction = null;
                this.updateControlsList();
            }
        });
    }

    updateControlsList() {
        const controlsList = document.getElementById('controls-list');
        controlsList.innerHTML = '';
        
        const bindings = this.player.getKeyBindings();
        
        for (const [action, code] of Object.entries(bindings)) {
            const row = document.createElement('div');
            row.className = 'setting-row';
            
            const label = document.createElement('span');
            label.textContent = action.charAt(0).toUpperCase() + action.slice(1);
            
            const btn = document.createElement('button');
            btn.className = 'key-btn';
            btn.textContent = code;
            
            btn.addEventListener('click', () => {
                // Cancel any previous remapping
                document.querySelectorAll('.key-btn').forEach(b => b.classList.remove('waiting'));
                
                // Set waiting state
                btn.textContent = 'Press key...';
                btn.classList.add('waiting');
                this.currentRemapAction = action;
            });
            
            row.appendChild(label);
            row.appendChild(btn);
            controlsList.appendChild(row);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateBlockMeshesList() {
        this.blockMeshes = [];
        // Add all chunk meshes
        this.world.chunks.forEach(chunk => {
            chunk.meshes.forEach(mesh => {
                this.blockMeshes.push(mesh);
            });
        });
        // Add all dynamic meshes
        this.world.dynamicMeshes.forEach(mesh => {
            this.blockMeshes.push(mesh);
        });
    }
    
    getBlockPositionFromIntersection(intersect) {
        // If mesh has position data, use it (dynamic meshes)
        if (intersect.object.userData.position) {
            return intersect.object.userData.position;
        }
        
        // For optimized meshes, try to get block ID from geometry attribute
        if (intersect.object.geometry) {
            const geometry = intersect.object.geometry;
            const blockIdAttr = geometry.getAttribute('blockId');
            
            if (blockIdAttr && intersect.face !== undefined) {
                // faceIndex is the triangle index (each face has 2 triangles)
                // Get the first vertex of the intersected triangle
                const index = geometry.index;
                if (index && intersect.faceIndex !== undefined) {
                    // faceIndex is the triangle index, multiply by 3 to get vertex index
                    const vertexIndex = index.getX(intersect.faceIndex * 3);
                    const blockIdIndex = vertexIndex;
                    
                    const x = blockIdAttr.getX(blockIdIndex);
                    const y = blockIdAttr.getY(blockIdIndex);
                    const z = blockIdAttr.getZ(blockIdIndex);
                    
                    // Round to ensure we get integer coordinates
                    return { x: Math.round(x), y: Math.round(y), z: Math.round(z) };
                }
            }
        }
        
        // Fallback: calculate block position from intersection point
        const point = intersect.point;
        
        // Blocks are centered at integer coordinates (0, 1, 2, etc.)
        // The intersection point is on the surface, so we need to determine which block
        // contains this point. Since blocks are 1x1x1, we can use floor/ceil.
        const normal = intersect.face ? intersect.face.normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
        
        // Move point slightly inward (opposite of normal direction) to get inside the block
        // This ensures we're definitely inside the block, not on the surface
        const offset = 0.15;
        const blockPoint = point.clone().add(normal.clone().multiplyScalar(-offset));
        
        // Round to nearest integer - blocks are at integer coordinates
        // Use Math.round for proper rounding in both positive and negative directions
        const x = Math.round(blockPoint.x);
        const y = Math.round(blockPoint.y);
        const z = Math.round(blockPoint.z);
        
        return { x, y, z };
    }
    
    breakBlock() {
        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);
        
        this.updateBlockMeshesList();
        const intersects = this.raycaster.intersectObjects(this.blockMeshes, true);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const blockPos = this.getBlockPositionFromIntersection(intersect);
            
            // Verify block exists at this position
            if (this.world.isBlockAt(blockPos.x, blockPos.y, blockPos.z)) {
                this.world.removeBlock(blockPos.x, blockPos.y, blockPos.z);
                this.updateBlockMeshesList();
            }
        }
    }
    
    placeBlock() {
        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);
        
        this.updateBlockMeshesList();
        const intersects = this.raycaster.intersectObjects(this.blockMeshes, true);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const blockPos = this.getBlockPositionFromIntersection(intersect);
            const point = intersect.point;
            
            // Get face normal to determine which direction to place the block
            let normal = new THREE.Vector3(0, 1, 0);
            if (intersect.face) {
                normal = intersect.face.normal.clone();
            }
            
            // Normalize and round to get exact direction (-1, 0, or 1 for each axis)
            normal.normalize();
            const dirX = Math.abs(normal.x) > 0.5 ? (normal.x > 0 ? 1 : -1) : 0;
            const dirY = Math.abs(normal.y) > 0.5 ? (normal.y > 0 ? 1 : -1) : 0;
            const dirZ = Math.abs(normal.z) > 0.5 ? (normal.z > 0 ? 1 : -1) : 0;
            
            // If normal is not clear, use intersection point relative to block center
            let newX, newY, newZ;
            
            if (dirX !== 0 || dirY !== 0 || dirZ !== 0) {
                // Use face normal direction
                newX = blockPos.x + dirX;
                newY = blockPos.y + dirY;
                newZ = blockPos.z + dirZ;
            } else {
                // Fallback: calculate from intersection point offset
                const blockCenter = new THREE.Vector3(blockPos.x, blockPos.y, blockPos.z);
                const offset = point.clone().sub(blockCenter);
                
                // Find the axis with the largest absolute offset
                const absX = Math.abs(offset.x);
                const absY = Math.abs(offset.y);
                const absZ = Math.abs(offset.z);
                
                if (absX >= absY && absX >= absZ) {
                    newX = blockPos.x + (offset.x > 0 ? 1 : -1);
                    newY = blockPos.y;
                    newZ = blockPos.z;
                } else if (absY >= absX && absY >= absZ) {
                    newX = blockPos.x;
                    newY = blockPos.y + (offset.y > 0 ? 1 : -1);
                    newZ = blockPos.z;
                } else {
                    newX = blockPos.x;
                    newY = blockPos.y;
                    newZ = blockPos.z + (offset.z > 0 ? 1 : -1);
                }
            }
            
            // Verify the new position is actually adjacent (not the same)
            if (newX === blockPos.x && newY === blockPos.y && newZ === blockPos.z) {
                return; // Can't place block in the same position
            }
            
            // Don't place block where one already exists
            if (this.world.isBlockAt(newX, newY, newZ)) {
                return;
            }
            
            this.tryPlaceBlock(newX, newY, newZ);
        }
    }
    
    tryPlaceBlock(x, y, z) {
        // Don't place block where player is standing
        const playerPos = this.player.controls.getObject().position;
        const distance = Math.sqrt(
            Math.pow(x - playerPos.x, 2) +
            Math.pow(y - playerPos.y, 2) +
            Math.pow(z - playerPos.z, 2)
        );
        
        if (distance > 1.5) {
            this.world.addBlock(x, y, z, this.selectedBlock);
            this.updateBlockMeshesList();
        }
    }
    
    updateUI() {
        // FPS
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTime = currentTime;
            document.getElementById('fps').textContent = this.fps;
        }
        
        // Position
        const pos = this.player.controls.getObject().position;
        document.getElementById('position').textContent = 
            `${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`;
        
        // Block count
        document.getElementById('blocks').textContent = this.world.getBlockCount();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.player.update();
        
        // Update world chunks based on player position
        const playerPos = this.player.controls.getObject().position;
        this.world.updateChunks(playerPos);
        this.weatherSystem.update(playerPos);
        
        this.updateUI();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
