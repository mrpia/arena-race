// The race track's shape, in world units. TRACKS in config.ts lists the points the middle of each
// track runs through; this file turns the picked one into a smooth loop and answers "is this spot on
// the track?", "how high is the road here?" and "where are the walls?". floors/track.ts paints the
// part of the road that lies on the floor; scene.ts builds the parts lifted off it (ramps, bridges).
import { ARENA, BRIDGE, CAR, FIRST_TRACK, TIRES, TRACK, TRACKS, type TrackName, type TrackPoints } from './config';

export interface TrackPoint {
  x: number;
  y: number;
}

// The line through the middle of a track and how wide it is.
export interface TrackShape {
  middle: TrackPoint[]; // points close together along the middle of the track; the last one joins up with the first
  directions: { dx: number; dy: number }[]; // which way the track runs at each of those points
  heights: number[]; // how high the road is at each of those points (0 = on the floor)
  halfWidth: number; // from the middle to either edge
}

export interface Track extends TrackShape {
  name: TrackName;
  along: number[]; // distance along the track from the start/finish line to each middle point
  lap: number; // the length of one lap
  tires: TrackPoint[]; // the middle of every tire in the tire walls
  // Posts along the walls that only cars on the floor bump into: the sides of the ramps, and the
  // walls beside a road where it passes under a bridge. Each one is WALL_POST across.
  walls: TrackPoint[];
}

export const WALL_POST = 3; // the radius of each post in Track.walls

let picked: TrackName = FIRST_TRACK;
let cached: Track | null = null;
let cachedFor = '';

// The track row under START picks the track.
export function setTrack(name: TrackName): void {
  picked = name;
}
export function currentTrack(): TrackName {
  return picked;
}

// The picked track for the arena's current size. The arena changes with the window, and the track with it.
export function getTrack(): Track {
  const key = `${picked} ${ARENA.width}x${ARENA.height}`;
  if (!cached || cachedFor !== key) {
    cached = buildTrack(picked);
    cachedFor = key;
  }
  return cached;
}

// The shape of any track in an arena of any size, without its walls (for the small maps of the tracks).
export function trackShape(name: TrackName, width: number, height: number): TrackShape {
  return buildShape(TRACKS[name].points, width, height);
}

function buildShape(points: TrackPoints, W: number, H: number): TrackShape {
  const halfWidth = (TRACK.width * H) / 2;
  const corners = points.map(([fx, fy]) => ({ x: fx * W, y: fy * H }));
  const lifts = points.map((p) => Math.max(0, p[2] ?? 0));
  const spacing = halfWidth / 4;
  const middle: TrackPoint[] = [];
  const heights: number[] = [];
  const n = corners.length;
  for (let i = 0; i < n; i++) {
    const p0 = corners[(i - 1 + n) % n];
    const p1 = corners[i];
    const p2 = corners[(i + 1) % n];
    const p3 = corners[(i + 2) % n];
    const [h1, h2] = [lifts[i], lifts[(i + 1) % n]];
    const steps = Math.max(1, Math.ceil(dist(p1, p2) / spacing));
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      middle.push(curvePoint(p0, p1, p2, p3, u));
      // The road climbs or drops in an S from one point's height to the next: flat at both ends.
      heights.push(h1 + (h2 - h1) * u * u * (3 - 2 * u));
    }
  }
  // The direction at each point: from the point before it to the point after it, as an arrow of length 1.
  const directions = middle.map((_, i) => {
    const a = middle[(i - 1 + middle.length) % middle.length];
    const b = middle[(i + 1) % middle.length];
    const len = dist(a, b) || 1;
    return { dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
  });
  return { middle, directions, heights, halfWidth };
}

function buildTrack(name: TrackName): Track {
  const shape = buildShape(TRACKS[name].points, ARENA.width, ARENA.height);
  const { middle } = shape;
  const along = [0];
  for (let i = 1; i < middle.length; i++) along.push(along[i - 1] + dist(middle[i - 1], middle[i]));
  const lap = along[along.length - 1] + dist(middle[middle.length - 1], middle[0]);
  const track: Track = { ...shape, name, along, lap, tires: [], walls: [] };
  track.tires = buildTires(track);
  track.walls = buildWalls(track);
  return track;
}

// How far apart two middle points are, going along the track (whichever way round is shorter).
function apart(track: Track, i: number, j: number): number {
  const d = Math.abs(track.along[i] - track.along[j]);
  return Math.min(d, track.lap - d);
}

