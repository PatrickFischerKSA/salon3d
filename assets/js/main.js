// assets/js/main.js — Salon3D Photo Projection + Auto-Kalibrierung (4 Klicks)
// ------------------------------------------------------------
// Voraussetzungen:
// - /salon3d/assets/img/Salon_4.jpg existiert (Case-sensitiv!)
// - index.html enthält #enterBtn und #status (wie bei dir)
//
// Auto-Kalibrierung:
// - Klicke im Overlay 4 Rückwand-Ecken: TL -> TR -> BR -> BL
// - Script berechnet floorV, roomW, planeW/H und camZ (aus roomH + FOV)
//
// Hinweis:
// - FOV bleibt dein "Look" Regler. Auto-Kalibrierung passt camZ so an,
//   dass die Rückwand geometrisch passt.
// ------------------------------------------------------------

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ------------------------------------------------------------
// Helpers (UI + storage)
// ------------------------------------------------------------
const LS_KEY = "salon3d_calib_v2";

function $(sel) {
  return document.querySelector(sel);
}

const statusEl = $("#status");
const enterBtn = $("#enterBtn");

function setStatus(t) {
  if (statusEl) statusEl.textContent = t;
  console.log("[STATUS]", t);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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
// Default calibration (guter Start)
// ------------------------------------------------------------
const defaults = {
  // camera
  fov: 34, // realistischer Start
  camY: 1.55,
  camZ: 14.5,

  // backdrop plane
  backZ: -28.0,
  fitScale: 1.08, // Sicherheits-Füllung

  // Foto-Floorline (V): wo im Foto Wand->Boden beginnt
  // 0 = oben, 1 = unten
  floorV: 0.82,

  // room box (Immersion)
  roomW: 14.0,
  roomD: 20.0,
  roomH: 3.6,

  // repeats
  wallRepX: 2.7,
  wallRepY: 1.8,
  floorRepX: 3.6,
  floorRepY: 6.0,

  // rug
  rugW: 8.4,
  rugD: 6.8,
  rugX: 0.0,
  rugZ: -2.2,

  // guides
  showGuides: true,

  // lighting
  exposure: 1.08,
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
scene.fog = new THREE.Fog(0x070707, 14, 60);

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, 800);
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

    // Auto-Kalibrier Overlay
    case "KeyC":
      openAutoCalibOverlay();
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

function tune(tex, { repeat = null, clampEdges = true } = {}) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  } else if (clampEdges) {
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
// Core: Backdrop (auto-fit + floor alignment)
// ------------------------------------------------------------
let backdrop = null;
let backdropMat = null;
let guideLines = null;
let sourceImage = null; // Image object
let sourceAspect = 16 / 9;

function computeViewHeightAtDistance(dist) {
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  return 2 * dist * Math.tan(fovRad / 2);
}

function computeBackdropFromGeometry(planeW, planeH) {
  // floorV alignment: y_at_v = (0.5 - v) * H
  const yAtV = (0.5 - settings.floorV) * planeH;
  const backY = -yAtV;

  if (!backdrop) {
    backdropMat = new THREE.MeshBasicMaterial({ map: null });
    backdrop = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), backdropMat);
    scene.add(backdrop);
  } else {
    backdrop.geometry.dispose();
    backdrop.geometry = new THREE.PlaneGeometry(planeW, planeH);
  }

  backdrop.position.set(0, backY, settings.backZ);
  backdrop.rotation.set(0, 0, 0);
}

