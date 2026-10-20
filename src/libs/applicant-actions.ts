export function describeBatchError(body: any): string {
  return [body.error, ...(body.failedIds || []).map((row: any) => `${row.id}: ${row.error}`), body.lockedIds?.length ? `Locked: ${body.lockedIds.join(', ')}` : '', body.mismatchedIds?.length ? `Wrong event: ${body.mismatchedIds.join(', ')}` : ''].filter(Boolean).join(' · ')
}

export async function requestApplicantAction(eventId: string, action: 'accept' | 'reject' | 'wait' | 'remove', registrationIds: string[], rejectionReason = '') {
  const response = await fetch(`/api/events/${eventId}/applicants/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, registrationIds, rejectionReason }) })
  const body = await response.json()
  if (!response.ok || body.success === false) throw new Error(describeBatchError(body) || 'Could not update registrations.')
  return body
}
