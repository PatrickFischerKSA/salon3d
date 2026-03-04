import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const ASSET = {
  wall1: new URL("../img/salon1.jpg", import.meta.url).toString(),
  wall2: new URL("../img/salon2.jpg", import.meta.url).toString(),
};

let scene, camera, renderer, controls;

boot();

function boot() {
  uiLog("Boot…");
  uiLog("wall1: " + ASSET.wall1);
  uiLog("wall2: " + ASSET.wall2);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4);

  // Renderer: hier knallt es, wenn WebGL/HW-Accel aus ist
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    uiLog("❌ Renderer creation failed (WebGL?)");
    console.error(e);
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Test-Objekt: MUSS sofort sichtbar sein
  const test = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshNormalMaterial()
  );
  test.position.set(0, 1.6, 0);
  scene.add(test);
  uiLog("✅ Testwürfel erstellt (wenn du den NICHT siehst -> WebGL/Rendering)");

  // Licht (für später; Testwürfel braucht es nicht)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

  // Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) btn.onclick = () => controls.lock();

  // Texturen laden + Raum erstellen
  const loader = new THREE.TextureLoader();

  loader.load(
    ASSET.wall1,
    (t1) => {
      uiLog("✅ salon1.jpg geladen");
      loader.load(
        ASSET.wall2,
        (t2) => {
          uiLog("✅ salon2.jpg geladen");
          createRoom(t1, t2);
        },
        undefined,
        (err) => {
          uiLog("❌ Fehler salon2.jpg (siehe Konsole)");
          console.error(err);
          createFallbackRoom();
        }
      );
    },
    undefined,
    (err) => {
      uiLog("❌ Fehler salon1.jpg (siehe Konsole)");
      console.error(err);
      createFallbackRoom();
    }
  );

  window.addEventListener("resize", onResize);

  animate(test);
}

function createRoom(t1, t2) {
  const geometry = new THREE.BoxGeometry(14, 4, 10);

  const materials = [
    new THREE.MeshBasicMaterial({ map: t1 }),
    new THREE.MeshBasicMaterial({ map: t1 }),
    new THREE.MeshBasicMaterial({ map: t2 }),
    new THREE.MeshBasicMaterial({ map: t2 }),
    new THREE.MeshBasicMaterial({ map: t1 }),
    new THREE.MeshBasicMaterial({ map: t2 }),
  ];
  materials.forEach((m) => (m.side = THREE.BackSide));

  const room = new THREE.Mesh(geometry, materials);
  room.position.y = 2;
  scene.add(room);

  uiLog("✅ Raum erstellt");
}

function createFallbackRoom() {
  const geometry = new THREE.BoxGeometry(14, 4, 10);
  const material = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.BackSide });
  const room = new THREE.Mesh(geometry, material);
  room.position.y = 2;
  scene.add(room);
  uiLog("⚠️ Fallback-Raum (ohne Texturen) erstellt");
}

function animate(testMesh) {
  requestAnimationFrame(() => animate(testMesh));
  // Testwürfel drehen: wenn du ihn siehst, siehst du auch Bewegung
  if (testMesh) testMesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* --- Mini HUD Debug --- */
function uiLog(msg) {
  console.log(msg);
  let box = document.getElementById("debugBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "debugBox";
    box.style.position = "absolute";
    box.style.right = "14px";
    box.style.top = "14px";
    box.style.zIndex = "9999";
    box.style.maxWidth = "420px";
    box.style.background = "rgba(0,0,0,0.75)";
    box.style.color = "white";
    box.style.padding = "10px 12px";
    box.style.borderRadius = "12px";
    box.style.font = "12px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial";
    box.style.whiteSpace = "pre-wrap";
    document.body.appendChild(box);
  }
  box.textContent += msg + "\\n";
}
