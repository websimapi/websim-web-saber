// Note and obstacle creation functionality
import * as THREE from 'three';
import { state } from './app.js';
import { logStatus } from './app.js';
import { updateVisualization } from './app.js';

// Clear visualization
export function clearVisualization() {
    // Remove existing notes and obstacles
    state.noteObjects.forEach(note => {
        state.scene.remove(note);
    });
    
    state.obstacleObjects.forEach(obstacle => {
        state.scene.remove(obstacle);
    });
    
    state.noteObjects = [];
    state.obstacleObjects = [];
}

// Create a visual representation of the player area
export function createPlayerArea() {
    // Remove existing player area if present
    if (state.playerArea) {
        state.scene.remove(state.playerArea);
        state.playerArea = null;
    }
    
    // Create a group to hold all player area elements
    const playerArea = new THREE.Group();
    
    // Create a floor plate
    const floorGeometry = new THREE.PlaneGeometry(4, 4);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    playerArea.add(floor);
    
    // Create grid for the playable area (4x3 grid)
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });
    
    // Horizontal lines
    for (let i = 0; i <= 3; i++) {
        const y = i * 0.6;
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1.2, y, 0),
            new THREE.Vector3(1.2, y, 0)
        ]);
        const line = new THREE.Line(lineGeometry, gridMaterial);
        playerArea.add(line);
    }
    
    // Vertical lines
    for (let i = 0; i <= 4; i++) {
        const x = (i - 2) * 0.6;
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(x, 1.8, 0)
        ]);
        const line = new THREE.Line(lineGeometry, gridMaterial);
        playerArea.add(line);
    }
    
    // Add the player area to the scene
    state.scene.add(playerArea);
    state.playerArea = playerArea;
}

// Prepare visualization
export function prepareVisualization(diffData) {
    try {
        // Debug the structure of the data
        logStatus("Preparing map visualization...");
        
        // Handle different Beat Saber map formats
        // Check for v2 format (_notes property)
        if (diffData._notes && Array.isArray(diffData._notes)) {
            logStatus("Using V2 note format (_notes)");
            diffData._notes.forEach(note => {
                createNoteObject(note);
            });
        } 
        // Check for v3 format (colorNotes property)
        else if (diffData.colorNotes && Array.isArray(diffData.colorNotes)) {
            logStatus("Using V3 note format (colorNotes)");
            diffData.colorNotes.forEach(note => {
                createNoteObjectV3(note);
            });
        } else {
            logStatus("No notes found or unsupported format in the difficulty file", true);
            console.warn("Difficulty data:", diffData);
        }
        
        // Handle obstacles (walls)
        if (diffData._obstacles && Array.isArray(diffData._obstacles)) {
            logStatus("Using V2 obstacle format (_obstacles)");
            diffData._obstacles.forEach(obstacle => {
                createObstacleObject(obstacle);
            });
        } 
        else if (diffData.obstacles && Array.isArray(diffData.obstacles)) {
            logStatus("Using V3 obstacle format (obstacles)");
            diffData.obstacles.forEach(obstacle => {
                createObstacleObjectV3(obstacle);
            });
        }
        
        logStatus(`Map visualization ready: ${state.noteObjects.length} notes, ${state.obstacleObjects.length} obstacles`);
    } catch (error) {
        logStatus(`Error preparing visualization: ${error.message}`, true);
        console.error("Error in prepareVisualization:", error);
    }
}

