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

import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }
import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }

vi.mock(import('#server/auth/helpers/get-user-session.js'))
vi.mock(
  import('#server/common/helpers/organisations/fetch-organisation-by-id.js')
)

describe('#accreditationDashboardController', () => {
  /** @type {Server} */
  let server
  const mockOidcServer = createMockOidcServer('http://defra-id.auth')

  const mockSession = {
    idToken: 'mock-jwt-token',
    displayName: 'Test User'
  }

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
    vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
      ok: true,
      value: mockSession
    })
  })

  afterAll(async () => {
    config.reset('defraId.clientId')
    config.reset('defraId.clientSecret')
    config.reset('defraId.oidcConfigurationUrl')
    config.reset('defraId.serviceId')
    mockOidcServer.close()
    await server.stop({ timeout: 0 })
  })

  describe('happy path - reprocessor', () => {
    it('should display accreditation dashboard for reprocessor', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toContain('Glass')
      expect($('.govuk-caption-xl').text()).toBe(
        'Manchester Glass Recycling Facility'
      )
    })

    it('should display registration and accreditation status tags', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      expect($('.govuk-tag--green').length).toBeGreaterThan(0)
      expect(result).toContain('Approved')
    })

    it('should display PRNs tile for reprocessor', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      expect(result).toContain('PRNs')
      expect(result).toContain('PRN management is not yet available')
      expect(result).not.toContain('PERNs')
    })

    it('should display registration and accreditation numbers', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      expect(result).toContain('CBDU001234')
      expect(result).toContain('ACC001234')
    })

    it('should display upload summary log link with registration ID', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      const uploadLink = $('a[href*="summary-logs/upload"]')

      expect(uploadLink).toHaveLength(1)
      expect(uploadLink.attr('href')).toContain(
        '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/summary-logs/upload'
      )
    })

    it('should display contact regulator link', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      const contactLink = $('main a[href*="contact"]')

      expect(contactLink).toHaveLength(1)
    })

    it('should display back link to reprocessing tab', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe(
        '/organisations/6507f1f77bcf86cd79943901'
      )
    })

    it('should display waste balance placeholder', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      expect(result).toContain('Your waste balance is not yet available')
      expect(result).toContain(
        'It will be shown here when it becomes available'
      )
    })

    it('should apply epr-waste-balance-banner class to waste balance banner', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      const banner = $('.govuk-summary-card.epr-waste-balance-banner')

      expect(banner.length).toBeGreaterThan(0)
    })

    it('should use govuk-summary-card for task cards', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      // 4 task cards + 1 waste balance banner = 5 summary cards total
      const summaryCards = $('.govuk-summary-card')

      expect(summaryCards.length).toBe(5)
    })

    it('should display all four task tiles', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      expect(result).toContain('Summary log')
      expect(result).toContain('PRNs')
      expect(result).toContain('Reports')
      expect(result).toContain('Registration and accreditation')
    })
  })

  describe('happy path - exporter', () => {
    it('should display PERNs tile for exporter', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/accreditations/acc-export-001-plastic-approved'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('PERNs')
      expect(result).toContain('PERN management is not yet available')
    })

    it('should display back link to exporting tab for exporter', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureExportingOnly)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/accreditations/acc-export-001-plastic-approved'
      })

      const $ = load(result)

      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe(
        '/organisations/6507f1f77bcf86cd79943902/exporting'
      )
    })
  })

  describe('unhappy paths', () => {
    it('should return 404 when organisation not found', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockRejectedValue(new Error('Not found'))

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/nonexistent-org/accreditations/acc-001'
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 when accreditation not found', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/nonexistent-acc'
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should handle missing session gracefully', async () => {
      vi.mocked(getUserSessionModule.getUserSession).mockResolvedValue({
        ok: false
      })

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(
        fetchOrganisationModule.fetchOrganisationById
      ).toHaveBeenCalledWith('6507f1f77bcf86cd79943901', undefined)
    })
  })

  describe('edge cases', () => {
    it('should display Unknown site when site address is missing', async () => {
      const dataWithMissingSite = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-no-site',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ],
        registrations: []
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMissingSite)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-no-site'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Unknown site')
    })

    it('should handle missing registration for accreditation', async () => {
      const dataWithNoRegistration = {
        ...fixtureData,
        registrations: []
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithNoRegistration)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toContain('CBDU001234')

      const uploadLink = $('a[href*="summary-logs/upload"]')

      expect(uploadLink).toHaveLength(0)
    })

    it('should capitalize material name', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-001-glass-approved'
      })

      const $ = load(result)

      expect($('h1').text().trim()).toMatch(/^[A-Z]/)
    })

    it('should use registration site when accreditation site is missing', async () => {
      const dataWithRegistrationSiteOnly = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-no-site',
            wasteProcessingType: 'reprocessor',
            material: 'wood',
            status: 'approved',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ]
          }
        ],
        registrations: [
          {
            id: 'reg-with-site',
            accreditationId: 'acc-no-site',
            cbduNumber: 'CBDU123456',
            status: 'approved',
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
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-no-site'
      })

      expect(result).toContain('Registration Site Address')
    })

    it('should handle empty statusHistory array', async () => {
      const dataWithEmptyStatusHistory = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-empty-status',
            wasteProcessingType: 'reprocessor',
            material: 'glass',
            status: 'created',
            statusHistory: [],
            site: { address: { line1: 'Test Site' } }
          }
        ],
        registrations: []
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithEmptyStatusHistory)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-empty-status'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should handle missing material gracefully', async () => {
      const dataWithMissingMaterial = {
        ...fixtureData,
        accreditations: [
          {
            id: 'acc-no-material',
            wasteProcessingType: 'reprocessor',
            material: '',
            status: 'approved',
            statusHistory: [
              { status: 'approved', updatedAt: '2025-08-20T19:34:44.944Z' }
            ],
            site: { address: { line1: 'Test Site' } }
          }
        ],
        registrations: []
      }

      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(dataWithMissingMaterial)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-no-material'
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should handle suspended status with correct styling', async () => {
      vi.mocked(
        fetchOrganisationModule.fetchOrganisationById
      ).mockResolvedValue(fixtureData)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/accreditations/acc-002-plastic-suspended'
      })

      const $ = load(result)

      expect($('.govuk-tag--yellow').length).toBeGreaterThan(0)
      expect(result).toContain('Suspended')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
