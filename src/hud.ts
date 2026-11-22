// Everything drawn flat on top of the 3D scene: names, laps, keys, stopwatch, countdown and results.
// It has its own see-through canvas over the scene's canvas, and works in screen pixels.
import { screenParts } from './camera';
import { ARENA, COLORS, type Controls, COUNTDOWN, RACE, TRACK_MAP, type TrackName, VIEW } from './config';
import type { Player } from './player';
import { countdownSign, lapsDone, raceTime, raceWinners, soloResult } from './race';
import { bestTime } from './records';
import { getTrack, raisedStretches, type Track, trackShape, type TrackShape } from './track';

// "KeyA" -> "A", "ArrowLeft" -> "Left"
export function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Arrow/, '');
}

// Every key set that steers the car: "steer: A D / Left Right", "brake: S / Down   drift: Space / Enter".
function controlsText(sets: Controls[]): { steer: string; buttons: string } {
  const keys = (pick: (c: Controls) => string[]) => sets.map((c) => pick(c).map(keyLabel).join(' ')).join(' / ');
  return {
    steer: `steer: ${keys((c) => [c.left, c.right])}`,
    buttons: `brake: ${keys((c) => [c.brake])}   drift: ${keys((c) => [c.drift])}`,
  };
}

function seconds(t: number): string {
  return `${t.toFixed(1)} s`;
}

// "Runde 2/3": the lap the player is on now, or the finish flag once they've done them all.
function lapLabel(p: Player): string {
  const done = lapsDone(p);
  return done >= RACE.laps ? RACE.finishedText : `${RACE.lapText} ${done + 1}/${RACE.laps}`;
}

// The debug line at the bottom (the key left of 1 turns it on): keys held, and frames drawn per second.
export interface DebugInfo {
  keys: string[];
  fps: number;
}

function drawHud(ctx: CanvasRenderingContext2D, players: Player[], debug: DebugInfo | null): void {
  ctx.textBaseline = 'top';
  const solo = players.length === 1;

  // In narrow windows the control lines would collide in the middle (with the other player's,
  // or with the stopwatch), so split each into a "steer" line and a "brake, drift" line.
  ctx.font = '14px system-ui, sans-serif';
  const texts = players.map((p) => controlsText(p.controls));
  const oneLine = texts.map((t) => `${t.steer}   ${t.buttons}`);
  const widths = oneLine.map((line) => ctx.measureText(line).width);
  const stopwatch = solo ? 180 : 0; // room the stopwatch needs on the right
  const split = widths.reduce((a, b) => a + b, 0) + stopwatch + 2 * 24 + 24 > VIEW.width;

  players.forEach((p, i) => {
    const cfg = p.config;
    const left = i === 0;
    ctx.textAlign = left ? 'left' : 'right';
    const x = left ? 24 : VIEW.width - 24;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = cfg.color;
    const name = `${cfg.emoji} ${cfg.name}`;
    ctx.fillText(name, x, 20);
    // The lap counter sits next to the name, on the side toward the middle of the screen.
    const gap = ctx.measureText(name).width + 18;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(lapLabel(p), left ? x + gap : x - gap, 20);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    if (split) {
      ctx.fillText(texts[i].steer, x, 50);
      ctx.fillText(texts[i].buttons, x, 68);
    } else {
      ctx.fillText(oneLine[i], x, 50);
    }
  });

  if (solo) drawStopwatch(ctx);

  if (debug) {
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`held (${debug.keys.length}): ${debug.keys.join(' ')}   ${debug.fps} fps`, VIEW.width / 2, VIEW.height - 28);
  }
}

// Racing alone: the time since "LOS!" and the record, on the right where player 2 would be.
function drawStopwatch(ctx: CanvasRenderingContext2D): void {
  const x = VIEW.width - 24;
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`⏱ ${seconds(raceTime())}`, x, 20);
  ctx.font = '14px system-ui, sans-serif';
  const best = bestTime();
  ctx.fillText(`${RACE.recordText}: ${best === null ? '–' : seconds(best)}`, x, 50);
}

// The track map is copied onto the HUD every frame from pictures painted once: the map itself (its
// dark box, the track and the start line), and a dot for each car that is turned the way the car
// faces. Drawing the box and dots as shapes every frame cost about 15 fps in one test browser.
const mapPicture = document.createElement('canvas');
let mapPaintedFor: { track: Track; width: number; dpr: number } | null = null;
const dotPictures = new Map<string, HTMLCanvasElement>(); // per car color and pixel density

const MAP_PADDING = 8; // between the map and the edge of its dark box
const RESULT_REACH = 130; // the winner's line (drawResult) reaches up to about this far above the middle

