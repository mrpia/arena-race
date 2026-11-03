// Everything a kid might want to tweak lives here.

export interface Controls {
  up: string;
  down: string;
  left: string;
  right: string;
  action: string;
}

export interface PlayerConfig {
  name: string;
  emoji: string;
  color: string;
  start: { x: number; y: number }; // fraction of the arena: 0 = left/far edge, 1 = right/near edge
  controls: Controls;
}

// Screen size in CSS pixels. Updated to the window size whenever it changes.
export const VIEW = { width: 960, height: 600 };

// The playing field, in world units. (0,0) is the far-left corner.
// It grows and shrinks with the window, so a bigger window = more room to run.
export const ARENA = { width: 800, height: 450 };
// The arena never gets smaller than this; in tiny windows the view zooms out instead.
export const ARENA_MIN = { width: 500, height: 300 };
// Zoom: screen pixels per world unit at the near edge. Bigger = bigger players, smaller arena.
export const PIXELS_PER_UNIT = 1.2;

// The two camera views. The 2D/3D button on the left switches between them while playing.
// perspective: 0 = straight top-down. 0.3 = far edge is 30% narrower, like a tilted camera.
// depthSquash: how much the floor is squashed vertically (1 = not at all).
// rings: height of the ring and shadow under each player, compared to their width (1 = round).
// wall: height in pixels of the wall along the front edge of the floor (0 = no wall).
export const CAMERAS = {
  '2d': { name: '2D', perspective: 0, depthSquash: 1, rings: 1, wall: 0 },
  '3d': { name: '3D', perspective: 0.3, depthSquash: 0.8, rings: 0.4, wall: 24 },
};
export type CameraName = keyof typeof CAMERAS;
export const CAMERA: CameraName = '3d'; // the view the game starts in

export const PLAYER_RADIUS = 28;
export const PLAYER_SPEED = 320; // world units per second
export const PLAYER_GRIP = 12; // higher = snappier start/stop, lower = icy
export const HOP_SPEED = 520;
export const GRAVITY = 1800;

export const COLORS = {
  background: '#1b1f2a',
  text: '#ffffff',
};

// Floors for the floor picker under the 2D/3D button, in the order it shows them.
// Floors are only paint: players can walk anywhere. Sizes are in world units.
export const FLOORS = {
  street: { name: 'Street', emoji: '🛣️' },
  wood: { name: 'Wooden floor', emoji: '🪵' },
  arcade: { name: 'Arcade', emoji: '🕹️' },
  chess: { name: 'Chess board', emoji: '♟️' },
  ice: { name: 'Frozen lake', emoji: '🧊' },
  moon: { name: 'Moon', emoji: '🌕' },
  map: { name: 'Treasure map', emoji: '🗺️' },
  bricks: { name: 'Brick baseplate', emoji: '🧱' },
  lava: { name: 'The floor is lava', emoji: '🌋' },
};
export type FloorName = keyof typeof FLOORS;
export const FLOOR: FloorName = 'street'; // the floor the game starts on

export const STREET = {
  sidewalk: 50, // depth of the sidewalks along the far and near edges
  line: 3, // thickness of the painted lines
  dash: 40, // length of each yellow dash
  dashGap: 30,
  crossingWidth: 80, // zebra crossing in the middle of the road
  stripe: 14, // thickness of each zebra stripe (the gaps are the same)
  manholeRadius: 20,
  colors: {
    asphalt: '#4f5359',
    sidewalk: '#b4b6b9',
    sidewalkLines: 'rgba(0,0,0,0.2)', // gaps between the paving slabs
    curb: '#d6d8da',
    roadLines: '#f1f1f1', // edge lines and zebra crossing
    centerLine: '#f2c230', // dashed line down the middle
    manhole: '#3a3d42',
    manholeRim: 'rgba(255,255,255,0.2)',
    wall: '#85888c', // front edge of the floor
  },
};

export const WOOD = {
  plankWidth: 30, // front to back
  plankLength: 160,
  knots: 0.25, // share of planks with a knot (0 = none, 1 = all)
  colors: {
    planks: ['#8f5e38', '#835431', '#9a6840'], // each plank picks one of these
    gaps: 'rgba(40,20,5,0.5)',
    knot: 'rgba(60,30,10,0.45)',
    wall: '#5a3a22',
  },
};

export const ARCADE = {
  tile: 50,
  litTiles: 0.15, // share of tiles that glow (0 = none, 1 = all)
  litBrightness: 0.45, // how strongly lit tiles are filled in (0 = only the glowing outline, 1 = solid)
  colors: {
    floor: '#2a1d4f',
    grid: 'rgba(179,107,255,0.6)',
    border: '#ff4fd8',
    lit: ['#ff4fd8', '#4de8ff', '#ffe14d'],
    wall: '#1a1033',
  },
};

export const CHESS = {
  square: 60, // roughly; it stretches a little so the board ends in whole squares
  frame: 18, // wooden frame around the board
  colors: {
    light: '#eeeed2',
    dark: '#769656',
    frame: '#5a3a22',
    frameLine: '#c9a35a', // thin line between the frame and the squares
    wall: '#3f2817',
  },
};

export const ICE = {
  cracks: 7,
  scratches: 12, // curvy lines left by skates
  colors: {
    ice: '#dcecf5',
    patches: 'rgba(150,195,220,0.35)',
    scratches: 'rgba(110,150,175,0.35)',
    cracks: 'rgba(60,110,140,0.6)',
    snow: '#ffffff',
    snowShade: 'rgba(120,160,190,0.45)',
    wall: '#9cc3d6',
  },
};

export const MOON = {
  craters: 14,
  rocks: 14,
  colors: {
    dust: '#bdbdb7',
    speckles: 'rgba(0,0,0,0.12)',
    craterRim: 'rgba(255,255,255,0.4)',
    craterFloor: 'rgba(0,0,0,0.15)',
    rock: '#7d7b75',
    wall: '#7a7a76',
  },
};

export const TREASURE_MAP = {
  colors: {
    table: '#5a3a22', // shows around the torn edges of the map
    paper: '#ecd9a8',
    paperEdge: '#b08850',
    lines: 'rgba(120,80,40,0.18)',
    stains: 'rgba(140,90,40,0.14)',
    ink: '#6b4a2b', // mountains and compass
    trail: '#8b2e1f',
    x: '#c0281e',
    wall: '#3f2817',
  },
};

export const BRICKS = {
  stud: 32, // distance between studs
  colors: {
    plate: '#f4c430',
    studTop: '#ffd75e',
    studSide: 'rgba(140,90,0,0.45)',
    shine: 'rgba(255,255,255,0.6)',
    wall: '#c2931a',
  },
};

export const LAVA = {
  cracks: 10,
  pulseSpeed: 2, // how fast the glow throbs (0 = still)
  colors: {
    rock: '#574a46',
    rockPatches: 'rgba(0,0,0,0.15)',
    glow: '#ff5a00',
    hot: '#ffd23f', // the bright middle of cracks and pools
    wall: '#2a2220',
  },
};

// Key names are KeyboardEvent.code values: they mean the physical key position,
// so WASD works the same on QWERTY, QWERTZ and AZERTY keyboards.
export const PLAYERS: PlayerConfig[] = [
  {
    name: 'Player 1',
    emoji: '🐱',
    color: '#ff6b6b',
    start: { x: 0.2, y: 0.5 },
    controls: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'Space' },
  },
  {
    name: 'Player 2',
    emoji: '🐶',
    color: '#4dabf7',
    start: { x: 0.8, y: 0.5 },
    controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Enter' },
  },
];
