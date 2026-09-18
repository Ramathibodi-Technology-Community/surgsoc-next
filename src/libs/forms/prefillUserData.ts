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
  return path.split('.').reduce((current, key) => current?.[key], obj)
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
      const value = getNestedValue(user, mapping.userFieldPath)
      if (value !== undefined && value !== null) {
        prefilled[field.name] = value
      }
    }
  })

  return prefilled
}
