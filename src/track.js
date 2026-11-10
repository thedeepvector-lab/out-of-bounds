import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import vertexShader from './shaders/track.vert.glsl?raw';
import fragmentShader from './shaders/track.frag.glsl?raw';

export const TRACK_LENGTH = 2400; // units along -Z (~2 minutes)
export const TRACK_WIDTH = 64;
const START_Z = 30;

export function createTrack(scene, physics) {
  const halfW = TRACK_WIDTH / 2;
  const length = TRACK_LENGTH + START_Z + 600;
  const centerZ = START_Z - length / 2;

  // --- Visual floor: one big plane with a neon grid shader ---
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uHalfWidth: { value: halfW },
      uFogColor: { value: scene.fog.color },
      uFogNear: { value: scene.fog.near },
      uFogFar: { value: scene.fog.far },
    },
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_WIDTH, length), material,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = centerZ;
  scene.add(floor);

  // Glowing rails sell the "track floating in a void" look.
  const railMat = new THREE.MeshBasicMaterial({ color: 0x0088aa });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, length), railMat,
    );
    rail.position.set(side * halfW, 0.3, centerZ);
    scene.add(rail);
  }

  // --- Physics: static floor + invisible side walls (Rapier) ---
  const ground = physics.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, centerZ),
  );
  physics.createCollider(
    RAPIER.ColliderDesc.cuboid(halfW, 1, length / 2).setFriction(1.2),
    ground,
  );
  for (const side of [-1, 1]) {
    physics.createCollider(
      RAPIER.ColliderDesc.cuboid(1, 40, length / 2)
        .setTranslation(side * (halfW + 1), 40, 0)
        .setRestitution(0.6),
      ground,
    );
  }

  return {
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}
