// Canvas rendering for HUSHFALL: lamplit marble, shadow pools, vision cones.
import { TILE, COLS, ROWS, HUD_H, GUARD } from './config.js';

const CONE_STEPS = 26;

export function drawWorld(ctx, game) {
  const { world } = game;
  ctx.save();
  ctx.translate(0, HUD_H);

  // Tiles.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = world.tiles[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#2c3140';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3a4157';
        ctx.fillRect(x, y, TILE, 7);
        ctx.fillStyle = '#222634';
        ctx.fillRect(x, y + TILE - 5, TILE, 5);
      } else if (ch === 'B') {
        ctx.fillStyle = '#191d29';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#8a6a3f';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#6d5330';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + TILE - 5, y + TILE - 5);
        ctx.moveTo(x + TILE - 5, y + 5);
        ctx.lineTo(x + 5, y + TILE - 5);
        ctx.stroke();
      } else {
        const dark = (r + c) % 2 === 0;
        ctx.fillStyle = ch === ',' ? (dark ? '#141a2e' : '#171e33') : dark ? '#232838' : '#262c40';
        ctx.fillRect(x, y, TILE, TILE);
        if (ch === ',') {
          ctx.fillStyle = 'rgba(120,150,255,0.10)';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
        if (ch === '%') {
          ctx.fillStyle = '#5a4632';
          ctx.fillRect(x + TILE / 2 - 6, y + TILE - 13, 12, 9);
          ctx.fillStyle = '#2e7d4f';
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.5;
            ctx.beginPath();
            ctx.ellipse(
              x + TILE / 2 + Math.cos(a) * 9,
              y + TILE / 2 + Math.sin(a) * 7,
              8,
              4.5,
              a,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        if (ch === 'E') drawExit(ctx, x, y, game.exitOpen);
      }
    }
  }

  // Gems.
  for (const gem of world.gems) {
    if (gem.taken) continue;
    const bobY = Math.sin(game.time * 3 + gem.x) * 2.5;
    ctx.save();
    ctx.translate(gem.x, gem.y + bobY);
    ctx.fillStyle = '#ffd94d';
    ctx.strokeStyle = '#a87f14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(-4, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Vision cones under the characters.
  for (const guard of game.guards) drawCone(ctx, game.world, guard);

  for (const guard of game.guards) drawGuard(ctx, guard, game.time);
  drawPlayer(ctx, game.player, game.time);

  ctx.restore();
  drawHud(ctx, game);
}

function drawExit(ctx, x, y, open) {
  ctx.fillStyle = open ? '#3f6212' : '#4a2f35';
  ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 2);
  ctx.strokeStyle = open ? '#a3e635' : '#8a4a52';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 2, TILE - 8, TILE - 2);
  ctx.fillStyle = open ? '#d9f99d' : '#c98a92';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : '✕', x + TILE / 2, y + TILE / 2 + 5);
}

function drawCone(ctx, world, guard) {
  const { visionRange, visionHalfAngle } = GUARD;
  let fill;
  if (guard.state === 'chase') fill = 'rgba(255,64,64,0.30)';
  else if (guard.alert > 0.55) fill = 'rgba(255,140,40,0.30)';
  else if (guard.alert > 0.15) fill = 'rgba(255,205,60,0.30)';
  else fill = 'rgba(255,220,120,0.16)';
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(guard.pos.x, guard.pos.y);
  for (let i = 0; i <= CONE_STEPS; i++) {
    const a = guard.angle - visionHalfAngle + (i / CONE_STEPS) * visionHalfAngle * 2;
    const d = world.raycast(guard.pos.x, guard.pos.y, a, visionRange);
    ctx.lineTo(guard.pos.x + Math.cos(a) * d, guard.pos.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard, time) {
  const { x, y } = guard.pos;
  const bob = Math.sin(guard.bob) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  // body: deep red uniform
  ctx.fillStyle = '#7a2230';
  ctx.beginPath();
  ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4c1420';
  ctx.lineWidth = 2;
  ctx.stroke();
  // cap brim toward facing
  ctx.rotate(guard.angle);
  ctx.fillStyle = '#e8b64c';
  ctx.fillRect(2, -3, 12, 6);
  ctx.fillStyle = '#f5d78a';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // alert marker
  if (guard.alert > 0.12) {
    ctx.save();
    ctx.translate(x, y - 24);
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (guard.state === 'chase' || guard.alert > 0.85) {
      ctx.fillStyle = '#ff5252';
      ctx.fillText('!', 0, 0);
    } else if (guard.alert > 0.4) {
      ctx.fillStyle = '#ffb020';
      ctx.fillText('!', 0, 0);
    } else {
      ctx.fillStyle = '#ffe082';
      ctx.fillText('?', 0, 0);
    }
    ctx.restore();
  }
  void time;
}

function drawPlayer(ctx, player, time) {
  const { x, y } = player.pos;
  ctx.save();
  ctx.translate(x, y);
  if (player.crouching) ctx.scale(0.82, 0.82);
  // cloak
  ctx.fillStyle = '#2f6f5e';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d463c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // hood, toward facing
  ctx.rotate(player.angle);
  ctx.fillStyle = '#9fd8c9';
  ctx.beginPath();
  ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // soft pulse while sprinting (noise ring)
  if (player.sprinting && player.moving) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,220,255,0.35)';
    ctx.lineWidth = 1.5;
    const rr = 14 + ((time * 40) % 26);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#10131d';
  ctx.fillRect(0, 0, COLS * TILE, HUD_H);
  ctx.fillStyle = '#e8b64c';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.levelName, 12, 28);
  ctx.fillStyle = '#d7dce8';
  ctx.font = '14px system-ui, sans-serif';
  const gems = `${game.gemsTaken} / ${game.gemsTotal} gems`;
  ctx.fillText(gems, 330, 28);
  ctx.fillText(formatTime(game.elapsed), 470, 28);
  ctx.fillText(`score ${game.score}`, 560, 28);

  // The eye: how close the most-alert warden is to spotting you.
  const maxAlert = game.guards.reduce((m, g) => Math.max(m, g.alert), 0);
  ctx.textAlign = 'right';
  if (maxAlert > 0.85) {
    ctx.fillStyle = '#ff5252';
    ctx.fillText('SEEN!', COLS * TILE - 96, 28);
  } else if (maxAlert > 0.4) {
    ctx.fillStyle = '#ffb020';
    ctx.fillText('spotted?', COLS * TILE - 96, 28);
  } else if (maxAlert > 0.1) {
    ctx.fillStyle = '#ffe082';
    ctx.fillText('a glance…', COLS * TILE - 96, 28);
  } else {
    ctx.fillStyle = '#7ee2a8';
    ctx.fillText('unseen', COLS * TILE - 96, 28);
  }
  ctx.fillStyle = '#2a3042';
  ctx.fillRect(COLS * TILE - 88, 16, 76, 10);
  ctx.fillStyle = maxAlert > 0.85 ? '#ff5252' : maxAlert > 0.4 ? '#ffb020' : '#ffe082';
  ctx.fillRect(COLS * TILE - 88, 16, 76 * Math.min(1, maxAlert), 10);
}

export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
