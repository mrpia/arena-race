// Everything a kid might want to tweak lives here.

export interface Controls {
  up: string; // not used yet: the cars always drive at the same speed unless you brake
  brake: string; // hold to drive at BRAKE_SPEED
  left: string; // left and right steer the car
  right: string;
  drift: string; // hold while steering to slide through the corner (see DRIFT)
}

export interface PlayerConfig {
  name: string;
  emoji: string; // shown before the name, at the top and in "🐱 Player 1 gewinnt!"
  color: string; // the car's paint
  // Where across the start line the car starts: 0 = the track's left edge, 1 = its right edge
  // (as seen from the driver's seat). Cars start just behind the line, pointing along the track.
  lane: number;
  controls: Controls;
}

// Screen size in CSS pixels. Updated to the window size whenever it changes.
export const VIEW = { width: 960, height: 600 };

// The playing field, in world units. (0,0) is the far-left corner.
// It grows and shrinks with the window, so a bigger window = more room to run.
export const ARENA = { width: 800, height: 450 };
// The arena never gets smaller than this; in tiny windows the view zooms out instead.
export const ARENA_MIN = { width: 500, height: 300 };
// Zoom: screen pixels per world unit. The arena is as many world units wide as fit in the window
// at this zoom. Bigger = bigger players, smaller arena.
export const PIXELS_PER_UNIT = 1.2;

// The camera views, in the order the view row under START shows them and J and K go through them.
// fov (all views): how wide the camera sees, in degrees. Wider = stronger perspective.
//
// 2D and 3D look at the whole arena from its near (bottom) side and zoom so the floor fits the window.
//   tilt: 0 = looking straight down, 90 = looking along the floor from its near edge.
//   fov 0 = no perspective at all: far things look as big as near ones.
//
// The others ride along with the car. With two cars the screen is split (SPLIT_SCREEN): player 1's
// car on the left half, player 2's on the right, each with its own camera.
//   behind: how far behind the middle of the car the camera is (below 0 = in front of the middle)
//   height: how high above the floor the camera is
//   lookAhead: the camera looks at the floor this far in front of the car
//   swing: about how many seconds the camera lags behind the car's turns (0 = turns exactly with it)
//   inside: the camera sits in the car, so the car's own driver (the helmet) and windshield are hidden
export const CAMERAS = {
  '2d': { name: '2D', tilt: 0, fov: 0 },
  '3d': { name: '3D', tilt: 30, fov: 40 },
  behind: { name: '🚗', fov: 60, behind: 140, height: 65, lookAhead: 100, swing: 0.25, inside: false },
  driver: { name: '👀', fov: 65, behind: 0, height: 26, lookAhead: 220, swing: 0, inside: true },
};
export type CameraName = keyof typeof CAMERAS;
export const CAMERA: CameraName = '2d'; // the view the game starts in

// Keys that switch the view for everyone, like the view row: back and forward through CAMERAS.
// Racing alone they work at any time. In a two-player race they only work before the start and
// after the finish, so nobody can switch the other player's half in the middle of a race.
export const VIEW_KEYS = { back: 'KeyJ', next: 'KeyK' };

// Two cars riding along: each player gets half the screen, side by side.
export const SPLIT_SCREEN = {
  gap: 4, // the line between the two halves, in screen pixels (it has the page's color, COLORS.background)
};

// In split screen, a small map of the track at the top in the middle, with a dot for each car.
// North is up, as in the 2D view. In small windows it shrinks to stay clear of the winner's line.
export const TRACK_MAP = {
  width: 200, // in screen pixels; the height follows the arena's shape
  top: 58, // from the top of the window to the map's box, just under the GitHub icon
  edge: 1.5, // the white lines along both edges of the track, in screen pixels
  carSize: 5, // how big each car's dot is (its radius), in screen pixels
  colors: {
    background: 'rgba(20,24,34,0.92)', // like the floor row, so the line between the halves hardly shows through
    track: '#6b6f76',
    edge: '#f1f1f1',
    start: '#ffd43b', // the start/finish line
  },
};

// The 3D scene: the sun, its shadows, and the floor everything stands on.
export const SCENE = {
  sunFrom: 225, // where the sun shines from, in degrees: 0 = right, 90 = near edge, 180 = left, 270 = far edge
  sunHeight: 40, // degrees above the floor: 90 = straight overhead (short shadows), lower = longer shadows
  shadowDarkness: 0.5, // 0 = no shadows, 1 = black shadows. Sides facing away from the sun get this dark too.
  shadowSoftness: 2, // how blurry the edges of shadows are (0 = sharp)
  floorThickness: 40, // the floor is a slab this thick; its front side shows in the 3D view
  floorSharpness: 2, // pixels of floor picture per world unit: higher = sharper, but takes more memory (and time, on lava)
  sky: '#8ecae6', // behind the arena in the views that ride along with the car
};

