/*
  Why a form is shut, in the order a member should hear it: the Accepting
  switch, the closing date, then the response limit. Mirrors the Availability
  tab; the event's own registration window sits on top of this (design board 3d).
*/
export function formClosedReason(form: { accept_responses?: boolean | null; response_deadline?: string | null; response_limit?: number | null }, responseCount: number, now = Date.now()) {
  if (form.accept_responses === false) return 'switch' as const
  if (form.response_deadline && Date.parse(form.response_deadline) <= now) return 'deadline' as const
  if (form.response_limit && responseCount >= form.response_limit) return 'limit' as const
  return null
}
