// assets/js/main.js — Salon_04: historischer Stil (Rundungen/Beine/Rahmen) + Texturen aus Salon_4.jpg
// Voraussetzung: index.html hat Importmap für "three" und "three/addons/"
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

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
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
const ambient = new THREE.AmbientLight(0xfff0e1, 0.52);
scene.add(ambient);

const windowLight = new THREE.DirectionalLight(0xd9ecff, 0.80);
windowLight.position.set(-9, 7, 6);
scene.add(windowLight);

const keyLight = new THREE.DirectionalLight(0xffdfbf, 0.60);
keyLight.position.set(8, 7, 2);
scene.add(keyLight);

const lampWarm = new THREE.PointLight(0xffd0a0, 1.05, 16, 2);
lampWarm.position.set(4.8, 2.7, -0.7);
scene.add(lampWarm);

const fireGlow = new THREE.PointLight(0xffb27a, 0.65, 7, 2);
fireGlow.position.set(0, 1.05, -halfD + 0.85);
scene.add(fireGlow);

// ------------------------------------------------------------
// Textur-Crops aus Salon_4.jpg
// (rect: normiert 0..1)
// ------------------------------------------------------------
function cropTextureFromImage(img, rect, outW = 1024, outH = 1024, repeat = null) {
  const sx = Math.max(0, Math.min(1, rect.x));
  const sy = Math.max(0, Math.min(1, rect.y));
  const sw = Math.max(0, Math.min(1 - sx, rect.w));
  const sh = Math.max(0, Math.min(1 - sy, rect.h));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");

  const px = Math.floor(img.width * sx);
  const py = Math.floor(img.height * sy);
  const pw = Math.floor(img.width * sw);
  const ph = Math.floor(img.height * sh);

  ctx.drawImage(img, px, py, pw, ph, 0, 0, outW, outH);

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
// Materialien (Fallbacks; werden nach Load ersetzt)
// ------------------------------------------------------------
const matCeiling = new THREE.MeshStandardMaterial({ color: 0xcfc8bf, roughness: 0.98, metalness: 0.0 });

const matWallTop = new THREE.MeshStandardMaterial({
  color: 0xc9beb2,
  roughness: 0.95,
  metalness: 0.0
});

const matWallBottom = new THREE.MeshStandardMaterial({
  color: 0x8c7f73,
  roughness: 0.92,
  metalness: 0.0
});

const matTrim = new THREE.MeshStandardMaterial({
  color: 0xb9afa4,
  roughness: 0.90,
  metalness: 0.0
});

const matWoodFloor = new THREE.MeshStandardMaterial({
  color: 0x6a4a2f,
  roughness: 0.82,
  metalness: 0.0
});

const matWoodDark = new THREE.MeshStandardMaterial({
  color: 0x3f2818,
  roughness: 0.84,
  metalness: 0.0
});

const matGold = new THREE.MeshStandardMaterial({
  color: 0xb08a3a,
  roughness: 0.30,
  metalness: 0.40
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

const matUpholstery = new THREE.MeshStandardMaterial({
  color: 0xb2a18b,
  roughness: 0.92,
  metalness: 0.0
});

const matUpholsteryAlt = new THREE.MeshStandardMaterial({
  color: 0x9f8f7c,
  roughness: 0.92,
  metalness: 0.0
});

// ------------------------------------------------------------
// Raum bauen (Tapete + Täfer + Sockel + Stuckleiste)
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
const wainscotH = 1.05;
const upperH = ROOM_H - wainscotH;

function addWallPlane(width, height, material, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  room.add(m);
  return m;
}

addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, -halfD, 0);
addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, -halfD, 0);

addWallPlane(ROOM_W, wainscotH, matWallBottom, 0, wainscotH / 2, halfD, Math.PI);
addWallPlane(ROOM_W, upperH, matWallTop, 0, wainscotH + upperH / 2, halfD, Math.PI);

addWallPlane(ROOM_D, wainscotH, matWallBottom, -halfW, wainscotH / 2, 0, Math.PI / 2);
addWallPlane(ROOM_D, upperH, matWallTop, -halfW, wainscotH + upperH / 2, 0, Math.PI / 2);

addWallPlane(ROOM_D, wainscotH, matWallBottom, halfW, wainscotH / 2, 0, -Math.PI / 2);
addWallPlane(ROOM_D, upperH, matWallTop, halfW, wainscotH + upperH / 2, 0, -Math.PI / 2);

// Sockel + Stuck
const baseboardH = 0.12;
const baseboardT = 0.06;
const corniceH = 0.14;
const corniceT = 0.08;

function addTrimBox(w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matTrim);
  m.position.set(x, y, z);
  room.add(m);
  return m;
}

