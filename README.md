# Out of Bounds — Voxel Deconstruct Racer

A Three.js + Rapier game where every building shatters into hundreds of
cubes and every cube flies into your ball. The explosions are calculated in
a vertex shader, so thousands of debris cubes stay at 60 FPS.

```
Race down a shifting neon track ─> Smash obstacles ─> Absorb debris to grow ─> Crush the boss
```

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

* `A / D` or `← / →` to steer (touch: hold the left / right half of the screen)
* `http://localhost:5173/?auto` — self-playing demo mode
* `npm run build` — production build in `dist/`

## Files

| File | Job |
| --- | --- |
| `src/main.js` | Boots everything, fixed-timestep game loop, HUD, game feel |
| `src/world.js` | Renderer, scene, fog, lights, starfield |
| `src/track.js` | Neon floor (custom shader) + Rapier floor/wall colliders |
| `src/player.js` | Rapier ball, input, velocity controller, absorb & grow |
| `src/voxels.js` | `VoxelStructure`: one `InstancedMesh` per building, hit test, shatter |
| `src/level.js` | Seeded level generator, structure recipes, boss |
| `src/cameraRig.js` | Chase camera whose distance and FOV scale with the player |
| `src/post.js` | EffectComposer: bloom + chromatic aberration + output |
| `src/audio.js` | Web Audio synthesized thuds and glass shatters |
| `src/autopilot.js` | Demo-mode steering (`?auto`) |
| `src/shaders/voxel.vert.glsl` | **The trick**: GPU explosion + absorb path for every cube |
| `src/shaders/voxel.frag.glsl` | Matte lighting + neon cube edges |
| `src/shaders/track.*.glsl` | Shifting neon grid floor |
| `src/shaders/chromatic.frag.glsl` | RGB split + vignette post pass |

## The tech secret

1. **InstancedMesh** — each building is one draw call, no matter how many cubes.
2. **Shader-calculated shattering** — on impact the CPU writes 3 uniforms
   (`uHitTime`, `uImpact`, `uImpactDir`). The vertex shader computes
   `home + v·t + ½·g·t²`, then `mix(burst, uPlayer, k²)` to pull debris in.
3. **CPU mirrors the shader's timing** — no GPU readback; we know every cube
   arrives between 0.8 s and 1.4 s, so we count arrivals and grow the ball.
4. **Scale transition** — camera distance, height and FOV grow with the radius.

Built with three 0.187, @dimforge/rapier3d-compat 0.21 and Vite 8.
