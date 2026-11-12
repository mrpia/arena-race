// All the floors, which one is picked, and drawing it. Each floor is painted by its own file in
// this folder; its sizes and colors live in config.ts. To add a floor: add it to FLOORS in
// config.ts, write its painter in a new file here, and add it to FLOOR_LOOKS below.
// The race track (track.ts in this folder) is painted on top of every floor.
import { ARCADE, ARENA, BRICKS, CHESS, FLOOR, type FloorName, GRASS, ICE, LAVA, MOON, STREET, TREASURE_MAP, WOOD } from '../config';
import { currentCamera, project } from '../camera';
import { paintArcade } from './arcade';
import { paintBricks } from './bricks';
import { paintChess } from './chess';
import { paintGrass } from './grass';
import { paintIce } from './ice';
import { paintLava } from './lava';
import { paintTreasureMap } from './map';
import { paintMoon } from './moon';
import { floorRect } from './shapes';
import { paintStreet } from './street';
import { paintTrack } from './track';
import { paintWood } from './wood';

// Starts at the config value; the floor picker changes it.
let floor: FloorName = FLOOR;
export function setFloor(name: FloorName): void {
  floor = name;
}

type FloorPainter = (ctx: CanvasRenderingContext2D, W: number, H: number) => void;

const FLOOR_LOOKS: Record<FloorName, { paint: FloorPainter; wall: string }> = {
  grass: { paint: paintGrass, wall: GRASS.colors.wall },
  street: { paint: paintStreet, wall: STREET.colors.wall },
  wood: { paint: paintWood, wall: WOOD.colors.wall },
  arcade: { paint: paintArcade, wall: ARCADE.colors.wall },
  chess: { paint: paintChess, wall: CHESS.colors.wall },
  ice: { paint: paintIce, wall: ICE.colors.wall },
  moon: { paint: paintMoon, wall: MOON.colors.wall },
  map: { paint: paintTreasureMap, wall: TREASURE_MAP.colors.wall },
  bricks: { paint: paintBricks, wall: BRICKS.colors.wall },
  lava: { paint: paintLava, wall: LAVA.colors.wall },
};

export function drawFloor(ctx: CanvasRenderingContext2D): void {
  const W = ARENA.width;
  const H = ARENA.height;
  const look = FLOOR_LOOKS[floor];
  const bl = project(0, H);
  const br = project(W, H);

  // Front wall, so the floor looks like a raised platform. Looking straight down (2D) hides it.
  ctx.fillStyle = look.wall;
  ctx.fillRect(bl.sx, bl.sy, br.sx - bl.sx, currentCamera().wall);

  // Painters may draw past the edges or turn on glow; the clip and restore tidy that up.
  ctx.save();
  ctx.beginPath();
  floorRect(ctx, 0, 0, W, H);
  ctx.clip();
  ctx.save(); // so the floor's glow and see-through settings don't spill onto the track
  look.paint(ctx, W, H);
  ctx.restore();
  paintTrack(ctx);
  ctx.restore();
}
