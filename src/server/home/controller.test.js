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
        heading: 'Record reprocessed or exported packaging waste',
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

          const startButton = $('[data-testid="app-page-body"] .govuk-button')

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
          const startButton = $('[data-testid="app-page-body"] .govuk-button')

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
          const startButton = $('[data-testid="app-page-body"] .govuk-button')

          expect(startButton.attr('href')).toBe(organisationUrl)
        })
      }
    )

    describe('page content', () => {
      it('should render current functionality text with summary log link', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/start'
        })

        const $ = load(result)
        const pageBody = $('[data-testid="app-page-body"]')
        const summaryLogLink = pageBody.find('a[href*="summary-log"]')

        expect(pageBody.text()).toContain(
          'Currently, you can only use this service to upload your'
        )
        expect(summaryLogLink.text()).toBe('summary log')
        expect(summaryLogLink.attr('href')).toBe(
          'https://www.gov.uk/government/publications/summary-log-templates-for-uk-packaging-waste/recording-uk-packaging-waste-in-summary-logs-supplementary-guidance'
        )
      })

      it('should render first time user guidance with steps', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/start'
        })

        const $ = load(result)
        const steps = $('[data-testid="app-page-body"] ol li')

        expect(steps).toHaveLength(4)
        expect(steps.eq(0).find('h3').text()).toBe('GOV.UK One Login')
        expect(steps.eq(1).find('h3').text()).toBe('Defra account')
        expect(steps.eq(2).find('h3').text()).toBe('Digital service access')
        expect(steps.eq(3).find('h3').text()).toBe(
          'Linking your account to its registration'
        )
      })

      it('should render quick links section with two links', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/start'
        })

        const $ = load(result)
        const quickLinksHeading = $('.govuk-grid-column-one-third h2')
        const quickLinks = $('.govuk-grid-column-one-third ul li a')

        expect(quickLinksHeading.text()).toBe('Quick links')
        expect(quickLinks).toHaveLength(2)
        expect(quickLinks.eq(0).text()).toBe(
          'Apply for registration and accreditation'
        )
        expect(quickLinks.eq(1).text()).toBe(
          'Summary logs for UK packaging waste: an overview'
        )
      })

      it('should render quick links with correct GOV.UK URLs', async () => {
        vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
          ok: false
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/start'
        })

        const $ = load(result)
        const quickLinks = $('.govuk-grid-column-one-third ul li a')

        expect(quickLinks.eq(0).attr('href')).toBe(
          'https://www.gov.uk/guidance/packaging-waste-apply-for-registration-and-accreditation-as-a-reprocessor-or-exporter'
        )
        expect(quickLinks.eq(1).attr('href')).toBe(
          'https://www.gov.uk/guidance/summary-logs-for-uk-packaging-waste-an-overview'
        )
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
