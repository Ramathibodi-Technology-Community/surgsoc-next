import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canManageEvent, eventDays } from '@/libs/event-workflow'
import { hasPermission } from '@/libs/permissions'
import { loadEventApplicants } from '@/libs/event-applicants'
import { csvCell } from '@/libs/csv'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'export_data')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const kind = request.nextUrl.searchParams.get('kind') || 'roster'
  if (!/^[1-9]\d*$/.test(id) || !['roster', 'applications'].includes(kind)) return NextResponse.json({ error: 'Invalid export' }, { status: 400 })
  const event = await payload.findByID({ collection: 'events', id, depth: 2 }).catch(() => null)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canManageEvent(user, event)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const days = event.event_structure === 'multi_day' ? await eventDays(payload, event.id, true) : [event]
    const rows = await loadEventApplicants(payload, event, days.map(day => day.id))
    const name = (row: typeof rows[number]) => typeof row.user === 'object' && row.user ? [row.user.name_english?.first_name, row.user.name_english?.last_name].filter(Boolean).join(' ') : ''
    const identity = (row: typeof rows[number]) => [name(row), typeof row.user === 'object' && row.user ? row.user.email : '', typeof row.user === 'object' && row.user ? row.user.academic?.student_id : '']
    const data: unknown[][] = kind === 'roster' ? [['Registration ID', 'Day', 'Status', 'Name', 'Email', 'Student ID', 'Applied At'], ...rows.map(row => [row.id, days.find(day => day.id === row.eventId)?.name, row.status, ...identity(row), row.createdAt])] : [['Application ID', 'Name', 'Email', 'Student ID', 'Day Outcomes', 'Field', 'Answer']]
    if (kind === 'applications') {
      const applications = [...new Map(rows.filter(row => !row.integrityWarning && row.submission).map(row => [row.submission!.id, row])).values()]
      for (const row of applications) {
        const outcomes = rows.filter(other => !other.integrityWarning && other.submission?.id === row.submission!.id).map(other => `${days.find(day => day.id === other.eventId)?.name}: ${other.status}`).join('; ')
        const answers = row.submission?.submissionData || []
        for (const answer of answers.length ? answers : [{ field: '', value: '' }]) data.push([row.submission!.id, ...identity(row), outcomes, answer.field, answer.value])
      }
    }
    return new NextResponse('\uFEFF' + data.map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="event-${id}-${kind}.csv"`, 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Event export failed' })
    return NextResponse.json({ error: 'Could not export this event.' }, { status: 500 })
  }
}
