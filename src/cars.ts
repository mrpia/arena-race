// The race cars in 3D: a body in the player's color with the same outline as before (square at the
// back, pointy at the front), four wheels, a racing stripe, a windshield, and the driver's helmet.
// Sizes come from CAR in config.ts, in world units.
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Shape,
  SphereGeometry,
} from 'three';
import { CAR, PLAYERS, type PlayerConfig } from './config';
import { cssColor } from './cssColor';
import type { Player } from './player';

const BEVEL = 1.5; // the body's edges are rounded off this much

// The parts of each car that move on their own, for placeCar().
const movingParts = new WeakMap<Group, { frontWheels: Mesh[]; leaning: Group }>();

// A car pointing along the scene's x axis, standing on the floor.
export function buildCar(config: PlayerConfig): Group {
  const car = new Group();
  const L = CAR.length / 2;
  const W = CAR.width / 2;
  const top = CAR.rideHeight + CAR.height;
  // Everything but the wheels leans on the springs (placeCar), tipping round the middle of the
  // car on the floor.
  const leaning = new Group();
  car.add(leaning);

  // The body: its outline seen from above, pulled up into a slab. The outline is drawn a bevel
  // smaller all round, because the rounded edges grow it back to full size.
  const l = L - BEVEL;
  const w = W - BEVEL;
  const outline = new Shape();
  outline.moveTo(-l, -w);
  outline.lineTo(l - 10, -w);
  outline.lineTo(l, -w * 0.5);
  outline.lineTo(l, w * 0.5);
  outline.lineTo(l - 10, w);
  outline.lineTo(-l, w);
  outline.closePath();
  const bodyShape = new ExtrudeGeometry(outline, {
    depth: CAR.height - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
  });
  bodyShape.rotateX(-Math.PI / 2); // the slab was pulled up along z; stand it on the floor instead
  bodyShape.translate(0, CAR.rideHeight + BEVEL, 0);
  const body = new Mesh(bodyShape, new MeshPhongMaterial({ color: config.color, shininess: 60, specular: 0x333333 }));
  leaning.add(body);

  // Four wheels, poking out a little at the sides. The front ones turn with the steering (placeCar).
  const { radius, width } = CAR.wheel;
  const wheelShape = new CylinderGeometry(radius, radius, width, 18);
  wheelShape.rotateX(Math.PI / 2); // axle across the car
  const rubber = new MeshLambertMaterial({ color: CAR.colors.wheels });
  const frontWheels: Mesh[] = [];
  for (const forward of [-L * CAR.axles.back, L * CAR.axles.front]) {
    for (const side of [-W, W]) {
      const wheel = new Mesh(wheelShape, rubber);
      wheel.position.set(forward, radius, side);
      car.add(wheel);
      if (forward > 0) frontWheels.push(wheel);
    }
  }

  // Racing stripe down the middle, and the windshield in front of the driver.
  const stripePaint = cssColor(CAR.colors.stripe);
  const stripe = new Mesh(
    new BoxGeometry(CAR.length - 4, 0.4, 6),
    new MeshLambertMaterial({ color: stripePaint.color, transparent: stripePaint.opacity < 1, opacity: stripePaint.opacity }),
  );
  stripe.position.set(0, top + 0.2, 0);
  leaning.add(stripe);

  const glass = cssColor(CAR.colors.windshield);
  const windshield = new Mesh(
    new BoxGeometry(8, 5, CAR.width - 8),
    new MeshPhongMaterial({ color: glass.color, transparent: glass.opacity < 1, opacity: glass.opacity, shininess: 90 }),
  );
  windshield.position.set(L * 0.4, top + 2.5, 0);
  leaning.add(windshield);

  // The driver sits a bit behind the middle: a round helmet, half sunk into the car, with a dark
  // visor on the front. The visor is a slice of a slightly bigger ball, from the eyes to the chin
  // and a third of the way round.
  const r = (CAR.width * CAR.helmetSize) / 2;
  const driver = new Group();
  const helmet = new Mesh(
    new SphereGeometry(r, 18, 12),
    new MeshPhongMaterial({ color: CAR.colors.helmet, shininess: 80, specular: 0x444444 }),
  );
  const visor = new Mesh(
    new SphereGeometry(r * 1.04, 18, 4, Math.PI - 1, 2, 1, 0.65), // phi = π faces the car's front
    new MeshPhongMaterial({ color: CAR.colors.visor, shininess: 100, specular: 0x666666 }),
  );
  driver.add(helmet, visor);
  driver.position.set(-L * 0.2, top + r * 0.5, 0);
  leaning.add(driver);

  car.traverse((part) => (part.castShadow = part.receiveShadow = true));
  // The driver and the windshield go on a layer of their own, so the camera in the driver's seat
  // can leave them out (camera.ts) while every other camera still sees them.
  for (const part of [windshield, helmet, visor]) part.layers.set(carLayer(config));
  movingParts.set(car, { frontWheels, leaning });
  // Turn first, then tip the nose up or down, then tip sideways (see placeCar).
  car.rotation.order = 'YZX';
  return car;
}

// The layer of this player's driver and windshield: 1 for player 1, 2 for player 2. Layer 0 has
// everything else.
export function carLayer(config: PlayerConfig): number {
  return 1 + Math.max(0, PLAYERS.indexOf(config));
}

// Move the car to where the player is now, point its front wheels where it steers, and lean its body.
// On a ramp the whole car tips with the road: nose up going uphill, and sideways when the road
// slopes down to one side of the car.
export function placeCar(car: Group, p: Player): void {
  car.position.set(p.x, p.z, p.y);
  car.rotation.y = -p.angle; // turning toward +y on the floor is turning the other way round the scene's up axis
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  car.rotation.z = Math.atan(p.slope.x * cos + p.slope.y * sin); // the road climbs this much toward the nose
  car.rotation.x = -Math.atan(-p.slope.x * sin + p.slope.y * cos); // and this much toward the car's right side
  const parts = movingParts.get(car);
  if (!parts) return;
  const steer = -p.wheelTurn * ((CAR.steer.angle * Math.PI) / 180); // the same way round as the car itself
  for (const wheel of parts.frontWheels) wheel.rotation.y = steer;
  parts.leaning.rotation.x = (p.roll * Math.PI) / 180; // the car's right side (+z) goes down
  parts.leaning.rotation.z = (-p.dip * Math.PI) / 180; // the nose (+x) goes down
}

