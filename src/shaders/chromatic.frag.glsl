// Chromatic aberration + vignette, applied to the whole screen.
uniform sampler2D tDiffuse; // the rendered frame from the previous pass
uniform float uAmount;      // spikes on big smashes, then decays

varying vec2 vUv;

void main() {
  vec2 dir = vUv - 0.5;
  float dist = length(dir);
  vec2 offset = dir * uAmount * dist; // stronger toward the edges

  // Sample red and blue at slightly different spots: RGB split.
  vec4 base = texture2D(tDiffuse, vUv);
  float r = texture2D(tDiffuse, vUv + offset).r;
  float b = texture2D(tDiffuse, vUv - offset).b;
  vec3 color = vec3(r, base.g, b);

  color *= 1.0 - smoothstep(0.45, 0.85, dist) * 0.6; // vignette
  gl_FragColor = vec4(color, base.a);
}
