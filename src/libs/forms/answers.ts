export type AnswerField = { name: string; label: string }
export type AnswerRow = { field: string; value?: unknown }

/** Stored answers are strings; multi-choice and ranking arrive as JSON arrays. */
export function formatAnswer(value: unknown): string {
  if (value == null || value === '') return '—'
  const text = String(value)
  if (text.startsWith('[')) {
    try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parsed.join(', ') } catch { /* plain text that happens to start with [ */ }
  }
  return text
}

/** The columns a form contributes: every named question except text blocks, in form order. */
export function answerFields(form: { fields?: unknown } | null | undefined): AnswerField[] {
  return ((form?.fields || []) as any[])
    .filter(field => field.name && field.blockType !== 'message')
    .map(field => ({ name: field.name as string, label: (field.label || field.name) as string }))
}

export const answerOf = (rows: AnswerRow[] | null | undefined, name: string) => formatAnswer(rows?.find(row => row.field === name)?.value)