function rebuildGuides(planeW, planeH) {
  if (guideLines) {
    guideLines.geometry.dispose();
    guideLines.material.dispose();
    scene.remove(guideLines);
    guideLines = null;
  }
  if (!settings.showGuides || !backdrop) return;

  const verts = [];
  const yFloor = (0.5 - settings.floorV) * planeH;

  // floor line across plane
  verts.push(-planeW / 2, yFloor, 0.001, planeW / 2, yFloor, 0.001);
  // center vertical
  verts.push(0, -planeH / 2, 0.001, 0, planeH / 2, 0.001);
  // center horizontal
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

  const wallMat = new THREE.MeshStandardMaterial({
    map: texWallpaper || null,
    color: texWallpaper ? 0xffffff : 0x5a564f,
    roughness: 0.98,
    metalness: 0.0,
  });

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  leftWall.position.set(-halfW, H / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  rightWall.position.set(halfW, H / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  room.add(rightWall);

  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matDark);
  frontWall.position.set(0, H / 2, halfD);
  frontWall.rotation.y = Math.PI;
  room.add(frontWall);

  const floorMat = new THREE.MeshStandardMaterial({
    map: texWood || null,
    color: texWood ? 0xffffff : 0x2a2623,
    roughness: 0.88,
    metalness: 0.0,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  room.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({
    map: texCeil || null,
    color: texCeil ? 0xffffff : 0xb4aca2,
    roughness: 0.98,
    metalness: 0.0,
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
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

  // corner pilasters
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

  const rug = new THREE.Mesh(new THREE.PlaneGeometry(settings.rugW, settings.rugD), rugMat);
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
// Load Salon_4.jpg and build textures
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

    sourceImage = img;
    sourceAspect = img.width / img.height;

    // Backdrop: Wir nutzen das GESAMTE Foto (wichtig für Auto-Kalibrierung),
    // damit die U/V Klick-Koordinaten exakt stimmen.
    const texBackdrop = tune(tex, { clampEdges: true });
    backdropMat = new THREE.MeshBasicMaterial({ map: texBackdrop });

    // Create initial backdrop geometry from FOV + distance (frustum fit)
    // Wir setzen planeH so, dass es den Viewport füllt (vor Auto-Kalibrierung).
    const dist = Math.abs(settings.backZ - camera.position.z);
    const viewH = computeViewHeightAtDistance(dist);
    const planeH = viewH * settings.fitScale;
    const planeW = planeH * sourceAspect;

    computeBackdropFromGeometry(planeW, planeH);
    backdrop.material = backdropMat;

    rebuildGuides(planeW, planeH);

    // Material-Crops für Raumtexturen
    texWallpaper = cropTextureFromImage(img, { x: 0.34, y: 0.22, w: 0.12, h: 0.18 }, 4096, 4096, {
      repeat: { x: settings.wallRepX, y: settings.wallRepY },
      clampEdges: false,
    });

    texWood = cropTextureFromImage(img, { x: 0.88, y: 0.88, w: 0.12, h: 0.12 }, 4096, 4096, {
      repeat: { x: settings.floorRepX, y: settings.floorRepY },
      clampEdges: false,
    });
    texWood.rotation = Math.PI / 2;
    texWood.center.set(0.5, 0.5);
    texWood.needsUpdate = true;

    texCeil = cropTextureFromImage(img, { x: 0.22, y: 0.00, w: 0.56, h: 0.18 }, 2048, 2048, { clampEdges: true });
    texRug = cropTextureFromImage(img, { x: 0.28, y: 0.62, w: 0.44, h: 0.34 }, 2048, 2048, { clampEdges: true });

    buildRoomShell();

    setStatus("Szene bereit (Taste C = Auto-Kalibrierung)");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Salon_4.jpg lädt nicht (Pfad/Name?)");
  }
);

// ------------------------------------------------------------
// Calibration UI (Slider + Auto-Kalibrier Button)
// ------------------------------------------------------------
let calibPanel = null;

function makeCalibUI() {
  if (calibPanel) calibPanel.remove();

  const wrap = document.createElement("div");
  calibPanel = wrap;

  wrap.id = "calibPanel";
  wrap.style.position = "fixed";
  wrap.style.right = "14px";
  wrap.style.top = "14px";
  wrap.style.width = "340px";
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
      <b>Auto:</b> 4 Klicks auf Rückwand-Ecken (Taste <b>C</b>).<br/>
      <b>Manuell:</b> FOV/fitScale/floorV feinjustieren.
    </div>

    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <button id="g_auto" style="flex:1;padding:10px;border-radius:10px;border:0;background:#0f172a;color:#fff;font-weight:800;cursor:pointer;">
        Auto (4 Klicks)
      </button>
      <button id="g_save" style="padding:10px 12px;border-radius:10px;border:0;background:#111;color:#fff;font-weight:800;cursor:pointer;">
        Speichern
      </button>
    </div>

    <div id="rows" style="display:grid;grid-template-columns:120px 1fr;gap:8px 10px;align-items:center;"></div>

    <div style="display:flex;gap:8px;margin-top:10px;">
      <button id="g_reset" style="flex:1;padding:10px;border-radius:10px;border:0;background:#e9e9e9;font-weight:800;cursor:pointer;">
        Reset
      </button>
    </div>

    <div style="margin-top:8px;font-size:11px;opacity:0.85;">
      Tipp: Wenn oben noch Rand sichtbar → <b>fitScale</b> leicht erhöhen.
    </div>
  `;

  document.body.appendChild(wrap);

  const rows = wrap.querySelector("#rows");

  function addSlider(label, key, min, max, step) {
    const id = "s_" + key;

    const lab = document.createElement("div");
    lab.textContent = label;
    lab.style.fontSize = "12px";
    lab.style.fontWeight = "800";

    const cell = document.createElement("div");
    cell.innerHTML = `
      <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}" style="width:100%;" />
      <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.85;">
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
      applyCalibration(true);
    });
  }

  // Core match
  addSlider("FOV", "fov", 20, 60, 1);
  addSlider("camY", "camY", 1.2, 1.8, 0.01);
  addSlider("camZ", "camZ", 6.0, 22.0, 0.1);
  addSlider("backZ", "backZ", -10.0, -55.0, 0.1);
  addSlider("fitScale", "fitScale", 0.9, 1.25, 0.01);
  addSlider("floorV", "floorV", 0.60, 0.92, 0.001);

  // shell
  addSlider("roomW", "roomW", 10.0, 22.0, 0.1);
  addSlider("roomD", "roomD", 12.0, 30.0, 0.1);
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
    applyCalibration(true);
  });

  // auto
  wrap.querySelector("#g_auto").addEventListener("click", () => openAutoCalibOverlay());

  // save
  wrap.querySelector("#g_save").addEventListener("click", () => {
    saveSettings(settings);
    setStatus("Kalibrierung gespeichert");
  });

  // reset
  wrap.querySelector("#g_reset").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    Object.keys(settings).forEach((k) => (settings[k] = defaults[k]));
    location.reload();
  });
}

