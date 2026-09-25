'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canAssignForms } from '@/libs/permissions'
import { cancelAnnualSurvey, currentAcademicYear } from '@/libs/form-assignment-lifecycle'

export async function activateAnnualSurvey(formId: string | number, deadline: string, activationAt?: string | null) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!canAssignForms(user as any)) throw new Error('Only VP, President, or superadmin can activate an annual survey.')
  if (!deadline) throw new Error('Set a deadline before activating.')

  const year = await currentAcademicYear(payload, new Date())
  await payload.update({
    collection: 'forms', id: formId, overrideAccess: true,
    data: {
      annual_survey_enabled: true,
      survey_academic_year: year.id,
      survey_deadline: deadline,
      survey_activation_at: activationAt || null,
    } as any,
  })
}

export async function deactivateAnnualSurvey(formId: string | number) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!canAssignForms(user as any)) throw new Error('Only VP, President, or superadmin can deactivate an annual survey.')

  await cancelAnnualSurvey(payload, formId)
  await payload.update({
    collection: 'forms', id: formId, overrideAccess: true,
    data: {
      annual_survey_enabled: false,
      survey_academic_year: null,
      survey_deadline: null,
      survey_activation_at: null,
    } as any,
  })
}
