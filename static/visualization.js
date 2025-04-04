// Imports
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js";
import { OrbitControls } from "./OrbitControls.js";

// Global Variables
let scene, camera, renderer, controls, earth;
let packages = [];
let clock = new THREE.Clock();
let tooltip = document.getElementById('tooltip');
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let packagePoints;
let lastFetchTime = 0;
const fetchInterval = 500;
let lastLocationUpdateTime = 0;
const locationUpdateInterval = 1000;
let lastPackageCount = 0;

// Package Class
class Package {
    constructor(data) {
        this.data = data;
        this.arrivalTime = data.timestamp;
        this.isVisible = false;
        this.fadeStartTime = null;
        this.fadeDuration = 5000; 
        this.displayDuration = 10; 
        this.position = this.latLongToVector3(data.latitude, data.longitude, 1.01);
    }

    latLongToVector3(lat, lon, radius = 1) {
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon + 90);
        return new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
    }

    update(currentTime) {
        if (!this.isVisible) {
            this.isVisible = true;
            this.fadeStartTime = currentTime + this.displayDuration; 
        }

        if (this.isVisible && currentTime >= this.fadeStartTime) {
            const fadeProgress = (currentTime - this.fadeStartTime) / (this.fadeDuration / 1000);
            if (fadeProgress >= 1) {
                this.isVisible = false;
                return 0;
            }
            return 1 - fadeProgress;
        }
        return this.isVisible ? 1 : 0;
    }
}

// Scene Initialization
async function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const textureLoader = new THREE.TextureLoader();
    earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshPhongMaterial({
            map: textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
            normalMap: textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'),
            specularMap: textureLoader.load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
            emissiveMap: textureLoader.load('earth_lights.gif'),
            emissive: new THREE.Color(0xffd700),
            emissiveIntensity: 0.6,
        })
    );
    scene.add(earth);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.target.set(0, 0, 0);

    await loadPackageData();
    animate();
}

// Load Data from Flask
async function loadPackageData() {
    try {
        console.log("Fetching package data...");
        const response = await fetch('http://localhost:5000/data');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log("Received data:", data);

        // Add only new packets
        const newPackages = data.filter(newPkg => 
            !packages.some(existingPkg => existingPkg.data.timestamp === newPkg.timestamp && existingPkg.data.ip_address === newPkg.ip_address)
        );
        console.log("New packages:", newPackages);

        if (newPackages.length > 0) {
            const newPackageObjects = newPackages.map(item => new Package(item));
            packages.push(...newPackageObjects);
            console.log("Updated packages array length:", packages.length);

            // Dynamically update instanced mesh
            updatePackagePointsMesh();
        }

        lastPackageCount = data.length;
    } catch (error) {
        console.error("Failed to load package data:", error);
    }
}

// Create Instanced Points
function createPackagePoints() {
    const geometry = new THREE.SphereGeometry(0.01, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    packagePoints = new THREE.InstancedMesh(geometry, material, packages.length || 1);
    geometry.computeBoundingSphere();
    scene.add(packagePoints);
}

// Dynamically update instanced mesh
function updatePackagePointsMesh() {
    if (!packagePoints) {
        createPackagePoints();
        return;
    }

    const geometry = packagePoints.geometry;
    const material = packagePoints.material;
    const oldInstanceCount = packagePoints.count;
    const newInstanceCount = packages.length;

    if (newInstanceCount > oldInstanceCount) {
        scene.remove(packagePoints);
        packagePoints.dispose();
        packagePoints = new THREE.InstancedMesh(geometry, material, newInstanceCount);
        geometry.computeBoundingSphere();
        scene.add(packagePoints);

        const dummy = new THREE.Object3D();
        for (let i = 0; i < oldInstanceCount; i++) {
            packagePoints.getMatrixAt(i, dummy.matrix);
            packagePoints.setMatrixAt(i, dummy.matrix);
        }
    }
}

// Update Package Points
function updatePackagePoints(currentTime) {
    if (!packagePoints || !packages.length) {
        console.log("No packagePoints or packages empty");
        return;
    }

    const dummy = new THREE.Object3D();
    const colors = new Float32Array(packages.length * 3);

    let visibleCount = 0;
    packages.forEach((pkg, index) => {
        const opacity = pkg.update(currentTime);
        dummy.position.copy(pkg.position);
        dummy.scale.setScalar(opacity > 0 ? 1 : 0);
        dummy.updateMatrix();
        packagePoints.setMatrixAt(index, dummy.matrix);

        const color = pkg.data.suspicious ? new THREE.Color(0xff0000) : new THREE.Color(0x00ff00);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        if (opacity > 0) visibleCount++;
    });

    console.log(`Visible packages: ${visibleCount}/${packages.length}`);
    packagePoints.instanceMatrix.needsUpdate = true;
    packagePoints.material.color.set(0xffffff);
    packagePoints.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    packagePoints.instanceColor.needsUpdate = true;
}

// Moving camera to location
function moveCameraToLocation(lat, lon) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 90);
    const targetPosition = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

    const distance = 2;
    const cameraPosition = targetPosition.clone().normalize().multiplyScalar(distance);
    camera.position.copy(cameraPosition);

    camera.lookAt(targetPosition);
    controls.update();
}

// Update Common Locations
function updateCommonLocations(currentTime) {
    if (currentTime - lastLocationUpdateTime < locationUpdateInterval / 1000) {
        return;
    }
    lastLocationUpdateTime = currentTime;

    const locationCounts = {};
    packages.forEach(pkg => {
        if (!pkg.isVisible) return;
        const key = `${pkg.data.latitude},${pkg.data.longitude}`;
        locationCounts[key] = (locationCounts[key] || 0) + 1;
    });

    const sortedLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const list = document.getElementById('locations-list');
    list.innerHTML = sortedLocations.map(([key, count]) => {
        const [lat, lon] = key.split(',').map(Number);
        return `<li style="cursor: pointer;" onclick="moveCameraToLocation(${lat}, ${lon})">${key}: ${count} packages</li>`;
    }).join('');
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    const currentTime = clock.getElapsedTime();

    if (currentTime - lastFetchTime >= fetchInterval / 1000) {
        loadPackageData();
        lastFetchTime = currentTime;
    }

    updatePackagePoints(currentTime);
    updateCommonLocations(currentTime);
    controls.update();
    renderer.render(scene, camera);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(packagePoints);
    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        const pkg = packages[instanceId];
        if (pkg && pkg.isVisible) {
            tooltip.style.display = 'block';
            const rect = renderer.domElement.getBoundingClientRect();
            tooltip.style.left = `${mouse.x * rect.width / 2 + rect.width / 2 + 15}px`;
            tooltip.style.top = `${-mouse.y * rect.height / 2 + rect.height / 2 + 15}px`;
            tooltip.innerHTML = `
                <strong>Package Details</strong><br>
                IP: ${pkg.data.ip_address}<br>
                Location: (${pkg.data.latitude}, ${pkg.data.longitude})<br>
                Timestamp: ${new Date(pkg.data.timestamp * 1000).toLocaleString()}<br>
                Suspicious: ${pkg.data.suspicious ? 'Yes' : 'No'}
            `;
        }
    } else {
        tooltip.style.display = 'none';
    }
}

// Event Handlers
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('mousemove', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.set(x, y);
});

window.moveCameraToLocation = moveCameraToLocation;

// Start
init();