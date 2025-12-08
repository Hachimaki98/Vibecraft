import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.weatherTypes = ['sunny', 'rain', 'snow'];
        this.currentWeatherIndex = 0;
        this.currentWeather = 'sunny';
        
        // Particle systems
        this.rainSystem = null;
        this.snowSystem = null;
        
        // Configuration
        this.particleCount = 15000;
        this.range = 40; // Box size around player
        
        this.initSystems();
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
            color: 0xaaaaaa,
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
            this.scene.fog.color.setHex(0xcccccc); // Whiteish grey
            this.scene.background.setHex(0xcccccc);
        }
    }
    
    update(playerPos) {
        if (this.currentWeather === 'sunny') return;
        
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
            if (positions[i * 3 + 1] < playerPos.y - 20) {
                positions[i * 3 + 1] = playerPos.y + 20;
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
        
        // Move the entire system container to follow rough area of player? 
        // No, we are updating individual particles relative to player. 
        // But we need to make sure the initial positions are near the player if we just switched.
        // Actually, the wrap logic handles it, but might take a frame to snap.
    }
}
