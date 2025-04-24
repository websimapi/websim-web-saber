// Audio playback functionality
import { state } from './app.js';
import { logStatus } from './app.js';
import { clearVisualization, createPlayerArea, prepareVisualization, animate, state as noteState } from './app.js';

// Load audio file
export async function loadAudio(audioFile) {
    try {
        logStatus("Loading audio file...");
        
        // Get audio data
        const audioData = await audioFile.async("arraybuffer");
        
        // Create audio context if needed
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Decode audio data
        const audioBuffer = await state.audioContext.decodeAudioData(audioData);
        
        // Store the audio buffer
        state.audio = audioBuffer;
        
        logStatus("Audio loaded successfully!");
    } catch (error) {
        throw new Error(`Failed to load audio: ${error.message}`);
    }
}

// Play the map
export function playMap() {
    if (!state.currentMap || !state.currentDifficulty || !state.audio) {
        logStatus("Cannot play: Map not fully loaded", true);
        return;
    }
    
    try {
        // Stop any existing audio source
        if (state.audioSource) {
            state.audioSource.stop();
        }
        
        // Create a new audio source
        state.audioSource = state.audioContext.createBufferSource();
        state.audioSource.buffer = state.audio;
        state.audioSource.connect(state.audioContext.destination);
        
        // Start playback
        state.audioSource.start();
        state.startTime = state.audioContext.currentTime;
        state.isPlaying = true;
        
        // Reset note positions
        resetNotePositions();
        
        // Update UI
        document.getElementById('play-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        
        // Start animation
        animate();
        
        logStatus("Playback started");
    } catch (error) {
        logStatus(`Error starting playback: ${error.message}`, true);
    }
}

// Reset note positions to their original positions
function resetNotePositions() {
    if (state.currentDifficulty) {
        // Clear existing visualization
        clearVisualization();
        
        // Recreate player area
        createPlayerArea();
        
        // Prepare visualization again
        prepareVisualization(state.currentDifficulty);
    }
}

// Pause the map
export function pauseMap() {
    if (!state.isPlaying) return;
    
    try {
        if (state.audioSource) {
            state.audioSource.stop();
            state.audioSource = null;
        }
        state.isPlaying = false;
        
        // Update UI
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        
        logStatus("Playback paused");
    } catch (error) {
        logStatus(`Error pausing playback: ${error.message}`, true);
    }
}

// Update visualization based on current time
export function updateVisualization() {
    if (!state.isPlaying || !state.audioContext) return;
    
    const currentTime = state.audioContext.currentTime - state.startTime;
    const currentBeat = currentTime / state.beatLength;
    
    // Update progress bar
    if (state.audio) {
        const progress = (currentTime / state.audio.duration) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
    }
    
    // Move notes and obstacles based on current beat
    noteState.noteObjects.forEach(note => {
        // Calculate position based on beat time and current beat
        const beatDifference = note.userData.beatTime - currentBeat;
        note.position.z = note.userData.beatTime * noteState.noteSpeed - (currentBeat * noteState.noteSpeed);
        
        // Remove notes that have passed the player
        if (beatDifference < -1) {
            noteState.scene.remove(note);
        }
    });
    
    // Move obstacles similarly
    noteState.obstacleObjects.forEach(obstacle => {
        const beatDifference = obstacle.userData.beatTime - currentBeat;
        const depth = obstacle.geometry.parameters.depth;
        obstacle.position.z = obstacle.userData.beatTime * noteState.noteSpeed - (currentBeat * noteState.noteSpeed) + (depth / 2);
        
        // Remove obstacles that have passed the player
        if (beatDifference < -1) {
            noteState.scene.remove(obstacle);
        }
    });
}