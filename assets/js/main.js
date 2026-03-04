import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const ASSET = {
  wall1: new URL("../img/salon1.jpg", import.meta.url).toString(),
  wall2: new URL("../img/salon2.jpg", import.meta.url).toString(),
};

let scene, camera, renderer, controls;

init();
animate();

function init(){

  console.log("Salon3D startet...");
  console.log("Texture 1:", ASSET.wall1);
  console.log("Texture 2:", ASSET.wall2);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  camera.position.set(0,1.6,4);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");

  if(btn){
    btn.onclick = () => {
      console.log("PointerLock aktiviert");
      controls.lock();
    };
  }

  const light = new THREE.HemisphereLight(0xffffff,0x444444,1.2);
  scene.add(light);

  const loader = new THREE.TextureLoader();

  loader.load(

    ASSET.wall1,

    function(texture1){

      console.log("Texture 1 geladen");

      loader.load(

        ASSET.wall2,

        function(texture2){

          console.log("Texture 2 geladen");

          createRoom(texture1, texture2);

        },

        undefined,

        function(err){

          console.error("Fehler beim Laden von salon2.jpg");
          console.error(err);

          createFallbackRoom();

        }

      );

    },

    undefined,

    function(err){

      console.error("Fehler beim Laden von salon1.jpg");
      console.error(err);

      createFallbackRoom();

    }

  );

  window.addEventListener("resize", onResize);

}

function createRoom(t1, t2){

  const geometry = new THREE.BoxGeometry(14,4,10);

  const materials = [

    new THREE.MeshBasicMaterial({map:t1}),
    new THREE.MeshBasicMaterial({map:t1}),
    new THREE.MeshBasicMaterial({map:t2}),
    new THREE.MeshBasicMaterial({map:t2}),
    new THREE.MeshBasicMaterial({map:t1}),
    new THREE.MeshBasicMaterial({map:t2})

  ];

  materials.forEach(m => m.side = THREE.BackSide);

  const room = new THREE.Mesh(geometry, materials);
  room.position.y = 2;

  scene.add(room);

  console.log("Salon erstellt");

}

function createFallbackRoom(){

  console.warn("Fallback Raum wird erzeugt (keine Texturen)");

  const geometry = new THREE.BoxGeometry(14,4,10);

  const material = new THREE.MeshBasicMaterial({
    color:0x444444,
    side:THREE.BackSide
  });

  const room = new THREE.Mesh(geometry, material);
  room.position.y = 2;

  scene.add(room);

}

function onResize(){

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate(){

  requestAnimationFrame(animate);

  renderer.render(scene,camera);

}
