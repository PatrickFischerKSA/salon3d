// assets/js/main.js — PHOTO-ROOM (Diorama) aus Salon_4.jpg
// Ziel: sofort "wie das Foto" wirken → grosse Crops, NICHT kacheln, keine Tapeten-Repeats.
// Voraussetzung: /salon3d/assets/img/Salon_4.jpg existiert (Case-sensitiv).

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
scene.background = new THREE.Color(0x070707);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.62, 7.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// wichtig für "Foto-Look": Tonemapping + Exposure
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.10;

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
      controls.getObject().position.set(0, EYE_Y, 7.8);
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
// Raum-Masse (so dass Backwall wie Foto wirkt)
// ------------------------------------------------------------
const ROOM_W = 13.2;
const ROOM_D = 17.4;
const ROOM_H = 4.2;

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

function clampToRoom(pos) {
  const pad = 0.45;
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + pad, halfW - pad);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + pad, halfD - pad);
}

// ------------------------------------------------------------
// Licht (nur subtil! Foto liefert die Stimmung)
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const softKey = new THREE.DirectionalLight(0xfff2e6, 0.55);
softKey.position.set(6, 7, 5);
scene.add(softKey);

const fillCool = new THREE.DirectionalLight(0xddeeff, 0.25);
fillCool.position.set(-7, 6, 3);
scene.add(fillCool);

// leichte Dunstkante nach hinten → “tiefer”
scene.fog = new THREE.Fog(0x070707, 12, 55);

// ------------------------------------------------------------
// Textur-Helfer (Crops, ohne Repeat)
// ------------------------------------------------------------
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
function tune(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

function cropTextureFromImage(img, rect, outW = 2048, outH = 2048) {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: false });

  const px = Math.floor(img.width * rect.x);
  const py = Math.floor(img.height * rect.y);
  const pw = Math.floor(img.width * rect.w);
  const ph = Math.floor(img.height * rect.h);

  ctx.drawImage(img, px, py, pw, ph, 0, 0, outW, outH);

  const tex = new THREE.CanvasTexture(canvas);
  return tune(tex);
}

// ------------------------------------------------------------
// Geometrie: Photo-Room (5 Planes) + Trim
// ------------------------------------------------------------
const room = new THREE.Group();
scene.add(room);

const trimMat = new THREE.MeshStandardMaterial({ color: 0xc8bfb4, roughness: 0.92, metalness: 0.0 });
const darkBaseMat = new THREE.MeshStandardMaterial({ color: 0x7f776f, roughness: 0.92, metalness: 0.0 });

function addPlane(w, h, mat, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  room.add(m);
  return m;
}

// placeholders → werden nach dem Laden ersetzt
const backWall = addPlane(ROOM_W, ROOM_H, new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 }), 0, ROOM_H / 2, -halfD, 0);
const frontWall = addPlane(ROOM_W, ROOM_H, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 }), 0, ROOM_H / 2, halfD, Math.PI);

const leftWall = addPlane(ROOM_D, ROOM_H, new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 }), -halfW, ROOM_H / 2, 0, Math.PI / 2);
const rightWall = addPlane(ROOM_D, ROOM_H, new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 1 }), halfW, ROOM_H / 2, 0, -Math.PI / 2);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
room.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshStandardMaterial({ color: 0xafa79e, roughness: 0.98 }));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
room.add(ceiling);

// Sockelleiste (damit Foto-Wände nicht “schweben”)
const baseH = 0.14;
const baseT = 0.06;
function addTrimBox(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  room.add(m);
  return m;
}
addTrimBox(ROOM_W, baseH, baseT, 0, baseH / 2, -halfD + baseT / 2, darkBaseMat);
addTrimBox(ROOM_W, baseH, baseT, 0, baseH / 2, halfD - baseT / 2, darkBaseMat);
addTrimBox(baseT, baseH, ROOM_D, -halfW + baseT / 2, baseH / 2, 0, darkBaseMat);
addTrimBox(baseT, baseH, ROOM_D, halfW - baseT / 2, baseH / 2, 0, darkBaseMat);

