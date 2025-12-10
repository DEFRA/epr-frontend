import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

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

    it('should render page when no auth required', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: {
          organisations: {
            current: {
              id: 'defra-org-123',
              name: 'Test Organisation',
              relationshipId: 'rel-456'
            },
            linked: null,
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

    describe('when user has no unlinked organisations', () => {
      it('should render page with empty organisation list', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: true,
          value: {
            organisations: {
              current: {
                id: 'defra-org-123',
                name: 'My Defra Organisation',
                relationshipId: 'rel-456'
              },
              linked: null,
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

    describe('when user has unlinked organisations', () => {
      it('should render linking page with organisation radio buttons including companies house numbers', async () => {
        const mockUserSession = {
          displayName: 'John Doe',
          email: 'john.doe@example.com',
          userId: 'user-123',
          organisations: {
            current: {
              id: 'defra-org-123',
              name: 'My Defra Organisation',
              relationshipId: 'rel-456'
            },
            linked: null,
            unlinked: [
              {
                id: 'org-1',
                name: 'Test Company Ltd',
                orgId: '12345678'
              },
              {
                id: 'org-2',
                name: 'Another Company Ltd',
                orgId: '87654321'
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
        expect($('label').text()).toContain('Test Company Ltd (ID: 12345678)')
        expect($('label').text()).toContain(
          'Another Company Ltd (ID: 87654321)'
        )
        expect($('button[type="submit"]').text()).toContain('Confirm')
      })

      it('should display current Defra organisation name in heading', async () => {
        const mockUserSession = {
          organisations: {
            current: {
              id: 'defra-org-123',
              name: 'My Defra Organisation Name',
              relationshipId: 'rel-456'
            },
            linked: null,
            unlinked: [
              {
                id: 'org-1',
                name: 'Test Company Ltd',
                orgId: '12345678'
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

        expect($('h1.govuk-heading-l').text()).toContain(
          'My Defra Organisation Name'
        )
        expect($('legend.govuk-fieldset__legend--m').text()).toContain(
          'My Defra Organisation Name'
        )
      })

      it('should render multiple unlinked organisations with unique IDs', async () => {
        const mockUserSession = {
          organisations: {
            current: {
              id: 'defra-org-123',
              name: 'Current Org',
              relationshipId: 'rel-456'
            },
            linked: null,
            unlinked: [
              {
                id: 'org-1',
                name: 'First Company',
                orgId: 'FC111111'
              },
              {
                id: 'org-2',
                name: 'Second Company',
                orgId: 'SC222222'
              },
              {
                id: 'org-3',
                name: 'Third Company',
                orgId: 'TC333333'
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

        expect($('input[type="radio"][name="organisationId"]')).toHaveLength(3)
        expect($('label').text()).toContain('First Company (ID: FC111111)')
        expect($('label').text()).toContain('Second Company (ID: SC222222)')
        expect($('label').text()).toContain('Third Company (ID: TC333333)')
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
