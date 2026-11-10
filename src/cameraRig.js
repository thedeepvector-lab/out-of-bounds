import * as THREE from 'three';

// Chase camera that pulls back and widens its FOV as the player grows.
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.shake = 0;
    this.lookAt = new THREE.Vector3();
    this.desired = new THREE.Vector3();
  }

  addShake(amount) {
    this.shake = Math.min(1.5, this.shake + amount);
  }

  update(dt, player) {
    const p = player.position;
    const r = player.radius;

    // 1) Distance and height scale with the player's radius.
    const distance = 6 + r * 5;
    const height = 2.5 + r * 2.6;
    this.desired.set(p.x * 0.8, p.y + height, p.z + distance);

    // Frame-rate independent smoothing: 1 - e^(-k·dt).
    const follow = 1 - Math.exp(-dt * 6);
    this.camera.position.lerp(this.desired, follow);

    // 2) FOV widens with size: tiny = tunnel vision, huge = epic.
    const targetFov = 60 + Math.min(28, (r - 0.6) * 4.5);
    this.camera.fov += (targetFov - this.camera.fov) * follow;
    this.camera.updateProjectionMatrix();

    // 3) Look ahead of the ball, further ahead when it is bigger.
    this.lookAt.set(p.x, p.y + r * 0.5, p.z - 12 - r * 3);

    // 4) Screen shake on big impacts, decaying every frame.
    if (this.shake > 0) {
      const s = this.shake * (0.3 + r * 0.1);
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.lookAt);
  }
}
