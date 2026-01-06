import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('#signOutController', () => {
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

  describe('when navigating to /logged-out', () => {
    it('should return 200 status', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should render page with correct title', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(result)

      expect($('title').text()).toContain('Signed out')
    })

    it('should render page with correct heading', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(result)

      expect($('h1').text()).toBe('You have signed out')
    })

    it('should render sign in again button linking to login', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/logged-out'
      })

      const $ = load(result)
      const button = $('.govuk-button')

      expect(button.text().trim()).toBe('Sign in again')
      expect(button.attr('href')).toBe('/login')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
