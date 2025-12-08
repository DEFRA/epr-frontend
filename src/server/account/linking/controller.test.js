import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

describe('#accountLinkingController', () => {
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

    test('should render page when no auth required', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          organisations: {
            unlinked: []
          }
        }
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/account/linking'
      })

      expect(result).toStrictEqual(
        expect.stringContaining('Registration Linking |')
      )
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

    describe('when user has no organisations', () => {
      test('should render page with empty organisation list', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: true,
          value: {
            organisations: {
              unlinked: []
            }
          }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/account/linking'
        })

        const $ = load(result)

        expect($('title').text().trim()).toStrictEqual(
          expect.stringMatching(/^Registration Linking \|/)
        )
        expect($('input[type="radio"]')).toHaveLength(0)
        expect(statusCode).toBe(statusCodes.ok)
      })
    })

    describe('when user is authenticated', () => {
      test('should render linking page with organisation radio buttons', async () => {
        const mockUserSession = {
          displayName: 'John Doe',
          email: 'john.doe@example.com',
          userId: 'user-123',
          organisations: {
            unlinked: [
              {
                id: 'org-1',
                companyDetails: {
                  tradingName: 'Test Company Ltd'
                }
              },
              {
                id: 'org-2',
                companyDetails: {
                  tradingName: 'Another Company Ltd'
                }
              }
            ]
          }
        }

        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: true,
          value: mockUserSession
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/account/linking'
        })

        const $ = load(result)

        expect($('h1').first().text()).toContain('Link')
        expect($('input[type="radio"][name="organisationId"]')).toHaveLength(2)
        expect($('label').text()).toContain('Test Company Ltd')
        expect($('label').text()).toContain('Another Company Ltd')
        expect($('button[type="submit"]').text()).toContain('Confirm')
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
