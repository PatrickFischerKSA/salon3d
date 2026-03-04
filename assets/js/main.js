// assets/js/main.js
// Fixes:
// - Back wall black: all room materials set to DoubleSide (no backface culling issues)
// - Strong "Verzerrung": lower FOV + texture "cover" mapping (crop instead of stretch)
// - Floor "Teppich": procedural carpet CanvasTexture (repeated), no extra asset needed
// - Walls: salon1.jpg + salon2.jpg are applied with cover-fit to the wall plane aspect

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
  playerHeight: 1.65,
  baseSpeed: 2.6,
  sprintFactor: 2.0,
  hopStrength: 1.8,
  drag: 8.0,
  fov: 55, // weniger "Fish-eye"
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
    SETTINGS.fov,
    window.innerWidth / window.innerHeight,
    0.05,
    250
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // Minimal PointerLock Look (ohne extra Controls-Datei)
  yawObject = new THREE.Object3D();
  pitchObject = new THREE.Object3D();
  yawObject.add(pitchObject);
  pitchObject.add(camera);

  yawObject.position.set(0, SETTINGS.playerHeight, 4);
  scene.add(yawObject);

  // Licht (weicher, salon-tauglich)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1.15);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(6, 10, 4);
  scene.add(dirLight);

  const fill = new THREE.PointLight(0xffffff, 0.35, 60);
  fill.position.set(0, 3.2, 0);
  scene.add(fill);

  buildRoom();

  setupInput();

  UI.btn.addEventListener("click", () => {
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    UI.status.textContent = isLocked ? "Pointer Lock aktiv." : "Pointer Lock aus.";
  });

  window.addEventListener("resize", onResize);
}

