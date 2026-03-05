// assets/js/main.js — Salon_04 möglichst genau nachgebaut (Geometrie statt Foto-Kacheln)
// Voraussetzung: index.html enthält Importmap für "three" und "three/addons/"
// Zusätzliches Bild im Repo: /salon3d/assets/img/Salon_4.jpg

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const statusEl = document.getElementById("status");
const enterBtn = document.getElementById("enterBtn");

const setStatus = (t) => {
  if (statusEl) statusEl.textContent = t;
  console.log("[STATUS]", t);
};

setStatus("Main geladen");

// ------------------------------------------------------------
// Renderer / Szene / Kamera
// ------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
// Perspektive wie Salon_04: Augenhöhe, leicht zurück, Blick Richtung Kamin
camera.position.set(0, 1.62, 8.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x0a0a0a, 1);
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// ------------------------------------------------------------
// Controls (PointerLock + WASD)
// ------------------------------------------------------------
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

const WALK_SPEED = 4.6;
const SPRINT_MULT = 1.7;

let hopV = 0;
const GRAVITY = 18;
const EYE_Y = 1.62;

// ------------------------------------------------------------
// Raum-Masse (ähnlich Foto)
// ------------------------------------------------------------
const ROOM_W = 13.6; // Breite
const ROOM_D = 18.0; // Tiefe
const ROOM_H = 4.2;  // Höhe

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

const WALL_PADDING = 0.40;

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
      controls.getObject().position.set(0, EYE_Y, 8.2);
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

function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + WALL_PADDING, halfW - WALL_PADDING);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + WALL_PADDING, halfD - WALL_PADDING);
}

// ------------------------------------------------------------
// Licht (Salon_04: weich, warm, Fenster links)
// ------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xfff0e1, 0.55);
scene.add(ambient);

// Fensterlicht (kühler) von links vorne
const windowLight = new THREE.DirectionalLight(0xd9ecff, 0.75);
windowLight.position.set(-8, 6, 6);
scene.add(windowLight);

// Warmes Key-Light von rechts/oben
const keyLight = new THREE.DirectionalLight(0xffdfbf, 0.55);
keyLight.position.set(7, 7, 3);
scene.add(keyLight);

// “Lamp” beim Sofa rechts
const lampWarm = new THREE.PointLight(0xffd0a0, 0.9, 14, 2);
lampWarm.position.set(4.7, 2.6, -0.7);
scene.add(lampWarm);

// Kamin-Glow (sehr subtil)
const fireGlow = new THREE.PointLight(0xffb27a, 0.55, 7, 2);
fireGlow.position.set(0, 1.05, -7.75);
scene.add(fireGlow);

// ------------------------------------------------------------
// Materialien (stil-echt: Tapete/Leisten/Holz)
// ------------------------------------------------------------
const matWallTop = new THREE.MeshStandardMaterial({
  color: 0xc9beb2, // tapetenhell
  roughness: 0.95,
  metalness: 0.0
});

const matWallBottom = new THREE.MeshStandardMaterial({
  color: 0x8c7f73, // Täfer/Leiste dunkler
  roughness: 0.9,
  metalness: 0.0
});

const matCeiling = new THREE.MeshStandardMaterial({
  color: 0xcfc8bf,
  roughness: 0.98,
  metalness: 0.0
});

const matWoodFloor = new THREE.MeshStandardMaterial({
  color: 0x6a4a2f,
  roughness: 0.85,
  metalness: 0.0
});

const matWoodDark = new THREE.MeshStandardMaterial({
  color: 0x3f2818,
  roughness: 0.85,
  metalness: 0.0
});

const matGold = new THREE.MeshStandardMaterial({
  color: 0xb08a3a,
  roughness: 0.35,
  metalness: 0.35
});

const matFabricSofa = new THREE.MeshStandardMaterial({
  color: 0xa89a86,
  roughness: 0.95,
  metalness: 0.0
});

