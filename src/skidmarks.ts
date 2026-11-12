// Black marks left on the asphalt by drifting cars. Each one is a short line in world units
// that fades away as it gets older. render.ts draws them.
import { SKID_MARKS } from './config';

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  age: number; // seconds since it was made
}

let marks: SkidMark[] = [];

export function addSkidMark(from: { x: number; y: number }, to: { x: number; y: number }): void {
  marks.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, age: 0 });
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
