import {
  ARENA,
  BRAKE_SPEED,
  CAR,
  type Controls,
  DRIFT,
  OFF_TRACK_SPEED,
  PLAYER_GRIP,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  type PlayerConfig,
  SKID_MARKS,
  TIRES,
  TURN_SPEED,
} from './config';
import { isDown } from './input';
import { addSkidMark } from './skidmarks';
import { getTrack, onTrack, startSpot } from './track';

type Spot = { x: number; y: number };

export interface PlayerOptions {
  lane?: number; // where across the start line to start, instead of the player's own lane
  controls?: Controls[]; // key sets that steer this car, instead of just the player's own
}

export class Player {
  x: number;
  y: number;
  angle: number; // which way the car points, in radians: 0 = right, PI / 2 = down
  vx = 0;
  vy = 0;
  radius = PLAYER_RADIUS;
  bouncing = 0; // seconds left sliding back after hitting the tires
  // Stretches of track driven through in order (see race.ts). Cars start just behind the
  // start/finish line, so crossing it for the first time brings this to 0: the first lap begins.
  sectorsPassed = -1;
  private lastWheels: [Spot, Spot] | null = null; // where the back wheels were, while leaving skid marks
  readonly controls: Controls[]; // any of these key sets steers the car

  constructor(
    public config: PlayerConfig,
    options: PlayerOptions = {},
  ) {
    this.controls = options.controls ?? [config.controls];
    const spot = startSpot(options.lane ?? config.lane);
    this.x = spot.x;
    this.y = spot.y;
    this.angle = spot.angle;
  }

  // Is this key held in any of the car's key sets?
  private held(key: keyof Controls): boolean {
    return this.controls.some((c) => isDown(c[key]));
  }

  update(dt: number): void {
    const drifting = this.held('drift');
    const asphalt = onTrack(this.x, this.y);

    // Left and right turn the car; while drifting the nose swings round faster.
    const steer = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    const turnSpeed = drifting ? DRIFT.turnSpeed : TURN_SPEED;
    this.angle += steer * ((turnSpeed * Math.PI) / 180) * dt;

    // There's no gas pedal: the car always drives at PLAYER_SPEED, unless it's braking or on the grass.
    // What counts for the grass is the spot under the middle of the car.
    let speed = PLAYER_SPEED;
    if (!asphalt) speed *= OFF_TRACK_SPEED;
    if (this.held('brake')) speed *= BRAKE_SPEED;

    if (this.bouncing > 0) {
      // Just hit the tires: slide back and slow down, then drive again.
      this.bouncing -= dt;
      const slowDown = Math.max(0, 1 - 4 * dt);
      this.vx *= slowDown;
      this.vy *= slowDown;
    } else {
      // Ease velocity toward "full speed where the nose points" instead of snapping to it.
      // With less grip (drifting) it takes longer, so the car slides sideways.
      const grip = drifting ? DRIFT.grip : PLAYER_GRIP;
      const blend = Math.min(1, grip * dt);
      this.vx += (Math.cos(this.angle) * speed - this.vx) * blend;
      this.vy += (Math.sin(this.angle) * speed - this.vy) * blend;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.bounceOffTires();
    this.stayInArena();
    this.leaveSkidMarks(drifting && asphalt);
  }

  // How far the car is sliding sideways: the angle between where the nose points and where it goes, in degrees.
  slideAngle(): number {
    if (Math.hypot(this.vx, this.vy) < 40) return 0; // too slow to skid
    const diff = Math.atan2(this.vy, this.vx) - this.angle;
    return Math.abs((Math.atan2(Math.sin(diff), Math.cos(diff)) * 180) / Math.PI);
  }

  // The back wheels draw black lines on the asphalt while the car slides.
  private leaveSkidMarks(canSkid: boolean): void {
    if (!canSkid || this.slideAngle() < SKID_MARKS.slide) {
      this.lastWheels = null;
      return;
    }
    const back = (-CAR.length / 2) * CAR.axles.back;
    const side = CAR.width / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const wheel = (s: number): Spot => ({ x: this.x + cos * back - sin * s, y: this.y + sin * back + cos * s });
    const wheels: [Spot, Spot] = [wheel(-side), wheel(side)];
    if (this.lastWheels) {
      addSkidMark(this.lastWheels[0], wheels[0]);
      addSkidMark(this.lastWheels[1], wheels[1]);
    }
    this.lastWheels = wheels;
  }

  // Drive into a tire and you get pushed back out and bounce off it.
  bounceOffTires(): void {
    const closest = this.radius + TIRES.radius;
    for (const t of getTrack().tires) {
      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const d = Math.hypot(dx, dy);
      if (d >= closest || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      this.x = t.x + nx * closest;
      this.y = t.y + ny * closest;
      const into = this.vx * nx + this.vy * ny; // below 0 = moving into the tire
      if (into < 0) {
        this.vx -= (1 + TIRES.bounce) * into * nx;
        this.vy -= (1 + TIRES.bounce) * into * ny;
        this.bouncing = TIRES.bounceTime;
      }
    }
  }

  stayInArena(): void {
    const r = this.radius;
    this.x = Math.min(Math.max(this.x, r), ARENA.width - r);
    this.y = Math.min(Math.max(this.y, r), ARENA.height - r);
  }
}

// Push two overlapping players apart so they can bump but not overlap.
export function separate(a: Player, b: Player): void {
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
