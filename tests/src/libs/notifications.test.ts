import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmailMock = vi.fn()

vi.mock('@/libs/email/sender', () => ({
  sendEmail: sendEmailMock,
}))

// Cold-importing @/libs/notifications pulls in the full react-email template
// graph, which can take >5s under parallel suite load. Give the tests a larger
// budget to avoid flaky timeouts.
describe('NotificationService', { timeout: 15000 }, () => {
  beforeEach(() => {
    sendEmailMock.mockReset()
    sendEmailMock.mockResolvedValue({ success: true, data: { id: 'msg_1' } })
  })

  it('does not send accepted email when user has no email', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'
    const { NotificationService } = await import('@/libs/notifications')

    await NotificationService.sendRegistrationAccepted({
      registration: { id: 1 },
      event: { id: 2, name: 'Event', date_begin: '2026-03-08T00:00:00.000Z' },
      user: { email: null },
    })

    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('sends accepted email with expected subject and recipient', async () => {
    process.env.NEXT_PUBLIC_SERVER_URL = 'https://example.com'
    const { NotificationService } = await import('@/libs/notifications')

    await NotificationService.sendRegistrationAccepted({
      registration: { id: 99 },
      event: { id: 10, name: 'Surgery Workshop', date_begin: '2026-03-08T00:00:00.000Z', location: 'Hall A' },
      user: { email: 'member@example.com', name_english: { first_name: 'Mina' } },
    })

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const arg = sendEmailMock.mock.calls[0][0]
    expect(arg.to).toBe('member@example.com')
    expect(arg.subject).toBe("You're accepted: Surgery Workshop")
    expect(arg.react).toBeTruthy()
  })
})