// Two parts of the track this far apart (along the track) are different roads, like the two sides
// of a hairpin, or the road on a bridge and the road under it.
function farApart(track: Track): number {
  return 2 * (track.halfWidth + TIRES.runoff);
}

// Is the stretch from middle point i to the next one lifted off the floor (a ramp or a bridge)?
export function isRaised(track: TrackShape, i: number): boolean {
  const n = track.heights.length;
  return track.heights[mod(i, n)] > 0 || track.heights[mod(i + 1, n)] > 0;
}

// The raised stretches of the track: each runs from middle point `from` to middle point `to`, both
// on the floor (or the same point, if the whole track is raised). Indices can run past the end of
// the list and wrap round.
export function raisedStretches(track: TrackShape): { from: number; to: number }[] {
  const n = track.middle.length;
  const first = [...Array(n).keys()].find((i) => !isRaised(track, i));
  if (first === undefined) return [{ from: 0, to: n }];
  const stretches: { from: number; to: number }[] = [];
  for (let k = 1; k <= n; k++) {
    const i = first + k;
    if (isRaised(track, i) && !isRaised(track, i - 1)) stretches.push({ from: i, to: i });
    if (isRaised(track, i)) stretches[stretches.length - 1].to = i + 1;
  }
  return stretches;
}

// Where the tires go. Every spot up to `reach` from the middle of the track is open: the asphalt plus
// a strip of grass. The tires go around the edge of the open area. Where two far-apart parts of the
// track come so close that their open areas touch (like the two sides of the hairpin), a row of tires
// goes in between as well, or you could cut across.
// This checks a grid of spots across the arena, so it only runs when the arena changes size.
function buildTires(track: Track): TrackPoint[] {
  const { middle, halfWidth } = track;
  const r = TIRES.radius;
  const reach = halfWidth + TIRES.runoff;
  const shortcut = farApart(track); // a gap in the wall may skip at most this much track

  // A grid of spots inside the arena, kept one tire radius away from its edges.
  const step = r * 1.5;
  const cols = Math.floor((ARENA.width - 2 * r) / step) + 1;
  const rows = Math.floor((ARENA.height - 2 * r) / step) + 1;
  const spot = (c: number, row: number) => ({ x: r + c * step, y: r + row * step });
  const nearest: number[] = []; // which middle point is closest to each spot
  const away: number[] = []; // and how far away it is
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const closest = closestPoint(middle, spot(c, row));
      nearest.push(closest.index);
      away.push(closest.distance);
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
          } else if (apart(track, nearest[k], nearest[q]) > shortcut) {
            wanted.push({ x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 });
          }
        }
      }
    }
  }

  // Never put a tire on the asphalt (on the floor or under a raised road), nor so close beside a road
  // passing under a bridge that the way in is narrower than the way under it. Don't pile tires on
  // top of each other. They may overlap a little, so the wall looks closed.
  const tires: TrackPoint[] = [];
  for (const w of wanted) {
    if (middle.some((m) => dist(m, w) < halfWidth)) continue;
    if (besideUnderpass(track, w)) continue;
    if (tires.some((t) => dist(t, w) < r * 1.2)) continue;
    tires.push(w);
  }
  return tires;
}

// Is w beside a road where it passes under a bridge: near the bridge, and closer to that road than
// the walls under the bridge (BRIDGE.underpass from its edges, plus a tire)? The rows of tires
// between the roads meet at the corners of the crossing, right at the edge of the road below.
function besideUnderpass(track: Track, w: TrackPoint): boolean {
  const { middle, halfWidth } = track;
  const n = middle.length;
  const near = halfWidth + TIRES.runoff;
  const room = halfWidth + BRIDGE.underpass + TIRES.radius;
  for (let k = 0; k < n; k++) {
    if (!isRaised(track, k) || distToSegment(w.x, w.y, middle[k], middle[(k + 1) % n]) > near) continue;
    for (let j = 0; j < n; j++) {
      if (isRaised(track, j) || apart(track, k, j) <= farApart(track)) continue;
      if (distToSegment(w.x, w.y, middle[j], middle[(j + 1) % n]) < room) return true;
    }
  }
  return false;
}

