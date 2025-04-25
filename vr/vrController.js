import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { state } from '../state.js';
import { logStatus } from '../utils/logger.js';

// Set up VR controllers
export function setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
    // Setup controller grip and events for both hands
    for (let i = 0; i < 2; i++) {
        const controller = state.renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        
        // Add controller to scene
        state.scene.add(controller);
        
        // Create controller grip
        const controllerGrip = state.renderer.xr.getControllerGrip(i);
        const controllerModel = controllerModelFactory.createControllerModel(controllerGrip);
        controllerGrip.add(controllerModel);
        state.scene.add(controllerGrip);
        
        // Create and attach sabers to controllers
        const saber = createSaber(i);
        controller.add(saber);
        
        // Store controller reference
        state.controllers.push({ 
            controller, 
            controllerGrip,
            saber,
            hand: i === 0 ? 'left' : 'right'
        });
        
        logStatus(`VR Controller ${i+1} initialized`);
    }
}

// Create Beat Saber style saber for controller
function createSaber(handIndex) {
    const saberGroup = new THREE.Group();
    
    // Saber colors: red for left hand, blue for right hand
    const saberColor = handIndex === 0 ? 0xff0055 : 0x00a1ff;
    const saberGlowColor = handIndex === 0 ? 0xff5599 : 0x66ccff;
    
    // Create saber handle
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2; // Align with controller
    saberGroup.add(handle);
    
    // Create saber blade
    const bladeGeometry = new THREE.CylinderGeometry(0.015, 0.015, 1.0, 16);
    const bladeMaterial = new THREE.MeshStandardMaterial({ 
        color: saberColor,
        emissive: saberColor,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.8
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0, -0.5); // Position blade extending from handle
    blade.rotation.x = Math.PI / 2; // Align with controller
    saberGroup.add(blade);
    
    // Add glow effect
    const glowGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.98, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: saberGlowColor,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, -0.5);
    glow.rotation.x = Math.PI / 2;
    saberGroup.add(glow);
    
    // Position saber relative to controller (might need adjustment based on controller model)
    saberGroup.position.set(0, 0, -0.05);
    saberGroup.rotation.x = -Math.PI / 4; // Angle slightly downward
    
    return saberGroup;
}

// Handle controller select start
function onSelectStart(event) {
    const controller = event.target;
    controller.userData.isSelecting = true;
    
    // You could add haptic feedback here if available
    if (controller.gamepad && controller.gamepad.hapticActuators) {
        controller.gamepad.hapticActuators[0].pulse(0.8, 100);
    }
}

// Handle controller select end
function onSelectEnd(event) {
    const controller = event.target;
    controller.userData.isSelecting = false;
}

// Check for note collisions with sabers
export function checkSaberNoteCollisions() {
    if (!state.isInVR || !state.isPlaying || state.controllers.length < 2) return;
    
    // Get controller positions
    const leftController = state.controllers.find(c => c.hand === 'left')?.controller;
    const rightController = state.controllers.find(c => c.hand === 'right')?.controller;
    
    if (!leftController || !rightController) return;
    
    // Create temporary boxes for collision detection
    const saberBox = new THREE.Box3();
    const noteBox = new THREE.Box3();
    const saberSize = new THREE.Vector3(0.05, 0.05, 1);
    
    // Check collisions with each note
    state.noteObjects.forEach(note => {
        // Skip notes that are too far away
        if (note.position.z > 0.5) return;
        
        // Skip notes that are already hit
        if (note.userData.hit) return;
        
        // Determine which controller to use based on note type
        const isRedNote = note.material.color.r > 0.5 && note.material.color.g < 0.5;
        const controller = isRedNote ? leftController : rightController;
        
        // Update saber collision box
        const saberWorldPosition = new THREE.Vector3();
        controller.getWorldPosition(saberWorldPosition);
        
        // Extend the box in the direction of the controller
        const saberWorldDirection = new THREE.Vector3(0, 0, -1);
        saberWorldDirection.applyQuaternion(controller.quaternion);
        saberWorldDirection.multiplyScalar(0.5);
        
        saberBox.setFromCenterAndSize(
            saberWorldPosition.clone().add(saberWorldDirection),
            saberSize
        );
        
        // Update note collision box
        noteBox.setFromObject(note);
        
        // Check for collision
        if (saberBox.intersectsBox(noteBox)) {
            // Mark note as hit to prevent multiple hits
            note.userData.hit = true;
            
            // Apply hit effect
            applyNoteHitEffect(note);
            
            // Apply haptic feedback if available
            if (controller.gamepad && controller.gamepad.hapticActuators) {
                controller.gamepad.hapticActuators[0].pulse(0.5, 50);
            }
        }
    });
}

// Apply visual effect when a note is hit
function applyNoteHitEffect(note) {
    // Create particle effect
    const particlesCount = 10;
    const particleGroup = new THREE.Group();
    state.scene.add(particleGroup);
    
    const noteColor = note.material.color.clone();
    
    for (let i = 0; i < particlesCount; i++) {
        const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const material = new THREE.MeshBasicMaterial({ 
            color: noteColor,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(note.position);
        
        // Random velocity
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        particleGroup.add(particle);
    }
    
    // Animate particles
    function animateParticles() {
        particleGroup.children.forEach(particle => {
            particle.position.add(particle.userData.velocity);
            particle.material.opacity -= 0.02;
            
            if (particle.material.opacity <= 0) {
                particleGroup.remove(particle);
            }
        });
        
        if (particleGroup.children.length === 0) {
            state.scene.remove(particleGroup);
            return;
        }
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
    
    // Remove the hit note
    state.scene.remove(note);
    const index = state.noteObjects.indexOf(note);
    if (index > -1) {
        state.noteObjects.splice(index, 1);
    }
}