export const PLAYER_RADIUS = 24; // how close two cars get before they bump
export const PLAYER_SPEED = 260; // world units per second. There's no gas pedal: cars always drive this fast.
export const OFF_TRACK_SPEED = 0.45; // off the track (on the grass) cars are slower: 0.5 = half as fast, 1 = no slowdown
export const BRAKE_SPEED = 0.5; // while braking, cars drive this share of their speed: half as fast = twice as tight a turn
export const TURN_SPEED = 180; // degrees per second while steering (360 = a full circle in one second)
export const PLAYER_GRIP = 12; // higher = the car goes where its nose points, lower = it slides like on ice

// Hold the drift key while steering: the tires lose grip and the nose swings round faster,
// so the car slides sideways through the corner. Let go and it shoots off where the nose points.
export const DRIFT = {
  grip: 4, // grip while drifting (PLAYER_GRIP is the normal grip): lower = slides more
  turnSpeed: 250, // degrees per second while drifting (TURN_SPEED is the normal one)
};

// Black marks the back wheels leave on the asphalt while drifting.
export const SKID_MARKS = {
  slide: 10, // degrees between where the nose points and where the car goes before marks appear
  width: 3, // in world units
  fadeTime: 8, // seconds until a mark is gone
  max: 3000, // the oldest marks disappear early when there are more than this
  color: 'rgba(20,20,20,0.55)',
};

// What the cars look like, in world units. Each car is painted in its player's color.
export const CAR = {
  length: 60,
  width: 32,
  height: 8, // thickness of the body
  rideHeight: 4, // gap between the floor and the bottom of the body
  wheel: { radius: 7, width: 8 },
  helmetSize: 0.45, // the driver's helmet, compared to the car's width
  // Where the wheels sit, measured from the middle as a share of half the car's length.
  axles: { front: 0.55, back: 0.6 },
  // The front wheels turn with the steering keys. Only a look: the turning circle stays TURN_SPEED's.
  steer: {
    angle: 25, // degrees the front wheels turn while steering
    time: 0.06, // about how many seconds they take to swing over (0 = at once)
  },
  // The body leans on its springs, also only a look. It leans out of turns, dips its nose when the
  // car slows down (brake, grass, tires) and lifts it when the car speeds up (after "LOS!").
  lean: {
    side: 6, // degrees the body leans out in a full-speed turn at full lock
    nose: 3, // degrees the nose dips or lifts for the same push forward or back
    max: 8, // it never leans further than this, even crashing into the tires
    bounces: 2.5, // how quickly the springs bounce, in bounces per second
    damping: 0.5, // 0 = the body keeps on wobbling, 1 = it settles without a wobble
  },
  colors: {
    wheels: '#1e1e1e',
    windshield: 'rgba(25,35,55,0.75)',
    stripe: 'rgba(255,255,255,0.85)', // racing stripe down the middle
    helmet: '#f4f4f4',
    visor: '#1e2433', // the dark glass on the front of the helmet
  },
};
export const COLORS = {
  background: '#1b1f2a',
  text: '#ffffff',
};

// The race: how many laps you need to win, and the words shown on screen.
export const RACE = {
  laps: 3, // laps you have to drive to win
  lapText: 'Runde', // shown as "Runde 2/3" next to each player's name
  finishedText: '🏁 Ziel!', // next to the name once you've done all the laps
  winText: 'gewinnt!', // "🐱 Player 1 gewinnt!"
  tieText: 'Unentschieden!', // both cars cross the line at the same moment
  startText: 'START', // the button in the middle, before the race and again after it
  // Under it, a row to pick one or two players, shown as the players' emojis (🐱 or 🐱🐶). These texts
  // show when the mouse rests on a choice. With one player, player 1's car races alone against the
  // clock, steered by either side's keys. The cars on the start line follow the choice.
  playerTitles: { one: '1 Spieler', two: '2 Spieler' },
  firstPlayers: 2 as 1 | 2, // the choice the page opens with; a reload goes back to it
  // Above the start button on phones and tablets, where nobody can drive. Gone after the first key press.
  keyboardHint: '⌨️ Zum Fahren brauchst du eine Tastatur.',
  recordText: 'Rekord', // best time with one player, shown as "Rekord: 41.3 s"
  newRecordText: '🏆 Neuer Rekord!',
  recordColor: '#ffd43b', // color of the new record text
};

// The GitHub icon at the top in the middle: opens the game's code in a new tab, to read it,
// copy it, or suggest an idea. The title shows when the mouse rests on the icon.
export const GITHUB = {
  url: 'https://github.com/mrpia/arena-race',
  title: 'Der Code des Spiels auf GitHub',
};

