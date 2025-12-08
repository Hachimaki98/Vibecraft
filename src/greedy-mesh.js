// Greedy meshing algorithm to combine adjacent block faces
// This reduces geometry by only rendering visible faces
import * as THREE from 'three';

export class GreedyMesher {
    static createMeshGeometry(blocks, blockSize = 1, neighborCheck = null) {
        const vertices = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const blockIds = []; // Store which block each vertex belongs to
        let vertexOffset = 0;

        // Group blocks by type for material assignment
        const blocksByType = new Map();
        blocks.forEach(({ x, y, z, type }) => {
            if (!blocksByType.has(type)) {
                blocksByType.set(type, []);
            }
            blocksByType.get(type).push({ x, y, z });
        });

        // Process each block type separately
        blocksByType.forEach((typeBlocks, type) => {
            // Create a set for fast lookup of blocks within this mesh group
            const blockSet = new Set();
            typeBlocks.forEach(({ x, y, z }) => {
                const key = `${x},${y},${z}`;
                blockSet.add(key);
            });

            // Check each block for visible faces
            typeBlocks.forEach(({ x, y, z }) => {
                // Check each face (6 faces of a cube)
                const faces = [
                    { dir: [0, 1, 0], corners: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]] }, // top
                    { dir: [0, -1, 0], corners: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]] }, // bottom
                    { dir: [1, 0, 0], corners: [[1,1,0], [1,1,1], [1,0,1], [1,0,0]] }, // right
                    { dir: [-1, 0, 0], corners: [[0,1,1], [0,1,0], [0,0,0], [0,0,1]] }, // left
                    { dir: [0, 0, 1], corners: [[0,1,1], [0,0,1], [1,0,1], [1,1,1]] }, // front
                    { dir: [0, 0, -1], corners: [[1,1,0], [1,0,0], [0,0,0], [0,1,0]] }  // back
                ];

                faces.forEach((face) => {
                    const [dx, dy, dz] = face.dir;
                    const neighborX = x + dx;
                    const neighborY = y + dy;
                    const neighborZ = z + dz;

                    // Face is visible if neighbor doesn't exist
                    // First check internal block set (same type in same batch)
                    let hasNeighbor = blockSet.has(`${neighborX},${neighborY},${neighborZ}`);
                    
                    // If not found internally, check external neighborCheck if provided
                    if (!hasNeighbor && neighborCheck) {
                        hasNeighbor = neighborCheck(neighborX, neighborY, neighborZ);
                    }

                    if (!hasNeighbor) {
                        // Add face vertices
                        face.corners.forEach(([cx, cy, cz]) => {
                            const px = (x + cx) * blockSize;
                            const py = (y + cy) * blockSize;
                            const pz = (z + cz) * blockSize;

                            vertices.push(px, py, pz);
                            normals.push(...face.dir);
                            uvs.push(cx, cy);
                            // Store block position for each vertex
                            blockIds.push(x, y, z);
                        });

                        // Add face indices (two triangles)
                        const base = vertexOffset;
                        indices.push(
                            base, base + 1, base + 2,
                            base, base + 2, base + 3
                        );
                        vertexOffset += 4;
                    }
                });
            });
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        
        // Store block IDs as custom attribute for raycasting
        geometry.setAttribute('blockId', new THREE.Float32BufferAttribute(blockIds, 3));
        geometry.computeBoundingSphere();

        return geometry;
    }
}
