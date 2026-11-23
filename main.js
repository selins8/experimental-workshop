import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

import { GestureEngine, GESTURES } from './gestures.js';
import { LocomotionController } from './locomotion.js';
import { WebXRHandTracker } from './hand-tracking.js';
import { DesktopHandTracker } from './desktop-hands.js';
import { XRManager } from './xr-manager.js';

const MODEL_SCALE_DENOMINATOR = 70;
const REF_EYE_HEIGHT_M = 1.60;

const container = document.getElementById('scene-container');
const btnEnterVR = document.getElementById('btn-enter-vr');
const btnStartCam = document.getElementById('btn-start-cam');
const btnStopCam = document.getElementById('btn-stop-cam');
const btnResetPos = document.getElementById('btn-reset-pos');
const banner = document.getElementById('status-banner');

const dbgXR = document.getElementById('dbg-xr');
const dbgTracking = document.getElementById('dbg-tracking');
const dbgHand = document.getElementById('dbg-hand');
const dbgPinch = document.getElementById('dbg-pinch');
const dbgSpeed = document.getElementById('dbg-speed');
const dbgRot = document.getElementById('dbg-rot');
const dbgFps = document.getElementById('dbg-fps');

function showBanner(msg, type = 'error') {
  banner.textContent = msg;
  banner.className = `banner ${type === 'info' ? 'info' : ''}`;
  banner.classList.remove('hidden');
}

function hideBanner() {
  banner.classList.add('hidden');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1622);
scene.fog = new THREE.Fog(0x0f1622, 18, 65);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.05,
  120
);
camera.position.set(0, REF_EYE_HEIGHT_M, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

const playerRig = new THREE.Group();
playerRig.position.set(0, 0, 6);
playerRig.add(camera);
scene.add(playerRig);

const handModelFactory = new XRHandModelFactory();
for (let i = 0; i < 2; i++) {
  const hand = renderer.xr.getHand(i);
  hand.add(handModelFactory.createHandModel(hand, 'mesh'));
  playerRig.add(hand);
}

function createVRStatusHUD() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.08),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false })
  );
  mesh.position.set(-0.22, -0.18, -0.75);
  mesh.renderOrder = 999;
  mesh.visible = false;
  camera.add(mesh);

  let lastText = '';
  return {
    setVisible(v) {
      mesh.visible = v;
    },
    update(gesture, hand) {
      const label = `${gesture.toUpperCase()} | ${hand}`;
      if (label === lastText) return;
      lastText = label;

      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = 'rgba(13, 17, 23, 0.78)';
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = gesture === GESTURES.NONE ? '#8b949e' : '#3fb950';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 506, 122);

      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(`GESTURE: ${gesture.toUpperCase()}`, 24, 54);
      ctx.fillStyle = '#8b949e';
      ctx.font = '24px monospace';
      ctx.fillText(`HAND: ${hand}  ·  SCALE 1:70`, 24, 98);
      texture.needsUpdate = true;
    }
  };
}

const vrHud = createVRStatusHUD();

scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(10, 18, 12);
scene.add(dirLight);

const modelRoot = new THREE.Group();
modelRoot.scale.setScalar(MODEL_SCALE_DENOMINATOR);
scene.add(modelRoot);

function buildSampleArchitecturalModel(root) {
  const s = 1 / MODEL_SCALE_DENOMINATOR;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40 * s, 40 * s),
    new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const grid = new THREE.GridHelper(40 * s, 40, 0x3b82f6, 0x2d3748);
  grid.position.y = 0.01 * s;
  root.add(grid);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });

  const addBox = (w, h, d, x, y, z, mat = wallMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, d * s), mat);
    mesh.position.set(x * s, y * s, z * s);
    root.add(mesh);
  };

  addBox(12, 3.6, 0.25, 0, 1.8, -6);
  addBox(0.25, 3.6, 12, -6, 1.8, 0);
  addBox(0.25, 3.6, 12, 6, 1.8, 0);

  addBox(4.8, 3.6, 0.25, -3.6, 1.8, 2);
  addBox(4.8, 3.6, 0.25, 3.6, 1.8, 2);
  addBox(2.4, 1.4, 0.25, 0, 2.9, 2);

  addBox(1.2, 0.5, 1.2, -3.2, 0.25, -2.5, accentMat);
  addBox(1.0, 1.2, 1.0, 0.0, 0.60, -3.5, accentMat);
  addBox(1.4, 2.4, 1.4, 3.2, 1.20, -2.5, accentMat);

  addBox(
    0.15,
    1.70,
    0.15,
    -1.6,
    0.85,
    0.5,
    new THREE.MeshStandardMaterial({ color: 0xf85149 })
  );

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.8 * s);
  arrowShape.lineTo(0.45 * s, 0);
  arrowShape.lineTo(0.18 * s, 0);
  arrowShape.lineTo(0.18 * s, -0.8 * s);
  arrowShape.lineTo(-0.18 * s, -0.8 * s);
  arrowShape.lineTo(-0.18 * s, 0);
  arrowShape.lineTo(-0.45 * s, 0);
  arrowShape.closePath();

  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({ color: 0x3fb950, side: THREE.DoubleSide })
  );
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, 0.02 * s, 4 * s);
  root.add(arrow);
}

