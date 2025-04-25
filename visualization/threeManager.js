import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { state } from '../state.js';
import { setupVRControllers, checkSaberNoteCollisions } from '../vr/vrController.js';
import { setupVRPlayerPosition } from '../vr/vrManager.js';
import { logStatus } from '../utils/logger.js';

// Set up Three.js environment
export function setupThreeJS() {
    const canvasContainer = document.getElementById('canvas-container');
    
    // Create scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x000000);
    
    // Add fog for depth effect
    state.scene.fog = new THREE.Fog(0x000000, 5, 30);
    
    // Create camera
    state.camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    state.camera.position.set(0, 1.6, -3); // Standard position for desktop view
    
    // Create renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    state.renderer.xr.enabled = true;
    state.renderer.shadowMap.enabled = true;
    canvasContainer.appendChild(state.renderer.domElement);
    
    // Add orbit controls for desktop
    const controls = new OrbitControls(state.camera, state.renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.update();
    state.controls = controls;
    
    // Add lighting
    setupLighting();
    
    // Add a grid
    const gridHelper = new THREE.GridHelper(20, 20);
    state.scene.add(gridHelper);
    
    // Add VR environment
    addVREnvironment();
    
    // Add VR button if supported
    if (state.isVRSupported) {
        const vrButton = VRButton.createButton(state.renderer);
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.right = '20px';
        vrButton.style.zIndex = '100';
        document.body.appendChild(vrButton);
        
        // Set up VR controllers
        setupVRControllers();
        
        // Handle VR session events
        setupVRSessionEvents();
        
        // Setup VR player position
        setupVRPlayerPosition();
        
        logStatus("VR integration ready");
    }
    
    // Start animation loop
    state.renderer.setAnimationLoop(render);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Setup lighting for the scene
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    state.scene.add(ambientLight);
    
    // Main directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 10, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    state.scene.add(directionalLight);
    
    // Additional point lights for atmosphere
    const colors = [0xff0055, 0x00a1ff, 0x7700ff];
    
    colors.forEach((color, index) => {
        const light = new THREE.PointLight(color, 0.5, 10);
        light.position.set(
            Math.sin(index * Math.PI * 2 / 3) * 5,
            2 + index,
            Math.cos(index * Math.PI * 2 / 3) * 5
        );
        state.scene.add(light);
    });
}

// Create environment elements for VR mode
function addVREnvironment() {
    // Create a more immersive environment for VR
    const environmentGroup = new THREE.Group();
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.2,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001; // Slightly below origin to avoid z-fighting with the grid
    floor.receiveShadow = true;
    environmentGroup.add(floor);
    
    // Add distant neon-style elements
    const neonColors = [0xff0055, 0x00a1ff, 0x7700ff, 0x00ff77];
    
    for (let i = 0; i < 20; i++) {
        const color = neonColors[i % neonColors.length];
        const geometry = new THREE.BoxGeometry(0.5, Math.random() * 5 + 1, 0.5);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        const pillar = new THREE.Mesh(geometry, material);
        const distance = 15 + Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        
        pillar.position.set(
            Math.sin(angle) * distance,
            geometry.parameters.height / 2,
            Math.cos(angle) * distance
        );
        
        environmentGroup.add(pillar);
    }
    
    // Add skybox
    const skyGeometry = new THREE.SphereGeometry(40, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.8
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    environmentGroup.add(sky);
    
    // Add stars
    const starsGroup = new THREE.Group();
    
    for (let i = 0; i < 500; i++) {
        const starGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            emissive: 0xffffff
        });
        
        const star = new THREE.Mesh(starGeometry, starMaterial);
        
        // Random position on sphere
        const phi = Math.acos(-1 + (2 * Math.random()));
        const theta = 2 * Math.PI * Math.random();
        const radius = 35;
        
        star.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );
        
        starsGroup.add(star);
    }
    
    environmentGroup.add(starsGroup);
    state.scene.add(environmentGroup);
    state.environment = environmentGroup;
}

// Handle entering/exiting VR
function setupVRSessionEvents() {
    const vrView = document.getElementById('vr-view');
    const desktopView = document.getElementById('desktop-view');
    
    // Handle entering VR
    state.renderer.xr.addEventListener('sessionstart', () => {
        state.isInVR = true;
        vrView.classList.remove('hidden');
        desktopView.classList.add('hidden');
        
        // Switch to VR canvas container
        const vrCanvasContainer = document.getElementById('vr-canvas-container');
        if (vrCanvasContainer && state.renderer.domElement.parentElement) {
            state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
            vrCanvasContainer.appendChild(state.renderer.domElement);
        }
        
        // Disable orbit controls in VR
        if (state.controls) {
            state.controls.enabled = false;
        }
        
        // Set note direction for VR (coming towards the player)
        state.noteSpeed = -4; // Reverse speed so notes come toward the player
        
        logStatus("Entered VR mode");
    });
    
    // Handle exiting VR
    state.renderer.xr.addEventListener('sessionend', () => {
        state.isInVR = false;
        vrView.classList.add('hidden');
        desktopView.classList.remove('hidden');
        
        // Switch back to desktop canvas container
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer && state.renderer.domElement.parentElement) {
            state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
            canvasContainer.appendChild(state.renderer.domElement);
        }
        
        // Re-enable orbit controls
        if (state.controls) {
            state.controls.enabled = true;
        }
        
        // Reset note direction for desktop view
        state.noteSpeed = 4;
        
        logStatus("Exited VR mode");
    });
}

// Handle window resize
export function onWindowResize() {
    const canvasContainer = document.getElementById('canvas-container');
    state.camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

// Render function (called by animation loop)
export function render(timestamp, frame) {
    // Update VR controller interaction if in VR
    if (state.isInVR && state.isPlaying) {
        checkSaberNoteCollisions();
    }
    
    state.renderer.render(state.scene, state.camera);
}