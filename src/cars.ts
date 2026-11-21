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
import { CAR, type PlayerConfig } from './config';
import { cssColor } from './cssColor';
import type { Player } from './player';

const BEVEL = 1.5; // the body's edges are rounded off this much

// A car pointing along the scene's x axis, standing on the floor.
export function buildCar(config: PlayerConfig): Group {
  const car = new Group();
  const L = CAR.length / 2;
  const W = CAR.width / 2;
  const top = CAR.rideHeight + CAR.height;

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
  car.add(body);

  // Four wheels, poking out a little at the sides.
  const { radius, width } = CAR.wheel;
  const wheelShape = new CylinderGeometry(radius, radius, width, 18);
  wheelShape.rotateX(Math.PI / 2); // axle across the car
  const rubber = new MeshLambertMaterial({ color: CAR.colors.wheels });
  for (const forward of [-L * CAR.axles.back, L * CAR.axles.front]) {
    for (const side of [-W, W]) {
      const wheel = new Mesh(wheelShape, rubber);
      wheel.position.set(forward, radius, side);
      car.add(wheel);
    }
  }

  // Racing stripe down the middle, and the windshield in front of the driver.
  const stripePaint = cssColor(CAR.colors.stripe);
  const stripe = new Mesh(
    new BoxGeometry(CAR.length - 4, 0.4, 6),
    new MeshLambertMaterial({ color: stripePaint.color, transparent: stripePaint.opacity < 1, opacity: stripePaint.opacity }),
  );
  stripe.position.set(0, top + 0.2, 0);
  car.add(stripe);

  const glass = cssColor(CAR.colors.windshield);
  const windshield = new Mesh(
    new BoxGeometry(8, 5, CAR.width - 8),
    new MeshPhongMaterial({ color: glass.color, transparent: glass.opacity < 1, opacity: glass.opacity, shininess: 90 }),
  );
  windshield.position.set(L * 0.4, top + 2.5, 0);
  windshield.name = WINDSHIELD;
  car.add(windshield);

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
  driver.name = DRIVER;
  car.add(driver);

  car.traverse((part) => (part.castShadow = part.receiveShadow = true));
  return car;
}

const DRIVER = 'driver';
const WINDSHIELD = 'windshield';

// Move the car to where the player is now. With the camera inside the car, its driver's helmet and
// windshield are hidden: they would block the view.
export function placeCar(car: Group, p: Player, cameraInside: boolean): void {
  car.position.set(p.x, 0, p.y);
  car.rotation.y = -p.angle; // turning toward +y on the floor is turning the other way round the scene's up axis
  car.getObjectByName(DRIVER)!.visible = !cameraInside;
  car.getObjectByName(WINDSHIELD)!.visible = !cameraInside;
}

