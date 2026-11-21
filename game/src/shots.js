// Screenshot poses for HUSHFALL. The game reads ?shot=<name> so its maker can
// capture real renders of fixed scenes: title, play (a mid-heist moment on
// level II) and win. Nothing here runs during normal play.
export function applyShot(game, name) {
  if (name === 'title') {
    game.state = 'title';
    game.loadLevel(0);
    return;
  }
  if (name === 'win') {
    game.loadLevel(2);
    game.score = 2450;
    game.state = 'win';
    return;
  }
  // 'play': level II, Wren mid-heist, one warden suspicious.
  game.loadLevel(1);
  game.state = 'play';
  const [g0, g1] = game.guards;
  g0.pos = { x: 8.5 * 36, y: 7.5 * 36 };
  g0.angle = -0.5;
  g0.alert = 0.52;
  g0.state = 'stare';
  g1.pos = { x: 16.5 * 36, y: 3.5 * 36 };
  g1.angle = 2.6;
  game.player.pos = { x: 5.4 * 36, y: 7.6 * 36 };
  game.player.angle = 0.2;
  game.player.crouching = true;
  game.world.gems[2].taken = true;
  game.gemsTaken = 1;
  game.elapsed = 47;
}
