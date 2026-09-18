'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getErrorMessage } from '@/libs/utils'
import { canInteractAsMember } from '@/libs/permissions'

import { headers } from 'next/headers'

export async function submitForm(formId: string | number, data: Record<string, unknown>) {
  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user || !canInteractAsMember(user as any)) {
    throw new Error('Please sign in as a member to submit forms.')
  }

  try {
      const formDoc = await payload.findByID({
        collection: 'forms',
        id: formId,
        depth: 0,
      }) as any

      if (formDoc.publish?.allow_multiple_submissions !== true) {
        const existingSubmissions = await payload.find({
          collection: 'form-submissions',
          where: {
            and: [
              { form: { equals: formId } },
              { user: { equals: user.id } },
            ],
          },
          limit: 1,
        })

        if (existingSubmissions.totalDocs > 0) {
          throw new Error('You have already submitted this form.')
        }
      }

      await payload.create({
        collection: 'form-submissions',
        data: {
          form: typeof formId === 'string' ? parseInt(formId) : formId,
          submissionData: Object.entries(data).map(([field, value]) => ({
            field,
            value: String(value),
          })),
          user: user.id,
        },
      })
  } catch (error) {
      console.error(`Error submitting form: ${getErrorMessage(error)}`)
      throw new Error('Failed to submit form')
  }
}
