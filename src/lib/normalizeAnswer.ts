/**
 * Same normalization as LeetMastery **Leet Game / Line Game** (`normalizeAnswerLine` in
 * `leetcodemr/src/lib/lineGame/pickBlankLines.ts`): trim + collapse whitespace for equality checks.
 */
export function normalizeAnswerText(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}
