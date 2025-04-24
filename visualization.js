import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dom from './dom.js';
import * as audio from './audio.js'; // Need audio module for timing

// Visualization state
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let playerArea = null;
let noteObjects = [];
let obstacleObjects = [];
let noteSpeed = 10; // Speed at which notes travel towards player (units per beat)
let noteSpawnDistance = 50; // How far away notes spawn initially (in z-distance, approx)
let animationFrameId = null;
let mainStateRef = null; // Reference to the main app state
let updateProgressCallback = null; // Callback to update UI progress


// Set up Three.js environment
export function setupThreeJS(appState, setupVRControllersCallback, onSessionStartCallback, onSessionEndCallback) {
    mainStateRef = appState; // Store reference to main state

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Darker background

    // Create camera
    camera = new THREE.PerspectiveCamera(75, dom.canvasContainer.clientWidth / dom.canvasContainer.clientHeight, 0.1, 1000);
    // Position camera further back and slightly higher to view the incoming notes better
    camera.position.set(0, 1.6, 3); // Start behind the target (0,0,0) looking towards negative Z
    camera.lookAt(0, 1.0, -10); // Look down the track

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(dom.canvasContainer.clientWidth, dom.canvasContainer.clientHeight);
    renderer.xr.enabled = true;
    dom.canvasContainer.appendChild(renderer.domElement);

    // Add orbit controls for desktop view
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.0, -5); // Set target further down the track
    controls.enablePan = false; // Disable panning for a more fixed view
    controls.maxPolarAngle = Math.PI * 0.6; // Limit looking too high/low
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.update();

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x606060); // Slightly brighter ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 5, 2);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 3, 0); // Light near the player area
    scene.add(pointLight);

    // Add a ground plane representing the track
    const trackGeometry = new THREE.PlaneGeometry(8, 100); // Wider and longer track
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x222244, // Dark blueish-grey
        metalness: 0.2,
        roughness: 0.8,
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.rotation.x = -Math.PI / 2;
    track.position.y = -0.05; // Slightly below the player grid
    track.position.z = -45; // Extend far back
    scene.add(track);

    // Create player area visualization
    createPlayerArea();

    // Set up VR controllers if VR is supported (using the callback)
    if (appState.isVRSupported) {
        const vrButton = VRButton.createButton(renderer);
        document.body.appendChild(vrButton); // Add VR button to body

        // Setup VR controllers (using the provided callback)
        setupVRControllersCallback(renderer, scene);

        // Handle entering/exiting VR using callbacks
        renderer.xr.addEventListener('sessionstart', onSessionStartCallback);
        renderer.xr.addEventListener('sessionend', onSessionEndCallback);
    }

    // Start animation loop (but it won't update notes until playing)
    renderer.setAnimationLoop(render);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
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
    const currentContainer = mainStateRef.isInVR ? dom.vrCanvasContainer : dom.canvasContainer;
    const width = currentContainer.clientWidth;
    const height = currentContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

