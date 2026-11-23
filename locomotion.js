import * as THREE from 'three';
import { GESTURES } from './gestures.js';

export class LocomotionController {
  constructor(playerRig, camera, options = {}) {
    this.playerRig = playerRig;
    this.camera = camera;

    this.walkSpeed = options.walkSpeed ?? 1.6;
    this.turnSpeed = options.turnSpeed ?? THREE.MathUtils.degToRad(55);

    this.currentForwardSpeed = 0;
    this.currentRotationSpeed = 0;

    this._forward = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._quat = new THREE.Quaternion();
  }

  reset() {
    this.playerRig.position.set(0, 0, 6);
    this.playerRig.rotation.set(0, 0, 0);
    this.currentForwardSpeed = 0;
    this.currentRotationSpeed = 0;
  }

  update(gesture, deltaTime, activeCamera = this.camera) {
    const dt = Math.min(Math.max(deltaTime, 0), 0.1);

    this.currentForwardSpeed = 0;
    this.currentRotationSpeed = 0;

    if (gesture === GESTURES.WALK) {
      activeCamera.getWorldDirection(this._forward);
      this._forward.y = 0;

      if (this._forward.lengthSq() > 1e-6) {
        this._forward.normalize();
        this.playerRig.position.addScaledVector(this._forward, this.walkSpeed * dt);
        this.currentForwardSpeed = this.walkSpeed;
      }
    } else if (gesture === GESTURES.TURN_RIGHT) {
      const angle = -this.turnSpeed * dt;
      this._quat.setFromAxisAngle(this._up, angle);
      this.playerRig.quaternion.premultiply(this._quat);
      this.currentRotationSpeed = -THREE.MathUtils.radToDeg(this.turnSpeed);
    } else if (gesture === GESTURES.TURN_LEFT) {
      const angle = this.turnSpeed * dt;
      this._quat.setFromAxisAngle(this._up, angle);
      this.playerRig.quaternion.premultiply(this._quat);
      this.currentRotationSpeed = THREE.MathUtils.radToDeg(this.turnSpeed);
    }
  }
}
