// Black marks left on the asphalt by drifting cars. Each one is a short line in world units
// that fades away as it gets older. scene.ts draws them.
import { SKID_MARKS } from './config';

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z1: number; // how high the floor or the road is under each end (on a ramp or a bridge)
  z2: number;
  age: number; // seconds since it was made
}

let marks: SkidMark[] = [];

type Spot = { x: number; y: number; z: number };

export function addSkidMark(from: Spot, to: Spot): void {
  marks.push({ x1: from.x, y1: from.y, z1: from.z, x2: to.x, y2: to.y, z2: to.z, age: 0 });
  if (marks.length > SKID_MARKS.max) marks.shift();
}

export function updateSkidMarks(dt: number): void {
  for (const m of marks) m.age += dt;
  marks = marks.filter((m) => m.age < SKID_MARKS.fadeTime);
}

export function skidMarks(): readonly SkidMark[] {
  return marks;
}

export function clearSkidMarks(): void {
  marks = [];
}
