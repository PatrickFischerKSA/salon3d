// assets/js/main.js — Salon_04: Materialität per Crops aus Salon_4.jpg + echte 3D-Geometrie
// Voraussetzung: index.html enthält Importmap für "three" und "three/addons/"
// Datei im Repo: /salon3d/assets/img/Salon_4.jpg

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

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
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

let moveForward = false,
  moveBackward = false,
  moveLeft = false,
  moveRight = false,
  sprint = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

const WALK_SPEED = 4.6;
const SPRINT_MULT = 1.7;

let hopV = 0;
const GRAVITY = 18;
const EYE_Y = 1.62;

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

// ------------------------------------------------------------
// Raum-Masse (Foto-Feeling)
// ------------------------------------------------------------
const ROOM_W = 13.6;
const ROOM_D = 18.0;
const ROOM_H = 4.2;

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

const WALL_PADDING = 0.40;

function clampToRoom(pos) {
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + WALL_PADDING, halfW - WALL_PADDING);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + WALL_PADDING, halfD - WALL_PADDING);
}

// ------------------------------------------------------------
// Licht (weich, warm, Fenster links)
// ------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xfff0e1, 0.55);
scene.add(ambient);

const windowLight = new THREE.DirectionalLight(0xd9ecff, 0.78);
windowLight.position.set(-9, 7, 6);
scene.add(windowLight);

const keyLight = new THREE.DirectionalLight(0xffdfbf, 0.58);
keyLight.position.set(8, 7, 2);
scene.add(keyLight);

const lampWarm = new THREE.PointLight(0xffd0a0, 0.95, 16, 2);
lampWarm.position.set(4.8, 2.7, -0.7);
scene.add(lampWarm);

const fireGlow = new THREE.PointLight(0xffb27a, 0.6, 7, 2);
fireGlow.position.set(0, 1.05, -halfD + 0.85);
scene.add(fireGlow);

// ------------------------------------------------------------
// Hilfsfunktionen: Crops aus Salon_4.jpg → CanvasTexture
// ------------------------------------------------------------
function cropTextureFromImage(img, rect, outSize = 1024, repeat = null) {
  // rect: {x,y,w,h} in 0..1 (normiert)
  const sx = Math.max(0, Math.min(1, rect.x));
  const sy = Math.max(0, Math.min(1, rect.y));
  const sw = Math.max(0, Math.min(1 - sx, rect.w));
  const sh = Math.max(0, Math.min(1 - sy, rect.h));

  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");

  const px = Math.floor(img.width * sx);
  const py = Math.floor(img.height * sy);
  const pw = Math.floor(img.width * sw);
  const ph = Math.floor(img.height * sh);

  ctx.drawImage(img, px, py, pw, ph, 0, 0, outSize, outSize);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }

  return tex;
}

// ------------------------------------------------------------
// Materialien (Fallbacks; werden nach Load durch echte Texturen ersetzt)
// ------------------------------------------------------------
const matWallTop = new THREE.MeshStandardMaterial({ color: 0xc9beb2, roughness: 0.95, metalness: 0.0 });
const matWallBottom = new THREE.MeshStandardMaterial({ color: 0x8c7f73, roughness: 0.9, metalness: 0.0 });
const matCeiling = new THREE.MeshStandardMaterial({ color: 0xcfc8bf, roughness: 0.98, metalness: 0.0 });
const matWoodFloor = new THREE.MeshStandardMaterial({ color: 0x6a4a2f, roughness: 0.85, metalness: 0.0 });

const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x3f2818, roughness: 0.85, metalness: 0.0 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.35, metalness: 0.35 });

const matFabricSofa = new THREE.MeshStandardMaterial({ color: 0xa89a86, roughness: 0.95, metalness: 0.0 });
const matFabricChair = new THREE.MeshStandardMaterial({ color: 0xb2a18b, roughness: 0.95, metalness: 0.0 });

const matMarble = new THREE.MeshStandardMaterial({ color: 0xded8d2, roughness: 0.35, metalness: 0.0 });
const matFireBlack = new THREE.MeshStandardMaterial({ color: 0x171615, roughness: 0.85, metalness: 0.05 });

// ------------------------------------------------------------
// Raum bauen (Tapete oben + Täfer unten + Sockel + Stuckleiste)
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

// Wand-Höhen (wie Vorbild)
const wainscotH = 1.05;
const upperH = ROOM_H - wainscotH;

function addWallPlane(width, height, material, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  room.add(m);
  return m;
}

// Wände
const backBottom = addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, -halfD, 0);
const backTop = addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, -halfD, 0);

const frontBottom = addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, halfD, Math.PI);
const frontTop = addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, halfD, Math.PI);

const leftBottom = addWallPlane(ROOM_D, wainscotH, matWallBottom, -halfW, wainscotH / 2, 0, Math.PI / 2);
const leftTop = addWallPlane(ROOM_D, upperH, matWallTop, -halfW, wainscotH + upperH / 2, 0, Math.PI / 2);

