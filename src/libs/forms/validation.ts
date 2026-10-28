import { getHiddenFields } from './conditionalLogic'
import { getNestedValue } from './prefillUserData'

export const PROFILE_FIELDS = ['email', 'name_english.first_name', 'name_english.last_name', 'name_english.nickname', 'name_thai.first_name', 'name_thai.last_name', 'name_thai.nickname', 'academic.student_id', 'academic.year', 'academic.track', 'contact.phone_number', 'contact.line_id']
export const FORM_BLOCKS = ['text', 'textarea', 'email', 'number', 'select', 'checkbox', 'date', 'radio', 'checkboxGroup', 'slider', 'ranking', 'userProfile', 'message']

export function profileValue(user: any, path: string): string {
  if (!PROFILE_FIELDS.includes(path)) throw new Error('Unsupported profile source.')
  const value = getNestedValue(user, path)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

export function validateFormDefinition(form: any) {
  if (!String(form.title || '').trim()) throw new Error('Form title is required.')
  const fields: any[] = form.fields || []
  const names = fields.filter(f => f.blockType !== 'message').map(f => f.name)
  if (names.some(n => typeof n !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(n)) || new Set(names).size !== names.length) throw new Error('Field names must be unique and use letters, numbers, underscores or hyphens.')
  for (const f of fields) {
    if (!FORM_BLOCKS.includes(f.blockType)) throw new Error('Unsupported form field type.')
    if (f.conditional?.enabled && (!names.includes(f.conditional.source_field) || f.conditional.source_field === f.name)) throw new Error(`${f.name}: invalid conditional source.`)
    if (f.conditional?.enabled && (!['equals', 'not_equals', 'contains', 'greater_than', 'less_than'].includes(f.conditional.operator) || !['show', 'hide'].includes(f.conditional.action))) throw new Error(`${f.name}: invalid conditional rule.`)
    if (f.blockType === 'userProfile' && !PROFILE_FIELDS.includes(f.profileField)) throw new Error(`${f.name}: invalid profile source.`)
    if (['select', 'radio', 'checkboxGroup', 'ranking'].includes(f.blockType)) {
      const values = (f.options || []).map((o: any) => o.value)
      if (!values.length || values.some((v: any) => typeof v !== 'string' || !v.trim()) || new Set(values).size !== values.length) throw new Error(`${f.name}: options must have unique nonempty values.`)
    }
    if (['number', 'slider'].includes(f.blockType) && ['min', 'max', 'step'].some(key => f[key] != null && !Number.isFinite(f[key]))) throw new Error(`${f.name}: invalid numeric range.`)
    if (f.blockType === 'number' && f.min != null && f.max != null && f.min > f.max) throw new Error(`${f.name}: invalid numeric range.`)
    if (f.blockType === 'slider' && ((f.min ?? 1) >= (f.max ?? 5) || (f.step ?? 1) <= 0 || (f.max ?? 5) - (f.min ?? 1) > 1000 * (f.step ?? 1))) throw new Error(`${f.name}: invalid slider range.`)
    if (f.blockType === 'checkboxGroup' && ([f.minSelect ?? 0, f.maxSelect ?? 0].some(n => !Number.isInteger(n) || n < 0) || (f.minSelect ?? 0) > f.options.length || (f.maxSelect && (f.maxSelect < (f.minSelect ?? 0) || f.maxSelect > f.options.length)))) throw new Error(`${f.name}: invalid selection limits.`)
  }
  if (form.response_limit != null && (!Number.isInteger(form.response_limit) || form.response_limit < 0)) throw new Error('Response limit must be a nonnegative integer.')
  if (form.response_deadline && !Number.isFinite(Date.parse(form.response_deadline))) throw new Error('Invalid form deadline.')
}

function parseValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (value === 'true') return true
  if (value === 'false') return false
  if (value.startsWith('[')) { try { return JSON.parse(value) } catch { return value } }
  return value
}

export function validateFormAnswers(form: any, rows: { field: string; value: unknown }[], user: any) {
  const fields: any[] = form.fields || []
  const inputFields = fields.filter(f => f.blockType !== 'message')
  const byName = new Map(inputFields.map(f => [f.name, f]))
  const answers: Record<string, unknown> = {}
  for (const row of rows || []) {
    if (!byName.has(row.field) || Object.hasOwn(answers, row.field)) throw new Error('Unknown or duplicate answer field.')
    answers[row.field] = parseValue(row.value)
  }
  for (const f of inputFields) if (f.blockType === 'userProfile' && f.readOnly) answers[f.name] = profileValue(user, f.profileField)
  const hidden = getHiddenFields(fields, answers)
  const validated: { field: string; value: string }[] = []
  for (const f of inputFields) {
    if (hidden.has(f.name)) continue
    const value = answers[f.name]
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0)
    if (f.required && (empty || (f.blockType === 'checkbox' && value !== true))) throw new Error(`${f.label || f.name}: an answer is required.`)
    if (empty) continue
    if (f.blockType === 'checkbox' && typeof value !== 'boolean') throw new Error(`${f.name}: invalid checkbox.`)
    if (f.blockType === 'email' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) throw new Error(`${f.name}: invalid email.`)
    if (f.blockType === 'date' && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error(`${f.name}: invalid date.`)
    if (['number', 'slider'].includes(f.blockType)) {
      const number = Number(value)
      if (!Number.isFinite(number) || typeof value === 'boolean' || Array.isArray(value)) throw new Error(`${f.name}: invalid number.`)
      const min = f.min ?? (f.blockType === 'slider' ? 1 : -Infinity)
      const max = f.max ?? (f.blockType === 'slider' ? 5 : Infinity)
      if (number < min || number > max || (f.blockType === 'slider' && Math.abs((number - min) / (f.step ?? 1) - Math.round((number - min) / (f.step ?? 1))) > 1e-8)) throw new Error(`${f.name}: outside permitted range.`)
    }
    const options = (f.options || []).map((o: any) => o.value)
    if (['select', 'radio'].includes(f.blockType) && !options.includes(value)) throw new Error(`${f.name}: invalid choice.`)
    if (['checkboxGroup', 'ranking'].includes(f.blockType)) {
      if (!Array.isArray(value) || new Set(value).size !== value.length || value.some(v => !options.includes(v))) throw new Error(`${f.name}: invalid choices.`)
      if (f.blockType === 'ranking' && value.length !== options.length) throw new Error(`${f.name}: rank every option.`)
      if (f.blockType === 'checkboxGroup' && (value.length < (f.minSelect ?? 0) || (f.maxSelect && value.length > f.maxSelect))) throw new Error(`${f.name}: invalid number of choices.`)
    }
    if (['text', 'textarea', 'userProfile'].includes(f.blockType) && typeof value !== 'string' && typeof value !== 'number') throw new Error(`${f.name}: invalid text.`)
    validated.push({ field: f.name, value: Array.isArray(value) ? JSON.stringify(value) : String(value) })
  }
  return validated
}
