import type { Field } from 'payload'

export const conditionalGroup: Field = {
  name: 'conditional',
  type: 'group',
  label: 'Conditional Display',
  admin: {
    condition: (_: any, data: any) => Boolean(data?.name), // Only show if the field has a name configured
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Enable conditional logic',
      defaultValue: false,
    },
    {
      name: 'action',
      type: 'select',
      defaultValue: 'show',
      options: [
        { label: 'Show this field if…', value: 'show' },
        { label: 'Hide this field if…', value: 'hide' },
      ],
      admin: {
        condition: (_: any, siblingData: any) => Boolean(siblingData?.enabled),
      },
    },
    {
      name: 'source_field',
      type: 'text',
      label: 'When field (name) ...',
      required: true,
      admin: {
        condition: (_: any, siblingData: any) => Boolean(siblingData?.enabled),
      },
    },
    {
      name: 'operator',
      type: 'select',
      defaultValue: 'equals',
      options: [
        { label: 'Equals', value: 'equals' },
        { label: 'Not Equals', value: 'not_equals' },
        { label: 'Contains', value: 'contains' },
        { label: 'Greater Than', value: 'greater_than' },
        { label: 'Less Than', value: 'less_than' },
      ],
      required: true,
      admin: {
        condition: (_: any, siblingData: any) => Boolean(siblingData?.enabled),
      },
    },
    {
      name: 'value',
      type: 'text',
      label: '... has value',
      admin: {
        condition: (_: any, siblingData: any) => Boolean(siblingData?.enabled),
      },
    },
  ],
}
