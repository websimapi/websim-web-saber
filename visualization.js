import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import * as dom from './dom.js';

// Visualization state
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let playerArea = null;
let noteObjects = [];
let obstacleObjects = [];
let noteSpeed = 10; // Speed at which notes travel towards player 
let noteSpawnDistance = 50; // How far away notes spawn initially
let animationFrameId = null;
let mainStateRef = null; // Reference to the main app state
let updateProgressCallback = null; // Callback to update UI progress

// Set up Three.js environment
export function setupThreeJS(appState) {
    mainStateRef = appState; // Store reference to main state

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, dom.canvasContainer.clientWidth / dom.canvasContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 1.0, -10);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(dom.canvasContainer.clientWidth, dom.canvasContainer.clientHeight);
    renderer.xr.enabled = true;
    dom.canvasContainer.appendChild(renderer.domElement);

    // Add orbit controls for desktop view
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, -5);
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.update();

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 5, 2);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 3, 0);
    scene.add(pointLight);

    // Add a ground plane representing the track
    const trackGeometry = new THREE.PlaneGeometry(8, 100);
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x222244,
        metalness: 0.2,
        roughness: 0.8,
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.position.y = -0.05;
    track.position.z = -45;
    scene.add(track);

    // Create player area visualization
    createPlayerArea();

    // Add VR support if available
    if (appState.isVRSupported) {
        const vrButton = VRButton.createButton(renderer);
        document.body.appendChild(vrButton);

        // Set up VR event handlers if needed
        setupVREventHandlers();
    }

    // Start animation loop (but it won't update notes until playing)
    renderer.setAnimationLoop(render);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function setupVREventHandlers() {
    // Logic for VR session events
    renderer.xr.addEventListener('sessionstart', () => {
        if (typeof onSessionStart === 'function') onSessionStart();
    });

    renderer.xr.addEventListener('sessionend', () => {
        if (typeof onSessionEnd === 'function') onSessionEnd();
    });
}

// Create a visual representation of the player area (target zone)
export function createPlayerArea() {
    if (playerArea) {
        scene.remove(playerArea);
        playerArea = null;
    }

    playerArea = new THREE.Group();

    // Target line at z=0
    const targetLineMat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const targetLineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.2 - 0.1, 0, 0), // Extend slightly beyond grid
        new THREE.Vector3(1.2 + 0.1, 0, 0)
    ]);
    const targetLine = new THREE.Line(targetLineGeom, targetLineMat);
    playerArea.add(targetLine);

     // Grid lines for the playable area (4x3)
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
    const gridYOffset = 0.01; // Slightly above the track plane

    // Horizontal lines (Layers)
    for (let i = 0; i <= 2; i++) { // 3 layers (0, 1, 2) -> 3 lines
        const y = i * 0.6; // Height step
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1.2, y + gridYOffset, 0), // x = -2 * 0.6 = -1.2
            new THREE.Vector3(1.2, y + gridYOffset, 0)   // x =  2 * 0.6 =  1.2
        ]);
        playerArea.add(new THREE.Line(lineGeometry, gridMaterial));
    }

    // Vertical lines (Indexes)
    for (let i = 0; i <= 4; i++) { // 4 indexes (0, 1, 2, 3) -> 5 lines
        const x = (i - 2) * 0.6; // Center the grid around x=0
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0 + gridYOffset, 0),
            new THREE.Vector3(x, 1.2 + gridYOffset, 0) // Max height (2 * 0.6)
        ]);
        playerArea.add(new THREE.Line(lineGeometry, gridMaterial));
    }

    scene.add(playerArea);
}

