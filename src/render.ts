import { COLORS, type Controls, PLAYERS, VIEW } from './config';
import { currentCamera, project, toPixels } from './camera';
import { drawFloor } from './floors';
import type { Player } from './player';

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player): void {
  const ground = project(p.x, p.y);
  const body = project(p.x, p.y, p.z);
  const r = toPixels(p.radius, p.y);
  const rings = currentCamera().rings; // flat ovals in 3D, circles in 2D

  // Shadow shrinks as the player hops higher.
  const shadow = Math.max(0.4, 1 - p.z / 300);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(ground.sx, ground.sy, r * shadow, r * rings * shadow, 0, 0, Math.PI * 2);
  ctx.fill();

  // Colored ring so you can tell players apart even with similar emojis.
  ctx.strokeStyle = p.config.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(ground.sx, ground.sy, r, r * rings, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `${Math.round(r * 2)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000'; // opaque, or the emoji inherits the shadow's transparency
  ctx.fillText(p.config.emoji, body.sx, body.sy + r * 0.3);
}

function keyLabel(code: string): string {
  return code.replace(/^Key/, '').replace(/^Arrow/, '');
}

function controlsText(c: Controls): { move: string; action: string } {
  return {
    move: `move: ${[c.up, c.left, c.down, c.right].map(keyLabel).join(' ')}`,
    action: `action: ${keyLabel(c.action)}`,
  };
}

function drawHud(ctx: CanvasRenderingContext2D, showKeys: string[] | null): void {
  ctx.textBaseline = 'top';

  // In narrow windows the two players' control lines would collide in the middle,
  // so split each into a "move" line and an "action" line.
  ctx.font = '14px system-ui, sans-serif';
  const oneLine = PLAYERS.map((cfg) => {
    const t = controlsText(cfg.controls);
    return `${t.move}   ${t.action}`;
  });
  const widths = oneLine.map((line) => ctx.measureText(line).width);
  const split = widths[0] + widths[1] + 2 * 24 + 24 > VIEW.width;

  PLAYERS.forEach((cfg, i) => {
    const left = i === 0;
    ctx.textAlign = left ? 'left' : 'right';
    const x = left ? 24 : VIEW.width - 24;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = cfg.color;
    ctx.fillText(`${cfg.emoji} ${cfg.name}`, x, 20);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = COLORS.text;
    if (split) {
      const t = controlsText(cfg.controls);
      ctx.fillText(t.move, x, 50);
      ctx.fillText(t.action, x, 68);
    } else {
      ctx.fillText(oneLine[i], x, 50);
    }
  });

  if (showKeys) {
    ctx.textAlign = 'center';
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(`held (${showKeys.length}): ${showKeys.join(' ')}`, VIEW.width / 2, VIEW.height - 28);
  }
}

export function render(ctx: CanvasRenderingContext2D, players: Player[], showKeys: string[] | null): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  // Draw far players first so near ones overlap them.
  [...players].sort((a, b) => a.y - b.y).forEach((p) => drawPlayer(ctx, p));
  drawHud(ctx, showKeys);
}
