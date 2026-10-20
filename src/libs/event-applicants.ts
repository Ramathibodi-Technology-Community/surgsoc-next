import type { Payload } from 'payload'
import { idOf } from './form-assignment-lifecycle'

export function isCanonicalApplication(submission: any, userId: unknown, parent: any) {
  return !!submission && String(idOf(submission.user)) === String(userId) && String(idOf(submission.form)) === String(idOf(parent.subscription_form)) && (!submission.application_event || String(idOf(submission.application_event)) === String(parent.id))
}

export async function loadEventApplicants(payload: Payload, event: any, eventIds = [event.id]) {
  const parent = idOf(event.parent_event) ? await payload.findByID({ collection: 'events', id: idOf(event.parent_event)!, depth: 0 }) : event
  const formId = idOf(parent.subscription_form)
  const form = formId ? await payload.findByID({ collection: 'forms', id: formId, depth: 0 }).catch(() => null) : null
  const { docs } = await payload.find({ collection: 'registrations', where: { event: { in: eventIds } }, depth: 2, pagination: false })
  return docs.map(row => {
    const user = typeof row.user === 'object' ? row.user : null
    const submission = typeof row.submission === 'object' ? row.submission : null
    const valid = isCanonicalApplication(submission, idOf(row.user), parent)
    const answers = submission?.submissionData || []
    const order = (form?.fields || []).map((field: any) => field.name).filter(Boolean)
    const known = answers.filter(answer => order.includes(answer.field)).sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field))
    const unknown = answers.filter(answer => !order.includes(answer.field)).map(answer => ({ ...answer, field: `Other data / ข้อมูลอื่น: ${answer.field}` }))
    return { id: String(row.id), eventId: Number(idOf(row.event)), user: user ? { id: user.id, email: user.email, name_english: user.name_english, academic: { student_id: user.academic?.student_id } } : row.user, status: row.status || 'applicant', createdAt: row.createdAt,
      submission: submission ? { id: submission.id, submissionData: [...known, ...unknown] } : null,
      sessionAnswers: typeof row.session_submission === 'object' && row.session_submission ? (row.session_submission.submissionData || []) : null,
      integrityWarning: valid ? undefined : 'Application linkage needs review / ตรวจสอบข้อมูลใบสมัคร',
    }
  })
}
