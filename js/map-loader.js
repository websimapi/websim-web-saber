// Map loading and parsing functionality
import { state } from './main.js';
import { elements, logStatus, displayMapInfo } from './ui.js';
import { loadAudio } from './audio-manager.js';
import { clearVisualization, createPlayerArea, prepareVisualization } from './note-creator.js';

// Process the uploaded map
export async function processMap() {
    try {
        const file = elements.uploadInput.files[0];
        if (!file) return;
        
        logStatus("Processing map file...");
        elements.processBtn.disabled = true;
        
        // Extract the ZIP file
        const extractedFiles = await extractZipFile(file);
        state.extractedFiles = extractedFiles;
        
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
        
        // Load and display map information
        displayMapInfo(infoData);
        
        // Load audio file
        const audioFile = extractedFiles[infoData._songFilename];
        if (!audioFile) {
            throw new Error(`Audio file '${infoData._songFilename}' not found in the ZIP archive`);
        }
        
        // Load audio
        await loadAudio(audioFile);
        
        // Enable playback
        elements.playBtn.disabled = false;
        logStatus("Map processed successfully! Ready to play.");
        
        // Automatically load the first difficulty if available
        if (infoData._difficultyBeatmapSets && 
            infoData._difficultyBeatmapSets.length > 0 && 
            infoData._difficultyBeatmapSets[0]._difficultyBeatmaps && 
            infoData._difficultyBeatmapSets[0]._difficultyBeatmaps.length > 0) {
            const firstDifficulty = infoData._difficultyBeatmapSets[0]._difficultyBeatmaps[0];
            await loadDifficultyFile(firstDifficulty._beatmapFilename);
            const firstDiffElem = document.querySelector('.difficulty-item');
            if (firstDiffElem) firstDiffElem.classList.add('active');
        }
        
    } catch (error) {
        logStatus(`Error processing map: ${error.message}`, true);
        elements.processBtn.disabled = false;
    }
}

// Extract ZIP file
async function extractZipFile(file) {
    logStatus("Extracting ZIP file...");
    
    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        logStatus(`ZIP file extracted: ${Object.keys(contents.files).length} files found`);
        return contents.files;
    } catch (error) {
        throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
}

// Find info.dat file (case insensitive)
function findInfoFile(files) {
    const infoFileKey = Object.keys(files).find(
        key => key.toLowerCase() === 'info.dat' || 
               key.toLowerCase().endsWith('/info.dat')
    );
    
    return infoFileKey ? files[infoFileKey] : null;
}

// Find a file in the ZIP archive, accounting for potential folder paths
export function findFileInZip(files, filename) {
    // Try direct match
    if (files[filename]) {
        return files[filename];
    }
    
    // Try finding with any parent path
    const key = Object.keys(files).find(
        key => key.endsWith('/' + filename)
    );
    
    return key ? files[key] : null;
}

// Load a specific difficulty
export async function loadDifficultyFile(difficultyFile) {
    try {
        // Find the difficulty file
        const file = findFileInZip(state.extractedFiles, difficultyFile);
        if (!file) {
            throw new Error(`Difficulty file '${difficultyFile}' not found in the ZIP archive`);
        }
        
        // Parse difficulty data
        const diffContent = await file.async("text");
        const diffData = JSON.parse(diffContent);
        
        // Log the difficulty structure to help with debugging
        console.log("Difficulty data structure:", diffData);
        
        state.currentDifficulty = diffData;
        
        // Clear existing notes and obstacles
        clearVisualization();
        
        // Create player area
        createPlayerArea();
        
        // Prepare notes and obstacles for visualization
        prepareVisualization(diffData);
        
    } catch (error) {
        throw new Error(`Error loading difficulty: ${error.message}`);
    }
}