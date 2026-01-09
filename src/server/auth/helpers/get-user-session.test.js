import { describe, expect, test, vi } from 'vitest'
import { getUserSession } from './get-user-session.js'

const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
})

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
        logger: createMockLogger(),
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
      expect(result).toStrictEqual({
        ok: true,
        value: mockSession
      })
    })
  })

  describe('when session does not exist', () => {
    test('should return not found when no userSession in state', async () => {
      const mockRequest = {
        state: {},
        logger: createMockLogger(),
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
      expect(mockRequest.logger.debug).toHaveBeenCalledExactlyOnceWith(
        'No sessionId in cookie state'
      )
      expect(result).toStrictEqual({ ok: false })
    })

    test('should return not found when no sessionId in userSession', async () => {
      const mockRequest = {
        state: {
          userSession: {}
        },
        logger: createMockLogger(),
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
      expect(mockRequest.logger.debug).toHaveBeenCalledExactlyOnceWith(
        'No sessionId in cookie state'
      )
      expect(result).toStrictEqual({ ok: false })
    })

    test('should return not found when state is undefined', async () => {
      const mockRequest = {
        logger: createMockLogger(),
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
      expect(mockRequest.logger.debug).toHaveBeenCalledExactlyOnceWith(
        'No sessionId in cookie state'
      )
      expect(result).toStrictEqual({ ok: false })
    })

    test('should return not found and log when session not in cache', async () => {
      const mockRequest = {
        state: {
          userSession: {
            sessionId: 'session-123'
          }
        },
        logger: createMockLogger(),
        server: {
          app: {
            cache: {
              get: vi.fn().mockResolvedValue(null)
            }
          }
        }
      }

      const result = await getUserSession(mockRequest)

      expect(mockRequest.server.app.cache.get).toHaveBeenCalledExactlyOnceWith(
        'session-123'
      )
      expect(mockRequest.logger.info).toHaveBeenCalledExactlyOnceWith(
        { sessionId: 'session-123' },
        'Session not found in cache - may have expired or been cleared'
      )
      expect(result).toStrictEqual({ ok: false })
    })
  })
})
