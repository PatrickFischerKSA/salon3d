import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

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

camera.position.z = 5;

renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const btn = document.getElementById("enterBtn");
if(btn){
btn.onclick = () => controls.lock();
}


const light = new THREE.HemisphereLight(0xffffff,0x444444,1.5);
scene.add(light);


const geometry = new THREE.BoxGeometry(2,2,2);

const material = new THREE.MeshStandardMaterial({
color:0xcccccc
});

const cube = new THREE.Mesh(geometry,material);

scene.add(cube);


window.addEventListener("resize",onResize);

}

function onResize(){

camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth,window.innerHeight);

}


function animate(){

requestAnimationFrame(animate);

renderer.render(scene,camera);

}
