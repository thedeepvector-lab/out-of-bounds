// Demo mode (?auto): steer toward the nearest thing we can smash,
// and away from anything too big. Handy for trailers and testing.
export function autopilot(player, level) {
  const p = player.position;
  let best = null;
  let bestScore = Infinity;
  let danger = null;

  for (const s of level.structures) {
    if (s.shattered || s === level.boss) continue;
    const dz = p.z - s.center.z; // distance ahead of us
    if (dz < 0 || dz > 70) continue;
    const dx = s.center.x - p.x;
    const halfW = (s.box.max.x - s.box.min.x) / 2;
    if (player.radius >= s.required) {
      const score = dz + Math.abs(dx) * 2;
      if (score < bestScore) { bestScore = score; best = dx; }
    } else if (dz < 25 && Math.abs(dx) < halfW + player.radius + 2) {
      danger = dx;
    }
  }

  let target = best ?? -p.x * 0.05; // drift to the middle if idle
  if (danger !== null) target = danger > 0 ? -20 : 20; // dodge!
  player.steer = Math.max(-1, Math.min(1, target * 0.25));
}
