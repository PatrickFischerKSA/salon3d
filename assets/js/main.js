// assets/js/main.js — Salon: Raum + Bilder + PointerLock + WASD + Teppich + Licht + Möbel + Kollision
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

// leichte, warme Grundstimmung (wir arbeiten mit Licht + Farben)
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

// Bewegung
const WALK_SPEED = 5.5;
const SPRINT_MULT = 1.8;

// Hopser (minimal)
let hopV = 0;
const GRAVITY = 18;
const EYE_Y = 1.6;

// Raumgrenzen (Kollision)
const ROOM_W = 20;
const ROOM_D = 20;
const ROOM_H = 5;
const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;
const WALL_PADDING = 0.45; // Abstand zur Wand (damit man nicht clippt)

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
// Licht (warm + Fensterlicht)
// ---------------------------
// Warmes Grundlicht
const ambient = new THREE.AmbientLight(0xfff2e6, 0.55);
scene.add(ambient);

// “Fensterlicht” von links (kühler)
const windowLight = new THREE.DirectionalLight(0xd8ecff, 0.65);
windowLight.position.set(-8, 6, 2);
scene.add(windowLight);

// Warmes Key-Light von vorne/oben
const keyLight = new THREE.DirectionalLight(0xffe3c7, 0.55);
keyLight.position.set(4, 7, 6);
scene.add(keyLight);

// Zwei warme “Lampen”
const lamp1 = new THREE.PointLight(0xffd2a1, 0.8, 18, 2);
lamp1.position.set(-3.5, 3.2, -2);
scene.add(lamp1);

const lamp2 = new THREE.PointLight(0xffd2a1, 0.8, 18, 2);
lamp2.position.set(3.5, 3.2, -2);
scene.add(lamp2);

// ---------------------------
// Materialien Raum (heller, wärmer)
// ---------------------------
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x8b8b86,
  roughness: 0.95,
  metalness: 0.0
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x7a7a74,
  roughness: 0.98,
  metalness: 0.0
});

// Boden: kommt als Teppich später (Texture), fallback zunächst
const floorMatFallback = new THREE.MeshStandardMaterial({
  color: 0x3b3b3b,
  roughness: 0.95,
  metalness: 0.0
});

// ---------------------------
// Raumgeometrie
// ---------------------------
const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const floor = new THREE.Mesh(floorGeo, floorMatFallback);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceilingGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
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

// “Fenster” als helle Fläche links
const windowPanel = new THREE.Mesh(
  new THREE.PlaneGeometry(5.5, 2.6),
  new THREE.MeshStandardMaterial({ color: 0xbfd8ff, roughness: 0.4, metalness: 0.0, emissive: 0x1a2a3a, emissiveIntensity: 0.25 })
);
windowPanel.position.set(-halfW + 0.01, 2.2, -3.5);
windowPanel.rotation.y = Math.PI / 2;
scene.add(windowPanel);

// ---------------------------
// Texturen: Bilder + “Teppich” (gekachelt)
// ---------------------------
const loader = new THREE.TextureLoader();

let tex1Loaded = false;
let tex2Loaded = false;
let carpetLoaded = false;

const tryReady = () => {
  if (tex1Loaded && tex2Loaded && carpetLoaded) setStatus("Szene bereit");
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

    // Teppich: dieselbe Textur gekachelt (Workaround)
    const carpet = tex.clone();
    carpet.colorSpace = THREE.SRGBColorSpace;
    carpet.wrapS = THREE.RepeatWrapping;
    carpet.wrapT = THREE.RepeatWrapping;
    carpet.repeat.set(3, 3);
    carpet.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpet,
      roughness: 0.95,
      metalness: 0.0
    });

    // Teppich als eigenes Plane (leicht über Boden, kein Flimmern)
    const carpetMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.01, -2.0);
    scene.add(carpetMesh);

    carpetLoaded = true;
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
// Möbel (simple, aber salon-typisch)
// ---------------------------
const furniture = new THREE.Group();
scene.add(furniture);

