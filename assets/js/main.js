import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const status = document.getElementById("status");

status.textContent = "Initialisiere Szene...";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
60,
window.innerWidth / window.innerHeight,
0.1,
100
);

camera.position.set(0,1.6,5);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setClearColor(0x000000);

document.body.appendChild(renderer.domElement);

status.textContent = "Renderer OK";


// Licht

const ambient = new THREE.AmbientLight(0xffffff,0.7);
scene.add(ambient);

const light = new THREE.DirectionalLight(0xffffff,0.8);
light.position.set(3,5,4);
scene.add(light);


// Boden

const floorGeo = new THREE.PlaneGeometry(20,20);
const floorMat = new THREE.MeshStandardMaterial({color:0x444444});

const floor = new THREE.Mesh(floorGeo,floorMat);

floor.rotation.x = -Math.PI/2;

scene.add(floor);


// Wände

const wallMaterial = new THREE.MeshStandardMaterial({color:0x777777});

const wallGeo = new THREE.PlaneGeometry(20,5);

// Rückwand

const backWall = new THREE.Mesh(wallGeo,wallMaterial);
backWall.position.z = -10;
backWall.position.y = 2.5;
scene.add(backWall);

// Vorderwand

const frontWall = new THREE.Mesh(wallGeo,wallMaterial);
frontWall.position.z = 10;
frontWall.position.y = 2.5;
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

// Links

const leftWall = new THREE.Mesh(wallGeo,wallMaterial);
leftWall.position.x = -10;
leftWall.position.y = 2.5;
leftWall.rotation.y = Math.PI/2;
scene.add(leftWall);

// Rechts

const rightWall = new THREE.Mesh(wallGeo,wallMaterial);
rightWall.position.x = 10;
rightWall.position.y = 2.5;
rightWall.rotation.y = -Math.PI/2;
scene.add(rightWall);


// Bilder laden

const loader = new THREE.TextureLoader();

loader.load(
"/salon3d/assets/img/salon1.jpg",
(texture)=>{

const mat = new THREE.MeshBasicMaterial({map:texture});

const geo = new THREE.PlaneGeometry(6,4);

const painting = new THREE.Mesh(geo,mat);

painting.position.set(-4,2,-9.9);

scene.add(painting);

status.textContent = "Textur 1 OK";

}
);


loader.load(
"/salon3d/assets/img/salon2.jpg",
(texture)=>{

const mat = new THREE.MeshBasicMaterial({map:texture});

const geo = new THREE.PlaneGeometry(6,4);

const painting = new THREE.Mesh(geo,mat);

painting.position.set(4,2,-9.9);

scene.add(painting);

status.textContent = "Szene bereit";

}
);


// Animation

function animate(){

requestAnimationFrame(animate);

renderer.render(scene,camera);

}

animate();


// Resize

window.addEventListener("resize",()=>{

camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize(window.innerWidth,window.innerHeight);

});
