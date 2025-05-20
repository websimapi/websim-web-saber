import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { updateVRStatus } from '../utils/uiManager.js';

// Check if VR is supported
export function checkVRSupport() {
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-vr')
            .then(supported => {
                state.isVRSupported = supported;
                updateVRStatus();
                if (supported) {
                    detectVRHeadset();
                }
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

// Create and append VR button to the document
export function createVRButton(renderer) {
    if (!state.isVRSupported) return null;
    
    const vrButtonContainer = document.createElement('div');
    vrButtonContainer.id = 'vr-button-container';
    vrButtonContainer.style.position = 'absolute';
    vrButtonContainer.style.bottom = '20px';
    vrButtonContainer.style.left = '50%';
    vrButtonContainer.style.transform = 'translateX(-50%)';
    vrButtonContainer.style.zIndex = '999';
    
    const button = VRButton.createButton(renderer);
    // Customize button if needed
    button.style.padding = '12px 24px';
    button.style.fontSize = '16px';
    button.style.backgroundColor = '#00a1ff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
    
    vrButtonContainer.appendChild(button);
    document.body.appendChild(vrButtonContainer);
    
    return button;
}

// Detect VR headset model
export async function detectVRHeadset() {
    if (!state.isVRSupported) return;
    
    try {
        // Request a test session to get device information
        const session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'hand-tracking']
        });
        
        // Check for Quest headsets based on available features and properties
        const isQuest = navigator.userAgent.includes('Quest');
        const isQuest2 = navigator.userAgent.includes('Quest 2');
        const isQuest3 = navigator.userAgent.includes('Quest 3');
        
        if (isQuest3) {
            state.vrHeadset = 'Quest 3';
        } else if (isQuest2) {
            state.vrHeadset = 'Quest 2';
        } else if (isQuest) {
            state.vrHeadset = 'Quest';
        } else {
            // If it's another headset, try to determine from WebXR features
            // More sophisticated detection would check specific capabilities
            state.vrHeadset = 'Unknown VR Headset';
        }
        
        // Adapt settings based on headset
        if (state.vrHeadset.includes('Quest')) {
            // Lower quality settings for Quest 1, higher for Quest 2/3
            if (state.vrHeadset === 'Quest') {
                state.vrQualityLevel = 'low';
            } else if (state.vrHeadset === 'Quest 2') {
                state.vrQualityLevel = 'medium';
            } else {
                state.vrQualityLevel = 'high';
            }
        }
        
        logStatus(`VR Headset detected: ${state.vrHeadset}`);
        updateVRStatus();
        
        // End the test session
        await session.end();
    } catch (error) {
        // This will happen if user declined permission
        console.log("VR detection attempted but couldn't get session:", error);
    }
}

// Set up VR environment
export function setupVREnvironment(scene) {
    // Create VR floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Add environment lighting appropriate for VR
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add distant environment elements
    addEnvironmentElements(scene);
}

// Add environment elements to make the VR space feel more like Beat Saber
function addEnvironmentElements(scene) {
    // Create a skybox
    const skyboxGeometry = new THREE.BoxGeometry(100, 100, 100);
    const skyboxMaterials = Array(6).fill().map(() => 
        new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide
        })
    );
    
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    scene.add(skybox);
    
    // Add grid lines that extend to the distance (like in Beat Saber)
    const gridHelper = new THREE.GridHelper(100, 100, 0x0088ff, 0x0044aa);
    gridHelper.position.y = -0.01; // Slightly below floor to avoid z-fighting
    scene.add(gridHelper);
    
    // Add some columns or features in the distance
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 15;
        
        const column = new THREE.Mesh(
            new THREE.BoxGeometry(1, 10, 1),
            new THREE.MeshStandardMaterial({
                color: 0x0066cc,
                emissive: 0x003366,
                emissiveIntensity: 0.5
            })
        );
        
        column.position.x = Math.cos(angle) * distance;
        column.position.z = Math.sin(angle) * distance;
        column.position.y = 5; // Half height of column
        scene.add(column);
    }
}

// Handle VR session events
export function setupVRSessionEvents(renderer) {
    const vrView = document.getElementById('vr-view');
    const desktopView = document.getElementById('desktop-view');
    
    // Handle entering VR
    renderer.xr.addEventListener('sessionstart', () => {
        state.isInVR = true;
        vrView.classList.remove('hidden');
        desktopView.classList.add('hidden');
        logStatus("VR session started");
    });
    
    // Handle exiting VR
    renderer.xr.addEventListener('sessionend', () => {
        state.isInVR = false;
        vrView.classList.add('hidden');
        desktopView.classList.remove('hidden');
        logStatus("VR session ended");
    });
}