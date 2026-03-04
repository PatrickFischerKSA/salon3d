// assets/vendor/PointerLockControls.js
// Minimal, GitHub-Pages-tauglich, ohne "import from 'three'"
// Nutzung: new PointerLockControls(THREE, camera, domElement)

export class PointerLockControls {
  constructor(THREE, camera, domElement) {
    this.THREE = THREE;
    this.camera = camera;
    this.domElement = domElement;

    this.isLocked = false;

    this.minPolarAngle = 0;           // rad
    this.maxPolarAngle = Math.PI;     // rad

    this.pointerSpeed = 1.0;

    // Yaw (links/rechts) + Pitch (hoch/runter)
    this.euler = new THREE.Euler(0, 0, 0, "YXZ");

    this.pitchObject = new THREE.Object3D();
    this.pitchObject.add(camera);

    this.yawObject = new THREE.Object3D();
    this.yawObject.position.set(0, 0, 0);
    this.yawObject.add(this.pitchObject);

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerlockChange = this._onPointerlockChange.bind(this);
    this._onPointerlockError = this._onPointerlockError.bind(this);

    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onPointerlockChange);
    document.addEventListener("pointerlockerror", this._onPointerlockError);
  }

  getObject() {
    return this.yawObject;
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    document.exitPointerLock();
  }

  _onPointerlockChange() {
    this.isLocked = (document.pointerLockElement === this.domElement);
  }

  _onPointerlockError() {
    console.error("PointerLockControls: Pointer Lock error");
  }

  _onMouseMove(event) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);

    this.euler.y -= movementX * 0.002 * this.pointerSpeed;
    this.euler.x -= movementY * 0.002 * this.pointerSpeed;

    // clamp pitch
    const pi_2 = Math.PI / 2;
    const min = pi_2 - this.maxPolarAngle;
    const max = pi_2 - this.minPolarAngle;
    this.euler.x = Math.max(min, Math.min(max, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  // Bewegung in Blickrichtung
  moveForward(distance) {
    const THREE = this.THREE;
    const v = new THREE.Vector3();
    this.camera.getWorldDirection(v);
    v.y = 0;
    v.normalize();
    this.yawObject.position.addScaledVector(v, distance);
  }

  moveRight(distance) {
    const THREE = this.THREE;
    const v = new THREE.Vector3();
    this.camera.getWorldDirection(v);
    v.y = 0;
    v.normalize();
    v.cross(this.camera.up);
    this.yawObject.position.addScaledVector(v, distance);
  }

  dispose() {
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("pointerlockchange", this._onPointerlockChange);
    document.removeEventListener("pointerlockerror", this._onPointerlockError);
  }
}