const matFabricChair = new THREE.MeshStandardMaterial({
  color: 0xb2a18b,
  roughness: 0.95,
  metalness: 0.0
});

const matMarble = new THREE.MeshStandardMaterial({
  color: 0xded8d2,
  roughness: 0.35,
  metalness: 0.0
});

const matFireBlack = new THREE.MeshStandardMaterial({
  color: 0x171615,
  roughness: 0.85,
  metalness: 0.05
});

// ------------------------------------------------------------
// Raum bauen (Wände zweigeteilt: unten Täfer, oben Tapete)
// ------------------------------------------------------------
const room = new THREE.Group();
scene.add(room);

// Boden
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matWoodFloor);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
room.add(floor);

// Decke
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matCeiling);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
room.add(ceiling);

// Wand-Höhen
const wainscotH = 1.05; // Täferhöhe (Foto ähnlich)
const upperH = ROOM_H - wainscotH;

// Hilfsfunktion für Wand-Teil
function addWallPlane(width, height, material, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  room.add(m);
  return m;
}

// Rückwand (Kaminseite) z = -halfD
addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, -halfD, 0);
addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, -halfD, 0);

// Vorderwand z = +halfD
addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, halfD, Math.PI);
addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, halfD, Math.PI);

// Linke Wand x = -halfW
addWallPlane(ROOM_D, wainscotH, matWallBottom, -halfW, wainscotH / 2, 0, Math.PI / 2);
addWallPlane(ROOM_D, upperH, matWallTop, -halfW, wainscotH + upperH / 2, 0, Math.PI / 2);

// Rechte Wand x = +halfW
addWallPlane(ROOM_D, wainscotH, matWallBottom, halfW, wainscotH / 2, 0, -Math.PI / 2);
addWallPlane(ROOM_D, upperH, matWallTop, halfW, wainscotH + upperH / 2, 0, -Math.PI / 2);

// “Fensterbereich” links (heller Fleck als Illusion – ohne Bild-Trick)
const windowGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.3, 2.9),
  new THREE.MeshStandardMaterial({
    color: 0xd6e7ff,
    roughness: 0.25,
    metalness: 0.0,
    emissive: 0x10233a,
    emissiveIntensity: 0.28
  })
);
windowGlow.position.set(-halfW + 0.01, 2.1, -5.2);
windowGlow.rotation.y = Math.PI / 2;
room.add(windowGlow);

// ------------------------------------------------------------
// Teppich (richtige Perspektive = echte Plane, NICHT kacheln)
// ------------------------------------------------------------
const rug = new THREE.Mesh(
  new THREE.PlaneGeometry(7.6, 6.2), // Foto-Teppich wirkt gross, zentral
  new THREE.MeshStandardMaterial({ color: 0x7b1f1f, roughness: 0.95, metalness: 0.0 })
);
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.01, -2.2);
room.add(rug);

// ------------------------------------------------------------
// Kamin (Salon_04 zentral)
// ------------------------------------------------------------
const fireplace = new THREE.Group();

// Mantel (Marble Block)
const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 0.55), matMarble);
mantel.position.set(0, 1.05, -halfD + 0.35);
fireplace.add(mantel);

// Öffnung
const opening = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.1, 0.35), matFireBlack);
opening.position.set(0, 0.75, -halfD + 0.55);
fireplace.add(opening);

// Feuerholz/Glut (kleine Kugeln)
const emberGeo = new THREE.SphereGeometry(0.06, 10, 10);
const emberMat = new THREE.MeshStandardMaterial({ color: 0xff6d3a, roughness: 0.6, metalness: 0.0, emissive: 0x331000, emissiveIntensity: 0.35 });
for (let i = 0; i < 26; i++) {
  const e = new THREE.Mesh(emberGeo, emberMat);
  e.position.set(
    (Math.random() - 0.5) * 0.9,
    0.55 + Math.random() * 0.25,
    -halfD + 0.68 + (Math.random() - 0.5) * 0.12
  );
  fireplace.add(e);
}

