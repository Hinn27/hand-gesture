// ============================================
// GLOBAL VARIABLES
// ============================================
let scene, camera, renderer, particles;
let particleSystem, particleGeometry, particleMaterial;
let particleCount = 1500;
let particlePositions = [];
let particleVelocities = [];
let currentState = 'scatter'; // scatter, christmas, image
let targetPositions = [];
let transitionSpeed = 0.05;
let particleTypes = []; // 'tree', 'light', 'star', 'ornament'
let christmasLights = [];
let christmasLightsSet = new Set(); // Fast lookup
let lightPulseTime = 0;

// Hand tracking
let hands, videoElement, canvasElement, canvasCtx;
let previewCanvas, previewCtx;
let currentGesture = 'none';
let gestureStableCount = 0;
let gestureStableThreshold = 5;
let lastGesture = 'none';

// Image cycling
let imageIndex = 0;
const imageUrls = [
    './image/photo_2025-12-14_12-50-13.jpg',
    './image/photo_1_2025-12-14_12-50-35.jpg',
    './image/photo_2_2025-12-14_12-50-35.jpg',
    './image/photo_3_2025-12-14_12-50-35.jpg',
    './image/photo_4_2025-12-14_12-50-35.jpg',
    './image/photo_5_2025-12-14_12-50-35.jpg',
    './image/photo_6_2025-12-14_12-50-35.jpg',
    './image/photo_7_2025-12-14_12-50-35.jpg',
    './image/photo_8_2025-12-14_12-50-35.jpg',
    './image/photo_9_2025-12-14_12-50-35.jpg',
    './image/photo_10_2025-12-14_12-50-35.jpg',
    './image/photo_1_2025-12-14_12-51-20.jpg',
    './image/photo_2_2025-12-14_12-51-20.jpg',
    './image/photo_3_2025-12-14_12-51-20.jpg',
    './image/photo_4_2025-12-14_12-51-20.jpg'
];
let currentImageTexture = null;
let imageElement = null;
let displayImageElement = null;
let imageSlideshowContainer = null;
let slideshowInterval = null;
let noHandFrames = 0;
const noHandThreshold = 10; // 10 frames không thấy tay thì trigger scatter

// FPS counter
let lastTime = Date.now();
let fps = 0;

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    console.log('Initializing application...');

    // Get display image element
    displayImageElement = document.getElementById('displayImage');
    imageSlideshowContainer = document.getElementById('imageSlideshow');

    // Setup Three.js
    setupThreeJS();

    // Setup MediaPipe Hands
    await setupMediaPipe();

    // Hide loading screen
    document.getElementById('loading').classList.add('hidden');

    // Start animation loop
    animate();

    console.log('Initialization complete!');
}

// ============================================
// THREE.JS SETUP
// ============================================
function setupThreeJS() {
    const container = document.getElementById('threejs-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000814, 0.001);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    // Renderer - optimized for performance
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio
    container.appendChild(renderer.domElement);

    // Lights - Very dark ambient for dramatic effect
    const ambientLight = new THREE.AmbientLight(0x111122, 0.2);
    scene.add(ambientLight);

    // Spot lights for Christmas tree (will be activated in christmas mode)
    const spotLight1 = new THREE.SpotLight(0xffdd00, 2, 100, Math.PI / 6, 0.5);
    spotLight1.position.set(0, 30, 20);
    spotLight1.target.position.set(0, 0, 0);
    spotLight1.visible = false;
    scene.add(spotLight1);
    scene.add(spotLight1.target);

    const spotLight2 = new THREE.SpotLight(0xff4444, 1.5, 80, Math.PI / 8, 0.5);
    spotLight2.position.set(-15, 10, 15);
    spotLight2.target.position.set(0, 0, 0);
    spotLight2.visible = false;
    scene.add(spotLight2);
    scene.add(spotLight2.target);

    const spotLight3 = new THREE.SpotLight(0x44ff44, 1.5, 80, Math.PI / 8, 0.5);
    spotLight3.position.set(15, 10, 15);
    spotLight3.target.position.set(0, 0, 0);
    spotLight3.visible = false;
    scene.add(spotLight3);
    scene.add(spotLight3.target);

    // Store lights for later access
    window.christmasSpotLights = [spotLight1, spotLight2, spotLight3];

    // Create particle system
    createParticleSystem();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function createParticleSystem() {
    particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        // Random initial positions (scattered)
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Store initial positions
        particlePositions.push(new THREE.Vector3(x, y, z));
        particleVelocities.push(new THREE.Vector3(0, 0, 0));
        targetPositions.push(new THREE.Vector3(x, y, z));
        particleTypes.push('tree');

        // Colors (Christmas theme)
        const colorChoice = Math.random();
        if (colorChoice < 0.25) {
            colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 0; // Red
        } else if (colorChoice < 0.5) {
            colors[i * 3] = 0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0; // Green
        } else if (colorChoice < 0.75) {
            colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1; // White
        } else {
            colors[i * 3] = 1; colors[i * 3 + 1] = 0.84; colors[i * 3 + 2] = 0; // Gold
        }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material with glow effect
    particleMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false
    });

    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
}

