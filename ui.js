import * as dom from './dom.js';
import * as map from './map.js'; // Needs map module to call loadDifficulty

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

    dom.statusLog.appendChild(p);
    dom.statusLog.scrollTop = dom.statusLog.scrollHeight; // Auto-scroll
}

// Update VR Status Display
export function updateVRStatus(isSupported) {
    dom.vrStatus.textContent = `VR Status: ${isSupported ? 'Supported' : 'Not Supported'}`;
    dom.vrStatus.style.backgroundColor = isSupported ? '#1a6e1a' : '#6e1a1a';
}

// Display map information
export function displayMapInfo(infoData, state, visualization, fileModule) { // Needs access to state, visualization, fileModule
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
                    html += `<div class="difficulty-item" data-file="${diff._beatmapFilename}">${diff._difficulty} (${set._beatmapCharacteristicName})</div>`;
                });
            }
        });
    }

    html += `
            </div>
        </div>
    `;

    dom.mapDetails.innerHTML = html;

    // Add event listeners to difficulties
    document.querySelectorAll('.difficulty-item').forEach(item => {
        item.addEventListener('click', async () => {
            const difficultyFile = item.getAttribute('data-file');
            // Pass necessary modules/state to loadDifficulty
            await map.loadDifficulty(difficultyFile, state, logStatus, visualization, fileModule);

            // Update active state
            document.querySelectorAll('.difficulty-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
        });
    });

    // Automatically load the first difficulty if available
    const firstSet = infoData._difficultyBeatmapSets?.[0];
    const firstDifficulty = firstSet?._difficultyBeatmaps?.[0];
    if (firstDifficulty) {
        const firstItem = document.querySelector('.difficulty-item');
        if (firstItem) {
             map.loadDifficulty(firstDifficulty._beatmapFilename, state, logStatus, visualization, fileModule);
             firstItem.classList.add('active');
        }
    } else {
        logStatus("No difficulties found to automatically load.", true);
    }
}

// Update progress bar
export function updateProgressBar(progress) {
    dom.progressBar.style.width = `${progress}%`;
}

// Update file name display
export function updateFileName(text) {
    dom.fileNameDisplay.textContent = text;
}

// Enable/Disable Buttons
export function enableProcessButton(enable = true) {
    dom.processBtn.disabled = !enable;
}

export function enablePlayButton(enable = true) {
    dom.playBtn.disabled = !enable;
}

export function enablePauseButton(enable = true) {
    dom.pauseBtn.disabled = !enable;
}