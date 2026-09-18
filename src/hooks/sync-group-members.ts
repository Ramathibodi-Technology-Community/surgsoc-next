import type { CollectionAfterChangeHook } from 'payload'

export const syncGroupMembers: CollectionAfterChangeHook = async ({
  doc, previousDoc, req: { payload, context }, operation,
}) => {
  if (operation !== 'update' && operation !== 'create') return doc
  if (context?.skipMemberSync) return doc

  const groupId = doc.id

  // Normalize members into arrays of IDs
  const currentMemberIds: number[] = (doc.members || []).map(
    (m: any) => typeof m === 'object' ? m.id : m
  )
  const previousMemberIds: number[] = (previousDoc?.members || []).map(
    (m: any) => typeof m === 'object' ? m.id : m
  )

  // Find added and removed members
  const addedUserIds = currentMemberIds.filter(id => !previousMemberIds.includes(id))
  const removedUserIds = previousMemberIds.filter(id => !currentMemberIds.includes(id))

  if (addedUserIds.length === 0 && removedUserIds.length === 0) return doc

  // Process additions
  for (const userId of addedUserIds) {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
    const userGroupIds = (user.groups || []).map((g: any) => typeof g === 'object' ? g.id : g)

    if (!userGroupIds.includes(groupId)) {
      await payload.update({
        collection: 'users',
        id: userId,
        data: { groups: [...userGroupIds, groupId] },
        // Skip user sync to prevent endless loop
        context: { skipGroupSync: true },
      })
    }
  }

  // Process removals
  for (const userId of removedUserIds) {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
    const userGroupIds = (user.groups || []).map((g: any) => typeof g === 'object' ? g.id : g)

    if (userGroupIds.includes(groupId)) {
      await payload.update({
        collection: 'users',
        id: userId,
        data: { groups: userGroupIds.filter((id: number) => id !== groupId) },
        // Skip user sync to prevent endless loop
        context: { skipGroupSync: true },
      })
    }
  }

  return doc
}
