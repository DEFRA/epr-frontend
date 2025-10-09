import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { config } from '~/src/config/config.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { createServer } from '~/src/server/index.js'

describe('#loginController - integration', () => {
  /** @type {Server} */
  let server

  beforeEach(async () => {
    server = null
  })

  afterEach(async () => {
    config.reset('featureFlags.defraId')
    await server.stop({ timeout: 0 })
  })

  describe('login flow', () => {
    test('should not be accessible when feature flag is disabled', async () => {
      server = await createServer()
      await server.initialize()

      const response = await server.inject({
        method: 'GET',
        url: '/login'
      })

      expect(response.statusCode).toBe(statusCodes.notFound)
    })

    test('should redirect to OIDC provider when feature flag is enabled', async () => {
      config.set('featureFlags.defraId', true)

      server = await createServer()
      await server.initialize()

      const response = await server.inject({
        method: 'GET',
        url: '/login'
      })

      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toContain('/authorize')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
