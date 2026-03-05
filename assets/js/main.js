// assets/js/main.js — Stil-echte Illusion: Portal-Bilder + echter Teppich (aus Foto gecroppt)
// Importmap-Version (index.html muss die Importmap enthalten)

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

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
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 1.6, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// ---------------------------
// Controls (PointerLock + WASD)
// ---------------------------
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

if (enterBtn) enterBtn.addEventListener("click", () => controls.lock());

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let sprint = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

const WALK_SPEED = 5.5;
const SPRINT_MULT = 1.8;

let hopV = 0;
const GRAVITY = 18;
const EYE_Y = 1.6;

// Raumgrenzen (Kollision)
const ROOM_W = 20;
const ROOM_D = 20;
const ROOM_H = 5;
const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;
const WALL_PADDING = 0.45;

document.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = true; break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = true; break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = true; break;
    case "KeyD":
    case "ArrowRight":
      moveRight = true; break;

    case "ShiftLeft":
    case "ShiftRight":
      sprint = true; break;

    case "Space":
      if (Math.abs(controls.getObject().position.y - EYE_Y) < 0.001) hopV = 5;
      break;

    case "KeyR":
      controls.getObject().position.set(0, EYE_Y, 7);
      velocity.set(0, 0, 0);
      hopV = 0;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = false; break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = false; break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = false; break;
    case "KeyD":
    case "ArrowRight":
      moveRight = false; break;

    case "ShiftLeft":
    case "ShiftRight":
      sprint = false; break;
  }
});

function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + WALL_PADDING, halfW - WALL_PADDING);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + WALL_PADDING, halfD - WALL_PADDING);
}

// ---------------------------
// Licht (warm + Fensterlicht)
// ---------------------------
const ambient = new THREE.AmbientLight(0xfff2e6, 0.55);
scene.add(ambient);

const windowLight = new THREE.DirectionalLight(0xd8ecff, 0.65);
windowLight.position.set(-8, 6, 2);
scene.add(windowLight);

const keyLight = new THREE.DirectionalLight(0xffe3c7, 0.55);
keyLight.position.set(4, 7, 6);
scene.add(keyLight);

const lamp1 = new THREE.PointLight(0xffd2a1, 0.75, 18, 2);
lamp1.position.set(-3.2, 3.2, -2);
scene.add(lamp1);

const lamp2 = new THREE.PointLight(0xffd2a1, 0.75, 18, 2);
lamp2.position.set(3.2, 3.2, -2);
scene.add(lamp2);

// ---------------------------
// Raum (ruhig, neutral, keine Fake-Möbel)
// ---------------------------
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x8e8e88,
  roughness: 0.95,
  metalness: 0.0
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x7a7a74,
  roughness: 0.98,
  metalness: 0.0
});

// Boden bekommt später Teppich-Texture (fallback jetzt)
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x2f2f2f,
  roughness: 0.98,
  metalness: 0.0
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
scene.add(ceiling);

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

// Subtiles “Fenster” links (nur Lichtgefühl, kein Möbel)
const windowPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(5.5, 2.6),
  new THREE.MeshStandardMaterial({
    color: 0xc6ddff,
    roughness: 0.35,
    metalness: 0.0,
    emissive: 0x1a2a3a,
    emissiveIntensity: 0.22
  })
);
windowPanel.position.set(-halfW + 0.01, 2.2, -3.5);
windowPanel.rotation.y = Math.PI / 2;
scene.add(windowPanel);

// ---------------------------
// Texturen: Portal-Bilder + Teppich aus Foto-Crop
// ---------------------------
const loader = new THREE.TextureLoader();

let ok1 = false;
let ok2 = false;
let okCarpet = false;

const tryReady = () => {
  if (ok1 && ok2 && okCarpet) setStatus("Szene bereit");
};

function makePortal(texture, x, yaw) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // gross, wie “Durchgang”
  const geo = new THREE.PlaneGeometry(7.6, 4.6);
  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geo, mat);

  // knapp vor Rückwand
  mesh.position.set(x, 2.25, -halfD + 0.02);
  mesh.rotation.y = yaw;

  // dezenter Rahmen (gibt Tiefe)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(7.8, 4.8, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, metalness: 0.0 })
  );
  frame.position.copy(mesh.position);
  frame.rotation.copy(mesh.rotation);
  frame.position.z -= 0.05; // minimal hinter Bild
  scene.add(frame);

  scene.add(mesh);
}

function makeCarpetFromImage(image, crop) {
  // crop: {x,y,w,h} in Bild-Pixeln
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  // Ausschnitt auf 512x512 skalieren
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4); // Teppich kacheln
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return tex;
}

// 1) salon1.jpg laden: Portal links + Teppich-Crop
loader.load(
  "/salon3d/assets/img/salon1.jpg",
  (tex) => {
    ok1 = true;
    setStatus("Textur 1 OK");

    // Portal links leicht nach innen
    makePortal(tex, -4.2, 0.10);

    // Teppich-Crop: unterer mittlerer Bereich (robuster Default)
    // Falls du einen anderen Ausschnitt willst: sag “Teppich mehr rechts/links/unterer Rand”.
    const img = tex.image;
    if (img && img.width && img.height) {
      const crop = {
        x: Math.floor(img.width * 0.34),
        y: Math.floor(img.height * 0.62),
        w: Math.floor(img.width * 0.32),
        h: Math.floor(img.height * 0.28)
      };

      const carpetTex = makeCarpetFromImage(img, crop);

      const carpetMat = new THREE.MeshStandardMaterial({
        map: carpetTex,
        roughness: 0.95,
        metalness: 0.0
      });

      // grosser Teppich nach vorne gezogen
      const carpet = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), carpetMat);
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(0, 0.01, -1.0);
      scene.add(carpet);

      okCarpet = true;
    } else {
      // falls image noch nicht verfügbar wäre (selten), wir lassen fallback
      okCarpet = true;
    }

    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 1 konnte nicht geladen werden");
  }
);

// 2) salon2.jpg laden: Portal rechts
loader.load(
  "/salon3d/assets/img/salon2.jpg",
  (tex) => {
    ok2 = true;
    setStatus("Textur 2 OK");

    // Portal rechts leicht nach innen
    makePortal(tex, 4.2, -0.10);

    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 2 konnte nicht geladen werden");
  }
);

// ---------------------------
// Animation
// ---------------------------
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked === true) {
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

    hopV -= GRAVITY * delta;
    controls.getObject().position.y += hopV * delta;

    if (controls.getObject().position.y < EYE_Y) {
      controls.getObject().position.y = EYE_Y;
      hopV = 0;
    }

    clampToRoom(controls.getObject().position);
  }

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
