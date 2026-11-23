/**
 * Constant speed, not constant duration: a fixed duration makes a long title
 * race and a short one crawl. The travel distance is proportional to the text
 * length, so deriving the duration from it keeps px/sec roughly even. Titles
 * that already fit never animate — their travel computes to zero.
 */
export function marqueeDuration(title: string): string {
  return `${Math.min(14, Math.max(4, title.length * 0.11)).toFixed(1)}s`
}