makeCalibUI();

// ------------------------------------------------------------
// Apply calibration live
// ------------------------------------------------------------
function applyCalibration(rebuildBackdrop = false) {
  // camera
  camera.fov = settings.fov;
  camera.position.y = settings.camY;
  camera.position.z = settings.camZ;
  camera.updateProjectionMatrix();

  // renderer
  renderer.toneMappingExposure = settings.exposure;

  // lights
  ambient.intensity = settings.ambient;
  key.intensity = settings.key;
  fill.intensity = settings.fill;

  // repeats
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

  // Backdrop rebuild:
  // Standardmodus: planeH aus Frustum fit.
  // Auto-Kalibrierung setzt planeW/H direkt (siehe applyAutoCalib()).
  if (rebuildBackdrop && backdrop && sourceImage) {
    const dist = Math.abs(settings.backZ - camera.position.z);
    const viewH = computeViewHeightAtDistance(dist);
    const planeH = viewH * settings.fitScale;
    const planeW = planeH * sourceAspect;

    computeBackdropFromGeometry(planeW, planeH);
    if (backdropMat) backdrop.material = backdropMat;

    rebuildGuides(planeW, planeH);
  }

  // rebuild shell
  if (texWallpaper || texWood || texCeil || texRug) {
    buildRoomShell();
  }
}

// ------------------------------------------------------------
// AUTO-KALIBRIERUNG (4 Klicks)
// ------------------------------------------------------------
let autoOverlay = null;
let autoClicks = [];

