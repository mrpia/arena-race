import { Color } from 'three';

// Turns a CSS color from config.ts ('#ff6b6b', 'rgba(25,35,55,0.75)') into a three.js color and
// how see-through it is (1 = solid). three.js colors have no see-through part of their own.
export function cssColor(css: string): { color: Color; opacity: number } {
  const rgba = css.match(/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/);
  if (!rgba) return { color: new Color(css), opacity: 1 };
  const [r, g, b, a] = rgba.slice(1).map((part) => part.trim());
  return { color: new Color(`rgb(${r},${g},${b})`), opacity: Number(a) };
}