const rightBottom = addWallPlane(ROOM_D, wainscotH, matWallBottom, halfW, wainscotH / 2, 0, -Math.PI / 2);
const rightTop = addWallPlane(ROOM_D, upperH, matWallTop, halfW, wainscotH + upperH / 2, 0, -Math.PI / 2);

// Sockelleiste + Stuckleiste (Geometrie)
const baseboardH = 0.12;
const baseboardT = 0.06;
const corniceH = 0.14;
const corniceT = 0.08;

const matTrim = new THREE.MeshStandardMaterial({ color: 0xb9afa4, roughness: 0.9, metalness: 0.0 });

function addTrimBox(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matTrim);
  m.position.set(x, y, z);
  room.add(m);
  return m;
}

// Baseboards (4 Seiten)
addTrimBox(ROOM_W, baseboardH, baseboardT, 0, baseboardH / 2, -halfD + baseboardT / 2);
addTrimBox(ROOM_W, baseboardH, baseboardT, 0, baseboardH / 2, halfD - baseboardT / 2);
addTrimBox(baseboardT, baseboardH, ROOM_D, -halfW + baseboardT / 2, baseboardH / 2, 0);
addTrimBox(baseboardT, baseboardH, ROOM_D, halfW - baseboardT / 2, baseboardH / 2, 0);

// Cornices (4 Seiten)
addTrimBox(ROOM_W, corniceH, corniceT, 0, ROOM_H - corniceH / 2, -halfD + corniceT / 2);
addTrimBox(ROOM_W, corniceH, corniceT, 0, ROOM_H - corniceH / 2, halfD - corniceT / 2);
addTrimBox(corniceT, corniceH, ROOM_D, -halfW + corniceT / 2, ROOM_H - corniceH / 2, 0);
addTrimBox(corniceT, corniceH, ROOM_D, halfW - corniceT / 2, ROOM_H - corniceH / 2, 0);

// “Fenster” links: Öffnung + Vorhang (nur Geometrie + Lichtgefühl)
const windowOpening = new THREE.Mesh(
  new THREE.PlaneGeometry(2.1, 3.0),
  new THREE.MeshStandardMaterial({
    color: 0xd8ebff,
    roughness: 0.25,
    metalness: 0.0,
    emissive: 0x0f2236,
    emissiveIntensity: 0.28
  })
);
windowOpening.position.set(-halfW + 0.01, 2.05, -5.2);
windowOpening.rotation.y = Math.PI / 2;
room.add(windowOpening);

const curtain = new THREE.Mesh(
  new THREE.PlaneGeometry(1.0, 3.2),
  new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.95, metalness: 0.0 })
);
curtain.position.set(-halfW + 0.03, 2.0, -6.2);
curtain.rotation.y = Math.PI / 2;
room.add(curtain);

// ------------------------------------------------------------
// Teppich (Plane, bekommt echte Textur aus Salon_4.jpg)
// ------------------------------------------------------------
const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 6.4), new THREE.MeshStandardMaterial({ color: 0x7b1f1f, roughness: 0.95 }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.012, -2.2);
room.add(rug);

// ------------------------------------------------------------
// Kamin (detaillierter)
// ------------------------------------------------------------
const fireplace = new THREE.Group();
room.add(fireplace);

const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.1, 0.55), matMarble);
mantel.position.set(0, 1.05, -halfD + 0.38);
fireplace.add(mantel);

const inner = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.40), matFireBlack);
inner.position.set(0, 0.78, -halfD + 0.60);
fireplace.add(inner);

const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 12, 40, Math.PI), matMarble);
arch.rotation.x = Math.PI / 2;
arch.position.set(0, 1.05, -halfD + 0.78);
fireplace.add(arch);

const grate = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 }));
grate.position.set(0, 0.45, -halfD + 0.82);
fireplace.add(grate);

// Glut (kleine Kugeln)
const emberGeo = new THREE.SphereGeometry(0.06, 10, 10);
const emberMat = new THREE.MeshStandardMaterial({
  color: 0xff6d3a,
  roughness: 0.6,
  emissive: 0x331000,
  emissiveIntensity: 0.35
});
for (let i = 0; i < 28; i++) {
  const e = new THREE.Mesh(emberGeo, emberMat);
  e.position.set((Math.random() - 0.5) * 0.9, 0.52 + Math.random() * 0.28, -halfD + 0.70 + (Math.random() - 0.5) * 0.14);
  fireplace.add(e);
}

// ------------------------------------------------------------
// Möbel (Formen bleiben simpel, aber jetzt mit Polster-Textur aus Foto)
// ------------------------------------------------------------
function makeSofa() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.75, 1.08), matFabricSofa);
  body.position.y = 0.42;
  g.add(body);

  const back = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.75, 0.22), matFabricSofa);
  back.position.set(0, 0.95, -0.43);
  g.add(back);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.62, 1.06), matFabricSofa);
  const armL = arm.clone();
  armL.position.set(-1.62, 0.56, 0);
  g.add(armL);
  const armR = arm.clone();
  armR.position.set(1.62, 0.56, 0);
  g.add(armR);

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

