// assets/js/main.js — Biedermeier-Look + Anti-Pixel/Anti-Kachel
// Texturen kommen aus /salon3d/assets/img/Salon_4.jpg via hochauflösenden Canvas-Crops (4096)
// Voraussetzung: index.html hat Importmap für "three" und "three/addons/"

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
// Raum-Masse
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
// Licht (weich + warm, Fenster links)
// ------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xfff0e1, 0.60);
scene.add(ambient);

const windowLight = new THREE.DirectionalLight(0xd9ecff, 0.78);
windowLight.position.set(-9, 7, 6);
scene.add(windowLight);

const keyLight = new THREE.DirectionalLight(0xffdfbf, 0.62);
keyLight.position.set(8, 7, 2);
scene.add(keyLight);

const lampWarm = new THREE.PointLight(0xffd0a0, 1.10, 18, 2);
lampWarm.position.set(4.8, 2.7, -0.7);
scene.add(lampWarm);

const fireGlow = new THREE.PointLight(0xffb27a, 0.60, 7, 2);
fireGlow.position.set(0, 1.05, -halfD + 0.85);
scene.add(fireGlow);

// ------------------------------------------------------------
// Textur-Qualität (entscheidend gegen “pixeliges Irgendwas”)
// ------------------------------------------------------------
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const TEX_BIG = 4096;   // Tapete/Holz/Polster: gross, sonst Matsch
const TEX_MED = 2048;   // Bilder/Teppich: reicht meist

function tuneTexture(tex, { repeat = null } = {}) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;

  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // hilft gegen “flimmernde Muster” bei schrägen Blickwinkeln
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  }

  tex.needsUpdate = true;
  return tex;
}

function cropTextureFromImage(img, rect, outW, outH, repeat = null) {
  const sx = Math.max(0, Math.min(1, rect.x));
  const sy = Math.max(0, Math.min(1, rect.y));
  const sw = Math.max(0, Math.min(1 - sx, rect.w));
  const sh = Math.max(0, Math.min(1 - sy, rect.h));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: false });

  const px = Math.floor(img.width * sx);
  const py = Math.floor(img.height * sy);
  const pw = Math.floor(img.width * sw);
  const ph = Math.floor(img.height * sh);

  ctx.drawImage(img, px, py, pw, ph, 0, 0, outW, outH);

  const tex = new THREE.CanvasTexture(canvas);
  return tuneTexture(tex, { repeat });
}

// ------------------------------------------------------------
// Materialien (Fallbacks)
// ------------------------------------------------------------
const matCeiling = new THREE.MeshStandardMaterial({ color: 0xd3ccc2, roughness: 0.98, metalness: 0.0 });

const matWallTop = new THREE.MeshStandardMaterial({ color: 0xcfc3b7, roughness: 0.95, metalness: 0.0 });
const matWallBottom = new THREE.MeshStandardMaterial({ color: 0x9a8f84, roughness: 0.92, metalness: 0.0 });

const matTrim = new THREE.MeshStandardMaterial({ color: 0xbfb5aa, roughness: 0.92, metalness: 0.0 });

// Biedermeier: warmes Nussholz / Furnier
const matWood = new THREE.MeshStandardMaterial({ color: 0x4a2b1a, roughness: 0.78, metalness: 0.0 });
const matWoodVeneer = new THREE.MeshStandardMaterial({ color: 0x5a3220, roughness: 0.75, metalness: 0.0 });

const matBrass = new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.35, metalness: 0.35 });

const matUpholstery = new THREE.MeshStandardMaterial({ color: 0xb2a18b, roughness: 0.92, metalness: 0.0 });
const matUpholsteryAlt = new THREE.MeshStandardMaterial({ color: 0x9f8f7c, roughness: 0.92, metalness: 0.0 });

const matMarble = new THREE.MeshStandardMaterial({ color: 0xded8d2, roughness: 0.35, metalness: 0.0 });
const matFireBlack = new THREE.MeshStandardMaterial({ color: 0x171615, roughness: 0.85, metalness: 0.05 });