buildSampleArchitecturalModel(modelRoot);

export async function loadArchitecturalModel(url) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  modelRoot.add(gltf.scene);
  return gltf.scene;
}

const gestureEngine = new GestureEngine();
const locomotion = new LocomotionController(playerRig, camera);
const xrHandTracker = new WebXRHandTracker();
const desktopHands = new DesktopHandTracker(
  document.getElementById('webcam-video'),
  document.getElementById('webcam-overlay'),
  document.getElementById('webcam-wrapper'),
  (msg) => showBanner(msg)
);

const xrManager = new XRManager(renderer, {
  onSessionStart({ hasHandTracking }) {
    if (desktopHands.running) {
      desktopHands.stop();
      btnStartCam.disabled = false;
      btnStopCam.disabled = true;
    }
    camera.position.set(0, 0, 0);
    vrHud.setVisible(true);
    btnEnterVR.textContent = 'Exit VR';
    dbgXR.textContent = 'Immersive VR';

    if (!hasHandTracking) {
      showBanner('Uyarı: Bu cihaz/oturum WebXR Hand Tracking özelliğini etkinleştirmedi.');
    } else {
      hideBanner();
    }
  },
  onSessionEnd() {
    gestureEngine.reset();
    vrHud.setVisible(false);
    camera.position.set(0, REF_EYE_HEIGHT_M, 0);
    btnEnterVR.textContent = 'Enter VR';
    dbgXR.textContent = 'Inactive';
    dbgTracking.textContent = 'Idle';
  }
});

xrManager.checkSupport().then(({ supported, reason }) => {
  if (supported) {
    btnEnterVR.disabled = false;
  } else {
    btnEnterVR.disabled = true;
    btnEnterVR.title = reason;
    showBanner(`Masaüstü Modu Aktif (${reason})`, 'info');
  }
});

btnEnterVR.addEventListener('click', async () => {
  try {
    await xrManager.enterVR();
  } catch (err) {
    showBanner(`VR oturumu başlatılamadı: ${err.message}`);
  }
});

btnStartCam.addEventListener('click', async () => {
  hideBanner();
  btnStartCam.disabled = true;
  dbgTracking.textContent = 'Loading MediaPipe...';
  try {
    await desktopHands.start();
    btnStopCam.disabled = false;
    dbgTracking.textContent = 'Desktop Webcam';
  } catch (err) {
    btnStartCam.disabled = false;
    dbgTracking.textContent = 'Error';
    showBanner(`Kamera başlatılamadı: ${err.message}`);
  }
});

btnStopCam.addEventListener('click', () => {
  desktopHands.stop();
  gestureEngine.reset();
  btnStartCam.disabled = false;
  btnStopCam.disabled = true;
  dbgTracking.textContent = 'Stopped';
});

btnResetPos.addEventListener('click', () => {
  locomotion.reset();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let prevTime = performance.now();
let fpsFrames = 0;
let fpsLastUpdate = prevTime;

renderer.setAnimationLoop((now, xrFrame) => {
  const deltaTime = (now - prevTime) / 1000;
  prevTime = now;

  let hands = [];
  if (xrManager.isPresenting() && xrFrame) {
    const refSpace = renderer.xr.getReferenceSpace();
    hands = xrHandTracker.extractHands(xrFrame, refSpace);
    dbgTracking.textContent = xrHandTracker.isTracking ? 'WebXR Hands' : 'No Hands';
  } else if (desktopHands.running) {
    hands = desktopHands.detect();
    dbgTracking.textContent = hands.length > 0 ? 'Webcam Active' : 'No Hands';
  }

  const state = gestureEngine.update(hands);
  const activeCamera = xrManager.isPresenting() ? renderer.xr.getCamera() : camera;
  locomotion.update(state.gesture, deltaTime, activeCamera);

  if (xrManager.isPresenting()) {
    vrHud.update(state.gesture, state.hand);
  }

  dbgHand.textContent = state.hand;
  dbgPinch.textContent = state.gesture;
  dbgSpeed.textContent = `${locomotion.currentForwardSpeed.toFixed(2)} m/s`;
  dbgRot.textContent = `${locomotion.currentRotationSpeed.toFixed(1)} °/s`;

  fpsFrames++;
  if (now - fpsLastUpdate >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLastUpdate));
    dbgFps.textContent = String(fps);
    fpsFrames = 0;
    fpsLastUpdate = now;
  }

  renderer.render(scene, camera);
});
