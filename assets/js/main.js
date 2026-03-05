// assets/js/main.js — Photo-Projection Matching (Salon_4.jpg)
// - Backdrop wird automatisch auf Kamera/Viewport skaliert (keine Spalten)
// - "Floorline" (V im Foto) wird exakt auf y=0 gelegt
// - Kalibrier-UI: FOV, camY, camZ, backZ, floorV, roomW/roomD, repeats
// - Speichert Settings in localStorage
//
// Voraussetzung:
// /salon3d/assets/img/Salon_4.jpg existiert (Case-sensitiv!)

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ------------------------------------------------------------
// Helpers (UI + storage)
// ------------------------------------------------------------
const LS_KEY = "salon3d_calib_v1";

function $(sel) {
  return document.querySelector(sel);
}

const statusEl = $("#status");
const enterBtn = $("#enterBtn");

function setStatus(t) {
  if (statusEl) statusEl.textContent = t;
  console.log("[STATUS]", t);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

// ------------------------------------------------------------
// Default calibration (gut als Start)
// ------------------------------------------------------------
const defaults = {
  // camera
  fov: 30,
  camY: 1.45,
  camZ: 11.5,

  // backdrop plane
  backZ: -20.0,
  fitScale: 1.05, // >1 füllt sicher, <1 lässt Rand

  // Foto-Floorline (V): wo im Foto Wand->Boden beginnt
  // 0 = oben, 1 = unten
  floorV: 0.78,

  // room box (rein zur Immersion)
  roomW: 14.0,
  roomD: 18.0,
  roomH: 3.6,

  // wallpaper repeats
  wallRepX: 3.2,
  wallRepY: 1.9,

  // wood repeats
  floorRepX: 4.0,
  floorRepY: 3.0,

  // rug size/pos
  rugW: 8.4,
  rugD: 6.8,
  rugX: 0.0,
  rugZ: -2.2,

  // guides
  showGuides: true,

  // lighting
  exposure: 1.10,
  ambient: 0.55,
  key: 0.35,
  fill: 0.18,
};

const settings = Object.assign({}, defaults, loadSettings() || {});

// ------------------------------------------------------------
// Scene / Renderer / Camera
// ------------------------------------------------------------
setStatus("Main geladen");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070707);
scene.fog = new THREE.Fog(0x070707, 14, 55);

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, settings.camY, settings.camZ);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = settings.exposure;
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
const EYE_Y = () => settings.camY;

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
      if (Math.abs(controls.getObject().position.y - EYE_Y()) < 0.001) hopV = 5;
      break;

    case "KeyR":
      controls.getObject().position.set(0, settings.camY, settings.camZ);
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
// Texture utilities
// ------------------------------------------------------------
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

function tune(tex, { repeat = null, clamp = true } = {}) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  } else if (clamp) {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }

  tex.needsUpdate = true;
  return tex;
}

function cropTextureFromImage(img, rect, outW = 2048, outH = 2048, opts = {}) {
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
  return tune(tex, opts);
}

// ------------------------------------------------------------
// Core: Photo-Backdrop (auto-fit to camera frustum)
// ------------------------------------------------------------
//
// Wir berechnen die Plane-Grösse so, dass sie bei distance
// den Viewport vollständig füllt.
// planeH = 2 * dist * tan(fov/2) * fitScale
// planeW = planeH * aspect(image)
// Dann verschieben wir die Plane in Y so, dass floorV genau y=0 liegt.
//
let backdrop = null;
let backdropMat = null;
let guideLines = null;

function computeBackdropSize(imageAspect) {
  const dist = Math.abs(settings.backZ - camera.position.z);
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const viewH = 2 * dist * Math.tan(fovRad / 2);
  const planeH = viewH * settings.fitScale;
  const planeW = planeH * imageAspect;
  return { planeW, planeH, dist };
}

function computeBackdropY(planeH) {
  // In plane-local coords: y=+H/2 oben, y=-H/2 unten
  // texture v: 0 oben, 1 unten
  // y_at_v = (0.5 - v) * H
  const yAtV = (0.5 - settings.floorV) * planeH;
  // world y=0 soll an dieser Stelle liegen -> plane.position.y = -yAtV
  return -yAtV;
}