function openAutoCalibOverlay() {
  if (!sourceImage) {
    setStatus("Auto-Kalibrierung: Bild noch nicht geladen");
    return;
  }
  if (autoOverlay) return;

  controls.unlock?.();

  autoClicks = [];

  const ov = document.createElement("div");
  autoOverlay = ov;
  ov.style.position = "fixed";
  ov.style.inset = "0";
  ov.style.background = "rgba(0,0,0,0.78)";
  ov.style.zIndex = "100000";
  ov.style.display = "flex";
  ov.style.alignItems = "center";
  ov.style.justifyContent = "center";
  ov.style.padding = "24px";

  const panel = document.createElement("div");
  panel.style.width = "min(1180px, 96vw)";
  panel.style.height = "min(760px, 92vh)";
  panel.style.background = "rgba(255,255,255,0.96)";
  panel.style.borderRadius = "16px";
  panel.style.boxShadow = "0 18px 70px rgba(0,0,0,0.45)";
  panel.style.overflow = "hidden";
  panel.style.display = "grid";
  panel.style.gridTemplateRows = "auto 1fr auto";

  panel.innerHTML = `
    <div style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-weight:900;font-size:16px;">Auto-Kalibrierung (4 Klicks)</div>
        <div style="font-size:12px;opacity:0.85;line-height:1.25;margin-top:2px;">
          Klicke die <b>Rückwand-Ecken</b> im Foto: <b>oben-links → oben-rechts → unten-rechts → unten-links</b>.
          <br/>ESC = Abbrechen
        </div>
      </div>
      <button id="ac_close" style="border:0;background:#111;color:#fff;font-weight:900;padding:10px 12px;border-radius:10px;cursor:pointer;">
        Abbrechen
      </button>
    </div>

    <div style="position:relative;background:#111;">
      <canvas id="ac_canvas" style="width:100%;height:100%;display:block;"></canvas>
      <div id="ac_hint" style="position:absolute;left:12px;bottom:12px;background:rgba(0,0,0,0.55);color:#fff;
        padding:10px 12px;border-radius:12px;font-size:12px;backdrop-filter:blur(6px);">
        Klick 1/4: <b>oben-links</b>
      </div>
    </div>

    <div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
      <div style="font-size:12px;opacity:0.85;">
        Nach 4 Klicks werden <b>floorV</b>, <b>roomW</b>, <b>planeW/H</b> und <b>camZ</b> automatisch gesetzt.
      </div>
      <button id="ac_undo" style="border:0;background:#e9e9e9;font-weight:900;padding:10px 12px;border-radius:10px;cursor:pointer;">
        Letzten entfernen
      </button>
    </div>
  `;

  ov.appendChild(panel);
  document.body.appendChild(ov);

  const closeBtn = panel.querySelector("#ac_close");
  const undoBtn = panel.querySelector("#ac_undo");
  const hintEl = panel.querySelector("#ac_hint");

  const canvas = panel.querySelector("#ac_canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  // Fit image into canvas with letterboxing
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * (window.devicePixelRatio || 1));
    canvas.height = Math.floor(rect.height * (window.devicePixelRatio || 1));
    draw();
  }

  function draw() {
    // clear
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = sourceImage;
    const cw = canvas.width;
    const ch = canvas.height;

    const imgAspect = img.width / img.height;
    const canAspect = cw / ch;

    let drawW, drawH, offX, offY;
    if (imgAspect > canAspect) {
      drawW = cw;
      drawH = cw / imgAspect;
      offX = 0;
      offY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgAspect;
      offY = 0;
      offX = (cw - drawW) / 2;
    }

    // image
    ctx.drawImage(img, offX, offY, drawW, drawH);

    // markers
    for (let i = 0; i < autoClicks.length; i++) {
      const p = autoClicks[i];

      const x = offX + p.u * drawW;
      const y = offY + p.v * drawH;

      ctx.beginPath();
      ctx.arc(x, y, 9 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,255,204,0.85)";
      ctx.fill();

      ctx.font = `${14 * (window.devicePixelRatio || 1)}px system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillText(String(i + 1), x - 4 * (window.devicePixelRatio || 1), y + 5 * (window.devicePixelRatio || 1));
    }

    // polyline
    if (autoClicks.length >= 2) {
      ctx.beginPath();
      for (let i = 0; i < autoClicks.length; i++) {
        const p = autoClicks[i];
        const x = offX + p.u * drawW;
        const y = offY + p.v * drawH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(0,255,204,0.55)";
      ctx.lineWidth = 3 * (window.devicePixelRatio || 1);
      ctx.stroke();
    }

    // store for click conversion
    canvas._fit = { offX, offY, drawW, drawH, cw, ch };
  }

  function updateHint() {
    const labels = ["oben-links", "oben-rechts", "unten-rechts", "unten-links"];
    const n = autoClicks.length;
    if (n >= 4) {
      hintEl.innerHTML = `Berechnung …`;
      return;
    }
    hintEl.innerHTML = `Klick ${n + 1}/4: <b>${labels[n]}</b>`;
  }

  function closeOverlay() {
    if (!autoOverlay) return;
    autoOverlay.remove();
    autoOverlay = null;
    autoClicks = [];
  }

  function applyAutoCalibFromClicks() {
    // Erwartete Reihenfolge: TL, TR, BR, BL
    const TL = autoClicks[0];
    const TR = autoClicks[1];
    const BR = autoClicks[2];
    const BL = autoClicks[3];

    // Stabilisierung: clamp
    const ceilingV = clamp((TL.v + TR.v) / 2, 0.0, 0.95);
    const floorV = clamp((BL.v + BR.v) / 2, 0.05, 1.0);

    const leftU = clamp((TL.u + BL.u) / 2, 0.0, 0.95);
    const rightU = clamp((TR.u + BR.u) / 2, 0.05, 1.0);

    const spanU = clamp(rightU - leftU, 0.05, 0.98);
    const spanV = clamp(floorV - ceilingV, 0.05, 0.98);

    // 1) floorV setzen (Bodenlinie an y=0)
    settings.floorV = floorV;

    // 2) roomW aus roomH + Pixel-Aspect der Rückwand ableiten:
    // PixelRatio(backwall) = (spanU*imgW) / (spanV*imgH) = (spanU/spanV) * imgAspect
    const imgAspect = sourceAspect;
    const pixelRatio = (spanU / spanV) * imgAspect;

    // roomH bleibt deine "echte" Höhe (Stil: hohe Zimmer)
    // roomW berechnet:
    settings.roomW = clamp(settings.roomH * pixelRatio, 10.0, 22.0);

    // 3) planeH so wählen, dass der Abschnitt (ceilingV..floorV) genau roomH hoch ist:
    // planeH * spanV = roomH  => planeH = roomH / spanV
    const planeH = settings.roomH / spanV;

    // planeW so, dass der Abschnitt (leftU..rightU) genau roomW breit ist:
    // planeW * spanU = roomW  => planeW = roomW / spanU
    const planeW = settings.roomW / spanU;

    // 4) camZ so, dass diese planeH bei deinem FOV in den Viewport passt (mit fitScale):
    // viewH = planeH / fitScale  (weil planeH = viewH*fitScale)
    // viewH = 2*dist*tan(fov/2)  => dist = (viewH/2)/tan(fov/2)
    const fovRad = THREE.MathUtils.degToRad(settings.fov);
    const viewH = planeH / settings.fitScale;
    const dist = (viewH / 2) / Math.tan(fovRad / 2);

    // camZ = backZ + dist (weil Backdrop bei z=backZ liegt)
    settings.camZ = settings.backZ + dist;

    // roomD sinnvoll nachziehen (damit du vor dem Backdrop laufen kannst)
    settings.roomD = clamp(Math.max(settings.roomW * 1.45, 16.0), 16.0, 30.0);

    // Jetzt Backdrop exakt mit planeW/H bauen und room neu
    camera.fov = settings.fov;
    camera.position.y = settings.camY;
    camera.position.z = settings.camZ;
    camera.updateProjectionMatrix();

    computeBackdropFromGeometry(planeW, planeH);
    if (backdropMat) backdrop.material = backdropMat;

    rebuildGuides(planeW, planeH);
    buildRoomShell();

    // UI slider refresh: easiest = rebuild panel (damit values stimmen)
    makeCalibUI();

    // speichern (so bleibt es nach Reload)
    saveSettings(settings);

    setStatus("Auto-Kalibrierung angewendet & gespeichert");
    closeOverlay();
  }

  // Events
  closeBtn.addEventListener("click", closeOverlay);
  undoBtn.addEventListener("click", () => {
    autoClicks.pop();
    updateHint();
    draw();
  });

  window.addEventListener(
    "keydown",
    (e) => {
      if (!autoOverlay) return;
      if (e.code === "Escape") closeOverlay();
    },
    { passive: true }
  );

  canvas.addEventListener("click", (e) => {
    const fit = canvas._fit;
    if (!fit) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    // check inside image area
    const { offX, offY, drawW, drawH } = fit;
    if (x < offX || x > offX + drawW || y < offY || y > offY + drawH) return;

    const u = (x - offX) / drawW;
    const v = (y - offY) / drawH;

    autoClicks.push({ u, v });
    updateHint();
    draw();

    if (autoClicks.length === 4) {
      applyAutoCalibFromClicks();
    }
  });

  // initial paint
  updateHint();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
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

  // backdrop via frustum-fit refresh (nur wenn vorhanden)
  applyCalibration(true);
});
