import jwt from '@hapi/jwt'
import { describe, expect, test, vi } from 'vitest'

import { dropUserSession } from '#server/common/helpers/auth/drop-user-session.js'
import { getUserSession } from '#server/common/helpers/auth/get-user-session.js'
import {
  removeUserSession,
  updateUserSession
} from '#server/common/helpers/auth/user-session.js'

vi.mock(import('#server/common/helpers/auth/drop-user-session.js'))
vi.mock(import('#server/common/helpers/auth/get-user-session.js'))
vi.mock(import('@hapi/jwt'))

describe('#removeUserSession', () => {
  test('should drop session and clear cookie', async () => {
    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-123'
        }
      },
      server: {
        app: {
          cache: {
            drop: vi.fn()
          }
        }
      },
      cookieAuth: {
        clear: vi.fn()
      }
    }

    await removeUserSession(mockRequest)

    expect(dropUserSession).toHaveBeenCalledExactlyOnceWith(mockRequest)
    expect(mockRequest.cookieAuth.clear).toHaveBeenCalledExactlyOnceWith()
  })
})

describe('#updateUserSession', () => {
  test('should update session with refreshed tokens and user data', async () => {
    const mockPayload = {
      sub: 'user-123',
      correlationId: 'corr-123',
      sessionId: 'sess-123',
      contactId: 'contact-123',
      serviceId: 'service-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      uniqueReference: 'ref-123',
      loa: '2',
      aal: '1',
      enrolmentCount: 1,
      enrolmentRequestCount: 0,
      currentRelationshipId: 'rel-123',
      relationships: ['rel-123'],
      roles: ['role1']
    }

    vi.mocked(jwt.token.decode).mockReturnValue({
      decoded: {
        payload: mockPayload
      }
    })

    const mockExistingSession = {
      tokenUrl: 'http://localhost/token',
      logoutUrl: 'http://localhost/logout'
    }

    const mockUpdatedSession = {
      ...mockExistingSession,
      ...mockPayload,
      id: mockPayload.sub,
      displayName: 'John Doe',
      isAuthenticated: true,
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
      idToken: 'new-id-token',
      expiresIn: 3600000,
      expiresAt: expect.any(Date)
    }

    vi.mocked(getUserSession)
      .mockResolvedValueOnce(mockExistingSession)
      .mockResolvedValueOnce(mockUpdatedSession)

    const mockRefreshedSession = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      id_token: 'new-id-token',
      expires_in: 3600
    }

    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-123'
        }
      },
      server: {
        app: {
          cache: {
            set: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    }

    const result = await updateUserSession(mockRequest, mockRefreshedSession)

    expect(jwt.token.decode).toHaveBeenCalledExactlyOnceWith('new-access-token')

    expect(getUserSession).toHaveBeenLastCalledWith(mockRequest)

    expect(mockRequest.server.app.cache.set).toHaveBeenCalledExactlyOnceWith(
      'session-123',
      {
        ...mockExistingSession,
        id: 'user-123',
        correlationId: 'corr-123',
        sessionId: 'sess-123',
        contactId: 'contact-123',
        serviceId: 'service-123',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john.doe@example.com',
        uniqueReference: 'ref-123',
        loa: '2',
        aal: '1',
        enrolmentCount: 1,
        enrolmentRequestCount: 0,
        currentRelationshipId: 'rel-123',
        relationships: ['rel-123'],
        roles: ['role1'],
        isAuthenticated: true,
        idToken: 'new-id-token',
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600000,
        expiresAt: expect.any(Date)
      }
    )

    expect(result).toStrictEqual(mockUpdatedSession)
  })

  test('should handle user with only first name', async () => {
    const mockPayload = {
      sub: 'user-456',
      firstName: 'Jane',
      lastName: null,
      email: 'jane@example.com',
      correlationId: 'corr-456',
      sessionId: 'sess-456',
      contactId: 'contact-456',
      serviceId: 'service-456',
      uniqueReference: 'ref-456',
      loa: '1',
      aal: '1',
      enrolmentCount: 0,
      enrolmentRequestCount: 1,
      currentRelationshipId: 'rel-456',
      relationships: [],
      roles: []
    }

    vi.mocked(jwt.token.decode).mockReturnValue({
      decoded: {
        payload: mockPayload
      }
    })

    vi.mocked(getUserSession).mockResolvedValue({})

    const mockRefreshedSession = {
      access_token: 'token-123',
      refresh_token: 'refresh-123',
      id_token: 'id-123',
      expires_in: 7200
    }

    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-456'
        }
      },
      server: {
        app: {
          cache: {
            set: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    }

    await updateUserSession(mockRequest, mockRefreshedSession)

    const setCall = vi.mocked(mockRequest.server.app.cache.set).mock.calls[0]

    expect(setCall[1].displayName).toBe('Jane')
  })

  test('should handle user with only last name', async () => {
    const mockPayload = {
      sub: 'user-789',
      firstName: null,
      lastName: 'Smith',
      email: 'smith@example.com',
      correlationId: 'corr-789',
      sessionId: 'sess-789',
      contactId: 'contact-789',
      serviceId: 'service-789',
      uniqueReference: 'ref-789',
      loa: '1',
      aal: '1',
      enrolmentCount: 0,
      enrolmentRequestCount: 0,
      currentRelationshipId: 'rel-789',
      relationships: [],
      roles: []
    }

    vi.mocked(jwt.token.decode).mockReturnValue({
      decoded: {
        payload: mockPayload
      }
    })

    vi.mocked(getUserSession).mockResolvedValue({})

    const mockRefreshedSession = {
      access_token: 'token-789',
      refresh_token: 'refresh-789',
      id_token: 'id-789',
      expires_in: 1800
    }

    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-789'
        }
      },
      server: {
        app: {
          cache: {
            set: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    }

    await updateUserSession(mockRequest, mockRefreshedSession)

    const setCall = vi.mocked(mockRequest.server.app.cache.set).mock.calls[0]

    expect(setCall[1].displayName).toBe('Smith')
  })
})
