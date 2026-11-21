// HUSHFALL — a tiny stealth caper. Configuration and level designs.
// All maps are 24 tiles wide and 15 tiles tall. Legend:
//   #  stone wall (solid, blocks sight)
//   B  wooden crate (solid, blocks sight)
//   .  marble floor
//   ,  shadow floor (detection builds at half rate while you stand here)
//   %  potted fern (hides a crouching thief almost completely)
//   P  player start        E  exit door        G  gem
export const TILE = 36;
export const COLS = 24;
export const ROWS = 15;
export const HUD_H = 44;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE + HUD_H;

export const PLAYER = {
  radius: 11,
  walk: 128, // px per second
  sprint: 208,
  crouch: 66,
  noiseRadius: 96, // sprinting is heard this far
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 56,
  chaseSpeed: 118,
  investigateSpeed: 92,
  visionRange: 158,
  visionHalfAngle: 0.62, // radians, ~35.5 degrees
  nearRadius: 30, // bump into a guard and you are caught, cone or not
  pauseSec: 1.1,
  lookSec: 1.6,
};

export const LEVELS = [
  {
    name: 'I — The Counting House',
    tip: 'Cross the hall, lift both gems, slip out. Stay out of the yellow cones.',
    map: [
      '########################',
      '#..........##..........#',
      '#..G.......##.....B....#',
      '#..........##..........#',
      '#....BB..........BB....#',
      '#....BB................#',
      '#..........,,..........#',
      '#####.######,,#####.####',
      '#..........,,.....#....#',
      '#..P.......,,.....#..G.#',
      '#..........,,.....#....#',
      '#....%%..........BB....#',
      '#....%%................#',
      '#..........##......E...#',
      '########################',
    ],
    guards: [
      { path: [[5, 2], [5, 12], [17, 12], [17, 2]] },
      { path: [[20, 9], [12, 9], [12, 5], [20, 5]] },
    ],
  },
  {
    name: 'II — The Gallery of Glass',
    tip: 'Ferns hide a crouching thief. Sprinting is loud: wardens will come and look.',
    map: [
      '########################',
      '#..G....#......#....G..#',
      '#.......#......#.......#',
      '#..%%...#..,,..#...%%..#',
      '#..%%......,,......%%..#',
      '#####.####....####.#####',
      '#..........BB..........#',
      '#..P.......BB.....G....#',
      '#......................#',
      '#####.######.######.####',
      '#.......#......#.......#',
      '#..G....#..,,..#....#..#',
      '#.......#..,,..#....#E.#',
      '#....%......%......##..#',
      '########################',
    ],
    guards: [
      { path: [[5, 7], [9, 7], [11, 2], [3, 2]] },
      { path: [[20, 2], [20, 7], [13, 7], [13, 12]] },
      { path: [[6, 12], [16, 12], [16, 10], [6, 10]] },
    ],
  },
  {
    name: 'III — The Gilded Vault',
    tip: 'Four wardens, one fortune. Patience is the master key.',
    map: [
      '########################',
      '#.G....#.......#.....G.#',
      '#......#...B...#.......#',
      '#..##..#...B...#..##...#',
      '#..##......B.......##..#',
      '#......,,......,,......#',
      '###.####,,.##.,,####.###',
      '#......,,..##..,,......#',
      '#..P...,,..##..,,...G..#',
      '#..........##..........#',
      '#..%%....B....B....%%..#',
      '#..%%..............%%..#',
      '#.....#....GG....#.....#',
      '#..G..#..........#..E..#',
      '########################',
    ],
    guards: [
      { path: [[5, 5], [5, 9], [10, 9], [10, 5]] },
      { path: [[18, 5], [13, 5], [13, 9], [18, 9]] },
      { path: [[11, 1], [11, 12], [12, 12], [12, 1]] },
      { path: [[21, 8], [16, 12], [7, 12], [2, 8]] },
    ],
  },
];

export const STORY = [
  'The Auric Club keeps its fortune behind marble and lamplight,',
  'guarded by wardens who never blink. You are Wren, the quietest',
  'thief in the city. Tonight: three rooms, every gem, no witnesses.',
];
