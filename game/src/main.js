// HUSHFALL — a tiny stealth caper. Game orchestration: states, scoring, loop.
import { LEVELS, PLAYER, TILE, VIEW_W, VIEW_H, STORY } from './config.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Guard } from './guards.js';
import { drawWorld, formatTime } from './render.js';
import { sfx } from './sound.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = new Input();

const game = {
  state: 'title', // title | intro | play | caught | clear | win
  time: 0,
  levelIndex: 0,
  world: null,
  guards: [],
  player: null,
  levelName: '',
  tip: '',
  gemsTaken: 0,
  gemsTotal: 0,
  exitOpen: false,
  elapsed: 0,
  score: 0,
  levelStartScore: 0,
  maxAlertEver: 0,
  stateTimer: 0,
  message: '',
};

game.loadLevel = function loadLevel(index) {
  const level = LEVELS[index];
  this.levelIndex = index;
  this.world = new World(level);
  this.guards = level.guards.map((def) => new Guard(def));
  this.player = {
    pos: { ...this.world.start },
    angle: 0,
    crouching: false,
    sprinting: false,
    moving: false,
    stepAcc: 0,
  };
  this.levelName = level.name;
  this.tip = level.tip;
  this.gemsTaken = 0;
  this.gemsTotal = this.world.gems.length;
  this.exitOpen = false;
  this.elapsed = 0;
  this.maxAlertEver = 0;
  this.levelStartScore = this.score;
};

function startRun() {
  game.score = 0;
  game.loadLevel(0);
  game.state = 'intro';
  game.stateTimer = 0;
}

function updatePlay(dt) {
  const p = game.player;
  const axis = input.axis();
  p.moving = axis.x !== 0 || axis.y !== 0;
  p.crouching = input.held('c', 'control');
  p.sprinting = input.held('shift') && p.moving && !p.crouching;
  const speed = p.crouching ? PLAYER.crouch : p.sprinting ? PLAYER.sprint : PLAYER.walk;
  if (p.moving) {
    p.angle = Math.atan2(axis.y, axis.x);
    game.world.moveCircle(p.pos, PLAYER.radius, axis.x * speed * dt, axis.y * speed * dt);
    p.stepAcc += speed * dt;
    if (p.stepAcc > 46 && !p.sprinting) {
      p.stepAcc = 0;
      sfx.step();
    }
  }

  // Gems.
  for (const gem of game.world.gems) {
    if (!gem.taken && Math.hypot(gem.x - p.pos.x, gem.y - p.pos.y) < 20) {
      gem.taken = true;
      game.gemsTaken += 1;
      game.score += 100;
      sfx.gem();
      if (game.gemsTaken === game.gemsTotal) {
        game.exitOpen = true;
        game.message = 'The exit stands open.';
      }
    }
  }

  // Wardens.
  const events = {};
  for (const guard of game.guards) {
    guard.update(game.world, p, dt, events);
    game.maxAlertEver = Math.max(game.maxAlertEver, guard.alert);
  }
  if (events.caught) {
    game.state = 'caught';
    game.stateTimer = 0;
    game.score = game.levelStartScore;
    sfx.alarm();
    status.textContent = 'Caught! Press R to try the room again.';
    return;
  }

  // Exit.
  if (game.exitOpen) {
    const e = game.world.exit;
    if (Math.hypot(e.x - p.pos.x, e.y - p.pos.y) < 20) {
      const timeBonus = Math.max(0, 240 - Math.floor(game.elapsed)) * 2;
      const ghostBonus = game.maxAlertEver < 0.5 ? 300 : game.maxAlertEver < 0.85 ? 120 : 0;
      game.score += 400 + timeBonus + ghostBonus;
      game.message =
        ghostBonus === 300
          ? 'A ghost run — no warden ever truly saw you.'
          : ghostBonus === 120
            ? 'Clean work, though eyes lingered on you.'
            : 'Out — but the whole house is awake.';
      sfx.clear();
      if (game.levelIndex + 1 < LEVELS.length) {
        game.state = 'clear';
      } else {
        game.state = 'win';
      }
      game.stateTimer = 0;
      status.textContent = game.message;
      return;
    }
  }

  game.elapsed += dt;
}

function update(dt) {
  game.time += dt;
  switch (game.state) {
    case 'title':
      if (input.tapped('enter', ' ')) {
        sfx.unlock();
        startRun();
      }
      break;
    case 'intro':
      game.stateTimer += dt;
      if (input.tapped('enter', ' ') || game.stateTimer > 4.5) game.state = 'play';
      break;
    case 'play':
      if (input.tapped('r')) {
        game.score = game.levelStartScore;
        game.loadLevel(game.levelIndex);
        game.state = 'intro';
        game.stateTimer = 0;
        break;
      }
      updatePlay(dt);
      break;
    case 'caught':
      game.stateTimer += dt;
      if (input.tapped('r', 'enter')) {
        game.loadLevel(game.levelIndex);
        game.state = 'intro';
        game.stateTimer = 0;
      }
      break;
    case 'clear':
      game.stateTimer += dt;
      if (input.tapped('enter', ' ') || game.stateTimer > 4) {
        game.loadLevel(game.levelIndex + 1);
        game.state = 'intro';
        game.stateTimer = 0;
      }
      break;
    case 'win':
      if (input.tapped('enter', ' ')) startRun();
      break;
    default:
      break;
  }
  input.endFrame();
}

