import { describe, expect, test, vi } from 'vitest'

import { dropUserSession } from '~/src/server/common/helpers/auth/drop-user-session.js'

describe('#dropUserSession', () => {
  test('should drop user session from cache', () => {
    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-123'
        }
      },
      server: {
        app: {
          cache: {
            drop: vi.fn().mockResolvedValue(undefined)
          }
        }
      }
    }

    dropUserSession(mockRequest)

    expect(mockRequest.server.app.cache.drop).toHaveBeenCalledExactlyOnceWith(
      'session-123'
    )
  })

  test('should return the result from cache.drop', () => {
    const mockResult = Promise.resolve(undefined)
    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-456'
        }
      },
      server: {
        app: {
          cache: {
            drop: vi.fn().mockReturnValue(mockResult)
          }
        }
      }
    }

    const result = dropUserSession(mockRequest)

    expect(result).toStrictEqual(mockResult)
  })
})
