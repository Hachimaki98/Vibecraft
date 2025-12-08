import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';

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
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
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
        this.world.onBlockAdded = (mesh) => this.blockMeshes.push(mesh);
        this.world.onBlockRemoved = (mesh) => {
            const index = this.blockMeshes.indexOf(mesh);
            if (index > -1) this.blockMeshes.splice(index, 1);
        };
        // Populate blockMeshes with existing blocks from terrain generation
        this.world.blocks.forEach((mesh) => this.blockMeshes.push(mesh));
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
        this.selectedBlock = 'grass';
        
        // FPS counter
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        
        // Event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.animate();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('click', () => this.player.lock());
        
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
            const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'leaves'];
            const key = parseInt(event.key);
            if (key >= 1 && key <= 5) {
                this.selectedBlock = blockTypes[key - 1];
                document.querySelectorAll('.block-option').forEach((opt, idx) => {
                    opt.classList.toggle('active', idx === key - 1);
                });
            }
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    breakBlock() {
        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.blockMeshes);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const blockPos = intersect.object.userData.position;
            this.world.removeBlock(blockPos.x, blockPos.y, blockPos.z);
        }
    }
    
    placeBlock() {
        const center = new THREE.Vector2(0, 0);
        this.raycaster.setFromCamera(center, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.blockMeshes);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const blockPos = intersect.object.userData.position;
            const normal = intersect.face.normal;
            
            const newX = blockPos.x + Math.round(normal.x);
            const newY = blockPos.y + Math.round(normal.y);
            const newZ = blockPos.z + Math.round(normal.z);
            
            // Don't place block where player is standing
            const playerPos = this.player.controls.getObject().position;
            const distance = Math.sqrt(
                Math.pow(newX - playerPos.x, 2) +
                Math.pow(newY - playerPos.y, 2) +
                Math.pow(newZ - playerPos.z, 2)
            );
            
            if (distance > 1.5) {
                this.world.addBlock(newX, newY, newZ, this.selectedBlock);
            }
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
        this.updateUI();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
