
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { findTags } from '@/libs/tags'
import { hasPermission, isUserRole } from '@/libs/permissions'
import type { User } from '@/payload-types'

/**
 * Escape a value for safe CSV inclusion.
 *
 * Prevents CSV formula injection (CWE-1236) by prefixing cells that start with
 * `= + - @ \t \r` with a single quote, and escapes embedded quotes.
 * See https://owasp.org/www-community/attacks/CSV_Injection
 */
function csvCell(value: unknown): string {
  const str = value == null ? '' : String(value)
  const needsQuoting = /[,"\n\r]/.test(str)
  const formulaLeading = /^[=+\-@\t\r]/.test(str)
  const escaped = formulaLeading ? `'${str}` : str
  return needsQuoting ? `"${escaped.replace(/"/g, '""')}"` : escaped
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasPermission(user as User, 'export_data')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { collection, filters } = await req.json()

    if (!['users', 'registrations'].includes(collection)) {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })
    }

    let docs: any[] = []
    let csvContent = ''

    if (collection === 'users') {
      const where: any = {}
      // Validate the role filter against the known allowlist to prevent injection
      // of unexpected operators into the where clause.
      if (isUserRole(filters?.role)) {
        where.roles = { contains: filters.role }
      }

      const result = await payload.find({
        collection: 'users',
        where,
        limit: 5000,
        depth: 0,
      })
      docs = result.docs

      /*
        Departments are tags now. Resolved through one lookup keyed by id
        rather than by raising the query depth — depth 1 on 5000 users would
        populate every other relationship on every row to print one column.
      */
      const departmentLabels = new Map(
        (await findTags(payload, 'department')).map((tag) => [Number(tag.id), tag.label ?? '']),
      )

      // CSV Header
      csvContent = 'ID,Full Name (TH),Nickname (TH),Email,Phone,Department,Roles\n'

      // CSV Rows
      docs.forEach(doc => {
        const name = `${doc.name_thai?.first_name || ''} ${doc.name_thai?.last_name || ''}`.trim()
        const nickname = doc.name_thai?.nickname || ''
        const roles = (doc.roles || []).join(';')
        const phone = doc.contact?.phone || ''

        const row = [
          csvCell(doc.id),
          csvCell(name),
          csvCell(nickname),
          csvCell(doc.email),
          csvCell(phone),
          csvCell(departmentLabels.get(Number(doc.department)) || ''),
          csvCell(roles),
        ]
        csvContent += row.join(',') + '\n'
      })

    } else if (collection === 'registrations') {
      if (!filters?.eventId) {
         return NextResponse.json({ error: 'Event ID required for registration export' }, { status: 400 })
      }

      const result = await payload.find({
        collection: 'registrations',
        where: {
            event: { equals: filters.eventId }
        },
        limit: 5000,
        depth: 1, // depth 1 to get user details
      })
      docs = result.docs

      // CSV Header
      csvContent = 'Registration ID,Status,User ID,Name (TH),Nickname,Email,Phone,Student ID,Year,Submitted At\n'

      docs.forEach(doc => {
        const u = doc.user as any
        if (!u || typeof u === 'string' || typeof u === 'number') return // Should not happen with depth 1 check

        const name = u.name_thai ? `${u.name_thai.first_name || ''} ${u.name_thai.last_name || ''}`.trim() : ''
        const nickname = u.name_thai?.nickname || ''
        const phone = u.contact?.phone || ''
        const studentId = u.academic?.student_id || ''
        const year = u.academic?.year || ''

        const row = [
          csvCell(doc.id),
          csvCell(doc.status),
          csvCell(u.id),
          csvCell(name),
          csvCell(nickname),
          csvCell(u.email),
          csvCell(phone),
          csvCell(studentId),
          csvCell(year),
          csvCell(doc.createdAt),
        ]
        csvContent += row.join(',') + '\n'
      })
    }

    // Return as CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${collection}-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    payload.logger.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
