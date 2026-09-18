import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSiteSettingsMock } = vi.hoisted(() => ({ getSiteSettingsMock: vi.fn() }))

vi.mock('@/libs/site-settings', () => ({ getSiteSettings: getSiteSettingsMock }))

import { Users } from '@/collections/Users'

const DISABLED_MESSAGE = 'Password reset is currently disabled. Please contact an administrator.'

describe('users password-reset beforeOperation gate', () => {
  // Payload auto-exposes forgot-password/reset-password on this collection;
  // this hook is the only place that can block those REST routes.
  const gate = (Users.hooks!.beforeOperation as any[])[0]

  beforeEach(() => {
    getSiteSettingsMock.mockReset()
  })

  it('blocks forgotPassword when the toggle is off', async () => {
    getSiteSettingsMock.mockResolvedValue({ enablePasswordReset: false })
    await expect(gate({ operation: 'forgotPassword', req: {} })).rejects.toThrow(DISABLED_MESSAGE)
  })

  it('allows forgotPassword when the toggle is on', async () => {
    getSiteSettingsMock.mockResolvedValue({ enablePasswordReset: true })
    await expect(gate({ operation: 'forgotPassword', req: {} })).resolves.toBeUndefined()
  })

  /*
    Not a gap in this hook: Payload never runs beforeOperation for
    resetPassword (payload/dist/auth/operations/resetPassword.js runs only
    beforeValidate, with operation: 'update'). Gating it here would be dead
    code that reads like protection. The token's only source is the gated
    forgotPassword endpoint, which is the actual control.
  */
  it('does not attempt to gate resetPassword, which Payload never routes here', async () => {
    getSiteSettingsMock.mockResolvedValue({ enablePasswordReset: false })
    await expect(gate({ operation: 'resetPassword', req: {} })).resolves.toBeUndefined()
    expect(getSiteSettingsMock).not.toHaveBeenCalled()
  })

  it('fails closed when the settings read throws', async () => {
    getSiteSettingsMock.mockRejectedValue(new Error('db unreachable'))
    await expect(gate({ operation: 'forgotPassword', req: {} })).rejects.toThrow(DISABLED_MESSAGE)
  })

  it('ignores unrelated operations without reading settings', async () => {
    await expect(gate({ operation: 'create', req: {} })).resolves.toBeUndefined()
    expect(getSiteSettingsMock).not.toHaveBeenCalled()
  })
})