// ------------------------------------------------------------
// Raum-Geometrie
// ------------------------------------------------------------
const room = new THREE.Group();
scene.add(room);

// Boden
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshStandardMaterial({ color: 0x5c3b24, roughness: 0.80 }));
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

// Sockel + Stuckleiste
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
// Kamin
// ------------------------------------------------------------
const fireplace = new THREE.Group();
room.add(fireplace);

const mantel = new THREE.Mesh(new THREE.BoxGeometry(3.25, 2.15, 0.60), matMarble);
mantel.position.set(0, 1.05, -halfD + 0.40);
fireplace.add(mantel);

const mantelStep = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.10, 0.72), matMarble);
mantelStep.position.set(0, 2.05, -halfD + 0.40);
fireplace.add(mantelStep);

const inner = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.28, 0.45), matFireBlack);
inner.position.set(0, 0.80, -halfD + 0.62);
fireplace.add(inner);

// Glut
const emberGeo = new THREE.SphereGeometry(0.06, 10, 10);
const emberMat = new THREE.MeshStandardMaterial({
  color: 0xff6d3a,
  roughness: 0.6,
  emissive: 0x331000,
  emissiveIntensity: 0.38
});
for (let i = 0; i < 26; i++) {
  const e = new THREE.Mesh(emberGeo, emberMat);
  e.position.set((Math.random() - 0.5) * 0.90, 0.52 + Math.random() * 0.26, -halfD + 0.72 + (Math.random() - 0.5) * 0.14);
  fireplace.add(e);
}

// ------------------------------------------------------------
// Biedermeier-Möbel: runde Kanten + gedrechselte Beine + gerollte Arme
// ------------------------------------------------------------
function roundedBoxGeometry(w, h, d, r = 0.12, seg = 8) {
  const hw = w / 2;
  const hd = d / 2;
  const rr = Math.min(r, hw * 0.45, hd * 0.45);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + rr, -hd);
  shape.lineTo(hw - rr, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + rr);
  shape.lineTo(hw, hd - rr);
  shape.quadraticCurveTo(hw, hd, hw - rr, hd);
  shape.lineTo(-hw + rr, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - rr);
  shape.lineTo(-hw, -hd + rr);
  shape.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps: 1, curveSegments: seg });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, h / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

function makeTurnedLeg(height = 0.55) {
  const pts = [
    new THREE.Vector2(0.06, 0.00),
    new THREE.Vector2(0.07, 0.06),
    new THREE.Vector2(0.05, 0.12),
    new THREE.Vector2(0.08, 0.20),
    new THREE.Vector2(0.06, 0.30),
    new THREE.Vector2(0.09, 0.40),
    new THREE.Vector2(0.06, height)
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  return new THREE.Mesh(geo, matWoodVeneer);
}

function makeBiedermeierSofa() {
  const g = new THREE.Group();

  const base = new THREE.Mesh(roundedBoxGeometry(3.35, 0.22, 1.12, 0.16), matWood);
  base.position.y = 0.40;
  g.add(base);

  const seat = new THREE.Mesh(roundedBoxGeometry(3.18, 0.22, 0.98, 0.20), matUpholsteryAlt);
  seat.position.y = 0.58;
  g.add(seat);

  const back = new THREE.Mesh(roundedBoxGeometry(3.08, 0.68, 0.22, 0.18), matUpholsteryAlt);
  back.position.set(0, 1.05, -0.43);
  back.rotation.x = -0.06;
  g.add(back);

  function armRoll(side = 1) {
    const arm = new THREE.Group();

    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 28), matUpholsteryAlt);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0.0, 0.95, 0.05);
    arm.add(roll);

    const armBody = new THREE.Mesh(roundedBoxGeometry(0.42, 0.60, 1.05, 0.18), matUpholsteryAlt);
    armBody.position.set(0.0, 0.70, 0.0);
    arm.add(armBody);

    const armPlinth = new THREE.Mesh(roundedBoxGeometry(0.44, 0.16, 1.08, 0.12), matWood);
    armPlinth.position.set(0.0, 0.44, 0.0);
    arm.add(armPlinth);

    arm.position.x = side * 1.57;
    return arm;
  }

  g.add(armRoll(-1));
  g.add(armRoll(1));

  const legs = [
    [-1.45, 0, 0.40],
    [1.45, 0, 0.40],
    [-1.45, 0, -0.40],
    [1.45, 0, -0.40]
  ];
  for (const [x, y, z] of legs) {
    const leg = makeTurnedLeg(0.52);
    leg.position.set(x, y, z);
    g.add(leg);
  }

  return g;
}

