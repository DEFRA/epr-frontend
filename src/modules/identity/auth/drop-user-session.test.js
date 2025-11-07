import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { dropUserSession } from '#modules/identity/auth/drop-user-session.js'
import { createServer } from '#server/index.js'

describe('#dropUserSession', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
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
})

/**
 * @import { Server } from '@hapi/hapi'
 */