// The walls only cars on the floor bump into, as a row of posts:
// - Along both sides of every ramp and bridge, wherever it's higher than a car's ride height, so
//   nobody drives into the side of a ramp, or onto it from the side. Lower down, at the bottom of
//   a ramp, a car can drive onto it from the side, and a car keeping to its lane doesn't hit the
//   end of the wall.
// - Where a road passes under a bridge: along both sides of it, BRIDGE.underpass from its edges, as
//   far as the bridge reaches. They keep cars under the bridge on their own road. The sides of
//   the bridge stay open above that road and the strip beside it, so the cars can pass.
function buildWalls(track: Track): TrackPoint[] {
  const { halfWidth } = track;
  const passage = halfWidth + BRIDGE.underpass; // from the middle of the road under a bridge to its walls
  const posts: TrackPoint[] = [];
  const add = (p: TrackPoint) => {
    if (!posts.some((q) => dist(p, q) < WALL_POST * 1.2)) posts.push(p);
  };
  const n = track.middle.length;
  for (let i = 0; i < n; i++) {
    for (const side of [-1, 1]) {
      if (isRaised(track, i)) {
        // The side of a ramp or a bridge, except over a road passing under it.
        const spots = edgeSpots(track, i, side * (halfWidth + WALL_POST), WALL_POST);
        const [h1, h2] = [track.heights[i], track.heights[(i + 1) % n]];
        spots.forEach((p, s) => {
          const high = h1 + ((h2 - h1) * s) / spots.length > CAR.rideHeight;
          if (high && !overRoad(track, p.x, p.y, i, passage)) add(p);
        });
      } else {
        // Beside a road, where it passes under a bridge.
        for (const p of edgeSpots(track, i, side * (passage + WALL_POST), WALL_POST)) {
          if (underRaised(track, p.x, p.y, i, halfWidth + WALL_POST)) add(p);
        }
      }
    }
  }
  return posts;
}

// Spots `step` apart along the line `side` to the right of the middle of the track (below 0 = to
// the left), from middle point i to the next one.
export function edgeSpots(track: TrackShape, i: number, side: number, step: number): TrackPoint[] {
  const n = track.middle.length;
  const a = track.middle[mod(i, n)];
  const b = track.middle[mod(i + 1, n)];
  const da = track.directions[mod(i, n)];
  const db = track.directions[mod(i + 1, n)];
  const pa = { x: a.x - da.dy * side, y: a.y + da.dx * side };
  const pb = { x: b.x - db.dy * side, y: b.y + db.dx * side };
  const count = Math.max(1, Math.ceil(dist(pa, pb) / step));
  const spots: TrackPoint[] = [];
  for (let s = 0; s < count; s++) spots.push(mix(pa, pb, s / count));
  return spots;
}

// Is (x, y) within `reach` of a road on the floor that is far along the track from middle point i?
// That's a road passing under the raised stretch at i.
export function overRoad(track: Track, x: number, y: number, i: number, reach: number): boolean {
  const n = track.middle.length;
  for (let j = 0; j < n; j++) {
    if (isRaised(track, j) || apart(track, i, j) <= farApart(track)) continue;
    if (distToSegment(x, y, track.middle[j], track.middle[(j + 1) % n]) <= reach) return true;
  }
  return false;
}

// Is (x, y) within `reach` of the middle of a raised stretch that is far along the track from middle point i?
function underRaised(track: Track, x: number, y: number, i: number, reach: number): boolean {
  const n = track.middle.length;
  for (let j = 0; j < n; j++) {
    if (!isRaised(track, j) || apart(track, i, j) <= farApart(track)) continue;
    if (distToSegment(x, y, track.middle[j], track.middle[(j + 1) % n]) <= reach) return true;
  }
  return false;
}

// How high the underside of a bridge is above the floor at (x, y), or null if there's no bridge
// above it. A bridge is a raised road with another road passing under it; elsewhere a raised road
// stands on its sides, and nothing is under it. Where roads lie above each other, the lowest counts.
export function ceilingAt(x: number, y: number): number | null {
  const track = getTrack();
  const { middle, heights, halfWidth } = track;
  const n = middle.length;
  const passage = halfWidth + BRIDGE.underpass + 2 * WALL_POST; // a little more than the walls beside the road below
  let lowest: number | null = null;
  for (let i = 0; i < n; i++) {
    if (!isRaised(track, i)) continue;
    const a = middle[i];
    const b = middle[(i + 1) % n];
    const k = segmentFraction(x, y, a, b);
    if (Math.hypot(x - (a.x + (b.x - a.x) * k), y - (a.y + (b.y - a.y) * k)) > halfWidth) continue;
    if (!overRoad(track, x, y, i, passage)) continue;
    const under = heights[i] + (heights[(i + 1) % n] - heights[i]) * k - BRIDGE.deck;
    if (lowest === null || under < lowest) lowest = under;
  }
  return lowest;
}

