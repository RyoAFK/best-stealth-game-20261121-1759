// Warden AI for HUSHFALL: patrols, suspicion, investigation and the catch.
// Each warden walks a waypoint loop, pathfinding tile to tile. Seeing the
// thief (or hearing a sprint) builds that warden's alert meter; a full meter
// while the thief is in view means the game is caught. Meters cool down when
// the thief is out of sight.
import { TILE, COLS, ROWS, GUARD } from './config.js';
import { SOLID } from './world.js';

// Breadth-first path over non-solid tiles, as a list of tile centres.
function bfsPath(world, from, to) {
  const sc = Math.floor(from.x / TILE);
  const sr = Math.floor(from.y / TILE);
  const tc = Math.floor(to.x / TILE);
  const tr = Math.floor(to.y / TILE);
  if (sc === tc && sr === tr) return [{ x: to.x, y: to.y }];
  const key = (c, r) => c + ',' + r;
  const prev = new Map();
  const seen = new Set([key(sc, sr)]);
  const queue = [[sc, sr]];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (c === tc && r === tr) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      if (seen.has(key(nc, nr)) || SOLID.has(world.tiles[nr][nc])) continue;
      seen.add(key(nc, nr));
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!seen.has(key(tc, tr))) return [{ x: to.x, y: to.y }];
  const tiles = [];
  let cur = [tc, tr];
  while (!(cur[0] === sc && cur[1] === sr)) {
    tiles.push(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  tiles.reverse();
  const points = tiles.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
  points[points.length - 1] = { x: to.x, y: to.y };
  return points;
}

export class Guard {
  constructor(def) {
    this.waypoints = def.path.map(([c, r]) => ({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 }));
    this.pos = { ...this.waypoints[0] };
    this.wpIndex = 1 % this.waypoints.length;
    this.angle = Math.atan2(
      this.waypoints[this.wpIndex].y - this.pos.y,
      this.waypoints[this.wpIndex].x - this.pos.x,
    );
    this.state = 'patrol'; // patrol | pause | stare | investigate | look | chase
    this.timer = 0;
    this.alert = 0; // 0..1
    this.lastSeen = null;
    this.seesPlayer = false;
    this.bob = Math.random() * Math.PI * 2;
    this.queue = [];
    this.repath = 0;
  }

  canSee(world, player) {
    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < GUARD.nearRadius) return { visible: true, dist, rate: 3 };
    if (dist > GUARD.visionRange) return { visible: false, dist, rate: 0 };
    let diff = Math.atan2(dy, dx) - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > GUARD.visionHalfAngle) return { visible: false, dist, rate: 0 };
    if (!world.los(this.pos.x, this.pos.y, player.pos.x, player.pos.y)) {
      return { visible: false, dist, rate: 0 };
    }
    // How fast the meter fills: closer is worse; sprinting is worse;
    // crouching, shadow and ferns all help the thief.
    let rate = 1.5 - (dist / GUARD.visionRange) * 0.9; // 1.5 near -> 0.6 at edge
    if (player.sprinting) rate *= 1.6;
    if (player.crouching) rate *= 0.55;
    if (world.onShadow(player.pos.x, player.pos.y)) rate *= 0.5;
    if (player.crouching && world.inFern(player.pos.x, player.pos.y)) rate *= 0.08;
    return { visible: true, dist, rate };
  }

  turnToward(targetAngle, dt, speed = 3.2) {
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxTurn = speed * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    return Math.abs(diff) < 0.05;
  }

  stepToward(world, target, speed, dt) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    this.turnToward(Math.atan2(dy, dx), dt, 5);
    const step = Math.min(dist, speed * dt);
    const nx = this.pos.x + Math.cos(Math.atan2(dy, dx)) * step;
    const ny = this.pos.y + Math.sin(Math.atan2(dy, dx)) * step;
    this.pos.x = nx;
    this.pos.y = ny;
    if (world.circleHits(this.pos.x, this.pos.y, GUARD.radius)) {
      // Should not happen on a BFS path; nudge back out along the step.
      this.pos.x -= Math.cos(Math.atan2(dy, dx)) * step;
      this.pos.y -= Math.sin(Math.atan2(dy, dx)) * step;
    }
    this.bob += dt * speed * 0.09;
    return dist < 7;
  }

  // Follow the BFS queue toward a destination; true when arrived.
  goTo(world, dest, speed, dt, repath = false) {
    if (repath || this.queue.length === 0) {
      this.queue = bfsPath(world, this.pos, dest);
    }
    const head = this.queue[0];
    if (!head) return true;
    if (this.stepToward(world, head, speed, dt)) {
      this.queue.shift();
      return this.queue.length === 0;
    }
    return false;
  }

  update(world, player, dt, events) {
    const sight = this.canSee(world, player);
    this.seesPlayer = sight.visible;
    this.repath -= dt;
    if (sight.visible) {
      this.lastSeen = { x: player.pos.x, y: player.pos.y };
      this.alert = Math.min(1, this.alert + sight.rate * dt);
      if (this.alert >= 1) {
        events.caught = true;
        return;
      }
      if (this.state === 'patrol' || this.state === 'pause') {
        this.state = 'stare';
        this.timer = 0;
        this.queue = [];
      } else if (this.state === 'stare' || this.state === 'look') {
        this.state = 'chase';
        this.queue = [];
      }
    } else {
      // Sprinting nearby is heard even through the dark.
      const dx = player.pos.x - this.pos.x;
      const dy = player.pos.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      if (player.sprinting && dist < 96 && this.state !== 'chase') {
        this.lastSeen = { x: player.pos.x, y: player.pos.y };
        this.alert = Math.max(this.alert, 0.45);
        if (this.state !== 'investigate') {
          this.state = 'investigate';
          this.queue = [];
        }
      }
      this.alert = Math.max(0, this.alert - dt * (this.state === 'chase' ? 0.12 : 0.22));
      if (this.state === 'chase' && this.alert < 0.55) {
        this.state = 'investigate';
        this.queue = [];
      }
    }

    switch (this.state) {
      case 'patrol': {
        const wp = this.waypoints[this.wpIndex];
        if (this.goTo(world, wp, GUARD.patrolSpeed, dt)) {
          this.state = 'pause';
          this.timer = GUARD.pauseSec;
        }
        break;
      }
      case 'pause': {
        this.timer -= dt;
        if (this.timer <= 0) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.state = 'patrol';
        }
        break;
      }
      case 'stare': {
        // Frozen, glaring at the thief-shaped shadow.
        if (this.lastSeen) {
          this.turnToward(Math.atan2(this.lastSeen.y - this.pos.y, this.lastSeen.x - this.pos.x), dt, 5);
        }
        this.timer += dt;
        if (!sight.visible && this.timer > 0.4) {
          this.state = 'investigate';
          this.queue = [];
        }
        break;
      }
      case 'chase': {
        if (this.lastSeen) {
          const fresh = this.repath <= 0;
          if (fresh) this.repath = 0.45;
          this.goTo(world, this.lastSeen, GUARD.chaseSpeed, dt, fresh);
        }
        break;
      }
      case 'investigate': {
        if (this.lastSeen && this.goTo(world, this.lastSeen, GUARD.investigateSpeed, dt)) {
          this.state = 'look';
          this.timer = GUARD.lookSec;
          this.lookBase = this.angle;
        }
        break;
      }
      case 'look': {
        this.timer -= dt;
        this.angle = this.lookBase + Math.sin((GUARD.lookSec - this.timer) * 2.4) * 0.8;
        if (this.timer <= 0) {
          this.state = 'patrol';
          this.queue = [];
          let best = 0;
          let bestD = Infinity;
          this.waypoints.forEach((wp, i) => {
            const d = (wp.x - this.pos.x) ** 2 + (wp.y - this.pos.y) ** 2;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          });
          this.wpIndex = best;
        }
        break;
      }
      default:
        this.state = 'patrol';
    }
  }
}
