// The cameras the 3D scene is seen through: one looking at the whole arena, aimed and zoomed so the
// floor fills the window, or one riding along with each car. Riding along with two cars, the screen
// is split: player 1's car on the left half, player 2's on the right.
// In the scene, a spot (x, y) on the floor is (x, 0, y), and height above the floor is the y axis.
import { type Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { carLayer } from './cars';
import { ARENA, ARENA_MIN, CAMERA, CAMERAS, type CameraName, PIXELS_PER_UNIT, SCENE, SPLIT_SCREEN, VIEW } from './config';
import type { Player } from './player';

type View = (typeof CAMERAS)[CameraName];
type RideAlong = Extract<View, { behind: number }>;

// Where the floor sits on screen.
const FLOOR_TOP = 110; // room for the HUD above
// Room on each side. The buttons that were on the left are gone (step 30), but keep this number:
// a narrower margin would make the arena wider, and records are saved per arena size.
const FLOOR_SIDE = 60;
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
// The overviews see every car's driver and windshield, which cars.ts puts on layers of their own.
flat.layers.enableAll();
deep.layers.enableAll();

// A camera riding along with one car: the car, and which way the camera looks (it lags behind the
// car's turns). The first one rides with player 1's car, the second with player 2's.
interface Rider {
  camera: PerspectiveCamera;
  car: Player | null;
  heading: number;
}
const riders: Rider[] = [0, 1].map(() => ({ camera: new PerspectiveCamera(), car: null, heading: 0 }));

export function setCamera(next: CameraName): void {
  name = next;
  for (const rider of riders) rider.car = null; // the next followCars() starts right behind each car instead of swinging round
  aim();
}

// The current view's settings, for drawing things that look different in each view.
export function currentCamera(): View {
  return CAMERAS[name];
}

// Does this view ride along with a car, rather than look at the whole arena?
export function ridesAlong(view: View): view is RideAlong {
  return 'behind' in view;
}

// A part of the screen and the camera that fills it. x and width are in screen pixels.
export interface ScreenPart {
  camera: Camera;
  x: number;
  width: number;
}

// Where the scene goes on screen, with this many cars in the game. Looking at the whole arena, or
// riding along with one car, one camera fills the screen. Riding along with two cars, each gets
// half, with a line SPLIT_SCREEN.gap pixels wide between them.
export function screenParts(cars: number): ScreenPart[] {
  const view = CAMERAS[name];
  if (!ridesAlong(view)) return [{ camera: view.fov > 0 ? deep : flat, x: 0, width: VIEW.width }];
  if (cars < 2) return [{ camera: riders[0].camera, x: 0, width: VIEW.width }];
  const half = Math.max(1, Math.floor((VIEW.width - SPLIT_SCREEN.gap) / 2));
  return [
    { camera: riders[0].camera, x: 0, width: half },
    { camera: riders[1].camera, x: VIEW.width - half, width: half },
  ];
}

// Once per frame: put each riding-along camera behind its car. dt = seconds since the last frame.
export function followCars(cars: readonly Player[], dt: number): void {
  const view = CAMERAS[name];
  if (!ridesAlong(view)) return;
  screenParts(cars.length).forEach((part, i) => {
    if (cars[i]) follow(riders[i], cars[i], view, part.width / VIEW.height, dt);
  });
}

function follow(rider: Rider, car: Player, view: RideAlong, aspect: number, dt: number): void {
  // A new car (a new race, or a new view) gets the camera straight behind it; after that the
  // camera turns toward where the car's nose points, taking about `swing` seconds to catch up.
  if (car !== rider.car || view.swing <= 0) rider.heading = car.angle;
  else {
    const off = Math.atan2(Math.sin(car.angle - rider.heading), Math.cos(car.angle - rider.heading));
    rider.heading += off * (1 - Math.exp(-dt / view.swing));
  }
  rider.car = car;
  const dx = Math.cos(rider.heading);
  const dy = Math.sin(rider.heading);
  const camera = rider.camera;
  camera.fov = view.fov;
  camera.aspect = aspect;
  camera.near = 1;
  camera.far = 3 * Math.hypot(ARENA.width, ARENA.height);
  camera.updateProjectionMatrix();
  // Sitting in the car, the camera doesn't see the car's own driver and windshield: they would block the view.
  camera.layers.enableAll();
  if (view.inside) camera.layers.disable(carLayer(car.config));
  camera.position.set(car.x - dx * view.behind, view.height, car.y - dy * view.behind);
  camera.up.set(0, 1, 0);
  camera.lookAt(car.x + dx * view.lookAhead, 0, car.y + dy * view.lookAhead);
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
  const view = CAMERAS[name];
  if (ridesAlong(view)) return; // followCars() aims them, every frame
  const { tilt, fov } = view;
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
