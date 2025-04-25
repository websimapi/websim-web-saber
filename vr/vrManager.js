import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { updateVRStatus } from '../utils/uiManager.js';
import * as THREE from 'three';

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

// Position the player properly in VR
export function setupVRPlayerPosition() {
    // Set up a reference point for the player position in VR
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);
    state.scene.add(playerGroup);
    state.playerGroup = playerGroup;
    
    // In VR, we want to adjust the player area position to be in front of the user
    state.renderer.xr.addEventListener('sessionstart', () => {
        // Move player area in front of the user
        if (state.playerArea) {
            state.playerArea.position.z = 2; // Move ahead of player
            state.playerArea.position.y = 0; // Ground level
        }
        
        // Update camera position
        state.camera.position.set(0, 1.6, 0); // Standard eye height
        
        // Set reference space to position player correctly
        setupVRReferenceSpace();
    });
}

// Set up a local reference space for proper positioning
function setupVRReferenceSpace() {
    if (!state.renderer.xr.getSession()) return;
    
    state.renderer.xr.getSession().requestReferenceSpace('local-floor')
        .then(refSpace => {
            state.referenceSpace = refSpace;
            logStatus("VR reference space established");
        })
        .catch(error => {
            logStatus(`Error setting VR reference space: ${error.message}`, true);
        });
}