// ============================================
// MEDIAPIPE SETUP
// ============================================
async function setupMediaPipe() {
    videoElement = document.getElementById('videoElement');
    canvasElement = document.getElementById('handCanvas');
    previewCanvas = document.getElementById('previewCanvas');

    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
    canvasCtx = canvasElement.getContext('2d');

    previewCanvas.width = 200;
    previewCanvas.height = 150;
    previewCtx = previewCanvas.getContext('2d');

    // Initialize MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onHandResults);

    // Setup camera
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
    });
    videoElement.srcObject = stream;

    // Start processing - lower resolution for better FPS
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 480,
        height: 360
    });
    camera.start();
}

// ============================================
// HAND TRACKING RESULTS
// ============================================
function onHandResults(results) {
    // Clear canvases
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    previewCtx.save();
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.drawImage(results.image, 0, 0, previewCanvas.width, previewCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        noHandFrames = 0; // Reset counter

        // Draw hand landmarks on main canvas - TắT ĐI
        // drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
        //     { color: '#00FF00', lineWidth: 2 });
        // drawLandmarks(canvasCtx, landmarks,
        //     { color: '#FF0000', lineWidth: 1, radius: 3 });

        // Detect gesture
        const gesture = detectGesture(landmarks);

        // Gesture stability check
        if (gesture === lastGesture) {
            gestureStableCount++;
            if (gestureStableCount >= gestureStableThreshold) {
                if (gesture !== currentGesture) {
                    currentGesture = gesture;
                    onGestureChange(gesture);
                }
            }
        } else {
            gestureStableCount = 0;
            lastGesture = gesture;
        }

        updateGestureUI(currentGesture);
    } else {
        // Không có tay
        noHandFrames++;
        if (noHandFrames >= noHandThreshold && currentGesture !== 'none') {
            currentGesture = 'none';
            onGestureChange('none');
            updateGestureUI('none');
        }
    }

    canvasCtx.restore();
    previewCtx.restore();
}

// ============================================
// GESTURE DETECTION
// ============================================
function detectGesture(landmarks) {
    // Landmarks indices:
    // 0: Wrist
    // 4: Thumb tip, 8: Index tip, 12: Middle tip, 16: Ring tip, 20: Pinky tip
    // 5: Index MCP, 9: Middle MCP, 13: Ring MCP, 17: Pinky MCP

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];
    const wrist = landmarks[0];

    // Calculate distances
    const thumbIndexDist = distance3D(thumbTip, indexTip);

    // Check all fingers extended (Open Palm)
    const indexExtended = indexTip.y < indexMCP.y;
    const middleExtended = middleTip.y < middleMCP.y;
    const ringExtended = ringTip.y < ringMCP.y;
    const pinkyExtended = pinkyTip.y < pinkyMCP.y;

    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return 'open';
    }

    // Check OK sign (thumb + index forming circle) - Nới lỏng hơn
    if (thumbIndexDist < 0.08) { // Tăng từ 0.05 lên 0.08
        return 'ok';
    }

    // Check fist (all fingers closed)
    const indexClosed = indexTip.y > indexMCP.y;
    const middleClosed = middleTip.y > middleMCP.y;
    const ringClosed = ringTip.y > ringMCP.y;
    const pinkyClosed = pinkyTip.y > pinkyMCP.y;

    if (indexClosed && middleClosed && ringClosed && pinkyClosed) {
        return 'fist';
    }

    return 'none';
}

