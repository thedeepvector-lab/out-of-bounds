import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const START_RADIUS = 0.6;
const GROWTH = 18; // blocks needed to double volume
const MAX_SHELL = 2500; // cubes stuck to the surface

export class Player {
  constructor(scene, physics) {
    this.radius = START_RADIUS;
    this.targetRadius = START_RADIUS;
    this.absorbed = 0;
    this.steer = 0; // -1 (left) .. 1 (right)
    this.drive = true; // false = coast to a stop

    // --- Physics body: a single Rapier ball ---
    this.body = physics.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 2, 0)
        .setLinearDamping(0.2)
        .setCcdEnabled(true), // no tunnelling at high speed
    );
    this.collider = physics.createCollider(
      RAPIER.ColliderDesc.ball(this.radius)
        .setDensity(2)
        .setFriction(1.5)
        .setRestitution(0.2),
      this.body,
    );

    // --- Visuals: glowing core + shell of absorbed voxels ---
    this.group = new THREE.Group();
    scene.add(this.group);

    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 3),
      new THREE.MeshStandardMaterial({
        color: 0x3355aa, emissive: 0x00c8ff, emissiveIntensity: 0.15,
        roughness: 0.35, metalness: 0.2, flatShading: true,
      }),
    );
    // Neon wireframe cage around the core = "kinetic sphere" look.
    this.core.add(new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.04, 1),
      new THREE.MeshBasicMaterial({ color: 0x5ff6ff, wireframe: true }),
    ));
    this.group.add(this.core);

    this.shell = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: 0x111133 }),
      MAX_SHELL,
    );
    this.shell.count = 0;
    this.shell.frustumCulled = false;
    this.shellCursor = 0;
    this.group.add(this.shell);

    this.bindInput();
  }

  get position() {
    return this.body.translation();
  }

  bindInput() {
    const keys = new Set();
    const update = () => {
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      this.steer = (right ? 1 : 0) - (left ? 1 : 0);
    };
    addEventListener('keydown', (e) => { keys.add(e.code); update(); });
    addEventListener('keyup', (e) => { keys.delete(e.code); update(); });

    // Touch / mouse: hold on the left or right half of the screen.
    addEventListener('pointerdown', (e) => {
      this.steer = e.clientX < innerWidth / 2 ? -1 : 1;
    });
    addEventListener('pointerup', () => { this.steer = 0; });
  }

  update(dt) {
    // Velocity controller: push toward a cruise speed that grows with size.
    const v = this.body.linvel();
    const m = this.body.mass();
    const cruise = this.drive ? 18 + this.radius * 2.5 : 0;
    const steerSpeed = 14 + this.radius * 2;
    const fwd = (-cruise - v.z) * 2;
    const side = (this.steer * steerSpeed - v.x) * 4;
    this.body.applyImpulse({ x: side * m * dt, y: 0, z: fwd * m * dt }, true);

    // Ease the radius toward its target so growth feels smooth.
    this.radius += (this.targetRadius - this.radius) * Math.min(1, dt * 4);
    this.collider.setRadius(this.radius);

    // Copy the physics transform onto the visuals.
    const p = this.body.translation();
    const q = this.body.rotation();
    this.group.position.set(p.x, p.y, p.z);
    this.group.quaternion.set(q.x, q.y, q.z, q.w);
    this.core.scale.setScalar(this.radius * 0.9);
  }

  // Called as shattered voxels arrive: stick them on and grow.
  absorb(count, color, voxelSize) {
    this.absorbed += count;
    this.targetRadius =
      START_RADIUS * Math.cbrt(1 + this.absorbed / GROWTH);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const toLocal = this.group.quaternion.clone().invert();
    const size = Math.min(voxelSize, this.radius * 0.6);

    for (let i = 0; i < Math.min(count, 12); i++) {
      // Random point on the surface, converted into the ball's local
      // space so the cube rolls with the ball.
      pos.randomDirection().multiplyScalar(this.radius * 0.95);
      pos.applyQuaternion(toLocal);
      rot.random();
      scl.setScalar(size * (0.6 + Math.random() * 0.5));
      m.compose(pos, rot, scl);

      const index = this.shellCursor++ % MAX_SHELL;
      this.shell.setMatrixAt(index, m);
      this.shell.setColorAt(index, color);
    }
    this.shell.count = Math.min(this.shellCursor, MAX_SHELL);
    this.shell.instanceMatrix.needsUpdate = true;
    this.shell.instanceColor.needsUpdate = true;
  }

  // Too small to smash it? Get knocked back instead.
  bounce() {
    const v = this.body.linvel();
    this.body.setLinvel(
      { x: v.x * 0.5, y: 6, z: Math.abs(v.z) * 0.4 + 8 }, true,
    );
  }
}
