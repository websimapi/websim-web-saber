import { state } from './state.js';
import { logStatus } from './utils/logger.js';
import { checkVRSupport } from './vr/vrManager.js';
import { setupThreeJS } from './visualization/threeManager.js';
import { processMap } from './files/mapLoader.js';
import { playMap, pauseMap } from './audio/audioManager.js';

// DOM Elements
const uploadInput = document.getElementById('map-upload');
const fileNameDisplay = document.getElementById('file-name');
const processBtn = document.getElementById('process-btn');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');

// Initialize application
function init() {
    logStatus("Initializing application...");
    checkVRSupport();
    setupEventListeners();
    setupThreeJS();
    logStatus("Application initialized and ready!");
}

// Set up event listeners
function setupEventListeners() {
    uploadInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', handleProcessMap);
    playBtn.addEventListener('click', playMap);
    pauseBtn.addEventListener('click', pauseMap);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.zip')) {
        fileNameDisplay.textContent = file.name;
        processBtn.disabled = false;
        logStatus(`File selected: ${file.name}`);
    } else {
        fileNameDisplay.textContent = "Invalid file format (must be .zip)";
        processBtn.disabled = true;
        logStatus("Invalid file format. Please select a .zip file.", true);
    }
}

// Handle process map button click
async function handleProcessMap() {
    try {
        const file = uploadInput.files[0];
        if (!file) return;
        
        processBtn.disabled = true;
        const success = await processMap(file);
        
        if (!success) {
            processBtn.disabled = false;
        }
    } catch (error) {
        logStatus(`Error in process map handler: ${error.message}`, true);
        processBtn.disabled = false;
    }
}

// Initialize application when document is ready
document.addEventListener('DOMContentLoaded', init);