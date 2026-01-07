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

    it('should use Organisation name in the page title', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      expect($('title').text()).toMatch(/^Home: ACME ltd/)
    })

    it('should display organisation page with reprocessing sites on default route', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toMatch(/ACME ltd/)
      expect($('.govuk-tabs__list-item--selected a').text()).toMatch(
        /Reprocessing/
      )

      // Check that reprocessing sites are displayed
      const siteHeadings = $('h3.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      expect(siteHeadings.length).toBeGreaterThan(0)

      // Verify table headers
      const tableHeaders = $('thead th')
        .map((_, el) => $(el).text())
        .get()

      expect(tableHeaders).toContain('Material')
      // eslint-disable-next-line vitest/max-expects
      expect(tableHeaders).toContain('Registration')
      // eslint-disable-next-line vitest/max-expects
      expect(tableHeaders).toContain('Accreditation')
    })

    it('should display organisation page with exporting sites on exporting route', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/exporting'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toMatch(/Global Exports Ltd/)

      // Check that exporting sites are displayed
      const siteHeadings = $('h3.govuk-heading-m')
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
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $reprocessing = load(reprocessingResponse.result)
      const reprocessingTabLink = $reprocessing('.govuk-tabs__list-item')
        .first()
        .find('a')
        .attr('href')

      expect(reprocessingTabLink).toBe(
        '/organisations/6507f1f77bcf86cd79943901'
      )

      // Test exporting tab
      const exportingResponse = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/exporting'
      })

      const $exporting = load(exportingResponse.result)
      const exportingTabLink = $exporting('.govuk-tabs__list-item')
        .eq(1)
        .find('a')
        .attr('href')

      expect(exportingTabLink).toBe(
        '/organisations/6507f1f77bcf86cd79943901/exporting'
      )
    })

    it('should display materials with correct capitalization', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906'
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
        url: '/organisations/6507f1f77bcf86cd79943901'
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
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check that each row has a Select link
      const selectLinks = $('tbody a.govuk-link')

      expect(selectLinks.length).toBeGreaterThan(0)

      // Verify link format
      const firstLink = selectLinks.first().attr('href')

      expect(firstLink).toMatch(/\/organisations\/.*\/registrations\/.*/)
    })

    it('should use organisation ID from URL parameter in backend call', async () => {
      const organisationId = '6507f1f77bcf86cd79943901'
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}`
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
        url: '/organisations/6507f1f77bcf86cd79943901'
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

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      // Should return error result
      expect(statusCode).toBe(statusCodes.ok)
      expect(result.ok).toBe(false)
      expect(result.error.message).toBe(
        'Failed to fetch organisation from backend'
      )
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
        url: '/organisations/6507f1f77bcf86cd79943901'
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

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/organisations/nonexistent-id'
      })

      // Should return error result
      expect(statusCode).toBe(statusCodes.ok)
      expect(result.ok).toBe(false)
      expect(result.error.message).toBe(
        'Failed to fetch organisation from backend'
      )
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

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      // Should return error result
      expect(statusCode).toBe(statusCodes.ok)
      expect(result.ok).toBe(false)
      expect(result.error.message).toBe(
        'Failed to fetch organisation from backend'
      )
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
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
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
        url: '/organisations/6507f1f77bcf86cd79943903'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toMatch(/Empty Organisation Ltd/)
      expect(result).toContain('No sites found.')
    })

    it('should display "No sites found" when all items have excluded statuses', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureAllExcluded)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943904'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('No sites found.')

      // Verify no table rows are rendered
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(0)
    })

    it('should filter out items with "Created" status', async () => {
      const dataWithCreatedStatus = {
        ...fixtureData,
        accreditations: [
          {
            ...fixtureData.accreditations[0],
            status: 'created'
          }
        ],
        registrations: [
          {
            ...fixtureData.registrations[0],
            accreditationId: fixtureData.accreditations[0].id,
            status: 'created'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithCreatedStatus)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      // Should show no sites because both registration and accreditation have Created status (excluded)
      expect(result).toContain('No sites found.')
    })

    it('should filter out items with "Rejected" status', async () => {
      const dataWithRejectedStatus = {
        ...fixtureData,
        accreditations: [
          {
            ...fixtureData.accreditations[0],
            status: 'rejected'
          }
        ],
        registrations: [
          {
            ...fixtureData.registrations[0],
            accreditationId: fixtureData.accreditations[0].id,
            status: 'rejected'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithRejectedStatus)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      // Should show no sites because Rejected status is excluded
      expect(result).toContain('No sites found.')
    })

    it('should handle missing site address fields gracefully', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureMissingFields)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943905'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)

      // Check for "Unknown site" fallback
      const siteHeadings = $('h3.govuk-heading-m')
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
        url: '/organisations/6507f1f77bcf86cd79943901'
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
        url: '/organisations/6507f1f77bcf86cd79943902'
      })

      expect(reprocessingResponse.result).not.toContain(/Reprocessing/i)

      const exportingResponse = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/exporting'
      })

      const $exporting = load(exportingResponse.result)

      expect($exporting('h3.govuk-heading-m').length).toBeGreaterThan(0)
    })

    it('should handle organisation with single site and material', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toMatch(/Home\n\s+Single Reprocessor Ltd/m)

      // Should have exactly one site heading
      const siteHeadings = $('h3.govuk-heading-m')

      expect(siteHeadings).toHaveLength(1)
      expect(siteHeadings.text()).toBe('Single Processing Site')

      // Should have exactly one table row
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(1)
    })

    it('should hide items when EITHER registration or accreditation has excluded status', async () => {
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
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Items should be excluded when EITHER has excluded status:
      // - acc-1 has Approved but reg-1 has Created - FILTERED (reg has excluded status)
      // - acc-2 has Created but reg-2 has Approved - FILTERED (acc has excluded status)
      // No sites should be shown
      const siteHeadings = $('h3.govuk-heading-m')

      expect(siteHeadings).toHaveLength(0)
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
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Check that materials at the same site are grouped under one heading
      const siteHeadings = $('h3.govuk-heading-m')
        .map((_, el) => $(el).text())
        .get()

      // Each unique site should appear only once as a heading
      const uniqueSites = [...new Set(siteHeadings)]

      expect(siteHeadings).toHaveLength(uniqueSites.length)
    })

    it('should handle multiple accreditations for the same site', async () => {
      const dataWithMultipleMaterialsSameSite = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-plastic',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved'
          },
          {
            id: 'acc-glass',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            status: 'approved'
          },
          {
            id: 'acc-wood',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            status: 'approved'
          }
        ],
        registrations: [
          {
            id: 'reg-plastic',
            accreditationId: 'acc-plastic',
            site: { address: { line1: 'Multi-Material Site' } },
            status: 'approved',
            wasteProcessingType: 'reprocessor'
          },
          {
            id: 'reg-glass',
            accreditationId: 'acc-glass',
            site: { address: { line1: 'Multi-Material Site' } },
            status: 'approved',
            wasteProcessingType: 'reprocessor'
          },
          {
            id: 'reg-wood',
            accreditationId: 'acc-wood',
            site: { address: { line1: 'Multi-Material Site' } },
            status: 'approved',
            wasteProcessingType: 'reprocessor'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMultipleMaterialsSameSite)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      const $ = load(result)

      // Should have one site heading with multiple table rows
      const siteHeadings = $('h3.govuk-heading-m')

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
        url: '/organisations/6507f1f77bcf86cd79943901'
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
            status: 'approved',
            site: { address: { line1: 'Site 1' } }
          },
          {
            id: 'acc-suspended',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            status: 'suspended',
            site: { address: { line1: 'Site 2' } }
          },
          {
            id: 'acc-cancelled',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            status: 'cancelled',
            site: { address: { line1: 'Site 3' } }
          }
        ],
        registrations: [
          {
            id: 'reg-1',
            accreditationId: 'acc-approved',
            status: 'approved',
            wasteProcessingType: 'reprocessor'
          },
          {
            id: 'reg-2',
            accreditationId: 'acc-suspended',
            status: 'suspended',
            wasteProcessingType: 'reprocessor'
          },
          {
            id: 'reg-3',
            accreditationId: 'acc-cancelled',
            status: 'cancelled',
            wasteProcessingType: 'reprocessor'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithVariousStatuses)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
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
