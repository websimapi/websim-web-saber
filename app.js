import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

import * as dom from './dom.js';
import * as ui from './ui.js';
import * as file from './file.js';
import * as map from './map.js';
import * as audio from './audio.js';
import * as visualization from './visualization.js';
import * as vr from './vr.js';

const state = {
    isVRSupported: false,
    isInVR: false,
    currentMap: null,
    currentDifficulty: null,
    isPlaying: false,
    extractedFiles: null,
};

function init() {
    ui.logStatus("Initializing application...");
    vr.checkVRSupport(state, ui.updateVRStatus, ui.logStatus);
    setupEventListeners();
    visualization.setupThreeJS(state, vr.setupVRControllers, onSessionStart, onSessionEnd);
    ui.logStatus("Application initialized and ready!");
}

function onSessionStart() {
    state.isInVR = true;
    dom.vrView.classList.remove('hidden');
    dom.desktopView.classList.add('hidden');
    visualization.onWindowResize();
}

function onSessionEnd() {
    state.isInVR = false;
    dom.vrView.classList.add('hidden');
    dom.desktopView.classList.remove('hidden');
    visualization.onWindowResize();
}

function setupEventListeners() {
    dom.uploadInput.addEventListener('change', (event) => file.handleFileSelect(event, ui));
    dom.processBtn.addEventListener('click', () => file.processMap(state, ui, map, audio, visualization));
    dom.playBtn.addEventListener('click', () => audio.playMap(state, ui, visualization));
    dom.pauseBtn.addEventListener('click', () => audio.pauseMap(state, ui));
}

document.addEventListener('DOMContentLoaded', init);