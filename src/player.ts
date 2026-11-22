import {
  ARENA,
  BRAKE_SPEED,
  BRIDGE,
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
import { followRoad, getTrack, lapPosition, onTrack, type RoadSpot, startSpot, type Track, WALL_POST } from './track';

type Spot = { x: number; y: number; z: number };
type Spot2D = { x: number; y: number };

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
  // On a ramp or a bridge (a road lifted off the floor), between its railings. Otherwise on the floor,
  // maybe under a bridge.
  raised = false;
  z = 0; // how high the car is above the floor
  slope = { x: 0, y: 0 }; // which way the road under the car climbs, and how steeply (RoadSpot in track.ts)
  // Which way the 3D car's front wheels point (cars.ts): -1 = all the way left, 1 = all the way right.
  // It follows the steering keys, swinging over in about CAR.steer.time.
  wheelTurn = 0;
  // How far the 3D car's body leans on its springs, in degrees (cars.ts, CAR.lean): `roll` toward
  // the car's right side (out of a left turn), `dip` with the nose down (below 0 = nose up).
  roll = 0;
  dip = 0;
  private rollSpeed = 0; // degrees per second
  private dipSpeed = 0;
  // Stretches of track driven through in order (see race.ts). Cars start just behind the
  // start/finish line, so crossing it for the first time brings this to 0: the first lap begins.
  sectorsPassed = -1;
  private lastWheels: [Spot, Spot] | null = null; // where the back wheels were, while leaving skid marks
  // The car's own road: the middle point of the track it's at, followed step by step (followRoad in
  // track.ts), on the track it was found on. Where a track crosses itself, that keeps a car under
  // the bridge from counting as on it, and the other way round.
  private along = -1;
  private followed: Track | null = null;
  private road: RoadSpot | null = null; // where the car was on it, after its last step
  // Right after driving onto a ramp off-centre: how much further out than usual the railings let
  // the car, shrinking to 0 at BRIDGE.squeeze, so the car slides toward the middle instead of jumping.
  private railSlack = 0;
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
    this.findRoad();
  }

  // How far round the track the car is: 0 at the start/finish line, going up to just under 1.
  lapPosition(): number {
    return this.road ? lapPosition(this.road) : 0;
  }

  // Where the car is on its own road. A car on the floor drives onto a ramp at its bottom end; the
  // side walls (Track.walls) keep it from getting on anywhere higher up. A car on a ramp is
  // back on the floor once it's past the bottom end. Sets the car's height and the slope under it.
  private findRoad(): RoadSpot {
    const track = getTrack();
    // The arena changed size, and the track with it: the same share of the way round, on the new
    // track. Looking near there, rather than along the whole track, keeps a car under a bridge
    // from landing on it.
    if (this.followed && track !== this.followed) {
      this.along = Math.round((this.along / this.followed.middle.length) * track.middle.length) % track.middle.length;
    }
    this.followed = track;
    const road = followRoad(this.along, this.x, this.y);
    this.along = road.index;
    if (!road.raised) this.raised = false;
    else if (!this.raised && Math.abs(road.side) <= track.halfWidth) {
      this.raised = true;
      this.railSlack = Math.max(0, Math.abs(road.side) - railingRoom());
    }
    this.z = this.raised ? road.height : 0;
    this.slope = this.raised ? road.slope : { x: 0, y: 0 };
    this.road = road;
    return road;
  }

  // Is this key held in any of the car's key sets?
  private held(key: keyof Controls): boolean {
    return this.controls.some((c) => isDown(c[key]));
  }

  update(dt: number): void {
    const [oldVx, oldVy] = [this.vx, this.vy];
    const drifting = this.held('drift');
    const asphalt = this.raised || onTrack(this.x, this.y);

    // Left and right turn the car; while drifting the nose swings round faster.
    const steer = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    const turnSpeed = drifting ? DRIFT.turnSpeed : TURN_SPEED;
    this.angle += steer * ((turnSpeed * Math.PI) / 180) * dt;
    this.wheelTurn += (steer - this.wheelTurn) * (1 - Math.exp(-dt / CAR.steer.time));

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
    const road = this.findRoad();
    if (this.raised) this.bounceOffRailings(road, dt);
    else {
      this.bounceOffPosts(getTrack().tires, TIRES.radius);
      this.bounceOffPosts(getTrack().walls, WALL_POST);
    }
    this.stayInArena();
    this.findRoad();
    this.leaveSkidMarks(drifting && asphalt);
    this.leanBody(oldVx, oldVy, dt);
  }

  // The body leans against how the car's speed changed in this step, like a real car on its
  // springs: out of the turn, nose down when slowing down, nose up when speeding up.
  private leanBody(oldVx: number, oldVy: number, dt: number): void {
    const ax = (this.vx - oldVx) / dt;
    const ay = (this.vy - oldVy) / dt;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const forward = ax * cos + ay * sin; // speeding up along the nose (below 0 = slowing down)
    const right = -ax * sin + ay * cos; // pushed toward the car's right side, as in a right turn
    const fullTurn = PLAYER_SPEED * ((TURN_SPEED * Math.PI) / 180); // the push of a full-speed turn at full lock
    [this.roll, this.rollSpeed] = spring(this.roll, this.rollSpeed, (-right / fullTurn) * CAR.lean.side, dt);
    [this.dip, this.dipSpeed] = spring(this.dip, this.dipSpeed, (-forward / fullTurn) * CAR.lean.nose, dt);
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
    const wheel = (s: number): Spot => {
      const x = this.x + cos * back - sin * s;
      const y = this.y + sin * back + cos * s;
      // On a ramp the back wheels sit a little lower or higher than the middle of the car.
      return { x, y, z: this.z + (x - this.x) * this.slope.x + (y - this.y) * this.slope.y };
    };
    const wheels: [Spot, Spot] = [wheel(-side), wheel(side)];
    if (this.lastWheels) {
      addSkidMark(this.lastWheels[0], wheels[0]);
      addSkidMark(this.lastWheels[1], wheels[1]);
    }
    this.lastWheels = wheels;
  }

  // Drive into a tire (or a post of the walls along a ramp) and you get pushed back out and bounce off it.
  private bounceOffPosts(posts: readonly Spot2D[], radius: number): void {
    const closest = this.radius + radius;
    for (const t of posts) {
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

  // On a ramp or a bridge, the railings along both edges keep the car on the road. It bounces off
  // them like off the tires. A railing is a straight wall, so the car touches it with its side
  // (half its width), not with the round bumper it has for tires and other cars (PLAYER_RADIUS).
  // A car that drove onto the ramp further out is squeezed in over a moment (railSlack).
  private bounceOffRailings(road: RoadSpot, dt: number): void {
    this.railSlack = Math.max(0, this.railSlack - BRIDGE.squeeze * dt);
    const limit = railingRoom() + this.railSlack;
    const over = Math.abs(road.side) - limit;
    if (over <= 0) return;
    const out = Math.sign(road.side); // toward the railing the car hit: 1 = the right one
    const nx = -road.direction.dy * out;
    const ny = road.direction.dx * out;
    this.x -= nx * over;
    this.y -= ny * over;
    const into = this.vx * nx + this.vy * ny; // above 0 = moving into the railing
    if (into > 0) {
      this.vx -= (1 + TIRES.bounce) * into * nx;
      this.vy -= (1 + TIRES.bounce) * into * ny;
      this.bouncing = TIRES.bounceTime;
    }
  }

  stayInArena(): void {
    const r = this.radius;
    this.x = Math.min(Math.max(this.x, r), ARENA.width - r);
    this.y = Math.min(Math.max(this.y, r), ARENA.height - r);
  }
}

// How far a car's middle gets from the middle of a ramp or a bridge before it touches a railing.
function railingRoom(): number {
  return Math.max(0, getTrack().halfWidth - CAR.width / 2);
}

// One step of a spring with a damper (CAR.lean): the angle swings toward `target` and settles there.
// It stops dead at the largest angle, like a car's springs pressed all the way in.
function spring(angle: number, speed: number, target: number, dt: number): [number, number] {
  const { max, bounces, damping } = CAR.lean;
  const w = 2 * Math.PI * bounces;
  speed += (w * w * (target - angle) - 2 * damping * w * speed) * dt;
  angle += speed * dt;
  return Math.abs(angle) > max ? [Math.sign(angle) * max, 0] : [angle, speed];
}

// Push two overlapping players apart so they can bump but not overlap. A car on a bridge and a car
// under it pass each other.
export function separate(a: Player, b: Player): void {
  if (Math.abs(a.z - b.z) > CAR.rideHeight + CAR.height) return;
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
