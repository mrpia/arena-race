// All the floors, which one is picked, and painting it. Each floor is painted by its own file in
// this folder; its sizes and colors live in config.ts. To add a floor: add it to FLOORS in
// config.ts, write its painter in a new file here, and add it to FLOOR_LOOKS below.
// Painters draw in world units onto a picture that scene.ts lays on top of the floor.
// The race track (track.ts in this folder) is painted on top of every floor.
import { ARCADE, BRICKS, CHESS, FLOOR, type FloorName, GRASS, ICE, LAVA, MOON, STREET, TREASURE_MAP, WOOD } from '../config';
import { paintArcade } from './arcade';
import { paintBricks } from './bricks';
import { paintChess } from './chess';
import { paintGrass } from './grass';
import { paintIce } from './ice';
import { paintLava } from './lava';
import { paintTreasureMap } from './map';
import { paintMoon } from './moon';
import { paintStreet } from './street';
import { paintTrack } from './track';
import { paintWood } from './wood';

// Starts at the config value; the floor picker changes it.
let floor: FloorName = FLOOR;
export function setFloor(name: FloorName): void {
  floor = name;
}
export function currentFloor(): FloorName {
  return floor;
}

type FloorPainter = (ctx: CanvasRenderingContext2D, W: number, H: number) => void;

// wall: the color of the floor's sides. moves: the floor changes over time (like lava's glow), so it
// is painted again for every frame. That costs speed, so leave it out for floors that stay still.
const FLOOR_LOOKS: Record<FloorName, { paint: FloorPainter; wall: string; moves?: boolean }> = {
  grass: { paint: paintGrass, wall: GRASS.colors.wall },
  street: { paint: paintStreet, wall: STREET.colors.wall },
  wood: { paint: paintWood, wall: WOOD.colors.wall },
  arcade: { paint: paintArcade, wall: ARCADE.colors.wall },
  chess: { paint: paintChess, wall: CHESS.colors.wall },
  ice: { paint: paintIce, wall: ICE.colors.wall },
  moon: { paint: paintMoon, wall: MOON.colors.wall },
  map: { paint: paintTreasureMap, wall: TREASURE_MAP.colors.wall },
  bricks: { paint: paintBricks, wall: BRICKS.colors.wall },
  lava: { paint: paintLava, wall: LAVA.colors.wall, moves: true },
};

export function floorWall(): string {
  return FLOOR_LOOKS[floor].wall;
}

export function floorMoves(): boolean {
  return FLOOR_LOOKS[floor].moves === true;
}

// Paint the floor and the track on top of it. The canvas must already be scaled to world units.
export function paintFloor(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save(); // so the floor's glow and see-through settings don't spill onto the track
  FLOOR_LOOKS[floor].paint(ctx, W, H);
  ctx.restore();
  paintTrack(ctx);
}
