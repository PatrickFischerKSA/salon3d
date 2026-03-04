import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

// ------------------------------------------------------------
// Salon3D – Zylinder-Panorama (perspektivisch stabiler als Box)
// Nutzt salon1 als "Rundum-Wand" + salon2 als extra Paneel
// ------------------------------------------------------------

const ASSET = {
  pano: "./assets/img/salon1.jpg",
  panel: "./assets/img/salon2.jpg",
};

// Player
const EYE_HEIGHT = 1.6;

// Bewegung
const SPEED = 4.0;
const SPEED_FAST = 7.5;
const DAMPING = 10.0;

let scene, camera, renderer, controls;
const clock = new THREE.Clock();
const keys = Object.create(null);
let velX = 0;
let velZ = 0;

// Raumgrenzen (damit du nicht "durch die Wand")
const LIMIT_R = 4.2; // Radius, in dem du laufen darfst

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, EYE_HEIGHT, 0.0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) btn.onclick = () => controls.lock();

  // Licht nur minimal (weil wir hauptsächlich Bildmaterial zeigen)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));

  // Laden & Szene bauen
  buildPanorama();

  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("resize", onResize);
}

function buildPanorama() {
  const loader = new THREE.TextureLoader();

  const loadTexture = (url) =>
    new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

  Promise.all([loadTexture(ASSET.pano), loadTexture(ASSET.panel)])
    .then(([tPano, tPanel]) => {
      prepareTexture(tPano);
      prepareTexture(tPanel);

      // 1) Zylinder als Wand (innen sichtbar)
      // Wir verwenden einen Zylinder (ohne Top/Bottom), damit nichts "schwebt".
      const R = 6.0;
      const H = 4.2;

      const cylGeo = new THREE.CylinderGeometry(R, R, H, 64, 1, true);
      const cylMat = new THREE.MeshBasicMaterial({
        map: tPano,
        side: THREE.BackSide,
      });

      const cylinder = new THREE.Mesh(cylGeo, cylMat);
      cylinder.position.y = H / 2;
      scene.add(cylinder);

      // 2) Zusatz-Paneel aus salon2 (wie ein großes Wandbild/Patch)
      // Damit du Perspektive von salon2 bekommst, ohne die ganze Geometrie zu zerstören.
      const panelW = 9.0;
      const panelH = 4.0;

      const panelGeo = new THREE.PlaneGeometry(panelW, panelH);
      const panelMat = new THREE.MeshBasicMaterial({
        map: tPanel,
        side: THREE.DoubleSide,
      });

      const panel = new THREE.Mesh(panelGeo, panelMat);

      // Paneel leicht nach vorne, auf einer Seite des Zylinders
      panel.position.set(0, panelH / 2, -5.2);
      panel.rotation.y = 0; // Blickrichtung
      scene.add(panel);

      // Startposition
      controls.getObject().position.set(0, EYE_HEIGHT, 2.0);
    })
    .catch(() => {
      // Fallback: einfach grau
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(10, 6, 10),
        new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.BackSide })
      );
      box.position.y = 3;
      scene.add(box);
      controls.getObject().position.set(0, EYE_HEIGHT, 2.0);
    });
}

function prepareTexture(t) {
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, clock.getDelta());

  if (controls.isLocked) updateMovement(dt);

  renderer.render(scene, camera);
}

function updateMovement(dt) {
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

  // Höhe fix
  controls.getObject().position.y = EYE_HEIGHT;

  // Begrenzen: Kreisradius
  clampToCircle();

  // Reset
  if (keys["KeyR"]) {
    controls.getObject().position.set(0, EYE_HEIGHT, 2.0);
    velX = 0;
    velZ = 0;
    keys["KeyR"] = false;
  }
}

function clampToCircle() {
  const p = controls.getObject().position;
  const r = Math.sqrt(p.x * p.x + p.z * p.z);
  if (r > LIMIT_R) {
    const k = LIMIT_R / r;
    p.x *= k;
    p.z *= k;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
