// assets/js/main.js
// Stabil: keine "bare" module specifier, keine Vendor-Abhängigkeiten.
// Lädt Texturen zuverlässig relativ zur Datei via import.meta.url.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const UI = {
  btn: document.getElementById("enterBtn"),
  status: document.getElementById("status"),
};

let scene, camera, renderer;
let yawObject, pitchObject;
let clock;

let isLocked = false;
let vel = new THREE.Vector3();
let dir = new THREE.Vector3();
let keys = Object.create(null);

const SETTINGS = {
  playerHeight: 1.6,
  baseSpeed: 2.6,     // m/s
  sprintFactor: 2.0,  // Shift
  hopStrength: 1.8,   // Space
  drag: 8.0,          // Dämpfung
  room: {
    width: 14,
    height: 4.2,
    depth: 18,
  },
};

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    200
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // Minimal-„PointerLockControls“ (robust, ohne extra Datei)
  yawObject = new THREE.Object3D();
  pitchObject = new THREE.Object3D();
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  camera.position.set(0, 0, 0);
  yawObject.position.set(0, SETTINGS.playerHeight, 4);
  scene.add(yawObject);

  // Licht
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.1);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(4, 8, 3);
  scene.add(dirLight);

  // Raum erstellen (erstmal mit Platzhalter-Materialien, dann Texturen rein)
  buildRoom();

  // Input
  setupInput();

  // UI Button: Lock anfordern
  UI.btn.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    UI.status.textContent = isLocked ? "Pointer Lock aktiv." : "Pointer Lock aus.";
  });

  // Resize
  window.addEventListener("resize", onResize);
}

function buildRoom() {
  const { width: W, height: H, depth: D } = SETTINGS.room;

  // Texturen per URL relativ zu dieser Datei (funktioniert auf GitHub Pages!)
  const wall1Url = new URL("../img/salon1.jpg", import.meta.url).href;
  const wall2Url = new URL("../img/salon2.jpg", import.meta.url).href;

  const loader = new THREE.TextureLoader();

  // Platzhalter-Materialien (damit man IMMER etwas sieht)
  const matWallA = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 1 });
  const matWallB = new THREE.MeshStandardMaterial({ color: 0x5f5f5f, roughness: 1 });
  const matFloor = new THREE.MeshStandardMaterial({ color: 0x5a4226, roughness: 1 });
  const matCeil  = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 1 });

  // Geometrien (Planes nach innen)
  // Wände: +Z (hinten), -Z (vorn), +X (rechts), -X (links)
  const wallGeoZ = new THREE.PlaneGeometry(W, H);
  const wallGeoX = new THREE.PlaneGeometry(D, H);
  const floorGeo = new THREE.PlaneGeometry(W, D);

  // Hinten (+Z) -> salon1
  const backWall = new THREE.Mesh(wallGeoZ, matWallA);
  backWall.position.set(0, H / 2, -D / 2);
  backWall.rotateY(Math.PI); // nach innen
  scene.add(backWall);

  // Vorne (-Z) -> salon2
  const frontWall = new THREE.Mesh(wallGeoZ, matWallB);
  frontWall.position.set(0, H / 2, D / 2);
  // steht schon nach innen (Plane zeigt +Z), wir brauchen Richtung -Z -> drehen:
  // actually default plane faces +Z, at z=+D/2 it faces toward camera at center; that's fine.
  scene.add(frontWall);

  // Rechts (+X) -> salon1
  const rightWall = new THREE.Mesh(wallGeoX, matWallA);
  rightWall.position.set(W / 2, H / 2, 0);
  rightWall.rotateY(-Math.PI / 2);
  scene.add(rightWall);

  // Links (-X) -> salon2
  const leftWall = new THREE.Mesh(wallGeoX, matWallB);
  leftWall.position.set(-W / 2, H / 2, 0);
  leftWall.rotateY(Math.PI / 2);
  scene.add(leftWall);

  // Boden
  const floor = new THREE.Mesh(floorGeo, matFloor);
  floor.position.set(0, 0, 0);
  floor.rotateX(-Math.PI / 2);
  scene.add(floor);

  // Decke
  const ceil = new THREE.Mesh(floorGeo, matCeil);
  ceil.position.set(0, H, 0);
  ceil.rotateX(Math.PI / 2);
  scene.add(ceil);

  // Texturen laden + anwenden (mit klarer Statusmeldung)
  UI.status.textContent = "Lade Texturen…";

  let loaded = 0;
  const total = 2;

  const applyWallTexture = (tex, targetMat, rotate = 0) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    if (rotate !== 0) tex.rotation = rotate;
    tex.needsUpdate = true;

    targetMat.map = tex;
    targetMat.color.set(0xffffff);
    targetMat.needsUpdate = true;
  };

  const onOneLoaded = () => {
    loaded++;
    UI.status.textContent = `Texturen geladen: ${loaded}/${total}`;
    if (loaded === total) UI.status.textContent = "Texturen OK. Klick: Maus-Look.";
  };

  const onErr = (which) => (err) => {
    console.error("Texture load failed:", which, err);
    UI.status.textContent = `Fehler beim Laden: ${which} (siehe Konsole)`;
  };

  loader.load(
    wall1Url,
    (tex) => {
      applyWallTexture(tex, matWallA, 0);
      onOneLoaded();
    },
    undefined,
    onErr("salon1.jpg")
  );

  loader.load(
    wall2Url,
    (tex) => {
      applyWallTexture(tex, matWallB, 0);
      onOneLoaded();
    },
    undefined,
    onErr("salon2.jpg")
  );
}

