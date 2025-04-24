import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import JSZip from 'jszip';

// DOM Elements
const uploadInput = document.getElementById('map-upload');
const fileNameDisplay = document.getElementById('file-name');
const processBtn = document.getElementById('process-btn');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const progressBar = document.getElementById('progress-bar');
const statusLog = document.getElementById('status-log');
const mapDetails = document.getElementById('map-details');
const vrStatus = document.getElementById('vr-status');
const canvasContainer = document.getElementById('canvas-container');
const vrCanvasContainer = document.getElementById('vr-canvas-container');
const vrView = document.getElementById('vr-view');
const desktopView = document.getElementById('desktop-view');

// Main application state
const state = {
    isVRSupported: false,
    isInVR: false,
    currentMap: null,
    currentDifficulty: null,
    isPlaying: false,
    audio: null,
    audioContext: null,
    startTime: 0,
    beatLength: 0,
    renderer: null,
    scene: null,
    camera: null,
    controllers: [],
    notes: [],
    obstacles: [],
    extractedFiles: null
};

// Initialize application
function init() {
    logStatus("Initializing application...");
    checkVRSupport();
    setupEventListeners();
    setupThreeJS();
    logStatus("Application initialized and ready!");
}

// Check if VR is supported
function checkVRSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                state.isVRSupported = supported;
                updateVRStatus();
            })
            .catch(err => {
                logStatus(`Error checking VR support: ${err.message}`, true);
                state.isVRSupported = false;
                updateVRStatus();
            });
    } else {
        state.isVRSupported = false;
        updateVRStatus();
    }
}

// Update VR Status Display
function updateVRStatus() {
    vrStatus.textContent = `VR Status: ${state.isVRSupported ? 'Supported' : 'Not Supported'}`;
    vrStatus.style.backgroundColor = state.isVRSupported ? '#1a6e1a' : '#6e1a1a';
}

// Set up event listeners
function setupEventListeners() {
    uploadInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', processMap);
    playBtn.addEventListener('click', playMap);
    pauseBtn.addEventListener('click', pauseMap);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.name.endsWith('.zip')) {
        fileNameDisplay.textContent = file.name;
        processBtn.disabled = false;
        logStatus(`File selected: ${file.name}`);
    } else {
        fileNameDisplay.textContent = "Invalid file format (must be .zip)";
        processBtn.disabled = true;
        logStatus("Invalid file format. Please select a .zip file.", true);
    }
}

