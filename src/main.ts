import { CAMERA, CAMERAS, type CameraName, FLOOR, FLOORS, type FloorName, PLAYERS, VIEW } from './config';
import { endFrame, heldKeys, initInput, wasPressed } from './input';
import { Player, separate } from './player';
import { fitToScreen, setCamera } from './camera';
import { setFloor } from './floors';
import { render } from './render';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;

let players: Player[] = [];

// Fill the whole window, sharp on HiDPI screens. The arena grows or shrinks to match.
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  fitToScreen(window.innerWidth, window.innerHeight);
  canvas.style.width = `${VIEW.width}px`;
  canvas.style.height = `${VIEW.height}px`;
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // If the arena shrank, push players back inside the walls.
  for (const p of players) p.stayInArena();
}
window.addEventListener('resize', resize);
resize();

// 2D/3D button on the left: each click switches between looking straight down and the tilted view.
const cameraButton = document.querySelector<HTMLButtonElement>('#camera')!;
let cameraName: CameraName = CAMERA;
function showCamera(): void {
  setCamera(cameraName);
  cameraButton.textContent = CAMERAS[cameraName].name;
  cameraButton.title = `Camera: ${CAMERAS[cameraName].name} (click to switch)`;
}
cameraButton.addEventListener('click', () => {
  cameraName = cameraName === '3d' ? '2d' : '3d';
  showCamera();
  // Let go of focus, or Space (a player's action key) would click it again.
  cameraButton.blur();
});
showCamera();

// Floor button under the 2D/3D button: click it for a row of all floors, then pick one.
const floorControl = document.querySelector<HTMLDivElement>('#floor-control')!;
const floorButton = document.querySelector<HTMLButtonElement>('#floor')!;
const floorPicker = document.querySelector<HTMLDivElement>('#floor-picker')!;
const floorChoices = (Object.keys(FLOORS) as FloorName[]).map((name) => {
  const choice = document.createElement('button');
  choice.type = 'button';
  choice.className = 'emoji-button';
  choice.textContent = FLOORS[name].emoji;
  choice.title = FLOORS[name].name;
  choice.addEventListener('click', () => {
    chooseFloor(name);
    floorPicker.hidden = true;
    // Let go of focus, or Space (a player's action key) would click it again.
    choice.blur();
  });
  floorPicker.append(choice);
  return { name, choice };
});

function chooseFloor(name: FloorName): void {
  setFloor(name);
  floorButton.textContent = FLOORS[name].emoji;
  floorButton.title = `Floor: ${FLOORS[name].name} (click to pick another)`;
  for (const c of floorChoices) c.choice.classList.toggle('chosen', c.name === name);
}

floorButton.addEventListener('click', () => {
  floorPicker.hidden = !floorPicker.hidden;
  floorButton.blur();
});
// Clicking anywhere else or pressing Escape closes the row without changing the floor.
window.addEventListener('pointerdown', (e) => {
  if (!floorControl.contains(e.target as Node)) floorPicker.hidden = true;
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') floorPicker.hidden = true;
});
chooseFloor(FLOOR);

const DEBUG_KEY = 'Backquote'; // the key left of 1 (§ on Swiss keyboards)
initInput([...PLAYERS.flatMap((p) => Object.values(p.controls)), DEBUG_KEY]);

players = PLAYERS.map((cfg) => new Player(cfg));
let showKeys = false;

function update(dt: number): void {
  if (wasPressed(DEBUG_KEY)) showKeys = !showKeys;
  for (const p of players) p.update(dt);
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) separate(players[i], players[j]);
  }
  endFrame();
}

// Fixed-step updates keep movement identical on 60 Hz and 144 Hz screens.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now: number): void {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render(ctx, players, showKeys ? heldKeys() : null);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