room.add(fireplace);

// ------------------------------------------------------------
// Möbel (Salon_04: Sofa rechts, Sessel vorne links, 2 Sessel beim Kamin)
// ------------------------------------------------------------
function makeSofa() {
  const g = new THREE.Group();

  // Sitz/Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.75, 1.08), matFabricSofa);
  body.position.y = 0.42;
  g.add(body);

  // Rücken
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.75, 0.22), matFabricSofa);
  back.position.set(0, 0.95, -0.43);
  g.add(back);

  // Arme
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 1.06), matFabricSofa);
  const armL = arm.clone(); armL.position.set(-1.62, 0.56, 0); g.add(armL);
  const armR = arm.clone(); armR.position.set( 1.62, 0.56, 0); g.add(armR);

  // Füße
  const footGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12);
  for (const sx of [-1.45, 1.45]) {
    for (const sz of [-0.45, 0.45]) {
      const f = new THREE.Mesh(footGeo, matGold);
      f.position.set(sx, 0.09, sz);
      g.add(f);
    }
  }

  return g;
}

function makeChair() {
  const g = new THREE.Group();

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.62, 0.92), matFabricChair);
  seat.position.y = 0.38;
  g.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.70, 0.20), matFabricChair);
  back.position.set(0, 0.88, -0.36);
  g.add(back);

  const footGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12);
  for (const sx of [-0.46, 0.46]) {
    for (const sz of [-0.35, 0.35]) {
      const f = new THREE.Mesh(footGeo, matGold);
      f.position.set(sx, 0.08, sz);
      g.add(f);
    }
  }

  return g;
}

// Sofa rechts an Wand
const sofa = makeSofa();
sofa.position.set(halfW - 2.1, 0, -0.8);
sofa.rotation.y = -Math.PI / 2; // in den Raum schauen
room.add(sofa);

// Sessel vorne links (Foto: nahe Kamera)
const chairFrontLeft = makeChair();
chairFrontLeft.position.set(-halfW + 2.0, 0, 3.2);
chairFrontLeft.rotation.y = Math.PI / 6;
room.add(chairFrontLeft);

// Zwei Sessel beim Kamin
const chairA = makeChair();
chairA.position.set(-2.2, 0, -5.3);
chairA.rotation.y = Math.PI / 10;
room.add(chairA);

const chairB = makeChair();
chairB.position.set(2.2, 0, -5.3);
chairB.rotation.y = -Math.PI / 10;
room.add(chairB);

// Kleine Tische neben Kamin (dezent)
function makeSideTable() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20), matWoodDark);
  top.position.y = 0.62;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.58, 12), matWoodDark);
  leg.position.y = 0.29;
  g.add(leg);
  return g;
}

const sideTableL = makeSideTable();
sideTableL.position.set(-3.9, 0, -5.1);
room.add(sideTableL);

const sideTableR = makeSideTable();
sideTableR.position.set(3.9, 0, -5.1);
room.add(sideTableR);

// ------------------------------------------------------------
// Vitrine links hinten + Sideboards (Foto-Feeling)
// ------------------------------------------------------------
function makeCabinet(w, h, d) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWoodDark);
  body.position.y = h / 2;
  g.add(body);

  // “Glasfront” (leicht)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, h * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x7da7c7, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.25 })
  );
  glass.position.set(0, h * 0.55, d / 2 + 0.01);
  g.add(glass);

  return g;
}

// Vitrine links hinten
const cabinet = makeCabinet(1.2, 2.4, 0.55);
cabinet.position.set(-halfW + 2.3, 0, -6.4);
room.add(cabinet);

// Sideboard links (unter Fensterzone)
const sideboardL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 0.55), matWoodDark);
sideboardL.position.set(-halfW + 2.6, 0.425, -4.8);
room.add(sideboardL);

