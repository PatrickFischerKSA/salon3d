import {
	Euler,
	EventDispatcher,
	Vector3
} from "./three.module.js";

/**
 * PointerLockControls (ESM, lokal für GitHub Pages)
 * - keine "three"-Bare-Imports
 * - kompatibel mit three.module.js im selben Ordner
 *
 * Usage:
 *   import { PointerLockControls } from "../vendor/PointerLockControls.js";
 *   const controls = new PointerLockControls(camera, renderer.domElement);
 *   scene.add(controls.getObject());
 *   controls.lock();
 *
 * API:
 *   controls.isLocked
 *   controls.lock()
 *   controls.unlock()
 *   controls.getObject()
 *   controls.moveForward(distance)
 *   controls.moveRight(distance)
 *   controls.addEventListener('lock'|'unlock'|'change', fn)
 */

const _euler = new Euler(0, 0, 0, "YXZ");
const _vector = new Vector3();

const _changeEvent = { type: "change" };
const _lockEvent = { type: "lock" };
const _unlockEvent = { type: "unlock" };

class PointerLockControls extends EventDispatcher {

	constructor(camera, domElement){

		super();

		if(domElement === undefined){
			console.warn("PointerLockControls: domElement ist nicht gesetzt. Fallback auf document.body.");
			domElement = document.body;
		}

		this.domElement = domElement;
		this.isLocked = false;

		// Options
		this.minPolarAngle = 0;         // radians
		this.maxPolarAngle = Math.PI;   // radians
		this.pointerSpeed = 1.0;

		// intern
		const scope = this;

		function onMouseMove(event){

			if(scope.isLocked === false) return;

			const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
			const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

			_euler.setFromQuaternion(camera.quaternion);

			_euler.y -= movementX * 0.002 * scope.pointerSpeed;
			_euler.x -= movementY * 0.002 * scope.pointerSpeed;

			// clamp vertical look
			_euler.x = Math.max(Math.PI / 2 - scope.maxPolarAngle, Math.min(Math.PI / 2 - scope.minPolarAngle, _euler.x));

			camera.quaternion.setFromEuler(_euler);

			scope.dispatchEvent(_changeEvent);
		}

		function onPointerlockChange(){

			if(document.pointerLockElement === scope.domElement){

				scope.dispatchEvent(_lockEvent);
				scope.isLocked = true;

			}else{

				scope.dispatchEvent(_unlockEvent);
				scope.isLocked = false;

			}
		}

		function onPointerlockError(){

			console.error("PointerLockControls: Unable to use Pointer Lock API.");
		}

		this.connect = function(){

			document.addEventListener("mousemove", onMouseMove);
			document.addEventListener("pointerlockchange", onPointerlockChange);
			document.addEventListener("pointerlockerror", onPointerlockError);

		};

		this.disconnect = function(){

			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("pointerlockchange", onPointerlockChange);
			document.removeEventListener("pointerlockerror", onPointerlockError);

		};

		this.dispose = function(){

			this.disconnect();

		};

		this.getObject = function(){

			return camera;

		};

		this.lock = function(){

			this.domElement.requestPointerLock();

		};

		this.unlock = function(){

			document.exitPointerLock();

		};

		this.moveForward = function(distance){

			// camera direction on XZ plane
			_vector.setFromMatrixColumn(camera.matrix, 0);
			_vector.crossVectors(camera.up, _vector);

			camera.position.addScaledVector(_vector, distance);

		};

		this.moveRight = function(distance){

			_vector.setFromMatrixColumn(camera.matrix, 0);

			camera.position.addScaledVector(_vector, distance);

		};

		// auto-connect
		this.connect();

	}

}

export { PointerLockControls };
