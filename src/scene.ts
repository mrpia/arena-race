// The 3D scene: the floor with the track painted on it, the tire walls, the cars, the skid marks,
// and the sun that throws the shadows. camera.ts says where the scene is seen from.
// A spot (x, y) on the floor is (x, 0, y) in the scene; height above the floor is the scene's y axis.
import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  type Group,
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
import { sceneCamera } from './camera';
import { buildCar, placeCar } from './cars';
import { ARENA, COLORS, type PlayerConfig, SCENE, SKID_MARKS, TIRES, VIEW } from './config';
import { cssColor } from './cssColor';
import { currentFloor, floorMoves, floorWall, paintFloor } from './floors';
import type { Player } from './player';
import { skidMarks } from './skidmarks';
import { getTrack, type Track } from './track';

const renderer = new WebGLRenderer({ canvas: document.querySelector<HTMLCanvasElement>('#scene')!, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.setClearColor(COLORS.background);

const scene = new Scene();

// Light from the sky everywhere, plus the sun from one side. Where the sun can't reach (in a
// shadow, or on a side facing away from it) only the sky's light is left.
const sky = new AmbientLight(0xffffff);
const sun = new DirectionalLight(0xffffff);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.3;
scene.add(sky, sun, sun.target);

// The floor: a slab, with the floor picture (floor plus track) laid on top.
const floorPicture = document.createElement('canvas');
const floorBrush = floorPicture.getContext('2d')!;
const floorTexture = new CanvasTexture(floorPicture);
floorTexture.colorSpace = SRGBColorSpace;
floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // stays sharp when seen at a slant
const floorTop = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshLambertMaterial({ map: floorTexture }));
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
  floorPicture.width = Math.round(W * sharpness);
  floorPicture.height = Math.round(H * sharpness);
  floorTexture.dispose(); // the picture changed size, so the graphics card needs a new one
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

function paintFloorPicture(): void {
  floorBrush.setTransform(1, 0, 0, 1, 0, 0);
  floorBrush.clearRect(0, 0, floorPicture.width, floorPicture.height);
  floorBrush.setTransform(floorPicture.width / ARENA.width, 0, 0, floorPicture.height / ARENA.height, 0, 0);
  paintFloor(floorBrush, ARENA.width, ARENA.height);
  floorTexture.needsUpdate = true;
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
    markCorners.set(
      [m.x1 - sx, lift, m.y1 - sy, m.x1 + sx, lift, m.y1 + sy, m.x2 + sx, lift, m.y2 + sy, m.x2 - sx, lift, m.y2 - sy],
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
  if (floor !== paintedFloor || floorMoves()) {
    paintFloorPicture();
    paintedFloor = floor;
  }
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

  renderer.render(scene, sceneCamera());
}
