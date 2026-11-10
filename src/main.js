import RAPIER from '@dimforge/rapier3d-compat';
import { createWorld } from './world.js';
import { createTrack, TRACK_LENGTH } from './track.js';
import { Player } from './player.js';
import { Level } from './level.js';
import { shared } from './voxels.js';
import { CameraRig } from './cameraRig.js';
import { createPost } from './post.js';
import { Sfx } from './audio.js';
import { autopilot } from './autopilot.js';

await RAPIER.init(); // loads the WebAssembly physics engine

const params = new URLSearchParams(location.search);
const capture = params.has('capture'); // frame-by-frame recording
const demo = params.has('auto') || capture;

const { renderer, scene, camera, stars } = createWorld();
const physics = new RAPIER.World({ x: 0, y: -25, z: 0 });
const track = createTrack(scene, physics);
const player = new Player(scene, physics);
const level = new Level(scene);
const rig = new CameraRig(camera);
const post = createPost(renderer, scene, camera);
const sfx = new Sfx();

// --- Game feel: every smash = sound + shake + RGB split ---
level.onSmash = (s) => {
  const weight = Math.cbrt(s.count) / 4;
  sfx.thud(weight);
  sfx.shatter(weight);
  rig.addShake(0.2 + weight * 0.3);
  post.kick(0.01 + weight * 0.015);
  if (s === level.boss) finish();
};
level.onBlocked = () => {
  sfx.thud(0.5);
  rig.addShake(0.4);
};

// --- HUD + game state ---
const $ = (id) => document.getElementById(id);
let state = 'ready';
let time = 0;
let raceTime = 0;

$('start').onclick = () => {
  if (state === 'won') return location.reload();
  sfx.start();
  $('overlay').classList.add('hidden');
  state = 'racing';
};

function finish() {
  state = 'won';
  player.drive = false;
  setTimeout(() => {
    $('overlay').querySelector('h1').textContent = 'LEVEL CLEAR';
    $('overlay').querySelector('p').textContent =
      `${raceTime.toFixed(1)}s · ${player.absorbed} blocks absorbed`;
    $('start').textContent = 'RACE AGAIN';
    $('overlay').classList.remove('hidden');
  }, 2500);
}

function updateHud() {
  $('size').textContent = (player.radius * 2).toFixed(1);
  $('blocks').textContent = player.absorbed;
  $('time').textContent = raceTime.toFixed(1);
  const progress = Math.min(1, -player.position.z / TRACK_LENGTH);
  $('bar').style.width = `${progress * 100}%`;
}

// --- The game loop ---
const STEP = 1 / 60;
physics.timestep = STEP;
let accumulator = 0;

function tick(dt, draw = true) {
  time += dt;
  if (state !== 'ready') {
    if (demo) autopilot(player, level);
    // Fixed-step physics: same result at 30, 60 or 144 FPS.
    accumulator += dt;
    while (accumulator >= STEP) {
      player.update(STEP);
      physics.step();
      accumulator -= STEP;
    }
    if (state === 'racing') raceTime += dt;
  }

  shared.uTime.value = time;
  shared.uPlayer.value.copy(player.position);
  level.update(time, dt, player);
  track.update(time);
  rig.update(dt, player);
  stars.position.copy(camera.position);
  if (draw) post.render(dt);
  updateHud();
}

if (capture) {
  // Recording mode: the page waits for us to ask for each frame.
  state = 'racing';
  $('overlay').classList.add('hidden');
  window.__advance = (frames = 1, dt = 1 / 30, draw = true) => {
    for (let i = 0; i < frames; i++) tick(dt, draw);
    return { z: player.position.z, r: player.radius, state };
  };
} else {
  if (demo) $('start').click();
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
  });
}
