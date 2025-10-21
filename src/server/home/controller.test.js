import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { config } from '~/src/config/config.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import * as getUserSessionModule from '~/src/server/common/helpers/auth/get-user-session.js'
import { createMockOidcServer } from '~/src/server/common/test-helpers/mock-oidc.js'
import { createServer } from '~/src/server/index.js'

vi.mock(import('~/src/server/common/helpers/auth/get-user-session.js'))

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

    test('should provide expected response with correct status', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({})

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

    describe('when user is not authenticated', () => {
      test('should provide expected response with correct status', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({})

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/'
        })

        expect(result).toStrictEqual(expect.stringContaining('Home |'))
        expect(statusCode).toBe(statusCodes.ok)
      })

      test('should render page with login link and guest welcome', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({})

        const { result } = await server.inject({
          method: 'GET',
          url: '/'
        })

        const $ = load(result)

        // Page structure
        expect($('[data-testid="app-page-body"]')).toHaveLength(1)

        // Guest welcome message
        expect($('.govuk-body').text()).toContain('Welcome, guest!')

        // Login link should exist
        const loginLink = $('#login-link')

        expect(loginLink).toHaveLength(1)
        expect(loginLink.attr('href')).toBe('/login')
        expect(loginLink.text()).toContain('sign in')

        // No logout link
        // eslint-disable-next-line vitest/max-expects
        expect($('a[href="/logout"]')).toHaveLength(0)

        // No authenticated welcome panel
        // eslint-disable-next-line vitest/max-expects
        expect($('.govuk-panel--confirmation').text()).not.toContain('Welcome,')
      })
    })

    describe('when user is authenticated', () => {
      test('should render page with logout link and user welcome', async () => {
        // Mock getUserSession to return authenticated user
        const mockUserSession = {
          displayName: 'John Doe',
          email: 'john.doe@example.com',
          userId: 'user-123'
        }

        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue(
          mockUserSession
        )

        const { result } = await server.inject({
          method: 'GET',
          url: '/'
        })

        const $ = load(result)

        // Authenticated welcome panel should exist
        const welcomePanel = $('.govuk-panel--confirmation')

        expect(welcomePanel).toHaveLength(1)
        expect(welcomePanel.text()).toContain('Welcome, John Doe')

        // Logout link should exist
        const logoutLink = $('a[href="/logout"]')

        expect(logoutLink).toHaveLength(1)
        expect(logoutLink.text()).toContain('Sign out')

        // No login link
        expect($('#login-link')).toHaveLength(0)

        // eslint-disable-next-line vitest/max-expects
        expect($('.govuk-details__summary-text').text()).toContain(
          'View your account details'
        )
        // eslint-disable-next-line vitest/max-expects
        expect($('.govuk-summary-list')).toHaveLength(1)
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
