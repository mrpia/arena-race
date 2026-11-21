// The camera the 3D scene is seen through, aimed and zoomed so the floor fills the window.
// In the scene, a spot (x, y) on the floor is (x, 0, y), and height above the floor is the y axis.
import { type Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { ARENA, ARENA_MIN, CAMERA, CAMERAS, type CameraName, PIXELS_PER_UNIT, SCENE, VIEW } from './config';

// Where the floor sits on screen.
const FLOOR_TOP = 110; // room for the HUD above
const FLOOR_SIDE = 60; // room for the buttons on the left
const FLOOR_BOTTOM = 64; // room for the front of the floor and the debug line below

// The arena's height is worked out as if the floor took up only 80% of its depth on screen,
// like the tilted view before three.js (step 17 in docs/decisions.md). Keep this number:
// records are saved per arena size, so changing it would lose every best time.
const ARENA_SQUASH = 0.8;

let roomW = 1;
let roomH = 1;
let name: CameraName = CAMERA;
const flat = new OrthographicCamera();
const deep = new PerspectiveCamera();

export function setCamera(next: CameraName): void {
  name = next;
  aim();
}

// The current view's settings, for drawing things that look different in 2D and 3D.
export function currentCamera(): (typeof CAMERAS)[CameraName] {
  return CAMERAS[name];
}

// The three.js camera to draw the scene with.
export function sceneCamera(): Camera {
  return CAMERAS[name].fov > 0 ? deep : flat;
}

// Fit the screen to a new window size and grow or shrink the arena to fill it.
export function fitToScreen(width: number, height: number): void {
  VIEW.width = width;
  VIEW.height = height;
  roomW = Math.max(1, width - 2 * FLOOR_SIDE);
  roomH = Math.max(1, height - FLOOR_TOP - FLOOR_BOTTOM);
  ARENA.width = Math.max(ARENA_MIN.width, Math.floor(roomW / PIXELS_PER_UNIT));
  ARENA.height = Math.max(ARENA_MIN.height, Math.floor(roomH / (PIXELS_PER_UNIT * ARENA_SQUASH)));
  aim();
}

// Point the camera at the middle of the floor, then zoom until the floor (with its front side)
// just fits between the HUD and the bottom of the window, and center it there.
function aim(): void {
  const { tilt, fov } = CAMERAS[name];
  const W = ARENA.width;
  const H = ARENA.height;
  const T = SCENE.floorThickness;
  const middle = new Vector3(W / 2, 0, H / 2);
  const t = (tilt * Math.PI) / 180;
  const back = new Vector3(0, Math.cos(t), Math.sin(t)); // from the middle of the floor toward the camera
  const up = new Vector3(0, Math.sin(t), -Math.cos(t)); // the camera's "up": toward the far edge
  const mustFit = [
    [0, 0, 0],
    [W, 0, 0],
    [0, 0, H],
    [W, 0, H],
    [0, -T, H],
    [W, -T, H],
  ].map(([x, y, z]) => new Vector3(x, y, z));
  const roomX = VIEW.width / 2;
  const roomY = FLOOR_TOP + roomH / 2;
  const reach = Math.hypot(W, H);

  // Where each point lands, in the camera's own directions (x right, y up, z toward the camera).
  const seen = (camera: Camera, distance: number) => {
    camera.position.copy(middle).addScaledVector(back, distance);
    camera.up.copy(up);
    camera.lookAt(middle);
    camera.updateMatrixWorld();
    return mustFit.map((p) => p.clone().applyMatrix4(camera.matrixWorldInverse));
  };
  const box = (points: { x: number; y: number }[]) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    return { width: x1 - x0, height: y1 - y0, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  };

  if (fov <= 0) {
    // No perspective: zoom = screen pixels per world unit.
    const distance = 2 * reach;
    const b = box(seen(flat, distance));
    const zoom = Math.min(roomW / b.width, roomH / b.height);
    flat.left = b.x - roomX / zoom;
    flat.right = flat.left + VIEW.width / zoom;
    flat.top = b.y + roomY / zoom;
    flat.bottom = flat.top - VIEW.height / zoom;
    flat.near = 1;
    flat.far = distance + reach;
    flat.updateProjectionMatrix();
    return;
  }

  // Perspective: move the camera back until the floor fits, then shift the picture to center it.
  deep.fov = fov;
  deep.aspect = VIEW.width / VIEW.height;
  deep.clearViewOffset();
  const focal = VIEW.height / 2 / Math.tan((fov * Math.PI) / 360); // pixels per unit at distance 1
  const onScreen = (distance: number) => box(seen(deep, distance).map((p) => ({ x: (focal * p.x) / -p.z, y: (focal * p.y) / -p.z })));
  let near = reach * 0.1;
  let far = reach * 100;
  for (let i = 0; i < 40; i++) {
    const mid = (near + far) / 2;
    const b = onScreen(mid);
    if (b.width > roomW || b.height > roomH) near = mid;
    else far = mid;
  }
  const b = onScreen(far);
  deep.near = Math.max(1, far - reach);
  deep.far = far + reach;
  deep.setViewOffset(VIEW.width, VIEW.height, VIEW.width / 2 + b.x - roomX, VIEW.height / 2 - b.y - roomY, VIEW.width, VIEW.height);
  deep.updateProjectionMatrix();
}
