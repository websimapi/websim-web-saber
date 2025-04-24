import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { findFileInZip } from './mapLoader.js';
import { clearVisualization, createPlayerArea, prepareVisualization } from '../visualization/visualizer.js';

// Load a specific difficulty
export async function loadDifficulty(difficultyFile) {
    try {
        logStatus(`Loading difficulty: ${difficultyFile}`);
        
        // Find the difficulty file
        const file = findFileInZip(state.extractedFiles, difficultyFile);
        if (!file) {
            throw new Error(`Difficulty file '${difficultyFile}' not found in the ZIP archive`);
        }
        
        // Parse difficulty data
        const diffContent = await file.async("text");
        const diffData = JSON.parse(diffContent);
        
        // Log the difficulty details
        logDifficultyInfo(diffData, difficultyFile);
        
        state.currentDifficulty = diffData;
        
        // Clear existing notes and obstacles
        clearVisualization();
        
        // Create player area
        createPlayerArea();
        
        // Prepare notes and obstacles for visualization
        prepareVisualization(diffData);
        
        // Enable play button
        document.getElementById('play-btn').disabled = false;
        
        logStatus(`Difficulty '${difficultyFile}' loaded successfully`);
        return true;
    } catch (error) {
        logStatus(`Error loading difficulty: ${error.message}`, true);
        return false;
    }
}

// Log detailed information about the difficulty
function logDifficultyInfo(diffData, filename) {
    // Count notes and obstacles
    const noteCount = diffData._notes?.length || diffData.colorNotes?.length || 0;
    const obstacleCount = diffData._obstacles?.length || diffData.obstacles?.length || 0;
    const eventCount = diffData._events?.length || diffData.basicBeatmapEvents?.length || 0;
    
    logStatus("------------------ DIFFICULTY INFORMATION ------------------");
    logStatus(`Difficulty File: ${filename}`);
    logStatus(`Note Count: ${noteCount}`);
    logStatus(`Obstacle Count: ${obstacleCount}`);
    logStatus(`Event Count: ${eventCount}`);
    
    // Check for map format version
    if (diffData._version) {
        logStatus(`Map Format Version: ${diffData._version}`);
    }
    
    // Check for any custom data
    if (diffData._customData) {
        logStatus("This difficulty contains custom data");
        
        // Log specific custom data if present
        if (diffData._customData._requirements) {
            logStatus(`Requirements: ${diffData._customData._requirements.join(', ')}`);
        }
        
        if (diffData._customData._suggestions) {
            logStatus(`Suggestions: ${diffData._customData._suggestions.join(', ')}`);
        }
    }
    
    logStatus("------------------------------------------------------------");
}