addTrimBox(ROOM_W, baseboardH, baseboardT, 0, baseboardH / 2, -halfD + baseboardT / 2);
addTrimBox(ROOM_W, baseboardH, baseboardT, 0, baseboardH / 2, halfD - baseboardT / 2);
addTrimBox(baseboardT, baseboardH, ROOM_D, -halfW + baseboardT / 2, baseboardH / 2, 0);
addTrimBox(baseboardT, baseboardH, ROOM_D, halfW - baseboardT / 2, baseboardH / 2, 0);

addTrimBox(ROOM_W, corniceH, corniceT, 0, ROOM_H - corniceH / 2, -halfD + corniceT / 2);
addTrimBox(ROOM_W, corniceH, corniceT, 0, ROOM_H - corniceH / 2, halfD - corniceT / 2);
addTrimBox(corniceT, corniceH, ROOM_D, -halfW + corniceT / 2, ROOM_H - corniceH / 2, 0);
addTrimBox(corniceT, corniceH, ROOM_D, halfW - corniceT / 2, ROOM_H - corniceH / 2, 0);

// Fenster links: Lichtfläche + Vorhang
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
  new THREE.PlaneGeometry(1.0, 3.25),
  new THREE.MeshStandardMaterial({ color: 0x7f6153, roughness: 0.95, metalness: 0.0 })
);
curtain.position.set(-halfW + 0.03, 2.02, -6.2);
curtain.rotation.y = Math.PI / 2;
room.add(curtain);

// Teppich (Plane)
const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.9, 6.5), new THREE.MeshStandardMaterial({ color: 0x7b1f1f, roughness: 0.95 }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.012, -2.2);
room.add(rug);

// ------------------------------------------------------------
// Kamin (mit Profilen)
// ------------------------------------------------------------
const fireplace = new THREE.Group();
room.add(fireplace);

const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.25, 2.15, 0.60), matMarble);
mantel.position.set(0, 1.05, -halfD + 0.40);
fireplace.add(mantel);

// Profilrahmen vorne (dünner Rahmen)
const mantelFrame = new THREE.Mesh(new THREE.BoxGeometry(3.45, 2.30, 0.10), matMarble);
mantelFrame.position.set(0, 1.12, -halfD + 0.70);
fireplace.add(mantelFrame);

// Feueröffnung
const inner = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.28, 0.45), matFireBlack);
inner.position.set(0, 0.80, -halfD + 0.62);
fireplace.add(inner);

// Rundbogen
const arch = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.08, 12, 44, Math.PI), matMarble);
arch.rotation.x = Math.PI / 2;
arch.position.set(0, 1.06, -halfD + 0.84);
fireplace.add(arch);

// Glut
const emberGeo = new THREE.SphereGeometry(0.06, 10, 10);
const emberMat = new THREE.MeshStandardMaterial({
  color: 0xff6d3a,
  roughness: 0.6,
  emissive: 0x331000,
  emissiveIntensity: 0.38
});
for (let i = 0; i < 30; i++) {
  const e = new THREE.Mesh(emberGeo, emberMat);
  e.position.set((Math.random() - 0.5) * 0.95, 0.52 + Math.random() * 0.30, -halfD + 0.72 + (Math.random() - 0.5) * 0.16);
  fireplace.add(e);
}

// ------------------------------------------------------------
// Historische Möbel (keine Quader!)
// ------------------------------------------------------------
function makeCabrioleLeg(height = 0.52) {
  // Lathe-Profil (S-Kurve)
  const pts = [
    new THREE.Vector2(0.06, 0.00),
    new THREE.Vector2(0.07, 0.06),
    new THREE.Vector2(0.05, 0.14),
    new THREE.Vector2(0.08, 0.24),
    new THREE.Vector2(0.05, 0.34),
    new THREE.Vector2(0.07, 0.44),
    new THREE.Vector2(0.06, height)
  ];
  const geo = new THREE.LatheGeometry(pts, 18);
  const m = new THREE.Mesh(geo, matWoodDark);
  return m;
}

