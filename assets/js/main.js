import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const statusEl = document.getElementById("status");
const button = document.getElementById("enterBtn");

const setStatus = (t)=>{
if(statusEl) statusEl.textContent = t;
};

setStatus("Main geladen");


// Szene

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
60,
window.innerWidth/window.innerHeight,
0.1,
200
);

camera.position.set(0,1.6,7);


// Renderer

const renderer = new THREE.WebGLRenderer({antialias:true});

renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

setStatus("Renderer OK");


// Controls

const controls = new PointerLockControls(camera,document.body);

button.addEventListener("click",()=>{
controls.lock();
});

scene.add(controls.getObject());


// Bewegung

let moveForward=false;
let moveBackward=false;
let moveLeft=false;
let moveRight=false;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const speed = 6;


// Tastatur

document.addEventListener("keydown",(event)=>{

switch(event.code){

case "KeyW":
case "ArrowUp":
moveForward=true;
break;

case "KeyS":
case "ArrowDown":
moveBackward=true;
break;

case "KeyA":
case "ArrowLeft":
moveLeft=true;
break;

case "KeyD":
case "ArrowRight":
moveRight=true;
break;

}

});

document.addEventListener("keyup",(event)=>{

switch(event.code){

case "KeyW":
case "ArrowUp":
moveForward=false;
break;

case "KeyS":
case "ArrowDown":
moveBackward=false;
break;

case "KeyA":
case "ArrowLeft":
moveLeft=false;
break;

case "KeyD":
case "ArrowRight":
moveRight=false;
break;

}

});


// Licht

const ambient = new THREE.AmbientLight(0xffffff,0.7);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffffff,0.8);
light.position.set(3,6,4);
scene.add(light);


// Raum

const ROOM_W = 20;
const ROOM_D = 20;
const ROOM_H = 5;

const halfW = ROOM_W/2;
const halfD = ROOM_D/2;


// Boden

const floorGeo = new THREE.PlaneGeometry(ROOM_W,ROOM_D);
const floorMat = new THREE.MeshStandardMaterial({color:0x444444});

const floor = new THREE.Mesh(floorGeo,floorMat);

floor.rotation.x = -Math.PI/2;

scene.add(floor);


// Decke

const ceilingGeo = new THREE.PlaneGeometry(ROOM_W,ROOM_D);
const ceilingMat = new THREE.MeshStandardMaterial({color:0x666666});

const ceiling = new THREE.Mesh(ceilingGeo,ceilingMat);

ceiling.rotation.x = Math.PI/2;
ceiling.position.y = ROOM_H;

scene.add(ceiling);


// Wände

const wallMat = new THREE.MeshStandardMaterial({color:0x777777});

const wallGeo = new THREE.PlaneGeometry(ROOM_W,ROOM_H);

const backWall = new THREE.Mesh(wallGeo,wallMat);
backWall.position.set(0,ROOM_H/2,-halfD);
scene.add(backWall);

const frontWall = new THREE.Mesh(wallGeo,wallMat);
frontWall.position.set(0,ROOM_H/2,halfD);
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

const sideGeo = new THREE.PlaneGeometry(ROOM_D,ROOM_H);

const leftWall = new THREE.Mesh(sideGeo,wallMat);
leftWall.position.set(-halfW,ROOM_H/2,0);
leftWall.rotation.y = Math.PI/2;
scene.add(leftWall);

const rightWall = new THREE.Mesh(sideGeo,wallMat);
rightWall.position.set(halfW,ROOM_H/2,0);
rightWall.rotation.y = -Math.PI/2;
scene.add(rightWall);


// Bilder

const loader = new THREE.TextureLoader();

loader.load("/salon3d/assets/img/salon1.jpg",(texture)=>{

const mat = new THREE.MeshBasicMaterial({map:texture});
const geo = new THREE.PlaneGeometry(6,4);

const mesh = new THREE.Mesh(geo,mat);

mesh.position.set(-4,2,-halfD+0.01);

scene.add(mesh);

setStatus("Textur 1 OK");

});

loader.load("/salon3d/assets/img/salon2.jpg",(texture)=>{

const mat = new THREE.MeshBasicMaterial({map:texture});
const geo = new THREE.PlaneGeometry(6,4);

const mesh = new THREE.Mesh(geo,mat);

mesh.position.set(4,2,-halfD+0.01);

scene.add(mesh);

setStatus("Szene bereit");

});


// Animation

const clock = new THREE.Clock();

function animate(){

requestAnimationFrame(animate);

const delta = clock.getDelta();

velocity.x -= velocity.x * 10.0 * delta;
velocity.z -= velocity.z * 10.0 * delta;

direction.z = Number(moveForward) - Number(moveBackward);
direction.x = Number(moveRight) - Number(moveLeft);

direction.normalize();

if(moveForward || moveBackward)
velocity.z -= direction.z * speed * delta;

if(moveLeft || moveRight)
velocity.x -= direction.x * speed * delta;

controls.moveRight(-velocity.x * delta);
controls.moveForward(-velocity.z * delta);

renderer.render(scene,camera);

}

animate();


// Resize

window.addEventListener("resize",()=>{

camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth,window.innerHeight);

});