// Handle window resize
export function onWindowResize() {
    if (!camera || !renderer) return;

    // Determine current container based on VR state (using mainStateRef)
    const currentContainer = mainStateRef && mainStateRef.isInVR ? dom.vrCanvasContainer : dom.canvasContainer;
    const width = currentContainer.clientWidth;
    const height = currentContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Clear all notes and obstacles
export function clearVisualization() {
    // Remove note objects
    noteObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    noteObjects = [];

    // Remove obstacle objects
    obstacleObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    obstacleObjects = [];
}

// Prepare notes and obstacles for visualization
export function prepareVisualization(diffData, beatLength, logStatus) {
    try {
        // Process notes
        if (Array.isArray(diffData._notes)) {
            diffData._notes.forEach(note => {
                createNoteObject(note, beatLength);
            });
            logStatus(`Created ${noteObjects.length} note objects`);
        } else {
            logStatus("No notes found in the difficulty data", true);
        }

        // Process obstacles (walls)
        if (Array.isArray(diffData._obstacles)) {
            diffData._obstacles.forEach(obstacle => {
                createObstacleObject(obstacle, beatLength);
            });
            logStatus(`Created ${obstacleObjects.length} obstacle objects`);
        }
    } catch (error) {
        logStatus(`Error preparing visualization: ${error.message}`, true);
        console.error("Visualization preparation error:", error);
    }
}

// Create a 3D note object
function createNoteObject(noteData, beatLength) {
    // Define note size
    const size = 0.5;
    
    // Create note geometry - this is a block
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Create note material based on type (0 = red, 1 = blue)
    const material = new THREE.MeshStandardMaterial({
        color: noteData._type === 0 ? 0xff0000 : 0x0000ff,
        emissive: noteData._type === 0 ? 0x330000 : 0x000033,
        metalness: 0.3,
        roughness: 0.4,
    });
    
    // Create note mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the note based on its lane and layer
    // Horizontal position (_lineIndex: 0, 1, 2, 3)
    // Vertical position (_lineLayer: 0, 1, 2)
    const x = (noteData._lineIndex - 1.5) * 0.6; // Center the grid
    const y = noteData._lineLayer * 0.6;
    const z = -noteData._time * noteSpeed - noteSpawnDistance; // Position based on time
    
    mesh.position.set(x, y + size/2, z); // Add size/2 to y to place bottom of box on the grid
    
    // Add direction arrow based on _cutDirection
    // 0: up, 1: down, 2: left, 3: right, 4: up-left, 5: up-right, 6: down-left, 7: down-right, 8: dot
    addDirectionIndicator(mesh, noteData._cutDirection);
    
    // Rotate based on direction
    switch(noteData._cutDirection) {
        case 0: // Up
            mesh.rotation.z = 0;
            break;
        case 1: // Down
            mesh.rotation.z = Math.PI;
            break;
        case 2: // Left
            mesh.rotation.z = Math.PI / 2;
            break;
        case 3: // Right
            mesh.rotation.z = -Math.PI / 2;
            break;
        case 4: // Up-Left
            mesh.rotation.z = Math.PI / 4;
            break;
        case 5: // Up-Right
            mesh.rotation.z = -Math.PI / 4;
            break;
        case 6: // Down-Left
            mesh.rotation.z = 3 * Math.PI / 4;
            break;
        case 7: // Down-Right
            mesh.rotation.z = -3 * Math.PI / 4;
            break;
        case 8: // Dot (no direction)
            // No rotation needed
            break;
    }
    
    // Store original time for animation
    mesh.userData = {
        time: noteData._time,
        type: noteData._type,
        cutDirection: noteData._cutDirection
    };
    
    // Add to scene and note objects array
    scene.add(mesh);
    noteObjects.push(mesh);
    
    return mesh;
}

// Add direction indicator to a note
function addDirectionIndicator(noteMesh, direction) {
    // For dot (8), don't add an arrow
    if (direction === 8) {
        const dotGeometry = new THREE.CircleGeometry(0.1, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.z = 0.251; // Slightly in front of the note
        dot.rotation.x = Math.PI / 2; // Rotate to face forward
        noteMesh.add(dot);
        return;
    }
    
    // For directional notes, add an arrow
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Create arrow shape
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.15);
    arrowShape.lineTo(0.1, -0.05);
    arrowShape.lineTo(0.03, -0.05);
    arrowShape.lineTo(0.03, -0.15);
    arrowShape.lineTo(-0.03, -0.15);
    arrowShape.lineTo(-0.03, -0.05);
    arrowShape.lineTo(-0.1, -0.05);
    arrowShape.lineTo(0, 0.15);
    
    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    arrow.position.z = 0.251; // Slightly in front of the note
    
    noteMesh.add(arrow);
}

// Create a 3D obstacle object (wall)
function createObstacleObject(obstacleData, beatLength) {
    // Obstacles have width, height and duration
    const width = obstacleData._width * 0.6; // Width in lanes
    const height = obstacleData._type === 0 ? 1.8 : 0.6; // Full height or crouch obstacle
    const duration = obstacleData._duration || 0.5; // Duration in beats
    const depth = duration * noteSpeed; // Convert duration to depth
    
    // Create geometry - longer in z direction to represent duration
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Create material - semi-transparent red
    const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        emissive: 0x330000,
    });
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the obstacle based on its lane (_lineIndex), type, and time
    const x = (obstacleData._lineIndex - 1.5 + (obstacleData._width - 1) / 2) * 0.6; // Adjust center based on width
    const y = height / 2; // Bottom of obstacle on ground
    const z = -obstacleData._time * noteSpeed - noteSpawnDistance; // Position based on time
    // Adjust z to center the obstacle over its duration
    const zOffset = depth / 2;
    
    mesh.position.set(x, y, z - zOffset);
    
    // Store original time for animation
    mesh.userData = {
        time: obstacleData._time,
        duration: duration,
        type: obstacleData._type
    };
    
    // Add to scene and obstacle objects array
    scene.add(mesh);
    obstacleObjects.push(mesh);
    
    return mesh;
}

