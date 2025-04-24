import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';

// Set up VR controllers
export function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Define colors for sabers
    const saberColors = [
        new THREE.Color(0xff0055), // Red for left hand
        new THREE.Color(0x00a1ff)  // Blue for right hand
    ];
    
    // Setup controller grip and events for both hands
    for (let i = 0; i < 2; i++) {
        const controller = state.renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        state.scene.add(controller);
        
        const controllerGrip = state.renderer.xr.getControllerGrip(i);
        const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);
        controllerGrip.add(controllerModel);
        state.scene.add(controllerGrip);
        
        // Add saber to the controller
        addSaberToController(controllerGrip, saberColors[i], i);
        
        state.controllers.push({ 
            controller, 
            controllerGrip,
            index: i
        });
    }
    
    logStatus("VR controllers set up with sabers");
}

// Add a saber to a controller
function addSaberToController(controllerGrip, color, index) {
    // Create saber handle
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.3
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    
    // Rotate and position handle to match controller orientation
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.075;
    
    // Create saber blade
    const bladeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 16);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.8
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    
    // Position blade to extend from handle
    blade.position.y = 0.5;
    blade.position.z = 0.02;
    
    // Create a group for the saber
    const saber = new THREE.Group();
    saber.add(handle);
    handle.add(blade);
    
    // Store the hand index (0 = left, 1 = right)
    saber.userData = { handIndex: index };
    
    // Add saber to controller
    controllerGrip.add(saber);
    
    // Store the saber reference
    if (!state.sabers) state.sabers = [];
    state.sabers.push(saber);
    
    return saber;
}

// Handle controller select start
function onSelectStart(event) {
    const controller = event.target;
    
    // Get the controller index (0 for left, 1 for right)
    const controllerIndex = state.controllers.findIndex(c => c.controller === controller);
    if (controllerIndex !== -1) {
        logStatus(`Controller ${controllerIndex} select started`);
        // Can implement hit detection for notes here
    }
}

// Handle controller select end
function onSelectEnd(event) {
    const controller = event.target;
    
    // Get the controller index (0 for left, 1 for right)
    const controllerIndex = state.controllers.findIndex(c => c.controller === controller);
    if (controllerIndex !== -1) {
        logStatus(`Controller ${controllerIndex} select ended`);
    }
}

// Update function to be called during animation
export function updateVRControllers() {
    // Only update if in VR
    if (!state.isInVR || !state.controllers || !state.controllers.length) return;
    
    // Additional controller update logic can be added here
    // For example, collision detection with notes
}