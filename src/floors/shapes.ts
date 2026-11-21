// Shapes lying flat on the floor, shared by the floor painters. Positions and sizes are in world units:
// the floor picture is scaled so that one world unit is SCENE.floorSharpness pixels.

// Add a rectangle lying flat on the floor to the current path.
export function floorRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.rect(x, y, w, h);
}

// Add a flat shape with any corners to the current path.
export function floorPolygon(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

// Add an ellipse lying flat on the floor to the current path. Small ones can use fewer steps.
export function floorEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, steps = 24): void {
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const px = x + Math.cos(angle) * rx;
    const py = y + Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Add a straight line on the floor to the current path.
export function floorLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

// The same "random" number between 0 and 1 for the same inputs, so patterns don't flicker.
export function noise(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Where the first grid line goes so the grid is lined up from the middle and both halves match.
export function gridStart(length: number, cell: number): number {
  return length / 2 - Math.ceil(length / 2 / cell) * cell;
}

// Add a lumpy round shape lying flat on the floor to the current path. Same seed, same shape.
export function floorBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number): void {
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const wobbly = r * (0.8 + 0.4 * noise(seed, i));
    const px = x + Math.cos(angle) * wobbly;
    const py = y + Math.sin(angle) * wobbly;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Add a jagged crack to the current path. It wanders off in direction `angle` and sometimes branches.
export function floorCrack(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, seed: number): void {
  const step = 12;
  ctx.moveTo(x, y);
  for (let i = 0; i * step < length; i++) {
    angle += (noise(seed, i) - 0.5) * 1.2;
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
    ctx.lineTo(x, y);
    if (length * 0.3 >= step && noise(seed, i + 500) < 0.15) {
      const side = noise(seed, i + 900) < 0.5 ? -1 : 1;
      floorCrack(ctx, x, y, angle + side * 0.9, length * 0.3, seed * 7 + i);
      ctx.moveTo(x, y);
    }
  }
}

// Make what's drawn next glow, `size` world units wide (0 = no glow). The canvas measures its glow
// in pixels whatever the scale, so this converts it.
export function glow(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.shadowBlur = size * ctx.getTransform().a;
}
