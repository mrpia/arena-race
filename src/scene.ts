// The 3D scene: the floor with the track painted on it, the ramps and bridges, the tire walls, the
// cars, the skid marks, and the sun that throws the shadows. camera.ts says where the scene is seen from, and which part
// of the screen each camera fills.
// A spot (x, y) on the floor is (x, 0, y) in the scene; height above the floor is the scene's y axis.
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  PCFShadowMap,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { currentCamera, ridesAlong, screenParts } from './camera';
import { buildCar, placeCar } from './cars';
import { ARENA, BRIDGE, COLORS, type PlayerConfig, SCENE, SKID_MARKS, TIRES, TRACK, VIEW } from './config';
import { cssColor } from './cssColor';
import { currentFloor, floorPulse, floorWall, paintFloor, paintFloorGlow } from './floors';
import type { Player } from './player';
import { skidMarks } from './skidmarks';
import { ceilingAt, edgeSpots, getTrack, overRoad, raisedStretches, type Track } from './track';

const renderer = new WebGLRenderer({ canvas: document.querySelector<HTMLCanvasElement>('#scene')!, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
// The shadows are worked out once per frame, even when the scene is drawn twice (split screen).
renderer.shadowMap.autoUpdate = false;

const scene = new Scene();

// Light from the sky everywhere, plus the sun from one side. Where the sun can't reach (in a
// shadow, or on a side facing away from it) only the sky's light is left.
const sky = new AmbientLight(0xffffff);
const sun = new DirectionalLight(0xffffff);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.3;
sun.shadow.camera.layers.enableAll(); // every car's driver and windshield throws a shadow, even when a camera leaves them out
scene.add(sky, sun, sun.target);

// The floor: a slab, with the floor picture (floor plus track) laid on top.
const floorPicture = document.createElement('canvas');
const floorBrush = floorPicture.getContext('2d')!;
const floorTexture = new CanvasTexture(floorPicture);
floorTexture.colorSpace = SRGBColorSpace;
floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // stays sharp when seen at a slant
// A second picture with what glows (lava's cracks), added on top and made to throb (see FLOOR_LOOKS).
const glowPicture = document.createElement('canvas');
const glowBrush = glowPicture.getContext('2d')!;
const glowTexture = new CanvasTexture(glowPicture);
glowTexture.colorSpace = SRGBColorSpace;
glowTexture.anisotropy = floorTexture.anisotropy;
const floorPaint = new MeshLambertMaterial({ map: floorTexture, emissive: 0xffffff, emissiveMap: glowTexture });
const floorTop = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), floorPaint);
floorTop.receiveShadow = true;
const sidePaint = new MeshBasicMaterial(); // the floor's color in FLOOR_LOOKS, untouched by light
const floorSides = new Mesh(new BoxGeometry(1, 1, 1), sidePaint);
scene.add(floorTop, floorSides);

// Tires: rubber rings lying flat, piled TIRES.stack high. One shape drawn many times over.
const TUBE = TIRES.radius / 4; // thickness of the rubber; the hole is half the tire's width
const tireShape = new TorusGeometry(TIRES.radius - TUBE, TUBE, 6, 14).rotateX(Math.PI / 2);
const tireRubber = new MeshPhongMaterial({ color: TIRES.colors.rubber, shininess: 20, specular: 0x222222 });
let tires: InstancedMesh | null = null;

// Skid marks: a thin strip on the floor for each mark, fading as it gets older.
const MAX_MARKS = SKID_MARKS.max;
const markCorners = new Float32Array(MAX_MARKS * 4 * 3);
const markShades = new Float32Array(MAX_MARKS * 4 * 4); // white, with the mark's see-through amount
const markShape = new BufferGeometry();
markShape.setAttribute('position', new BufferAttribute(markCorners, 3).setUsage(DynamicDrawUsage));
markShape.setAttribute('color', new BufferAttribute(markShades, 4).setUsage(DynamicDrawUsage));
const triangles = new Uint32Array(MAX_MARKS * 6);
for (let i = 0; i < MAX_MARKS; i++) triangles.set([4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3], 6 * i);
markShape.setIndex(new BufferAttribute(triangles, 1));
const markPaint = cssColor(SKID_MARKS.color);
const marks = new Mesh(
  markShape,
  new MeshBasicMaterial({ color: markPaint.color, vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide }),
);
marks.frustumCulled = false; // they're all over the floor and move every frame
scene.add(marks);

