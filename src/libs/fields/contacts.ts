import { Field } from 'payload'

export const contactFields: Field[] = [
  {
    name: 'email',
    type: 'email',
    required: true,
    admin: {
      readOnly: true,
    }
  },
  {
    name: 'line_id',
    type: 'text',
    label: 'LINE ID',
  },
  {
    name: 'phone_number',
    type: 'text',
    label: 'Phone Number',
  },
]