function mod(i: number, n: number): number {
  return ((i % n) + n) % n;
}

function dist(a: TrackPoint, b: TrackPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Which of the points is closest to p, and how far away it is.
function closestPoint(points: TrackPoint[], p: TrackPoint): { index: number; distance: number } {
  let index = 0;
  let best = Infinity;
  points.forEach((m, i) => {
    const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  });
  return { index, distance: Math.sqrt(best) };
}

// Where on the road a car is: the stretch from middle point `index` to the next one, how far along
// it (0 to 1), how far to the right of the middle (below 0 = to the left), how high the road is
// there, and how steeply it climbs (an arrow along the floor: which way is uphill, and how many
// units the road climbs per unit driven that way).
export interface RoadSpot {
  index: number;
  t: number;
  side: number;
  height: number;
  slope: { x: number; y: number };
  direction: { dx: number; dy: number }; // which way that stretch runs, as an arrow of length 1
  raised: boolean; // is that stretch a ramp or a bridge (isRaised)?
}

// Where on the road (x, y) is, near middle point `near`: the car's own road, followed step by step.
// Where a track crosses itself, the closest point might be on the other road; looking only near
// where the car was keeps it on its own. With near below 0, it looks along the whole track.
export function followRoad(near: number, x: number, y: number): RoadSpot {
  const { middle, heights, halfWidth } = getTrack();
  const n = middle.length;
  // A car moves less than 10 units per step; the middle points are about halfWidth / 4 apart.
  const reach = Math.max(12, Math.ceil(80 / (halfWidth / 4)));
  const from = near < 0 ? 0 : near - reach;
  const to = near < 0 ? n - 1 : near + reach;
  let best = { index: 0, t: 0, d: Infinity };
  for (let k = from; k <= to; k++) {
    const i = mod(k, n);
    const a = middle[i];
    const b = middle[(i + 1) % n];
    const t = segmentFraction(x, y, a, b);
    const d = Math.hypot(x - (a.x + (b.x - a.x) * t), y - (a.y + (b.y - a.y) * t));
    if (d < best.d) best = { index: i, t, d };
  }
  const { index, t } = best;
  const a = middle[index];
  const b = middle[(index + 1) % n];
  const length = dist(a, b) || 1;
  const dir = { dx: (b.x - a.x) / length, dy: (b.y - a.y) / length };
  const on = mix(a, b, t); // the closest spot on the middle line
  const [h1, h2] = [heights[index], heights[(index + 1) % n]];
  const climb = (h2 - h1) / length;
  return {
    index,
    t,
    // To the right, the same way round as startSpot() and the lanes.
    side: -(x - on.x) * dir.dy + (y - on.y) * dir.dx,
    height: h1 + (h2 - h1) * t,
    slope: { x: dir.dx * climb, y: dir.dy * climb },
    direction: dir,
    raised: h1 > 0 || h2 > 0,
  };
}

// How far round the track a spot on the road is: 0 at the start/finish line, going up to just under
// 1. It counts from the nearest middle point, as laps always have, so records stay comparable.
export function lapPosition(road: RoadSpot): number {
  const n = getTrack().middle.length;
  return ((road.t >= 0.5 ? road.index + 1 : road.index) % n) / n;
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

// How far along the line from a to b the spot closest to (x, y) is: 0 at a, 1 at b.
function segmentFraction(x: number, y: number, a: TrackPoint, b: TrackPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
}

// How far (x, y) is from the line between a and b.
function distToSegment(x: number, y: number, a: TrackPoint, b: TrackPoint): number {
  const k = segmentFraction(x, y, a, b);
  return Math.hypot(x - (a.x + (b.x - a.x) * k), y - (a.y + (b.y - a.y) * k));
}

// True if (x, y) is on the asphalt lying on the floor. Raised roads don't count: a car on one is
// always on the asphalt (the railings keep it there), and a car under one is on the floor.
export function onTrack(x: number, y: number): boolean {
  const track = getTrack();
  const { middle, heights, halfWidth } = track;
  const n = middle.length;
  for (let i = 0; i < n; i++) {
    if (heights[i] > 0 && heights[(i + 1) % n] > 0) continue;
    if (distToSegment(x, y, middle[i], middle[(i + 1) % n]) <= halfWidth) return true;
  }
  return false;
}

// Which way the track runs at point i of the middle, as an arrow of length 1.
// Counting past the end (or before the start) wraps around the loop.
export function trackDirection(i: number): { dx: number; dy: number } {
  const { directions } = getTrack();
  return directions[mod(i, directions.length)];
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
