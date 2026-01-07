import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createOidcHandlers } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

vi.mock(import('#server/auth/helpers/get-user-session.js'))

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
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/start'
      })

      const $ = load(result)

      // Login link should not exist
      const loginLink = $('#login-link')

      expect(loginLink).toHaveLength(0)

      expect(result).toStrictEqual(expect.stringContaining('Home |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should redirect from / to /start', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/start')
    })

    it('should redirect from /cy to /cy/start', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/cy'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/cy/start')
    })
  })

  describe('when auth is enabled', () => {
    /** @type {Server} */
    let server
    const mswServer = setupServer(...createOidcHandlers('http://defra-id.auth'))
    const backendUrl = config.get('eprBackendUrl')

    beforeAll(async () => {
      mswServer.listen()
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

    afterEach(() => {
      mswServer.resetHandlers()
    })

    afterAll(async () => {
      config.reset('defraId.clientId')
      config.reset('defraId.clientSecret')
      config.reset('defraId.oidcConfigurationUrl')
      config.reset('defraId.serviceId')
      mswServer.close()
      await server.stop({ timeout: 0 })
    })

    describe.each([
      {
        heading: 'Rheoli eich cyfrifoldebau gwastraff pecynnu',
        lang: 'cy',
        loginUrl: '/cy/login',
        startNow: 'Dechreuwch nawr',
        title: 'Hafan',
        url: '/cy/start'
      },
      {
        heading: 'Manage your packaging waste responsibilities',
        lang: 'en',
        loginUrl: '/login',
        startNow: 'Start now',
        title: 'Home',
        url: '/start'
      }
    ])(
      'when user is not authenticated (lang: $lang)',
      ({ heading, loginUrl, startNow, title, url }) => {
        it('should provide expected response with correct status', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
            ok: false
          })

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

        it('should render page with login link', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
            ok: false
          })

          const { result } = await server.inject({
            method: 'GET',
            url
          })

          const $ = load(result)

          // Page structure
          expect($('[data-testid="app-page-body"]')).toHaveLength(1)
          expect($('h1').text()).toBe(heading)

          const startButton = $('[data-testid="app-page-body"] a')

          expect(startButton.text().trim()).toBe(startNow)
          expect(startButton.attr('href')).toBe(loginUrl)
        })
      }
    )

    describe.each([
      {
        lang: 'cy',
        accountLinkingUrl: '/cy/account/linking',
        url: '/cy/start'
      },
      {
        lang: 'en',
        accountLinkingUrl: '/account/linking',
        url: '/start'
      }
    ])(
      'when user is authenticated but not linked (lang: $lang)',
      ({ accountLinkingUrl, url }) => {
        it('should render page with account linking link', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
            ok: true,
            value: {
              idToken: 'mock-id-token'
            }
          })

          mswServer.use(
            http.get(`${backendUrl}/v1/me/organisations`, () => {
              return HttpResponse.json({
                organisations: {
                  current: {
                    id: 'defra-org-123',
                    name: 'Test Organisation'
                  },
                  linked: null,
                  unlinked: [{ id: 'org-1', name: 'Org One', orgId: 'epr-1' }]
                }
              })
            })
          )

          const { result } = await server.inject({
            method: 'GET',
            url
          })

          const $ = load(result)
          const startButton = $('[data-testid="app-page-body"] a')

          expect(startButton.attr('href')).toBe(accountLinkingUrl)
        })
      }
    )

    describe.each([
      {
        lang: 'cy',
        organisationUrl: '/cy/organisations/linked-org-123',
        url: '/cy/start'
      },
      {
        lang: 'en',
        organisationUrl: '/organisations/linked-org-123',
        url: '/start'
      }
    ])(
      'when user is authenticated and linked (lang: $lang)',
      ({ organisationUrl, url }) => {
        it('should render page with organisation home link', async () => {
          vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
            ok: true,
            value: {
              idToken: 'mock-id-token'
            }
          })

          mswServer.use(
            http.get(`${backendUrl}/v1/me/organisations`, () => {
              return HttpResponse.json({
                organisations: {
                  current: {
                    id: 'defra-org-123',
                    name: 'Test Organisation'
                  },
                  linked: {
                    id: 'linked-org-123',
                    name: 'Linked Organisation',
                    linkedBy: { email: 'test@example.com', id: 'user-1' },
                    linkedAt: '2024-01-01T00:00:00Z'
                  },
                  unlinked: []
                }
              })
            })
          )

          const { result } = await server.inject({
            method: 'GET',
            url
          })

          const $ = load(result)
          const startButton = $('[data-testid="app-page-body"] a')

          expect(startButton.attr('href')).toBe(organisationUrl)
        })
      }
    )
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
