import type { Block } from 'payload'
import { conditionalGroup } from './conditionalGroup'
import { labelField, nameField, requiredField, widthField } from './shared'

export const UserProfileBlock: Block = {
  slug: 'userProfile',
  labels: {
    singular: 'User Profile Field',
    plural: 'User Profile Fields',
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
          name: 'profileField',
          type: 'select',
          label: 'User Profile Field to Prefill',
          required: true,
          options: [
            { label: 'Email', value: 'email' },
            { label: 'First Name', value: 'name_english.first_name' },
            { label: 'Last Name', value: 'name_english.last_name' },
            { label: 'Nickname', value: 'name_english.nickname' },
            { label: 'Thai First Name', value: 'name_thai.first_name' },
            { label: 'Thai Last Name', value: 'name_thai.last_name' },
            { label: 'Thai Nickname', value: 'name_thai.nickname' },
            { label: 'Student ID', value: 'academic.student_id' },
            { label: 'Year', value: 'academic.year' },
            { label: 'Track', value: 'academic.track' },
            { label: 'Phone Number', value: 'contact.phone_number' },
            { label: 'Line ID', value: 'contact.line_id' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'readOnly',
          type: 'checkbox',
          label: 'Read Only (Prevent editing)',
          defaultValue: false,
          admin: { width: '50%' },
        },
      ],
    },
    conditionalGroup,
  ],
}