// Sideboard rechts (hinter Sofa)
const sideboardR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 0.55), matWoodDark);
sideboardR.position.set(halfW - 2.3, 0.375, -4.9);
room.add(sideboardR);

// Stehlampe rechts neben Sofa (silhouette)
const lamp = new THREE.Group();
const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 14), matGold);
lampStand.position.y = 0.68;
lamp.add(lampStand);

const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.46, 18), new THREE.MeshStandardMaterial({
  color: 0xe8dfd1,
  roughness: 0.8,
  metalness: 0.0
}));
lampShade.position.y = 1.42;
lamp.add(lampShade);

lamp.position.set(halfW - 3.4, 0, -1.0);
room.add(lamp);

// ------------------------------------------------------------
// Bilder (Wandbilder mit goldenen Rahmen) + optional Salon_4.jpg als Referenz-Backdrop
// ------------------------------------------------------------
function makeFramedPainting(w, h, texture, x, y, z, ry) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08), matGold);
  frame.position.set(x, y, z);
  frame.rotation.y = ry;
  room.add(frame);

  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  pic.position.set(x, y, z + (ry === 0 ? 0.045 : -0.045));
  pic.rotation.y = ry;
  room.add(pic);
}

const texLoader = new THREE.TextureLoader();

let texOk = 0;

// Wir nehmen salon1/2 (wenn vorhanden) als Wandbilder, sonst nur Salon_4 als Referenz
texLoader.load(
  "/salon3d/assets/img/salon1.jpg",
  (tex) => {
    texOk++;
    makeFramedPainting(1.6, 1.1, tex, -halfW + 1.3, 2.3, -4.3, Math.PI / 2);
    if (texOk >= 3) setStatus("Szene bereit");
  },
  undefined,
  () => {
    texOk++;
    if (texOk >= 3) setStatus("Szene bereit");
  }
);

texLoader.load(
  "/salon3d/assets/img/salon2.jpg",
  (tex) => {
    texOk++;
    makeFramedPainting(1.9, 1.25, tex, halfW - 0.9, 2.35, -1.9, -Math.PI / 2);
    if (texOk >= 3) setStatus("Szene bereit");
  },
  undefined,
  () => {
    texOk++;
    if (texOk >= 3) setStatus("Szene bereit");
  }
);

// Salon_4.jpg: als grosses Bild über dem Kamin (wie im Vorbild) – das gibt sofort den “Look”
texLoader.load(
  "/salon3d/assets/img/Salon_4.jpg",
  (tex) => {
    texOk++;
    makeFramedPainting(2.8, 1.55, tex, 0, 2.65, -halfD + 0.02, 0);
    // Teppich: als “richtige” Textur aus dem Foto (Ausschnitt), aber NICHT gekachelt über den ganzen Boden!
    // Wir nehmen eine mittige Teppich-Zone aus dem Bild als CanvasTexture.
    const img = tex.image;
    if (img && img.width && img.height) {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");

      // Crop: Teppichzentrum im unteren Bilddrittel (robuster Default für Salon_04)
      const crop = {
        x: Math.floor(img.width * 0.18),
        y: Math.floor(img.height * 0.62),
        w: Math.floor(img.width * 0.64),
        h: Math.floor(img.height * 0.34)
      };

      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, 1024, 1024);

      const rugTex = new THREE.CanvasTexture(canvas);
      rugTex.colorSpace = THREE.SRGBColorSpace;
      rugTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      rug.material = new THREE.MeshStandardMaterial({
        map: rugTex,
        roughness: 0.95,
        metalness: 0.0
      });
      rug.material.needsUpdate = true;
    }

    if (texOk >= 3) setStatus("Szene bereit");
  },
  undefined,
  (err) => {
    console.error(err);
    texOk++;
    if (texOk >= 3) setStatus("Szene bereit");
  }
);

// ------------------------------------------------------------
// Update Loop
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// Resize
// ------------------------------------------------------------
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
