import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../state.js';
import { setupVRControllers, createVRMenu, updateVRControllers } from '../vr/vrController.js';
import { createVRButton, setupVRSessionEvents, setupVREnvironment } from '../vr/vrManager.js';
import { updateAudioProgress } from '../audio/audioManager.js';

// Set up Three.js environment
export function setupThreeJS() {
    const canvasContainer = document.getElementById('canvas-container');
    
    // Create scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x000000);
    
    // Create camera
    state.camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    state.camera.position.set(0, 1.6, -3); // Move behind the player to see notes coming
    
    // Create renderer
    state.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    
    state.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    state.renderer.setPixelRatio(window.devicePixelRatio);
    state.renderer.xr.enabled = true;
    state.renderer.shadowMap.enabled = true;
    canvasContainer.appendChild(state.renderer.domElement);
    
    // Add orbit controls for desktop
    const controls = new OrbitControls(state.camera, state.renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.update();
    state.controls = controls;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 10, 10);
    directionalLight.castShadow = true;
    state.scene.add(directionalLight);
    
    // Add a grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x0088ff, 0x004488);
    state.scene.add(gridHelper);
    
    // Add VR button if supported
    if (state.isVRSupported) {
        createVRButton(state.renderer);
        
        // Set up VR environment
        setupVREnvironment(state.scene);
        
        // Set up VR controllers
        setupVRControllers();
        
        // Create VR menu
        createVRMenu(state.scene);
        
        // Handle VR session events
        setupVRSessionEvents(state.renderer);
    }
    
    // Start animation loop
    state.renderer.setAnimationLoop(render);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
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
    // Update VR-specific elements if in VR
    if (state.isInVR) {
        updateVRControllers();
        
        // Handle slice effects
        updateSliceEffects();
    }
    
    // Update audio progress which will update notes
    if (state.isPlaying) {
        updateAudioProgress();
    }
    
    // Render the scene
    state.renderer.render(state.scene, state.camera);
}

// Update slice effects animation
function updateSliceEffects() {
    state.scene.children.forEach(child => {
        // Check if this is a slice effect object
        if (child.userData.velocity && child.userData.angularVelocity) {
            // Update position
            child.position.add(child.userData.velocity);
            
            // Update rotation
            child.rotation.x += child.userData.angularVelocity.x;
            child.rotation.y += child.userData.angularVelocity.y;
            child.rotation.z += child.userData.angularVelocity.z;
            
            // Add gravity effect
            child.userData.velocity.y -= 0.001;
        }
    });
}