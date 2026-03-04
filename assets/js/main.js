// Salon3D (klassisch, ohne ES-Module)
// Voraussetzungen: index.html lädt in dieser Reihenfolge:
// 1) assets/vendor/three.min.js
// 2) assets/vendor/PointerLockControls.js
// 3) assets/js/main.js

let scene, camera, renderer, controls;
let room;

const clock = new THREE.Clock();

// Bewegung
const keys = { w:false, a:false, s:false, d:false, up:false, left:false, down:false, right:false, shift:false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const SPEED = 4.0;        // m/s
const SPEED_FAST = 7.5;   // mit Shift
const DAMPING = 8.0;      // wie schnell abgebremst wird

// Raum-Parameter
const ROOM_W = 14;
const ROOM_H = 4;
const ROOM_D = 10;

// Texturen (deine Bilder liegen hier)
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

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new THREE.PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if(btn){
    btn.onclick = () => controls.lock();
  }

  // Licht (für Atmosphäre; Box-Wände sind MeshBasicMaterial)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.25));

  // Boden (damit man ein Gefühl für “stehen” hat)
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  // Raum bauen (mit Texturen)
  loadRoomTextures();

  // Input
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);

}

function loadRoomTextures(){

  const loader = new THREE.TextureLoader();

  loader.load(
    ASSET.wall1,
    (t1) => {

      // bessere Schärfe
      t1.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      t1.colorSpace = THREE.SRGBColorSpace ? THREE.SRGBColorSpace : undefined;

      loader.load(
        ASSET.wall2,
        (t2) => {

          t2.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          t2.colorSpace = THREE.SRGBColorSpace ? THREE.SRGBColorSpace : undefined;

          createRoom(t1, t2);

        },
        undefined,
        () => createFallbackRoom()
      );
    },
    undefined,
    () => createFallbackRoom()
  );
}

function createRoom(t1, t2){

  // Innenraum: Box, von innen sichtbar
  const geo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);

  // Mapping: [right, left, top, bottom, front, back]
  // Wir mischen die beiden Perspektiven (du kannst das später feinjustieren)
  const mats = [
    new THREE.MeshBasicMaterial({ map: t2 }), // right
    new THREE.MeshBasicMaterial({ map: t2 }), // left
    new THREE.MeshBasicMaterial({ color: 0xeeeeee }), // top (Decke neutral)
    new THREE.MeshBasicMaterial({ color: 0x222222 }), // bottom (Boden neutral – wir haben extra Bodenplane)
    new THREE.MeshBasicMaterial({ map: t1 }), // front
    new THREE.MeshBasicMaterial({ map: t1 }), // back
  ];

  mats.forEach(m => m.side = THREE.BackSide);

  room = new THREE.Mesh(geo, mats);
  room.position.set(0, ROOM_H/2, 0);
  scene.add(room);

  // Startposition “im Raum”
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

function onKeyDown(e){
  switch(e.code){
    case "KeyW": keys.w = true; break;
    case "KeyA": keys.a = true; break;
    case "KeyS": keys.s = true; break;
    case "KeyD": keys.d = true; break;
    case "ArrowUp": keys.up = true; break;
    case "ArrowLeft": keys.left = true; break;
    case "ArrowDown": keys.down = true; break;
    case "ArrowRight": keys.right = true; break;
    case "ShiftLeft":
    case "ShiftRight": keys.shift = true; break;

    // Reset
    case "KeyR":
      controls.getObject().position.set(0, 1.6, 2.5);
      velocity.set(0,0,0);
      break;
  }
}

function onKeyUp(e){
  switch(e.code){
    case "KeyW": keys.w = false; break;
    case "KeyA": keys.a = false; break;
    case "KeyS": keys.s = false; break;
    case "KeyD": keys.d = false; break;
    case "ArrowUp": keys.up = false; break;
    case "ArrowLeft": keys.left = false; break;
    case "ArrowDown": keys.down = false; break;
    case "ArrowRight": keys.right = false; break;
    case "ShiftLeft":
    case "ShiftRight": keys.shift = false; break;
  }
}

function updateMovement(dt){

  // sanft abbremsen
  velocity.x -= velocity.x * DAMPING * dt;
  velocity.z -= velocity.z * DAMPING * dt;

  direction.z = Number(keys.w || keys.up) - Number(keys.s || keys.down);
  direction.x = Number(keys.d || keys.right) - Number(keys.a || keys.left);
  direction.normalize();

  const speed = keys.shift ? SPEED_FAST : SPEED;

  if(direction.lengthSq() > 0){
    velocity.z -= direction.z * speed * dt * 6;
    velocity.x -= direction.x * speed * dt * 6;
  }

  controls.moveRight(-velocity.x * dt);
  controls.moveForward(-velocity.z * dt);

  // "Bodenhöhe" festhalten
  controls.getObject().position.y = 1.6;

  // einfache Begrenzung: im Raum bleiben
  clampToRoom();
}

function clampToRoom(){
  const p = controls.getObject().position;

  const halfW = ROOM_W/2 - 0.6;
  const halfD = ROOM_D/2 - 0.6;

  p.x = Math.max(-halfW, Math.min(halfW, p.x));
  p.z = Math.max(-halfD, Math.min(halfD, p.z));
}

function animate(){
  requestAnimationFrame(animate);

  const dt = Math.min(0.05, clock.getDelta());

  if(controls.isLocked){
    updateMovement(dt);
  }

  renderer.render(scene, camera);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
