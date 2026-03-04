import * as THREE from "../vendor/three.module.js";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

let scene, camera, renderer, controls;

init();
animate();

function init(){

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.6, 5);

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());

  const btn = document.getElementById("enterBtn");
  if(btn){
    btn.onclick = () => controls.lock();
  }

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

  // Testwürfel (muss sichtbar sein)
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(2,2,2),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  );
  scene.add(cube);

  window.addEventListener("resize", onResize);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