// ---------- overlays ----------

function panel(lines, opts = {}) {
  ctx.fillStyle = 'rgba(10,12,20,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  let y = opts.y ?? 150;
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, VIEW_W / 2, y);
    y += line.gap ?? 30;
  }
}

function drawOverlays() {
  if (game.state === 'title') {
    drawWorld(ctx, game);
    panel([
      { text: 'H U S H F A L L', font: 'bold 64px Georgia, serif', color: '#e8b64c', gap: 44 },
      { text: 'a tiny stealth caper', font: 'italic 20px Georgia, serif', color: '#9fd8c9', gap: 52 },
      ...STORY.map((text) => ({ text, font: '16px Georgia, serif', color: '#d7dce8', gap: 24 })),
      { text: '', font: '16px Georgia, serif', color: '#fff', gap: 20 },
      { text: 'WASD / arrows — move      C — crouch      Shift — sprint (loud!)', font: '15px system-ui, sans-serif', color: '#aeb6c6', gap: 26 },
      { text: 'Lift every gem, reach the exit, never be seen.', font: '15px system-ui, sans-serif', color: '#aeb6c6', gap: 46 },
      { text: 'Press Enter to begin', font: 'bold 19px system-ui, sans-serif', color: '#7ee2a8' },
    ], { y: 120 });
  } else if (game.state === 'intro') {
    drawWorld(ctx, game);
    panel([
      { text: game.levelName, font: 'bold 34px Georgia, serif', color: '#e8b64c', gap: 44 },
      { text: game.tip, font: '16px Georgia, serif', color: '#d7dce8', gap: 40 },
      { text: 'Press Enter', font: 'bold 17px system-ui, sans-serif', color: '#7ee2a8' },
    ], { y: 220 });
  } else if (game.state === 'caught') {
    drawWorld(ctx, game);
    panel([
      { text: 'CAUGHT', font: 'bold 56px Georgia, serif', color: '#ff5252', gap: 50 },
      { text: 'A warden’s hand lands on your shoulder. The gems stay behind.', font: '16px Georgia, serif', color: '#d7dce8', gap: 44 },
      { text: 'Press R to try the room again', font: 'bold 17px system-ui, sans-serif', color: '#7ee2a8' },
    ], { y: 210 });
  } else if (game.state === 'clear') {
    drawWorld(ctx, game);
    panel([
      { text: 'Room cleared', font: 'bold 40px Georgia, serif', color: '#7ee2a8', gap: 46 },
      { text: game.message, font: '16px Georgia, serif', color: '#d7dce8', gap: 34 },
      { text: `Score so far: ${game.score}`, font: '17px system-ui, sans-serif', color: '#e8b64c', gap: 44 },
      { text: 'Press Enter for the next room', font: 'bold 17px system-ui, sans-serif', color: '#7ee2a8' },
    ], { y: 200 });
  } else if (game.state === 'win') {
    drawWorld(ctx, game);
    const rank = game.score >= 2600 ? 'GHOST OF THE AURIC CLUB' : game.score >= 2000 ? 'MASTER OF HUSH' : game.score >= 1400 ? 'LIGHT-FINGERED' : 'LUCKY INTRUDER';
    panel([
      { text: 'THE VAULT IS EMPTY', font: 'bold 44px Georgia, serif', color: '#e8b64c', gap: 48 },
      { text: 'Every gem in the Auric Club, gone before dawn. No alarm, no witness.', font: '16px Georgia, serif', color: '#d7dce8', gap: 34 },
      { text: `Final score: ${game.score}`, font: 'bold 22px system-ui, sans-serif', color: '#fff', gap: 32 },
      { text: `Rank: ${rank}`, font: 'bold 19px system-ui, sans-serif', color: '#9fd8c9', gap: 48 },
      { text: 'Press Enter to steal it all again', font: 'bold 17px system-ui, sans-serif', color: '#7ee2a8' },
    ], { y: 170 });
  } else {
    drawWorld(ctx, game);
    if (game.message && game.state === 'play') {
      ctx.fillStyle = 'rgba(10,12,20,0.65)';
      ctx.fillRect(VIEW_W / 2 - 170, VIEW_H - 40, 340, 28);
      ctx.fillStyle = '#d9f99d';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.message, VIEW_W / 2, VIEW_H - 21);
    }
  }
}

// ---------- boot ----------

game.loadLevel(0);
const shot = new URLSearchParams(location.search).get('shot');
if (shot) applyShot(game, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!shot) update(dt);
  else game.time += dt;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawOverlays();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export { game, formatTime, TILE };
