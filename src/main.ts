import { CAMERA, CAMERAS, type CameraName, FLOOR, FLOORS, type FloorName, GITHUB, PAUSE, PLAYERS, RACE, VIEW, VIEW_KEYS } from './config';
import { endFrame, heldKeys, initInput, wasPressed } from './input';
import { Player, separate } from './player';
import { fitToScreen, followCars, setCamera } from './camera';
import { setFloor } from './floors';
import {
  carsCanDrive,
  countLaps,
  pauseRace,
  quitRace,
  racePaused,
  racePhase,
  raceRunning,
  resumeRace,
  startCountdown,
  updateRace,
} from './race';
import { keyLabel, renderHud } from './hud';
import { renderScene, resizeScene } from './scene';
import { clearSkidMarks, updateSkidMarks } from './skidmarks';

// The HUD's canvas lies on top of the 3D scene's canvas (scene.ts).
const canvas = document.querySelector<HTMLCanvasElement>('#hud')!;
const ctx = canvas.getContext('2d')!;

let players: Player[] = [];

// A fresh start: cars at the start line, last race's skid marks gone.
// Racing alone, player 1's car starts in the middle of the line and both sides' keys steer it.
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
  resizeScene();
  // The track changes with the window. Before the start, put the cars back at the start line;
  // during the race, just push them back inside the walls if the arena shrank.
  if (racePhase() === 'waiting') placeCarsAtStart(players.length === 1 ? 1 : 2);
  else for (const p of players) p.stayInArena();
}
window.addEventListener('resize', resize);
resize();

// The buttons on the left, for the view and the floor: a click opens a row of every choice next
// to the button, with the current one outlined. Picking one closes the row, and so does clicking
// anywhere else or pressing Escape. `which` names the elements: #camera, #camera-control and
// #camera-picker. Gives back a function that shows the current choice on the button and in the row.
const pickerRows: HTMLDivElement[] = [];
function sidePicker<N extends string>(
  which: string,
  names: N[],
  look: (name: N) => { text: string; title: string },
  pick: (name: N) => void,
): (current: N, buttonTitle: string) => void {
  const control = document.querySelector<HTMLDivElement>(`#${which}-control`)!;
  const button = document.querySelector<HTMLButtonElement>(`#${which}`)!;
  const row = document.querySelector<HTMLDivElement>(`#${which}-picker`)!;
  pickerRows.push(row);
  const choices = names.map((name) => {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'emoji-button';
    choice.textContent = look(name).text;
    choice.title = look(name).title;
    choice.addEventListener('click', () => {
      pick(name);
      row.hidden = true;
      // Let go of focus, or Space (a player's drift key) would click it again.
      choice.blur();
    });
    row.append(choice);
    return { name, choice };
  });
  button.addEventListener('click', () => {
    row.hidden = !row.hidden;
    button.blur();
  });
  // A click outside closes the row; so a click on the other button closes this row as it opens its own.
  window.addEventListener('pointerdown', (e) => {
    if (!control.contains(e.target as Node)) row.hidden = true;
  });
  return (current, buttonTitle) => {
    button.textContent = look(current).text;
    button.title = buttonTitle;
    for (const c of choices) c.choice.classList.toggle('chosen', c.name === current);
  };
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') for (const row of pickerRows) row.hidden = true;
});

// The view: camera button on the left. The same views sit in a row under the start buttons, between
// the keys that go back and forward (VIEW_KEYS).
const cameraNames = Object.keys(CAMERAS) as CameraName[];
const showCameraChoice = sidePicker(
  'camera',
  cameraNames,
  (name) => ({ text: CAMERAS[name].name, title: `Camera: ${CAMERAS[name].name}` }),
  (name) => showCamera(name),
);
const viewChoices = cameraNames.map((name) => {
  const choice = document.createElement('button');
  choice.type = 'button';
  choice.className = 'emoji-button';
  choice.textContent = CAMERAS[name].name;
  choice.title = `Camera: ${CAMERAS[name].name}`;
  choice.addEventListener('click', () => {
    showCamera(name);
    // Let go of focus, or Space (a player's drift key) would click it again.
    choice.blur();
  });
  return { name, choice };
});
function keyCap(code: string): HTMLSpanElement {
  const cap = document.createElement('span');
  cap.className = 'key';
  cap.textContent = keyLabel(code);
  return cap;
}
document
  .querySelector<HTMLDivElement>('#view-choices')!
  .append(keyCap(VIEW_KEYS.back), ...viewChoices.map((c) => c.choice), keyCap(VIEW_KEYS.next));