// Sofa rechts
const sofa = makeSofa();
sofa.position.set(halfW - 2.1, 0, -0.8);
sofa.rotation.y = -Math.PI / 2;
room.add(sofa);

// Sessel vorne links
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

// Sideboards + Vitrine
function makeCabinet(w, h, d) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWoodDark);
  body.position.y = h / 2;
  g.add(body);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, h * 0.72),
    new THREE.MeshStandardMaterial({ color: 0x7da7c7, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.25 })
  );
  glass.position.set(0, h * 0.55, d / 2 + 0.01);
  g.add(glass);
  return g;
}

const cabinet = makeCabinet(1.2, 2.4, 0.55);
cabinet.position.set(-halfW + 2.3, 0, -6.4);
room.add(cabinet);

const sideboardL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 0.55), matWoodDark);
sideboardL.position.set(-halfW + 2.6, 0.425, -4.8);
room.add(sideboardL);

const sideboardR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 0.55), matWoodDark);
sideboardR.position.set(halfW - 2.3, 0.375, -4.9);
room.add(sideboardR);

// Stehlampe rechts
const lamp = new THREE.Group();
const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.35, 14), matGold);
lampStand.position.y = 0.68;
lamp.add(lampStand);

const lampShade = new THREE.Mesh(
  new THREE.ConeGeometry(0.33, 0.46, 18),
  new THREE.MeshStandardMaterial({ color: 0xe8dfd1, roughness: 0.8, metalness: 0.0 })
);
lampShade.position.y = 1.42;
lamp.add(lampShade);

lamp.position.set(halfW - 3.4, 0, -1.0);
room.add(lamp);

// ------------------------------------------------------------
// Bilder: Rahmen + Gemälde (aus Salon_4.jpg Crops)
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

// ------------------------------------------------------------
// Salon_4.jpg laden → Texturen erzeugen + Materialien updaten
// ------------------------------------------------------------
const refLoader = new THREE.TextureLoader();

refLoader.load(
  "/salon3d/assets/img/Salon_4.jpg",
  (refTex) => {
    setStatus("Referenz OK");

    const img = refTex.image;
    if (!img || !img.width || !img.height) {
      setStatus("FEHLER: Referenzbild nicht verfügbar");
      return;
    }

    // 1) Tapete: Crop aus rechter Wand oben (relativ planar), dann kacheln
    // (kleiner Patch -> weniger Perspektiv-Fehler)
    const wallpaperTex = cropTextureFromImage(
      img,
      { x: 0.72, y: 0.12, w: 0.10, h: 0.14 },
      1024,
      { x: 6, y: 3 }
    );

    // 2) Holzfussboden: Crop aus linker vorderer Holzfläche, dann kacheln
    const woodTex = cropTextureFromImage(
      img,
      { x: 0.13, y: 0.78, w: 0.16, h: 0.12 },
      1024,
      { x: 10, y: 10 }
    );

    // 3) Teppich: Crop aus Teppichzentrum (nicht kacheln), auf Teppich-Plane
    const rugTex = cropTextureFromImage(
      img,
      { x: 0.18, y: 0.62, w: 0.64, h: 0.34 },
      1024,
      null
    );

    // 4) Polster (Sofa rechts): kleiner Patch, dann leicht wiederholen
    const upholsteryTex = cropTextureFromImage(
      img,
      { x: 0.79, y: 0.56, w: 0.10, h: 0.10 },
      1024,
      { x: 3, y: 3 }
    );

    // 5) Gemälde über Kamin: Crop
    const paintingCenterTex = cropTextureFromImage(
      img,
      { x: 0.36, y: 0.20, w: 0.28, h: 0.16 },
      1024,
      null
    );

    // 6) Gemälde rechts: Crop
    const paintingRightTex = cropTextureFromImage(
      img,
      { x: 0.80, y: 0.18, w: 0.16, h: 0.22 },
      1024,
      null
    );

    // Materialien aktualisieren
    matWallTop.map = wallpaperTex;
    matWallTop.needsUpdate = true;

    matWoodFloor.map = woodTex;
    matWoodFloor.needsUpdate = true;

    rug.material = new THREE.MeshStandardMaterial({
      map: rugTex,
      roughness: 0.95,
      metalness: 0.0
    });
    rug.material.needsUpdate = true;

    // Polster auf Sofa + Stühle
    matFabricSofa.map = upholsteryTex;
    matFabricSofa.needsUpdate = true;

    matFabricChair.map = upholsteryTex;
    matFabricChair.needsUpdate = true;

    // Gemälde platzieren (wie Vorbild)
    makeFramedPainting(2.8, 1.55, paintingCenterTex, 0, 2.65, -halfD + 0.02, 0);
    makeFramedPainting(2.0, 1.35, paintingRightTex, halfW - 0.85, 2.45, -1.9, -Math.PI / 2);

    setStatus("Szene bereit");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Salon_4.jpg konnte nicht geladen werden");
  }
);

// ------------------------------------------------------------
// Loop
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
