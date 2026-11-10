// Neon grid floor: colour drifts along the track, pulses race forward.
uniform float uTime;
uniform float uHalfWidth;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec3 vWorld;
varying float vDepth;

// 1.0 on a grid line, 0.0 between lines (anti-aliased by width).
float gridLine(float coord, float spacing, float width) {
  float d = abs(fract(coord / spacing - 0.5) - 0.5) * spacing;
  return 1.0 - smoothstep(0.0, width, d);
}

void main() {
  float lines = max(
    gridLine(vWorld.x, 4.0, 0.1),
    gridLine(vWorld.z, 4.0, 0.1)
  );

  // "Shifting" neon: cyan -> magenta -> cyan every 600 units.
  float k = fract(-vWorld.z / 600.0 + uTime * 0.02);
  vec3 cyan = vec3(0.0, 0.9, 1.0);
  vec3 magenta = vec3(1.0, 0.17, 0.84);
  vec3 neon = mix(cyan, magenta, 0.5 - 0.5 * cos(k * 6.2831));

  // Bright bands that sweep toward the camera.
  float pulse = pow(fract((vWorld.z + uTime * 60.0) / 90.0), 12.0);

  vec3 color = vec3(0.015, 0.02, 0.04);
  color += neon * lines * (0.12 + pulse * 1.2);

  // Glowing strip along both edges of the track.
  float edge = smoothstep(uHalfWidth - 1.5, uHalfWidth, abs(vWorld.x));
  color += neon * edge * 0.9;

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
}
