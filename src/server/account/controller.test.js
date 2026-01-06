import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('#accountController', () => {
  describe('auth disabled', () => {
    /** @type {Server} */
    let server

    beforeAll(async () => {
      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    it('should provide expected response with correct status', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/account'
      })

      expect(result).toStrictEqual(expect.stringContaining('Account |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('when auth is enabled', () => {
    /** @type {Server} */
    let server
    const mockOidcServer = createMockOidcServer('http://defra-id.auth')

    beforeAll(async () => {
      mockOidcServer.listen()
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
    })

    afterAll(async () => {
      config.reset('defraId.clientId')
      config.reset('defraId.clientSecret')
      config.reset('defraId.oidcConfigurationUrl')
      config.reset('defraId.serviceId')
      mockOidcServer.close()
      await server.stop({ timeout: 0 })
    })

    describe('when user is not authenticated', () => {
      it('should provide expected response with correct status', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          found: false,
          data: null
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/account'
        })

        const $ = load(result)

        expect($('h1').text()).toBe('Sites')
        expect($('title').text().trim()).toStrictEqual(
          expect.stringMatching(/^Account \|/)
        )
        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should render page with login link and guest welcome', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/start'
        })

        const $ = load(result)

        // Page structure
        expect($('[data-testid="app-page-body"]')).toHaveLength(1)

        // No authenticated welcome panel
        expect($('.govuk-panel--confirmation').text()).not.toContain('Welcome,')
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
