// The race track's shape, in world units. TRACK.points in config.ts lists the points the middle of
// the track runs through; this file turns them into a smooth loop and answers "is this spot on the
// track?". floors/track.ts paints it.
import { ARENA, CAR, TIRES, TRACK } from './config';

export interface TrackPoint {
  x: number;
  y: number;
}

export interface Track {
  middle: TrackPoint[]; // points close together along the middle of the track; the last one joins up with the first
  directions: { dx: number; dy: number }[]; // which way the track runs at each of those points
  halfWidth: number; // from the middle to either edge
  tires: TrackPoint[]; // the middle of every tire in the tire walls
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
  return { middle, directions, halfWidth, tires: buildTires(middle, halfWidth) };
}

// Where the tires go. Every spot up to `reach` from the middle of the track is open: the asphalt plus
// a strip of grass. The tires go around the edge of the open area. Where two far-apart parts of the
// track come so close that their open areas touch (like the two sides of the hairpin), a row of tires
// goes in between as well, or you could cut across.
// This checks a grid of spots across the arena, so it only runs when the arena changes size.
function buildTires(middle: TrackPoint[], halfWidth: number): TrackPoint[] {
  const r = TIRES.radius;
  const reach = halfWidth + TIRES.runoff;
  const shortcut = 2 * reach; // a gap in the wall may skip at most this much track

  // Distance along the track to every middle point, to tell how far apart two parts of the track are.
  const along = [0];
  for (let i = 1; i < middle.length; i++) along.push(along[i - 1] + dist(middle[i - 1], middle[i]));
  const lap = along[along.length - 1] + dist(middle[middle.length - 1], middle[0]);
  const apart = (i: number, j: number) => {
    const d = Math.abs(along[i] - along[j]);
    return Math.min(d, lap - d);
  };

  // A grid of spots inside the arena, kept one tire radius away from its edges.
  const step = r * 1.5;
  const cols = Math.floor((ARENA.width - 2 * r) / step) + 1;
  const rows = Math.floor((ARENA.height - 2 * r) / step) + 1;
  const spot = (c: number, row: number) => ({ x: r + c * step, y: r + row * step });
  const nearest: number[] = []; // which middle point is closest to each spot
  const away: number[] = []; // and how far away it is
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const p = spot(c, row);
      let best = 0;
      let bestD = Infinity;
      middle.forEach((m, i) => {
        const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      nearest.push(best);
      away.push(Math.sqrt(bestD));
    }
  }
  const at = (c: number, row: number) => row * cols + c;
  const open = (k: number) => away[k] <= reach;

  // Wherever an open spot has a neighbor that's closed, outside the arena, or next to a far-away
  // part of the track, a tire goes on the border between them.
  const wanted: TrackPoint[] = [];
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const k = at(c, row);
      if (!open(k)) continue;
      const p = spot(c, row);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = row + dr;
        if (nc < 0) wanted.push({ x: r, y: p.y });
        else if (nc >= cols) wanted.push({ x: ARENA.width - r, y: p.y });
        else if (nr < 0) wanted.push({ x: p.x, y: r });
        else if (nr >= rows) wanted.push({ x: p.x, y: ARENA.height - r });
        else {
          const q = at(nc, nr);
          const n = spot(nc, nr);
          if (!open(q)) {
            const t = (reach - away[k]) / (away[q] - away[k]); // where between p and n the open area ends
            wanted.push({ x: p.x + (n.x - p.x) * t, y: p.y + (n.y - p.y) * t });
          } else if (apart(nearest[k], nearest[q]) > shortcut) {
            wanted.push({ x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 });
          }
        }
      }
    }
  }

  // Never put a tire on the asphalt, and don't pile tires on top of each other.
  // They may overlap a little, so the wall looks closed.
  const tires: TrackPoint[] = [];
  for (const w of wanted) {
    if (middle.some((m) => dist(m, w) < halfWidth)) continue;
    if (tires.some((t) => dist(t, w) < r * 1.2)) continue;
    tires.push(w);
  }
  return tires;
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
