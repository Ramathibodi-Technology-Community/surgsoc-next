import type { Field } from 'payload'

export const nameField: Field = {
  name: 'name',
  type: 'text',
  label: 'Name (lowercase, no special characters)',
  required: true,
  admin: {
    width: '50%',
  },
}

export const labelField: Field = {
  name: 'label',
  type: 'text',
  label: 'Label',
  localized: true,
  admin: {
    width: '50%',
  },
}

export const requiredField: Field = {
  name: 'required',
  type: 'checkbox',
  label: 'Required',
}

export const widthField: Field = {
  name: 'width',
  type: 'number',
  label: 'Field Width (percentage)',
  admin: {
    width: '50%',
  },
}
