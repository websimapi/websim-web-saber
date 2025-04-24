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

        // Clear existing notes and obstacles
        visualizationModule.clearVisualization();

        // Recreate player area (in case it was removed)
        visualizationModule.createPlayerArea();

        // Prepare notes and obstacles for visualization
        visualizationModule.prepareVisualization(diffData, state.beatLength, logStatus); // Pass beatLength

        logStatus(`Difficulty '${difficultyFile}' loaded successfully. Ready to play.`);
        // Enable play button now that a difficulty is loaded
        // This assumes the audio is already loaded from processMap
        if (state.audio) { // Check if audio state exists (should be loaded by now)
             import('./ui.js').then(ui => ui.enablePlayButton(true));
        } else {
            logStatus("Audio not ready, cannot enable play.", true);
        }


    } catch (error) {
        logStatus(`Error loading difficulty: ${error.message}`, true);
         import('./ui.js').then(ui => ui.enablePlayButton(false)); // Ensure play is disabled on error
    }
}