function rebuildGuides(planeW, planeH) {
  if (guideLines) {
    guideLines.geometry.dispose();
    guideLines.material.dispose();
    scene.remove(guideLines);
    guideLines = null;
  }
  if (!settings.showGuides) return;

  // Linie für floorV + Center Cross
  const verts = [];

  // floor line across plane
  const yFloor = (0.5 - settings.floorV) * planeH;
  verts.push(-planeW / 2, yFloor, 0.001, planeW / 2, yFloor, 0.001);

  // vertical center
  verts.push(0, -planeH / 2, 0.001, 0, planeH / 2, 0.001);

  // horizontal center
  verts.push(-planeW / 2, 0, 0.001, planeW / 2, 0, 0.001);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));

  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.35 });
  guideLines = new THREE.LineSegments(geo, mat);
  guideLines.position.copy(backdrop.position);
  guideLines.rotation.copy(backdrop.rotation);
  scene.add(guideLines);
}

// ------------------------------------------------------------
// Room shell (sidewalls + floor + ceiling + trims)
// ------------------------------------------------------------
const room = new THREE.Group();
scene.add(room);

let leftWall = null,
  rightWall = null,
  frontWall = null,
  floor = null,
  ceiling = null,
  rug = null;

let texWallpaper = null,
  texWood = null,
  texCeil = null,
  texRug = null;

const trimTop = new THREE.MeshStandardMaterial({ color: 0xc9c1b7, roughness: 0.92, metalness: 0.0 });
const trimBase = new THREE.MeshStandardMaterial({ color: 0x8b8178, roughness: 0.95, metalness: 0.0 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, metalness: 0.0 });

function clearRoom() {
  while (room.children.length) {
    const c = room.children.pop();
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      else c.material.dispose?.();
    }
  }
}

function addTrimBox(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  room.add(m);
  return m;
}

function buildRoomShell() {
  clearRoom();

  const W = settings.roomW;
  const D = settings.roomD;
  const H = settings.roomH;

  const halfW = W / 2;
  const halfD = D / 2;

  // walls
  const wallMat = new THREE.MeshStandardMaterial({
    map: texWallpaper || null,
    color: texWallpaper ? 0xffffff : 0x5a564f,
    roughness: 0.98,
    metalness: 0.0,
  });

  leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  leftWall.position.set(-halfW, H / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);

  rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  rightWall.position.set(halfW, H / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);

  // front wall stays dark
  frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matDark);
  frontWall.position.set(0, H / 2, halfD);
  frontWall.rotation.y = Math.PI;
  room.add(frontWall);

  // floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: texWood || null,
    color: texWood ? 0xffffff : 0x2a2623,
    roughness: 0.88,
    metalness: 0.0,
  });

  floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  room.add(floor);

  // ceiling
  const ceilMat = new THREE.MeshStandardMaterial({
    map: texCeil || null,
    color: texCeil ? 0xffffff : 0xb4aca2,
    roughness: 0.98,
    metalness: 0.0,
  });

  ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  room.add(ceiling);

  // baseboard
  addTrimBox(W, 0.14, 0.06, 0, 0.07, -halfD + 0.03, trimBase);
  addTrimBox(W, 0.14, 0.06, 0, 0.07, halfD - 0.03, trimBase);
  addTrimBox(0.06, 0.14, D, -halfW + 0.03, 0.07, 0, trimBase);
  addTrimBox(0.06, 0.14, D, halfW - 0.03, 0.07, 0, trimBase);

  // cornice
  addTrimBox(W, 0.10, 0.08, 0, H - 0.05, -halfD + 0.04, trimTop);
  addTrimBox(W, 0.10, 0.08, 0, H - 0.05, halfD - 0.04, trimTop);
  addTrimBox(0.08, 0.10, D, -halfW + 0.04, H - 0.05, 0, trimTop);
  addTrimBox(0.08, 0.10, D, halfW - 0.04, H - 0.05, 0, trimTop);

  // corner pilasters (naht kaschieren)
  function addPilaster(x, z) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 0.18), trimTop);
    p.position.set(x, H / 2, z);
    room.add(p);
  }
  addPilaster(-halfW + 0.09, -halfD + 0.09);
  addPilaster(halfW - 0.09, -halfD + 0.09);
  addPilaster(-halfW + 0.09, halfD - 0.09);
  addPilaster(halfW - 0.09, halfD - 0.09);

  // rug
  const rugMat = new THREE.MeshStandardMaterial({
    map: texRug || null,
    color: texRug ? 0xffffff : 0x5a1b1b,
    roughness: 0.98,
    metalness: 0.0,
  });

  rug = new THREE.Mesh(new THREE.PlaneGeometry(settings.rugW, settings.rugD), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(settings.rugX, 0.012, settings.rugZ);
  room.add(rug);
}

function clampToShell(pos) {
  const halfW = settings.roomW / 2;
  const halfD = settings.roomD / 2;
  const pad = 0.55;
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + pad, halfW - pad);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + pad, halfD - pad);
}