// Split screen: a small map of the whole track at the top in the middle, over the line between the
// halves, with a dot for each car pointing the way it drives.
function drawTrackMap(ctx: CanvasRenderingContext2D, players: Player[]): void {
  const shape = ARENA.height / ARENA.width;
  const room = VIEW.height / 2 - RESULT_REACH - TRACK_MAP.top - 2 * MAP_PADDING; // height it can have
  const width = Math.min(TRACK_MAP.width, VIEW.width * 0.25, room / shape);
  if (width < 40) return; // too small to be any use
  const height = width * shape;
  const left = (VIEW.width - width) / 2;
  const top = TRACK_MAP.top + MAP_PADDING;
  const scale = width / ARENA.width; // screen pixels per world unit

  const track = getTrack();
  const dpr = window.devicePixelRatio || 1;
  const painted = mapPaintedFor;
  if (!painted || painted.track !== track || painted.width !== width || painted.dpr !== dpr) {
    paintMapPicture(track, width, height, dpr);
    mapPaintedFor = { track, width, dpr };
  }
  ctx.drawImage(mapPicture, left - MAP_PADDING, top - MAP_PADDING, width + 2 * MAP_PADDING, height + 2 * MAP_PADDING);

  for (const p of players) {
    const dot = dotPicture(p.config.color, dpr);
    const size = dot.width / dpr;
    ctx.save();
    ctx.translate(left + p.x * scale, top + p.y * scale);
    ctx.rotate(p.angle);
    ctx.drawImage(dot, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

// The map picture: the dark box, and on it the track, scaled down (drawTrack).
function paintMapPicture(track: Track, width: number, height: number, dpr: number): void {
  mapPicture.width = Math.round((width + 2 * MAP_PADDING) * dpr);
  mapPicture.height = Math.round((height + 2 * MAP_PADDING) * dpr);
  const g = mapPicture.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = TRACK_MAP.colors.background;
  g.beginPath();
  g.roundRect(0, 0, width + 2 * MAP_PADDING, height + 2 * MAP_PADDING, 10);
  g.fill();
  const scale = width / ARENA.width; // pixels per world unit
  g.translate(MAP_PADDING, MAP_PADDING);
  g.scale(scale, scale);
  drawTrack(g, track, scale);
}

// A small map of a track for the track row under START, on a canvas TRACK_MAP.rowWidth pixels
// wide: the dark box with the track on it, in an arena shaped like a common window's (3:2).
export function paintTrackPicture(picture: HTMLCanvasElement, name: TrackName): void {
  const dpr = window.devicePixelRatio || 1;
  const width = TRACK_MAP.rowWidth;
  const height = Math.round((width * 2) / 3);
  const pad = 4;
  picture.width = Math.round(width * dpr);
  picture.height = Math.round(height * dpr);
  picture.style.width = `${width}px`;
  picture.style.height = `${height}px`;
  const g = picture.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = TRACK_MAP.colors.background;
  g.beginPath();
  g.roundRect(0, 0, width, height, 6);
  g.fill();
  const arena = { width: 900, height: 600 };
  const scale = (width - 2 * pad) / arena.width;
  g.translate(pad, pad);
  g.scale(scale, (height - 2 * pad) / arena.height);
  drawTrack(g, trackShape(name, arena.width, arena.height), scale);
}

// The track seen from above, in world units (`scale` is the screen pixels per world unit): a white
// band the track's width, a gray one a little narrower on top (which leaves the edges white), and the
// start/finish line. Ramps and bridges come last, so they lie on top of the road they cross.
function drawTrack(g: CanvasRenderingContext2D, track: TrackShape, scale: number): void {
  const { middle, halfWidth } = track;
  const n = middle.length;
  const raised = raisedStretches(track);
  // The parts on the floor run from the end of one raised stretch to the start of the next.
  const flat = raised.map((r, i) => ({ from: r.to, to: raised[(i + 1) % raised.length].from }));
  for (const f of flat) if (f.to <= f.from) f.to += n;
  const stroke = (parts: { from: number; to: number }[], closed: boolean) => {
    g.beginPath();
    for (const part of parts) {
      for (let k = part.from; k <= part.to; k++) {
        const p = middle[k % n];
        if (k === part.from) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
    }
    if (closed) g.closePath();
    g.strokeStyle = TRACK_MAP.colors.edge;
    g.lineWidth = 2 * halfWidth;
    g.stroke();
    g.strokeStyle = TRACK_MAP.colors.track;
    g.lineWidth = 2 * halfWidth - (2 * TRACK_MAP.edge) / scale;
    g.stroke();
  };
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (raised.length === 0) stroke([{ from: 0, to: n - 1 }], true);
  else {
    stroke(flat, false);
    g.lineCap = 'butt';
    stroke(raised, false);
  }
  // The start/finish line runs straight across the track at its first point.
  const { dx, dy } = track.directions[0];
  const start = middle[0];
  g.beginPath();
  g.moveTo(start.x + dy * halfWidth, start.y - dx * halfWidth);
  g.lineTo(start.x - dy * halfWidth, start.y + dx * halfWidth);
  g.strokeStyle = TRACK_MAP.colors.start;
  g.lineWidth = 2 / scale;
  g.stroke();
}

// A car on the map: a dot in the car's color with a point in front (to the right, before turning),
// outlined in white, in the middle of a small square picture.
function dotPicture(color: string, dpr: number): HTMLCanvasElement {
  const key = `${color} ${dpr}`;
  let picture = dotPictures.get(key);
  if (picture) return picture;
  const r = TRACK_MAP.carSize;
  const nose = 1.9 * r; // how far the point sticks out in front
  const side = Math.acos(r / nose); // where the point's sides touch the dot
  const size = 2 * Math.ceil(nose + 2); // room for the point and the outline
  picture = document.createElement('canvas');
  picture.width = picture.height = Math.ceil(size * dpr);
  const g = picture.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, (size * dpr) / 2, (size * dpr) / 2);
  g.beginPath();
  g.moveTo(nose, 0);
  g.arc(0, 0, r, side, 2 * Math.PI - side);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = '#ffffff';
  g.stroke();
  dotPictures.set(key, picture);
  return picture;
}

// The big "3", "2", "1", "LOS!" in the middle of the screen. Each one pops in big, settles, and fades out.
function drawCountdown(ctx: CanvasRenderingContext2D, sign: { text: string; age: number; go: boolean }): void {
  const pop = 1 + 0.5 * Math.pow(1 - Math.min(1, sign.age * 4), 3);
  const size = Math.min(VIEW.height * 0.3, 220) * pop;
  ctx.save();
  ctx.globalAlpha = sign.age > 0.8 ? (1 - sign.age) / 0.2 : 1;
  ctx.font = `bold ${Math.round(size)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 10;
  ctx.strokeStyle = COUNTDOWN.colors.outline;
  ctx.strokeText(sign.text, VIEW.width / 2, VIEW.height / 2);
  ctx.fillStyle = sign.go ? COUNTDOWN.colors.go : COUNTDOWN.colors.numbers;
  ctx.fillText(sign.text, VIEW.width / 2, VIEW.height / 2);
  ctx.restore();
}

// Big outlined text across the middle of the screen, shrunk to fit narrow windows.
function drawBigText(ctx: CanvasRenderingContext2D, text: string, color: string, y: number, maxSize: number): void {
  const font = (size: number) => `bold ${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  let size = Math.min(VIEW.height * 0.12, maxSize);
  ctx.save();
  ctx.font = font(size);
  const width = ctx.measureText(text).width;
  if (width > VIEW.width * 0.9) {
    size *= (VIEW.width * 0.9) / width;
    ctx.font = font(size);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 8;
  ctx.strokeStyle = COUNTDOWN.colors.outline;
  ctx.strokeText(text, VIEW.width / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW.width / 2, y);
  ctx.restore();
}

// After the race, above the start button: "🐱 Player 1 gewinnt!" in the winner's color,
// or racing alone, the time and the record.
function drawResult(ctx: CanvasRenderingContext2D, players: Player[], winners: Player[]): void {
  const middle = VIEW.height / 2;
  const solo = soloResult();
  if (players.length === 1 && solo) {
    drawBigText(ctx, `🏁 ${seconds(solo.time)}`, players[0].config.color, middle - 150, 72);
    const best = bestTime();
    const line = solo.newRecord ? RACE.newRecordText : `${RACE.recordText}: ${best === null ? '–' : seconds(best)}`;
    drawBigText(ctx, line, solo.newRecord ? RACE.recordColor : COLORS.text, middle - 85, 40);
    return;
  }
  const one = winners.length === 1 ? winners[0].config : null;
  const text = one ? `${one.emoji} ${one.name} ${RACE.winText}` : RACE.tieText;
  drawBigText(ctx, text, one ? one.color : COLORS.text, middle - 90, 72);
}

export function renderHud(ctx: CanvasRenderingContext2D, players: Player[], debug: DebugInfo | null): void {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  // A soft dark edge round the text keeps it readable over the sky and the floor.
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 4;
  drawHud(ctx, players, debug);
  ctx.restore();
  if (screenParts(players.length).length > 1) drawTrackMap(ctx, players);
  const sign = countdownSign();
  if (sign) drawCountdown(ctx, sign);
  const winners = raceWinners();
  if (winners.length > 0) drawResult(ctx, players, winners);
}
