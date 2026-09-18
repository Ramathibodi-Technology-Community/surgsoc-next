import type { Block } from 'payload'
import { conditionalGroup } from './conditionalGroup'
import { labelField, nameField, requiredField, widthField } from './shared'

export const CheckboxGroupBlock: Block = {
  slug: 'checkboxGroup',
  labels: {
    singular: 'Checkbox Group',
    plural: 'Checkbox Groups',
  },
  fields: [
    {
      type: 'row',
      fields: [nameField, labelField],
    },
    {
      type: 'row',
      fields: [widthField, requiredField],
    },
    {
      name: 'options',
      type: 'array',
      label: 'Options',
      labels: {
        singular: 'Option',
        plural: 'Options',
      },
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              label: 'Label',
              required: true,
            },
            {
              name: 'value',
              type: 'text',
              label: 'Value',
              required: true,
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minSelect',
          type: 'number',
          label: 'Minimum Selections',
          admin: { width: '50%' },
        },
        {
          name: 'maxSelect',
          type: 'number',
          label: 'Maximum Selections',
          admin: { width: '50%' },
        },
      ],
    },
    conditionalGroup,
  ],
}