function buildRoom() {
  const { width: W, height: H, depth: D } = SETTINGS.room;

  // URLs relativ zu dieser Datei
  const wall1Url = new URL("../img/salon1.jpg", import.meta.url).href;
  const wall2Url = new URL("../img/salon2.jpg", import.meta.url).href;

  // Materials (DoubleSide: verhindert "schwarze" Wände wegen Backface Culling)
  const matWallA = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const matWallB = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // Teppich (procedural CanvasTexture)
  const carpetTex = makeCarpetTexture(1024, 1024);
  carpetTex.colorSpace = THREE.SRGBColorSpace;
  carpetTex.wrapS = THREE.RepeatWrapping;
  carpetTex.wrapT = THREE.RepeatWrapping;
  carpetTex.repeat.set(3.2, 4.2);
  carpetTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const matFloor = new THREE.MeshStandardMaterial({
    map: carpetTex,
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const matCeil = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // Geometries
  const wallGeoZ = new THREE.PlaneGeometry(W, H);
  const wallGeoX = new THREE.PlaneGeometry(D, H);
  const floorGeo = new THREE.PlaneGeometry(W, D);

  // BACK wall (z = -D/2) faces inward (+Z)
  const backWall = new THREE.Mesh(wallGeoZ, matWallA);
  backWall.position.set(0, H / 2, -D / 2);
  // default plane faces +Z, at back wall we want +Z -> ok
  scene.add(backWall);

  // FRONT wall (z = +D/2) faces inward (-Z)
  const frontWall = new THREE.Mesh(wallGeoZ, matWallB);
  frontWall.position.set(0, H / 2, D / 2);
  frontWall.rotateY(Math.PI); // face -Z
  scene.add(frontWall);

  // RIGHT wall (x = +W/2) faces inward (-X)
  const rightWall = new THREE.Mesh(wallGeoX, matWallA);
  rightWall.position.set(W / 2, H / 2, 0);
  rightWall.rotateY(Math.PI / 2); // face -X
  scene.add(rightWall);

  // LEFT wall (x = -W/2) faces inward (+X)
  const leftWall = new THREE.Mesh(wallGeoX, matWallB);
  leftWall.position.set(-W / 2, H / 2, 0);
  leftWall.rotateY(-Math.PI / 2); // face +X
  scene.add(leftWall);

  // FLOOR
  const floor = new THREE.Mesh(floorGeo, matFloor);
  floor.position.set(0, 0, 0);
  floor.rotateX(-Math.PI / 2);
  scene.add(floor);

  // CEILING
  const ceil = new THREE.Mesh(floorGeo, matCeil);
  ceil.position.set(0, H, 0);
  ceil.rotateX(Math.PI / 2);
  scene.add(ceil);

  // Texture loading + "cover-fit" mapping (keine Verzerrung)
  const loader = new THREE.TextureLoader();
  UI.status.textContent = "Lade Texturen…";

  let loaded = 0;
  const total = 2;

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
      preparePhotoTexture(tex);
      fitTextureCoverToPlane(tex, W, H); // für Z-Wand (W x H)
      matWallA.map = tex;
      matWallA.needsUpdate = true;
      onOneLoaded();
    },
    undefined,
    onErr("salon1.jpg")
  );

  loader.load(
    wall2Url,
    (tex) => {
      preparePhotoTexture(tex);
      fitTextureCoverToPlane(tex, D, H); // für X-Wand (D x H) -> gleiche Map, wir cover-fit danach nochmals unten
      // Achtung: matWallB wird auf zwei Wänden genutzt (Front + Left) die unterschiedliche Plane-Aspekte haben.
      // Lösung: Wir duplizieren die Textur für die zweite Verwendung, damit jede Wand korrekt "cover" bekommt.
      const texFront = tex;
      const texLeft = tex.clone();
      texLeft.needsUpdate = true;

      // FRONT wall: W x H
      fitTextureCoverToPlane(texFront, W, H);

      // LEFT wall: D x H
      fitTextureCoverToPlane(texLeft, D, H);

      // matWallB ist shared; darum erstellen wir zwei Materialien, damit keine gegenseitige Überschreibung passiert.
      // (sonst wirkt es "verzogen" je nach Wand)
      const matWallFront = matWallB.clone();
      matWallFront.side = THREE.DoubleSide;
      matWallFront.map = texFront;
      matWallFront.needsUpdate = true;

      const matWallLeft = matWallB.clone();
      matWallLeft.side = THREE.DoubleSide;
      matWallLeft.map = texLeft;
      matWallLeft.needsUpdate = true;

      // Wände finden und Material ersetzen (frontWall + leftWall)
      // Wir suchen per Geometrie + Position (robust genug für dieses Projekt).
      for (const obj of scene.children) {
        if (!(obj && obj.isMesh)) continue;

        // frontWall: z ~ +D/2 (PlaneGeometry W x H)
        if (Math.abs(obj.position.z - D / 2) < 0.001 && Math.abs(obj.position.y - H / 2) < 0.001) {
          obj.material = matWallFront;
        }

        // leftWall: x ~ -W/2 (PlaneGeometry D x H)
        if (Math.abs(obj.position.x + W / 2) < 0.001 && Math.abs(obj.position.y - H / 2) < 0.001) {
          obj.material = matWallLeft;
        }
      }

      onOneLoaded();
    },
    undefined,
    onErr("salon2.jpg")
  );

  // Für matWallA nutzen wir salon1 auf back + right.
  // BackWall ist W x H, RightWall ist D x H -> auch hier: Material-Splitting für perfekte Cover-Fits.
  // Sobald salon1 geladen ist, haben wir nur ein Material; wir splitten nachträglich in animate() nicht.
  // Stattdessen: nach kurzem Timeout prüfen wir, ob matWallA.map existiert und splitten sauber.
  const splitA = () => {
    if (!matWallA.map || !matWallA.map.image) return;

    const texBack = matWallA.map;
    const texRight = texBack.clone();
    texRight.needsUpdate = true;

    // back: W x H
    fitTextureCoverToPlane(texBack, W, H);
    // right: D x H
    fitTextureCoverToPlane(texRight, D, H);

    const matBack = matWallA.clone();
    matBack.side = THREE.DoubleSide;
    matBack.map = texBack;
    matBack.needsUpdate = true;

    const matRight = matWallA.clone();
    matRight.side = THREE.DoubleSide;
    matRight.map = texRight;
    matRight.needsUpdate = true;

    for (const obj of scene.children) {
      if (!(obj && obj.isMesh)) continue;

      // back: z ~ -D/2
      if (Math.abs(obj.position.z + D / 2) < 0.001 && Math.abs(obj.position.y - H / 2) < 0.001) {
        obj.material = matBack;
      }

      // right: x ~ +W/2
      if (Math.abs(obj.position.x - W / 2) < 0.001 && Math.abs(obj.position.y - H / 2) < 0.001) {
        obj.material = matRight;
      }
    }
  };

  // split sobald salon1 da ist (ein paar ms später ist sicher geladen/gesetzt)
  setTimeout(splitA, 250);
  setTimeout(splitA, 600);
}

function preparePhotoTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.center.set(0.5, 0.5);
}

// Cover-fit: crop statt stretch.
// Plane: planeW x planeH (in "Meter"), Texture: tex.image (Pixel)
function fitTextureCoverToPlane(tex, planeW, planeH) {
  if (!tex.image || !tex.image.width || !tex.image.height) return;

  const imgW = tex.image.width;
  const imgH = tex.image.height;

  const planeAspect = planeW / planeH;
  const imgAspect = imgW / imgH;

  // Reset
  tex.rotation = 0;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);

  // Wenn Bild "breiter" als die Wand -> Seiten beschneiden (repeat.x < 1)
  if (imgAspect > planeAspect) {
    const repeatX = planeAspect / imgAspect; // < 1
    tex.repeat.set(repeatX, 1);
    tex.offset.set((1 - repeatX) / 2, 0);
  } else {
    // Bild "höher" -> oben/unten beschneiden (repeat.y < 1)
    const repeatY = imgAspect / planeAspect; // < 1
    tex.repeat.set(1, repeatY);
    tex.offset.set(0, (1 - repeatY) / 2);
  }

  tex.needsUpdate = true;
}

function makeCarpetTexture(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");

  // Grundton (teppich-rot)
  g.fillStyle = "#6b1f1f";
  g.fillRect(0, 0, w, h);

  // weiche Vignette / Fasern
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = 0.05 + Math.random() * 0.06;
    const r = 0.6 + Math.random() * 1.6;
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Muster (Rauten)
  g.globalAlpha = 0.18;
  g.strokeStyle = "#f2e1c9";
  g.lineWidth = 5;

  const step = 160;
  for (let y = -step; y < h + step; y += step) {
    for (let x = -step; x < w + step; x += step) {
      drawDiamond(g, x + step / 2, y + step / 2, step * 0.38);
    }
  }

  // Rand-Ornament
  g.globalAlpha = 0.55;
  g.strokeStyle = "#d7c09a";
  g.lineWidth = 10;
  g.strokeRect(28, 28, w - 56, h - 56);

  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function drawDiamond(g, cx, cy, r) {
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.stroke();
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
      if (isLocked) vel.y = SETTINGS.hopStrength;
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isLocked) return;

    const sensitivity = 0.0022;
    yawObject.rotation.y -= e.movementX * sensitivity;
    pitchObject.rotation.x -= e.movementY * sensitivity;

    const minPitch = -Math.PI / 2 + 0.05;
    const maxPitch = Math.PI / 2 - 0.05;
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
  vel.x -= vel.x * SETTINGS.drag * dt;
  vel.z -= vel.z * SETTINGS.drag * dt;

  vel.y -= 9.81 * dt;
  if (yawObject.position.y <= SETTINGS.playerHeight) {
    yawObject.position.y = SETTINGS.playerHeight;
    vel.y = Math.max(0, vel.y);
  }

  if (!isLocked) {
    yawObject.position.addScaledVector(vel, dt * 0.2);
    return;
  }

  const forward = (keys["KeyW"] || keys["ArrowUp"]) ? 1 : 0;
  const back = (keys["KeyS"] || keys["ArrowDown"]) ? 1 : 0;
  const left = (keys["KeyA"] || keys["ArrowLeft"]) ? 1 : 0;
  const right = (keys["KeyD"] || keys["ArrowRight"]) ? 1 : 0;

  dir.set((right - left), 0, (back - forward));
  if (dir.lengthSq() > 0) dir.normalize();

  const speed = SETTINGS.baseSpeed * (keys["ShiftLeft"] || keys["ShiftRight"] ? SETTINGS.sprintFactor : 1);

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

  // bounds
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
