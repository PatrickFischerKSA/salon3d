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

// WICHTIG: Foto wirkt eher wie Tele -> kleineres FOV reduziert Verzerrungen an den Rändern
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 600);
camera.position.set(0, 1.62, 8.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// ------------------------------------------------------------
// Controls
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
const ROOM_W = 13.2;
const ROOM_D = 17.4;
const ROOM_H = 4.2;

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

function clampToRoom(pos) {
  const pad = 0.55;
  pos.x = THREE.MathUtils.clamp(pos.x, -halfW + pad, halfW - pad);
  pos.z = THREE.MathUtils.clamp(pos.z, -halfD + pad, halfD - pad);
}

// leichter Nebel hilft, dass “Foto-Flächen” weniger hart wirken
scene.fog = new THREE.Fog(0x070707, 14, 55);

// ------------------------------------------------------------
// Licht (subtil)
/// Für Foto-Flächen: zu viel Licht macht’s künstlich
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const softKey = new THREE.DirectionalLight(0xfff2e6, 0.35);
softKey.position.set(6, 7, 5);
scene.add(softKey);
const fillCool = new THREE.DirectionalLight(0xddeeff, 0.18);
fillCool.position.set(-7, 6, 3);
scene.add(fillCool);

// ------------------------------------------------------------
// Textur Helfer
// ------------------------------------------------------------
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

function tune(tex, repeat = null) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  }

  tex.needsUpdate = true;
  return tex;
}

function cropTextureFromImage(img, rect, outW = 2048, outH = 2048, repeat = null) {
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
  return tune(tex, repeat);
}

// ------------------------------------------------------------
// Geometrie: Raum
// ------------------------------------------------------------
const room = new THREE.Group();
scene.add(room);

function addPlane(w, h, mat, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  room.add(m);
  return m;
}

// Materialien (werden nach Laden überschrieben)
const matDark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1.0, metalness: 0.0 });
const matCeil = new THREE.MeshStandardMaterial({ color: 0xb4aca2, roughness: 0.98, metalness: 0.0 });
const matFloor = new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.95, metalness: 0.0 });
const matWallpaper = new THREE.MeshStandardMaterial({ color: 0x5a564f, roughness: 0.98, metalness: 0.0 });

// Wichtig: Backwall als Foto wirkt mit MeshBasicMaterial oft “echter” (keine Fake-Lichtschattierung)
let backWallMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

const backWall = addPlane(ROOM_W, ROOM_H, backWallMat, 0, ROOM_H / 2, -halfD, 0);
const frontWall = addPlane(ROOM_W, ROOM_H, matDark, 0, ROOM_H / 2, halfD, Math.PI);

const leftWall = addPlane(ROOM_D, ROOM_H, matWallpaper, -halfW, ROOM_H / 2, 0, Math.PI / 2);
const rightWall = addPlane(ROOM_D, ROOM_H, matWallpaper, halfW, ROOM_H / 2, 0, -Math.PI / 2);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matFloor);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
room.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), matCeil);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
room.add(ceiling);

// Sockel + Stuckleiste + ECK-PILASTER (verdecken die Naht!)
const trimTop = new THREE.MeshStandardMaterial({ color: 0xc9c1b7, roughness: 0.92, metalness: 0.0 });
const trimBase = new THREE.MeshStandardMaterial({ color: 0x8b8178, roughness: 0.95, metalness: 0.0 });

function addTrimBox(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  room.add(m);
  return m;
}

// Base
addTrimBox(ROOM_W, 0.14, 0.06, 0, 0.07, -halfD + 0.03, trimBase);
addTrimBox(ROOM_W, 0.14, 0.06, 0, 0.07, halfD - 0.03, trimBase);
addTrimBox(0.06, 0.14, ROOM_D, -halfW + 0.03, 0.07, 0, trimBase);
addTrimBox(0.06, 0.14, ROOM_D, halfW - 0.03, 0.07, 0, trimBase);

// Cornice
addTrimBox(ROOM_W, 0.10, 0.08, 0, ROOM_H - 0.05, -halfD + 0.04, trimTop);
addTrimBox(ROOM_W, 0.10, 0.08, 0, ROOM_H - 0.05, halfD - 0.04, trimTop);
addTrimBox(0.08, 0.10, ROOM_D, -halfW + 0.04, ROOM_H - 0.05, 0, trimTop);
addTrimBox(0.08, 0.10, ROOM_D, halfW - 0.04, ROOM_H - 0.05, 0, trimTop);

// Eck-Pilaster (die kaschieren den Perspektivenbruch extrem)
function addPilaster(x, z) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, ROOM_H, 0.18), trimTop);
  p.position.set(x, ROOM_H / 2, z);
  room.add(p);
}
addPilaster(-halfW + 0.09, -halfD + 0.09);
addPilaster(halfW - 0.09, -halfD + 0.09);
addPilaster(-halfW + 0.09, halfD - 0.09);
addPilaster(halfW - 0.09, halfD - 0.09);

// Teppich (extra)
const rug = new THREE.Mesh(
  new THREE.PlaneGeometry(8.4, 6.8),
  new THREE.MeshStandardMaterial({ color: 0x5a1b1b, roughness: 0.98, metalness: 0.0 })
);
rug.rotation.x = -Math.PI / 2;
rug.position.set(0, 0.012, -2.2);
room.add(rug);

// ------------------------------------------------------------
// Laden & Texturen setzen
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

    // Backwall: ganze “Kaminwand”/Hauptansicht (perspektivisch OK, weil sie frontal ist)
    const texBack = cropTextureFromImage(img, { x: 0.12, y: 0.08, w: 0.76, h: 0.60 }, 4096, 2048);

    // Tapete: nur Muster (ohne Sofa/Bilder/Decke!) → damit keine perspektivischen Artefakte an den Seiten
    const texWallpaper = cropTextureFromImage(img, { x: 0.34, y: 0.22, w: 0.12, h: 0.18 }, 4096, 4096, { x: 3.2, y: 1.9 });

    // Holz: clean unten rechts
    const texWood = cropTextureFromImage(img, { x: 0.88, y: 0.88, w: 0.12, h: 0.12 }, 4096, 4096, { x: 4.0, y: 3.0 });
    texWood.rotation = Math.PI / 2;
    texWood.center.set(0.5, 0.5);
    texWood.needsUpdate = true;

    // Decke: oben mittig (Stuck)
    const texCeil = cropTextureFromImage(img, { x: 0.22, y: 0.00, w: 0.56, h: 0.18 }, 2048, 2048);

    // Teppichzentrum
    const texRug = cropTextureFromImage(img, { x: 0.28, y: 0.62, w: 0.44, h: 0.34 }, 2048, 2048);

    // Apply
    backWall.material = new THREE.MeshBasicMaterial({ map: texBack }); // Foto bleibt “Foto”, ohne Fake-Licht
    leftWall.material = new THREE.MeshStandardMaterial({ map: texWallpaper, roughness: 0.98, metalness: 0.0 });
    rightWall.material = new THREE.MeshStandardMaterial({ map: texWallpaper, roughness: 0.98, metalness: 0.0 });

    floor.material = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.88, metalness: 0.0 });
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