function makeBiedermeierChair() {
  const g = new THREE.Group();

  const seatFrame = new THREE.Mesh(roundedBoxGeometry(1.08, 0.18, 0.95, 0.16), matWood);
  seatFrame.position.y = 0.56;
  g.add(seatFrame);

  const seat = new THREE.Mesh(roundedBoxGeometry(1.00, 0.18, 0.86, 0.18), matUpholstery);
  seat.position.y = 0.70;
  g.add(seat);

  const backShell = new THREE.Mesh(roundedBoxGeometry(1.02, 0.62, 0.12, 0.12), matWoodVeneer);
  backShell.position.set(0, 1.10, -0.38);
  backShell.rotation.x = -0.08;
  g.add(backShell);

  const backPad = new THREE.Mesh(roundedBoxGeometry(0.92, 0.54, 0.10, 0.12), matUpholstery);
  backPad.position.set(0, 1.10, -0.36);
  backPad.rotation.x = -0.08;
  g.add(backPad);

  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 1.05, -0.10),
    new THREE.Vector3(-0.52, 0.98, 0.15),
    new THREE.Vector3(-0.40, 0.86, 0.35)
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 26, 0.045, 12, false);
  const armL = new THREE.Mesh(armGeo, matWoodVeneer);
  g.add(armL);

  const armR = armL.clone();
  armR.scale.x = -1;
  g.add(armR);

  const legOffsets = [
    [-0.44, 0.0, 0.34],
    [0.44, 0.0, 0.34],
    [-0.44, 0.0, -0.34],
    [0.44, 0.0, -0.34]
  ];
  for (const [x, y, z] of legOffsets) {
    const leg = makeTurnedLeg(0.56);
    leg.position.set(x, y, z);
    g.add(leg);
  }

  return g;
}

function makeBiedermeierSideboard(w, h, d) {
  const g = new THREE.Group();

  const body = new THREE.Mesh(roundedBoxGeometry(w, h, d, 0.14), matWood);
  body.position.y = h / 2;
  g.add(body);

  const panel = new THREE.Mesh(roundedBoxGeometry(w * 0.88, h * 0.46, 0.06, 0.12), matWoodVeneer);
  panel.position.set(0, h * 0.58, d / 2 + 0.01);
  g.add(panel);

  const line = new THREE.Mesh(new THREE.BoxGeometry(w * 0.90, 0.02, 0.02), matBrass);
  line.position.set(0, h * 0.40, d / 2 + 0.05);
  g.add(line);

  const knobGeo = new THREE.SphereGeometry(0.03, 12, 12);
  for (const sx of [-0.18, 0.18]) {
    const k = new THREE.Mesh(knobGeo, matBrass);
    k.position.set(sx * w, h * 0.40, d / 2 + 0.06);
    g.add(k);
  }

  const legPos = [
    [-w * 0.40, 0, d * 0.35],
    [w * 0.40, 0, d * 0.35],
    [-w * 0.40, 0, -d * 0.35],
    [w * 0.40, 0, -d * 0.35]
  ];
  for (const [x, y, z] of legPos) {
    const leg = makeTurnedLeg(0.42);
    leg.position.set(x, y, z);
    g.add(leg);
  }

  return g;
}

// ------------------------------------------------------------
// Anordnung
// ------------------------------------------------------------
const sofa = makeBiedermeierSofa();
sofa.position.set(halfW - 2.15, 0.0, -0.85);
sofa.rotation.y = -Math.PI / 2;
room.add(sofa);

