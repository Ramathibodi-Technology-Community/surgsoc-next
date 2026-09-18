import type { ReactElement } from 'react'
import { getErrorMessage } from '@/libs/utils'
import { createResendClient, getEmailFromAddress } from './config'

export type EmailPayload = {
  to: string | string[]
  subject: string
  react?: ReactElement
  html?: string
  from?: string
}

export type SendEmailResult =
  | { success: true; data: unknown }
  | { success: false; error: string }

type SenderClient = {
  emails: {
    send: (payload: {
      from: string
      to: string | string[]
      subject: string
      react?: ReactElement
      html?: string
    }) => Promise<unknown>
  }
}

type Logger = Pick<Console, 'warn' | 'info' | 'error'>

export type SendEmailDependencies = {
  client?: SenderClient | null
  logger?: Logger
}

export async function sendEmail(
  payload: EmailPayload,
  dependencies: SendEmailDependencies = {},
): Promise<SendEmailResult> {
  const from = getEmailFromAddress(payload.from)
  const logger = dependencies.logger ?? console
  const client = dependencies.client ?? createResendClient()

  if (!client) {
    logger.warn('RESEND_API_KEY is not set. Email not sent:', {
      to: payload.to,
      subject: payload.subject,
    })
    return { success: false, error: 'RESEND_API_KEY not set' }
  }

  try {
    const data = await client.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      react: payload.react,
      html: payload.html,
    })

    logger.info(`Email sent successfully to ${payload.to}`, data)
    return { success: true, data }
  } catch (error) {
    const message = getErrorMessage(error)
    logger.error(`Failed to send email: ${message}`)
    return { success: false, error: message }
  }
}