// Process the uploaded map
async function processMap() {
    try {
        const file = uploadInput.files[0];
        if (!file) return;
        
        logStatus("Processing map file...");
        processBtn.disabled = true;
        
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
        playBtn.disabled = false;
        logStatus("Map processed successfully! Ready to play.");
        
    } catch (error) {
        logStatus(`Error processing map: ${error.message}`, true);
        processBtn.disabled = false;
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

// Display map information
function displayMapInfo(infoData) {
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
    
    infoData._difficultyBeatmapSets.forEach(set => {
        set._difficultyBeatmaps.forEach(diff => {
            html += `<div class="difficulty-item" data-file="${diff._beatmapFilename}">${diff._difficulty}</div>`;
        });
    });
    
    html += `
            </div>
        </div>
    `;
    
    mapDetails.innerHTML = html;
    
    // Add event listeners to difficulties
    document.querySelectorAll('.difficulty-item').forEach(item => {
        item.addEventListener('click', async () => {
            const difficultyFile = item.getAttribute('data-file');
            await loadDifficulty(difficultyFile);
            
            // Update active state
            document.querySelectorAll('.difficulty-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
        });
    });
    
    // Automatically load the first difficulty
    if (infoData._difficultyBeatmapSets.length > 0 && 
        infoData._difficultyBeatmapSets[0]._difficultyBeatmaps.length > 0) {
        const firstDifficulty = infoData._difficultyBeatmapSets[0]._difficultyBeatmaps[0];
        loadDifficulty(firstDifficulty._beatmapFilename);
        document.querySelector('.difficulty-item').classList.add('active');
    }
}

// Load a specific difficulty
async function loadDifficulty(difficultyFile) {
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
        
        state.currentDifficulty = diffData;
        
        // Clear existing notes and obstacles
        clearVisualization();
        
        // Prepare notes and obstacles for visualization
        prepareVisualization(diffData);
        
        logStatus(`Difficulty '${difficultyFile}' loaded successfully`);
    } catch (error) {
        logStatus(`Error loading difficulty: ${error.message}`, true);
    }
}

// Find a file in the ZIP archive, accounting for potential folder paths
function findFileInZip(files, filename) {
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

// Load audio file
async function loadAudio(audioFile) {
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
        
        // Create audio source
        if (state.audio) {
            state.audio.disconnect();
        }
        
        state.audio = state.audioContext.createBufferSource();
        state.audio.buffer = audioBuffer;
        state.audio.connect(state.audioContext.destination);
        
        logStatus("Audio loaded successfully!");
    } catch (error) {
        throw new Error(`Failed to load audio: ${error.message}`);
    }
}

// Play the map
function playMap() {
    if (!state.currentMap || !state.currentDifficulty || !state.audio) {
        logStatus("Cannot play: Map not fully loaded", true);
        return;
    }
    
    try {
        // Create new audio source if needed
        if (state.isPlaying) {
            pauseMap();
        }
        
        // Create a new audio source
        state.audio = state.audioContext.createBufferSource();
        state.audio.buffer = state.audio.buffer;
        state.audio.connect(state.audioContext.destination);
        
        // Start playback
        state.audio.start();
        state.startTime = state.audioContext.currentTime;
        state.isPlaying = true;
        
        // Update UI
        playBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Start animation
        animate();
        
        logStatus("Playback started");
    } catch (error) {
        logStatus(`Error starting playback: ${error.message}`, true);
    }
}

// Pause the map
function pauseMap() {
    if (!state.isPlaying) return;
    
    try {
        state.audio.stop();
        state.isPlaying = false;
        
        // Update UI
        playBtn.disabled = false;
        pauseBtn.disabled = true;
        
        logStatus("Playback paused");
    } catch (error) {
        logStatus(`Error pausing playback: ${error.message}`, true);
    }
}

// Set up Three.js environment
function setupThreeJS() {
    // Create scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x000000);
    
    // Create camera
    state.camera = new THREE.PerspectiveCamera(75, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    state.camera.position.set(0, 1.6, 3);
    
    // Create renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    state.renderer.xr.enabled = true;
    canvasContainer.appendChild(state.renderer.domElement);
    
    // Add orbit controls for desktop
    const controls = new OrbitControls(state.camera, state.renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.update();
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    state.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 10);
    state.scene.add(directionalLight);
    
    // Add a grid
    const gridHelper = new THREE.GridHelper(20, 20);
    state.scene.add(gridHelper);
    
    // Add VR button if supported
    if (state.isVRSupported) {
        document.body.appendChild(VRButton.createButton(state.renderer));
        
        // Set up VR controllers
        setupVRControllers();
        
        // Handle entering VR
        state.renderer.xr.addEventListener('sessionstart', () => {
            state.isInVR = true;
            vrView.classList.remove('hidden');
            desktopView.classList.add('hidden');
        });
        
        // Handle exiting VR
        state.renderer.xr.addEventListener('sessionend', () => {
            state.isInVR = false;
            vrView.classList.add('hidden');
            desktopView.classList.remove('hidden');
        });
    }
    
    // Start animation loop
    state.renderer.setAnimationLoop(render);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Set up VR controllers
function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Setup controller grip and events for both hands
    for (let i = 0; i < 2; i++) {
        const controller = state.renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        state.scene.add(controller);
        
        const controllerGrip = state.renderer.xr.getControllerGrip(i);
        const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);
        controllerGrip.add(controllerModel);
        state.scene.add(controllerGrip);
        
        state.controllers.push({ controller, controllerGrip });
    }
}

// Handle controller select start
function onSelectStart(event) {
    // Implement VR interaction here
}

// Handle controller select end
function onSelectEnd(event) {
    // Implement VR interaction here
}

// Handle window resize
function onWindowResize() {
    state.camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

// Clear visualization
function clearVisualization() {
    // Remove existing notes and obstacles
    state.notes.forEach(note => {
        state.scene.remove(note);
    });
    
    state.obstacles.forEach(obstacle => {
        state.scene.remove(obstacle);
    });
    
    state.notes = [];
    state.obstacles = [];
}

// Prepare visualization
function prepareVisualization(diffData) {
    // Create note objects
    diffData._notes.forEach(note => {
        createNoteObject(note);
    });
    
    // Create obstacle objects
    if (diffData._obstacles) {
        diffData._obstacles.forEach(obstacle => {
            createObstacleObject(obstacle);
        });
    }
}

// Create a 3D object for a note
function createNoteObject(noteData) {
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    
    // Red for left hand, blue for right hand
    const material = new THREE.MeshLambertMaterial({ 
        color: noteData._type === 0 ? 0xff0055 : 0x00a1ff,
        emissive: noteData._type === 0 ? 0x660022 : 0x003366,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on note data
    // Convert from Beat Saber coordinate system to Three.js
    mesh.position.x = (noteData._lineIndex - 1.5) * 0.6; // Center on the grid
    mesh.position.y = (noteData._lineLayer * 0.6) + 1.0;  // Height starts at 1.0
    mesh.position.z = -noteData._time * 2.0;             // Notes come from negative z
    
    // Add direction indicator
    addDirectionIndicator(mesh, noteData._cutDirection);
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.notes.push(mesh);
    
    return mesh;
}

// Add a direction indicator to a note
function addDirectionIndicator(noteMesh, direction) {
    // Skip for dot notes (direction 8)
    if (direction === 8) return;
    
    const arrowGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Position at the center of the note
    arrow.position.set(0, 0, 0.2);
    
    // Rotate based on direction
    // 0 = up, 1 = down, 2 = left, 3 = right,
    // 4 = up-left, 5 = up-right, 6 = down-left, 7 = down-right
    switch (direction) {
        case 0: // Up
            arrow.rotation.x = Math.PI / 2;
            break;
        case 1: // Down
            arrow.rotation.x = -Math.PI / 2;
            break;
        case 2: // Left
            arrow.rotation.z = Math.PI / 2;
            break;
        case 3: // Right
            arrow.rotation.z = -Math.PI / 2;
            break;
        case 4: // Up-Left
            arrow.rotation.x = Math.PI / 4;
            arrow.rotation.z = Math.PI / 4;
            break;
        case 5: // Up-Right
            arrow.rotation.x = Math.PI / 4;
            arrow.rotation.z = -Math.PI / 4;
            break;
        case 6: // Down-Left
            arrow.rotation.x = -Math.PI / 4;
            arrow.rotation.z = Math.PI / 4;
            break;
        case 7: // Down-Right
            arrow.rotation.x = -Math.PI / 4;
            arrow.rotation.z = -Math.PI / 4;
            break;
    }
    
    noteMesh.add(arrow);
}

// Create a 3D object for an obstacle
function createObstacleObject(obstacleData) {
    const width = obstacleData._width * 0.6;
    const height = obstacleData._type === 0 ? 3.0 : 1.0; // Full height or half height
    const depth = obstacleData._duration * 2.0;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshLambertMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on obstacle data
    mesh.position.x = (obstacleData._lineIndex - 1.5) * 0.6 + (width / 2) - 0.3;
    mesh.position.y = (height / 2);
    mesh.position.z = -obstacleData._time * 2.0 - (depth / 2);
    
    // Add to scene and track it
    state.scene.add(mesh);
    state.obstacles.push(mesh);
    
    return mesh;
}

// Animation loop
function animate() {
    if (!state.isPlaying) return;
    
    requestAnimationFrame(animate);
    updateVisualization();
}

// Update visualization
function updateVisualization() {
    if (!state.isPlaying || !state.audioContext) return;
    
    const currentTime = state.audioContext.currentTime - state.startTime;
    const currentBeat = currentTime / state.beatLength;
    
    // Update progress bar
    if (state.audio && state.audio.buffer) {
        const progress = (currentTime / state.audio.buffer.duration) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Calculate player position for visualizing notes
    // In Beat Saber, notes move toward the player at a constant speed
    // Here we're moving the notes based on the current beat
}

// Render function (called by animation loop)
function render() {
    state.renderer.render(state.scene, state.camera);
}

// Log status message
function logStatus(message, isError = false) {
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

// Initialize application when document is ready
document.addEventListener('DOMContentLoaded', init);

