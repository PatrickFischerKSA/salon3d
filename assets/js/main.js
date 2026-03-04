// Klassische Three.js-Variante (kein import)
// Erwartet: THREE global + THREE.PointerLockControls global

const ASSET = {
  wall1: "./assets/img/salon1.jpg",
  wall2: "./assets/img/salon2.jpg",
};

let scene, camera, renderer, controls;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Testwürfel (MUSS sichtbar sein)
  const test = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshNormalMaterial()
  );
  test.position.set(0, 1.6, 0);
  scene.add(test);

  // Licht (für Texturen/Room nicht zwingend nötig)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

  // Controls
  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if (btn) btn.onclick = () => controls.lock();

  // Raum mit Texturen
  const loader = new THREE.TextureLoader();

  loader.load(ASSET.wall1, (t1) => {
    loader.load(ASSET.wall2, (t2) => {
      createRoom(t1, t2);
    }, undefined, () => createFallbackRoom());
  }, undefined, () => createFallbackRoom());

  window.addEventListener("resize", onResize);
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
}

function createFallbackRoom() {
  const geometry = new THREE.BoxGeometry(14, 4, 10);
  const material = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.BackSide });
  const room = new THREE.Mesh(geometry, material);
  room.position.y = 2;
  scene.add(room);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
