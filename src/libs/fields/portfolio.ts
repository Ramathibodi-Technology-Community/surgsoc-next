import { Field } from 'payload'

export const portfolioField: Field = {
  name: 'portfolio',
  type: 'array',
  label: 'Portfolio / Activity History',
  fields: [
    {
      name: 'year',
      type: 'select',
      required: true,
      options: [
        '2023',
        '2024',
        '2025',
        '2026',
        '2027',
      ],
      // Or we can use number if ranges are dynamic, but select is often cleaner for specific academic years
    },
    {
      name: 'activity',
      type: 'text',
      required: true,
      label: 'Activity Name',
    },
    {
        name: 'role',
        type: 'text',
        label: 'Role / Position (Optional)',
    }
  ],
}
