import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { ok, err } from '#server/common/helpers/result.js'
import { describe, expect, it, vi } from 'vitest'
import { provideAuthedUser } from './provide-authed-user.js'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe(provideAuthedUser, () => {
  it('should return user session value when session exists', async () => {
    const mockSession = {
      id: 'test-user',
      idToken: 'test-token'
    }

    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue(
      ok(mockSession)
    )

    const mockRequest = {}

    const result = await provideAuthedUser.method(mockRequest)

    expect(result).toStrictEqual(mockSession)
  })

  it('should return undefined when session does not exist', async () => {
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue(err())

    const mockRequest = {}

    const result = await provideAuthedUser.method(mockRequest)

    expect(result).toBeUndefined()
  })

  it('should have authedUser as assign property', () => {
    expect(provideAuthedUser.assign).toBe('authedUser')
  })

  it('should have failAction that allows page to render', async () => {
    const result = await provideAuthedUser.failAction()

    expect(result).toBeUndefined()
  })
})