// Ramps and bridges: the parts of the road lifted off the floor (a third number in a track's points).
// The road on top has white edges and red and white railings. Below it, concrete sides go down to the
// floor, except over a road that passes under: there the road is a slab BRIDGE.deck thick, and
// concrete walls stand on both sides of the road underneath. The ones cars bump into are in track.ts.
const bridges = new Group();
scene.add(bridges);
// Drawn a little in front of the floor, so the floor picture doesn't flicker through where a ramp starts.
const roadPaint = new MeshLambertMaterial({
  vertexColors: true,
  side: DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -4,
});
const railingPaint = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
const concrete = new MeshLambertMaterial({ color: BRIDGE.colors.sides, side: DoubleSide });

const cars = new Map<PlayerConfig, Group>();

let builtFor: Track | null = null;
let paintedFloor = '';

// Everything that depends on the arena's size: the floor, the tires, and the sun's reach.
function build(track: Track): void {
  const W = ARENA.width;
  const H = ARENA.height;
  const T = SCENE.floorThickness;
  floorTop.scale.set(W, 1, H);
  floorTop.position.set(W / 2, 0, H / 2);
  floorSides.scale.set(W, T, H);
  floorSides.position.set(W / 2, -T / 2 - 0.5, H / 2); // just under the floor picture

  const sharpness = Math.min(SCENE.floorSharpness, renderer.capabilities.maxTextureSize / Math.max(W, H));
  glowPicture.width = floorPicture.width = Math.round(W * sharpness);
  glowPicture.height = floorPicture.height = Math.round(H * sharpness);
  floorTexture.dispose(); // the pictures changed size, so the graphics card needs new ones
  glowTexture.dispose();
  paintedFloor = '';

  if (tires) {
    scene.remove(tires);
    tires.dispose();
  }
  const stack = Math.max(1, Math.round(TIRES.stack));
  tires = new InstancedMesh(tireShape, tireRubber, track.tires.length * stack);
  const place = new Matrix4();
  track.tires.forEach((t, i) => {
    for (let level = 0; level < stack; level++) {
      tires!.setMatrixAt(i * stack + level, place.makeTranslation(t.x, TUBE * (2 * level + 1), t.y));
    }
  });
  tires.castShadow = tires.receiveShadow = true;
  scene.add(tires);
  buildBridges(track);

  // The sun shines from SCENE.sunFrom, SCENE.sunHeight above the floor. Its shadows cover the whole arena.
  const reach = Math.hypot(W, H);
  const from = (SCENE.sunFrom * Math.PI) / 180;
  const up = (SCENE.sunHeight * Math.PI) / 180;
  sun.target.position.set(W / 2, 0, H / 2);
  sun.position.set(W / 2 + Math.cos(from) * Math.cos(up) * reach, Math.sin(up) * reach, H / 2 + Math.sin(from) * Math.cos(up) * reach);
  const shadows = sun.shadow.camera;
  shadows.left = shadows.bottom = -reach / 2 - 20;
  shadows.right = shadows.top = reach / 2 + 20;
  shadows.near = 1;
  shadows.far = 2 * reach;
  shadows.updateProjectionMatrix();
  sun.shadow.radius = SCENE.shadowSoftness;
  // In full sun the floor shows exactly its painted colors; in a shadow, SCENE.shadowDarkness less.
  sky.intensity = Math.PI * (1 - SCENE.shadowDarkness);
  sun.intensity = (Math.PI * SCENE.shadowDarkness) / Math.sin(up);

  builtFor = track;
}

type Spot = { x: number; y: number };

function mix(a: Spot, b: Spot, k = 0.5): Spot {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

// How far along the line from a to b the spot p is: 0 at a, 1 at b.
function fraction(p: Spot, a: Spot, b: Spot): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1);
}

// The spots of a line, plus a pair of spots right where `inside` changes between two of them, so a
// wall made of pieces between the spots starts or stops exactly there.
function withEdges(spots: Spot[], inside: (p: Spot) => boolean): Spot[] {
  const out = [spots[0]];
  for (let s = 1; s < spots.length; s++) {
    const [a, b] = [spots[s - 1], spots[s]];
    if (inside(a) !== inside(b)) {
      let [lo, hi] = [0, 1];
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2;
        if (inside(mix(a, b, mid)) === inside(a)) lo = mid;
        else hi = mid;
      }
      out.push(mix(a, b, lo), mix(a, b, hi));
    }
    out.push(b);
  }
  return out;
}

