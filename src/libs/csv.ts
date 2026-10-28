/** Quote cells and neutralize spreadsheet formulas, including whitespace-prefixed formulas. */
export function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  const safe = /^[\t\r\n]|^\s*[=+\-@]/.test(text) ? `'${text}` : text
  return /[,"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
