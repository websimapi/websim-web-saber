import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';
import { playMap, pauseMap } from '../audio/audioManager.js';

// Set up VR controllers
export function setupVRControllers() {
    // Clear existing controllers if any
    state.controllers.forEach(ctrl => {
        if (ctrl.controller) state.scene.remove(ctrl.controller);
        if (ctrl.controllerGrip) state.scene.remove(ctrl.controllerGrip);
        if (ctrl.saber) state.scene.remove(ctrl.saber);
    });
    state.controllers = [];
    
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Setup controller grip and events for both hands
    for (let i = 0; i < 2; i++) {
        const controller = state.renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        controller.userData.index = i; // Store index for identification
        state.scene.add(controller);
        
        const controllerGrip = state.renderer.xr.getControllerGrip(i);
        const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);
        controllerGrip.add(controllerModel);
        state.scene.add(controllerGrip);
        
        // Create sabers for each controller
        const saber = createSaber(i);
        controller.add(saber);
        
        state.controllers.push({ 
            controller, 
            controllerGrip, 
            saber,
            hand: i === 0 ? 'left' : 'right' 
        });
    }
    
    logStatus("VR controllers initialized");
}

// Create a saber for a controller
function createSaber(index) {
    // Create saber handle
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.15, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.4,
        metalness: 0.8
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.075;
    
    // Create saber blade
    const bladeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 16);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: index === 0 ? 0xff0055 : 0x00a1ff, // Red for left, blue for right
        emissive: index === 0 ? 0xff0055 : 0x00a1ff,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.8
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.rotation.x = Math.PI / 2;
    blade.position.z = -0.75; // Extend forward from handle
    
    // Create a group to hold the saber parts
    const saber = new THREE.Group();
    saber.add(handle);
    saber.add(blade);
    
    return saber;
}

// Handle controller select start (trigger press)
function onSelectStart(event) {
    const controller = event.target;
    const index = controller.userData.index;
    
    // Haptic feedback if available
    if (controller.gamepad && controller.gamepad.hapticActuators) {
        controller.gamepad.hapticActuators[0].pulse(1.0, 100);
    }
    
    // If we're interacting with the VR menu
    if (state.vrMenu && state.vrMenu.visible) {
        checkVRMenuIntersection(controller, true);
        return;
    }
    
    // Otherwise this is a swing action for playing the game
    const controllerData = state.controllers[index];
    if (controllerData) {
        controllerData.isSwinging = true;
        controllerData.swingStartPosition = controller.position.clone();
        controllerData.swingStartTime = state.renderer.xr.getFrame().predictedDisplayTime;
    }
}

// Handle controller select end (trigger release)
function onSelectEnd(event) {
    const controller = event.target;
    const index = controller.userData.index;
    
    // If we're interacting with the VR menu
    if (state.vrMenu && state.vrMenu.visible) {
        checkVRMenuIntersection(controller, false);
        return;
    }
    
    // Otherwise this is end of swing action
    const controllerData = state.controllers[index];
    if (controllerData) {
        controllerData.isSwinging = false;
    }
}

// Check for menu intersections
function checkVRMenuIntersection(controller, isSelectStart) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    // Intersect with menu items
    const intersects = raycaster.intersectObjects(state.vrMenuItems);
    
    if (intersects.length > 0 && isSelectStart) {
        const intersectedItem = intersects[0].object;
        const menuAction = intersectedItem.userData.action;
        
        // Provide haptic feedback
        if (controller.gamepad && controller.gamepad.hapticActuators) {
            controller.gamepad.hapticActuators[0].pulse(0.8, 50);
        }
        
        // Execute menu action
        executeVRMenuAction(menuAction);
    }
}

// Execute a VR menu action
function executeVRMenuAction(action) {
    switch (action) {
        case 'play':
            playMap();
            toggleVRMenu(false);
            break;
        case 'pause':
            pauseMap();
            break;
        case 'restart':
            pauseMap();
            setTimeout(() => playMap(), 300);
            toggleVRMenu(false);
            break;
        case 'menu':
            toggleVRMenu(true);
            break;
        case 'exit':
            state.renderer.xr.getSession().end();
            break;
        default:
            logStatus(`Unknown VR menu action: ${action}`);
    }
}