// schmale “Stuckleiste” oben
const cornH = 0.10;
const cornT = 0.08;
addTrimBox(ROOM_W, cornH, cornT, 0, ROOM_H - cornH / 2, -halfD + cornT / 2, trimMat);
addTrimBox(ROOM_W, cornH, cornT, 0, ROOM_H - cornH / 2, halfD - cornT / 2, trimMat);
addTrimBox(cornT, cornH, ROOM_D, -halfW + cornT / 2, ROOM_H - cornH / 2, 0, trimMat);
addTrimBox(cornT, cornH, ROOM_D, halfW - cornT / 2, ROOM_H - cornH / 2, 0, trimMat);

// ------------------------------------------------------------
// Teppich extra als eigene Plane (damit er nicht “mit dem Boden” verzerrt)
// ------------------------------------------------------------
const rug = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 6.8), new THREE.MeshStandardMaterial({ color: 0x5a1b1b, roughness: 0.98 }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.012, -2.2);
room.add(rug);

// ------------------------------------------------------------
// Salon_4.jpg laden und als Diorama aufteilen
// ------------------------------------------------------------
setStatus("Lade Salon_4.jpg …");

const loader = new THREE.TextureLoader();
loader.load(
  "/salon3d/assets/img/Salon_4.jpg",
  (t) => {
    const img = t.image;
    if (!img || !img.width || !img.height) {
      setStatus("FEHLER: Bilddaten fehlen");
      return;
    }

    // Bild ist bei dir 1600×896.
    // Wir nehmen grosse Bereiche:
    // - Backwall: zentrale Ansicht inkl. Kamin
    // - Sidewalls: links/rechts mit Tapete + Details
    // - Floor: Holz unten
    // - Ceiling: oben (Decke / Stuck)
    // - Rug: Teppichzentrum
    const W = img.width;
    const H = img.height;

    const texBack = cropTextureFromImage(img, { x: 0.12, y: 0.08, w: 0.76, h: 0.60 }, 4096, 2048);
    const texLeft = cropTextureFromImage(img, { x: 0.00, y: 0.10, w: 0.30, h: 0.62 }, 4096, 2048);
    const texRight = cropTextureFromImage(img, { x: 0.70, y: 0.10, w: 0.30, h: 0.62 }, 4096, 2048);

    const texFloor = cropTextureFromImage(img, { x: 0.08, y: 0.72, w: 0.84, h: 0.26 }, 4096, 4096);
    // Dielenrichtung “stabilisieren”
    texFloor.rotation = Math.PI / 2;
    texFloor.center.set(0.5, 0.5);
    texFloor.needsUpdate = true;

    const texCeil = cropTextureFromImage(img, { x: 0.18, y: 0.00, w: 0.64, h: 0.18 }, 2048, 2048);

    const texRug = cropTextureFromImage(img, { x: 0.28, y: 0.62, w: 0.44, h: 0.34 }, 2048, 2048);

    // Wichtig: Foto als “diffuse” → MeshStandardMaterial geht, aber roughness hoch halten
    backWall.material = new THREE.MeshStandardMaterial({ map: texBack, roughness: 0.95, metalness: 0.0 });
    leftWall.material = new THREE.MeshStandardMaterial({ map: texLeft, roughness: 0.95, metalness: 0.0 });
    rightWall.material = new THREE.MeshStandardMaterial({ map: texRight, roughness: 0.95, metalness: 0.0 });

    // Frontwall bleibt dunkel (sonst wirkt es wie eine “Tapetenbox”)
    frontWall.material = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 1.0, metalness: 0.0 });

    floor.material = new THREE.MeshStandardMaterial({ map: texFloor, roughness: 0.88, metalness: 0.0 });
    ceiling.material = new THREE.MeshStandardMaterial({ map: texCeil, roughness: 0.98, metalness: 0.0 });

    rug.material = new THREE.MeshStandardMaterial({ map: texRug, roughness: 0.98, metalness: 0.0 });

    setStatus("Szene bereit");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Salon_4.jpg lädt nicht (Pfad/Name?)");
  }
);

// ------------------------------------------------------------
// Loop
// ------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (controls.isLocked) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const speed = WALK_SPEED * (sprint ? SPRINT_MULT : 1);

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
