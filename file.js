import * as ui from './ui.js';
import * as dom from './dom.js';

// Handle file selection
export function handleFileSelect(event, uiModule) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
        uiModule.updateFileName(file.name);
        uiModule.enableProcessButton(true);
        uiModule.logStatus(`File selected: ${file.name}`);
    } else {
        uiModule.updateFileName("Invalid file format (must be .zip)");
        uiModule.enableProcessButton(false);
        uiModule.logStatus("Invalid file format. Please select a .zip file.", true);
    }
}

// Process the uploaded map
export async function processMap(state, uiModule, mapModule, audioModule, visualizationModule) {
    const fileInput = document.getElementById('map-upload');
    const file = fileInput.files[0];
    if (!file) {
        uiModule.logStatus("No file selected", true);
        return;
    }

    uiModule.logStatus("Processing map file...");
    uiModule.enableProcessButton(false);
    uiModule.enablePlayButton(false); // Disable play until processing is done
    uiModule.enablePauseButton(false);

    try {
        // Extract the ZIP file
        const extractedFiles = await extractZipFile(file, uiModule);
        state.extractedFiles = extractedFiles; // Store extracted files in main state

        // Find info.dat or Info.dat
        const infoFile = findInfoFile(extractedFiles);
        if (!infoFile) {
            throw new Error("Info.dat file not found in the ZIP archive");
        }

        // Parse info file
        const infoContent = await infoFile.async("text");
        const infoData = JSON.parse(infoContent);

        // Store the map data
        state.currentMap = infoData;
        state.beatLength = 60 / infoData._beatsPerMinute;

        // Display map information
        uiModule.displayMapInfo(infoData, state, visualizationModule, { findFileInZip });

        // Load audio file
        const audioFile = findFileInZip(extractedFiles, infoData._songFilename);
        if (!audioFile) {
            throw new Error(`Audio file '${infoData._songFilename}' not found in the ZIP archive`);
        }

        // Load audio
        await audioModule.loadAudio(audioFile, uiModule);
        state.audio = true;

        uiModule.logStatus("Map processed successfully! Ready to play.");

    } catch (error) {
        uiModule.logStatus(`Error processing map: ${error.message}`, true);
        uiModule.enableProcessButton(true); // Re-enable on error
    }
}

// Extract ZIP file
async function extractZipFile(file, uiModule) {
    uiModule.logStatus("Extracting ZIP file...");

    // Ensure JSZip is loaded (it's loaded globally via script tag)
    if (typeof JSZip === 'undefined') {
        throw new Error("JSZip library not loaded.");
    }

    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        uiModule.logStatus(`ZIP file extracted: ${Object.keys(contents.files).length} files found`);
        return contents.files;
    } catch (error) {
        throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
}

// Find info.dat file (case insensitive, checks root or one level deep)
function findInfoFile(files) {
    const possibleNames = ['info.dat', 'Info.dat'];
    for (const name of possibleNames) {
        if (files[name]) return files[name];
        // Check if it's inside a single folder (common structure)
        const keyInFolder = Object.keys(files).find(
            key => key.toLowerCase().endsWith('/' + name.toLowerCase()) && key.split('/').length === 2
        );
        if (keyInFolder) return files[keyInFolder];
    }
    return null;
}

// Find a file in the ZIP archive, accounting for potential folder paths
export function findFileInZip(files, filename) {
    if (!files || !filename) return null;

    // Try direct match (case sensitive first)
    if (files[filename]) {
        return files[filename];
    }

    // Try finding with any parent path (case insensitive)
    const lowerFilename = filename.toLowerCase();
    const key = Object.keys(files).find(
        key => key.toLowerCase().endsWith('/' + lowerFilename) || key.toLowerCase() === lowerFilename
    );

    return key ? files[key] : null;
}