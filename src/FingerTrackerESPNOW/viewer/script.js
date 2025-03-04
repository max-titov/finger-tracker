// Global variables for serial communication
let port;
let reader;
let keepReading = true;
let decoder = new TextDecoder();
let inputBuffer = '';
const MAX_JOINTS = 16;

// Joint values array
let jointValues = new Array(MAX_JOINTS).fill(0);

// DOM elements
const connectButton = document.getElementById('connectButton');
const disconnectButton = document.getElementById('disconnectButton');
const baudRateSelect = document.getElementById('baudRate');
const statusIndicator = document.getElementById('statusIndicator');
const jointsContainer = document.getElementById('jointsContainer');
const logContainer = document.getElementById('logContainer');
const canvasContainer = document.getElementById('canvas-container');

// View control buttons
const frontViewBtn = document.getElementById('frontView');
const sideViewBtn = document.getElementById('sideView');
const topViewBtn = document.getElementById('topView');
const resetViewBtn = document.getElementById('resetView');

// Three.js variables
let scene, camera, renderer, controls;
let hand = {
    palm: null,
    fingers: []
};

// Joint mapping information with inversion flags
const fingerJointMap = [
    // Thumb (4 joints)
    { finger: 0, joint: 0, type: 'CMC_ABDUCTION', min: 0, max: 255, inverted: true },
    { finger: 0, joint: 1, type: 'CMC_FLEXION', min: 0, max: 255, inverted: true },
    { finger: 0, joint: 2, type: 'MCP_FLEXION', min: 0, max: 255, inverted: true },
    { finger: 0, joint: 3, type: 'IP_FLEXION', min: 0, max: 255, inverted: true },
    
    // Index finger (3 joints)
    { finger: 1, joint: 0, type: 'MCP_ABDUCTION', min: 0, max: 255, inverted: true },
    { finger: 1, joint: 1, type: 'MCP_FLEXION', min: 0, max: 255, inverted: false },
    { finger: 1, joint: 2, type: 'PIP_FLEXION', min: 0, max: 255, inverted: true },
    
    // Middle finger (3 joints)
    { finger: 2, joint: 0, type: 'MCP_ABDUCTION', min: 0, max: 255, inverted: true },
    { finger: 2, joint: 1, type: 'MCP_FLEXION', min: 0, max: 255, inverted: true },
    { finger: 2, joint: 2, type: 'PIP_FLEXION', min: 0, max: 255, inverted: true },
    
    // Ring finger (3 joints)
    { finger: 3, joint: 0, type: 'MCP_ABDUCTION', min: 0, max: 255, inverted: true },
    { finger: 3, joint: 1, type: 'MCP_FLEXION', min: 0, max: 255, inverted: false },
    { finger: 3, joint: 2, type: 'PIP_FLEXION', min: 0, max: 255, inverted: false },
    
    // Pinky finger (3 joints)
    { finger: 4, joint: 0, type: 'MCP_ABDUCTION', min: 0, max: 255, inverted: false },
    { finger: 4, joint: 1, type: 'MCP_FLEXION', min: 0, max: 255, inverted: false },
    { finger: 4, joint: 2, type: 'PIP_FLEXION', min: 0, max: 255, inverted: false }
];