function distance3D(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ============================================
// GESTURE EVENT HANDLERS
// ============================================
function onGestureChange(gesture) {
    console.log('Gesture changed to:', gesture);

    switch(gesture) {
        case 'fist':
            transitionToImage(); // Nắm tay hiển thị ảnh
            break;
        case 'open':
            transitionToChristmasTree(); // Xòe tay cây thông
            break;
        case 'none':
            transitionToScatter(); // Không có tay nổ tung
            break;
    }
}

function transitionToChristmasTree() {
    currentState = 'christmas';
    christmasLights = [];
    christmasLightsSet.clear();

    // Ẩn slideshow
    if (imageSlideshowContainer) {
        imageSlideshowContainer.style.display = 'none';
        imageSlideshowContainer.innerHTML = '';
    }

    // Turn on spot lights
    if (window.christmasSpotLights) {
        window.christmasSpotLights.forEach(light => light.visible = true);
    }

    // Enhanced Christmas tree shape
    const colors = particleGeometry.attributes.color.array;

    for (let i = 0; i < particleCount; i++) {
        const ratio = i / particleCount;

        if (ratio < 0.05) {
            // Tree trunk (brown)
            const trunkHeight = -22 + (ratio / 0.05) * 5;
            const trunkRadius = 1.5;
            const angle = Math.random() * Math.PI * 2;
            targetPositions[i].set(
                Math.cos(angle) * trunkRadius,
                trunkHeight,
                Math.sin(angle) * trunkRadius
            );
            particleTypes[i] = 'trunk';
            colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.1;

        } else if (ratio < 0.65) {
            // Tree body (multi-layer cone with more density)
            const treeRatio = (ratio - 0.05) / 0.6;
            const numLayers = 12;
            const layerIndex = Math.floor(treeRatio * numLayers);
            const layer = layerIndex / numLayers;

            // Spiral pattern for more organic look
            const spiralTurns = 3;
            const baseAngle = treeRatio * Math.PI * 2 * spiralTurns;
            const randomAngle = baseAngle + (Math.random() - 0.5) * 0.5;

            // Radius decreases as we go up, with some variation
            const baseRadius = (1 - layer) * 18;
            const radius = baseRadius * (0.7 + Math.random() * 0.3);
            const height = layer * 45 - 17;

            targetPositions[i].set(
                Math.cos(randomAngle) * radius,
                height,
                Math.sin(randomAngle) * radius
            );
            particleTypes[i] = 'tree';

            // Green gradient (darker at bottom, lighter at top)
            const greenIntensity = 0.5 + layer * 0.5;
            colors[i * 3] = 0.1;
            colors[i * 3 + 1] = greenIntensity;
            colors[i * 3 + 2] = 0.1;

        } else if (ratio < 0.7) {
            // LED lights (scattered on tree, will pulse)
            const lightRatio = (ratio - 0.65) / 0.05;
            const layer = Math.random();
            const baseRadius = (1 - layer) * 18;
            const radius = baseRadius * (0.8 + Math.random() * 0.2);
            const angle = Math.random() * Math.PI * 2;
            const height = layer * 45 - 17;

            targetPositions[i].set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            particleTypes[i] = 'light';
            christmasLights.push(i);
            christmasLightsSet.add(i);

            // Colorful lights
            const lightColors = [
                [1, 0, 0],      // Red
                [0, 0.3, 1],    // Blue
                [1, 1, 0],      // Yellow
                [1, 0.5, 0],    // Orange
                [1, 0, 1],      // Magenta
                [0, 1, 1]       // Cyan
            ];
            const lightColor = lightColors[Math.floor(Math.random() * lightColors.length)];
            colors[i * 3] = lightColor[0];
            colors[i * 3 + 1] = lightColor[1];
            colors[i * 3 + 2] = lightColor[2];

        } else if (ratio < 0.75) {
            // Star on top (5-pointed star)
            const starRatio = (ratio - 0.7) / 0.05;
            const starPoints = 5;
            const pointIndex = Math.floor(starRatio * starPoints * 10) % starPoints;
            const angleOffset = (starRatio * 10) % 1;
            const angle = (pointIndex * Math.PI * 2 / starPoints) + angleOffset * (Math.PI * 2 / starPoints);

            // Alternate between inner and outer radius for star shape
            const isOuter = Math.floor(starRatio * starPoints * 2) % 2 === 0;
            const starRadius = isOuter ? 4 : 2;

            targetPositions[i].set(
                Math.cos(angle) * starRadius,
                30 + (Math.random() - 0.5) * 0.5,
                Math.sin(angle) * starRadius
            );
            particleTypes[i] = 'star';
            // Bright golden star
            colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.1;

        } else if (ratio < 0.8) {
            // Ornaments (baubles) scattered on tree
            const layer = Math.random() * 0.8;
            const baseRadius = (1 - layer) * 18;
            const radius = baseRadius * (0.75 + Math.random() * 0.15);
            const angle = Math.random() * Math.PI * 2;
            const height = layer * 45 - 17;

            targetPositions[i].set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            particleTypes[i] = 'ornament';

            // Shiny ornament colors
            const ornamentColors = [
                [1, 0.2, 0.2],    // Red
                [1, 0.84, 0],     // Gold
                [0.8, 0.8, 1],    // Silver/Blue
            ];
            const ornamentColor = ornamentColors[Math.floor(Math.random() * ornamentColors.length)];
            colors[i * 3] = ornamentColor[0];
            colors[i * 3 + 1] = ornamentColor[1];
            colors[i * 3 + 2] = ornamentColor[2];

        } else {
            // "MERRY CHRISTMAS" text particles
            const textRatio = (ratio - 0.8) / 0.2;
            const textWidth = 70;
            const textX = textRatio * textWidth - textWidth / 2;

            // Create two lines: MERRY and CHRISTMAS
            const isFirstLine = textRatio < 0.45;
            const lineY = isFirstLine ? -30 : -35;

            targetPositions[i].set(
                textX + (Math.random() - 0.5) * 1,
                lineY + (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 3
            );
            particleTypes[i] = 'text';

            // Rainbow text effect
            const hue = textRatio;
            colors[i * 3] = Math.abs(Math.sin(hue * Math.PI * 2));
            colors[i * 3 + 1] = Math.abs(Math.sin((hue + 0.33) * Math.PI * 2));
            colors[i * 3 + 2] = Math.abs(Math.sin((hue + 0.66) * Math.PI * 2));
        }
    }

    particleGeometry.attributes.color.needsUpdate = true;
    console.log('Christmas tree with', christmasLights.length, 'LED lights');
}

function transitionToScatter() {
    currentState = 'scatter';
    christmasLights = [];
    christmasLightsSet.clear();

    // Ẩn slideshow
    if (imageSlideshowContainer) {
        imageSlideshowContainer.style.display = 'none';
        imageSlideshowContainer.innerHTML = '';
    }

    // Turn off spot lights, reduce ambient
    if (window.christmasSpotLights) {
        window.christmasSpotLights.forEach(light => light.visible = false);
    }

    // Reduce ambient light for scatter mode
    scene.children.forEach(child => {
        if (child.type === 'AmbientLight') {
            child.intensity = 0.2;
        }
    });

    // Explode particles outward from center
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radiusXZ = Math.random() * 80 + 20;
        const height = (Math.random() - 0.5) * 100;

        targetPositions[i].set(
            Math.cos(angle) * radiusXZ,
            height,
            Math.sin(angle) * radiusXZ
        );

        // Add velocity for explosion effect
        const velocity = 2;
        particleVelocities[i].set(
            (Math.random() - 0.5) * velocity,
            (Math.random() - 0.5) * velocity,
            (Math.random() - 0.5) * velocity
        );

        particleTypes[i] = 'scatter';
    }
}

function transitionToImage() {
    currentState = 'image';

    // Turn off spot lights
    if (window.christmasSpotLights) {
        window.christmasSpotLights.forEach(light => light.visible = false);
    }

    console.log('Starting image slideshow with particle burst!');

    // Hiệu ứng bung tỏa particles
    if (particleSystem) {
        particleSystem.visible = true;
    }

    // Bung tỏa particles ra xung quanh
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radiusXZ = Math.random() * 60 + 30;
        const height = (Math.random() - 0.5) * 80;

        targetPositions[i].set(
            Math.cos(angle) * radiusXZ,
            height,
            Math.sin(angle) * radiusXZ
        );

        // Thêm vận tốc cho hiệu ứng nổ
        const velocity = 1.5;
        particleVelocities[i].set(
            (Math.random() - 0.5) * velocity,
            (Math.random() - 0.5) * velocity,
            (Math.random() - 0.5) * velocity
        );

        particleTypes[i] = 'burst';
    }

    // Hiển thị slideshow ảnh
    if (imageSlideshowContainer) {
        // Clear previous slideshow
        imageSlideshowContainer.innerHTML = '';
        imageSlideshowContainer.style.display = 'block';

        // Tạo nhiều ảnh ở các vị trí khác nhau, slide từ trái qua phải
        const numImages = 5; // Hiển thị 5 ảnh cùng lúc

        for (let i = 0; i < numImages; i++) {
            const imgIndex = (imageIndex + i) % imageUrls.length;
            const img = document.createElement('img');
            img.src = imageUrls[imgIndex];

            // Vị trí ngẫu nhiên theo chiều dọc (không cùng hàng)
            const topPosition = 30 + Math.random() * 60; // 30% - 90% từ trên xuống (hạ xuống)
            const size = 200 + Math.random() * 150; // Kích thước ngẫu nhiên 200-350px
            const delay = i * (3 + Math.random() * 2); // Giãn cách ngẫu nhiên 3-5s
            const duration = 15 + Math.random() * 5; // Thời gian trôi 15-20s
            const startOffset = -400 - (Math.random() * 600); // Offset bắt đầu từ -400 đến -1000px để tránh chồng

            img.style.cssText = `
                position: absolute;
                top: ${topPosition}%;
                left: ${startOffset}px;
                width: ${size}px;
                height: auto;
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                animation: slideRight ${duration}s linear ${delay}s infinite;
                transform: translateY(-50%) rotate(${(Math.random() - 0.5) * 10}deg);
                opacity: 0.9;
            `;

            imageSlideshowContainer.appendChild(img);
        }

        // Cycle image index
        imageIndex = (imageIndex + numImages) % imageUrls.length;
    }
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
    requestAnimationFrame(animate);

    // Update particles towards target positions
    const positions = particleGeometry.attributes.position.array;
    const isChristmas = currentState === 'christmas';
    const isScatter = currentState === 'scatter';
    const isImage = currentState === 'image';

    // Adjust particle size based on mode
    if (isImage) {
        particleMaterial.size = 1.2; // Lớn hơn cho image mode
        particleMaterial.opacity = 1.0; // Sáng hơn
    } else {
        particleMaterial.size = 0.8;
        particleMaterial.opacity = 0.9;
    }

    // Update light pulse time only when needed
    if (isChristmas && christmasLightsSet.size > 0) {
        lightPulseTime += 0.05;
    }

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Lerp towards target
        const tx = targetPositions[i].x;
        const ty = targetPositions[i].y;
        const tz = targetPositions[i].z;

        particlePositions[i].x += (tx - particlePositions[i].x) * transitionSpeed;
        particlePositions[i].y += (ty - particlePositions[i].y) * transitionSpeed;
        particlePositions[i].z += (tz - particlePositions[i].z) * transitionSpeed;

        // Apply velocity (for scatter mode)
        if (isScatter) {
            particlePositions[i].x += particleVelocities[i].x;
            particlePositions[i].y += particleVelocities[i].y;
            particlePositions[i].z += particleVelocities[i].z;

            // Damping
            particleVelocities[i].multiplyScalar(0.95);
        }

        // LED lights pulsing effect (Christmas mode only) - optimized with Set
        if (isChristmas && christmasLightsSet.has(i)) {
            const lightIndex = christmasLights.indexOf(i);
            const pulseOffset = lightIndex * 0.3;
            const pulse = (Math.sin(lightPulseTime + pulseOffset) + 1) / 2;

            // Add glow effect by slightly offsetting position
            const glowOffset = pulse * 0.3;
            const randomX = (Math.random() - 0.5) * glowOffset;
            const randomY = (Math.random() - 0.5) * glowOffset;
            const randomZ = (Math.random() - 0.5) * glowOffset;

            positions[i3] = particlePositions[i].x + randomX;
            positions[i3 + 1] = particlePositions[i].y + randomY;
            positions[i3 + 2] = particlePositions[i].z + randomZ;
            continue;
        }

        positions[i3] = particlePositions[i].x;
        positions[i3 + 1] = particlePositions[i].y;
        positions[i3 + 2] = particlePositions[i].z;
    }

    particleGeometry.attributes.position.needsUpdate = true;

    // Rotate particle system slowly (only in christmas mode)
    if (currentState === 'christmas') {
        particleSystem.rotation.y += 0.003;
    } else {
        particleSystem.rotation.y += 0.001;
    }

    // Render
    renderer.render(scene, camera);
}

// ============================================
// UI UPDATES
// ============================================
function updateGestureUI(gesture) {
    const gestureText = document.getElementById('gestureText');

    // Remove all gesture classes
    gestureText.classList.remove('gesture-fist', 'gesture-open', 'gesture-ok');

    switch(gesture) {
        case 'fist':
            gestureText.textContent = '👊 Nắm tay (Fist)';
            gestureText.classList.add('gesture-fist');
            break;
        case 'open':
            gestureText.textContent = '🖐️ Xòe tay (Open Palm)';
            gestureText.classList.add('gesture-open');
            break;
        case 'none':
            gestureText.textContent = '❌ Không có tay';
            break;
        default:
            gestureText.textContent = 'Waiting...';
    }
}

function updateFPS() {
    const now = Date.now();
    const delta = now - lastTime;
    fps = Math.round(1000 / delta);
    lastTime = now;

    document.getElementById('fps').textContent = fps;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}

// ============================================
// START APPLICATION
// ============================================
init();
