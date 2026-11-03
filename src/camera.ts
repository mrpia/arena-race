// Turns world positions (ARENA units) into screen positions. Everything on screen goes through project().
import { ARENA, ARENA_MIN, CAMERA, CAMERAS, type CameraName, PIXELS_PER_UNIT, VIEW } from './config';

// Where the arena sits on screen.
const FLOOR_TOP = 110; // room for the HUD above
const FLOOR_SIDE = 60; // room for the buttons on the left
const FLOOR_BOTTOM = 64; // room for the front wall and the debug line below
let roomW = 1;
let roomH = 1;
let floorHeight = 0;
let PX = PIXELS_PER_UNIT; // screen pixels per world unit at the near edge

// Starts at the config value; the 2D/3D button changes it.
let camera = CAMERAS[CAMERA];
export function setCamera(name: CameraName): void {
  camera = CAMERAS[name];
  zoomToFit();
}
// The current view's settings, for drawing things that look different in 2D and 3D.
export function currentCamera(): (typeof CAMERAS)[CameraName] {
  return camera;
}

// Fit the screen to a new window size and grow or shrink the arena to fill it.
// The arena is sized for the 3D view, so switching views never changes the playing field.
export function fitToScreen(width: number, height: number): void {
  VIEW.width = width;
  VIEW.height = height;
  roomW = Math.max(1, width - 2 * FLOOR_SIDE);
  roomH = Math.max(1, height - FLOOR_TOP - FLOOR_BOTTOM);
  ARENA.width = Math.max(ARENA_MIN.width, Math.floor(roomW / PIXELS_PER_UNIT));
  ARENA.height = Math.max(ARENA_MIN.height, Math.floor(roomH / (PIXELS_PER_UNIT * CAMERAS['3d'].depthSquash)));
  zoomToFit();
}

// Zoom out only if the arena doesn't fit: the minimum arena in a tiny window,
// or the 2D view, whose unsquashed floor needs more height than the 3D view.
function zoomToFit(): void {
  PX = Math.min(PIXELS_PER_UNIT, roomW / ARENA.width, roomH / (ARENA.height * camera.depthSquash));
  floorHeight = ARENA.height * PX * camera.depthSquash;
}

// How big things are at depth y: smaller toward the far (top) edge.
export function scaleAt(y: number): number {
  return 1 - camera.perspective * (1 - y / ARENA.height);
}

// World (x, y, height z) -> screen position.
export function project(x: number, y: number, z = 0): { sx: number; sy: number; s: number } {
  const s = scaleAt(y);
  return {
    sx: VIEW.width / 2 + (x - ARENA.width / 2) * PX * s,
    sy: FLOOR_TOP + (y / ARENA.height) * floorHeight - z * PX * s,
    s,
  };
}

// How many screen pixels a world length takes up at depth y.
export function toPixels(length: number, y: number): number {
  return length * PX * scaleAt(y);
}
