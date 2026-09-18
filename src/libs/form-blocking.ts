import { Payload } from 'payload'

/**
 * Incomplete form assignments that block the user from registering.
 * `depth: 1` so the caller can read the form title off each assignment.
 */
export async function getBlockingForms(payload: Payload, userId: string | number) {
  if (!userId) return []

  const assignments = await payload.find({
    collection: 'form-assignments',
    where: {
      and: [
        { user: { equals: userId } },
        { completed: { equals: false } },
        { blocks_registration: { equals: true } },
      ],
    },
    depth: 1,
  })

  return assignments.docs
}
