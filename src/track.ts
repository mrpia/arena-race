// The race track's shape, in world units. TRACK.points in config.ts lists the points the middle of
// the track runs through; this file turns them into a smooth loop and answers "is this spot on the
// track?". floors/track.ts paints it.
import { ARENA, CAR, TRACK } from './config';

export interface TrackPoint {
  x: number;
  y: number;
}

export interface Track {
  middle: TrackPoint[]; // points close together along the middle of the track; the last one joins up with the first
  directions: { dx: number; dy: number }[]; // which way the track runs at each of those points
  halfWidth: number; // from the middle to either edge
}

let cached: Track | null = null;
let cachedFor = '';

// The track for the arena's current size. The arena changes with the window, and the track with it.
export function getTrack(): Track {
  const size = `${ARENA.width}x${ARENA.height}`;
  if (!cached || cachedFor !== size) {
    cached = buildTrack();
    cachedFor = size;
  }
  return cached;
}

function buildTrack(): Track {
  const halfWidth = (TRACK.width * ARENA.height) / 2;
  const corners = TRACK.points.map(([fx, fy]) => ({ x: fx * ARENA.width, y: fy * ARENA.height }));
  const spacing = halfWidth / 4;
  const middle: TrackPoint[] = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const p0 = corners[(i - 1 + n) % n];
    const p1 = corners[i];
    const p2 = corners[(i + 1) % n];
    const p3 = corners[(i + 2) % n];
    const steps = Math.max(1, Math.ceil(dist(p1, p2) / spacing));
    for (let s = 0; s < steps; s++) middle.push(curvePoint(p0, p1, p2, p3, s / steps));
  }
  // The direction at each point: from the point before it to the point after it, as an arrow of length 1.
  const directions = middle.map((_, i) => {
    const a = middle[(i - 1 + middle.length) % middle.length];
    const b = middle[(i + 1) % middle.length];
    const len = dist(a, b) || 1;
    return { dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
  });
  return { middle, directions, halfWidth };
}

function dist(a: TrackPoint, b: TrackPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function mix(a: TrackPoint, b: TrackPoint, k: number): TrackPoint {
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

// A point on the smooth curve from p1 to p2 (u goes from 0 to 1), bent to line up with p0 before
// and p3 after. This is a "centripetal Catmull-Rom" curve: it passes through every point and
// doesn't loop or overshoot in tight corners.
function curvePoint(p0: TrackPoint, p1: TrackPoint, p2: TrackPoint, p3: TrackPoint, u: number): TrackPoint {
  const tiny = 1e-6; // two points in the same place would divide by zero
  const t1 = Math.max(tiny, Math.sqrt(dist(p0, p1)));
  const t2 = t1 + Math.max(tiny, Math.sqrt(dist(p1, p2)));
  const t3 = t2 + Math.max(tiny, Math.sqrt(dist(p2, p3)));
  const t = t1 + (t2 - t1) * u;
  const a1 = mix(p0, p1, t / t1);
  const a2 = mix(p1, p2, (t - t1) / (t2 - t1));
  const a3 = mix(p2, p3, (t - t2) / (t3 - t2));
  const b1 = mix(a1, a2, t / t2);
  const b2 = mix(a2, a3, (t - t1) / (t3 - t1));
  return mix(b1, b2, (t - t1) / (t2 - t1));
}

// How far (x, y) is from the line between a and b.
function distToSegment(x: number, y: number, a: TrackPoint, b: TrackPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a.x + dx * k), y - (a.y + dy * k));
}

// True if (x, y) is on the asphalt.
export function onTrack(x: number, y: number): boolean {
  const { middle, halfWidth } = getTrack();
  for (let i = 0; i < middle.length; i++) {
    if (distToSegment(x, y, middle[i], middle[(i + 1) % middle.length]) <= halfWidth) return true;
  }
  return false;
}

// Which way the track runs at point i of the middle, as an arrow of length 1.
// Counting past the end (or before the start) wraps around the loop.
export function trackDirection(i: number): { dx: number; dy: number } {
  const { directions } = getTrack();
  const n = directions.length;
  return directions[((i % n) + n) % n];
}

// Where a car starts: just behind the start/finish line, pointing along the track.
// lane: 0 = the track's left edge, 1 = its right edge (as seen from the driver's seat).
export function startSpot(lane: number): { x: number; y: number; angle: number } {
  const { middle, halfWidth } = getTrack();
  const { dx, dy } = trackDirection(0);
  const back = CAR.length / 2 + 10; // keeps the car's nose behind the line
  const side = (lane - 0.5) * 2 * halfWidth; // toward the car's right
  return {
    x: middle[0].x - dx * back - dy * side,
    y: middle[0].y - dy * back + dx * side,
    angle: Math.atan2(dy, dx),
  };
}
