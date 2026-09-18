export interface ConditionalRule {
  enabled?: boolean
  source_field?: string
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value?: string
  action?: 'show' | 'hide'
}

/**
 * Evaluates a conditional rule against the current form data.
 */
function evaluateCondition(
  rule: ConditionalRule,
  formData: Record<string, any>
): boolean {
  if (!rule.enabled || !rule.source_field) return false

  const fieldValue = formData[rule.source_field]

  // Handle empty values
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    if (rule.operator === 'not_equals' && rule.value) return true
    return false
  }

  // Normalize values
  const strFieldValue = String(fieldValue).toLowerCase()
  const strRuleValue = String(rule.value || '').toLowerCase()
  const numFieldValue = Number(fieldValue)
  const numRuleValue = Number(rule.value)

  switch (rule.operator) {
    case 'equals':
      return strFieldValue === strRuleValue
    case 'not_equals':
      return strFieldValue !== strRuleValue
    case 'contains':
      return strFieldValue.includes(strRuleValue)
    case 'greater_than':
      return !isNaN(numFieldValue) && !isNaN(numRuleValue) && numFieldValue > numRuleValue
    case 'less_than':
      return !isNaN(numFieldValue) && !isNaN(numRuleValue) && numFieldValue < numRuleValue
    default:
      return false
  }
}

/**
 * Determines which fields should be visible/hidden based on block-level conditionals.
 * Returns a Set of field names that should currently be HIDDEN.
 */
export function getHiddenFields(
  fields: any[], // Form blocks from payload
  formData: Record<string, any>
): Set<string> {
  const hiddenFields = new Set<string>()

  fields?.forEach((field) => {
    // If the field doesn't have a name or conditional rules, it's always shown
    if (!field.name || !field.conditional?.enabled) return

    const rule = field.conditional as ConditionalRule
    const isMatch = evaluateCondition(rule, formData)

    if (rule.action === 'show') {
      // If action is show, it's hidden UNLESS the condition matches
      if (!isMatch) {
        hiddenFields.add(field.name)
      }
    } else if (rule.action === 'hide') {
      // If action is hide, it's hidden ONLY IF the condition matches
      if (isMatch) {
        hiddenFields.add(field.name)
      }
    }
  })

  return hiddenFields
}
