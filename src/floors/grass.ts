import { GRASS } from '../config';
import { floorEllipse, floorRect, gridStart, noise } from './shapes';

export function paintGrass(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const colors = GRASS.colors;

  ctx.fillStyle = colors.grass;
  ctx.beginPath();
  floorRect(ctx, 0, 0, W, H);
  ctx.fill();

  // Mowed stripes, like on a football pitch. One stripe sits in the middle, so both halves match.
  const s = GRASS.stripe;
  ctx.fillStyle = colors.stripes;
  ctx.beginPath();
  for (let x = gridStart(W, 2 * s) - s / 2; x < W; x += 2 * s) floorRect(ctx, x, 0, s, H);
  ctx.fill();

  // Darker tufts dotted around.
  ctx.fillStyle = colors.tufts;
  ctx.beginPath();
  for (let i = 0; i < GRASS.tufts; i++) {
    floorEllipse(ctx, noise(i, 1) * W, noise(i, 2) * H, 7, 4, 8);
  }
  ctx.fill();
}
