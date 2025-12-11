import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class Player {
    constructor(camera, world) {
        this.camera = camera;
        this.world = world;
        
        this.controls = new PointerLockControls(camera, document.body);
        
        // Player physics
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.canJump = false;
        
        // Movement settings
        this.speed = 10.0;
        this.jumpVelocity = 8.0;
        this.gravity = 20.0;
        
        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        
        // Key bindings
        this.keyBindings = {
            forward: 'KeyW',
            backward: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            jump: 'Space',
            down: 'ShiftLeft'
        };

        // Player dimensions
        this.height = 1.7;
        this.radius = 0.3;
        
        // Set initial position - will be set after world generation
        this.controls.getObject().position.set(0, 20, 0);
        
        // Clock for delta time
        this.clock = new THREE.Clock();
        
        this.setupControls();
    }
    
    setupControls() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case this.keyBindings.forward:
                    this.moveForward = true;
                    break;
                case this.keyBindings.backward:
                    this.moveBackward = true;
                    break;
                case this.keyBindings.left:
                    this.moveLeft = true;
                    break;
                case this.keyBindings.right:
                    this.moveRight = true;
                    break;
                case this.keyBindings.jump:
                    if (this.canJump) {
                        this.velocity.y = this.jumpVelocity;
                        this.canJump = false;
                    }
                    break;
                case this.keyBindings.down:
                    this.moveDown = true;
                    break;
            }
        };
        
        const onKeyUp = (event) => {
            switch (event.code) {
                case this.keyBindings.forward:
                    this.moveForward = false;
                    break;
                case this.keyBindings.backward:
                    this.moveBackward = false;
                    break;
                case this.keyBindings.left:
                    this.moveLeft = false;
                    break;
                case this.keyBindings.right:
                    this.moveRight = false;
                    break;
                case this.keyBindings.down:
                    this.moveDown = false;
                    break;
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }
    
    setKeyBinding(action, keyCode) {
        if (!this.keyBindings.hasOwnProperty(action)) {
            return false;
        }
        // Prevent duplicate key bindings
        for (const [otherAction, otherKey] of Object.entries(this.keyBindings)) {
            if (otherAction !== action && otherKey === keyCode) {
                // Key code already assigned to another action
                return false;
            }
        }
        this.keyBindings[action] = keyCode;
        return true;
    }

    getKeyBindings() {
        return { ...this.keyBindings };
    }

    lock() {
        this.controls.lock();
    }
    
    checkCollision(position) {
        const feetY = position.y - this.height;
        const px = Math.floor(position.x);
        const pz = Math.floor(position.z);
        
        // Find the highest block below the player's feet in a 3x3 area
        let highestBlockY = -Infinity;
        let highestBlock = null;
        
        for (let x = px - 1; x <= px + 1; x++) {
            for (let z = pz - 1; z <= pz + 1; z++) {
                // Check from player's feet down to 30 blocks below
                for (let y = Math.floor(feetY) + 1; y >= Math.floor(feetY) - 30; y--) {
                    if (this.world.isBlockAt(x, y, z)) {
                        const blockTop = y + 0.5;
                        
                        // Check if player's feet are within horizontal bounds of this block
                        const dx = Math.abs(position.x - x);
                        const dz = Math.abs(position.z - z);
                        
                        if (dx < 0.5 + this.radius && dz < 0.5 + this.radius) {
                            // This block is under the player
                            if (y > highestBlockY) {
                                highestBlockY = y;
                                highestBlock = {
                                    x: x,
                                    y: y,
                                    z: z,
                                    top: blockTop
                                };
                            }
                            break; // Found the highest block at this x,z, move to next
                        }
                    }
                }
            }
        }
        
        // Check if player is standing on or should be standing on the highest block
        if (highestBlock !== null) {
            const blockTop = highestBlock.top;
            
            // If feet are at or below the block top (with small tolerance above for snapping)
            if (feetY <= blockTop + 0.3) {
                return {
                    collision: true,
                    block: new THREE.Vector3(highestBlock.x, highestBlock.y, highestBlock.z),
                    type: 'ground',
                    groundY: blockTop
                };
            }
        }
        
        // Check horizontal collision (walls) - check blocks around player body
        const bodyMinY = Math.floor(feetY);
        const bodyMaxY = Math.floor(position.y);
        
        for (let x = px - 1; x <= px + 1; x++) {
            for (let y = bodyMinY; y <= bodyMaxY + 1; y++) {
                for (let z = pz - 1; z <= pz + 1; z++) {
                    if (this.world.isBlockAt(x, y, z)) {
                        const blockCenter = new THREE.Vector3(x, y, z);
                        const dx = position.x - blockCenter.x;
                        const dz = position.z - blockCenter.z;
                        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                        
                        // Check if player body intersects with block horizontally
                        if (horizontalDist < this.radius + 0.5) {
                            // Check if player body height overlaps with block
                            if (position.y > y - 0.5 && feetY < y + 0.5) {
                                return {
                                    collision: true,
                                    block: blockCenter,
                                    type: 'horizontal'
                                };
                            }
                        }
                    }
                }
            }
        }
        
        return { collision: false };
    }
    
    update() {
        const delta = this.clock.getDelta();
        const position = this.controls.getObject().position;
        
        // Always check for ground collision, even when controls aren't locked
        // This prevents falling through ground before user clicks to start
        let collision = this.checkCollision(position);
        
        if (collision.collision && collision.type === 'ground') {
            // Standing on or in ground - snap to top of block
            const targetY = collision.groundY + this.height;
            if (position.y <= targetY + 0.1) {
                position.y = targetY;
                this.velocity.y = Math.max(0, this.velocity.y); // Don't allow downward velocity when on ground
                this.canJump = true;
            }
        }
        
        // Only process movement if controls are locked
        if (!this.controls.isLocked) {
            // Still apply gravity and check collision even when not locked
            this.velocity.y -= this.gravity * delta;
            position.y += this.velocity.y * delta;
            
            // Check collision after gravity
            collision = this.checkCollision(position);
            if (collision.collision && collision.type === 'ground') {
                position.y = collision.groundY + this.height;
                this.velocity.y = 0;
                this.canJump = true;
            }
            return;
        }
        
        // Apply gravity
        this.velocity.y -= this.gravity * delta;
        
        // Reset horizontal velocity
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Calculate movement direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        // Apply movement
        if (this.moveForward || this.moveBackward) {
            this.velocity.z = this.direction.z * this.speed;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x = this.direction.x * this.speed;
        }
        
        // Creative mode flying
        if (this.moveDown) {
            this.velocity.y = -this.speed;
        }
        
        // Move the player horizontally first
        this.controls.moveRight(this.velocity.x * delta);
        this.controls.moveForward(this.velocity.z * delta);
        
        // Check horizontal collision after horizontal movement
        collision = this.checkCollision(position);
        if (collision.collision && collision.type === 'horizontal') {
            // Hit a wall - push back
            const dx = position.x - collision.block.x;
            const dz = position.z - collision.block.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance > 0) {
                const pushDistance = this.radius + 0.5;
                position.x = collision.block.x + (dx / distance) * pushDistance;
                position.z = collision.block.z + (dz / distance) * pushDistance;
            }
        }
        
        // Apply vertical movement
        position.y += this.velocity.y * delta;
        
        // Check ground collision after vertical movement
        collision = this.checkCollision(position);
        
        if (collision.collision) {
            if (collision.type === 'ground') {
                // Standing on or falling into ground - snap to top of block
                const targetY = collision.groundY + this.height;
                if (position.y <= targetY + 0.1) {
                    position.y = targetY;
                    // Only stop downward velocity, allow upward (jumping)
                    if (this.velocity.y < 0) {
                        this.velocity.y = 0;
                    }
                    this.canJump = true;
                }
            }
        } else {
            // Not on ground
            this.canJump = false;
        }
        
        // Prevent falling through the world - respawn on terrain
        if (position.y < -10) {
            const spawnX = 0;
            const spawnZ = 0;
            const highestBlock = this.world.getHighestBlockAt(spawnX, spawnZ);
            if (highestBlock >= 0) {
                // Block center is at highestBlock, top is at highestBlock + 0.5
                // Player feet should be at top, so player center = top + height
                position.set(spawnX, highestBlock + 0.5 + this.height, spawnZ);
            } else {
                position.set(0, 10, 0);
            }
            this.velocity.y = 0;
        }
    }
}
