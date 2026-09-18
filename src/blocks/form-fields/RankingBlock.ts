import type { Block } from 'payload'
import { conditionalGroup } from './conditionalGroup'
import { labelField, nameField, requiredField, widthField } from './shared'

export const RankingBlock: Block = {
  slug: 'ranking',
  labels: {
    singular: 'Ranking',
    plural: 'Ranking Fields',
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
      label: 'Options to Rank',
      labels: {
        singular: 'Option',
        plural: 'Options',
      },
      required: true,
      minRows: 2,
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
    conditionalGroup,
  ],
}
