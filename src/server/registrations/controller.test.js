import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import * as getRequiredRegistrationModule from '#server/common/helpers/organisations/get-required-registration-with-accreditation.js'
import * as fetchWasteBalancesModule from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import { getByRole, within } from '@testing-library/dom'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }
import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/get-required-registration-with-accreditation.js')
)

vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

function findRegistrationAndAccreditation(fixture, registrationId) {
  const registration = fixture.registrations.find(
    ({ id }) => id === registrationId
  )
  const accreditation = fixture.accreditations?.find(
    ({ id }) => id === registration?.accreditationId
  )
  return { registration, accreditation }
}

const glassApproved = findRegistrationAndAccreditation(
  fixtureData,
  'reg-001-glass-approved'
)
const glassOtherApproved = findRegistrationAndAccreditation(
  fixtureData,
  'reg-001b-glass-other-approved'
)
const plasticSuspended = findRegistrationAndAccreditation(
  fixtureData,
  'reg-002-plastic-suspended'
)
const exporterPlasticApproved = findRegistrationAndAccreditation(
  fixtureExportingOnly,
  'reg-export-001-plastic-approved'
)

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

describe('#accreditationDashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchWasteBalancesModule.fetchWasteBalances).mockResolvedValue({})
  })

  describe('happy path - reprocessor', () => {
    it('should use the Site and Material in the page title', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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

    it('should display all four task tiles', async ({ server }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(exporterPlasticApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(exporterPlasticApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockRejectedValue(Boom.notFound('Registration not found'))

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

  describe('glass recycling process display', () => {
    it('should display "Glass remelt" in page title for glass_re_melt registration', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('title').text()).toMatch(/Glass remelt/)
    })

    it('should display "Glass remelt" in heading for glass_re_melt registration', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('h1').text()).toContain('Glass remelt')
    })

    it('should display "Glass other" in page title for glass_other registration', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassOtherApproved)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001b-glass-other-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('title').text()).toMatch(/Glass other/)
    })

    it('should display "Glass other" in heading for glass_other registration', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassOtherApproved)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001b-glass-other-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('h1').text()).toContain('Glass other')
    })
  })

  describe('edge cases', () => {
    it('should display Unknown site when site address is missing', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue({
        registration: {
          id: 'reg-no-site',
          wasteProcessingType: 'reprocessor',
          material: 'plastic',
          status: 'approved'
        },
        accreditation: undefined
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-no-site',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Unknown site')
    })

    it('should capitalise material name', async ({ server }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(plasticSuspended)

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

  describe('waste balance', () => {
    it('should display zero balance when no waste balance data is available', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(result)

      expect($('[data-testid="waste-balance-amount"]').text()).toContain('0.00')
      expect($('[data-testid="waste-balance-amount"]').text()).toContain(
        'tonnes'
      )
    })

    it('should apply epr-waste-balance-banner class to waste balance banner', async ({
      server
    }) => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)

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

    describe('waste balance display', () => {
      it('should display formatted waste balance for reprocessor with PRNs text', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({
          'acc-001-glass-approved': { amount: 1500, availableAmount: 1030.45 }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '1,030.45'
        )
        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          'tonnes'
        )
        expect($('[data-testid="waste-balance-subtitle"]').text()).toContain(
          'Available waste balance'
        )
        expect($('[data-testid="waste-balance-explanation"]').text()).toContain(
          'PRNs'
        )
        expect(
          $('[data-testid="waste-balance-explanation"]').text()
        ).not.toContain('PERNs')
      })

      it('should display PERNs text for exporter with waste balance', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(exporterPlasticApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({
          'acc-export-001-plastic-approved': {
            amount: 500,
            availableAmount: 250.75
          }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
          auth: mockAuth
        })

        const $ = load(result)

        expect($('[data-testid="waste-balance-explanation"]').text()).toContain(
          'PERNs'
        )
        expect(
          $('[data-testid="waste-balance-explanation"]').text()
        ).not.toContain('PRNs')
      })

      it('should display zero balance when waste balance fetch fails', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockRejectedValue(new Error('Service unavailable'))

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          'tonnes'
        )
      })

      it('should call fetchWasteBalances with correct parameters', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({})

        await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        expect(
          fetchWasteBalancesModule.fetchWasteBalances
        ).toHaveBeenCalledWith(
          '6507f1f77bcf86cd79943901',
          ['acc-001-glass-approved'],
          'test-id-token'
        )
      })

      it('should not call fetchWasteBalances when registration has no accreditationId', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue({
          registration: {
            id: 'reg-no-accreditation',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved',
            site: { address: { line1: 'Test Site' } }
          },
          accreditation: { id: 'some-acc', status: 'approved' }
        })

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-no-accreditation',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(
          fetchWasteBalancesModule.fetchWasteBalances
        ).not.toHaveBeenCalled()

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
      })

      it('should display zero balance correctly', async ({ server }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({
          'acc-001-glass-approved': { amount: 0, availableAmount: 0 }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          'tonnes'
        )
      })

      it('should format large balance with thousands separator', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({
          'acc-001-glass-approved': { amount: 15000, availableAmount: 12345.67 }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '12,345.67'
        )
      })

      it('should display zero balance when API returns empty object', async ({
        server
      }) => {
        vi.mocked(
          getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
        ).mockResolvedValue(glassApproved)
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({})

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const $ = load(result)

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          'tonnes'
        )
      })
    })
  })

  describe('packaging-recycling-notes', () => {
    beforeEach(() => {
      vi.mocked(
        getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
      ).mockResolvedValue(glassApproved)
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

        const prnCard = getByRole(body, 'heading', {
          name: 'PRNs',
          level: 3
        }).closest('.govuk-summary-card')

        const card = within(prnCard)
        card.getByText('Create and manage PRNs.')

        expect(
          card.queryByText('PRN management is not yet available.')
        ).not.toBeNull()
      })

      it('should not display PRN links', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        expect(result).not.toContain('/packaging-recycling-notes')
      })
    })

    describe('when feature flag is enabled', () => {
      beforeAll(() => {
        config.set('featureFlags.prns', true)
      })

      afterAll(() => {
        config.reset('featureFlags.prns')
      })

      it.for([
        {
          name: 'PRN (reprocessor)',
          mockData: glassApproved,
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          title: 'PRNs',
          description: 'Create and manage PRNs.',
          createLinkText: 'Create new PRN',
          manageLinkText: 'Manage PRNs',
          expectedCreateUrl:
            '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/accreditations/acc-001-glass-approved/packaging-recycling-notes/create',
          expectedManageUrl:
            '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/accreditations/acc-001-glass-approved/packaging-recycling-notes'
        },
        {
          name: 'PERN (exporter)',
          mockData: exporterPlasticApproved,
          url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
          title: 'PERNs',
          description: 'Create and manage PERNs.',
          createLinkText: 'Create new PERN',
          manageLinkText: 'Manage PERNs',
          expectedCreateUrl:
            '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved/accreditations/acc-export-001-plastic-approved/packaging-recycling-notes/create',
          expectedManageUrl:
            '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved/accreditations/acc-export-001-plastic-approved/packaging-recycling-notes'
        }
      ])(
        'should display $name card with create and manage links',
        async (
          {
            mockData,
            url,
            title,
            description,
            createLinkText,
            manageLinkText,
            expectedCreateUrl,
            expectedManageUrl
          },
          { server }
        ) => {
          vi.mocked(
            getRequiredRegistrationModule.getRequiredRegistrationWithAccreditation
          ).mockResolvedValue(mockData)

          const { result } = await server.inject({
            method: 'GET',
            url,
            auth: mockAuth
          })

          const dom = new JSDOM(result)
          const { body } = dom.window.document

          const prnCard = getByRole(body, 'heading', {
            name: title,
            level: 3
          }).closest('.govuk-summary-card')

          const card = within(prnCard)

          card.getByText(description)

          expect(
            card
              .getByRole('link', { name: createLinkText })
              .getAttribute('href')
          ).toBe(expectedCreateUrl)

          expect(
            card
              .getByRole('link', { name: manageLinkText })
              .getAttribute('href')
          ).toBe(expectedManageUrl)
        }
      )
    })
  })
})
