import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const status = document.getElementById("status");

status.textContent = "Main geladen";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
60,
window.innerWidth / window.innerHeight,
0.1,
100
);

camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

status.textContent = "Renderer OK";

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(2,2,2);
scene.add(light);

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshStandardMaterial({color:0xaaaaaa});

const cube = new THREE.Mesh(geometry,material);
scene.add(cube);

function animate(){

requestAnimationFrame(animate);

cube.rotation.x += 0.01;
cube.rotation.y += 0.01;

renderer.render(scene,camera);

}

animate();

status.textContent = "Animation läuft";

window.addEventListener("resize",()=>{

camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth,window.innerHeight);

});