const matWood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85, metalness: 0.0 });
const matFabric = new THREE.MeshStandardMaterial({ color: 0x7a1f1f, roughness: 0.95, metalness: 0.0 });
const matFabric2 = new THREE.MeshStandardMaterial({ color: 0x7b6b58, roughness: 0.95, metalness: 0.0 });
const matTable = new THREE.MeshStandardMaterial({ color: 0x3c2a1a, roughness: 0.8, metalness: 0.0 });

function makeSofa(w, h, d, fabricMat) {
  const g = new THREE.Group();

  // Sitz
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), fabricMat);
  seat.position.y = 0.4 / 2;
  g.add(seat);

  // Rückenlehne
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), fabricMat);
  back.position.set(0, 0.4 + h / 2, -d / 2 + 0.18);
  g.add(back);

  // Armlehnen
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, d), fabricMat);
  armL.position.set(-w / 2 + 0.18, 0.55 / 2, 0);
  g.add(armL);

  const armR = armL.clone();
  armR.position.x = w / 2 - 0.18;
  g.add(armR);

  // Füsse
  const footGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12);
  const footMat = matWood;
  const positions = [
    [-w / 2 + 0.2, 0.09, -d / 2 + 0.2],
    [ w / 2 - 0.2, 0.09, -d / 2 + 0.2],
    [-w / 2 + 0.2, 0.09,  d / 2 - 0.2],
    [ w / 2 - 0.2, 0.09,  d / 2 - 0.2]
  ];
  for (const [x, y, z] of positions) {
    const f = new THREE.Mesh(footGeo, footMat);
    f.position.set(x, y, z);
    g.add(f);
  }

  return g;
}

function makeTable() {
  const g = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.1), matTable);
  top.position.y = 0.78;
  g.add(top);

  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.75, 12);
  const legPositions = [
    [-0.7, 0.375, -0.45],
    [ 0.7, 0.375, -0.45],
    [-0.7, 0.375,  0.45],
    [ 0.7, 0.375,  0.45],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, matWood);
    leg.position.set(x, y, z);
    g.add(leg);
  }
  return g;
}

// Salon-Arrangement: Sofa + 2 Sessel + Tisch
const sofa = makeSofa(3.2, 0.9, 1.15, matFabric2);
sofa.position.set(0, 0, -1.8);
sofa.rotation.y = Math.PI; // Richtung Tisch
furniture.add(sofa);

const chair1 = makeSofa(1.4, 0.8, 1.0, matFabric);
chair1.position.set(-2.2, 0, -0.2);
chair1.rotation.y = Math.PI / 2.2;
furniture.add(chair1);

const chair2 = makeSofa(1.4, 0.8, 1.0, matFabric);
chair2.position.set(2.2, 0, -0.2);
chair2.rotation.y = -Math.PI / 2.2;
furniture.add(chair2);

const table = makeTable();
table.position.set(0, 0, -0.6);
furniture.add(table);

// Sideboard rechts
const sideboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.6), matWood);
sideboard.position.set(halfW - 1.6, 0.45, -2.0);
furniture.add(sideboard);

// kleine “Lampe” auf Sideboard
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.25, 16), matWood);
lampBase.position.set(halfW - 1.6, 0.9 + 0.13, -2.0);
furniture.add(lampBase);

// ---------------------------
// Kollision / Clamp im Raum
// ---------------------------
function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + WALL_PADDING, halfW - WALL_PADDING);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + WALL_PADDING, halfD - WALL_PADDING);
}

// ---------------------------
// Animation Loop
// ---------------------------
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked === true) {
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

    // Hopser / Gravitation
    hopV -= GRAVITY * delta;
    controls.getObject().position.y += hopV * delta;

    if (controls.getObject().position.y < EYE_Y) {
      controls.getObject().position.y = EYE_Y;
      hopV = 0;
    }

    // Raumgrenzen
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
