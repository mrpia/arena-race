// How far the race has got: waiting for the start button, counting down, racing, or finished.
// A race can also be paused and quit. Also counts everyone's laps and decides who wins.
import { COUNTDOWN, RACE } from './config';
import type { Player } from './player';
import { saveTime } from './records';

export type Phase = 'waiting' | 'countdown' | 'racing' | 'finished';

let phase: Phase = 'waiting';
let clock = 0; // seconds since the countdown started
let finishedAt: number | null = null; // the clock when the race ended
let winners: Player[] = [];
let solo: { time: number; newRecord: boolean } | null = null; // how a one-player race went
let paused = false;
// Going on after a pause: seconds into the countdown that comes first. Null when there's none.
// The race clock waits until "LOS!", so a pause doesn't count toward the race time.
let restart: number | null = null;

export function racePhase(): Phase {
  return phase;
}

// Who won: one player, or more if they crossed the line at exactly the same moment. Empty until then.
export function raceWinners(): Player[] {
  return winners;
}

// With one player: the time and whether it beat the record, once the race is over.
export function soloResult(): { time: number; newRecord: boolean } | null {
  return solo;
}

// Seconds since "LOS!". It stops when the race ends.
export function raceTime(): number {
  return Math.max(0, (finishedAt ?? clock) - COUNTDOWN.from * COUNTDOWN.step);
}

export function startCountdown(): void {
  phase = 'countdown';
  clock = 0;
  finishedAt = null;
  winners = [];
  solo = null;
  paused = false;
  restart = null;
}

// During the countdown or the race, everything can stand still for a while.
export function raceRunning(): boolean {
  return phase === 'countdown' || phase === 'racing';
}

export function racePaused(): boolean {
  return paused;
}

export function pauseRace(): void {
  if (raceRunning()) paused = true;
}

// Going on after a pause starts with a countdown, so everyone has their hands back on the keys.
// Paused during the start countdown, that countdown simply begins again from the top.
export function resumeRace(): void {
  if (!paused) return;
  paused = false;
  if (phase === 'countdown') clock = 0;
  else restart = 0;
}

// Stop the race without a winner. The game is back to waiting for the start button.
export function quitRace(): void {
  phase = 'waiting';
  clock = 0;
  finishedAt = null;
  winners = [];
  solo = null;
  paused = false;
  restart = null;
}

export function updateRace(dt: number): void {
  if (phase === 'waiting' || paused) return;
  const total = COUNTDOWN.from * COUNTDOWN.step;
  if (restart !== null) {
    restart += dt;
    if (restart < total) return; // the race clock waits for "LOS!"
    if (restart >= total + COUNTDOWN.goTime) restart = null;
  }
  clock += dt;
  if (phase === 'countdown' && clock >= total) phase = 'racing';
}

// The cars stay at the start line until the countdown is over, stand still while the race is paused
// and until "LOS!" after it, and stop when someone has won.
export function carsCanDrive(): boolean {
  const waitingForGo = restart !== null && restart < COUNTDOWN.from * COUNTDOWN.step;
  return phase === 'racing' && !paused && !waitingForGo;
}

// Laps: the track is split into SECTORS stretches. A car has to drive through them in order, and
// crossing the start/finish line after the last one counts as a lap. Driving backward takes them
// away again, so going back and forth over the line doesn't count.
const SECTORS = 4;

// Call after the cars have moved. Ends the race when someone has driven all the laps;
// racing alone, that also checks the time against the record.
export function countLaps(players: Player[]): void {
  for (const p of players) {
    const now = Math.floor(p.lapPosition() * SECTORS);
    const before = ((p.sectorsPassed % SECTORS) + SECTORS) % SECTORS;
    if (now === (before + 1) % SECTORS) p.sectorsPassed++;
    else if (now === (before + SECTORS - 1) % SECTORS) p.sectorsPassed--;
  }
  // Check everyone before picking a winner, so a dead heat isn't won by whoever comes first in the list.
  const done = players.filter((p) => lapsDone(p) >= RACE.laps);
  if (done.length > 0) {
    winners = done;
    phase = 'finished';
    finishedAt = clock;
    if (players.length === 1) solo = { time: raceTime(), newRecord: saveTime(raceTime()) };
  }
}

// Laps finished so far.
export function lapsDone(p: Player): number {
  return Math.max(0, Math.floor(p.sectorsPassed / SECTORS));
}

// The countdown and what it shows right now ("3", "2", "1", then the go sign), and how long it has been
// up: 0 = just appeared, 1 = about to go. Null when there's nothing to show. That's the countdown at
// the start, or the one after a pause; while paused, nothing.
export function countdownSign(): { text: string; age: number; go: boolean } | null {
  if (phase === 'waiting' || paused) return null;
  const { from, step, go, goTime } = COUNTDOWN;
  const total = from * step;
  const t = restart ?? clock;
  if (t < total) {
    const shown = Math.floor(t / step);
    return { text: String(from - shown), age: (t - shown * step) / step, go: false };
  }
  if (t < total + goTime) return { text: go, age: (t - total) / goTime, go: true };
  return null;
}
