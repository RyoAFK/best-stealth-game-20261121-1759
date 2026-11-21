// World geometry for HUSHFALL: level parsing, collision and sight lines.
import { TILE, COLS, ROWS } from './config.js';

export const SOLID = new Set(['#', 'B']);

export class World {
  constructor(level) {
    this.tiles = [];
    this.gems = [];
    this.start = { x: 0, y: 0 };
    this.exit = { x: 0, y: 0 };
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let ch = level.map[r][c];
        const cx = c * TILE + TILE / 2;
        const cy = r * TILE + TILE / 2;
        if (ch === 'P') {
          this.start = { x: cx, y: cy };
          ch = '.';
        } else if (ch === 'E') {
          this.exit = { x: cx, y: cy, col: c, row: r };
          ch = 'E';
        } else if (ch === 'G') {
          this.gems.push({ x: cx, y: cy, taken: false });
          ch = '.';
        }
        row.push(ch);
      }
      this.tiles.push(row);
    }
  }

  tileAt(px, py) {
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return '#';
    return this.tiles[r][c];
  }

  isSolid(px, py) {
    return SOLID.has(this.tileAt(px, py));
  }

  onShadow(px, py) {
    return this.tileAt(px, py) === ',';
  }

  inFern(px, py) {
    return this.tileAt(px, py) === '%';
  }

  // Move a circle, resolving against solid tiles axis by axis.
  moveCircle(pos, radius, dx, dy) {
    pos.x += dx;
    if (this.circleHits(pos.x, pos.y, radius)) pos.x -= dx;
    pos.y += dy;
    if (this.circleHits(pos.x, pos.y, radius)) pos.y -= dy;
  }

  circleHits(x, y, radius) {
    const minC = Math.floor((x - radius) / TILE);
    const maxC = Math.floor((x + radius) / TILE);
    const minR = Math.floor((y - radius) / TILE);
    const maxR = Math.floor((y + radius) / TILE);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
        if (!SOLID.has(this.tiles[r][c])) continue;
        const nx = Math.max(c * TILE, Math.min(x, c * TILE + TILE));
        const ny = Math.max(r * TILE, Math.min(y, r * TILE + TILE));
        const ddx = x - nx;
        const ddy = y - ny;
        if (ddx * ddx + ddy * ddy < radius * radius) return true;
      }
    }
    return false;
  }

  // Clear line of sight between two points (walls and crates block).
  los(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 4));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isSolid(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  // Distance from (x,y) along angle until a solid tile stops the ray.
  raycast(x, y, angle, maxDist) {
    const step = 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let d = step;
    while (d < maxDist) {
      if (this.isSolid(x + cos * d, y + sin * d)) return d;
      d += step;
    }
    return maxDist;
  }
}
