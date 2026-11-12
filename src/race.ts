// How far the race has got: waiting for the start button, counting down, or racing.
import { COUNTDOWN } from './config';

export type Phase = 'waiting' | 'countdown' | 'racing';

let phase: Phase = 'waiting';
let clock = 0; // seconds since the countdown started

export function racePhase(): Phase {
  return phase;
}

export function startCountdown(): void {
  phase = 'countdown';
  clock = 0;
}

export function updateRace(dt: number): void {
  if (phase === 'waiting') return;
  clock += dt;
  if (phase === 'countdown' && clock >= COUNTDOWN.from * COUNTDOWN.step) phase = 'racing';
}

// The cars stay at the start line until the countdown is over.
export function carsCanDrive(): boolean {
  return phase === 'racing';
}

// What the countdown shows right now ("3", "2", "1", then the go sign), and how long it has been up:
// 0 = just appeared, 1 = about to go. Null when there's nothing to show.
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
