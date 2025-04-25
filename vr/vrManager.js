import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { updateVRStatus } from '../utils/uiManager.js';
import * as THREE from 'three';

// Check if VR is supported, with specific detection for Oculus Quest
export function checkVRSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                state.isVRSupported = supported;
                
                // Try to identify Oculus devices
                if (supported) {
                    // Check for Oculus Browser or Meta Quest features
                    if (navigator.userAgent.includes('OculusBrowser') || 
                        navigator.userAgent.includes('Quest') ||
                        (typeof navigator.xr !== 'undefined' && 
                         typeof navigator.xr.requestSession === 'function')) {
                        state.isOculusQuest = true;
                        logStatus("Oculus Quest headset detected");
                    }
                }
                
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

// Enter VR mode - can be called directly when user clicks play
export function enterVRMode() {
    if (!state.isVRSupported) {
        logStatus("VR is not supported on this device", true);
        return false;
    }

    try {
        // Trigger the VR button click
        const vrButton = document.querySelector('button.VRButton');
        if (vrButton) {
            vrButton.click();
            return true;
        } else {
            // If button not found, try requesting the session directly
            if (state.renderer && state.renderer.xr) {
                state.renderer.xr.startSession();
                return true;
            }
            logStatus("VR button not found and direct session start failed", true);
            return false;
        }
    } catch (error) {
        logStatus(`Error entering VR: ${error.message}`, true);
        return false;
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
        logStatus("VR session started - positioning player");
        
        // Move player area in front of the user
        if (state.playerArea) {
            state.playerArea.position.z = 2; // Move ahead of player
            state.playerArea.position.y = 0; // Ground level
        }
        
        // Update camera position
        state.camera.position.set(0, 1.6, 0); // Standard eye height
        
        // Set reference space to position player correctly
        setupVRReferenceSpace();
        
        // If we're in Quest/Oculus, apply specific optimizations
        if (state.isOculusQuest) {
            applyOculusQuestOptimizations();
        }
    });
}

// Set up a local reference space for proper positioning
function setupVRReferenceSpace() {
    if (!state.renderer.xr.getSession()) {
        logStatus("No VR session available for reference space setup", true);
        return;
    }
    
    // Try to get floor level reference space first (ideal for Quest)
    state.renderer.xr.getSession().requestReferenceSpace('local-floor')
        .then(refSpace => {
            state.referenceSpace = refSpace;
            logStatus("VR floor reference space established");
        })
        .catch(error => {
            // Fallback to local reference space
            logStatus("Floor reference space failed, trying local space", true);
            state.renderer.xr.getSession().requestReferenceSpace('local')
                .then(refSpace => {
                    state.referenceSpace = refSpace;
                    logStatus("VR local reference space established");
                })
                .catch(e => {
                    logStatus(`Error setting any VR reference space: ${e.message}`, true);
                });
        });
}

// Apply optimizations specific to Oculus Quest
function applyOculusQuestOptimizations() {
    logStatus("Applying Oculus Quest optimizations");
    
    // Set player height for Quest (may be different than other headsets)
    state.camera.position.y = 1.6; // Average eye height
    
    // Adjust rendering quality for better performance on Quest
    if (state.renderer) {
        // Lower pixel ratio for better performance
        state.renderer.setPixelRatio(window.devicePixelRatio * 0.8);
        
        // Disable some performance-heavy features
        state.renderer.shadowMap.enabled = false;
    }
    
    // Position the gameplay area optimally for Quest
    if (state.playerArea) {
        // Position game area in optimal Quest play zone
        state.playerArea.position.z = 2.2; // Slightly further than generic VR
        state.playerArea.position.y = 0; 
        
        // Scale if needed
        state.playerArea.scale.set(1.1, 1.1, 1.1); // Slightly larger for Quest
    }
}