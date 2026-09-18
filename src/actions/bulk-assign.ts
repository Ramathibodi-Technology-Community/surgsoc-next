
'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { hasPermission } from '@/libs/permissions'
import { getErrorMessage } from '@/libs/utils'
import type { User } from '@/payload-types'

type BulkAssignResult = {
  success: boolean
  message: string
  count?: number
}

export async function bulkAssignForm(
  formId: string | number,
  mode: 'all' | 'group',
  groupId?: string | number
): Promise<BulkAssignResult> {
  const payload = await getPayload({ config })
  const headerList = await headers()
  const { user } = await payload.auth({ headers: headerList })

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  if (!hasPermission(user as User, 'manage_forms')) {
    return { success: false, message: 'Insufficient permissions' }
  }

  try {
    const usersQuery: {
      limit: number
      where?: {
        groups: {
          equals: string | number
        }
      }
    } = {
      limit: 0, // Fetch all
    }

    if (mode === 'group') {
      if (!groupId) return { success: false, message: 'Group ID required' }
      usersQuery.where = {
        groups: {
          equals: groupId,
        },
      }
    }

    const users = await payload.find({
      collection: 'users',
      ...usersQuery,
    })

    if (users.totalDocs === 0) {
      return { success: false, message: 'No users found' }
    }

    const userIds = users.docs.map((u) => u.id)

    // 1. Fetch existing assignments for these users and this form in one query
    const existing = await payload.find({
      collection: 'form-assignments',
      where: {
        and: [
          { user: { in: userIds } },
          { form: { equals: formId } },
        ],
      },
      limit: 0,
    })

    const existingUserIds = new Set(
      existing.docs.map((a) => (typeof a.user === 'object' ? a.user.id : a.user))
    )

    // 2. Filter users who need assignment
    const usersToAssign = users.docs.filter((u) => !existingUserIds.has(u.id))

    if (usersToAssign.length === 0) {
      return { success: true, message: 'All users already assigned', count: 0 }
    }

    // 3. Create assignments in parallel
    await Promise.all(
      usersToAssign.map((targetUser) =>
        payload.create({
          collection: 'form-assignments',
          data: {
            user: targetUser.id,
            form: typeof formId === 'string' ? parseInt(formId) : formId,
            completed: false,
            assigned_by: user.id,
          },
        })
      )
    )

    const assignedCount = usersToAssign.length

    return {
      success: true,
      message: `Successfully assigned form to ${assignedCount} users`,
      count: assignedCount,
    }
  } catch (error) {
    console.error(`Bulk assign error: ${getErrorMessage(error)}`)
    return { success: false, message: 'Failed to assign forms' }
  }
}
