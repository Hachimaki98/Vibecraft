import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene, world = null) {
        this.scene = scene;
        this.world = world;
        this.weatherTypes = ['sunny', 'rain', 'snow'];
        this.currentWeatherIndex = 0;
        this.currentWeather = 'sunny';
        
        // Particle systems
        this.rainSystem = null;
        this.snowSystem = null;
        
        // Configuration
        this.particleCount = 15000;
        this.range = 40; // Box size around player
        this.particleVerticalRange = 20; // Vertical boundaries of weather effect relative to player
        
        // Snow accumulation settings
        this.snowAccumulationRadius = 20; // Radius around player to accumulate snow
        this.snowAccumulationInterval = 100; // ms between accumulation attempts
        this.snowBlocksPerTick = 3; // Number of snow blocks to try placing per tick
        this.lastAccumulationTime = 0;
        this.accumulatedSnowPositions = new Set(); // Track where we've added snow
        
        // Snow melting settings
        this.snowMeltInterval = 200; // ms between melt attempts (slower than accumulation)
        this.snowMeltPerTick = 2; // Number of snow blocks to melt per tick
        this.lastMeltTime = 0;
        
        // Block types that snow can accumulate on
        this.snowableBlocks = new Set(['grass', 'dirt', 'stone', 'leaves', 'sand', 'wood', 'plank', 'brick']);
        
        this.initSystems();
    }
    
    setWorld(world) {
        this.world = world;
    }
    
    initSystems() {
        // Rain System
        const rainGeo = new THREE.BufferGeometry();
        const rainPos = [];
        const rainVel = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * this.range;
            const y = (Math.random() - 0.5) * this.range;
            const z = (Math.random() - 0.5) * this.range;
            rainPos.push(x, y, z);
            rainVel.push(0, -0.5 - Math.random() * 0.5, 0); // Fast falling
        }
        
        rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPos, 3));
        rainGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(rainVel, 3));
        
        const rainMat = new THREE.PointsMaterial({
            color: 0x4a90e2, // Blue
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        this.rainSystem = new THREE.Points(rainGeo, rainMat);
        this.rainSystem.visible = false;
        this.scene.add(this.rainSystem);
        
        // Snow System
        const snowGeo = new THREE.BufferGeometry();
        const snowPos = [];
        const snowVel = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            const x = (Math.random() - 0.5) * this.range;
            const y = (Math.random() - 0.5) * this.range;
            const z = (Math.random() - 0.5) * this.range;
            snowPos.push(x, y, z);
            // Slower falling, slight drift
            snowVel.push((Math.random() - 0.5) * 0.1, -0.1 - Math.random() * 0.1, (Math.random() - 0.5) * 0.1); 
        }
        
        snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
        snowGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(snowVel, 3));
        
        const snowMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.8
        });
        
        this.snowSystem = new THREE.Points(snowGeo, snowMat);
        this.snowSystem.visible = false;
        this.scene.add(this.snowSystem);
    }
    
    cycleWeather() {
        this.currentWeatherIndex = (this.currentWeatherIndex + 1) % this.weatherTypes.length;
        this.setWeather(this.weatherTypes[this.currentWeatherIndex]);
        return this.currentWeather;
    }
    
    setWeather(type) {
        this.currentWeather = type;
        console.log(`Weather changed to: ${type}`);
        
        // Reset visibility
        this.rainSystem.visible = false;
        this.snowSystem.visible = false;
        
        // Update fog and background color based on weather
        if (type === 'sunny') {
            this.scene.fog.density = 0.005;
            this.scene.fog.color.setHex(0x87CEEB);
            this.scene.background.setHex(0x87CEEB);
        } else if (type === 'rain') {
            this.rainSystem.visible = true;
            this.scene.fog.density = 0.02; // Thicker fog
            this.scene.fog.color.setHex(0x667788); // Greyish
            this.scene.background.setHex(0x667788);
        } else if (type === 'snow') {
            this.snowSystem.visible = true;
            this.scene.fog.density = 0.03; // Thickest fog
            this.scene.fog.color.setHex(0xcccccc); // Whitish grey
            this.scene.background.setHex(0xcccccc);
        }
    }
    
    update(playerPos) {
        // Melt snow when sunny
        if (this.currentWeather === 'sunny') {
            this.meltSnow(playerPos);
            return;
        }
        
        const activeSystem = this.currentWeather === 'rain' ? this.rainSystem : this.snowSystem;
        const positions = activeSystem.geometry.attributes.position.array;
        const velocities = activeSystem.geometry.attributes.velocity.array;
        
        for (let i = 0; i < this.particleCount; i++) {
            // Update positions
            positions[i * 3] += velocities[i * 3];     // x
            positions[i * 3 + 1] += velocities[i * 3 + 1]; // y
            positions[i * 3 + 2] += velocities[i * 3 + 2]; // z
            
            // Boundary checks relative to player to create infinite effect
            // If particle goes too far below player, move it to top
            if (positions[i * 3 + 1] < playerPos.y - this.particleVerticalRange) {
                positions[i * 3 + 1] = playerPos.y + this.particleVerticalRange;
                positions[i * 3] = playerPos.x + (Math.random() - 0.5) * this.range;
                positions[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * this.range;
            }
            
            // Wrap X and Z around player
            if (Math.abs(positions[i * 3] - playerPos.x) > this.range / 2) {
                positions[i * 3] = playerPos.x - Math.sign(positions[i * 3] - playerPos.x) * (this.range / 2);
            }
            
            if (Math.abs(positions[i * 3 + 2] - playerPos.z) > this.range / 2) {
                positions[i * 3 + 2] = playerPos.z - Math.sign(positions[i * 3 + 2] - playerPos.z) * (this.range / 2);
            }
        }
        
        activeSystem.geometry.attributes.position.needsUpdate = true;
        
        // Accumulate snow during snowy weather
        if (this.currentWeather === 'snow') {
            this.accumulateSnow(playerPos);
        }
    }
    
    accumulateSnow(playerPos) {
        if (!this.world) return;
        
        const now = performance.now();
        if (now - this.lastAccumulationTime < this.snowAccumulationInterval) return;
        this.lastAccumulationTime = now;
        
        const radius = this.snowAccumulationRadius;
        const playerX = Math.floor(playerPos.x);
        const playerZ = Math.floor(playerPos.z);
        
        // Try to place a few snow blocks per tick
        let placed = 0;
        const maxAttempts = this.snowBlocksPerTick * 10; // Allow more attempts to find valid spots
        
        for (let attempt = 0; attempt < maxAttempts && placed < this.snowBlocksPerTick; attempt++) {
            // Pick a random position within radius
            const x = playerX + Math.floor((Math.random() - 0.5) * radius * 2);
            const z = playerZ + Math.floor((Math.random() - 0.5) * radius * 2);
            
            // Find the highest block at this x,z
            const highestY = this.world.getHighestBlockAt(x, z);
            if (highestY < 0) continue;
            
            const block = this.world.getBlock(x, highestY, z);
            if (!block) continue;
            
            // Don't place snow on water or existing snow
            if (block.type === 'water' || block.type === 'snow') continue;
            
            // Check if this is a snowable block type
            if (!this.snowableBlocks.has(block.type)) continue;
            
            // Position for the snow block (on top of the highest block)
            const snowY = highestY + 1;
            const snowKey = `${x},${snowY},${z}`;
            
            // Don't place if we already placed snow here
            if (this.accumulatedSnowPositions.has(snowKey)) continue;
            
            // Don't place if there's already a block there
            if (this.world.isBlockAt(x, snowY, z)) continue;
            
            // Place snow block
            this.world.addBlock(x, snowY, z, 'snow');
            this.accumulatedSnowPositions.add(snowKey);
            placed++;
        }
    }
    
    meltSnow(playerPos) {
        if (!this.world) return;
        if (this.accumulatedSnowPositions.size === 0) return;
        
        const now = performance.now();
        if (now - this.lastMeltTime < this.snowMeltInterval) return;
        this.lastMeltTime = now;
        
        // Convert set to array for random access
        const snowPositions = Array.from(this.accumulatedSnowPositions);
        
        // Melt a few snow blocks per tick
        const toMelt = Math.min(this.snowMeltPerTick, snowPositions.length);
        
        for (let i = 0; i < toMelt; i++) {
            // Pick a random snow position to melt
            const randomIndex = Math.floor(Math.random() * snowPositions.length);
            const snowKey = snowPositions[randomIndex];
            
            // Parse position from key
            const [x, y, z] = snowKey.split(',').map(Number);
            
            // Verify it's still a snow block (player might have broken it)
            const block = this.world.getBlock(x, y, z);
            if (block && block.type === 'snow') {
                this.world.removeBlock(x, y, z);
            }
            
            // Remove from tracking
            this.accumulatedSnowPositions.delete(snowKey);
            
            // Remove from our working array to avoid picking it again this tick
            snowPositions.splice(randomIndex, 1);
        }
    }
}
