import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { updateVRStatus } from '../utils/uiManager.js';

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

// Enter VR mode
export function enterVRMode() {
    if (!state.isVRSupported || state.isInVR) return;
    
    logStatus("Entering VR mode...");
    
    try {
        // Request a VR session using the VR button programmatically
        const enterVRButton = document.querySelector('button.VRButton');
        if (enterVRButton) {
            enterVRButton.click();
            logStatus("VR session requested");
        } else {
            logStatus("VR button not found, cannot enter VR mode automatically", true);
        }
    } catch (error) {
        logStatus(`Error entering VR mode: ${error.message}`, true);
    }
}

// Exit VR mode
export function exitVRMode() {
    if (!state.isInVR) return;
    
    logStatus("Exiting VR mode...");
    
    try {
        if (state.renderer && state.renderer.xr) {
            state.renderer.xr.getSession().end();
            logStatus("VR session ended");
        }
    } catch (error) {
        logStatus(`Error exiting VR mode: ${error.message}`, true);
    }
}