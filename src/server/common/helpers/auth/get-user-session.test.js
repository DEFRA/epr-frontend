import { describe, expect, test, vi } from 'vitest'

import { getUserSession } from '#server/common/helpers/auth/get-user-session.js'

describe('#getUserSession', () => {
  describe('when session exists', () => {
    test('should return user session from cache', async () => {
      const mockSession = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User'
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
              get: vi.fn().mockResolvedValue(mockSession)
            }
          }
        }
      }

      const result = await getUserSession(mockRequest)

      expect(mockRequest.server.app.cache.get).toHaveBeenCalledExactlyOnceWith(
        'session-123'
      )
      expect(result).toStrictEqual(mockSession)
    })
  })

  describe('when session does not exist', () => {
    test('should return empty object when no userSession in state', async () => {
      const mockRequest = {
        state: {},
        server: {
          app: {
            cache: {
              get: vi.fn()
            }
          }
        }
      }

      const result = await getUserSession(mockRequest)

      expect(mockRequest.server.app.cache.get).not.toHaveBeenCalled()
      expect(result).toStrictEqual({})
    })

    test('should return empty object when no sessionId in userSession', async () => {
      const mockRequest = {
        state: {
          userSession: {}
        },
        server: {
          app: {
            cache: {
              get: vi.fn()
            }
          }
        }
      }

      const result = await getUserSession(mockRequest)

      expect(mockRequest.server.app.cache.get).not.toHaveBeenCalled()
      expect(result).toStrictEqual({})
    })

    test('should return empty object when state is undefined', async () => {
      const mockRequest = {
        server: {
          app: {
            cache: {
              get: vi.fn()
            }
          }
        }
      }

      const result = await getUserSession(mockRequest)

      expect(mockRequest.server.app.cache.get).not.toHaveBeenCalled()
      expect(result).toStrictEqual({})
    })
  })
})