const chairFrontLeft = makeBiedermeierChair();
chairFrontLeft.position.set(-halfW + 2.05, 0.0, 3.05);
chairFrontLeft.rotation.y = Math.PI / 6;
room.add(chairFrontLeft);

const chairA = makeBiedermeierChair();
chairA.position.set(-2.15, 0.0, -5.35);
chairA.rotation.y = Math.PI / 10;
room.add(chairA);

const chairB = makeBiedermeierChair();
chairB.position.set(2.15, 0.0, -5.35);
chairB.rotation.y = -Math.PI / 10;
room.add(chairB);

const sideboardL = makeBiedermeierSideboard(2.75, 0.88, 0.62);
sideboardL.position.set(-halfW + 2.65, 0.0, -4.85);
room.add(sideboardL);

const sideboardR = makeBiedermeierSideboard(3.70, 0.78, 0.62);
sideboardR.position.set(halfW - 2.35, 0.0, -4.95);
room.add(sideboardR);

const cabinet = makeBiedermeierSideboard(1.25, 2.45, 0.60);
cabinet.position.set(-halfW + 2.35, 0.0, -6.45);
room.add(cabinet);

// Lampe (schlicht)
const lamp = new THREE.Group();
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.10, 20), matBrass);
lampBase.position.y = 0.05;
lamp.add(lampBase);

const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.30, 18), matBrass);
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
// Bilder (Rahmen + Fläche) aus Salon_4.jpg
// ------------------------------------------------------------
function makeFramedPainting(w, h, texture, x, y, z, ry) {
  tuneTexture(texture);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.08), matBrass);
  frame.position.set(x, y, z);
  frame.rotation.y = ry;
  room.add(frame);

  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  pic.position.set(x, y, z + (ry === 0 ? 0.045 : -0.045));
  pic.rotation.y = ry;
  room.add(pic);
}

// ------------------------------------------------------------
// Salon_4.jpg laden -> saubere, hochauflösende Texturen setzen
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

    // WICHTIG: grössere Crops + weniger Repeat = weniger “Kachel”
    // Tapete (ruhiger Bereich, grösserer Ausschnitt)
    const wallpaperTex = cropTextureFromImage(
      img,
      { x: 0.26, y: 0.22, w: 0.28, h: 0.34 },
      TEX_BIG,
      TEX_BIG,
      { x: 2.2, y: 1.6 }
    );

    // Holz (Dielenbereich möglichst “clean”)
    const woodTex = cropTextureFromImage(
      img,
      { x: 0.02, y: 0.83, w: 0.14, h: 0.15 },
      TEX_BIG,
      TEX_BIG,
      { x: 5.0, y: 4.0 }
    );
    // Dielenrichtung
    woodTex.rotation = Math.PI / 2;
    woodTex.center.set(0.5, 0.5);
    woodTex.needsUpdate = true;

    // Teppich (kein Repeat!)
    const rugTex = cropTextureFromImage(
      img,
      { x: 0.18, y: 0.62, w: 0.64, h: 0.34 },
      TEX_MED,
      TEX_MED,
      null
    );

    // Polster (grösserer, ruhiger Crop → weniger “matschig”)
    const upholsteryTex = cropTextureFromImage(
      img,
      { x: 0.70, y: 0.56, w: 0.18, h: 0.18 },
      TEX_BIG,
      TEX_BIG,
      { x: 1.4, y: 1.4 }
    );

    // Bilder
    const paintingCenterTex = cropTextureFromImage(
      img,
      { x: 0.34, y: 0.18, w: 0.32, h: 0.18 },
      TEX_MED,
      TEX_MED,
      null
    );

    const paintingRightTex = cropTextureFromImage(
      img,
      { x: 0.78, y: 0.16, w: 0.18, h: 0.24 },
      TEX_MED,
      TEX_MED,
      null
    );

    // Apply
    matWallTop.map = wallpaperTex;
    matWallTop.needsUpdate = true;

    floor.material = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.80,
      metalness: 0.0
    });
    floor.material.needsUpdate = true;

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
