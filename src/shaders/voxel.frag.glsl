// Matte voxel with glowing neon edges (bloom turns them into light).
uniform vec3 uEdgeColor;
uniform vec3 uLightDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uPulse; // flashes when a too-small player bumps into us

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFlash;
varying float vDepth;

void main() {
  vec3 n = normalize(vNormal);
  float diffuse = max(dot(n, uLightDir), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 color = vColor * (0.15 + 0.35 * sky + 0.7 * diffuse);

  // A pixel is on an edge when 2 of its 3 local coords are near a face.
  vec3 a = smoothstep(0.82, 0.95, abs(vLocal) * 2.0);
  float edge = clamp(a.x * a.y + a.y * a.z + a.z * a.x, 0.0, 1.0);
  color += uEdgeColor * edge * (1.2 + vFlash * 2.5 + uPulse * 3.0);
  color += vFlash * 0.25;

  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
}