// ------------------------------------------------------------
// Lighting
// ------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, settings.ambient);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xfff2e6, settings.key);
key.position.set(6, 7, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0xddeeff, settings.fill);
fill.position.set(-7, 6, 3);
scene.add(fill);

// ------------------------------------------------------------
// Load Salon_4.jpg and build projection match
// ------------------------------------------------------------
setStatus("Lade Salon_4.jpg …");

const loader = new THREE.TextureLoader();

loader.load(
  "/salon3d/assets/img/Salon_4.jpg",
  (tex) => {
    const img = tex.image;
    if (!img || !img.width || !img.height) {
      setStatus("FEHLER: Bilddaten fehlen");
      return;
    }

    const imgAspect = img.width / img.height;

    // Backdrop texture = zentraler Bereich (Hauptansicht)
    const texBack = cropTextureFromImage(img, { x: 0.06, y: 0.06, w: 0.88, h: 0.72 }, 4096, 2048, { clamp: true });

    // Wallpaper: nur Muster (ohne Möbel!) => repeat
    texWallpaper = cropTextureFromImage(img, { x: 0.34, y: 0.22, w: 0.12, h: 0.18 }, 4096, 4096, {
      repeat: { x: settings.wallRepX, y: settings.wallRepY },
      clamp: false,
    });

    // Wood: clean patch => repeat
    texWood = cropTextureFromImage(img, { x: 0.88, y: 0.88, w: 0.12, h: 0.12 }, 4096, 4096, {
      repeat: { x: settings.floorRepX, y: settings.floorRepY },
      clamp: false,
    });
    texWood.rotation = Math.PI / 2;
    texWood.center.set(0.5, 0.5);
    texWood.needsUpdate = true;

    // Ceiling: stuck/ceiling region
    texCeil = cropTextureFromImage(img, { x: 0.22, y: 0.00, w: 0.56, h: 0.18 }, 2048, 2048, { clamp: true });

    // Rug: center carpet
    texRug = cropTextureFromImage(img, { x: 0.28, y: 0.62, w: 0.44, h: 0.34 }, 2048, 2048, { clamp: true });

    // Build backdrop plane (auto-fit)
    const { planeW, planeH } = computeBackdropSize(imgAspect);
    const backY = computeBackdropY(planeH);

    backdropMat = new THREE.MeshBasicMaterial({ map: texBack });
    backdrop = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), backdropMat);
    backdrop.position.set(0, backY, settings.backZ);
    backdrop.rotation.y = 0;
    scene.add(backdrop);

    // Guides
    rebuildGuides(planeW, planeH);

    // Build shell now that textures exist
    buildRoomShell();

    setStatus("Szene bereit");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Salon_4.jpg lädt nicht (Pfad/Name?)");
  }
);

