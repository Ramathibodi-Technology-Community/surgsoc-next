import { render } from '@react-email/components'
import { RegistrationAcceptedEmail } from '@/libs/email/templates/registration-accepted'
import { RegistrationConfirmedEmail } from '@/libs/email/templates/registration-confirmed'
import { RegistrationRejectedEmail } from '@/libs/email/templates/registration-rejected'
import { formatNotificationDate } from '@/libs/notifications/shared'
import { tagPath } from '@/libs/tags'
import type { Event } from '@/payload-types'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'

export default async function EventNotificationPreview({ event, locale }: { event: Event; locale: Locale }) {
  const t = (await getDictionary(locale)).events
  const common = { userName: 'Member', eventName: event.name, eventDate: formatNotificationDate(event.date_begin), location: tagPath(event.location) || 'TBA' }
  const previews = [
    { title: t.accept, content: <RegistrationAcceptedEmail {...common} confirmUrl="#" declineUrl="#" message={event.custom_acceptance_email} requiresLoa={!!event.loa_form} /> },
    { title: t.applicants.status.confirmed, content: <RegistrationConfirmedEmail {...common} lineQrCode="" detailsUrl="#" /> },
    { title: t.reject, content: <RegistrationRejectedEmail userName="Member" eventName={event.name} contactEmail="surgsoc.mahidol@gmail.com" reason={locale === 'th' ? 'เหตุผลที่เจ้าหน้าที่ระบุ (ถ้ามี)' : 'Staff-provided reason (if any)'} /> },
  ]
  const rendered = await Promise.all(previews.map(async preview => ({ ...preview, html: await render(preview.content) })))
  return <div className="space-y-3"><p className="text-meta text-muted-foreground">{t.staff.saved_preview}</p>{rendered.map(preview => <details key={preview.title}><summary className="cursor-pointer py-2 text-body font-medium">{preview.title}</summary><iframe className="h-[28rem] w-full rounded-md border border-border bg-white" title={`${t.staff.email_preview}: ${preview.title}`} sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html.replace('</head>', '<style>a{pointer-events:none}</style></head>')} /></details>)}</div>
}
