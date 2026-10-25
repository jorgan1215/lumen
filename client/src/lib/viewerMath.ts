export function anchoredTranslation(point: number, translation: number, oldScale: number, nextScale: number) {
  return point - (point - translation) * nextScale / oldScale;
}
export function pinchTranslation(startPoint: number, currentPoint: number, translation: number, oldScale: number, nextScale: number) {
  return currentPoint - (startPoint - translation) * nextScale / oldScale;
}
export function swipeDirection(dx: number, dy: number, scale: number, pinched: boolean): -1 | 0 | 1 {
  if (pinched || scale > 1.01 || Math.abs(dx) <= 50 || Math.abs(dx) <= Math.abs(dy) * 1.4) return 0;
  return dx < 0 ? 1 : -1;
}