let cameraName: CameraName = CAMERA;
function showCamera(name: CameraName): void {
  cameraName = name;
  setCamera(name);
  showCameraChoice(name, `Camera: ${CAMERAS[name].name} (click to pick another)`);
  for (const c of viewChoices) c.choice.classList.toggle('chosen', c.name === name);
}
// One view forward (1) or back (-1) in CAMERAS, round and round.
function stepCamera(step: 1 | -1): void {
  const i = cameraNames.indexOf(cameraName);
  showCamera(cameraNames[(i + step + cameraNames.length) % cameraNames.length]);
}
showCamera(CAMERA);

// The floor: the button under the camera button.
const showFloorChoice = sidePicker(
  'floor',
  Object.keys(FLOORS) as FloorName[],
  (name) => ({ text: FLOORS[name].emoji, title: FLOORS[name].name }),
  (name) => chooseFloor(name),
);
function chooseFloor(name: FloorName): void {
  setFloor(name);
  showFloorChoice(name, `Floor: ${FLOORS[name].name} (click to pick another)`);
}
chooseFloor(FLOOR);

// The GitHub icon at the top: the game's code, in a new tab so a race isn't lost.
const githubLink = document.querySelector<HTMLAnchorElement>('#github')!;
githubLink.href = GITHUB.url;
githubLink.title = GITHUB.title;
githubLink.setAttribute('aria-label', GITHUB.title);
// Let go of focus, like the buttons, so the keys stay with the game.
githubLink.addEventListener('click', () => githubLink.blur());

// The pause button at the top during a race, in the GitHub icon's place, and the menu it opens.
const pauseButton = document.querySelector<HTMLButtonElement>('#pause')!;
const pauseMenu = document.querySelector<HTMLDivElement>('#pause-menu')!;
const resumeButton = document.querySelector<HTMLButtonElement>('#resume')!;
const quitButton = document.querySelector<HTMLButtonElement>('#quit')!;
pauseButton.textContent = PAUSE.button;
pauseButton.title = `${PAUSE.title} (${keyLabel(PAUSE.key)})`;
pauseButton.setAttribute('aria-label', PAUSE.title);
document.querySelector<HTMLHeadingElement>('#pause-text')!.textContent = PAUSE.text;
resumeButton.textContent = PAUSE.resume;
quitButton.textContent = PAUSE.quit;

function setPaused(on: boolean): void {
  if (on) pauseRace();
  else resumeRace();
  pauseMenu.hidden = !racePaused();
}
// Each button lets go of focus after a click, or Space or Enter (players' drift keys) would click it again.
pauseButton.addEventListener('click', () => {
  setPaused(!racePaused());
  pauseButton.blur();
});
resumeButton.addEventListener('click', () => {
  setPaused(false);
  resumeButton.blur();
});
quitButton.addEventListener('click', () => {
  quitRace();
  placeCarsAtStart(players.length === 1 ? 1 : 2);
  showRacing(false);
  quitButton.blur();
});

// During a race the pause button is at the top; before and after it, the start buttons and the GitHub icon.
function showRacing(racing: boolean): void {
  startButtons.hidden = racing;
  githubLink.hidden = racing;
  pauseButton.hidden = !racing;
  pauseMenu.hidden = true;
}

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
    showRacing(true);
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
initInput([...PLAYERS.flatMap((p) => Object.values(p.controls)), DEBUG_KEY, VIEW_KEYS.back, VIEW_KEYS.next]);

let showKeys = false;

function update(dt: number): void {
  if (wasPressed(DEBUG_KEY)) showKeys = !showKeys;
  // The view keys switch the view, except during a two-player race (see VIEW_KEYS).
  const outsideRace = racePhase() === 'waiting' || racePhase() === 'finished';
  const viewKeysWork = outsideRace || players.length === 1;
  if (viewKeysWork && wasPressed(VIEW_KEYS.back)) stepCamera(-1);
  if (viewKeysWork && wasPressed(VIEW_KEYS.next)) stepCamera(1);
  // The pause key pauses the race, and pressed again goes on.
  if (raceRunning() && wasPressed(PAUSE.key)) setPaused(!racePaused());
  if (racePaused()) {
    endFrame();
    return; // everything stands still
  }
  updateRace(dt);
  updateSkidMarks(dt);
  // Before "LOS!" and after someone has won, the cars can't drive, steer, brake or drift.
  if (carsCanDrive()) {
    for (const p of players) p.update(dt);
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) separate(players[i], players[j]);
    }
    countLaps(players);
    if (racePhase() === 'finished') showRacing(false);
  }
  endFrame();
}

// Fixed-step updates keep movement identical on 60 Hz and 144 Hz screens.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

// Frames drawn per second, counted over each second, for the debug line.
let fps = 0;
let frames = 0;
let countingSince = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  acc += dt;
  last = now;
  frames++;
  if (now - countingSince >= 1000) {
    fps = Math.round((frames * 1000) / (now - countingSince));
    frames = 0;
    countingSince = now;
  }
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  followCars(players, dt);
  renderScene(players);
  renderHud(ctx, players, showKeys ? { keys: heldKeys(), fps } : null);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
