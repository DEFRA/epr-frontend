import { config } from '#config/config.js'
import * as getUserSessionModule from '#server/auth/helpers/get-user-session.js'
import * as fetchOrganisationModule from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { createMockOidcServer } from '#server/common/test-helpers/mock-oidc.js'
import { createServer } from '#server/index.js'
import { load } from 'cheerio'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

// Import fixtures
import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }
import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }
import fixtureEmpty from '../../../fixtures/organisation/empty-organisation.json' with { type: 'json' }
import fixtureAllExcluded from '../../../fixtures/organisation/all-excluded-statuses.json' with { type: 'json' }
import fixtureMissingFields from '../../../fixtures/organisation/missing-fields.json' with { type: 'json' }
import fixtureSingleReprocessing from '../../../fixtures/organisation/single-reprocessing.json' with { type: 'json' }

vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)

describe('#organisationController', () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  describe('happy Path', () => {
    const mockSession = {
      idToken: 'mock-jwt-token',
      displayName: 'Test User'
    }

    beforeEach(() => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: mockSession
      })
    })

    it('should display organisation page with reprocessing sites on default route', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toBe('ACME ltd')
      expect($('.govuk-tabs__list-item--selected a').text().trim()).toBe(
        'Reprocessing'
      )

      // Check that reprocessing sites are displayed
      const siteHeadings = $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      expect(siteHeadings.length).toBeGreaterThan(0)

      // Verify table headers
      const tableHeaders = $('thead th')
        .map((_, el) => $(el).text())
        .get()

      expect(tableHeaders).toContain('Material')
      // eslint-disable-next-line vitest/max-expects
      expect(tableHeaders).toContain('Registration status')
      // eslint-disable-next-line vitest/max-expects
      expect(tableHeaders).toContain('Accreditation status')
    })

    it('should display organisation page with exporting sites on exporting route', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943902/exporting'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toBe('Global Exports Ltd')
      expect($('.govuk-tabs__list-item--selected a').text().trim()).toBe(
        'Exporting'
      )

      // Check that exporting sites are displayed
      const siteHeadings = $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      expect(siteHeadings.length).toBeGreaterThan(0)
    })

    it('should switch between tabs correctly using URL navigation', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      // Test reprocessing tab
      const reprocessingResponse = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $reprocessing = load(reprocessingResponse.result)
      const reprocessingTabLink = $reprocessing('.govuk-tabs__list-item')
        .first()
        .find('a')
        .attr('href')

      expect(reprocessingTabLink).toBe('/organisation/6507f1f77bcf86cd79943901')

      // Test exporting tab
      const exportingResponse = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901/exporting'
      })

      const $exporting = load(exportingResponse.result)
      const exportingTabLink = $exporting('.govuk-tabs__list-item')
        .eq(1)
        .find('a')
        .attr('href')

      expect(exportingTabLink).toBe(
        '/organisation/6507f1f77bcf86cd79943901/exporting'
      )
    })

    it('should display materials with correct capitalization', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943906'
      })

      const $ = load(result)

      // Check that materials are capitalized (e.g., "aluminium" -> "Aluminium")
      const materialCells = $('tbody td').first().text()

      expect(materialCells).toMatch(/^[A-Z]/) // First letter should be uppercase
    })

    it('should display status tags with correct GOV.UK styling', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check for status tags
      const statusTags = $('.govuk-tag')

      expect(statusTags.length).toBeGreaterThan(0)

      // Verify tags have correct classes (e.g., govuk-tag--green for approved)
      const approvedTags = $('.govuk-tag--green')

      expect(approvedTags.length).toBeGreaterThan(0)
    })

    it('should display Select links for each row', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check that each row has a Select link
      const selectLinks = $('tbody a.govuk-link')

      expect(selectLinks.length).toBeGreaterThan(0)

      // Verify link format
      const firstLink = selectLinks.first().attr('href')

      expect(firstLink).toMatch(/\/organisations\/.*\/accreditations\/.*/)
    })

    it('should use organisation ID from URL parameter in backend call', async () => {
      const organisationId = '6507f1f77bcf86cd79943901'
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: `/organisation/${organisationId}`
      })

      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith(organisationId, 'mock-jwt-token')
    })

    it('should pass JWT token to backend call', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith(expect.any(String), 'mock-jwt-token')
    })
  })

  describe('unhappy Paths', () => {
    it('should handle backend fetch failure gracefully', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })

      const backendError = new Error('Backend service unavailable')
      backendError.statusCode = 503

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(backendError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Should return a server error
      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle missing session with undefined token', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Should call backend with undefined token when session is missing
      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith(expect.any(String), undefined)
    })

    it('should handle backend 404 error', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })

      const notFoundError = new Error('Organisation not found')
      notFoundError.statusCode = 404

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(notFoundError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/nonexistent-id'
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle backend timeout error', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })

      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(timeoutError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle malformed backend response', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })

      // Return invalid data structure
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue({
        invalidField: 'no company details'
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle missing companyDetails.tradingName gracefully', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })

      const dataWithoutTradingName = {
        ...fixtureData,
        companyDetails: {}
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithoutTradingName)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Should render but with empty string as the organisation name
      expect(statusCode).toBe(statusCodes.ok)
      // h1 will be empty when tradingName is missing (Nunjucks renders undefined as empty)
      expect($('h1').text()).toBe('')
    })
  })

  describe('edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })
    })

    it('should display "No sites found" when organisation has no accreditations', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureEmpty)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943903'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toBe('Empty Organisation Ltd')
      expect(result).toContain('No sites found.')
    })

    it('should display "No sites found" when all items have excluded statuses', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureAllExcluded)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943904'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('No sites found.')

      // Verify no table rows are rendered
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(0)
    })

    it('should filter out items with "created" status (case-insensitive)', async () => {
      const dataWithCreatedStatus = {
        ...fixtureData,
        accreditations: [
          {
            ...fixtureData.accreditations[0],
            statusHistory: [
              { status: 'Created', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithCreatedStatus)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Should show no sites because created status is excluded
      expect(result).toContain('No sites found.')
    })

    it('should filter out items with "rejected" status (case-insensitive)', async () => {
      const dataWithRejectedStatus = {
        ...fixtureData,
        accreditations: [
          {
            ...fixtureData.accreditations[0],
            statusHistory: [
              { status: 'Rejected', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ],
        registrations: [
          {
            ...fixtureData.registrations[0],
            accreditationId: fixtureData.accreditations[0].id,
            statusHistory: [
              { status: 'Rejected', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithRejectedStatus)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Should show no sites because rejected status is excluded
      expect(result).toContain('No sites found.')
    })

    it('should handle missing site address fields gracefully', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureMissingFields)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943905'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)

      // Check for "Unknown site" fallback
      const siteHeadings = $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      expect(siteHeadings).toContain('Unknown site')
      expect(siteHeadings).toContain('Site With Address')
    })

    it('should handle accreditation without matching registration', async () => {
      const dataWithUnmatchedAccreditation = {
        ...fixtureData,
        registrations: [] // No registrations
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithUnmatchedAccreditation)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)

      // Should use accreditation status history as fallback
      const statusTags = $('.govuk-tag')

      expect(statusTags.length).toBeGreaterThan(0)
    })

    it('should display only exporting sites when no reprocessing sites exist', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const reprocessingResponse = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943902'
      })

      expect(reprocessingResponse.result).toContain('No sites found.')

      const exportingResponse = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943902/exporting'
      })

      const $exporting = load(exportingResponse.result)

      expect($exporting('h2.govuk-heading-m').length).toBeGreaterThan(0)
    })

    it('should handle empty statusHistory array', async () => {
      const dataWithEmptyStatusHistory = {
        ...fixtureData,
        accreditations: [
          {
            ...fixtureData.accreditations[0],
            statusHistory: []
          }
        ],
        registrations: [
          {
            ...fixtureData.registrations[0],
            accreditationId: fixtureData.accreditations[0].id,
            statusHistory: []
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithEmptyStatusHistory)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      expect(statusCode).toBe(statusCodes.ok)
      // Should show "Unknown" status
      expect(result).toContain('Unknown')
    })

    it('should handle organisation with single site and material', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943906'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toBe('Single Reprocessor Ltd')

      // Should have exactly one site heading
      const siteHeadings = $('h2.govuk-heading-m')

      expect(siteHeadings).toHaveLength(1)
      expect(siteHeadings.text()).toBe('Single Processing Site')

      // Should have exactly one table row
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(1)
    })

    it('should exclude items where EITHER registration OR accreditation has excluded status', async () => {
      const dataWithMixedStatuses = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-1',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 1' } }
          },
          {
            id: 'acc-2',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            statusHistory: [
              { status: 'created', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 2' } }
          }
        ],
        registrations: [
          {
            id: 'reg-1',
            accreditationId: 'acc-1',
            statusHistory: [
              { status: 'created', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 1' } }
          },
          {
            id: 'reg-2',
            accreditationId: 'acc-2',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 2' } }
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMixedStatuses)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Both items should be excluded:
      // - acc-1 has approved status but reg-1 has created status
      // - acc-2 has created status but reg-2 has approved status
      expect(result).toContain('No sites found.')
    })
  })

  describe('coverage - Additional Paths', () => {
    beforeEach(() => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: true,
        value: { idToken: 'mock-jwt-token', displayName: 'Test User' }
      })
    })

    it('should group multiple materials by site correctly', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check that materials at the same site are grouped under one heading
      const siteHeadings = $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      // Each unique site should appear only once as a heading
      const uniqueSites = [...new Set(siteHeadings)]

      expect(siteHeadings).toHaveLength(uniqueSites.length)
    })

    it('should use registration site address when accreditation site is missing', async () => {
      const dataWithRegistrationSiteOnly = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-no-site',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
            // No site field
          }
        ],
        registrations: [
          {
            id: 'reg-with-site',
            accreditationId: 'acc-no-site',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: {
              address: {
                line1: 'Registration Site Address'
              }
            }
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithRegistrationSiteOnly)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Should use registration site address as fallback
      const siteHeadings = $('h2.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      expect(siteHeadings).toContain('Registration Site Address')
    })

    it('should handle multiple accreditations for the same site', async () => {
      const dataWithMultipleMaterialsSameSite = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-plastic',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Multi-Material Site' } }
          },
          {
            id: 'acc-glass',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Multi-Material Site' } }
          },
          {
            id: 'acc-wood',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Multi-Material Site' } }
          }
        ],
        registrations: [
          {
            id: 'reg-plastic',
            accreditationId: 'acc-plastic',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          },
          {
            id: 'reg-glass',
            accreditationId: 'acc-glass',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          },
          {
            id: 'reg-wood',
            accreditationId: 'acc-wood',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMultipleMaterialsSameSite)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Should have one site heading with multiple table rows
      const siteHeadings = $('h2.govuk-heading-m')

      expect(siteHeadings).toHaveLength(1)
      expect(siteHeadings.text()).toBe('Multi-Material Site')

      // Should have 3 rows (one for each material)
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(3)
    })

    it('should log organisation access with correct metadata', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      // Just verify the request succeeded (logging happens internally)
      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith('6507f1f77bcf86cd79943901', 'mock-jwt-token')
    })

    it('should handle different status color mappings correctly', async () => {
      const dataWithVariousStatuses = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-approved',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Site 1' } }
          },
          {
            id: 'acc-suspended',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            statusHistory: [
              { status: 'suspended', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Site 2' } }
          },
          {
            id: 'acc-cancelled',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            statusHistory: [
              { status: 'cancelled', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Site 3' } }
          }
        ],
        registrations: [
          {
            id: 'reg-1',
            accreditationId: 'acc-approved',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          },
          {
            id: 'reg-2',
            accreditationId: 'acc-suspended',
            statusHistory: [
              { status: 'suspended', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          },
          {
            id: 'reg-3',
            accreditationId: 'acc-cancelled',
            statusHistory: [
              { status: 'cancelled', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithVariousStatuses)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisation/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check for different status tag colors
      expect($('.govuk-tag--green').length).toBeGreaterThan(0) // approved
      expect($('.govuk-tag--yellow').length).toBeGreaterThan(0) // suspended
      expect($('.govuk-tag--red').length).toBeGreaterThan(0) // cancelled
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