// Reset note positions (for restarting playback)
export function resetNotePositions() {
    if (!mainStateRef || !mainStateRef.currentDifficulty || !mainStateRef.beatLength) {
        console.error("Cannot reset note positions: missing state or difficulty data");
        return;
    }
    
    // Clear existing objects
    clearVisualization();
    
    // Recreate all objects
    prepareVisualization(
        mainStateRef.currentDifficulty, 
        mainStateRef.beatLength, 
        msg => console.log(msg)
    );
}

// Start the animation loop
export function startAnimationLoop(state, progressCallback) {
    // Store the progress callback if provided
    if (progressCallback) {
        updateProgressCallback = progressCallback;
    }
    
    // Animation is handled by the renderer's animation loop
    // We just need to set the state to playing
    mainStateRef = state;
}

// Animation loop - called by Three.js renderer
function render() {
    // Update note positions based on current beat
    if (mainStateRef && mainStateRef.isPlaying) {
        // Get audio context and beat length from state
        const audioModule = window.audioModuleRef;
        const beatLength = mainStateRef.beatLength || 0;
        
        // Update note positions
        const currentBeat = getCurrentBeat();
        updateNotePositions(currentBeat);
        
        // Call progress callback if available
        if (typeof updateProgressCallback === 'function') {
            updateProgressCallback(mainStateRef);
        }
    }
    
    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Update positions of all notes based on current beat
function updateNotePositions(currentBeat) {
    // Update note objects
    noteObjects.forEach(note => {
        const noteBeat = note.userData.time;
        const zPosition = -(noteBeat - currentBeat) * noteSpeed;
        note.position.z = zPosition;
    });
    
    // Update obstacle objects
    obstacleObjects.forEach(obstacle => {
        const obstacleBeat = obstacle.userData.time;
        const duration = obstacle.userData.duration;
        const depth = duration * noteSpeed;
        const zPosition = -(obstacleBeat - currentBeat) * noteSpeed;
        obstacle.position.z = zPosition - depth / 2; // Adjust for center position
    });
}

// Get current beat time (either from audio or manually calculated)
function getCurrentBeat() {
    if (!mainStateRef || !mainStateRef.isPlaying) return 0;
    
    const audioCtx = window.audioContext;
    const startTime = window.startTime || 0;
    const beatLength = mainStateRef.beatLength || 0;
    
    if (!audioCtx || beatLength <= 0) return 0;
    
    const currentTime = audioCtx.currentTime - startTime;
    return currentTime / beatLength;
}