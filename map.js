// Load a specific difficulty
export async function loadDifficulty(difficultyFile, state, logStatus, visualizationModule, fileModule) {
    if (!state.extractedFiles) {
        logStatus("Cannot load difficulty: ZIP file not processed yet.", true);
        return;
    }
    if (!difficultyFile) {
        logStatus("Cannot load difficulty: No filename provided.", true);
        return;
    }

    try {
        logStatus(`Loading difficulty: ${difficultyFile}`);

        // Find the difficulty file using the helper
        const file = fileModule.findFileInZip(state.extractedFiles, difficultyFile);
        if (!file) {
            throw new Error(`Difficulty file '${difficultyFile}' not found in the ZIP archive`);
        }

        // Parse difficulty data
        const diffContent = await file.async("text");
        const diffData = JSON.parse(diffContent);

        // Log the difficulty structure to help with debugging
        console.log("Difficulty data structure:", diffData);

        state.currentDifficulty = diffData;

        // Prepare visualization
        visualizationModule.clearVisualization();
        visualizationModule.createPlayerArea();
        visualizationModule.prepareVisualization(diffData, state.beatLength, logStatus);

        logStatus(`Difficulty '${difficultyFile}' loaded successfully. Ready to play.`);
        
        // Enable play button now that a difficulty is loaded
        if (state.audio) {
            const ui = await import('./ui.js');
            ui.enablePlayButton(true);
        }

    } catch (error) {
        logStatus(`Error loading difficulty: ${error.message}`, true);
        const ui = await import('./ui.js');
        ui.enablePlayButton(false); // Ensure play is disabled on error
    }
}