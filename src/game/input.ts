import type { Direction } from './board';

export function directionForKey(key: string): Direction | null {
  const keys: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
  return keys[key] ?? keys[key.toLowerCase()] ?? null;
}
export function swipeDirection(startX: number, startY: number, endX: number, endY: number): Direction | null {
  const dx = endX - startX;
  const dy = endY - startY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}
