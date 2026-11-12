import { CAR, COLORS, type Controls, COUNTDOWN, PLAYERS, VIEW } from './config';
import { project, toPixels } from './camera';
import { drawFloor } from './floors';
import type { Player } from './player';

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

// Add a shape that turns with the car to the current path, lifted `z` above the floor.
function carPath(ctx: CanvasRenderingContext2D, p: Player, points: CarPoint[], z: number): void {
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  points.forEach(([f, s], i) => {
    const q = project(p.x + cos * f - sin * s, p.y + sin * f + cos * s, z);
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

  // Shadow on the floor. It shrinks as the car hops higher.
  const shadow = Math.max(0.4, 1 - p.z / 300);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  carPath(ctx, p, body.map(([f, s]) => [f * shadow, s * shadow]), 0);
  ctx.fill();

  // Four wheels, poking out a little at the sides.
  ctx.fillStyle = CAR.colors.wheels;
  ctx.beginPath();
  for (const f of [-L * 0.6, L * 0.55]) {
    for (const s of [-W, W]) carPath(ctx, p, box(f, s, 14, 8), p.z);
  }
  ctx.fill();

  ctx.fillStyle = p.config.color;
  ctx.beginPath();
  carPath(ctx, p, body, p.z);
  ctx.fill();

  ctx.fillStyle = CAR.colors.stripe;
  ctx.beginPath();
  carPath(ctx, p, box(0, 0, CAR.length - 4, 6), p.z);
  ctx.fill();

  ctx.fillStyle = CAR.colors.windshield;
  ctx.beginPath();
  carPath(ctx, p, box(L * 0.4, 0, 8, CAR.width - 8), p.z);
  ctx.fill();

  // The driver sits a bit behind the middle, behind the windshield.
  const seatX = p.x - Math.cos(p.angle) * L * 0.2;
  const seatY = p.y - Math.sin(p.angle) * L * 0.2;
  const seat = project(seatX, seatY, p.z);
  const size = toPixels(CAR.width * 0.85, seatY);
  ctx.font = `${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; // opaque, or the emoji inherits the shadow's transparency
  ctx.fillText(p.config.emoji, seat.sx, seat.sy);
}

function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Arrow/, '');
}

function controlsText(c: Controls): { move: string; action: string } {
  return {
    move: `steer: ${[c.left, c.right].map(keyLabel).join(' ')}`,
    action: `action: ${keyLabel(c.action)}`,
  };
}

function drawHud(ctx: CanvasRenderingContext2D, showKeys: string[] | null): void {
  ctx.textBaseline = 'top';

  // In narrow windows the two players' control lines would collide in the middle,
  // so split each into a "move" line and an "action" line.
  ctx.font = '14px system-ui, sans-serif';
  const oneLine = PLAYERS.map((cfg) => {
    const t = controlsText(cfg.controls);
    return `${t.move}   ${t.action}`;
  });
  const widths = oneLine.map((line) => ctx.measureText(line).width);
  const split = widths[0] + widths[1] + 2 * 24 + 24 > VIEW.width;

  PLAYERS.forEach((cfg, i) => {
    const left = i === 0;
    ctx.textAlign = left ? 'left' : 'right';
    const x = left ? 24 : VIEW.width - 24;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = cfg.color;
    ctx.fillText(`${cfg.emoji} ${cfg.name}`, x, 20);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    if (split) {
      const t = controlsText(cfg.controls);
      ctx.fillText(t.move, x, 50);
      ctx.fillText(t.action, x, 68);
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

export function render(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  showKeys: string[] | null,
  countdown: { text: string; age: number; go: boolean } | null,
): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  // Draw far players first so near ones overlap them.
  [...players].sort((a, b) => a.y - b.y).forEach((p) => drawCar(ctx, p));
  drawHud(ctx, showKeys);
  if (countdown) drawCountdown(ctx, countdown);
}