// During the countdown and the race, a pause button takes the GitHub icon's place at the top. It
// opens a menu in the middle: go on (after a countdown, so everyone has their hands back on the
// keys) or quit the race (no winner, no record, back to the start button).
export const PAUSE = {
  key: 'Escape', // pauses, and pressed again goes on
  button: '⏸️',
  title: 'Pause', // shows when the mouse rests on the button, with the key: "Pause (Escape)"
  text: 'Pause', // the heading of the menu
  resume: 'Weiter',
  quit: 'Beenden',
};

// Before the race: a start button, then a countdown. The cars wait at the start line until it's done.
export const COUNTDOWN = {
  from: 3, // counts 3, 2, 1
  step: 1, // seconds each number stays up
  go: 'LOS!', // shown when the cars may drive
  goTime: 0.8, // seconds the go sign stays up (the cars are already driving)
  colors: {
    numbers: '#ffd43b',
    go: '#51cf66',
    outline: '#1b1f2a',
  },
};

// The race track. It lies on top of whichever floor is picked, and off the track the cars are slower.
export const TRACK = {
  // The middle of the track runs through these points, in fractions of the arena
  // (x: 0 = left edge, 1 = right edge; y: 0 = far edge, 1 = near edge).
  // It curves smoothly between them; points close together make a tight corner.
  // The first point is the start/finish line, and the cars drive from it toward the second.
  // Keep the track from touching itself, or the cars can jump across.
  points: [
    [0.5, 0.867], // start/finish line
    [0.7, 0.867],
    [0.82, 0.85], // turn 1: a fast left
    [0.885, 0.767],
    [0.9, 0.633],
    [0.9, 0.367],
    [0.89, 0.2], // the hairpin: all the way round to the left
    [0.82, 0.117],
    [0.75, 0.2],
    [0.74, 0.4],
    [0.73, 0.533], // a right, into the middle
    [0.66, 0.6],
    [0.54, 0.6],
    [0.49, 0.6], // the chicane: right, left, right
    [0.44, 0.517],
    [0.38, 0.5],
    [0.33, 0.433],
    [0.32, 0.3],
    [0.3, 0.167], // a tight left at the top
    [0.24, 0.133],
    [0.16, 0.133],
    [0.09, 0.2],
    [0.08, 0.333],
    [0.08, 0.7],
    [0.1, 0.817],
    [0.18, 0.867],
    [0.3, 0.867],
  ] as [number, number][],
  width: 0.16, // compared to the arena's height, so the track keeps its shape in every window size
  edgeLine: 3, // thickness of the white lines along both edges, in world units
  kerb: 9, // width of the red and white kerbs, in world units
  kerbCorners: 2.5, // corners tighter than this many track widths get kerbs (0 = no kerbs)
  colors: {
    asphalt: '#55585e',
    edge: '#f1f1f1',
    kerb: ['#d62828', '#f1f1f1'],
    checker: ['#1e1e1e', '#f1f1f1'], // start/finish line
  },
};

// Walls of old tires around the whole track, so nobody can take a shortcut across the grass.
// They're placed automatically, so they follow the track when you change TRACK.points.
// Drive into them and you bounce back.
export const TIRES = {
  runoff: 40, // grass between the edge of the track and the middle of the tires, in world units
  radius: 9, // size of each tire
  stack: 2, // tires piled on top of each other
  bounce: 0.8, // how fast cars bounce back (0 = they just stop, 1 = as fast as they came)
  bounceTime: 0.3, // seconds a car slides back before it drives again (you can still steer)
  colors: {
    rubber: '#1c1c1c',
    inside: '#3d3d3d', // the floor under each tire, seen through the hole in the middle
  },
};

// Floors for the floor row under START, in the order it shows them.
// Floors are only paint; the race track is painted on top of every floor. Sizes are in world units.
export const FLOORS = {
  grass: { name: 'Grass', emoji: '🌱' },
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
export const FLOOR: FloorName = 'grass'; // the floor the game starts on

export const GRASS = {
  stripe: 60, // width of each mowed stripe
  tufts: 60,
  colors: {
    grass: '#4c9a3c',
    stripes: 'rgba(255,255,255,0.07)',
    tufts: 'rgba(20,70,20,0.35)',
    wall: '#5b3b1e', // front edge of the floor: earth
  },
};

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
    lane: 0.2,
    controls: { up: 'KeyW', brake: 'KeyS', left: 'KeyA', right: 'KeyD', drift: 'Space' },
  },
  {
    name: 'Player 2',
    emoji: '🐶',
    color: '#4dabf7',
    lane: 0.8,
    controls: { up: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', drift: 'Enter' },
  },
];
