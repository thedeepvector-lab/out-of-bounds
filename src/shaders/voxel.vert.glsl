// One draw call per structure: every cube is an instance.
// Before impact the shader only places the cube. After impact the GPU
// computes the explosion AND the flight into the player — no CPU physics.

attribute vec3 aColor;   // per-instance colour
attribute vec3 aRandom;  // three random numbers (0..1) per instance

uniform float uTime;
uniform float uHitTime;  // < 0 until this structure is smashed
uniform vec3 uImpact;    // world-space impact point
uniform vec3 uImpactDir; // direction the player was travelling
uniform vec3 uPlayer;    // player centre = where debris flies to

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vLocal;
varying float vFlash;
varying float vDepth;

// Rodrigues' rotation: spin vector v around a unit axis.
vec3 rotate(vec3 v, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

void main() {
  vec3 home = instanceMatrix[3].xyz;         // cube centre
  float size = length(instanceMatrix[0].xyz); // cube edge length

  vec3 pos = home;
  vec3 local = position;
  vec3 nrm = normal;
  float scale = size;
  vFlash = 0.0;

  if (uHitTime >= 0.0) {
    float t = uTime - uHitTime; // seconds since impact

    // 1) EXPLODE: away from the impact, kicked forward and upward.
    vec3 away = normalize(home - uImpact + (aRandom - 0.5) * 2.0);
    vec3 velocity = away * (4.0 + aRandom.x * 10.0)
                  + uImpactDir * (8.0 + aRandom.y * 8.0)
                  + vec3(0.0, 4.0 + aRandom.z * 8.0, 0.0);
    float tf = min(t, 1.0);
    vec3 burst = home + velocity * tf
               + vec3(0.0, -12.0, 0.0) * 0.5 * tf * tf; // gravity
    burst.y = max(burst.y, size * 0.5);                // floor

    // 2) ABSORB: after a random delay, get pulled into the player.
    float delay = 0.3 + aRandom.z * 0.6;
    float k = clamp((t - delay) / 0.5, 0.0, 1.0);
    k = k * k; // ease-in: slow start, then snaps on
    pos = mix(burst, uPlayer, k);

    // Tumble while flying, shrink on arrival, vanish once absorbed.
    vec3 axis = normalize(aRandom - 0.5);
    float angle = t * (3.0 + aRandom.x * 9.0);
    local = rotate(local, axis, angle);
    nrm = rotate(nrm, axis, angle);
    scale *= (1.0 - 0.6 * k) * step(k, 0.999);

    vFlash = exp(-t * 5.0); // white-hot flash right after impact
  }

  vec4 view = viewMatrix * vec4(pos + local * scale, 1.0);
  vColor = aColor;
  vNormal = nrm;
  vLocal = position;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
