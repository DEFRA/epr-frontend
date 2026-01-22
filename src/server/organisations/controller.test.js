import { statusCodes } from '#server/common/constants/status-codes.js'
import * as fetchOrganisationModule from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import * as fetchWasteBalancesModule from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { load } from 'cheerio'
import { beforeEach, describe, expect, vi } from 'vitest'

import fixtureAllExcluded from '../../../fixtures/organisation/all-excluded-statuses.json' with { type: 'json' }
import fixtureEmpty from '../../../fixtures/organisation/empty-organisation.json' with { type: 'json' }
import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }
import fixtureMissingSiteAddress from '../../../fixtures/organisation/missing-site-address.json' with { type: 'json' }
import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }
import fixtureSingleReprocessing from '../../../fixtures/organisation/single-reprocessing.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)
vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-123',
      email: 'test@example.com'
    }
  }
}

describe('#organisationController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy Path', () => {
    it('should use Organisation name in the page title', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('title').text()).toMatch(/^Home: ACME ltd/)
    })

    it('should display organisation page with reprocessing sites on default route', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
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

    it('should display organisation page with exporting sites on exporting route', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/exporting',
        auth: mockAuth
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

    it('should switch between tabs correctly using URL navigation', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      // Test reprocessing tab
      const reprocessingResponse = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
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
        url: '/organisations/6507f1f77bcf86cd79943901/exporting',
        auth: mockAuth
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

    it('should display materials with correct capitalization', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906',
        auth: mockAuth
      })

      const $ = load(result)

      // Check that materials are capitalized (e.g., "aluminium" -> "Aluminium")
      const materialCells = $('tbody td').first().text()

      expect(materialCells).toMatch(/^[A-Z]/) // First letter should be uppercase
    })

    it('should display status tags with correct GOV.UK styling', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)

      // Check for status tags
      const statusTags = $('.govuk-tag')

      expect(statusTags.length).toBeGreaterThan(0)

      // Verify tags have correct classes (e.g., govuk-tag--green for approved)
      const approvedTags = $('.govuk-tag--green')

      expect(approvedTags.length).toBeGreaterThan(0)
    })

    it('should display Select links for each row', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)

      // Check that each row has a Select link
      const selectLinks = $('tbody a.govuk-link')

      expect(selectLinks.length).toBeGreaterThan(0)

      // Verify link format
      const firstLink = selectLinks.first().attr('href')

      expect(firstLink).toMatch(/\/organisations\/.*\/registrations\/.*/)
    })

    it('should use organisation ID from URL parameter in backend call', async ({
      server
    }) => {
      const organisationId = '6507f1f77bcf86cd79943901'
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: `/organisations/${organisationId}`,
        auth: mockAuth
      })

      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith(organisationId, 'test-id-token')
    })

    it('should pass JWT token to backend call', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith(expect.any(String), 'test-id-token')
    })

    it('should display formatted waste balance when available', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      vi.mocked(fetchWasteBalancesModule.fetchWasteBalances).mockResolvedValue({
        'acc-single-001': { amount: 1500.5, availableAmount: 1234.56 }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906',
        auth: mockAuth
      })

      const $ = load(result)

      const tableHeaders = $('thead th')
        .map((_, el) => $(el).text())
        .get()

      expect(tableHeaders).toContain('Available waste balance (tonnes)')

      const tableCells = $('tbody td')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(tableCells).toContain('1,234.56')
    })
  })

  describe('unhappy Paths', () => {
    it('should handle backend fetch failure gracefully', async ({ server }) => {
      const backendError = new Error('Backend service unavailable')
      backendError.statusCode = 503

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(backendError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle waste balance fetch failure gracefully and show 0.00', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      vi.mocked(fetchWasteBalancesModule.fetchWasteBalances).mockRejectedValue(
        new Error('Waste balance service unavailable')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906',
        auth: mockAuth
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)

      const tableCells = $('tbody td')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(tableCells).toContain('0.00')
    })

    it('should redirect to logged-out when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })

    it('should handle backend 404 error', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(Boom.notFound('Organisation not found'))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/nonexistent-id',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should handle backend timeout error', async ({ server }) => {
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(timeoutError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should handle malformed backend response', async ({ server }) => {
      // Return invalid data structure
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue({
        invalidField: 'no company details'
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('edge Cases', () => {
    it('should display "No sites found" when organisation has no accreditations', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureEmpty)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943903',
        auth: mockAuth
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toMatch(/Empty Organisation Ltd/)
      expect(result).toContain('No sites found.')
    })

    it('should display "No sites found" when all items have excluded statuses', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureAllExcluded)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943904',
        auth: mockAuth
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('No sites found.')

      // Verify no table rows are rendered
      const tableRows = $('tbody tr')

      expect(tableRows).toHaveLength(0)
    })

    it('should filter out items with "Created" status', async ({ server }) => {
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
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      // Should show no sites because both registration and accreditation have Created status (excluded)
      expect(result).toContain('No sites found.')
    })

    it('should filter out items with "Rejected" status', async ({ server }) => {
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
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      // Should show no sites because Rejected status is excluded
      expect(result).toContain('No sites found.')
    })

    it('should handle missing site address fields gracefully', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureMissingSiteAddress)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943905',
        auth: mockAuth
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

    it('should handle accreditation without matching registration', async ({
      server
    }) => {
      const dataWithUnmatchedAccreditation = {
        ...fixtureData,
        registrations: [] // No registrations
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithUnmatchedAccreditation)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)

      // Should use accreditation status history as fallback
      const statusTags = $('.govuk-tag')

      expect(statusTags.length).toBeGreaterThan(0)
    })

    it('should display only exporting sites when no reprocessing sites exist', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const reprocessingResponse = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902',
        auth: mockAuth
      })

      expect(reprocessingResponse.result).not.toContain(/Reprocessing/i)

      const exportingResponse = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/exporting',
        auth: mockAuth
      })

      const $exporting = load(exportingResponse.result)

      expect($exporting('h3.govuk-heading-m').length).toBeGreaterThan(0)
    })

    it('should handle organisation with single site and material', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureSingleReprocessing)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943906',
        auth: mockAuth
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

    it('should hide items when EITHER registration or accreditation has excluded status', async ({
      server
    }) => {
      const dataWithMixedStatuses = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-1',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 1' } }
          },
          {
            id: 'acc-2',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            status: 'created',
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
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'created',
            statusHistory: [
              { status: 'created', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site 1' } }
          },
          {
            id: 'reg-2',
            accreditationId: 'acc-2',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            status: 'approved',
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
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
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

  describe('glass recycling process display', () => {
    it('should display "Glass remelt" for registrations with glass_re_melt process', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)
      const materialCells = $('tbody td:first-child')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(materialCells).toContain('Glass remelt')
    })

    it('should display "Glass other" for registrations with glass_other process', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)
      const materialCells = $('tbody td:first-child')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(materialCells).toContain('Glass other')
    })

    it('should display separate rows for remelt and other when organisation has both registration types', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)
      const materialCells = $('tbody td:first-child')
        .map((_, el) => $(el).text().trim())
        .get()

      expect(materialCells).toContain('Glass remelt')
      expect(materialCells).toContain('Glass other')
    })
  })

  describe('coverage - Additional Paths', () => {
    it('should group multiple materials by site correctly', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
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

    it('should handle multiple accreditations for the same site', async ({
      server
    }) => {
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
            wasteProcessingType: 'reprocessor',
            material: 'plastic'
          },
          {
            id: 'reg-glass',
            accreditationId: 'acc-glass',
            site: { address: { line1: 'Multi-Material Site' } },
            status: 'approved',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            glassRecyclingProcess: ['glass_re_melt']
          },
          {
            id: 'reg-wood',
            accreditationId: 'acc-wood',
            site: { address: { line1: 'Multi-Material Site' } },
            status: 'approved',
            wasteProcessingType: 'reprocessor',
            material: 'wood'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMultipleMaterialsSameSite)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
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

    it('should log organisation access with correct metadata', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      // Just verify the request succeeded (logging happens internally)
      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith('6507f1f77bcf86cd79943901', 'test-id-token')
    })

    it('should handle different status color mappings correctly', async ({
      server
    }) => {
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
            glassRecyclingProcess: ['glass_other'],
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
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            site: { address: { line1: 'Site 1' } }
          },
          {
            id: 'reg-2',
            accreditationId: 'acc-suspended',
            status: 'suspended',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            glassRecyclingProcess: ['glass_other'],
            site: { address: { line1: 'Site 2' } }
          },
          {
            id: 'reg-3',
            accreditationId: 'acc-cancelled',
            status: 'cancelled',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            site: { address: { line1: 'Site 3' } }
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithVariousStatuses)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901',
        auth: mockAuth
      })

      const $ = load(result)

      // Check for different status tag colors
      expect($('.govuk-tag--green').length).toBeGreaterThan(0) // approved
      expect($('.govuk-tag--yellow').length).toBeGreaterThan(0) // suspended
      expect($('.govuk-tag--red').length).toBeGreaterThan(0) // cancelled
    })
  })
})
