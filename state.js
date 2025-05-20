// Application state management
export const state = {
    isVRSupported: false,
    isInVR: false,
    vrHeadset: null, // Will store detected headset model
    vrQualityLevel: 'medium', // 'low', 'medium', 'high' based on headset
    currentMap: null,
    currentDifficulty: null,
    isPlaying: false,
    audio: null,
    audioContext: null,
    audioSource: null,
    startTime: 0,
    beatLength: 0,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    controllers: [],
    vrMenu: null,
    vrMenuItems: [],
    notes: [],
    obstacles: [],
    extractedFiles: null,
    noteObjects: [],
    obstacleObjects: [],
    playerArea: null,
    noteSpeed: 4,
    score: 0,
};

