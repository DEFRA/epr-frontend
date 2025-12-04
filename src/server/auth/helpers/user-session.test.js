import { getUserSession } from '#server/auth/helpers/get-user-session.js'
import { createUpdateUserSession } from '#server/auth/helpers/user-session.js'
import { describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe(createUpdateUserSession, () => {
  it('should throw error when session is deleted during token refresh', async () => {
    const mockVerifyToken = vi.fn().mockResolvedValue({
      sub: 'user-123',
      email: 'test@example.com',
      correlationId: 'corr-123',
      sessionId: 'sess-123',
      contactId: 'contact-123',
      serviceId: 'test-service-id',
      firstName: 'Test',
      lastName: 'User',
      uniqueReference: 'ref-123',
      loa: '2',
      aal: '1',
      enrolmentCount: 1,
      enrolmentRequestCount: 0,
      currentRelationshipId: 'rel-123',
      relationships: ['rel-123'],
      roles: ['role1']
    })

    vi.mocked(getUserSession).mockResolvedValue({
      ok: true,
      value: null
    })

    const updateUserSession = createUpdateUserSession(mockVerifyToken)

    const mockRequest = {
      state: { userSession: { sessionId: 'sess-123' } },
      server: { app: { cache: { set: vi.fn() } } }
    }

    const refreshedSession = {
      id_token: 'new-id-token',
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600
    }

    await expect(
      updateUserSession(mockRequest, refreshedSession)
    ).rejects.toThrowError(
      'Cannot update session: session was deleted during token refresh'
    )

    expect(mockRequest.server.app.cache.set).not.toHaveBeenCalled()
  })
})
