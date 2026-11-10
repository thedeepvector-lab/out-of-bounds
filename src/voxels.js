import * as THREE from 'three';
import vertexShader from './shaders/voxel.vert.glsl?raw';
import fragmentShader from './shaders/voxel.frag.glsl?raw';

// Uniforms shared by EVERY structure: update once per frame, not N times.
export const shared = {
  uTime: { value: 0 },
  uPlayer: { value: new THREE.Vector3() },
  uLightDir: { value: new THREE.Vector3(30, 60, 20).normalize() },
  uFogColor: { value: new THREE.Color(0x05060a) },
  uFogNear: { value: 60 },
  uFogFar: { value: 320 },
};

const ABSORB_START = 0.8; // first cubes reach the player (seconds)
const ABSORB_END = 1.4; // last cubes reach the player

export class VoxelStructure {
  // voxels: [{ x, y, z, color }]  — world-space cube centres
  constructor(scene, voxels, { size = 1, edge = 0x00e5ff, rng }) {
    this.scene = scene;
    this.size = size;
    this.count = voxels.length;
    this.required = 0.22 * Math.cbrt(this.count) * size; // min radius
    this.hitTime = -1;
    this.absorbedSoFar = 0;
    this.done = false;

    // Per-instance data lives in InstancedBufferAttributes.
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const colors = new Float32Array(this.count * 3);
    const randoms = new Float32Array(this.count * 3);
    geometry.setAttribute(
      'aColor', new THREE.InstancedBufferAttribute(colors, 3),
    );
    geometry.setAttribute(
      'aRandom', new THREE.InstancedBufferAttribute(randoms, 3),
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        ...shared, // same objects -> shared values
        uHitTime: { value: -1 },
        uImpact: { value: new THREE.Vector3() },
        uImpactDir: { value: new THREE.Vector3() },
        uEdgeColor: { value: new THREE.Color(edge) },
        uPulse: { value: 0 },
      },
    });

    this.mesh = new THREE.InstancedMesh(
      geometry, this.material, this.count,
    );
    this.mesh.frustumCulled = false; // the shader moves cubes anyway

    const matrix = new THREE.Matrix4();
    this.box = new THREE.Box3();
    voxels.forEach((v, i) => {
      matrix.makeScale(size, size, size).setPosition(v.x, v.y, v.z);
      this.mesh.setMatrixAt(i, matrix);
      v.color.toArray(colors, i * 3);
      randoms.set([rng(), rng(), rng()], i * 3);
      this.box.expandByPoint(new THREE.Vector3(v.x, v.y, v.z));
    });
    this.box.expandByScalar(size / 2);
    this.colors = colors;
    this.center = this.box.getCenter(new THREE.Vector3());
    scene.add(this.mesh);
  }

  get shattered() {
    return this.hitTime >= 0;
  }

  // Sphere vs. axis-aligned box: is the player touching us?
  hitTest(center, radius) {
    const closest = this.box.clampPoint(center, new THREE.Vector3());
    return closest.distanceToSquared(center) < radius * radius;
  }

  // The whole "physics" of the explosion is 3 uniforms.
  shatter(impact, direction, time) {
    this.hitTime = time;
    this.material.uniforms.uHitTime.value = time;
    this.material.uniforms.uImpact.value.copy(impact);
    this.material.uniforms.uImpactDir.value.copy(direction).normalize();
  }

  // The CPU mirrors the shader's timing to know how many cubes arrived.
  update(time, dt, player) {
    const u = this.material.uniforms.uPulse;
    u.value = Math.max(0, u.value - dt * 3);
    if (!this.shattered || this.done) return;

    const t = time - this.hitTime;
    const f = THREE.MathUtils.clamp(
      (t - ABSORB_START) / (ABSORB_END - ABSORB_START), 0, 1,
    );
    const arrived = Math.floor(f * this.count);
    const delta = arrived - this.absorbedSoFar;
    if (delta > 0) {
      const i = Math.floor(Math.random() * this.count) * 3;
      const color = new THREE.Color().fromArray(this.colors, i);
      player.absorb(delta, color, this.size);
      this.absorbedSoFar = arrived;
    }
    if (f >= 1) this.dispose();
  }

  dispose() {
    this.done = true;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
