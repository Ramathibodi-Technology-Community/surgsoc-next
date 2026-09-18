import type { Block } from 'payload'
import { conditionalGroup } from './conditionalGroup'
import { labelField, nameField, requiredField, widthField } from './shared'

export const SliderBlock: Block = {
  slug: 'slider',
  labels: {
    singular: 'Slider / Rating',
    plural: 'Slider / Rating Fields',
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
      type: 'row',
      fields: [
        {
          name: 'variant',
          type: 'select',
          defaultValue: 'rating',
          options: [
            { label: 'Numbered Rating', value: 'rating' },
            { label: 'Stars', value: 'stars' },
            { label: 'Range Slider', value: 'slider' },
          ],
          admin: {
            width: '33%',
          },
        },
        {
          name: 'min',
          type: 'number',
          defaultValue: 1,
          admin: {
            width: '33%',
          },
        },
        {
          name: 'max',
          type: 'number',
          defaultValue: 5,
          admin: {
            width: '33%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'step',
          type: 'number',
          defaultValue: 1,
          admin: {
            width: '33%',
            condition: (_: any, siblingData: any) => siblingData?.variant === 'slider',
          },
        },
        {
          name: 'showLabels',
          type: 'checkbox',
          defaultValue: true,
          label: 'Show min/max labels',
          admin: {
            width: '33%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minLabel',
          type: 'text',
          label: 'Minimum Value Label',
          admin: {
            width: '50%',
            condition: (_: any, siblingData: any) => Boolean(siblingData?.showLabels),
          },
        },
        {
          name: 'maxLabel',
          type: 'text',
          label: 'Maximum Value Label',
          admin: {
            width: '50%',
            condition: (_: any, siblingData: any) => Boolean(siblingData?.showLabels),
          },
        },
      ],
    },
    conditionalGroup,
  ],
}