function setupInput() {
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    if (e.code === "KeyR") {
      yawObject.position.set(0, SETTINGS.playerHeight, 4);
      vel.set(0, 0, 0);
      pitchObject.rotation.x = 0;
      yawObject.rotation.y = 0;
    }

    if (e.code === "Space") {
      // kleiner Hopser nur wenn locked (damit nicht beim Tippen scrollt)
      if (isLocked) vel.y = SETTINGS.hopStrength;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  // Maus-Look
  window.addEventListener("mousemove", (e) => {
    if (!isLocked) return;

    const sensitivity = 0.0022;
    yawObject.rotation.y -= e.movementX * sensitivity;
    pitchObject.rotation.x -= e.movementY * sensitivity;

    const minPitch = -Math.PI / 2 + 0.05;
    const maxPitch =  Math.PI / 2 - 0.05;
    pitchObject.rotation.x = Math.max(minPitch, Math.min(maxPitch, pitchObject.rotation.x));
  });
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.03);

  updateMovement(dt);

  renderer.render(scene, camera);
}

function updateMovement(dt) {
  // Dämpfung
  vel.x -= vel.x * SETTINGS.drag * dt;
  vel.z -= vel.z * SETTINGS.drag * dt;

  // leichte Gravitation, damit Hopser zurückkommt
  vel.y -= 9.81 * dt;
  if (yawObject.position.y <= SETTINGS.playerHeight) {
    yawObject.position.y = SETTINGS.playerHeight;
    vel.y = Math.max(0, vel.y);
  }

  if (!isLocked) {
    // Kein „Driften“ wenn unlocked
    yawObject.position.addScaledVector(vel, dt * 0.2);
    return;
  }

  // Richtung aus Tasten
  const forward = (keys["KeyW"] || keys["ArrowUp"]) ? 1 : 0;
  const back    = (keys["KeyS"] || keys["ArrowDown"]) ? 1 : 0;
  const left    = (keys["KeyA"] || keys["ArrowLeft"]) ? 1 : 0;
  const right   = (keys["KeyD"] || keys["ArrowRight"]) ? 1 : 0;

  dir.set(
    (right - left),
    0,
    (back - forward)
  );

  if (dir.lengthSq() > 0) dir.normalize();

  const speed = SETTINGS.baseSpeed * (keys["ShiftLeft"] || keys["ShiftRight"] ? SETTINGS.sprintFactor : 1);

  // Bewegungsrichtung relativ zur Blickrichtung (Yaw)
  const yaw = yawObject.rotation.y;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const moveX = dir.x * cos - dir.z * sin;
  const moveZ = dir.x * sin + dir.z * cos;

  vel.x += moveX * speed * dt;
  vel.z += moveZ * speed * dt;

  yawObject.position.x += vel.x * dt;
  yawObject.position.y += vel.y * dt;
  yawObject.position.z += vel.z * dt;

  // simple room bounds (damit man nicht „durch die Wand“ fliegt)
  const { width: W, depth: D } = SETTINGS.room;
  const margin = 0.35;

  yawObject.position.x = clamp(yawObject.position.x, -W / 2 + margin, W / 2 - margin);
  yawObject.position.z = clamp(yawObject.position.z, -D / 2 + margin, D / 2 - margin);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