// Create a 3D object for a note (v2 format)
function createNoteObject(noteData) {
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    
    // Red for left hand, blue for right hand
    const material = new THREE.MeshLambertMaterial({ 
        color: noteData._type === 0 ? 0xff0055 : 0x00a1ff,
        emissive: noteData._type === 0 ? 0x660022 : 0x003366,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on note data
    // Convert from Beat Saber coordinate system to Three.js
    mesh.position.x = (noteData._lineIndex - 1.5) * 0.6; // Center on the grid
    mesh.position.y = (noteData._lineLayer * 0.6) + 0.2;  // Height starts at 0.2
    mesh.position.z = noteData._time * state.noteSpeed;  // Notes come from positive z
    
    // Store the beat time for animation
    mesh.userData = {
        beatTime: noteData._time,
        type: 'note'
    };
    
    // Add direction indicator
    addDirectionIndicator(mesh, noteData._cutDirection);
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.noteObjects.push(mesh);
    
    return mesh;
}

// Create a 3D object for a note (v3 format)
function createNoteObjectV3(noteData) {
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    
    // Red for left hand, blue for right hand (assuming color 0 = red, 1 = blue)
    const material = new THREE.MeshLambertMaterial({ 
        color: noteData.color === 0 ? 0xff0055 : 0x00a1ff,
        emissive: noteData.color === 0 ? 0x660022 : 0x003366,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on V3 note data
    // In V3, positions are stored in x,y,z properties
    mesh.position.x = (noteData.x - 1.5) * 0.6; // Center on the grid
    mesh.position.y = (noteData.y * 0.6) + 0.2;  // Height starts at 0.2
    mesh.position.z = noteData.b * state.noteSpeed;  // Notes come from positive z
    
    // Store the beat time for animation
    mesh.userData = {
        beatTime: noteData.b,
        type: 'note'
    };
    
    // Add direction indicator (in V3, it's "d" for direction)
    addDirectionIndicator(mesh, noteData.d);
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.noteObjects.push(mesh);
    
    return mesh;
}

// Add a direction indicator to a note
function addDirectionIndicator(noteMesh, direction) {
    // Skip for dot notes (direction 8)
    if (direction === 8) return;
    
    const arrowGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Position at the center of the note
    arrow.position.set(0, 0, -0.2); // Move to front face of cube (-z direction)
    
    // Rotate based on direction - fix the rotation to match Beat Saber
    // 0 = up, 1 = down, 2 = left, 3 = right,
    // 4 = up-left, 5 = up-right, 6 = down-left, 7 = down-right
    switch (direction) {
        case 0: // Up
            arrow.rotation.x = -Math.PI / 2;
            break;
        case 1: // Down
            arrow.rotation.x = Math.PI / 2;
            break;
        case 2: // Left
            arrow.rotation.z = -Math.PI / 2;
            break;
        case 3: // Right
            arrow.rotation.z = Math.PI / 2;
            break;
        case 4: // Up-Left
            arrow.rotation.x = -Math.PI / 4;
            arrow.rotation.z = -Math.PI / 4;
            break;
        case 5: // Up-Right
            arrow.rotation.x = -Math.PI / 4;
            arrow.rotation.z = Math.PI / 4;
            break;
        case 6: // Down-Left
            arrow.rotation.x = Math.PI / 4;
            arrow.rotation.z = -Math.PI / 4;
            break;
        case 7: // Down-Right
            arrow.rotation.x = Math.PI / 4;
            arrow.rotation.z = Math.PI / 4;
            break;
    }
    
    noteMesh.add(arrow);
}

// Create a 3D object for an obstacle (v2 format)
function createObstacleObject(obstacleData) {
    const width = obstacleData._width * 0.6;
    const height = obstacleData._type === 0 ? 3.0 : 1.0; // Full height or half height
    const depth = obstacleData._duration * 2.0;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on obstacle data
    mesh.position.x = (obstacleData._lineIndex - 1.5) * 0.6 + (width / 2) - 0.3;
    mesh.position.y = (height / 2);
    mesh.position.z = obstacleData._time * state.noteSpeed + (depth / 2);
    
    // Store the beat time for animation
    mesh.userData = {
        beatTime: obstacleData._time,
        duration: obstacleData._duration,
        type: 'obstacle'
    };
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.obstacleObjects.push(mesh);
    
    return mesh;
}

// Create a 3D object for an obstacle (v3 format)
function createObstacleObjectV3(obstacleData) {
    // In V3, wall width is defined by w, height by h, and duration by d
    const width = obstacleData.w * 0.6;
    const height = obstacleData.h * 0.6;
    const depth = obstacleData.d * 2.0;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on V3 obstacle data
    mesh.position.x = (obstacleData.x - 1.5) * 0.6 + (width / 2) - 0.3;
    mesh.position.y = obstacleData.y * 0.6 + (height / 2);
    mesh.position.z = obstacleData.b * state.noteSpeed + (depth / 2); // b is the beat time
    
    // Store the beat time for animation
    mesh.userData = {
        beatTime: obstacleData.b,
        duration: obstacleData.d,
        type: 'obstacle'
    };
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.obstacleObjects.push(mesh);
    
    return mesh;
}

// Animation loop
export function animate() {
    if (!state.isPlaying) return;
    
    requestAnimationFrame(animate);
    updateVisualization();
}