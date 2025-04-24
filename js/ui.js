// UI-related functions and event handling
import { state } from './main.js';
import { processMap } from './map-loader.js';
import { playMap, pauseMap } from './audio-manager.js';

// DOM Elements - exported for use in other modules
export const elements = {
    uploadInput: document.getElementById('map-upload'),
    fileNameDisplay: document.getElementById('file-name'),
    processBtn: document.getElementById('process-btn'),
    playBtn: document.getElementById('play-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    progressBar: document.getElementById('progress-bar'),
    statusLog: document.getElementById('status-log'),
    mapDetails: document.getElementById('map-details'),
    vrStatus: document.getElementById('vr-status'),
    canvasContainer: document.getElementById('canvas-container'),
    vrCanvasContainer: document.getElementById('vr-canvas-container'),
    vrView: document.getElementById('vr-view'),
    desktopView: document.getElementById('desktop-view')
};

// Set up event listeners
export function setupEventListeners() {
    elements.uploadInput.addEventListener('change', handleFileSelect);
    elements.processBtn.addEventListener('click', processMap);
    elements.playBtn.addEventListener('click', playMap);
    elements.pauseBtn.addEventListener('click', pauseMap);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.zip')) {
        elements.fileNameDisplay.textContent = file.name;
        elements.processBtn.disabled = false;
        logStatus(`File selected: ${file.name}`);
    } else {
        elements.fileNameDisplay.textContent = "Invalid file format (must be .zip)";
        elements.processBtn.disabled = true;
        logStatus("Invalid file format. Please select a .zip file.", true);
    }
}

// Update VR Status Display
export function updateVRStatus() {
    elements.vrStatus.textContent = `VR Status: ${state.isVRSupported ? 'Supported' : 'Not Supported'}`;
    elements.vrStatus.style.backgroundColor = state.isVRSupported ? '#1a6e1a' : '#6e1a1a';
}

// Log status message
export function logStatus(message, isError = false) {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    if (isError) {
        p.classList.add('error');
        console.error(message);
    } else {
        console.log(message);
    }
    
    elements.statusLog.appendChild(p);
    elements.statusLog.scrollTop = elements.statusLog.scrollHeight;
}

// Display map information
export function displayMapInfo(infoData) {
    let html = `
        <div class="map-property">
            <div class="property-name">Song Name:</div>
            <div>${infoData._songName || 'Unknown'}</div>
        </div>
        <div class="map-property">
            <div class="property-name">Song Artist:</div>
            <div>${infoData._songAuthorName || 'Unknown'}</div>
        </div>
        <div class="map-property">
            <div class="property-name">Mapper:</div>
            <div>${infoData._levelAuthorName || 'Unknown'}</div>
        </div>
        <div class="map-property">
            <div class="property-name">BPM:</div>
            <div>${infoData._beatsPerMinute || 'Unknown'}</div>
        </div>
        <div class="map-property">
            <div class="property-name">Difficulties:</div>
            <div class="difficulties-list">
    `;
    
    // Check different formats for difficulty data
    if (infoData._difficultyBeatmapSets && Array.isArray(infoData._difficultyBeatmapSets)) {
        infoData._difficultyBeatmapSets.forEach(set => {
            if (set._difficultyBeatmaps && Array.isArray(set._difficultyBeatmaps)) {
                set._difficultyBeatmaps.forEach(diff => {
                    html += `<div class="difficulty-item" data-file="${diff._beatmapFilename}">${diff._difficulty}</div>`;
                });
            }
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    elements.mapDetails.innerHTML = html;
    
    // Add event listeners to difficulties
    document.querySelectorAll('.difficulty-item').forEach(item => {
        item.addEventListener('click', async () => {
            const difficultyFile = item.getAttribute('data-file');
            await loadDifficulty(difficultyFile);
            
            // Update active state
            document.querySelectorAll('.difficulty-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
        });
    });
}

// This function moved from map-loader.js but kept here to handle UI clicks
async function loadDifficulty(difficultyFile) {
    try {
        logStatus(`Loading difficulty: ${difficultyFile}`);
        
        // Import needed functions dynamically to avoid circular dependencies
        const { loadDifficultyFile } = await import('./map-loader.js');
        await loadDifficultyFile(difficultyFile);
        
        logStatus(`Difficulty '${difficultyFile}' loaded successfully`);
    } catch (error) {
        logStatus(`Error loading difficulty: ${error.message}`, true);
    }
}