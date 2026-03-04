import * as THREE from "../vendor/three.module.js";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

let camera;
let scene;
let renderer;
let controls;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

const clock = new THREE.Clock();

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    camera.position.set(0, 1.7, 0);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    light.position.set(0, 20, 0);
    scene.add(light);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    const btn = document.getElementById("enterBtn");
    if (btn) {
        btn.addEventListener("click", () => {
            controls.lock();
        });
    }

    // Raum

    const roomSize = 20;

    const room = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize, 8, roomSize),
        new THREE.MeshStandardMaterial({
            color: 0xf5f0e6,
            side: THREE.BackSide
        })
    );

    scene.add(room);

    // Boden

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({ color: 0x8b6f47 })
    );

    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Steuerung

    const onKeyDown = function (event) {

        switch (event.code) {

            case "ArrowUp":
            case "KeyW":
                moveForward = true;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = true;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = true;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = true;
                break;
        }
    };

    const onKeyUp = function (event) {

        switch (event.code) {

            case "ArrowUp":
            case "KeyW":
                moveForward = false;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = false;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = false;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = false;
                break;
        }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    window.addEventListener("resize", onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const speed = 8.0;

    if (moveForward || moveBackward)
        velocity.z -= direction.z * speed * delta;

    if (moveLeft || moveRight)
        velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    renderer.render(scene, camera);

}
