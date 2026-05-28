const TIMEOUT_MS = 20_000;
const MAX_POINTS = 1000;

export function calcPoints(responseTimeMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  return Math.max(0, Math.round(MAX_POINTS * (TIMEOUT_MS - responseTimeMs) / TIMEOUT_MS));
}
