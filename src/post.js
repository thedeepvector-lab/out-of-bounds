import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import fragmentShader from './shaders/chromatic.frag.glsl?raw';

const BASE_ABERRATION = 0.004;

export function createPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const size = new THREE.Vector2(innerWidth, innerHeight);

  // 1) Draw the scene.  2) Make bright pixels glow.
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, 1.1, 0.55, 0.6);
  composer.addPass(bloom); // (strength, radius, threshold)

  // 3) Our own full-screen shader: RGB split + vignette.
  const chromatic = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uAmount: { value: BASE_ABERRATION },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix
          * vec4(position, 1.0);
      }`,
    fragmentShader,
  });
  composer.addPass(chromatic);

  // 4) Tone mapping + sRGB conversion.
  composer.addPass(new OutputPass());

  addEventListener('resize', () => {
    composer.setSize(innerWidth, innerHeight);
  });

  const amount = chromatic.uniforms.uAmount;
  return {
    composer,
    kick(strength) { // called on every smash
      amount.value = Math.min(0.08, amount.value + strength);
    },
    render(dt) {
      const decay = 1 - Math.exp(-dt * 4);
      amount.value += (BASE_ABERRATION - amount.value) * decay;
      composer.render(dt);
    },
  };
}
