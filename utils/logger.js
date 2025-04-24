// Status logging functions
const statusLog = document.getElementById('status-log');

export function logStatus(message, isError = false) {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    if (isError) {
        p.classList.add('error');
        console.error(message);
    } else {
        console.log(message);
    }
    
    statusLog.appendChild(p);
    statusLog.scrollTop = statusLog.scrollHeight;
}

// Log map information with detailed creator info
export function logMapInfo(mapData) {
    logStatus("------------------------ MAP INFORMATION ------------------------");
    
    // Basic song info
    logStatus(`Song Name: ${mapData._songName || 'Unknown'}`);
    if (mapData._songSubName) {
        logStatus(`Song Sub-Name: ${mapData._songSubName}`);
    }
    
    // Creator information
    logStatus(`Song Artist: ${mapData._songAuthorName || 'Unknown'}`);
    logStatus(`Map Creator: ${mapData._levelAuthorName || 'Unknown'}`);
    
    // Technical info
    logStatus(`BPM: ${mapData._beatsPerMinute || 'Unknown'}`);
    
    // Difficulty info
    const difficultyCount = getDifficultyCount(mapData);
    logStatus(`Available Difficulties: ${difficultyCount}`);
    
    // Additional metadata if available
    if (mapData._songTimeOffset) {
        logStatus(`Song Time Offset: ${mapData._songTimeOffset}ms`);
    }
    
    if (mapData._previewStartTime) {
        logStatus(`Preview Start Time: ${mapData._previewStartTime}s`);
    }
    
    // Custom data if present
    if (mapData._customData) {
        logStatus("Custom data is present in this map");
        
        if (mapData._customData._editor) {
            logStatus(`Editor Used: ${mapData._customData._editor}`);
        }
        
        if (mapData._customData._contributors && mapData._customData._contributors.length > 0) {
            logStatus("Additional Contributors:");
            mapData._customData._contributors.forEach(contributor => {
                if (contributor._name) {
                    logStatus(`- ${contributor._name} (${contributor._role || 'Unknown role'})`);
                }
            });
        }
    }
    
    // Environment info
    logStatus(`Environment: ${mapData._environmentName || 'Default'}`);
    
    logStatus("----------------------------------------------------------------");
}

// Helper function to count difficulties
function getDifficultyCount(mapData) {
    let count = 0;
    if (mapData._difficultyBeatmapSets) {
        mapData._difficultyBeatmapSets.forEach(set => {
            if (set._difficultyBeatmaps) {
                count += set._difficultyBeatmaps.length;
            }
        });
    }
    return count;
}