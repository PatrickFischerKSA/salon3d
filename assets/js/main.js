let scene, camera, renderer, controls, room;

const clock = new THREE.Clock();

// Bewegung
const keys = {};
let velX = 0;
let velZ = 0;

const SPEED = 4.0;
const SPEED_FAST = 7.5;
const DAMPING = 10.0;

// Raum
const ROOM_W = 14;
const ROOM_H = 4;
const ROOM_D = 10;

const ASSET = {
  wall1: "./assets/img/salon1.jpg",
  wall2: "./assets/img/salon2.jpg",
};

init();
animate();

function init(){

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 3.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if(btn){
    btn.onclick = () => controls.lock();
  }

  // Licht
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

  // Boden (einfach)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Debug-Würfel (bleibt drin, damit wir IMMER sehen ob es läuft)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshNormalMaterial()
  );
  cube.position.set(0, 1.6, 2.0);
  scene.add(cube);

  // Raum laden
  loadRoom();

  // Input
  window.addEventListener("keydown", (e)=>keys[e.code]=true);
  window.addEventListener("keyup", (e)=>keys[e.code]=false);
  window.addEventListener("resize", onResize);

}

function loadRoom(){

  const loader = new THREE.TextureLoader();

  loader.load(
    ASSET.wall1,
    (t1) => {
      loader.load(
        ASSET.wall2,
        (t2) => createRoom(t1, t2),
        undefined,
        () => createFallbackRoom()
      );
    },
    undefined,
    () => createFallbackRoom()
  );
}

function createRoom(t1, t2){

  const geo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);

  // [right, left, top, bottom, front, back]
  const mats = [
    new THREE.MeshBasicMaterial({ map: t2 }),
    new THREE.MeshBasicMaterial({ map: t2 }),
    new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }),
    new THREE.MeshBasicMaterial({ color: 0x222222 }),
    new THREE.MeshBasicMaterial({ map: t1 }),
    new THREE.MeshBasicMaterial({ map: t1 }),
  ];

  for(const m of mats){
    m.side = THREE.BackSide;
  }

  room = new THREE.Mesh(geo, mats);
  room.position.set(0, ROOM_H/2, 0);
  scene.add(room);

  controls.getObject().position.set(0, 1.6, 2.5);
}

function createFallbackRoom(){

  const geo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);
  const mat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.BackSide });

  room = new THREE.Mesh(geo, mat);
  room.position.set(0, ROOM_H/2, 0);
  scene.add(room);

  controls.getObject().position.set(0, 1.6, 2.5);
}

function updateMovement(dt){

  // Abbremsen
  velX -= velX * DAMPING * dt;
  velZ -= velZ * DAMPING * dt;

  const forward = (keys["KeyW"] || keys["ArrowUp"]) ? 1 : 0;
  const back    = (keys["KeyS"] || keys["ArrowDown"]) ? 1 : 0;
  const right   = (keys["KeyD"] || keys["ArrowRight"]) ? 1 : 0;
  const left    = (keys["KeyA"] || keys["ArrowLeft"]) ? 1 : 0;

  const speed = (keys["ShiftLeft"] || keys["ShiftRight"]) ? SPEED_FAST : SPEED;

  const dirZ = forward - back;
  const dirX = right - left;

  if(dirZ !== 0) velZ -= dirZ * speed * dt * 6;
  if(dirX !== 0) velX -= dirX * speed * dt * 6;

  controls.moveRight(-velX * dt);
  controls.moveForward(-velZ * dt);

  // Höhe fix
  controls.getObject().position.y = 1.6;

  clampToRoom();

  // Reset
  if(keys["KeyR"]){
    controls.getObject().position.set(0, 1.6, 2.5);
    velX = 0; velZ = 0;
    keys["KeyR"] = false;
  }
}

function clampToRoom(){
  const p = controls.getObject().position;
  const halfW = ROOM_W/2 - 0.6;
  const halfD = ROOM_D/2 - 0.6;

  if(p.x > halfW) p.x = halfW;
  if(p.x < -halfW) p.x = -halfW;
  if(p.z > halfD) p.z = halfD;
  if(p.z < -halfD) p.z = -halfD;
}

function animate(){
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, clock.getDelta());

  if(controls && controls.isLocked){
    updateMovement(dt);
  }

  renderer.render(scene, camera);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
