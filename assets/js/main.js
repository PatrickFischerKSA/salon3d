// assets/js/main.js  (PHASE 2: Raum + 2 Texturen, stabil)

import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const statusEl = document.getElementById("status");
const setStatus = (t) => {
  if (statusEl) statusEl.textContent = t;
  console.log("[STATUS]", t);
};

setStatus("Main geladen");

// ---------------------------
// Basis: Szene / Kamera / Renderer
// ---------------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

// Etwas weiter hinten als vorher, damit die Perspektive ruhiger wirkt
camera.position.set(0, 1.6, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");

// ---------------------------
// Licht
// ---------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(3, 6, 4);
scene.add(dir);

// ---------------------------
// Raum-Dimensionen
// ---------------------------
const ROOM_W = 20; // Breite (x)
const ROOM_D = 20; // Tiefe (z)
const ROOM_H = 5;  // Höhe (y)

const halfW = ROOM_W / 2;
const halfD = ROOM_D / 2;

// ---------------------------
// Boden
// ---------------------------
const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x444444,
  roughness: 0.95,
  metalness: 0.0
});

const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// ---------------------------
// Decke (damit oben nicht mehr schwarz ist)
// ---------------------------
const ceilingGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x666666,
  roughness: 0.95,
  metalness: 0.0
});

const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM_H;
scene.add(ceiling);

// ---------------------------
// Wände
// ---------------------------
const wallMat = new THREE.MeshStandardMaterial({
  color: 0x777777,
  roughness: 0.95,
  metalness: 0.0
});

const backFrontGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H);
const leftRightGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_H);

// Rückwand (z = -halfD)
const backWall = new THREE.Mesh(backFrontGeo, wallMat);
backWall.position.set(0, ROOM_H / 2, -halfD);
scene.add(backWall);

// Vorderwand (z = +halfD), nach innen schauen
const frontWall = new THREE.Mesh(backFrontGeo, wallMat);
frontWall.position.set(0, ROOM_H / 2, halfD);
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

// Linke Wand (x = -halfW)
const leftWall = new THREE.Mesh(leftRightGeo, wallMat);
leftWall.position.set(-halfW, ROOM_H / 2, 0);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

// Rechte Wand (x = +halfW)
const rightWall = new THREE.Mesh(leftRightGeo, wallMat);
rightWall.position.set(halfW, ROOM_H / 2, 0);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// ---------------------------
// Texturen laden + Bilder platzieren
// ---------------------------
const loader = new THREE.TextureLoader();
let tex1Loaded = false;
let tex2Loaded = false;

const tryReady = () => {
  if (tex1Loaded && tex2Loaded) setStatus("Szene bereit");
};

const makePainting = (texture, x) => {
  // Bilder wirken natürlicher, wenn sie nicht “glänzen”
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const mat = new THREE.MeshBasicMaterial({ map: texture });
  const geo = new THREE.PlaneGeometry(6, 4);
  const mesh = new THREE.Mesh(geo, mat);

  // minimal vor der Rückwand, damit kein Z-Fighting entsteht
  mesh.position.set(x, 2.2, -halfD + 0.01);
  scene.add(mesh);
};

// Textur 1
loader.load(
  "/salon3d/assets/img/salon1.jpg",
  (texture) => {
    tex1Loaded = true;
    setStatus("Textur 1 OK");
    makePainting(texture, -4);
    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 1 konnte nicht geladen werden");
  }
);

// Textur 2
loader.load(
  "/salon3d/assets/img/salon2.jpg",
  (texture) => {
    tex2Loaded = true;
    setStatus("Textur 2 OK");
    makePainting(texture, 4);
    tryReady();
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("FEHLER: Textur 2 konnte nicht geladen werden");
  }
);

// ---------------------------
// Animation Loop
// ---------------------------
function animate() {
  requestAnimationFrame(animate);
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
