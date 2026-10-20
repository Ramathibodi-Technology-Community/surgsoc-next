import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from './auth/current-user'
import { hasPermission } from './permissions'
import { notFound, redirect } from 'next/navigation'

export async function formManager() {
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  if (!user) redirect('/login')
  if (!hasPermission(user, 'manage_forms')) notFound()
  return { payload, user }
}
