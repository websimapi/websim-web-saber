let audioContext = null;
let audioSource = null;
let audioBuffer = null; // Store the decoded buffer here
let startTime = 0; // Playback start time within the AudioContext

// Load audio file
export async function loadAudio(audioFile, uiModule) {
    try {
        uiModule.logStatus("Loading audio file...");

        // Get audio data
        const audioData = await audioFile.async("arraybuffer");

        // Create audio context if needed
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Decode audio data
        const decodedBuffer = await audioContext.decodeAudioData(audioData);

        // Store the audio buffer
        audioBuffer = decodedBuffer;
        
        uiModule.logStatus("Audio loaded successfully!");
        return true;
    } catch (error) {
         uiModule.logStatus(`Failed to load audio: ${error.message}`, true);
         throw error; // Re-throw to be caught by processMap
    }
}

// Play the map
export function playMap(state, uiModule, visualizationModule) {
    if (!state.currentMap || !state.currentDifficulty || !audioBuffer) {
        uiModule.logStatus("Cannot play: Map/Difficulty/Audio not fully loaded", true);
        return;
    }
    if (!audioContext) {
        uiModule.logStatus("Cannot play: AudioContext not initialized", true);
        return;
    }

    try {
        // Resume context if suspended (required after user interaction)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Stop any existing audio source
        if (audioSource) {
            try { audioSource.stop(); } catch (e) { /* Ignore errors if already stopped */ }
            audioSource.disconnect(); // Disconnect to allow garbage collection
            audioSource = null;
        }

        // Create a new audio source
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioContext.destination);

        // Start playback
        startTime = audioContext.currentTime; // Record the start time
        audioSource.start(0); // Start immediately (offset 0)
        state.isPlaying = true;
        state.audio = { audioContext, audioBuffer, startTime };

        // Reset note positions before starting animation
        visualizationModule.resetNotePositions();

        // Update UI
        uiModule.enablePlayButton(false);
        uiModule.enablePauseButton(true);

        // Start animation loop in visualization module
        visualizationModule.startAnimationLoop(state, updateAudioProgress);

        uiModule.logStatus("Playback started");

    } catch (error) {
        uiModule.logStatus(`Error starting playback: ${error.message}`, true);
        state.isPlaying = false;
         uiModule.enablePlayButton(true); // Re-enable play on error
         uiModule.enablePauseButton(false);
    }
}

// Pause the map
export function pauseMap(state, uiModule) {
    if (!state.isPlaying || !audioSource) return;

    try {
        audioSource.stop();
        audioSource.disconnect(); // Disconnect
        audioSource = null; // Clear the source

        state.isPlaying = false;

        // Update UI
        uiModule.enablePlayButton(true);
        uiModule.enablePauseButton(false);

        uiModule.logStatus("Playback paused");
    } catch (error) {
        uiModule.logStatus(`Error pausing playback: ${error.message}`, true);
        // Keep UI state as paused even if stop fails
         uiModule.enablePlayButton(true);
         uiModule.enablePauseButton(false);
    }
}

// Callback function to update progress bar from visualization loop
function updateAudioProgress(state) {
    if (!state.isPlaying || !state.audio.audioContext || !state.audio.audioBuffer) return;

    const currentTime = state.audio.audioContext.currentTime - state.audio.startTime;
    const duration = state.audio.audioBuffer.duration;
    if (duration > 0) {
        const progress = Math.min((currentTime / duration) * 100, 100);
        import('./ui.js').then(ui => ui.updateProgressBar(progress));

        // Check if playback finished naturally
        if (currentTime >= duration) {
            // Simulate pause action to reset state and UI
            pauseMap(state, { // Pass a temporary UI object or refactor state management
                 logStatus: (msg, err) => import('./ui.js').then(ui => ui.logStatus(msg, err)),
                 enablePlayButton: (enable) => import('./ui.js').then(ui => ui.enablePlayButton(enable)),
                 enablePauseButton: (enable) => import('./ui.js').then(ui => ui.enablePauseButton(enable)),
            });
            import('./ui.js').then(ui => ui.logStatus("Playback finished"));
            import('./ui.js').then(ui => ui.updateProgressBar(0)); // Reset progress bar
        }
    }
}

// Function to get current beat (used by visualization)
export function getCurrentBeat(beatLength) {
    if (!audioContext || beatLength <= 0) {
        return 0;
    }
    const currentTime = audioContext.currentTime - startTime;
    return currentTime / beatLength;
}

// Getter for the audio buffer duration
export function getAudioDuration() {
    return audioBuffer ? audioBuffer.duration : 0;
}

// Getter for AudioContext (needed by visualization for timing)
export function getAudioContext() {
    return audioContext;
}