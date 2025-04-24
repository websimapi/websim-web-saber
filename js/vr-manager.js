// VR-specific functionality
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import { state } from './app.js';
import { elements, updateVRStatus, logStatus } from './ui.js';

// Check if VR is supported
export function checkVRSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                state.isVRSupported = supported;
                updateVRStatus();
            })
            .catch(err => {
                logStatus(`Error checking VR support: ${err.message}`, true);
                state.isVRSupported = false;
                updateVRStatus();
            });
    } else {
        state.isVRSupported = false;
        updateVRStatus();
    }
}

// Set up VR controllers
export function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
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
        
        state.controllers.push({ controller, controllerGrip });
    }
}

// Handle VR session start
export function onVRSessionStart() {
    state.isInVR = true;
    elements.vrView.classList.remove('hidden');
    elements.desktopView.classList.add('hidden');
}

// Handle VR session end
export function onVRSessionEnd() {
    state.isInVR = false;
    elements.vrView.classList.add('hidden');
    elements.desktopView.classList.remove('hidden');
}

// Handle controller select start
export function onSelectStart(event) {
    // Implement VR interaction here
    console.log('VR controller select start', event);
}

// Handle controller select end
export function onSelectEnd(event) {
    // Implement VR interaction here
    console.log('VR controller select end', event);
}