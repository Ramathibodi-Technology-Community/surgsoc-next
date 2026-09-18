import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
}

const canInteractAsMemberMock = vi.fn()

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))
vi.mock('@/libs/permissions', () => ({
  canInteractAsMember: canInteractAsMemberMock,
}))

describe('submitForm action', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.findByID.mockReset()
    payloadMock.find.mockReset()
    payloadMock.create.mockReset()
    canInteractAsMemberMock.mockReset()
  })

  it('throws when user is unauthorized', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    canInteractAsMemberMock.mockReturnValue(false)

    const { submitForm } = await import('@/app/[locale]/(frontend)/forms/[formId]/actions')

    await expect(submitForm(1, { fieldA: 'x' })).rejects.toThrow('Please sign in as a member to submit forms.')
  })

  it('throws generic failure when duplicate submission is found', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 10 } })
    canInteractAsMemberMock.mockReturnValue(true)
    payloadMock.findByID.mockResolvedValue({ publish: { allow_multiple_submissions: false } })
    payloadMock.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 1 }] })

    const { submitForm } = await import('@/app/[locale]/(frontend)/forms/[formId]/actions')

    await expect(submitForm(1, { fieldA: 'x' })).rejects.toThrow('Failed to submit form')
    expect(payloadMock.create).not.toHaveBeenCalled()
  })

  it('creates submission payload with normalized values', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 11 } })
    canInteractAsMemberMock.mockReturnValue(true)
    payloadMock.findByID.mockResolvedValue({ publish: { allow_multiple_submissions: true } })
    payloadMock.create.mockResolvedValue({ id: 123 })

    const { submitForm } = await import('@/app/[locale]/(frontend)/forms/[formId]/actions')

    await submitForm('22', { score: 5, note: 'ok' })

    expect(payloadMock.create).toHaveBeenCalledWith({
      collection: 'form-submissions',
      data: {
        form: 22,
        submissionData: [
          { field: 'score', value: '5' },
          { field: 'note', value: 'ok' },
        ],
        user: 11,
      },
    })
  })
})
