// assets/js/main.js
import * as THREE from "../vendor/three.module.js";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

// ---------- Pfade (müssen bei dir existieren) ----------
const TEX_1 = "../img/salon1.jpg";
const TEX_2 = "../img/salon2.jpg";

// ---------- Szene / Kamera / Renderer ----------
let scene, camera, renderer, controls;
let room;

const keys = { w:false, a:false, s:false, d:false, up:false, down:false, left:false, right:false, shift:false, space:false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

init();
animate();

function init() {
  console.log("Salon3D init…");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // drei r160+: outputColorSpace statt outputEncoding
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  document.body.appendChild(renderer.domElement);

  // ---------- Controls ----------
  controls = new PointerLockControls(THREE, camera, renderer.domElement);
  scene.add(controls.getObject());
  controls.getObject().position.set(0, 1.6, 6);

  const btn = document.getElementById("enterBtn");
  if (btn) btn.addEventListener("click", () => controls.lock());

  // ---------- Licht ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  // ---------- Raum (immer sichtbar, auch ohne Texturen) ----------
  buildRoom();

  // ---------- Events ----------
  window.addEventListener("resize", onResize);

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;

    if (e.code === "ArrowUp") keys.up = true;
    if (e.code === "ArrowLeft") keys.left = true;
    if (e.code === "ArrowDown") keys.down = true;
    if (e.code === "ArrowRight") keys.right = true;

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = true;
    if (e.code === "Space") keys.space = true;

    if (e.code === "KeyR") resetPosition();
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyA") keys.a = false;
    if (e.code === "KeyS") keys.s = false;
    if (e.code === "KeyD") keys.d = false;

    if (e.code === "ArrowUp") keys.up = false;
    if (e.code === "ArrowLeft") keys.left = false;
    if (e.code === "ArrowDown") keys.down = false;
    if (e.code === "ArrowRight") keys.right = false;

    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = false;
    if (e.code === "Space") keys.space = false;
  });
}

function buildRoom() {
  // Grösse des Raums
  const width = 18;
  const height = 7;
  const depth = 18;

  // Fallback-Materialien (damit du IMMER etwas siehst)
  const wallFallback = new THREE.MeshStandardMaterial({ color: 0x6f6f6f, side: THREE.BackSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, side: THREE.BackSide });
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, side: THREE.BackSide });

  // 6 Materialien für BoxGeometry: +x, -x, +y, -y, +z, -z
  const mats = [
    wallFallback.clone(), // right
    wallFallback.clone(), // left
    ceilMat,              // top
    floorMat,             // bottom
    wallFallback.clone(), // front
    wallFallback.clone()  // back
  ];

  const geo = new THREE.BoxGeometry(width, height, depth);
  room = new THREE.Mesh(geo, mats);
  room.position.set(0, height/2, 0);
  scene.add(room);

  // Jetzt Texturen laden (wenn es klappt, werden sie gesetzt)
  const loader = new THREE.TextureLoader();

  loader.load(
    TEX_1,
    (tex) => {
      applyAsWallTexture(tex);
      // z.B. rechts/links
      room.material[0].map = tex; room.material[0].needsUpdate = true;
      room.material[1].map = tex; room.material[1].needsUpdate = true;
      console.log("Texture 1 ok:", TEX_1);
    },
    undefined,
    (err) => console.warn("Texture 1 FAIL:", TEX_1, err)
  );

  loader.load(
    TEX_2,
    (tex) => {
      applyAsWallTexture(tex);
      // z.B. vorne/hinten
      room.material[4].map = tex; room.material[4].needsUpdate = true;
      room.material[5].map = tex; room.material[5].needsUpdate = true;
      console.log("Texture 2 ok:", TEX_2);
    },
    undefined,
    (err) => console.warn("Texture 2 FAIL:", TEX_2, err)
  );
}

function applyAsWallTexture(tex) {
  // drei r160+: colorSpace setzen
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
}

function resetPosition() {
  controls.getObject().position.set(0, 1.6, 6);
  velocity.set(0, 0, 0);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // Bewegung nur wenn Pointer Lock aktiv
  if (controls.isLocked) {
    const delta = 0.016; // stabiler “fixed step”
    const speed = keys.shift ? 8.0 : 4.0;

    // Dämpfung
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.set(0, 0, 0);
    const forward = keys.w || keys.up;
    const back    = keys.s || keys.down;
    const left    = keys.a || keys.left;
    const right   = keys.d || keys.right;

    if (forward) direction.z -= 1;
    if (back)    direction.z += 1;
    if (left)    direction.x -= 1;
    if (right)   direction.x += 1;

    direction.normalize();

    if (direction.lengthSq() > 0) {
      velocity.x += direction.x * speed * delta;
      velocity.z += direction.z * speed * delta;
    }

    // Anwenden
    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);

    // “Hopser”
    if (keys.space) {
      controls.getObject().position.y = 1.75;
    } else {
      controls.getObject().position.y = 1.6;
    }
  }

  renderer.render(scene, camera);
}