// Initialize joint elements in sidebar
function initializeJointElements() {
    jointsContainer.innerHTML = '';
    
    for (let i = 0; i < MAX_JOINTS; i++) {
        const jointElement = document.createElement('div');
        jointElement.className = 'joint-info';
        
        // Get finger and joint info
        const fingerIndex = i < 4 ? 0 : Math.floor((i - 4) / 3) + 1;
        const jointType = fingerJointMap[i]?.type || 'Unknown';
        const fingerName = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'][fingerIndex];
        
        jointElement.innerHTML = `
            <div class="joint-name">${fingerName} - ${jointType}</div>
            <div class="joint-value" id="joint-value-${i}">Value: 0</div>
            <div class="bar-container">
                <div class="bar" id="joint-bar-${i}"></div>
            </div>
            <label class="invert-toggle">
                <input type="checkbox" id="invert-${i}" ${fingerJointMap[i]?.inverted ? 'checked' : ''}>
                Invert Values
            </label>
        `;
        jointsContainer.appendChild(jointElement);
        
        // Add event listener for the invert checkbox
        const invertCheckbox = document.getElementById(`invert-${i}`);
        invertCheckbox.addEventListener('change', (e) => {
            if (i < fingerJointMap.length) {
                fingerJointMap[i].inverted = e.target.checked;
                addLogMessage(`${fingerName} ${jointType} inversion ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
        });
    }
}

// Update joint display in sidebar
function updateJointDisplay(jointIndex, value) {
    const valueElement = document.getElementById(`joint-value-${jointIndex}`);
    const barElement = document.getElementById(`joint-bar-${jointIndex}`);
    
    if (valueElement && barElement) {
        valueElement.textContent = `Value: ${value}`;
        
        // Calculate percentage based on joint's min/max values
        const jointInfo = fingerJointMap[jointIndex];
        const min = jointInfo?.min || 0;
        const max = jointInfo?.max || 255;
        const range = max - min;
        
        const percentage = Math.min(100, Math.max(0, ((value - min) / range) * 100));
        barElement.style.width = `${percentage}%`;
        
        // Change color based on value
        const hue = Math.floor(percentage * 1.2); // 0-120 (red to green)
        barElement.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
    }
}

// Add log message
function addLogMessage(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Limit log entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

// Process incoming data
function processData(data) {
    inputBuffer += data;
    
    // Process complete lines
    let lineEndIndex;
    while ((lineEndIndex = inputBuffer.indexOf('\n')) !== -1) {
        const line = inputBuffer.substring(0, lineEndIndex).trim();
        inputBuffer = inputBuffer.substring(lineEndIndex + 1);
        
        // Check if line matches the expected format
        const jointMatch = line.match(/^>Joint_(\d+):(\d+)$/);
        if (jointMatch) {
            const jointIndex = parseInt(jointMatch[1], 10);
            let jointValue = parseInt(jointMatch[2], 10);
            
            if (jointIndex >= 0 && jointIndex < MAX_JOINTS) {
                // Check if this joint's values should be inverted
                if (fingerJointMap[jointIndex]?.inverted) {
                    // Invert the value based on the type of joint
                    if (fingerJointMap[jointIndex].type.includes('ABDUCTION')) {
                        // For abduction (where 127 is center), invert around 127
                        jointValue = 255 - jointValue;
                    } else {
                        // For flexion, simply invert the range
                        const min = fingerJointMap[jointIndex].min;
                        const max = fingerJointMap[jointIndex].max;
                        jointValue = max - (jointValue - min);
                    }
                }
                
                jointValues[jointIndex] = jointValue;
                updateJointDisplay(jointIndex, jointValue);
                updateHandModel();
            }
        } else {
            // Log other messages
            addLogMessage(`Received: ${line}`);
        }
    }
}

// Read from the serial port
async function readSerialData() {
    while (port.readable && keepReading) {
        reader = port.readable.getReader();
        
        try {
            while (true) {
                const { value, done } = await reader.read();
                
                if (done) {
                    break;
                }
                
                if (value) {
                    processData(decoder.decode(value));
                }
            }
        } catch (error) {
            console.error('Error reading data:', error);
            addLogMessage(`Error: ${error.message}`);
        } finally {
            reader.releaseLock();
        }
    }
}

// Connect to the device
async function connectToDevice() {
    try {
        // Request a port
        port = await navigator.serial.requestPort();
        
        // Get the selected baud rate
        const baudRate = parseInt(baudRateSelect.value, 10);
        
        // Open the port
        await port.open({ baudRate });
        
        // Update UI
        statusIndicator.textContent = 'Status: Connected';
        statusIndicator.className = 'status connected';
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        baudRateSelect.disabled = true;
        
        // Initialize joint elements
        initializeJointElements();
        
        // Log connection
        addLogMessage(`Connected at ${baudRate} baud`);
        
        // Start reading
        keepReading = true;
        readSerialData();
        
    } catch (error) {
        console.error('Error connecting to device:', error);
        addLogMessage(`Connection error: ${error.message}`);
    }
}

// Disconnect from the device
async function disconnectFromDevice() {
    if (port) {
        keepReading = false;
        
        // Close the port
        try {
            await port.close();
            
            // Update UI
            statusIndicator.textContent = 'Status: Disconnected';
            statusIndicator.className = 'status disconnected';
            connectButton.disabled = false;
            disconnectButton.disabled = true;
            baudRateSelect.disabled = false;
            
            // Log disconnection
            addLogMessage('Disconnected');
            
        } catch (error) {
            console.error('Error disconnecting:', error);
            addLogMessage(`Disconnection error: ${error.message}`);
        }
    }
}

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75, // Field of view
        canvasContainer.clientWidth / canvasContainer.clientHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
    );
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasContainer.appendChild(renderer.domElement);
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-1, 1, -1);
    scene.add(directionalLight2);
    
    // Add a grid helper
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);
    
    // Create hand model
    createHandModel();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Create hand model
function createHandModel() {
    // Create materials
    const palmMaterial = new THREE.MeshPhongMaterial({ color: 0xf5c396 });
    const fingerMaterial = new THREE.MeshPhongMaterial({ color: 0xf5c396 });
    const jointMaterial = new THREE.MeshPhongMaterial({ color: 0xe3a977 });
    
    // Create palm
    const palmGeometry = new THREE.BoxGeometry(7, 1, 8);
    hand.palm = new THREE.Mesh(palmGeometry, palmMaterial);
    hand.palm.position.set(0, 0, 0);
    
    // Rotate the entire hand to show palm facing up
    hand.palm.rotation.x = Math.PI; // Rotate 180 degrees around X axis
    scene.add(hand.palm);
    
    // Finger dimensions
    const fingerWidth = 1;
    const fingerHeight = 0.8;
    const fingerSegmentLengths = [3, 2, 1.5]; // MCP, PIP, DIP segment lengths
    const thumbSegmentLengths = [2, 2, 1.5]; // CMC, MCP, IP segment lengths
    
    // Finger positions relative to palm for RIGHT hand with palm facing up
    // From left to right: pinky, ring, middle, index, thumb
    const fingerBasePositions = [
        [3, 0, -2],         // Thumb (far right, positioned lower to curl under)
        [1.5, -0.5, -4],    // Index (right)
        [0, -0.5, -4],      // Middle (center)
        [-1.5, -0.5, -4],   // Ring (left)
        [-3, -0.5, -4]      // Pinky (far left)
    ];
    
    // Initial finger rotations (for natural hand pose)
    const fingerBaseRotations = [
        { x: 0, y: -Math.PI / 3, z: Math.PI / 3 },  // Thumb
        { x: 0, y: -Math.PI / 48, z: 0 },           // Index (slight inward tilt)
        { x: 0, y: Math.PI / 48, z: 0 },            // Middle (very slight outward tilt)
        { x: 0, y: Math.PI / 32, z: 0 },            // Ring (slight outward tilt)
        { x: 0, y: Math.PI / 24, z: 0 }             // Pinky (more outward tilt)
    ];
    
    // Create fingers
    for (let f = 0; f < 5; f++) {
        const finger = {
            name: ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'][f],
            segments: [],
            joints: []
        };
        
        // Determine if this is the thumb
        const isThumb = f === 0;
        const segmentLengths = isThumb ? thumbSegmentLengths : fingerSegmentLengths;
        const segmentCount = segmentLengths.length;
        
        // Create finger base group (attached to palm)
        finger.group = new THREE.Group();
        finger.group.position.set(...fingerBasePositions[f]);
        
        // Apply initial rotations for natural pose
        const baseRotation = fingerBaseRotations[f];
        finger.group.rotation.x = baseRotation.x;
        finger.group.rotation.y = baseRotation.y;
        finger.group.rotation.z = baseRotation.z;
        
        hand.palm.add(finger.group);
        
        // Create segments and joints
        let parentGroup = finger.group;
        
        for (let s = 0; s < segmentCount; s++) {
            // Create segment group
            const segmentGroup = new THREE.Group();
            
            // Create joint sphere at the base of the segment
            const jointGeometry = new THREE.SphereGeometry(fingerWidth * 0.6, 8, 8);
            const joint = new THREE.Mesh(jointGeometry, jointMaterial);
            segmentGroup.add(joint);
            
            // Create segment box, positioned so its base is at the joint
            const segmentGeometry = new THREE.BoxGeometry(fingerWidth, fingerHeight, segmentLengths[s]);
            const segment = new THREE.Mesh(segmentGeometry, fingerMaterial);
            segment.position.z = -segmentLengths[s] / 2; // Position relative to joint
            segmentGroup.add(segment);
            
            // Add segment group to parent
            parentGroup.add(segmentGroup);
            
            // Store references
            finger.segments.push(segmentGroup);
            finger.joints.push(joint);
            
            // Position next segment at the end of this one
            if (s < segmentCount - 1) {
                // Create a connector group that will be positioned at the end of this segment
                const connectorGroup = new THREE.Group();
                connectorGroup.position.z = -segmentLengths[s]; // Position at end of current segment
                segmentGroup.add(connectorGroup);
                
                // The next segment's parent will be this connector
                parentGroup = connectorGroup;
            }
        }
        
        hand.fingers.push(finger);
    }
    
    // Add finger labels for clarity
    addFingerLabels();
    
    // Add a simple hand label using a canvas texture
    addHandLabel();
}

// Function to add finger labels
function addFingerLabels() {
    const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    
    for (let i = 0; i < hand.fingers.length; i++) {
        const finger = hand.fingers[i];
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 32;
        
        // Draw text on the canvas
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = 'Bold 16px Arial';
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(fingerNames[i], canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create a plane to display the texture
        const geometry = new THREE.PlaneGeometry(2, 0.5);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const label = new THREE.Mesh(geometry, material);
        
        // Position the label above the finger
        label.position.set(0, -1.5, -2);
        label.rotation.x = Math.PI / 2; // Make it face up
        
        finger.group.add(label);
    }
}

// Function to add a hand label
function addHandLabel() {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw text on the canvas
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'Bold 24px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('RIGHT HAND (PALM UP)', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create a plane to display the texture
    const geometry = new THREE.PlaneGeometry(7, 1.75);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(geometry, material);
    
    // Position the label below the hand
    label.position.set(0, -2, 0);
    label.rotation.x = Math.PI / 2; // Make it face up
    
    scene.add(label);
}

// Update hand model based on joint values
function updateHandModel() {
    // Map joint values to finger rotations
    for (let i = 0; i < MAX_JOINTS; i++) {
        const jointInfo = fingerJointMap[i];
        if (!jointInfo) continue;
        
        const { finger, joint, type, min, max } = jointInfo;
        const value = jointValues[i];
        
        // Skip if finger or joint doesn't exist
        if (!hand.fingers[finger] || !hand.fingers[finger].segments[joint]) continue;
        
        // Apply rotation based on joint type
        if (type.includes('FLEXION')) {
            // Calculate normalized value (0-1)
            const normalizedValue = (value - min) / (max - min);
            
            // Flexion is rotation around X axis
            let angle = normalizedValue * Math.PI / 2; // 0 to 90 degrees
            
            hand.fingers[finger].segments[joint].rotation.x = angle;
        } 
        else if (type.includes('ABDUCTION')) {
            // For abduction, 127 is center (0 degrees)
            // 0 is full left (-45 degrees) and 255 is full right (45 degrees)
            const normalizedAbduction = (value - 127) / 127; // -1 to 1 range
            
            // Apply different abduction limits and offsets based on finger
            let maxAbductionAngle;
            let abductionOffset = 0; // Default is centered
            
            if (finger === 0) { // Thumb
                maxAbductionAngle = Math.PI / 4; // 45 degrees
            } else if (finger === 1) { // Index
                maxAbductionAngle = Math.PI / 8; // 22.5 degrees
                abductionOffset = -Math.PI / 32; // Slight bias toward middle finger
            } else if (finger === 2) { // Middle
                maxAbductionAngle = Math.PI / 16; // 15 degrees
                // Middle finger has asymmetric range - can move more toward index than ring
                if (normalizedAbduction < 0) { // Moving toward ring finger (limited)
                    maxAbductionAngle = Math.PI / 6; // 9 degrees
                } else { // Moving toward index finger (more range)
                    maxAbductionAngle = Math.PI / 38; // 15 degrees
                }
                abductionOffset = Math.PI / 48; // Very slight bias away from ring finger
            } else if (finger === 3) { // Ring
                maxAbductionAngle = Math.PI / 16; // 11.25 degrees
                abductionOffset = Math.PI / 32; // Slight bias toward pinky
            } else { // Pinky
                maxAbductionAngle = Math.PI / 10; // 18 degrees
                abductionOffset = Math.PI / 24; // Bias toward ring finger
            }
            
            // Calculate angle with offset and limits
            const angle = normalizedAbduction * maxAbductionAngle + abductionOffset;
            
            // For thumb, abduction is different
            if (finger === 0 && joint === 0) {
                // For thumb CMC abduction, rotate around Z axis to move toward/away from palm
                hand.fingers[finger].group.rotation.z = Math.PI / 3 - angle;
            } else {
                // For other fingers, abduction is side-to-side movement
                hand.fingers[finger].group.rotation.y = angle;
            }
        }
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Camera view controls
frontViewBtn.addEventListener('click', () => {
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);
    controls.update();
});

sideViewBtn.addEventListener('click', () => {
    camera.position.set(20, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.update();
});

topViewBtn.addEventListener('click', () => {
    camera.position.set(0, 20, 0);
    camera.lookAt(0, 0, 0);
    controls.update();
});

resetViewBtn.addEventListener('click', () => {
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    controls.update();
});

// Event listeners for serial connection
connectButton.addEventListener('click', connectToDevice);
disconnectButton.addEventListener('click', disconnectFromDevice);

// Check if Web Serial API is supported
if (!navigator.serial) {
    statusIndicator.textContent = 'Status: Web Serial API not supported in this browser';
    connectButton.disabled = true;
    addLogMessage('ERROR: Web Serial API is not supported in this browser. Try Chrome or Edge.');
}

// Initialize Three.js scene
initThreeJS();

// Initialize joint elements
initializeJointElements();

// Add this to the <style> section in the HTML file
const styleElement = document.createElement('style');
styleElement.textContent = `
.invert-toggle {
    display: block;
    margin-top: 5px;
    font-size: 0.8em;
    color: #666;
}

.invert-toggle input {
    margin-right: 5px;
}
`;
document.head.appendChild(styleElement);
