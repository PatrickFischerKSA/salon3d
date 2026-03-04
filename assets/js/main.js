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
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight,0.1,200);
  camera.position.set(0,1.6,4);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  document.getElementById("enterBtn").onclick=()=>controls.lock();

  const light = new THREE.HemisphereLight(0xffffff,0x444444,1.2);
  scene.add(light);

  const loader = new THREE.TextureLoader();

  loader.load(ASSET.wall1,(t1)=>{
    loader.load(ASSET.wall2,(t2)=>{

      const geo = new THREE.BoxGeometry(14,4,10);

      const mats=[
        new THREE.MeshBasicMaterial({map:t1}),
        new THREE.MeshBasicMaterial({map:t1}),
        new THREE.MeshBasicMaterial({map:t2}),
        new THREE.MeshBasicMaterial({map:t2}),
        new THREE.MeshBasicMaterial({map:t1}),
        new THREE.MeshBasicMaterial({map:t2})
      ];

      mats.forEach(m=>m.side=THREE.BackSide);

      const room = new THREE.Mesh(geo,mats);
      room.position.y=2;
      scene.add(room);

    });
  });

  window.addEventListener("resize",()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });
}

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene,camera);
}
