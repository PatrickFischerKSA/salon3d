import * as THREE from "../vendor/three.module.js";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

let camera, scene, renderer, controls;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

// Raumparameter
const ROOM_SIZE = 24;
const ROOM_HEIGHT = 8;

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

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // Licht (hell genug, damit Texturen sichtbar sind)
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(10, 12, 6);
  scene.add(dir);

  // Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) btn.addEventListener("click", () => controls.lock());

  // Raum + Texturen
  buildRoomWithTextures();

  // Input
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onWindowResize);
}

function buildRoomWithTextures() {
  const loader = new THREE.TextureLoader();

  // ✅ KORREKT: Pfade relativ zur main.js auflösen (GitHub Pages-sicher)
  const texUrlA = new URL("../img/salon1.jpg", import.meta.url).toString();
  const texUrlB = new URL("../img/salon2.jpg", import.meta.url).toString();

  const wallTexA = loader.load(texUrlA);
  const wallTexB = loader.load(texUrlB);

  wallTexA.colorSpace = THREE.SRGBColorSpace;
  wallTexB.colorSpace = THREE.SRGBColorSpace;

  // Boden
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x7a5a35, roughness: 0.95, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Decke
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1, metalness: 0 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);

  // Wandmaterialien
  const wallMatA = new THREE.MeshStandardMaterial({ map: wallTexA, roughness: 1, metalness: 0 });
  const wallMatB = new THREE.MeshStandardMaterial({ map: wallTexB, roughness: 1, metalness: 0 });

  const wallW = ROOM_SIZE;
  const wallH = ROOM_HEIGHT;
  const wallGeo = new THREE.PlaneGeometry(wallW, wallH);

  const half = ROOM_SIZE / 2;
  const wallY = ROOM_HEIGHT / 2;

  // Innenansicht sicherstellen: DoubleSide (damit nie „unsichtbar“)
  wallMatA.side = THREE.DoubleSide;
  wallMatB.side = THREE.DoubleSide;

  // Front (Z-)
  const wallFront = new THREE.Mesh(wallGeo, wallMatA);
  wallFront.position.set(0, wallY, -half);
  scene.add(wallFront);

  // Back (Z+)
  const wallBack = new THREE.Mesh(wallGeo, wallMatA);
  wallBack.position.set(0, wallY, +half);
  wallBack.rotation.y = Math.PI;
  scene.add(wallBack);

  // Left (X-)
  const wallLeft = new THREE.Mesh(wallGeo, wallMatB);
  wallLeft.position.set(-half, wallY, 0);
  wallLeft.rotation.y = Math.PI / 2;
  scene.add(wallLeft);

  // Right (X+)
  const wallRight = new THREE.Mesh(wallGeo, wallMatB);
  wallRight.position.set(+half, wallY, 0);
  wallRight.rotation.y = -Math.PI / 2;
  scene.add(wallRight);

  // Sockelleiste (optional, hilft optisch)
  const baseH = 1.0;
  const baseGeo = new THREE.PlaneGeometry(wallW, baseH);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c8, roughness: 1, metalness: 0, side: THREE.DoubleSide });

  const baseFront = new THREE.Mesh(baseGeo, baseMat);
  baseFront.position.set(0, baseH / 2, -half + 0.02);
  scene.add(baseFront);

  const baseBack = new THREE.Mesh(baseGeo, baseMat);
  baseBack.position.set(0, baseH / 2, +half - 0.02);
  baseBack.rotation.y = Math.PI;
  scene.add(baseBack);

  const baseLeft = new THREE.Mesh(baseGeo, baseMat);
  baseLeft.position.set(-half + 0.02, baseH / 2, 0);
  baseLeft.rotation.y = Math.PI / 2;
  scene.add(baseLeft);

  const baseRight = new THREE.Mesh(baseGeo, baseMat);
  baseRight.position.set(+half - 0.02, baseH / 2, 0);
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

  // grobe Begrenzung
  const p = controls.getObject().position;
  const half = ROOM_SIZE / 2 - 1.0;
  p.x = Math.max(-half, Math.min(half, p.x));
  p.z = Math.max(-half, Math.min(half, p.z));
  p.y = 1.7;

  renderer.render(scene, camera);
}
