// Everything drawn flat on top of the 3D scene: names, laps, keys, stopwatch, countdown and results.
// It has its own see-through canvas over the scene's canvas, and works in screen pixels.
import { COLORS, type Controls, COUNTDOWN, RACE, VIEW } from './config';
import type { Player } from './player';
import { countdownSign, lapsDone, raceTime, raceWinners, soloResult } from './race';
import { bestTime } from './records';

function keyLabel(code: string): string {
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

// After the race, above the start buttons: "🐱 Player 1 gewinnt!" in the winner's color,
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
  const sign = countdownSign();
  if (sign) drawCountdown(ctx, sign);
  const winners = raceWinners();
  if (winners.length > 0) drawResult(ctx, players, winners);
}
