import * as THREE from 'three';

export class GreedyMesher {
    static createMeshGeometry(blocks, blockSize = 1, neighborCheck = null, isHalfHeight = false) {
        if (blocks.length === 0) return new THREE.BufferGeometry();
        
        const blockHeight = isHalfHeight ? 0.5 : 1.0;

        // 1. Determine bounds
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        const blockSet = new Set();
        blocks.forEach(b => {
            minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); minZ = Math.min(minZ, b.z);
            maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y); maxZ = Math.max(maxZ, b.z);
            blockSet.add(`${b.x},${b.y},${b.z}`);
        });

        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexOffset = 0;

        const faces = [
            { dir: [0, 1, 0], u: 0, v: 2, name: 'top' },    // y+ (u=x, v=z)
            { dir: [0, -1, 0], u: 0, v: 2, name: 'bottom' }, // y-
            { dir: [1, 0, 0], u: 2, v: 1, name: 'right' },  // x+ (u=z, v=y)
            { dir: [-1, 0, 0], u: 2, v: 1, name: 'left' },  // x-
            { dir: [0, 0, 1], u: 0, v: 1, name: 'front' },  // z+ (u=x, v=y)
            { dir: [0, 0, -1], u: 0, v: 1, name: 'back' }   // z-
        ];

        const hasBlock = (x, y, z) => blockSet.has(`${x},${y},${z}`);

        for (const face of faces) {
            const [dx, dy, dz] = face.dir;
            const uAxis = face.u;
            const vAxis = face.v;
            const dAxis = 3 - uAxis - vAxis; 
            
            const minU = uAxis === 0 ? minX : (uAxis === 1 ? minY : minZ);
            const maxU = uAxis === 0 ? maxX : (uAxis === 1 ? maxY : maxZ);
            const minV = vAxis === 0 ? minX : (vAxis === 1 ? minY : minZ);
            const maxV = vAxis === 0 ? maxX : (vAxis === 1 ? maxY : maxZ);
            const minD = dAxis === 0 ? minX : (dAxis === 1 ? minY : minZ);
            const maxD = dAxis === 0 ? maxX : (dAxis === 1 ? maxY : maxZ);

            for (let d = minD; d <= maxD; d++) {
                // mask[u][v] = boolean
                const mask = new Map();

                for (let u = minU; u <= maxU; u++) {
                    for (let v = minV; v <= maxV; v++) {
                        let x, y, z;
                        const coords = [0, 0, 0];
                        coords[dAxis] = d;
                        coords[uAxis] = u;
                        coords[vAxis] = v;
                        
                        x = coords[0];
                        y = coords[1];
                        z = coords[2];

                        if (hasBlock(x, y, z)) {
                            const nx = x + dx, ny = y + dy, nz = z + dz;
                            
                            let visible = true;
                            // Check internal occlusion (same chunk/same type)
                            if (hasBlock(nx, ny, nz)) {
                                visible = false;
                            } else if (neighborCheck) {
                                // External occlusion
                                // neighborCheck returns true if face should be culled
                                if (neighborCheck(nx, ny, nz)) {
                                    visible = false;
                                }
                            }

                            if (visible) {
                                mask.set(`${u},${v}`, { x, y, z });
                            }
                        }
                    }
                }

                // Greedy mesh
                const processed = new Set();
                
                for (let v = minV; v <= maxV; v++) {
                    for (let u = minU; u <= maxU; u++) {
                        if (mask.has(`${u},${v}`) && !processed.has(`${u},${v}`)) {
                            const startU = u;
                            const startV = v;
                            
                            // Width
                            let width = 1;
                            while (mask.has(`${u + width},${v}`) && !processed.has(`${u + width},${v}`) && (u + width <= maxU)) {
                                width++;
                            }

                            // Height
                            let height = 1;
                            let canExtend = true;
                            while (canExtend && (v + height <= maxV)) {
                                for (let k = 0; k < width; k++) {
                                    if (!mask.has(`${u + k},${v + height}`) || processed.has(`${u + k},${v + height}`)) {
                                        canExtend = false;
                                        break;
                                    }
                                }
                                if (canExtend) height++;
                            }

                            // Mark processed
                            for (let h = 0; h < height; h++) {
                                for (let w = 0; w < width; w++) {
                                    processed.add(`${u + w},${v + h}`);
                                }
                            }

                            // Add Quad
                            addQuad(
                                u, v, width, height,
                                d, dAxis, uAxis, vAxis,
                                dx, dy, dz,
                                blockSize,
                                vertices, normals, uvs, indices,
                                vertexOffset,
                                blockHeight
                            );
                            vertexOffset += 4;
                        }
                    }
                }
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        return geometry;
    }
}

function addQuad(u, v, width, height, d, dAxis, uAxis, vAxis, nx, ny, nz, blockSize, vertices, normals, uvs, indices, baseIndex, blockHeight = 1.0) {
    // Determine face offset
    let dPos = d;
    if (nx > 0 || ny > 0 || nz > 0) {
        // For half-height blocks, the top face (ny > 0) should be at d + blockHeight
        if (ny > 0) {
            dPos += blockHeight;
        } else {
            dPos += 1;
        }
    }

    const corners = [
        { u: 0, v: 0 },
        { u: width, v: 0 },
        { u: width, v: height },
        { u: 0, v: height }
    ];

    corners.forEach(c => {
        const pos = [0, 0, 0];
        pos[dAxis] = dPos;
        pos[uAxis] = u + c.u;
        pos[vAxis] = v + c.v;
        
        // For side faces of half-height blocks, scale the Y component
        // Side faces have vAxis = 1 (Y axis), and we need to scale the v dimension
        if (blockHeight < 1.0 && vAxis === 1) {
            // Scale the v (Y) coordinate by blockHeight
            pos[vAxis] = v + c.v * blockHeight;
        }
        
        vertices.push(pos[0] * blockSize, pos[1] * blockSize, pos[2] * blockSize);
        normals.push(nx, ny, nz);
        
        // UVs - repeat texture (scale v for half-height side faces)
        if (blockHeight < 1.0 && vAxis === 1) {
            uvs.push(c.u, c.v * blockHeight);
        } else {
            uvs.push(c.u, c.v);
        }
    });

    // Check winding order
    // +X (Right), +Y (Top), -Z (Back) need reverse winding for standard UV-axis mapping
    const reversed = (nx > 0 && ny === 0 && nz === 0) || 
                     (nx === 0 && ny > 0 && nz === 0) || 
                     (nx === 0 && ny === 0 && nz < 0);
    
    if (reversed) {
        indices.push(
            baseIndex, baseIndex + 2, baseIndex + 1,
            baseIndex, baseIndex + 3, baseIndex + 2
        );
    } else {
        indices.push(
            baseIndex, baseIndex + 1, baseIndex + 2,
            baseIndex, baseIndex + 2, baseIndex + 3
        );
    }
}
