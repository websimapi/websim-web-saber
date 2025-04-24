// Main application entry point
import { setupEventListeners, logStatus, updateVRStatus } from './ui.js';
import { checkVRSupport } from './vr-manager.js';
import { setupThreeJS } from './three-scene.js';

// Main application state - accessible by all modules
export const state = {
    isVRSupported: false,
    isInVR: false,
    currentMap: null,
    currentDifficulty: null,
    isPlaying: false,
    audio: null,
    audioContext: null,
    audioSource: null,
    startTime: 0,
    beatLength: 0,
    renderer: null,
    scene: null,
    camera: null,
    controllers: [],
    notes: [],
    obstacles: [],
    extractedFiles: null,
    noteObjects: [],       // Storing actual 3D objects
    obstacleObjects: [],   // Storing actual 3D objects
    playerArea: null,      // Visual representation of player area
    noteSpeed: 4,          // Speed at which notes travel
};

// Initialize application
function init() {
    logStatus("Initializing application...");
    checkVRSupport();
    setupEventListeners();
    setupThreeJS();
    logStatus("Application initialized and ready!");
}

// Initialize application when document is ready
document.addEventListener('DOMContentLoaded', init);