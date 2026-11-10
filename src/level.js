import * as THREE from 'three';
import { VoxelStructure } from './voxels.js';
import { TRACK_LENGTH, TRACK_WIDTH } from './track.js';

// Tiny seeded random generator: same level every run.
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BODY = ['#3a4270', '#4a3a80', '#2f4f7a', '#5a3a6e'];
const GLOW = ['#5ff6ff', '#ff2bd6', '#ffb020'];
const EDGES = [0x00e5ff, 0xff2bd6, 0xffb020];

// Fill a w × h × d box of cubes; some faces become lit "windows".
function block(x0, z0, w, h, d, s, rng, y0 = 0) {
  const voxels = [];
  const body = new THREE.Color(BODY[Math.floor(rng() * BODY.length)]);
  const glow = new THREE.Color(GLOW[Math.floor(rng() * GLOW.length)]);
  for (let ix = 0; ix < w; ix++) {
    for (let iy = 0; iy < h; iy++) {
      for (let iz = 0; iz < d; iz++) {
        const outside =
          ix === 0 || ix === w - 1 || iz === 0 || iz === d - 1;
        const lit = outside && iy % 3 === 1 && rng() < 0.35;
        voxels.push({
          x: x0 + (ix - (w - 1) / 2) * s,
          y: y0 + (iy + 0.5) * s,
          z: z0 + (iz - (d - 1) / 2) * s,
          color: lit ? glow : body,
        });
      }
    }
  }
  return voxels;
}

// Structure recipes, from tiny crates to skyscrapers.
const RECIPES = {
  crate: (x, z, r) => [block(x, z, 2, 2, 2, 0.5, r), 0.5],
  pillar: (x, z, r) => [block(x, z, 2, 6, 2, 0.5, r), 0.5],
  wall: (x, z, r) => [block(x, z, 10, 4, 1, 0.6, r), 0.6],
  tower: (x, z, r) => [block(x, z, 4, 12, 4, 0.8, r), 0.8],
  bridge: (x, z, r) => [[
    ...block(x - 6, z, 2, 6, 2, 1, r),
    ...block(x + 6, z, 2, 6, 2, 1, r),
    ...block(x, z, 14, 2, 2, 1, r, 6),
  ], 1],
  drone: (x, z, r) => [block(x, z, 3, 1, 3, 0.6, r, 2.5), 0.6],
  skyscraper: (x, z, r) => [block(x, z, 6, 28, 6, 1.2, r), 1.2],
};

// Which recipes appear as you progress (0 = start, 1 = finish).
function pickRecipe(progress, rng) {
  const pools = [
    ['crate', 'crate', 'pillar', 'drone'],
    ['crate', 'pillar', 'wall', 'drone', 'tower'],
    ['wall', 'tower', 'tower', 'bridge', 'pillar'],
    ['tower', 'bridge', 'skyscraper', 'skyscraper'],
  ];
  const pool = pools[Math.min(3, Math.floor(progress * 4))];
  return pool[Math.floor(rng() * pool.length)];
}

export class Level {
  constructor(scene, seed = 7) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    this.structures = [];
    this.onSmash = () => {};
    this.onBlocked = () => {};
    this.bumpCooldown = 0;

    // Scatter structures down the track.
    const half = TRACK_WIDTH / 2 - 4;
    for (let z = -25; z > -TRACK_LENGTH; z -= 7 + this.rng() * 6) {
      const progress = -z / TRACK_LENGTH;
      const perRow = 1 + Math.floor(this.rng() * (2 + progress * 2));
      for (let i = 0; i < perRow; i++) {
        const name = pickRecipe(progress, this.rng);
        const x = (this.rng() * 2 - 1) * half;
        this.add(name, x, z + this.rng() * 4);
      }
    }
    this.boss = this.createBoss(-TRACK_LENGTH - 60);
  }

  add(name, x, z) {
    const [voxels, size] = RECIPES[name](x, z, this.rng);
    const edge = EDGES[Math.floor(this.rng() * EDGES.length)];
    const s = new VoxelStructure(
      this.scene, voxels, { size, edge, rng: this.rng },
    );
    this.structures.push(s);
    return s;
  }

  // The finish-line boss: a giant voxel titan with glowing eyes.
  createBoss(z) {
    const r = this.rng;
    const voxels = [
      ...block(0, z, 12, 18, 6, 1.6, r),          // torso
      ...block(0, z, 8, 7, 6, 1.6, r, 18 * 1.6),  // head
      ...block(-11, z, 3, 14, 3, 1.6, r, 4),      // left arm
      ...block(11, z, 3, 14, 3, 1.6, r, 4),       // right arm
    ];
    const eye = new THREE.Color('#ff2020');
    for (const ex of [-2.4, 2.4]) {
      voxels.push({ x: ex, y: 33, z: z + 5, color: eye });
    }
    const boss = new VoxelStructure(
      this.scene, voxels, { size: 1.6, edge: 0xff2bd6, rng: r },
    );
    boss.hp = 100;
    this.structures.push(boss);
    return boss;
  }

  update(time, dt, player) {
    const p = player.position;
    const center = new THREE.Vector3(p.x, p.y, p.z);
    const dir = new THREE.Vector3(0, 0, -1);
    this.bumpCooldown -= dt;

    for (const s of this.structures) {
      if (s.done) continue;
      s.update(time, dt, player);
      // Only draw what is near the camera (cheap culling).
      s.mesh.visible = s.center.z < p.z + 40 && s.center.z > p.z - 420;
      if (s.shattered || !s.mesh.visible) continue;
      if (!s.hitTest(center, player.radius)) continue;

      if (s === this.boss) {
        this.hitBoss(time, player, center, dir);
      } else if (player.radius >= s.required) {
        s.shatter(center, dir, time);
        this.onSmash(s);
      } else if (this.bumpCooldown <= 0) {
        player.bounce(); // too small: bounce off and glow
        s.material.uniforms.uPulse.value = 1;
        this.bumpCooldown = 0.4;
        this.onBlocked(s);
      }
    }
    this.structures = this.structures.filter((s) => !s.done);
  }

  hitBoss(time, player, center, dir) {
    if (this.bumpCooldown > 0) return;
    this.boss.hp -= player.radius * 12;
    this.bumpCooldown = 0.5;
    if (this.boss.hp <= 0) {
      this.boss.shatter(center, dir, time);
      this.onSmash(this.boss);
    } else {
      player.bounce();
      this.boss.material.uniforms.uPulse.value = 1;
      this.onBlocked(this.boss);
    }
  }
}
