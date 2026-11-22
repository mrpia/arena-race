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
// How many players race: picked in the row under the start button, kept from race to race.
let playerCount: 1 | 2 = RACE.firstPlayers;

// A fresh start: cars at the start line, last race's skid marks gone.
// Racing alone, player 1's car starts in the middle of the line and both sides' keys steer it.
function placeCarsAtStart(): void {
  players =
    playerCount === 1
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
  if (racePhase() === 'waiting') placeCarsAtStart();
  else for (const p of players) p.stayInArena();
}
window.addEventListener('resize', resize);
resize();

// A button in one of the rows under START. Picking it lets go of focus, or Space (a player's drift
// key) would click it again.
function choiceButton(text: string, title: string, pick: () => void): HTMLButtonElement {
  const choice = document.createElement('button');
  choice.type = 'button';
  choice.className = 'emoji-button';
  choice.textContent = text;
  choice.title = title;
  choice.addEventListener('click', () => {
    pick();
    choice.blur();
  });
  return choice;
}

// The view: a row under the start button, between the keys that go back and forward (VIEW_KEYS).
const cameraNames = Object.keys(CAMERAS) as CameraName[];
const viewChoices = cameraNames.map((name) => ({
  name,
  choice: choiceButton(CAMERAS[name].name, `Camera: ${CAMERAS[name].name}`, () => showCamera(name)),
}));
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
  for (const c of viewChoices) c.choice.classList.toggle('chosen', c.name === name);
}
// One view forward (1) or back (-1) in CAMERAS, round and round.
function stepCamera(step: 1 | -1): void {
  const i = cameraNames.indexOf(cameraName);
  showCamera(cameraNames[(i + step + cameraNames.length) % cameraNames.length]);
}
showCamera(CAMERA);

// The floor: a row under the view row, with every floor in FLOORS.
const floorChoices = (Object.keys(FLOORS) as FloorName[]).map((name) => ({
  name,
  choice: choiceButton(FLOORS[name].emoji, FLOORS[name].name, () => chooseFloor(name)),
}));
document.querySelector<HTMLDivElement>('#floor-choices')!.append(...floorChoices.map((c) => c.choice));
function chooseFloor(name: FloorName): void {
  setFloor(name);
  for (const c of floorChoices) c.choice.classList.toggle('chosen', c.name === name);
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
  placeCarsAtStart();
  showRacing(false);
  quitButton.blur();
});

// During a race the pause button is at the top; before and after it, the start button with the
// player, view and floor rows under it, and the GitHub icon.
function showRacing(racing: boolean): void {
  startArea.hidden = racing;
  githubLink.hidden = racing;
  pauseButton.hidden = !racing;
  pauseMenu.hidden = true;
}

// The start button in the middle: puts the cars at the start line and begins the countdown.
// It comes back after each race, with the same number of players, view and floor.
const startArea = document.querySelector<HTMLDivElement>('#start-area')!;
const startButton = document.querySelector<HTMLButtonElement>('#start')!;
startButton.textContent = RACE.startText;
startButton.addEventListener('click', () => {
  placeCarsAtStart();
  startCountdown();
  showRacing(true);
  // Let go of focus, or Space (a player's drift key) would click it again.
  startButton.blur();
});

// The number of players, in a row under the start button: the cat alone (racing against the clock)
// or the cat and the dog. The cars on the start line follow the choice, so the riding views and the
// top bar already look like the race will.
const playerChoices = ([1, 2] as const).map((count) => ({
  count,
  choice: choiceButton(
    PLAYERS.slice(0, count)
      .map((cfg) => cfg.emoji)
      .join(''),
    count === 1 ? RACE.playerTitles.one : RACE.playerTitles.two,
    () => choosePlayers(count),
  ),
}));
document.querySelector<HTMLDivElement>('#player-choices')!.append(...playerChoices.map((c) => c.choice));
function choosePlayers(count: 1 | 2): void {
  if (count !== playerCount) {
    playerCount = count;
    // The row only shows before and after a race. After one, the result on screen belongs to the
    // other kind of race, so it goes, and the cars go back to the start line.
    quitRace();
    placeCarsAtStart();
  }
  for (const c of playerChoices) c.choice.classList.toggle('chosen', c.count === count);
}
choosePlayers(playerCount);

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
