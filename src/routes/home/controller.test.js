import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as getUserSessionModule from '#server/common/helpers/auth/get-user-session.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/common/helpers/auth/get-user-session.js'))

describe('#homeController', () => {
  describe('when auth is disabled', () => {
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
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/'
      })

      const $ = load(result)

      // Login link should not exist
      const loginLink = $('#login-link')

      expect(loginLink).toHaveLength(0)

      expect(result).toStrictEqual(expect.stringContaining('Home |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('when auth is enabled', () => {
    /** @type {Server} */
    let server
    const mockOidcServer = createMockOidcServer('http://defra-id.auth')

    beforeAll(async () => {
      mockOidcServer.listen({ onUnhandledRequest: 'bypass' })
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

    describe.each([
      {
        heading: 'Rheoli eich cyfrifoldebau gwastraff pecynnu',
        lang: 'cy',
        loginUrl: '/cy/login',
        startNow: 'Dechreuwch nawr',
        title: 'Hafan',
        url: '/cy'
      },
      {
        heading: 'Manage your packaging waste responsibilities',
        lang: 'en',
        loginUrl: '/login',
        startNow: 'Start now',
        title: 'Home',
        url: '/'
      }
    ])(
      'when user is not authenticated (lang: $lang)',
      ({ heading, loginUrl, startNow, title, url }) => {
        it('should provide expected response with correct status', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({})

          const { result, statusCode } = await server.inject({
            method: 'GET',
            url
          })

          const $ = load(result)

          expect($('title').text().trim()).toStrictEqual(
            expect.stringMatching(new RegExp(`^${title} \\|`))
          )
          expect(statusCode).toBe(statusCodes.ok)
        })

        it('should render page with login link and guest welcome', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({})

          const { result } = await server.inject({
            method: 'GET',
            url
          })

          const $ = load(result)

          // Page structure
          expect($('[data-testid="app-page-body"]')).toHaveLength(1)
          expect($('h1').text()).toBe(heading)

          const loginLink = $('[data-testid="app-page-body"] a')

          expect(loginLink.text().trim()).toBe(startNow)
          expect(loginLink.attr('href')).toBe(loginUrl)
        })
      }
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