// Create VR menu system
export function createVRMenu(scene) {
    // Remove existing menu if any
    if (state.vrMenu) {
        scene.remove(state.vrMenu);
    }
    
    state.vrMenuItems = [];
    
    // Create menu group
    const menuGroup = new THREE.Group();
    menuGroup.position.set(0, 1.5, -1.5); // Position in front of user at eye level
    
    // Create menu panel background
    const menuPanelGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const menuPanelMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.7
    });
    const menuPanel = new THREE.Mesh(menuPanelGeometry, menuPanelMaterial);
    menuGroup.add(menuPanel);
    
    // Create menu items
    const menuItems = [
        { label: 'Play', action: 'play', position: [0, 0.2, 0.01], color: 0x00ff00 },
        { label: 'Pause', action: 'pause', position: [0, 0.05, 0.01], color: 0xffff00 },
        { label: 'Restart', action: 'restart', position: [0, -0.1, 0.01], color: 0x00a1ff },
        { label: 'Exit VR', action: 'exit', position: [0, -0.25, 0.01], color: 0xff0055 }
    ];
    
    // Add menu title
    const loader = new THREE.FontLoader();
    // For simplicity, using a basic approach without loading custom fonts
    menuItems.forEach(item => {
        const buttonGeometry = new THREE.PlaneGeometry(0.8, 0.1);
        const buttonMaterial = new THREE.MeshBasicMaterial({ 
            color: item.color,
            transparent: true,
            opacity: 0.9
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(...item.position);
        button.userData.action = item.action;
        
        // Add text label using a canvas texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#ffffff';
        context.fillText(item.label, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        const textGeometry = new THREE.PlaneGeometry(0.7, 0.08);
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.z = 0.01;
        
        button.add(text);
        menuGroup.add(button);
        state.vrMenuItems.push(button);
    });
    
    // Add the menu to the scene
    scene.add(menuGroup);
    state.vrMenu = menuGroup;
    
    // Menu starts hidden
    menuGroup.visible = false;
    
    return menuGroup;
}

// Toggle VR menu visibility
export function toggleVRMenu(visible) {
    if (state.vrMenu) {
        state.vrMenu.visible = visible !== undefined ? visible : !state.vrMenu.visible;
    }
}

// Update controller and saber movement
export function updateVRControllers() {
    if (!state.isInVR || !state.isPlaying) return;
    
    // Check for note hits with sabers
    checkSaberNoteCollisions();
    
    // Animate sabers with some trail effects
    animateSaberTrails();
}

// Check for collisions between sabers and notes
function checkSaberNoteCollisions() {
    if (!state.isPlaying || !state.controllers || state.controllers.length < 2) return;
    
    state.controllers.forEach(controllerData => {
        if (!controllerData.isSwinging) return;
        
        const controller = controllerData.controller;
        const saber = controllerData.saber;
        
        if (!controller || !saber) return;
        
        // Create a bounding box for the saber
        const saberPosition = new THREE.Vector3();
        controller.getWorldPosition(saberPosition);
        
        // Get the blade direction based on controller orientation
        const saberDirection = new THREE.Vector3(0, 0, -1);
        saberDirection.applyQuaternion(controller.quaternion);
        
        // Create a ray from the controller position in the saber direction
        const ray = new THREE.Ray(saberPosition, saberDirection);
        
        // Check for intersections with notes
        state.noteObjects.forEach(note => {
            if (note.userData.hit) return; // Skip already hit notes
            
            // Create a temporary bounding box for the note
            const noteBox = new THREE.Box3().setFromObject(note);
            
            // Check if ray intersects note
            const intersection = ray.intersectsBox(noteBox);
            
            if (intersection) {
                // Check if the correct saber color is hitting the note
                const isRightColor = (
                    (controllerData.hand === 'left' && note.material.color.getHex() === 0xff0055) ||
                    (controllerData.hand === 'right' && note.material.color.getHex() === 0x00a1ff)
                );
                
                if (isRightColor) {
                    hitNote(note, saberDirection);
                }
            }
        });
    });
}

// Handle when a note is hit
function hitNote(note, direction) {
    // Mark note as hit
    note.userData.hit = true;
    
    // Create slicing effect
    createSliceEffect(note.position.clone(), direction, note.material.color);
    
    // Hide the note
    note.visible = false;
    
    // Add score (not implemented in this example)
    
    // Remove the note after a short delay
    setTimeout(() => {
        if (note.parent) note.parent.remove(note);
    }, 300);
}

// Create a visual effect when a note is sliced
function createSliceEffect(position, direction, color) {
    // Create two half-cubes as the sliced note parts
    const halfSize = 0.2;
    const geometry = new THREE.BoxGeometry(halfSize, halfSize, halfSize);
    
    for (let i = 0; i < 2; i++) {
        const material = new THREE.MeshLambertMaterial({
            color: color.getHex(),
            emissive: color.getHex(),
            emissiveIntensity: 0.5
        });
        
        const halfCube = new THREE.Mesh(geometry, material);
        halfCube.position.copy(position);
        halfCube.position.x += (i === 0 ? -1 : 1) * 0.1;
        
        // Calculate velocity for the half cube
        const velocity = direction.clone();
        velocity.multiplyScalar(0.05);
        velocity.x += (i === 0 ? -1 : 1) * 0.02;
        halfCube.userData.velocity = velocity;
        
        // Calculate rotation for the half cube
        const angularVelocity = new THREE.Vector3(
            Math.random() * 0.2 - 0.1,
            Math.random() * 0.2 - 0.1,
            Math.random() * 0.2 - 0.1
        );
        halfCube.userData.angularVelocity = angularVelocity;
        
        // Add to scene
        state.scene.add(halfCube);
        
        // Remove after 1 second
        setTimeout(() => {
            state.scene.remove(halfCube);
        }, 1000);
    }
}

// Animate saber trails for a more dynamic effect
function animateSaberTrails() {
    // A more complex implementation would add trail geometries that follow the saber movement
}