function makeBeadedTrim(w, h) {
  // Zierkante (kleine Perlen) – dezent, aber macht “historisch”
  const g = new THREE.Group();
  const beadGeo = new THREE.SphereGeometry(0.025, 10, 10);
  const count = Math.floor((w + h) * 14);
  for (let i = 0; i < count; i++) {
    const bead = new THREE.Mesh(beadGeo, matGold);
    const t = i / count;

    // entlang eines Rechteck-Rahmens
    const per = 2 * (w + h);
    const s = t * per;

    let x = 0,
      y = 0;
    if (s < w) {
      x = -w / 2 + s;
      y = h / 2;
    } else if (s < w + h) {
      x = w / 2;
      y = h / 2 - (s - w);
    } else if (s < 2 * w + h) {
      x = w / 2 - (s - (w + h));
      y = -h / 2;
    } else {
      x = -w / 2;
      y = -h / 2 + (s - (2 * w + h));
    }

    bead.position.set(x, y, 0.02);
    g.add(bead);
  }
  return g;
}

function makeLouisChair({ upholsteryMat = matUpholstery, scale = 1.0 } = {}) {
  const g = new THREE.Group();

  // Sitzrahmen (Holz, profiliert)
  const seatFrame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.16, 0.95), matWoodDark);
  seatFrame.position.set(0, 0.60, 0);
  g.add(seatFrame);

  // Sitzpolster (weich, leicht gerundet)
  const seatCush = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.18, 0.88), upholsteryMat);
  seatCush.position.set(0, 0.72, 0.0);
  g.add(seatCush);

  // Rückenrahmen (geschwungen)
  const backFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.18, 0.10), matWoodDark);
  backFrame.position.set(0, 1.46, -0.38);
  g.add(backFrame);

  const backCush = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.68, 0.12), upholsteryMat);
  backCush.position.set(0, 1.13, -0.38);
  g.add(backCush);

  // Rückenkrone (Bogen)
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 10, 28, Math.PI), matWoodDark);
  crown.rotation.x = Math.PI / 2;
  crown.position.set(0, 1.55, -0.38);
  g.add(crown);

  // Armlehnen (geschwungen)
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.50, 1.10, -0.10),
    new THREE.Vector3(-0.58, 1.05, 0.10),
    new THREE.Vector3(-0.45, 0.92, 0.35)
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 24, 0.05, 10, false);
  const armL = new THREE.Mesh(armGeo, matWoodDark);
  g.add(armL);

  const armR = armL.clone();
  armR.scale.x = -1;
  g.add(armR);

  // Beine (Cabriole)
  const legH = 0.58;
  const legOffsets = [
    [-0.44, 0.0, 0.34],
    [0.44, 0.0, 0.34],
    [-0.44, 0.0, -0.34],
    [0.44, 0.0, -0.34]
  ];
  for (const [x, y, z] of legOffsets) {
    const leg = makeCabrioleLeg(legH);
    leg.position.set(x, 0.0, z);
    // vorne leicht nach aussen
    if (z > 0) leg.rotation.y = (x > 0 ? -1 : 1) * 0.12;
    g.add(leg);
  }

  // Zierperlen am Rücken (Gold)
  const beads = makeBeadedTrim(1.02, 0.74);
  beads.position.set(0, 1.13, -0.31);
  g.add(beads);

  g.scale.setScalar(scale);
  return g;
}

