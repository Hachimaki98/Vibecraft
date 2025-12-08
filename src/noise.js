// Simple Perlin-like noise generator for procedural terrain
export class NoiseGenerator {
    constructor(seed = null) {
        // Use provided seed or generate random seed
        this.seed = seed !== null ? seed : Math.floor(Math.random() * 1000000);
        this.permutation = this.generatePermutation();
    }
    
    generatePermutation() {
        // Create a shuffled array based on seed
        const array = [];
        for (let i = 0; i < 256; i++) {
            array[i] = i;
        }
        
        // Seeded shuffle
        let rng = this.seed;
        for (let i = 255; i > 0; i--) {
            rng = (rng * 1103515245 + 12345) & 0x7fffffff;
            const j = rng % (i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        
        // Duplicate the permutation array
        for (let i = 0; i < 256; i++) {
            array[256 + i] = array[i];
        }
        
        return array;
    }
    
    // Hash function for 2D coordinates
    hash(x, y) {
        const a = Math.floor(x) & 255;
        const b = Math.floor(y) & 255;
        return this.permutation[this.permutation[a] + b];
    }
    
    // Smooth interpolation
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // Gradient function
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    // 2D Perlin noise
    noise2D(x, y) {
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Get relative x, y coordinates of point within that cell
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        
        // Compute fade curves for each coordinate
        const u = this.fade(fx);
        const v = this.fade(fy);
        
        // Hash coordinates of the 4 square corners
        const A = this.hash(X, Y);
        const AA = A;
        const AB = this.hash(X, Y + 1);
        const B = this.hash(X + 1, Y);
        const BA = B;
        const BB = this.hash(X + 1, Y + 1);
        
        // And add blended results from 4 corners of the square
        return this.lerp(
            this.lerp(this.grad(AA, fx, fy), this.grad(BA, fx - 1, fy), u),
            this.lerp(this.grad(AB, fx, fy - 1), this.grad(BB, fx - 1, fy - 1), u),
            v
        );
    }
    
    // Octave noise (fractal noise) for more natural terrain
    octaveNoise2D(x, y, octaves = 4, persistence = 0.5, scale = 1.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
}

// Seeded random number generator
export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return (this.seed >>> 0) / 0x7fffffff;
    }
    
    // Random integer between min (inclusive) and max (exclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min)) + min;
    }
    
    // Random float between min (inclusive) and max (exclusive)
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }
}

