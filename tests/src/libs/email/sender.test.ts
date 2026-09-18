import { describe, expect, it, vi } from 'vitest'
import { sendEmail } from '@/libs/email/sender'

describe('sendEmail', () => {
  it('returns config error when resend client is missing', async () => {
    const logger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }

    const result = await sendEmail(
      {
        to: 'user@example.com',
        subject: 'Test subject',
      },
      {
        client: null,
        logger,
      },
    )

    expect(result).toEqual({ success: false, error: 'RESEND_API_KEY not set' })
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('returns success when client sends email', async () => {
    const logger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }

    const send = vi.fn().mockResolvedValue({ id: 'msg_1' })

    const result = await sendEmail(
      {
        to: 'user@example.com',
        subject: 'Test subject',
        html: '<p>Hello</p>',
      },
      {
        client: {
          emails: { send },
        },
        logger,
      },
    )

    expect(result).toEqual({ success: true, data: { id: 'msg_1' } })
    expect(send).toHaveBeenCalledWith({
      from: expect.any(String),
      to: 'user@example.com',
      subject: 'Test subject',
      react: undefined,
      html: '<p>Hello</p>',
    })
    expect(logger.info).toHaveBeenCalledTimes(1)
  })

  it('returns error when client send throws', async () => {
    const logger = {
      warn: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }

    const send = vi.fn().mockRejectedValue(new Error('provider failure'))

    const result = await sendEmail(
      {
        to: 'user@example.com',
        subject: 'Test subject',
      },
      {
        client: {
          emails: { send },
        },
        logger,
      },
    )

    expect(result).toEqual({ success: false, error: 'provider failure' })
    expect(logger.error).toHaveBeenCalledWith('Failed to send email: provider failure')
  })
})
