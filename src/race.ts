// How far the race has got: waiting for the start button, counting down, racing, or finished.
// Also counts everyone's laps and decides who wins.
import { COUNTDOWN, RACE } from './config';
import type { Player } from './player';
import { saveTime } from './records';
import { lapPosition } from './track';

export type Phase = 'waiting' | 'countdown' | 'racing' | 'finished';

let phase: Phase = 'waiting';
let clock = 0; // seconds since the countdown started
let finishedAt: number | null = null; // the clock when the race ended
let winners: Player[] = [];
let solo: { time: number; newRecord: boolean } | null = null; // how a one-player race went

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
}

export function updateRace(dt: number): void {
  if (phase === 'waiting') return;
  clock += dt;
  if (phase === 'countdown' && clock >= COUNTDOWN.from * COUNTDOWN.step) phase = 'racing';
}

// The cars stay at the start line until the countdown is over, and stop when someone has won.
export function carsCanDrive(): boolean {
  return phase === 'racing';
}

// Laps: the track is split into SECTORS stretches. A car has to drive through them in order, and
// crossing the start/finish line after the last one counts as a lap. Driving backward takes them
// away again, so going back and forth over the line doesn't count.
const SECTORS = 4;

// Call after the cars have moved. Ends the race when someone has driven all the laps;
// racing alone, that also checks the time against the record.
export function countLaps(players: Player[]): void {
  for (const p of players) {
    const now = Math.floor(lapPosition(p.x, p.y) * SECTORS);
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
// up: 0 = just appeared, 1 = about to go. Null when there's nothing to show.
export function countdownSign(): { text: string; age: number; go: boolean } | null {
  if (phase === 'waiting') return null;
  const { from, step, go, goTime } = COUNTDOWN;
  const total = from * step;
  if (clock < total) {
    const shown = Math.floor(clock / step);
    return { text: String(from - shown), age: (clock - shown * step) / step, go: false };
  }
  if (clock < total + goTime) return { text: go, age: (clock - total) / goTime, go: true };
  return null;
}
