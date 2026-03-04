// assets/js/main.js  (PHASE 3: Raum + Texturen + PointerLock + WASD) — STABIL (jsDelivr)

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const statusEl = document.getElementById("status");
const enterBtn = document.getElementById("enterBtn");

const setStatus = (t) => {
  if (statusEl) statusEl.textContent = t;
  console.log("[STATUS]", t);
};

setStatus("Main geladen");

// ---------------------------
// Szene / Kamera / Renderer
// ---------------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.6, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// ---------------------------
// Licht
// ---------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 4);
scene.add(dir);

// ---------------------------
// Raum
// ---------------------------
const ROOM_W = 20;
const ROOM_D = 20;
const ROOM_H = 5;

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x444444,
  roughness: 0.95,
  metalness: 0.0
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceilingGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x666666,
  roughness: 0.95,
  metalness: 0.0
});
const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
scene.add(ceiling);

const wallMat = new THREE.MeshStandardMaterial({
  color: 0x777777,
  roughness: 0.95,
  metalness: 0.0
});

const backFrontGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H);
const leftRightGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_H);

const backWall = new THREE.Mesh(backFrontGeo, wallMat);
backWall.position.set(0, ROOM_H / 2, -halfD);
scene.add(backWall);

const frontWall = new THREE.Mesh(backFrontGeo, wallMat);
frontWall.position.set(0, ROOM_H / 2, halfD);
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

const leftWall = new THREE.Mesh(leftRightGeo, wallMat);
leftWall.position.set(-halfW, ROOM_H / 2, 0);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

const rightWall = new THREE.Mesh(leftRightGeo, wallMat);
rightWall.position.set(halfW, ROOM_H / 2, 0);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// ---------------------------
// PointerLock + WASD
// ---------------------------
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

if (enterBtn) {
  enterBtn.addEventListener("click", () => controls.lock());
}

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const clock = new THREE.Clock();

const WALK_SPEED = 6;     // m/s (gefühlt)
const SPRINT_MULT = 1.8;  // Shift

let sprint = false;

document.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = true;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = true;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      sprint = true;
      break;
    case "KeyR":
      controls.getObject().position.set(0, 1.6, 7);
      velocity.set(0, 0, 0);
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = false;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = false;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      sprint = false;
      break;
  }
});

// ---------------------------
// Texturen (Bilder an Rückwand)
// ---------------------------
const loader = new THREE.TextureLoader();
let tex1Loaded = false;
let tex2Loaded = false;

const tryReady = () => {
  if (tex1Loaded && tex2Loaded) setStatus("Szene bereit");
};

const makePainting = (texture, x) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const geo = new THREE.PlaneGeometry(6, 4);
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(x, 2.2, -halfD + 0.01);
  scene.add(mesh);
};

loader.load(
  "/salon3d/assets/img/salon1.jpg",
  (tex) => {
    tex1Loaded = true;
    setStatus("Textur 1 OK");
    makePainting(tex, -4);
    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 1 konnte nicht geladen werden");
  }
);

loader.load(
  "/salon3d/assets/img/salon2.jpg",
  (tex) => {
    tex2Loaded = true;
    setStatus("Textur 2 OK");
    makePainting(tex, 4);
    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 2 konnte nicht geladen werden");
  }
);

// ---------------------------
// Render Loop
// ---------------------------
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  // Dämpfung
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  const currentSpeed = WALK_SPEED * (sprint ? SPRINT_MULT : 1);

  if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  renderer.render(scene, camera);
}
animate();

// ---------------------------
// Resize
// ---------------------------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
