'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function submitFeedbackRequest(formData: FormData) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  const type = String(formData.get('type') || 'feature')
  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()

  if (!title || !description) {
    return
  }

  await (payload as any).create({
    collection: 'feature-requests',
    data: {
      type: type === 'bug' ? 'bug' : 'feature',
      title,
      description,
      submitted_by: user.id,
    },
    overrideAccess: true,
  })

  return
}
