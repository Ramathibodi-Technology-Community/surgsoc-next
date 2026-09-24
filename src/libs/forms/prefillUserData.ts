export interface FieldMapping {
  formFieldName: string
  userFieldPath: string // e.g., "name_english.first_name", "academic.student_id"
}

const DEFAULT_MAPPINGS: FieldMapping[] = [
  { formFieldName: 'first_name', userFieldPath: 'name_english.first_name' },
  { formFieldName: 'name', userFieldPath: 'name_english.first_name' }, // Common variation
  { formFieldName: 'last_name', userFieldPath: 'name_english.last_name' },
  { formFieldName: 'surname', userFieldPath: 'name_english.last_name' }, // Common variation
  { formFieldName: 'nickname', userFieldPath: 'name_english.nickname' },
  { formFieldName: 'email', userFieldPath: 'email' },
  { formFieldName: 'student_id', userFieldPath: 'academic.student_id' },
  { formFieldName: 'year', userFieldPath: 'academic.year' },
  { formFieldName: 'phone', userFieldPath: 'contact.phone_number' },
  { formFieldName: 'phone_number', userFieldPath: 'contact.phone_number' }, // Common variation
  { formFieldName: 'line_id', userFieldPath: 'contact.line_id' },
]

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  const value = path.split('.').reduce((current, key) => current?.[key], obj)
  if (value && typeof value === 'object' && 'id' in value) {
    return value.label || value.label_th || value.slug || String(value.id)
  }
  return value
}

export function prefillFormData(
  user: any,
  formFields: any[], // This would be the fields array from Form block
  customMappings: FieldMapping[] = []
): Record<string, any> {
  const mappings = [...DEFAULT_MAPPINGS, ...customMappings]
  const prefilled: Record<string, any> = {}

  if (!user || !formFields) return prefilled

  formFields.forEach(field => {
    // Only prefill if field has a name property
    if (!field.name) return

    const mapping = mappings.find(m => m.formFieldName === field.name)
    if (mapping) {
      let value = getNestedValue(user, mapping.userFieldPath)
      if (mapping.userFieldPath === 'academic.year' && value != null) {
        if (field.blockType === 'number') {
          // An unpopulated relationship is a bare tag id; its digits are not the year.
          value = typeof user.academic?.year === 'object' ? String(value).match(/\d+/)?.[0] : undefined
        } else if (field.blockType === 'select') {
          const year = user.academic?.year
          const candidates = typeof year === 'object'
            ? [year.slug, year.label, year.label_th, String(year.id)]
            : [String(year)]
          value = field.options?.find((option: { label: string; value: string }) =>
            candidates.includes(option.value) || candidates.includes(option.label)
          )?.value
        }
      }
      if (value !== undefined && value !== null) {
        prefilled[field.name] = value
      }
    }
  })

  return prefilled
}
