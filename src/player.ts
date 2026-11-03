import {
  ARENA,
  GRAVITY,
  HOP_SPEED,
  PLAYER_GRIP,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  type PlayerConfig,
} from './config';
import { isDown, wasPressed } from './input';

export class Player {
  x: number;
  y: number;
  z = 0; // height above the floor, for hopping
  vx = 0;
  vy = 0;
  vz = 0;
  radius = PLAYER_RADIUS;

  constructor(public config: PlayerConfig) {
    this.x = config.start.x * ARENA.width;
    this.y = config.start.y * ARENA.height;
  }

  update(dt: number): void {
    const c = this.config.controls;
    let ix = (isDown(c.right) ? 1 : 0) - (isDown(c.left) ? 1 : 0);
    let iy = (isDown(c.down) ? 1 : 0) - (isDown(c.up) ? 1 : 0);

    // Diagonals shouldn't be faster than straight lines.
    const len = Math.hypot(ix, iy);
    if (len > 0) {
      ix /= len;
      iy /= len;
    }

    // Ease velocity toward the target instead of snapping to it.
    const blend = Math.min(1, PLAYER_GRIP * dt);
    this.vx += (ix * PLAYER_SPEED - this.vx) * blend;
    this.vy += (iy * PLAYER_SPEED - this.vy) * blend;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Action button: a hop for now. Swap this for shooting, dashing, etc.
    if (wasPressed(c.action) && this.z === 0) {
      this.vz = HOP_SPEED;
    }
    this.vz -= GRAVITY * dt;
    this.z = Math.max(0, this.z + this.vz * dt);
    if (this.z === 0) this.vz = 0;

    this.stayInArena();
  }

  stayInArena(): void {
    const r = this.radius;
    this.x = Math.min(Math.max(this.x, r), ARENA.width - r);
    this.y = Math.min(Math.max(this.y, r), ARENA.height - r);
  }
}

// Push two overlapping players apart so they can bump but not overlap.
export function separate(a: Player, b: Player): void {
  if (a.z > a.radius || b.z > b.radius) return; // one is jumping over the other
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const overlap = a.radius + b.radius - dist;
  if (overlap <= 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= (nx * overlap) / 2;
  a.y -= (ny * overlap) / 2;
  b.x += (nx * overlap) / 2;
  b.y += (ny * overlap) / 2;
  a.stayInArena();
  b.stayInArena();
}
