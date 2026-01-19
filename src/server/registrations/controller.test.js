import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as fetchOrganisationModule from '#server/common/helpers/organisations/fetch-organisation-by-id.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByRole, getByText } from '@testing-library/dom'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }
import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)

const mockAuth = {
  strategy: 'session',
  credentials: {
    idToken: 'test-id-token',
    profile: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    }
  }
}

describe('#accreditationDashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('happy path - reprocessor', () => {
    it('should use the Site and Material in the page title', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('title').text()).toMatch(
        /^Manchester Glass Recycling Facility: Glass/
      )
    })

    it('should display accreditation dashboard for reprocessor', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toContain('Glass')
      expect($('.govuk-caption-xl').text()).toBe(
        'Manchester Glass Recycling Facility'
      )
    })

    it('should display registration and accreditation status tags', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('.govuk-tag--green').length).toBeGreaterThan(0)
      expect(result).toContain('Approved')
    })

    it('should display PRNs tile for reprocessor', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(result).toContain('PRNs')
      expect(result).toContain('PRN management is not yet available')
      expect(result).not.toContain('PERNs')
    })

    it('should display registration and accreditation numbers', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(result).toContain('REG001234')
      expect(result).toContain('ACC001234')
    })

    it('should display upload summary log link with registration ID', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      const uploadLink = $('a[href*="summary-logs/upload"]')

      expect(uploadLink).toHaveLength(1)
      expect(uploadLink.attr('href')).toContain(
        '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/summary-logs/upload'
      )
    })

    it('should display contact regulator link', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      const contactLink = $('main a[href*="contact"]')

      expect(contactLink).toHaveLength(1)
    })

    it('should display back link to reprocessing tab', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe(
        '/organisations/6507f1f77bcf86cd79943901'
      )
    })

    it('should display waste balance placeholder', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(result).toContain('Your waste balance is not yet available')
      expect(result).toContain(
        'It will be shown here when it becomes available'
      )
    })

    it('should apply epr-waste-balance-banner class to waste balance banner', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      const banner = $('.govuk-summary-card.epr-waste-balance-banner')

      expect(banner.length).toBeGreaterThan(0)
    })

    it('should use govuk-summary-card for task cards', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      // 4 task cards + 1 waste balance banner = 5 summary cards total
      const summaryCards = $('.govuk-summary-card')

      expect(summaryCards).toHaveLength(5)
    })

    it('should display all four task tiles', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(result).toContain('Summary log')
      expect(result).toContain('PRNs')
      expect(result).toContain('Reports')
      expect(result).toContain('Registration and accreditation')
    })
  })

  describe('happy path - exporter', () => {
    it('should display PERNs tile for exporter', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('PERNs')
      expect(result).toContain('PERN management is not yet available')
    })

    it('should display back link to exporting tab for exporter', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
        auth: mockAuth
      })

      const $ = load(result)

      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe(
        '/organisations/6507f1f77bcf86cd79943902/exporting'
      )
    })
  })

  describe('unhappy paths', () => {
    it('should return 403 when unauthorised access to an organisation is attempted', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(Boom.forbidden())

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/nonexistent-org/registrations/reg-001',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/nonexistent-acc',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should redirect to logged-out when not authenticated', async ({
      server
    }) => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved'
      })

      expect(statusCode).toBe(statusCodes.found)
      expect(headers.location).toBe('/logged-out')
    })
  })

  describe('edge cases', () => {
    it('should display Unknown site when site address is missing', async ({
      server
    }) => {
      const dataWithMissingSite = {
        ...fixtureData,
        accreditations: [],
        registrations: [
          {
            id: 'reg-no-site',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved'
          }
        ]
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMissingSite)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-no-site',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Unknown site')
    })

    it('should capitalize material name', async ({ server }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('h1').text().trim()).toMatch(/^[A-Z]/)
    })

    it('should handle suspended status with correct styling', async ({
      server
    }) => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-002-plastic-suspended',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('.govuk-tag--yellow').length).toBeGreaterThan(0)
      expect(result).toContain('Suspended')
    })
  })

  describe('packaging-recycling-notes aka prns', () => {
    beforeEach(() => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)
    })

    describe('when feature flag is disabled', () => {
      beforeAll(() => {
        config.set('featureFlags.prns', false)
      })

      afterAll(() => {
        config.reset('featureFlags.prns')
      })

      it('should display prn card with not available text', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const main = getByRole(body, 'main')
        const prnCard = getByText(main, 'PRNs').closest('.govuk-summary-card')

        expect(getByText(prnCard, 'PRNs')).toBeDefined()
        expect(
          getByText(prnCard, 'Raise, issue and manage PRNs.')
        ).toBeDefined()
        expect(
          getByText(prnCard, 'PRN management is not yet available.')
        ).toBeDefined()
      })
    })

    describe('when feature flag is enabled', () => {
      beforeAll(() => {
        config.set('featureFlags.prns', true)
      })

      afterAll(() => {
        config.reset('featureFlags.prns')
      })

      it('should display prn card with create new link', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const main = getByRole(body, 'main')
        const prnCard = getByText(main, 'PRNs').closest('.govuk-summary-card')

        expect(getByText(prnCard, 'PRNs')).toBeDefined()
        expect(
          getByText(prnCard, 'Raise, issue and manage PRNs.')
        ).toBeDefined()

        const link = getByRole(prnCard, 'link', { name: 'Create new PRN' })

        expect(link.getAttribute('href')).toBe('/prns/create')
      })
    })
  })
})
