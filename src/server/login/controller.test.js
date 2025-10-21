import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest'
import { config } from '~/src/config/config.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { createMockOidcServer } from '~/src/server/common/test-helpers/mock-oidc.js'
import { createServer } from '~/src/server/index.js'

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
      test('should not be accessible when oidc configuration url is not set', async () => {
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
        config.reset('defraId.clientId')
        config.reset('defraId.clientSecret')
        config.reset('defraId.oidcConfigurationUrl')
        config.reset('defraId.serviceId')
        mockOidcServer.resetHandlers()
      })

      afterAll(() => {
        mockOidcServer.close()
      })

      test('should redirect to oidc provider when oidc configuration url is set', async () => {
        config.load({
          defraId: {
            clientId: 'test-client-id',
            clientSecret: 'test-secret',
            oidcConfigurationUrl:
              'http://defra-id.auth/.well-known/openid-configuration',
            serviceId: 'test-service-id'
          }
        })

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