function makeLouisSofa({ upholsteryMat = matUpholsteryAlt } = {}) {
  const g = new THREE.Group();

  // Grundrahmen
  const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(3.30, 0.18, 1.08), matWoodDark);
  baseFrame.position.set(0, 0.60, 0);
  g.add(baseFrame);

  // Sitzpolster (3-teilig Eindruck)
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.20, 0.98), upholsteryMat);
  seat.position.set(0, 0.74, 0.00);
  g.add(seat);

  // Rücken (geschwungen)
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.10, 0.70, 0.14), upholsteryMat);
  back.position.set(0, 1.18, -0.46);
  g.add(back);

  // Rückenrahmen oben (Holzprofil)
  const backTop = new THREE.Mesh(new THREE.BoxGeometry(3.20, 0.14, 0.12), matWoodDark);
  backTop.position.set(0, 1.55, -0.46);
  g.add(backTop);

  // Seitenteile mit “S”-Arm (links/rechts)
  const sideGeo = new THREE.Shape();
  sideGeo.moveTo(0, 0);
  sideGeo.bezierCurveTo(0.10, 0.25, 0.05, 0.55, 0.20, 0.75);
  sideGeo.bezierCurveTo(0.34, 0.92, 0.30, 1.10, 0.18, 1.22);
  sideGeo.bezierCurveTo(0.06, 1.34, 0.10, 1.55, 0.32, 1.62);
  sideGeo.lineTo(0.32, 1.70);
  sideGeo.lineTo(0.00, 1.70);
  sideGeo.lineTo(0.00, 0.0);

  const extrude = new THREE.ExtrudeGeometry(sideGeo, { depth: 0.90, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, steps: 1 });
  extrude.computeVertexNormals();

  const sideL = new THREE.Mesh(extrude, matWoodDark);
  sideL.position.set(-1.65, 0.0, -0.45);
  sideL.rotation.y = Math.PI / 2;
  g.add(sideL);

  const sideR = sideL.clone();
  sideR.position.x = 1.65;
  sideR.scale.x = -1;
  g.add(sideR);

  // Cabriole-Beine (6 Stück)
  const legH = 0.60;
  const legs = [
    [-1.45, 0, 0.40],
    [0.0, 0, 0.40],
    [1.45, 0, 0.40],
    [-1.45, 0, -0.40],
    [0.0, 0, -0.40],
    [1.45, 0, -0.40]
  ];
  for (const [x, y, z] of legs) {
    const leg = makeCabrioleLeg(legH);
    leg.position.set(x, y, z);
    if (z > 0) leg.rotation.y = (x > 0 ? -1 : 1) * 0.10;
    g.add(leg);
  }

  // Goldene Zierkante vorne
  const frontBeads = makeBeadedTrim(3.10, 0.22);
  frontBeads.position.set(0, 0.70, 0.52);
  g.add(frontBeads);

  return g;
}

// ------------------------------------------------------------
// Historische “Anordnung” wie Salon_04
// ------------------------------------------------------------
const sofa = makeLouisSofa({ upholsteryMat: matUpholsteryAlt });
sofa.position.set(halfW - 2.15, 0.0, -0.85);
sofa.rotation.y = -Math.PI / 2;
room.add(sofa);

const chairFrontLeft = makeLouisChair({ upholsteryMat: matUpholstery, scale: 1.05 });
chairFrontLeft.position.set(-halfW + 2.05, 0.0, 3.05);
chairFrontLeft.rotation.y = Math.PI / 6;
room.add(chairFrontLeft);

const chairA = makeLouisChair({ upholsteryMat: matUpholstery, scale: 1.00 });
chairA.position.set(-2.15, 0.0, -5.35);
chairA.rotation.y = Math.PI / 10;
room.add(chairA);

const chairB = makeLouisChair({ upholsteryMat: matUpholstery, scale: 1.00 });
chairB.position.set(2.15, 0.0, -5.35);
chairB.rotation.y = -Math.PI / 10;
room.add(chairB);

// Sideboards + Vitrine (mit mehr “Rahmen”)
function makePanelCabinet(w, h, d) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matWoodDark);
  body.position.y = h / 2;
  g.add(body);

  // Frontpaneele
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x2f1c12, roughness: 0.86, metalness: 0.0 });
  for (const sx of [-0.25, 0.25]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.42, 0.05), panelMat);
    p.position.set(sx * w, h * 0.58, d / 2 + 0.02);
    g.add(p);
  }

  // Zierleisten (Goldpunkte)
  const knobsGeo = new THREE.SphereGeometry(0.03, 10, 10);
  for (const sx of [-0.22, 0.22]) {
    for (const sy of [0.55, 0.35]) {
      const k = new THREE.Mesh(knobsGeo, matGold);
      k.position.set(sx * w, sy * h, d / 2 + 0.04);
      g.add(k);
    }
  }

  return g;
}

