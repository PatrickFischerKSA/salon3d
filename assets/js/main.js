import * as THREE from "../vendor/three.module.js";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

let camera;
let scene;
let renderer;
let controls;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const clock = new THREE.Clock();

// Raumparameter
const ROOM_SIZE = 24;     // Breite/Tiefe
const ROOM_HEIGHT = 8;    // Höhe
const WALL_Y = ROOM_HEIGHT / 2;

// Texturen
const TEX_WALL_A = "../img/salon1.jpg";
const TEX_WALL_B = "../img/salon2.jpg";

init();
animate();

function init() {

  // Kamera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 1.7, 0);

  // Szene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101010);

  // Licht
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(10, 12, 6);
  scene.add(dir);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) {
    btn.addEventListener("click", () => controls.lock());
  }

  // Raum bauen
  buildRoomWithTextures();

  // Input
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  window.addEventListener("resize", onWindowResize);
}

function buildRoomWithTextures() {

  const loader = new THREE.TextureLoader();

  const wallTexA = loader.load(TEX_WALL_A);
  const wallTexB = loader.load(TEX_WALL_B);

  // Wichtig für „Foto-Wand“: nicht zu dunkel, keine starke Spiegelung
  wallTexA.colorSpace = THREE.SRGBColorSpace;
  wallTexB.colorSpace = THREE.SRGBColorSpace;

  wallTexA.wrapS = THREE.ClampToEdgeWrapping;
  wallTexA.wrapT = THREE.ClampToEdgeWrapping;
  wallTexB.wrapS = THREE.ClampToEdgeWrapping;
  wallTexB.wrapT = THREE.ClampToEdgeWrapping;

  // Boden
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x7a5a35,
    roughness: 0.95,
    metalness: 0.0
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    floorMat
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Decke
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 1.0,
    metalness: 0.0
  });

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    ceilMat
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);

  // Wand-Materialien
  const wallMatA = new THREE.MeshStandardMaterial({
    map: wallTexA,
    roughness: 1.0,
    metalness: 0.0
  });

  const wallMatB = new THREE.MeshStandardMaterial({
    map: wallTexB,
    roughness: 1.0,
    metalness: 0.0
  });

  const wallNeutral = new THREE.MeshStandardMaterial({
    color: 0xe8e1d6,
    roughness: 1.0,
    metalness: 0.0
  });

  // Geometrie
  const wallW = ROOM_SIZE;
  const wallH = ROOM_HEIGHT;
  const wallGeo = new THREE.PlaneGeometry(wallW, wallH);

  const half = ROOM_SIZE / 2;

  // Z+ Wand (Front)
  const wallFront = new THREE.Mesh(wallGeo, wallMatA);
  wallFront.position.set(0, WALL_Y, -half);
  // Plane zeigt standardmässig nach +Z, wir wollen nach innen schauen => drehen
  wallFront.rotation.y = 0;
  scene.add(wallFront);

  // Z- Wand (Back)
  const wallBack = new THREE.Mesh(wallGeo, wallMatA);
  wallBack.position.set(0, WALL_Y, +half);
  wallBack.rotation.y = Math.PI;
  scene.add(wallBack);

  // X- Wand (Left)
  const wallLeft = new THREE.Mesh(wallGeo, wallMatB);
  wallLeft.position.set(-half, WALL_Y, 0);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  // X+ Wand (Right)
  const wallRight = new THREE.Mesh(wallGeo, wallMatB);
  wallRight.position.set(+half, WALL_Y, 0);
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // (Optional) Sockelleiste als dezenter Streifen
  const baseH = 1.0;
  const baseGeo = new THREE.PlaneGeometry(wallW, baseH);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xd9d2c8,
    roughness: 1.0,
    metalness: 0.0
  });

  const baseFront = new THREE.Mesh(baseGeo, baseMat);
  baseFront.position.set(0, baseH/2, -half + 0.01);
  scene.add(baseFront);

  const baseBack = new THREE.Mesh(baseGeo, baseMat);
  baseBack.position.set(0, baseH/2, +half - 0.01);
  baseBack.rotation.y = Math.PI;
  scene.add(baseBack);

  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-half + 0.01, baseH/2, 0);
  baseLeft.rotation.y = Math.PI / 2;
  scene.add(baseLeft);

  const baseRight = new THREE.Mesh(baseGeo, baseMat);
  baseRight.position.set(+half - 0.01, baseH/2, 0);
  baseRight.rotation.y = -Math.PI / 2;
  scene.add(baseRight);

}

function onKeyDown(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {

  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Dämpfung
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  const speed = 10.0;

  if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Simple “Wände nicht durchlaufen” (sehr grob)
  const p = controls.getObject().position;
  const half = ROOM_SIZE / 2 - 1.0; // Sicherheitsrand
  p.x = Math.max(-half, Math.min(half, p.x));
  p.z = Math.max(-half, Math.min(half, p.z));
  p.y = 1.7; // fix auf Augenhöhe (kein Springen in dieser Version)

  renderer.render(scene, camera);

}
