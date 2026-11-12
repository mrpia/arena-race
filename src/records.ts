// The best time for racing alone, kept in this browser.
// The track grows with the window, so a bigger window means a longer lap and a slower time.
// That's why every window size keeps its own record, and so does every number of laps and
// every track shape: a new track starts a new record.
import { ARENA, RACE, TRACK } from './config';

// A short code that changes whenever the track points change.
function trackCode(): string {
  let h = 0;
  for (const ch of JSON.stringify(TRACK.points)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

function key(): string {
  return `arena-starter.record.${ARENA.width}x${ARENA.height}.${RACE.laps}laps.${trackCode()}`;
}

// Reading storage can fail (private windows, blocked site data); then there's just no record.
const known = new Map<string, number | null>();

export function bestTime(): number | null {
  const k = key();
  if (!known.has(k)) {
    let best: number | null = null;
    try {
      const saved = localStorage.getItem(k);
      if (saved !== null && Number.isFinite(Number(saved))) best = Number(saved);
    } catch {
      best = null;
    }
    known.set(k, best);
  }
  return known.get(k) ?? null;
}

// Keeps the time if it beats the record. True if it did.
export function saveTime(time: number): boolean {
  const best = bestTime();
  if (best !== null && time >= best) return false;
  known.set(key(), time);
  try {
    localStorage.setItem(key(), String(time));
  } catch {
    // Can't save: the record still counts until the page is reloaded.
  }
  return true;
}