// ------------------------------------------------------------
// Calibration UI (kein Stückwerk, wird hier erzeugt)
// ------------------------------------------------------------
function makeCalibUI() {
  const wrap = document.createElement("div");
  wrap.id = "calibPanel";
  wrap.style.position = "fixed";
  wrap.style.right = "14px";
  wrap.style.top = "14px";
  wrap.style.width = "320px";
  wrap.style.padding = "12px 12px 10px";
  wrap.style.borderRadius = "14px";
  wrap.style.background = "rgba(255,255,255,0.88)";
  wrap.style.backdropFilter = "blur(6px)";
  wrap.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  wrap.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
  wrap.style.zIndex = "99999";

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;">
      <div style="font-weight:800;font-size:16px;">Kalibrierung</div>
      <label style="font-size:12px;display:flex;align-items:center;gap:6px;user-select:none;">
        <input id="g_guides" type="checkbox" ${settings.showGuides ? "checked" : ""}/>
        Guides
      </label>
    </div>

    <div style="font-size:12px;opacity:0.9;margin-bottom:10px;line-height:1.25;">
      Ziel: Foto-Perspektive matchen.<br/>
      Stell zuerst <b>FOV</b> + <b>camZ</b>, dann <b>floorV</b>.
    </div>

    <div id="rows" style="display:grid;grid-template-columns:120px 1fr;gap:8px 10px;align-items:center;"></div>

    <div style="display:flex;gap:8px;margin-top:10px;">
      <button id="g_save" style="flex:1;padding:10px;border-radius:10px;border:0;background:#111;color:#fff;font-weight:700;cursor:pointer;">
        Speichern
      </button>
      <button id="g_reset" style="padding:10px 12px;border-radius:10px;border:0;background:#e9e9e9;font-weight:700;cursor:pointer;">
        Reset
      </button>
    </div>

    <div style="margin-top:8px;font-size:11px;opacity:0.8;">
      Tipp: Wenn es oben “abreisst” → <b>fitScale</b> leicht erhöhen.
    </div>
  `;

  document.body.appendChild(wrap);

  const rows = wrap.querySelector("#rows");

  function addSlider(label, key, min, max, step) {
    const id = "s_" + key;
    const lab = document.createElement("div");
    lab.textContent = label;
    lab.style.fontSize = "12px";
    lab.style.fontWeight = "700";

    const cell = document.createElement("div");
    cell.innerHTML = `
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}" style="width:100%;" />
      <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.8;">
        <span id="${id}_v">${settings[key]}</span>
        <span>${min}…${max}</span>
      </div>
    `;

    rows.appendChild(lab);
    rows.appendChild(cell);

    const input = wrap.querySelector("#" + id);
    const valEl = wrap.querySelector("#" + id + "_v");

    input.addEventListener("input", () => {
      settings[key] = parseFloat(input.value);
      valEl.textContent = input.value;
      applyCalibration();
    });
  }

  // Core match
  addSlider("FOV", "fov", 20, 60, 1);
  addSlider("camY", "camY", 1.2, 1.8, 0.01);
  addSlider("camZ", "camZ", 6.0, 20.0, 0.1);
  addSlider("backZ", "backZ", -10.0, -45.0, 0.1);
  addSlider("fitScale", "fitScale", 0.9, 1.25, 0.01);
  addSlider("floorV", "floorV", 0.60, 0.92, 0.001);

  // shell
  addSlider("roomW", "roomW", 10.0, 20.0, 0.1);
  addSlider("roomD", "roomD", 12.0, 28.0, 0.1);
  addSlider("roomH", "roomH", 3.0, 5.0, 0.05);

  // repeats
  addSlider("wallRepX", "wallRepX", 1.0, 8.0, 0.1);
  addSlider("wallRepY", "wallRepY", 1.0, 6.0, 0.1);
  addSlider("floorRepX", "floorRepX", 1.0, 10.0, 0.1);
  addSlider("floorRepY", "floorRepY", 1.0, 10.0, 0.1);

  // guides toggle
  const guides = wrap.querySelector("#g_guides");
  guides.addEventListener("change", () => {
    settings.showGuides = !!guides.checked;
    applyCalibration();
  });

  // save / reset
  wrap.querySelector("#g_save").addEventListener("click", () => {
    saveSettings(settings);
    setStatus("Kalibrierung gespeichert");
  });

  wrap.querySelector("#g_reset").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    Object.keys(settings).forEach((k) => (settings[k] = defaults[k]));
    // UI neu laden: einfach reload
    location.reload();
  });
}

makeCalibUI();

// ------------------------------------------------------------
// Apply calibration live
// ------------------------------------------------------------
function applyCalibration() {
  // camera
  camera.fov = settings.fov;
  camera.position.y = settings.camY;
  camera.position.z = settings.camZ;
  camera.updateProjectionMatrix();

  renderer.toneMappingExposure = settings.exposure;

  // lights
  ambient.intensity = settings.ambient;
  key.intensity = settings.key;
  fill.intensity = settings.fill;

  // textures repeats
  if (texWallpaper) {
    texWallpaper.wrapS = THREE.RepeatWrapping;
    texWallpaper.wrapT = THREE.RepeatWrapping;
    texWallpaper.repeat.set(settings.wallRepX, settings.wallRepY);
    texWallpaper.needsUpdate = true;
  }
  if (texWood) {
    texWood.wrapS = THREE.RepeatWrapping;
    texWood.wrapT = THREE.RepeatWrapping;
    texWood.repeat.set(settings.floorRepX, settings.floorRepY);
    texWood.needsUpdate = true;
  }

  // rebuild backdrop geometry + y alignment
  if (backdrop && backdrop.geometry && backdropMat) {
    const map = backdropMat.map;
    const img = map?.image;

    // fall back: keep
    const imgAspect = img?.width && img?.height ? img.width / img.height : 16 / 9;

    const { planeW, planeH } = computeBackdropSize(imgAspect);
    const backY = computeBackdropY(planeH);

    backdrop.geometry.dispose();
    backdrop.geometry = new THREE.PlaneGeometry(planeW, planeH);
    backdrop.position.set(0, backY, settings.backZ);

    // guides follow
    rebuildGuides(planeW, planeH);
  }

  // rebuild shell (so H/W/D match)
  if (texWallpaper || texWood || texCeil || texRug) {
    buildRoomShell();
  }
}

// ------------------------------------------------------------
// Animation loop
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

    if (controls.getObject().position.y < EYE_Y()) {
      controls.getObject().position.y = EYE_Y();
      hopV = 0;
    }

    clampToShell(controls.getObject().position);
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
  applyCalibration();
});
