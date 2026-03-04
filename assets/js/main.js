import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

// ------------------------------------------------------------
// Salon3D – ES Modules Version (GitHub Pages kompatibel)
// Erwartete Dateien:
//   assets/img/salon1.jpg
//   assets/img/salon2.jpg
// ------------------------------------------------------------

// Raumdimensionen (in "Metern")
const ROOM_W = 14;
const ROOM_H = 4;
const ROOM_D = 10;

// Kamera-/Player-Setup
const EYE_HEIGHT = 1.6;

// Bewegung
const SPEED = 4.0;
const SPEED_FAST = 7.5;
const DAMPING = 10.0;

// "Teppich nach vorne ziehen" (Textur nach unten verschieben)
// Mehr => Teppich kommt weiter in den Vordergrund (unten ins Bild)
const CARPET_PULL = 0.18;

// Feinjustierung falls Horizont/Komposition leicht verrutscht
// Positive Werte schieben Textur minimal nach oben, negative nach unten
const HORIZON_SHIFT = 0.00;

// Assets
const ASSET = {
  wallA: "./assets/img/salon1.jpg",
  wallB: "./assets/img/salon2.jpg",
};

// Szene
let scene, camera, renderer, controls, room;
const clock = new THREE.Clock();

// Input
const keys = Object.create(null);
let velX = 0;
let velZ = 0;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, EYE_HEIGHT, 2.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.body.appendChild(renderer.domElement);

  // Controls (Pointer Lock)
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) btn.onclick = () => controls.lock();

  // Licht (dezentes Grundlicht)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.15));

  // Raum laden/erstellen
  buildRoom();

  // Events
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onResize);
}

function buildRoom() {
  const loader = new THREE.TextureLoader();

  const loadTexture = (url) =>
    new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

  Promise.all([loadTexture(ASSET.wallA), loadTexture(ASSET.wallB)])
    .then(([tA, tB]) => {
      prepareTexture(tA);
      prepareTexture(tB);

      // Teppich nach vorne: Textur nach unten schieben
      // (wir lassen repeat=1, clampen am Rand)
      tA.offset.set(0, -CARPET_PULL + HORIZON_SHIFT);
      tB.offset.set(0, -CARPET_PULL + HORIZON_SHIFT);

      createRoomMesh(tA, tB);
    })
    .catch(() => {
      // Fallback: grauer Raum
      createFallbackRoom();
    });
}

function prepareTexture(t) {
  // Wichtig: clampen, damit die Ränder nicht wiederholt werden
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;

  // Stabil & scharf genug ohne Risiko
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;

  // Anisotropy hilft bei schrägen Blickwinkeln (optional, safe)
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  t.needsUpdate = true;
}

function createRoomMesh(tA, tB) {
  // Innenraum-Box
  const geo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);

  // Materialien: Wände mit Textur, Decke/Boden neutral (damit kein "Beige-Füllboden" sichtbar wird)
  // Reihenfolge: [right, left, top, bottom, front, back]
  const mats = [
    new THREE.MeshBasicMaterial({ map: tB, side: THREE.BackSide }), // right
    new THREE.MeshBasicMaterial({ map: tB, side: THREE.BackSide }), // left
    new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide }), // top (sehr dunkel)
    new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide }), // bottom (sehr dunkel)
    new THREE.MeshBasicMaterial({ map: tA, side: THREE.BackSide }), // front
    new THREE.MeshBasicMaterial({ map: tA, side: THREE.BackSide }), // back
  ];

  room = new THREE.Mesh(geo, mats);
  room.position.set(0, ROOM_H / 2, 0);
  scene.add(room);

  // Startposition im Raum
  controls.getObject().position.set(0, EYE_HEIGHT, 2.5);
}

function createFallbackRoom() {
  const geo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a, side: THREE.BackSide });
  room = new THREE.Mesh(geo, mat);
  room.position.set(0, ROOM_H / 2, 0);
  scene.add(room);

  controls.getObject().position.set(0, EYE_HEIGHT, 2.5);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, clock.getDelta());

  if (controls.isLocked) {
    updateMovement(dt);
  }

  renderer.render(scene, camera);
}

function updateMovement(dt) {
  // Dämpfung
  velX -= velX * DAMPING * dt;
  velZ -= velZ * DAMPING * dt;

  const forward = keys["KeyW"] || keys["ArrowUp"];
  const back = keys["KeyS"] || keys["ArrowDown"];
  const right = keys["KeyD"] || keys["ArrowRight"];
  const left = keys["KeyA"] || keys["ArrowLeft"];

  const speed = keys["ShiftLeft"] || keys["ShiftRight"] ? SPEED_FAST : SPEED;

  const dirZ = (forward ? 1 : 0) - (back ? 1 : 0);
  const dirX = (right ? 1 : 0) - (left ? 1 : 0);

  if (dirZ !== 0) velZ -= dirZ * speed * dt * 6;
  if (dirX !== 0) velX -= dirX * speed * dt * 6;

  controls.moveRight(-velX * dt);
  controls.moveForward(-velZ * dt);

  // Höhe fixieren
  controls.getObject().position.y = EYE_HEIGHT;

  // Im Raum bleiben
  clampToRoom();

  // Reset
  if (keys["KeyR"]) {
    controls.getObject().position.set(0, EYE_HEIGHT, 2.5);
    velX = 0;
    velZ = 0;
    keys["KeyR"] = false;
  }
}

function clampToRoom() {
  const p = controls.getObject().position;
  const halfW = ROOM_W / 2 - 0.6;
  const halfD = ROOM_D / 2 - 0.6;

  if (p.x > halfW) p.x = halfW;
  if (p.x < -halfW) p.x = -halfW;
  if (p.z > halfD) p.z = halfD;
  if (p.z < -halfD) p.z = -halfD;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
