import { eventReturnPath, formatStamp } from '@/libs/utils'
import { formManager } from '@/libs/form-management'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import FormResponsesTable from '@/components/FormResponsesTable'
import { answerFields } from '@/libs/forms/answers'
import FormShell from '@/components/FormShell'
import { canAssignForms } from '@/libs/permissions'
import { Button } from '@/components/ui/button'

export default async function Submissions({ params, searchParams }: { params: Promise<{ formId: string; locale: Locale }>; searchParams: Promise<{ page?: string; returnTo?: string }> }) {
  const { payload, user } = await formManager()
  const { formId, locale } = await params
  const form = await payload.findByID({ collection: 'forms', id: formId, user, overrideAccess: false, depth: 0 }).catch(() => null)
  if (!form) notFound()
  const returnTo = eventReturnPath((await searchParams).returnTo)
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const result = await payload.find({ collection: 'form-submissions', where: { form: { equals: formId } }, sort: '-createdAt', page, limit: 20, depth: 1, user, overrideAccess: false })
  const t = (await getDictionary(locale)).forms.editor
  const pageHref = (target: number | null | undefined) => `?page=${target}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`
  return (
    <FormShell formId={form.id} title={form.title} subtitle={`${form.fields?.length || 0} ${t.fields} · ${result.totalDocs} ${t.responses}`} accepting={form.accept_responses !== false} tab="responses" back={returnTo} responseCount={result.totalDocs} canAssign={canAssignForms(user)}>
      {!result.docs.length ? (
        <div className="empty-note"><p className="font-medium text-secondary-foreground">{t.no_responses}</p></div>
      ) : (
        <FormResponsesTable
          fields={answerFields(form)}
          rows={result.docs.map(submission => ({ id: submission.id, email: typeof submission.user === 'object' ? submission.user?.email ?? '' : String(submission.user ?? ''), sent: formatStamp(submission.createdAt, locale), answers: submission.submissionData ?? null }))}
        />
      )}
      {(result.hasPrevPage || result.hasNextPage) && (
        <nav className="mt-6 flex gap-3">
          {result.hasPrevPage && <Button asChild variant="outline"><Link href={pageHref(result.prevPage)}>{t.previous}</Link></Button>}
          {result.hasNextPage && <Button asChild variant="outline"><Link href={pageHref(result.nextPage)}>{t.next}</Link></Button>}
        </nav>
      )}
    </FormShell>
  )
}
