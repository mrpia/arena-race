import { ARENA, CAR, COLORS, type Controls, COUNTDOWN, PLAYERS, RACE, SKID_MARKS, VIEW } from './config';
import { project, toPixels } from './camera';
import { drawFloor } from './floors';
import type { Player } from './player';
import { countdownSign, lapsDone, raceWinners } from './race';
import { skidMarks } from './skidmarks';

// A point on the car: `forward` toward its nose, `side` toward its right, in world units from its middle.
type CarPoint = [forward: number, side: number];

// The corners of a rectangle on the car, centered at (forward, side).
function box(forward: number, side: number, length: number, width: number): CarPoint[] {
  const f = length / 2;
  const s = width / 2;
  return [
    [forward + f, side - s],
    [forward + f, side + s],
    [forward - f, side + s],
    [forward - f, side - s],
  ];
}

// Add a shape that turns with the car to the current path.
function carPath(ctx: CanvasRenderingContext2D, p: Player, points: CarPoint[]): void {
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  points.forEach(([f, s], i) => {
    const q = project(p.x + cos * f - sin * s, p.y + sin * f + cos * s);
    if (i === 0) ctx.moveTo(q.sx, q.sy);
    else ctx.lineTo(q.sx, q.sy);
  });
  ctx.closePath();
}

// A race car seen from above, in the player's color, with the player's emoji as the driver.
function drawCar(ctx: CanvasRenderingContext2D, p: Player): void {
  const L = CAR.length / 2;
  const W = CAR.width / 2;
  // Square at the back, pointy at the front, so you can see which way the car is going.
  const body: CarPoint[] = [
    [-L, -W],
    [L - 10, -W],
    [L, -W * 0.5],
    [L, W * 0.5],
    [L - 10, W],
    [-L, W],
  ];

  // Four wheels, poking out a little at the sides.
  ctx.fillStyle = CAR.colors.wheels;
  ctx.beginPath();
  for (const f of [-L * CAR.axles.back, L * CAR.axles.front]) {
    for (const s of [-W, W]) carPath(ctx, p, box(f, s, 14, 8));
  }
  ctx.fill();

  ctx.fillStyle = p.config.color;
  ctx.beginPath();
  carPath(ctx, p, body);
  ctx.fill();

  ctx.fillStyle = CAR.colors.stripe;
  ctx.beginPath();
  carPath(ctx, p, box(0, 0, CAR.length - 4, 6));
  ctx.fill();

  ctx.fillStyle = CAR.colors.windshield;
  ctx.beginPath();
  carPath(ctx, p, box(L * 0.4, 0, 8, CAR.width - 8));
  ctx.fill();

  // The driver sits a bit behind the middle, behind the windshield.
  const seatX = p.x - Math.cos(p.angle) * L * 0.2;
  const seatY = p.y - Math.sin(p.angle) * L * 0.2;
  const seat = project(seatX, seatY);
  const size = toPixels(CAR.width * 0.85, seatY);
  ctx.font = `${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; // opaque, or the emoji inherits the windshield's transparency
  ctx.fillText(p.config.emoji, seat.sx, seat.sy);
}

function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Arrow/, '');
}

function controlsText(c: Controls): { steer: string; buttons: string } {
  return {
    steer: `steer: ${[c.left, c.right].map(keyLabel).join(' ')}`,
    buttons: `brake: ${keyLabel(c.brake)}   drift: ${keyLabel(c.drift)}`,
  };
}

// "Runde 2/3": the lap the player is on now, or the finish flag once they've done them all.
function lapLabel(p: Player | undefined): string {
  const done = p ? lapsDone(p) : 0;
  return done >= RACE.laps ? RACE.finishedText : `${RACE.lapText} ${done + 1}/${RACE.laps}`;
}

function drawHud(ctx: CanvasRenderingContext2D, players: Player[], showKeys: string[] | null): void {
  ctx.textBaseline = 'top';

  // In narrow windows the two players' control lines would collide in the middle,
  // so split each into a "steer" line and a "brake, drift" line.
  ctx.font = '14px system-ui, sans-serif';
  const oneLine = PLAYERS.map((cfg) => {
    const t = controlsText(cfg.controls);
    return `${t.steer}   ${t.buttons}`;
  });
  const widths = oneLine.map((line) => ctx.measureText(line).width);
  const split = widths[0] + widths[1] + 2 * 24 + 24 > VIEW.width;

  PLAYERS.forEach((cfg, i) => {
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
    ctx.fillText(lapLabel(players[i]), left ? x + gap : x - gap, 20);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    if (split) {
      const t = controlsText(cfg.controls);
      ctx.fillText(t.steer, x, 50);
      ctx.fillText(t.buttons, x, 68);
    } else {
      ctx.fillText(oneLine[i], x, 50);
    }
  });

  if (showKeys) {
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`held (${showKeys.length}): ${showKeys.join(' ')}`, VIEW.width / 2, VIEW.height - 28);
  }
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

// "🐱 Player 1 gewinnt!" above the Nochmal button, in the winner's color.
function drawWinner(ctx: CanvasRenderingContext2D, winners: Player[]): void {
  const one = winners.length === 1 ? winners[0].config : null;
  const text = one ? `${one.emoji} ${one.name} ${RACE.winText}` : RACE.tieText;
  const font = (size: number) => `bold ${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  let size = Math.min(VIEW.height * 0.12, 72);
  ctx.save();
  ctx.font = font(size);
  // Shrink it to fit narrow windows.
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
  const y = VIEW.height / 2 - 90;
  ctx.strokeText(text, VIEW.width / 2, y);
  ctx.fillStyle = one ? one.color : COLORS.text;
  ctx.fillText(text, VIEW.width / 2, y);
  ctx.restore();
}

// Skid marks on the floor. Older ones are fainter; they're drawn in a few batches, one per shade.
function drawSkidMarks(ctx: CanvasRenderingContext2D): void {
  const marks = skidMarks();
  if (marks.length === 0) return;
  const shades = 4;
  ctx.save();
  ctx.strokeStyle = SKID_MARKS.color;
  ctx.lineCap = 'round';
  ctx.lineWidth = toPixels(SKID_MARKS.width, ARENA.height / 2);
  for (let shade = 0; shade < shades; shade++) {
    ctx.globalAlpha = 1 - shade / shades;
    ctx.beginPath();
    for (const m of marks) {
      if (Math.min(shades - 1, Math.floor((m.age / SKID_MARKS.fadeTime) * shades)) !== shade) continue;
      const a = project(m.x1, m.y1);
      const b = project(m.x2, m.y2);
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, players: Player[], showKeys: string[] | null): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  drawSkidMarks(ctx);
  // Draw far players first so near ones overlap them.
  [...players].sort((a, b) => a.y - b.y).forEach((p) => drawCar(ctx, p));
  drawHud(ctx, players, showKeys);
  const sign = countdownSign();
  if (sign) drawCountdown(ctx, sign);
  const winners = raceWinners();
  if (winners.length > 0) drawWinner(ctx, winners);
}
