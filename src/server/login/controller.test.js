import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest'
import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'

describe('#loginController - integration', () => {
  /** @type {Server} */
  let server

  beforeEach(async () => {
    server = null
  })

  afterEach(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('login flow', () => {
    describe('when auth is disabled', () => {
      test('should not be accessible when feature flag is disabled', async () => {
        server = await createServer()
        await server.initialize()

        const response = await server.inject({
          method: 'GET',
          url: '/login'
        })

        expect(response.statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('when auth is enabled', () => {
      const mockOidcServer = createMockOidcServer('http://defra-id.auth')

      beforeEach(async () => {
        mockOidcServer.listen({ onUnhandledRequest: 'bypass' })
      })

      afterEach(async () => {
        config.reset('featureFlags.defraId')
        config.reset('defraId.oidcConfigurationUrl')
        mockOidcServer.resetHandlers()
      })

      afterAll(() => {
        mockOidcServer.close()
      })

      test('should redirect to OIDC provider when feature flag is enabled', async () => {
        config.set('featureFlags.defraId', true)
        config.set(
          'defraId.oidcConfigurationUrl',
          'http://defra-id.auth/.well-known/openid-configuration'
        )

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
})

/**
 * @import { Server } from '@hapi/hapi'
 */
