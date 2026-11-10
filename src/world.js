import * as THREE from 'three';

// Renderer, scene, camera and the empty neon void around the track.
export function createWorld() {
  const renderer = new THREE.WebGLRenderer({
    antialias: false, // post-processing handles the look
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true, // lets us screenshot frames
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  scene.fog = new THREE.Fog(0x05060a, 60, 320);

  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 2000,
  );

  // Soft sky/ground light plus one key light for the matte voxels.
  scene.add(new THREE.HemisphereLight(0x6677ff, 0x110022, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  const stars = createStars();
  scene.add(stars);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, stars };
}

// A few thousand points scattered in a huge shell = the void.
function createStars(count = 3000) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(
      600 + Math.random() * 600,
    );
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position', new THREE.BufferAttribute(positions, 3),
  );
  const material = new THREE.PointsMaterial({
    color: 0x8899ff, size: 1.6, sizeAttenuation: false, fog: false,
  });
  return new THREE.Points(geometry, material);
}
