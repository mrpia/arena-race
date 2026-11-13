import { CAMERA, CAMERAS, type CameraName, FLOOR, FLOORS, type FloorName, GITHUB, PLAYERS, RACE, VIEW } from './config';
import { endFrame, heldKeys, initInput, wasPressed } from './input';
import { Player, separate } from './player';
import { fitToScreen, setCamera } from './camera';
import { setFloor } from './floors';
import { carsCanDrive, countLaps, racePhase, startCountdown, updateRace } from './race';
import { render } from './render';
import { clearSkidMarks, updateSkidMarks } from './skidmarks';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;

let players: Player[] = [];

// A fresh start: cars at the start line, last race's skid marks gone.
// Racing alone, the cat starts in the middle of the line and both sides' keys steer it.
function placeCarsAtStart(count: 1 | 2): void {
  players =
    count === 1
      ? [new Player(PLAYERS[0], { lane: 0.5, controls: PLAYERS.map((cfg) => cfg.controls) })]
      : PLAYERS.map((cfg) => new Player(cfg));
  clearSkidMarks();
}

// Fill the whole window, sharp on HiDPI screens. The arena grows or shrinks to match.
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  fitToScreen(window.innerWidth, window.innerHeight);
  canvas.style.width = `${VIEW.width}px`;
  canvas.style.height = `${VIEW.height}px`;
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The track changes with the window. Before the start, put the cars back at the start line;
  // during the race, just push them back inside the walls if the arena shrank.
  if (racePhase() === 'waiting') placeCarsAtStart(players.length === 1 ? 1 : 2);
  else for (const p of players) p.stayInArena();
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
  // Let go of focus, or Space (a player's drift key) would click it again.
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
    // Let go of focus, or Space (a player's drift key) would click it again.
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

// The GitHub icon at the top: the game's code, in a new tab so a race isn't lost.
const githubLink = document.querySelector<HTMLAnchorElement>('#github')!;
githubLink.href = GITHUB.url;
githubLink.title = GITHUB.title;
githubLink.setAttribute('aria-label', GITHUB.title);
// Let go of focus, like the buttons, so the keys stay with the game.
githubLink.addEventListener('click', () => githubLink.blur());

// The two start buttons in the middle: race alone against the clock, or two players.
// Either one puts the cars at the start line and begins the countdown. They come back after each race.
const startButtons = document.querySelector<HTMLDivElement>('#start-buttons')!;
const startChoices: [string, 1 | 2, string][] = [
  ['#start-1', 1, RACE.buttons.one],
  ['#start-2', 2, RACE.buttons.two],
];
for (const [id, count, label] of startChoices) {
  const button = document.querySelector<HTMLButtonElement>(id)!;
  button.textContent = label;
  button.addEventListener('click', () => {
    placeCarsAtStart(count);
    startCountdown();
    startButtons.hidden = true;
    // Let go of focus, or Space (a player's drift key) would click it again.
    button.blur();
  });
}

// Phones and tablets can open the game, but nobody can drive without a keyboard. The hint
// shows where the main pointer is a finger, and goes away for good at the first key press.
const keyboardHint = document.querySelector<HTMLParagraphElement>('#keyboard-hint')!;
keyboardHint.textContent = RACE.keyboardHint;
keyboardHint.hidden = !matchMedia('(pointer: coarse)').matches;
window.addEventListener('keydown', () => (keyboardHint.hidden = true), { once: true });

const DEBUG_KEY = 'Backquote'; // the key left of 1 (§ on Swiss keyboards)
initInput([...PLAYERS.flatMap((p) => Object.values(p.controls)), DEBUG_KEY]);

let showKeys = false;

function update(dt: number): void {
  if (wasPressed(DEBUG_KEY)) showKeys = !showKeys;
  updateRace(dt);
  updateSkidMarks(dt);
  // Before "LOS!" and after someone has won, the cars can't drive, steer, brake or drift.
  if (carsCanDrive()) {
    for (const p of players) p.update(dt);
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) separate(players[i], players[j]);
    }
    countLaps(players);
    if (racePhase() === 'finished') startButtons.hidden = false;
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
