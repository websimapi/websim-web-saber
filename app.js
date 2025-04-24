import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import * as dom from './dom.js';
import * as ui from './ui.js';
import * as file from './file.js';
import * as map from './map.js';
import * as audio from './audio.js';
import * as visualization from './visualization.js';

// Create a global state object to share between modules
const state = {
    isVRSupported: false,
    isInVR: false,
    currentMap: null,
    currentDifficulty: null,
    isPlaying: false,
    extractedFiles: null,
    audio: null,
    beatLength: 0
};

// Export the state for other modules to access
window.appState = state;

function init() {
    ui.logStatus("Initializing application...");
    checkVRSupport();
    setupEventListeners();
    visualization.setupThreeJS(state);
    ui.logStatus("Application initialized and ready!");
}

function checkVRSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                state.isVRSupported = supported;
                ui.updateVRStatus(supported);
                ui.logStatus(`VR ${supported ? 'is' : 'is not'} supported`);
            })
            .catch(error => {
                state.isVRSupported = false;
                ui.updateVRStatus(false);
                ui.logStatus(`Error checking VR support: ${error.message}`, true);
            });
    } else {
        state.isVRSupported = false;
        ui.updateVRStatus(false);
        ui.logStatus("WebXR not available in this browser", true);
    }
}

function setupVRControllers(renderer, scene) {
    // This is a placeholder for VR controller setup
    // Implementation would go here when VR functionality is expanded
}

function onSessionStart() {
    state.isInVR = true;
    dom.vrView.classList.remove('hidden');
    dom.desktopView.classList.add('hidden');
    visualization.onWindowResize();
}

function onSessionEnd() {
    state.isInVR = false;
    dom.vrView.classList.add('hidden');
    dom.desktopView.classList.remove('hidden');
    visualization.onWindowResize();
}

function setupEventListeners() {
    dom.uploadInput.addEventListener('change', (event) => file.handleFileSelect(event, ui));
    dom.processBtn.addEventListener('click', () => file.processMap(state, ui, map, audio, visualization));
    dom.playBtn.addEventListener('click', () => audio.playMap(state, ui, visualization));
    dom.pauseBtn.addEventListener('click', () => audio.pauseMap(state, ui));
}

document.addEventListener('DOMContentLoaded', init);

// Export functions needed by other modules
export { setupVRControllers, onSessionStart, onSessionEnd };

