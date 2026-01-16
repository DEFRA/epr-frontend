import { it } from '#vite/fixtures/server.js'
import { describe, expect, vi } from 'vitest'
import { dropUserSession } from './drop-user-session.js'

describe('#dropUserSession', () => {
  it('should drop user session from cache', async ({ server }) => {
    await server.app.cache.set('session-123', 'session-value')

    const mockRequest = {
      state: {
        userSession: {
          sessionId: 'session-123'
        }
      },
      server
    }

    await dropUserSession(mockRequest)

    await expect(server.app.cache.get('session-123')).resolves.toBeNull()
  })

  it('should not drop if userSession is nullish', async ({ server }) => {
    const mockRequest = {
      state: { userSession: undefined },
      server
    }

    await dropUserSession(mockRequest)

    expect(vi.spyOn(server.app.cache, 'drop')).not.toHaveBeenCalled()
  })
})
