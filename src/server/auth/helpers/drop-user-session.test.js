import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { dropUserSession } from './drop-user-session.js'

describe('#dropUserSession', () => {
  /** @type {Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  beforeAll(async () => {
    mockOidcServer.listen()
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  it('should drop user session from cache', async () => {
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

  it('should not drop if userSession is nullish', async () => {
    const mockRequest = {
      state: { userSession: undefined },
      server
    }

    await dropUserSession(mockRequest)

    expect(vi.spyOn(server.app.cache, 'drop')).not.toHaveBeenCalled()
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
