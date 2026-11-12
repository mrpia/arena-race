import {
  ARENA,
  GRAVITY,
  HOP_SPEED,
  OFF_TRACK_SPEED,
  PLAYER_GRIP,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  type PlayerConfig,
  TURN_SPEED,
} from './config';
import { isDown, wasPressed } from './input';
import { onTrack, startSpot } from './track';

export class Player {
  x: number;
  y: number;
  z = 0; // height above the floor, for hopping
  angle: number; // which way the car points, in radians: 0 = right, PI / 2 = down
  vx = 0;
  vy = 0;
  vz = 0;
  radius = PLAYER_RADIUS;

  constructor(public config: PlayerConfig) {
    const spot = startSpot(config.lane);
    this.x = spot.x;
    this.y = spot.y;
    this.angle = spot.angle;
  }

  update(dt: number): void {
    const c = this.config.controls;

    // Left and right turn the car. There's no gas or brake: it always drives at PLAYER_SPEED.
    const steer = (isDown(c.right) ? 1 : 0) - (isDown(c.left) ? 1 : 0);
    this.angle += steer * ((TURN_SPEED * Math.PI) / 180) * dt;

    // Off the track the car is slower. What counts is the spot under the middle of the car,
    // even while it hops, so hopping across the grass is no shortcut.
    const speed = onTrack(this.x, this.y) ? PLAYER_SPEED : PLAYER_SPEED * OFF_TRACK_SPEED;

    // Ease velocity toward "full speed where the nose points" instead of snapping to it,
    // so the car speeds up at the start and drifts a little in tight turns.
    const blend = Math.min(1, PLAYER_GRIP * dt);
    this.vx += (Math.cos(this.angle) * speed - this.vx) * blend;
    this.vy += (Math.sin(this.angle) * speed - this.vy) * blend;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Action button: a hop for now. Swap this for a turbo, a horn, etc.
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