const cabinet = makePanelCabinet(1.25, 2.45, 0.60);
cabinet.position.set(-halfW + 2.35, 0.0, -6.45);
room.add(cabinet);

const sideboardL = makePanelCabinet(2.75, 0.88, 0.62);
sideboardL.position.set(-halfW + 2.65, 0.0, -4.85);
room.add(sideboardL);

const sideboardR = makePanelCabinet(3.70, 0.78, 0.62);
sideboardR.position.set(halfW - 2.35, 0.0, -4.95);
room.add(sideboardR);

// Stehlampe (historischer: Fuss + Schaft + Schirm)
const lamp = new THREE.Group();
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.10, 20), matGold);
lampBase.position.y = 0.05;
lamp.add(lampBase);

const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.30, 18), matGold);
lampStand.position.y = 0.70;
lamp.add(lampStand);

const lampShade = new THREE.Mesh(
  new THREE.ConeGeometry(0.34, 0.48, 22),
  new THREE.MeshStandardMaterial({ color: 0xe8dfd1, roughness: 0.8, metalness: 0.0 })
);
lampShade.position.y = 1.45;
lamp.add(lampShade);

lamp.position.set(halfW - 3.45, 0.0, -1.05);
room.add(lamp);

// ------------------------------------------------------------
// Bilder (Rahmen + Fläche) – später aus Salon_4.jpg Crops
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
// Salon_4.jpg laden → Texturen korrekt setzen
// (Hier sind die Crops absichtlich “klein & planar”, damit es NICHT kachelig/perspektivisch kaputt geht.)
// ------------------------------------------------------------
const refLoader = new THREE.TextureLoader();

refLoader.load(
  "/salon3d/assets/img/Salon_4.jpg",
  (refTex) => {
    const img = refTex.image;
    if (!img || !img.width || !img.height) {
      setStatus("FEHLER: Referenzbild nicht verfügbar");
      return;
    }

    // Tapete: planar links der Kaminwand (ohne Rahmen/Decke)
    // (aus Analyse: ca. x=0.325, y=0.245, w=0.125, h=0.223)
    const wallpaperTex = cropTextureFromImage(
      img,
      { x: 0.325, y: 0.245, w: 0.125, h: 0.223 },
      1024,
      1024,
      { x: 6, y: 3 }
    );

    // Holz: möglichst “reine” Diele links unten (klein, wenig Objektanteil)
    // (x=0, y=0.826, w=0.069, h=0.134)
    const woodTex = cropTextureFromImage(
      img,
      { x: 0.0, y: 0.826, w: 0.069, h: 0.134 },
      1024,
      1024,
      { x: 12, y: 10 }
    );
    // Dielenrichtung: entlang Z-Achse besser lesbar
    woodTex.rotation = Math.PI / 2;
    woodTex.center.set(0.5, 0.5);

    // Teppich: zentraler Teppichbereich (nicht kacheln!)
    const rugTex = cropTextureFromImage(
      img,
      { x: 0.18, y: 0.62, w: 0.64, h: 0.34 },
      1024,
      1024,
      null
    );

    // Polster: Sitzbereich Sofa rechts (planarer Patch)
    // (x=0.756, y=0.619, w=0.0875, h=0.1004)
    const upholsteryTex = cropTextureFromImage(
      img,
      { x: 0.756, y: 0.619, w: 0.0875, h: 0.1004 },
      1024,
      1024,
      { x: 2, y: 2 }
    );

    // Gemälde über Kamin (Crop)
    const paintingCenterTex = cropTextureFromImage(
      img,
      { x: 0.36, y: 0.20, w: 0.28, h: 0.16 },
      1024,
      1024,
      null
    );

    // Gemälde rechts (Crop)
    const paintingRightTex = cropTextureFromImage(
      img,
      { x: 0.80, y: 0.18, w: 0.16, h: 0.22 },
      1024,
      1024,
      null
    );

    // Apply
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

    matUpholstery.map = upholsteryTex;
    matUpholstery.needsUpdate = true;

    matUpholsteryAlt.map = upholsteryTex;
    matUpholsteryAlt.needsUpdate = true;

    // Bilder platzieren
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
