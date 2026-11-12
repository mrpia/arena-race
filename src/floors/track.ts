// The race track, painted on top of whichever floor is picked. Its shape comes from track.ts.
import { TRACK } from '../config';
import { getTrack, trackDirection, type TrackPoint } from '../track';
import { floorEllipse, floorPolygon } from './shapes';

export function paintTrack(ctx: CanvasRenderingContext2D): void {
  const { middle, halfWidth } = getTrack();
  const colors = TRACK.colors;

  paintKerbs(ctx, middle, halfWidth);

  // A white layer goes first and is a little wider than the asphalt, so it peeks out as the edge lines.
  ctx.fillStyle = colors.edge;
  paintBand(ctx, middle, halfWidth);
  ctx.fillStyle = colors.asphalt;
  paintBand(ctx, middle, halfWidth - TRACK.edgeLine);

  paintStartLine(ctx, middle[0], halfWidth);
}

// Fill everything up to `r` away from the middle of the track, in the current fill color.
// Strips between neighboring points give clean, straight edges. Circles on every point fill in
// the inside of tight bends, where the strips fold over themselves.
function paintBand(ctx: CanvasRenderingContext2D, middle: TrackPoint[], r: number): void {
  const n = middle.length;
  ctx.beginPath();
  for (const p of middle) floorEllipse(ctx, p.x, p.y, r, r, 16);
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = middle[i];
    const b = middle[(i + 1) % n];
    const dirA = trackDirection(i);
    const dirB = trackDirection(i + 1);
    floorPolygon(ctx, [offset(a, dirA, 0, -r), offset(b, dirB, 0, -r), offset(b, dirB, 0, r), offset(a, dirA, 0, r)]);
  }
  ctx.fill();
}

// A point `forward` along the track and `side` to its right, starting from p.
function offset(p: TrackPoint, dir: { dx: number; dy: number }, forward: number, side: number): TrackPoint {
  return { x: p.x + dir.dx * forward - dir.dy * side, y: p.y + dir.dy * forward + dir.dx * side };
}

// Red and white kerbs along both edges, wherever the track bends sharply.
function paintKerbs(ctx: CanvasRenderingContext2D, middle: TrackPoint[], halfWidth: number): void {
  const n = middle.length;
  const tightest = TRACK.kerbCorners * 2 * halfWidth; // bends with a radius smaller than this get kerbs
  const inside = halfWidth - TRACK.edgeLine; // tucked under the edge line, so there's no gap
  const outside = halfWidth + TRACK.kerb;
  const stripes: TrackPoint[][][] = [[], []]; // one list per color

  // Which points sit in a sharp bend: compare the direction a little before and a little after.
  const bend = middle.map((a, i) => {
    const before = trackDirection(i - 2);
    const after = trackDirection(i + 2);
    const turn = Math.acos(Math.max(-1, Math.min(1, before.dx * after.dx + before.dy * after.dy)));
    const b = middle[(i + 1) % n];
    const stretch = Math.hypot(b.x - a.x, b.y - a.y) * 4; // the length the turn was measured over
    return turn > 0 && stretch / turn < tightest;
  });
  const isBend = (i: number) => bend[(i + n) % n];

  for (let i = 0; i < n; i++) {
    // Skip a lonely kerb stripe, and fill a one-stripe gap between two kerbs.
    const kerb = (isBend(i) && (isBend(i - 1) || isBend(i + 1))) || (isBend(i - 1) && isBend(i + 1));
    if (!kerb) continue;

    const a = middle[i];
    const b = middle[(i + 1) % n];
    const dirA = trackDirection(i);
    const dirB = trackDirection(i + 1);
    const color = stripes[i % 2];
    // Right edge, then left edge in the opposite order, so all stripes wind the same way and fill cleanly.
    color.push([offset(a, dirA, 0, inside), offset(a, dirA, 0, outside), offset(b, dirB, 0, outside), offset(b, dirB, 0, inside)]);
    color.push([offset(b, dirB, 0, -inside), offset(b, dirB, 0, -outside), offset(a, dirA, 0, -outside), offset(a, dirA, 0, -inside)]);
  }

  stripes.forEach((polygons, c) => {
    ctx.fillStyle = TRACK.colors.kerb[c];
    ctx.beginPath();
    for (const polygon of polygons) floorPolygon(ctx, polygon);
    ctx.fill();
  });
}

// A checkered band straight across the track, two squares deep.
function paintStartLine(ctx: CanvasRenderingContext2D, p: TrackPoint, halfWidth: number): void {
  const dir = trackDirection(0);
  const across = 8;
  const size = (2 * halfWidth) / across;
  TRACK.colors.checker.forEach((color, c) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < across; col++) {
        if ((row + col) % 2 !== c) continue;
        const f = (row - 1) * size;
        const s = -halfWidth + col * size;
        floorPolygon(ctx, [offset(p, dir, f, s), offset(p, dir, f + size, s), offset(p, dir, f + size, s + size), offset(p, dir, f, s + size)]);
      }
    }
    ctx.fill();
  });
}