// Corners for a mesh: each quad is two triangles, with a color per corner if `colors` is given.
class Shapes {
  corners: number[] = [];
  colors: number[] = [];
  quad(a: number[], b: number[], c: number[], d: number[], color?: Color): void {
    for (const p of [a, b, c, a, c, d]) {
      this.corners.push(p[0], p[1], p[2]);
      if (color) this.colors.push(color.r, color.g, color.b);
    }
  }
  mesh(paint: MeshLambertMaterial): Mesh {
    const shape = new BufferGeometry();
    shape.setAttribute('position', new Float32BufferAttribute(this.corners, 3));
    if (this.colors.length > 0) shape.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    shape.computeVertexNormals();
    const mesh = new Mesh(shape, paint);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

function buildBridges(track: Track): void {
  for (const old of bridges.children) (old as Mesh).geometry.dispose();
  bridges.clear();
  const { middle, directions, heights, halfWidth } = track;
  const n = middle.length;
  const edge = new Color(TRACK.colors.edge);
  const asphalt = new Color(TRACK.colors.asphalt);
  const railing = BRIDGE.colors.railing.map((c) => new Color(c));
  const road = new Shapes();
  const rails = new Shapes();
  const sides = new Shapes();
  // (x, y) on the floor at height h, as a corner in the scene.
  const at = (p: { x: number; y: number }, h: number) => [p.x, h, p.y];
  // The spot `side` to the right of middle point i.
  const across = (i: number, side: number) => {
    const m = middle[i % n];
    const d = directions[i % n];
    return { x: m.x - d.dy * side, y: m.y + d.dx * side };
  };
  const passage = halfWidth + BRIDGE.underpass;

  for (const { from, to } of raisedStretches(track)) {
    for (let k = from; k < to; k++) {
      const [i, j] = [k % n, (k + 1) % n];
      const [hi, hj] = [heights[i], heights[j]];
      // The road on top: white edge, asphalt, white edge.
      const lines = [-halfWidth, -halfWidth + TRACK.edgeLine, halfWidth - TRACK.edgeLine, halfWidth];
      for (let l = 0; l < 3; l++) {
        const [s1, s2] = [lines[l], lines[l + 1]];
        road.quad(at(across(i, s1), hi), at(across(j, s1), hj), at(across(j, s2), hj), at(across(i, s2), hi), l === 1 ? asphalt : edge);
      }
      for (const side of [-halfWidth, halfWidth]) {
        // A railing along each edge, red and white in turns.
        const [a, b] = [across(i, side), across(j, side)];
        rails.quad(at(a, hi), at(b, hj), at(b, hj + BRIDGE.railing), at(a, hi + BRIDGE.railing), railing[k % 2]);
        // The side, down to the floor, or down to the underside over a road passing under. Made
        // of short pieces, cut exactly where the opening over that road ends, at its walls.
        const open = (p: Spot) => overRoad(track, p.x, p.y, i, passage);
        const spots = withEdges([...edgeSpots(track, i, side, 2), b], open);
        const h = (p: Spot) => hi + (hj - hi) * fraction(p, a, b);
        for (let s = 0; s + 1 < spots.length; s++) {
          const [p, q] = [spots[s], spots[s + 1]];
          const [hp, hq] = [h(p), h(q)];
          const under = open(mix(p, q)) ? BRIDGE.deck : Infinity; // how far the side reaches down
          sides.quad(at(p, Math.max(0, hp - under)), at(q, Math.max(0, hq - under)), at(q, hq), at(p, hp));
        }
      }
      // The underside, where a road passes under. Elsewhere it's hidden inside the sides.
      if (hi > BRIDGE.deck && hj > BRIDGE.deck) {
        const [a1, a2, b1, b2] = [across(i, -halfWidth), across(i, halfWidth), across(j, -halfWidth), across(j, halfWidth)];
        sides.quad(at(a1, hi - BRIDGE.deck), at(b1, hj - BRIDGE.deck), at(b2, hj - BRIDGE.deck), at(a2, hi - BRIDGE.deck));
      }
    }
  }

  // Walls beside a road where it passes under a bridge, up to the underside of the bridge.
  for (let i = 0; i < n; i++) {
    if (heights[i] > 0 || heights[(i + 1) % n] > 0) continue;
    for (const side of [-passage, passage]) {
      const covered = (p: Spot) => ceilingAt(p.x, p.y) !== null;
      const spots = withEdges([...edgeSpots(track, i, side, 2), across(i + 1, side)], covered);
      for (let s = 0; s + 1 < spots.length; s++) {
        const [p, q] = [spots[s], spots[s + 1]];
        if (!covered(mix(p, q))) continue;
        // Right at the edge of the bridge, the spot just outside takes the height of its neighbor.
        const t1 = ceilingAt(p.x, p.y) ?? ceilingAt(q.x, q.y)!;
        const t2 = ceilingAt(q.x, q.y) ?? t1;
        sides.quad(at(p, 0), at(q, 0), at(q, t2), at(p, t1));
      }
    }
  }

  if (road.corners.length > 0) bridges.add(road.mesh(roadPaint), rails.mesh(railingPaint), sides.mesh(concrete));
}

// Paint the floor picture and the glow picture, in world units. Only when the floor or the arena changes.
function paintFloorPictures(): void {
  for (const brush of [floorBrush, glowBrush]) {
    brush.setTransform(1, 0, 0, 1, 0, 0);
    brush.clearRect(0, 0, brush.canvas.width, brush.canvas.height);
    brush.setTransform(brush.canvas.width / ARENA.width, 0, 0, brush.canvas.height / ARENA.height, 0, 0);
  }
  paintFloor(floorBrush, ARENA.width, ARENA.height);
  paintFloorGlow(glowBrush, ARENA.width, ARENA.height);
  floorTexture.needsUpdate = true;
  glowTexture.needsUpdate = true;
  sidePaint.color.set(floorWall());
}

function updateSkidMarks(): void {
  const all = skidMarks();
  const n = Math.min(all.length, MAX_MARKS);
  const half = SKID_MARKS.width / 2;
  const lift = 0.3; // just above the floor, so the floor doesn't flicker through
  for (let i = 0; i < n; i++) {
    const m = all[i];
    const length = Math.hypot(m.x2 - m.x1, m.y2 - m.y1) || 1;
    const sx = (-(m.y2 - m.y1) / length) * half; // half the mark's width, across it
    const sy = ((m.x2 - m.x1) / length) * half;
    const [z1, z2] = [m.z1 + lift, m.z2 + lift]; // on the floor, or on a ramp or a bridge
    markCorners.set(
      [m.x1 - sx, z1, m.y1 - sy, m.x1 + sx, z1, m.y1 + sy, m.x2 + sx, z2, m.y2 + sy, m.x2 - sx, z2, m.y2 - sy],
      i * 12,
    );
    const shade = markPaint.opacity * Math.max(0, 1 - m.age / SKID_MARKS.fadeTime);
    for (let c = 0; c < 4; c++) markShades.set([1, 1, 1, shade], i * 16 + c * 4);
  }
  markShape.setDrawRange(0, n * 6);
  markShape.attributes.position.needsUpdate = true;
  markShape.attributes.color.needsUpdate = true;
}

export function resizeScene(): void {
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(VIEW.width, VIEW.height);
}

export function renderScene(players: readonly Player[]): void {
  const track = getTrack();
  if (track !== builtFor) build(track);
  const floor = currentFloor();
  if (floor !== paintedFloor) {
    paintFloorPictures();
    paintedFloor = floor;
  }
  floorPaint.emissiveIntensity = floorPulse(performance.now() / 1000);
  updateSkidMarks();

  // Each player keeps the same car from race to race; cars of players not racing are hidden.
  for (const car of cars.values()) car.visible = false;
  for (const p of players) {
    let car = cars.get(p.config);
    if (!car) {
      car = buildCar(p.config);
      cars.set(p.config, car);
      scene.add(car);
    }
    car.visible = true;
    placeCar(car, p);
  }

  // One camera fills the screen, or with a split screen, two cameras each fill half of it. The
  // line between the halves is the page's color. Riding along with a car, there's sky behind the
  // arena; looking at the whole arena, the page's color.
  const parts = screenParts(players.length);
  const split = parts.length > 1;
  renderer.shadowMap.needsUpdate = true;
  renderer.setScissorTest(false);
  if (split) {
    renderer.setClearColor(COLORS.background);
    renderer.clear();
  }
  renderer.setClearColor(ridesAlong(currentCamera()) ? SCENE.sky : COLORS.background);
  renderer.setScissorTest(split);
  for (const part of parts) {
    renderer.setViewport(part.x, 0, part.width, VIEW.height);
    renderer.setScissor(part.x, 0, part.width, VIEW.height);
    renderer.render(scene, part.camera);
  }
}
