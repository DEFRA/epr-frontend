import { config } from '#config/config.js'
import { statusCodes } from '#modules/platform/constants/status-codes.js'
import * as getUserSessionModule from '#server/common/helpers/auth/get-user-session.js'
import { createMockOidcServer } from '#modules/platform/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/common/helpers/auth/get-user-session.js'))

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

    test('should provide expected response with correct status', async () => {
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
          url: '/account'
        })

        const $ = load(result)

        expect($('h1').text()).toBe('Sites')
        expect($('title').text().trim()).toStrictEqual(
          expect.stringMatching(/^Account \|/)
        )
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

        // No authenticated welcome panel
        expect($('.govuk-panel--confirmation').text()).not.toContain('Welcome,')
      })
    })

    describe('when user is authenticated', () => {
      test('should render page with user welcome', async () => {
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
          url: '/account'
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
