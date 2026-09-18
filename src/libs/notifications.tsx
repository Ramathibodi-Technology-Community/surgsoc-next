import React from 'react'
import { sendEmail } from './email/sender'
import { FormAssignedEmail } from './email/templates/form-assigned'
import { RegistrationAcceptedEmail } from './email/templates/registration-accepted'
import { RegistrationConfirmedEmail } from './email/templates/registration-confirmed'
import { RegistrationRejectedEmail } from './email/templates/registration-rejected'
import {
  formatNotificationDate,
  getFormAssignmentUrl,
  getNotificationBaseUrl,
  getPreferredRecipientName,
  getRegistrationDecisionUrls,
} from './notifications/shared'

type NotificationUser = {
  email?: string | null
  name_english?: {
    first_name?: string | null
  } | null
}

type NotificationEvent = {
  id: string | number
  name: string
  date_begin: string | number | Date
  location?: string | null
}

type RegistrationNotificationPayload = {
  registration: {
    id: string | number
    rejection_reason?: string | null
    line_qr_code?: string | null
  }
  event: NotificationEvent
  user: NotificationUser
}

type FormAssignmentNotificationPayload = {
  form: {
    id: string | number
    title: string
  }
  user: NotificationUser
  deadline?: string | number | Date | null
  message?: string | null
}

export const NotificationService = {
  async sendRegistrationAccepted({ registration, event, user }: RegistrationNotificationPayload) {
    if (!user.email) return
    const baseUrl = getNotificationBaseUrl()

    // TODO: Check user notification preferences

    const { confirmUrl, declineUrl } = getRegistrationDecisionUrls(baseUrl, event.id, registration.id)

    await sendEmail({
      to: user.email,
      subject: `You're accepted: ${event.name}`,
      react: (
        <RegistrationAcceptedEmail
          userName={getPreferredRecipientName(user)}
          eventName={event.name}
          eventDate={formatNotificationDate(event.date_begin)}
          location={event.location || 'TBA'}
          confirmUrl={confirmUrl}
          declineUrl={declineUrl}
        />
      ),
    })
  },

  async sendRegistrationRejected({ registration, event, user }: RegistrationNotificationPayload) {
    if (!user.email) return

    await sendEmail({
      to: user.email,
      subject: `Update regarding your registration for ${event.name}`,
      react: (
        <RegistrationRejectedEmail
          userName={getPreferredRecipientName(user)}
          eventName={event.name}
          reason={registration.rejection_reason ?? undefined}
          contactEmail="surgsoc.mahidol@gmail.com"
        />
      ),
    })
  },

  async sendRegistrationConfirmed({ registration, event, user }: RegistrationNotificationPayload) {
      if (!user.email) return

      await sendEmail({
          to: user.email,
          subject: `Registration Confirmed: ${event.name}`,
          react: (
            <RegistrationConfirmedEmail
              userName={getPreferredRecipientName(user)}
              eventName={event.name}
              eventDate={formatNotificationDate(event.date_begin)}
              location={event.location || 'TBA'}
              lineQrCode={registration.line_qr_code ?? ''}
            />
          ),
      })
  },

  async sendFormAssignment({ form, user, deadline, message }: FormAssignmentNotificationPayload) {
      if (!user.email) return
      const baseUrl = getNotificationBaseUrl()

      const formUrl = getFormAssignmentUrl(baseUrl, form.id)

      await sendEmail({
          to: user.email,
          subject: `Action Required: ${form.title}`,
          react: (
            <FormAssignedEmail
              userName={getPreferredRecipientName(user)}
              formName={form.title}
              formUrl={formUrl}
              deadline={deadline ? formatNotificationDate(deadline) : undefined}
              message={message ?? undefined}
            />
          ),
      })
  }
}
