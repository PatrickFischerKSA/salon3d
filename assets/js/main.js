import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const statusEl = document.getElementById("statusLine");
const startBtn = document.getElementById("startBtn");

function setStatus(msg) {
  statusEl.textContent = msg;
  console.log("[STATUS]", msg);
}

setStatus("Main geladen");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// Camera (sane default)
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.55, 6);

// Controls
const controls = new PointerLockControls(camera, document.body);

// Basic light (subtle)
const hemi = new THREE.HemisphereLight(0xffffff, 0x3a2a1a, 0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 0.55);
dir.position.set(3, 6, 2);
scene.add(dir);

// Room shell (simple but stable; no calibration UI)
const room = new THREE.Group();
scene.add(room);

// Dimensions in "meters" (visual scale)
const ROOM_W = 14;
const ROOM_D = 20;
const ROOM_H = 3.6;
const WALL_Y = ROOM_H / 2;

// Materials
const matWall = new THREE.MeshStandardMaterial({ color: 0xb9b2a8, roughness: 0.95, metalness: 0.0 });
const matCeil = new THREE.MeshStandardMaterial({ color: 0x8e857a, roughness: 1.0, metalness: 0.0 });
const matSkirt = new THREE.MeshStandardMaterial({ color: 0xa39a90, roughness: 0.95, metalness: 0.0 });

// Floor: dark wood-ish (simple, until you add a real wood texture later)
const matFloor = new THREE.MeshStandardMaterial({ color: 0x3a2a1f, roughness: 0.85, metalness: 0.0 });

// Build planes (double-sided so you can’t end up “behind” them and see nothing)
function plane(w, h, mat) {
  const g = new THREE.PlaneGeometry(w, h);
  const m = mat.clone ? mat.clone() : mat;
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// Floor
const floor = plane(ROOM_W, ROOM_D, matFloor);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.position.z = -ROOM_D / 2 + 6; // keep you “in front” nicely
room.add(floor);

// Ceiling
const ceil = plane(ROOM_W, ROOM_D, matCeil);
ceil.rotation.x = Math.PI / 2;
ceil.position.y = ROOM_H;
ceil.position.z = floor.position.z;
room.add(ceil);

// Back wall (we’ll put Salon_4.jpg here)
const backWall = plane(ROOM_W, ROOM_H, matWall);
backWall.position.set(0, WALL_Y, floor.position.z - ROOM_D / 2);
room.add(backWall);

// Side walls
const leftWall = plane(ROOM_D, ROOM_H, matWall);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-ROOM_W / 2, WALL_Y, floor.position.z - ROOM_D / 4);
room.add(leftWall);

const rightWall = plane(ROOM_D, ROOM_H, matWall);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(ROOM_W / 2, WALL_Y, floor.position.z - ROOM_D / 4);
room.add(rightWall);

// Skirting board (simple strip)
const skirtH = 0.45;
const skirtBack = plane(ROOM_W, skirtH, matSkirt);
skirtBack.position.set(0, skirtH / 2, backWall.position.z + 0.01);
room.add(skirtBack);

// Photo panel: Salon_4.jpg – use as “interior reference wall” without distortion hacks
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

setStatus("Lade Salon_4.jpg …");

const SALON4_URL = "/salon3d/assets/img/Salon_4.jpg";

loader.load(
  SALON4_URL,
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = true;

    // Put image on a dedicated plane slightly in front of backWall,
    // and keep aspect ratio based on image size to avoid “stretching”.
    const img = tex.image;
    const aspect = (img && img.width && img.height) ? (img.width / img.height) : (16 / 9);

    const imgH = 3.2;                 // wall picture height
    const imgW = imgH * aspect;        // keep aspect
    const imgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(imgW, imgH),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 1.0,
        metalness: 0.0
      })
    );

    // Position it centered on the back wall, slightly above floor
    imgPlane.position.set(0, 1.65, backWall.position.z + 0.02);
    room.add(imgPlane);

    setStatus("Szene bereit");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("Fehler: Salon_4.jpg nicht geladen (Pfad/Name prüfen)");
  }
);

// Movement (WASD)
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  run: false,
  jump: false
};

let velocityY = 0;
let onGround = true;

function onKeyDown(e) {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.forward = true; break;
    case "KeyS":
    case "ArrowDown":
      keys.backward = true; break;
    case "KeyA":
    case "ArrowLeft":
      keys.left = true; break;
    case "KeyD":
    case "ArrowRight":
      keys.right = true; break;
    case "ShiftLeft":
    case "ShiftRight":
      keys.run = true; break;
    case "Space":
      keys.jump = true; break;
    case "KeyR":
      resetPosition(); break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      keys.forward = false; break;
    case "KeyS":
    case "ArrowDown":
      keys.backward = false; break;
    case "KeyA":
    case "ArrowLeft":
      keys.left = false; break;
    case "KeyD":
    case "ArrowRight":
      keys.right = false; break;
    case "ShiftLeft":
    case "ShiftRight":
      keys.run = false; break;
    case "Space":
      keys.jump = false; break;
  }
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

function resetPosition() {
  // safe reset: always in front of the back wall, above floor
  controls.getObject().position.set(0, 1.55, 6);
  velocityY = 0;
  onGround = true;
  setStatus("Reset Position");
}

// Start button
startBtn.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  setStatus("Maus aktiv (ESC = frei)");
});

controls.addEventListener("unlock", () => {
  setStatus("Maus frei");
});

// Animation loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  // Movement speed
  const baseSpeed = keys.run ? 5.0 : 2.8;

  // Forward/side direction
  let moveX = 0;
  let moveZ = 0;
  if (keys.forward) moveZ -= 1;
  if (keys.backward) moveZ += 1;
  if (keys.left) moveX -= 1;
  if (keys.right) moveX += 1;

  // Normalize diagonal
  const len = Math.hypot(moveX, moveZ) || 1;
  moveX /= len;
  moveZ /= len;

  // Apply movement
  if (controls.isLocked) {
    controls.moveRight(moveX * baseSpeed * dt);
    controls.moveForward(moveZ * baseSpeed * dt);

    // Jump (simple)
    if (keys.jump && onGround) {
      velocityY = 3.8;
      onGround = false;
    }
  }

  // Gravity + floor clamp
  const obj = controls.getObject();
  velocityY += -9.81 * dt;
  obj.position.y += velocityY * dt;

  if (obj.position.y <= 1.55) {
    obj.position.y = 1.55;
    velocityY = 0;
    onGround = true;
  }

  // Simple bounds so you don't leave room & get “weird”
  const minX = -ROOM_W / 2 + 0.6;
  const maxX = ROOM_W / 2 - 0.6;
  const minZ = backWall.position.z + 1.0;       // keep in front of back wall
  const maxZ = floor.position.z + ROOM_D / 2 - 0.6;

  obj.position.x = THREE.MathUtils.clamp(obj.position.x, minX, maxX);
  obj.position.z = THREE.MathUtils.clamp(obj.position.z, minZ, maxZ);

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
