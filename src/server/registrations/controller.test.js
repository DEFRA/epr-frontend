import { config } from '#config/config.js'
import { OIDC_ENTRA_ID } from '#server/auth/plugins/entra-id.js'
import { SCOPES } from '#server/auth/scopes.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import * as fetchWasteBalancesModule from '#server/common/helpers/waste-balance/fetch-waste-balances.js'
import {
  buildMockAuth,
  sessionIdentity
} from '#server/common/test-helpers/auth-helper.js'
import { IDENTITIES } from '#server/common/test-helpers/identity-helper.js'
import { asHtml } from '#server/common/test-helpers/dom.js'
import {
  asRegistrationWithAccreditation,
  findRegistrationAndAccreditation
} from '#server/common/test-helpers/organisation-fixtures.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
import {
  getByRole,
  queryByRole,
  queryByText,
  within
} from '@testing-library/dom'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import fixtureExportingOnly from '../../../fixtures/organisation/fixture-exporting-only.json' with { type: 'json' }
import fixtureData from '../../../fixtures/organisation/organisationData.json' with { type: 'json' }

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)

vi.mock(import('#server/common/helpers/waste-balance/fetch-waste-balances.js'))

const glassApproved = findRegistrationAndAccreditation(
  fixtureData,
  'reg-001-glass-approved'
)
const glassOtherApproved = findRegistrationAndAccreditation(
  fixtureData,
  'reg-001b-glass-other-approved'
)
const exporterPlasticApproved = findRegistrationAndAccreditation(
  fixtureExportingOnly,
  'reg-export-001-plastic-approved'
)

const mockAuth = buildMockAuth({ backendToken: 'test-id-token' })

describe('#accreditationDashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchWasteBalancesModule.fetchWasteBalances).mockResolvedValue({})
  })

  describe('happy path - reprocessor', () => {
    it('should use the Site and Material in the page title', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('title').text()).toMatch(
        /^Manchester Glass Recycling Facility: Glass/
      )
    })

    it('should display accreditation dashboard for reprocessor', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect(statusCode).toBe(statusCodes.ok)
      expect($('h1').text()).toContain('Glass')
      expect($('.govuk-caption-xl').text()).toBe(
        'Manchester Glass Recycling Facility'
      )
    })

    it('should display registration and accreditation status tags', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('.govuk-tag--green').length).toBeGreaterThan(0)
      expect(result).toContain('Approved')
    })

    it('should display PRNs tile for reprocessor', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(result).toContain('PRNs')
      expect(result).toContain('Create and manage PRNs.')
      expect(result).not.toContain('PERNs')
    })

    it('should display registration and accreditation numbers', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

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
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      const uploadLink = $('a[href*="summary-logs/upload"]')

      expect(uploadLink).toHaveLength(1)
      expect(uploadLink.attr('href')).toContain(
        '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/summary-logs/upload'
      )
    })

    it('should display contact regulator link', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      const contactLink = $('main a[href*="contact"]')

      expect(contactLink).toHaveLength(1)
    })

    it('should display back link to reprocessing tab', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      const backLink = $('.govuk-back-link')

      expect(backLink.attr('href')).toBe(
        '/organisations/6507f1f77bcf86cd79943901'
      )
    })

    it('should display all four task tiles', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

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
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        exporterPlasticApproved
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('PERNs')
      expect(result).toContain('Create and manage PERNs.')
    })

    it('should display back link to exporting tab for exporter', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        exporterPlasticApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943902/registrations/reg-export-001-plastic-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

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
      vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
        Boom.forbidden()
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/nonexistent-org/registrations/reg-001',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    it('should return 404 when registration not found', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
        Boom.notFound('Registration not found')
      )

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
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('title').text()).toMatch(/Glass remelt/)
    })

    it('should display "Glass remelt" in heading for glass_re_melt registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('h1').text()).toContain('Glass remelt')
    })

    it('should display "Glass other" in page title for glass_other registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassOtherApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001b-glass-other-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('title').text()).toMatch(/Glass other/)
    })

    it('should display "Glass other" in heading for glass_other registration', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassOtherApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001b-glass-other-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('h1').text()).toContain('Glass other')
    })
  })

  describe('edge cases', () => {
    it('should display Unknown site when site address is missing', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        asRegistrationWithAccreditation({
          registration: {
            id: 'reg-no-site',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'approved'
          },
          accreditation: undefined
        })
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-no-site',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Unknown site')
    })

    it('should capitalise material name', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('h1').text().trim()).toMatch(/^[A-Z]/)
    })
  })

  describe('waste balance', () => {
    it('should display zero balance when no waste balance data is available', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      expect($('[data-testid="waste-balance-amount"]').text()).toContain('0.00')
      expect($('[data-testid="waste-balance-amount"]').text()).toContain(
        'tonnes'
      )
    })

    it('should apply epr-waste-balance-banner class to waste balance banner', async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      const banner = $('.govuk-summary-card.epr-waste-balance-banner')

      expect(banner.length).toBeGreaterThan(0)
    })

    it('should use govuk-summary-card for task cards', async ({ server }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )

      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const $ = load(asHtml(result))

      // 4 task cards + 1 waste balance banner = 5 summary cards total
      const summaryCards = $('.govuk-summary-card')

      expect(summaryCards).toHaveLength(5)
    })

    describe('waste balance display', () => {
      it('should display formatted waste balance for reprocessor with PRNs text', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
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

        const $ = load(asHtml(result))

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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          exporterPlasticApproved
        )
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

        const $ = load(asHtml(result))

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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockRejectedValue(new Error('Service unavailable'))

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)

        const $ = load(asHtml(result))

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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          asRegistrationWithAccreditation({
            registration: {
              id: 'reg-no-accreditation',
              wasteProcessingType: 'reprocessor',
              material: 'plastic',
              status: 'approved',
              site: { address: { line1: 'Test Site' } }
            },
            accreditation: {
              id: 'some-acc',
              accreditationNumber: 'ACC999',
              status: 'approved'
            }
          })
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-no-accreditation',
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(
          fetchWasteBalancesModule.fetchWasteBalances
        ).not.toHaveBeenCalled()

        const $ = load(asHtml(result))

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
      })

      it('should display zero balance correctly', async ({ server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
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

        const $ = load(asHtml(result))

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
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
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

        const $ = load(asHtml(result))

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '12,345.67'
        )
      })

      it('should display zero balance when API returns empty object', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          glassApproved
        )
        vi.mocked(
          fetchWasteBalancesModule.fetchWasteBalances
        ).mockResolvedValue({})

        const { result } = await server.inject({
          method: 'GET',
          url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
          auth: mockAuth
        })

        const $ = load(asHtml(result))

        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          '0.00'
        )
        expect($('[data-testid="waste-balance-amount"]').text()).toContain(
          'tonnes'
        )
      })
    })
  })

  describe('registered-only', () => {
    const registeredOnlyRegistration = asRegistrationWithAccreditation({
      registration: glassApproved.registration,
      accreditation: undefined
    })

    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        registeredOnlyRegistration
      )
    })

    it('should return 200 for registered-only operator', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should not show waste balance banner for registered-only operator', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      expect(queryByText(body, /Available waste balance/)).toBeNull()
    })

    it('should not show PRNs card for registered-only operator', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      expect(
        queryByRole(body, 'heading', { name: /PRN|PERN/i, level: 3 })
      ).toBeNull()
    })
  })

  describe('reports tile', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )
    })

    it('should display Manage reports link', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const reportsCard = getByRole(body, 'heading', {
        name: 'Reports',
        level: 3
      }).closest('.govuk-summary-card')

      const card = within(reportsCard)

      expect(
        card.getByRole('link', { name: 'Manage reports' }).getAttribute('href')
      ).toBe(
        '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/reports'
      )
    })

    it('should not display reports not available message', async ({
      server
    }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      const reportsCard = getByRole(body, 'heading', {
        name: 'Reports',
        level: 3
      }).closest('.govuk-summary-card')

      expect(
        within(reportsCard).queryByText('Reporting is not yet available.')
      ).toBeNull()
    })
  })

  describe('reapply for accreditation link', () => {
    const url =
      '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-plastic-approved'
    const placeholder =
      'Registration and accreditation management is not yet available.'
    // Phase 1 only shows the link for a current-year accreditation, and the
    // controller reads the real clock, so derive the fixture year from now
    // rather than hard-coding it (else these tests rot at the year boundary).
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    const originalWindowStartMonth = config.get(
      'reapplyAccreditation.windowStartMonth'
    )
    const originalWindowEndMonth = config.get(
      'reapplyAccreditation.windowEndMonth'
    )
    const originalWindowStartTime = config.get(
      'reapplyAccreditation.windowStartTime'
    )
    const originalBaseUrl = config.get('reapplyAccreditation.baseUrl')

    beforeEach(() => {
      config.set('reapplyAccreditation.windowStartMonth', 1)
      config.set('reapplyAccreditation.windowEndMonth', 12)
      // '00:00' so the year-round window is open at every instant of 1 January,
      // not just from the real windowStartTime onwards - these tests read the
      // real clock and must not be able to flake overnight on New Year's Day.
      config.set('reapplyAccreditation.windowStartTime', '00:00')
      config.set('reapplyAccreditation.baseUrl', 'https://ws2.example')
    })

    afterEach(() => {
      config.set(
        'reapplyAccreditation.windowStartMonth',
        originalWindowStartMonth
      )
      config.set('reapplyAccreditation.windowEndMonth', originalWindowEndMonth)
      config.set(
        'reapplyAccreditation.windowStartTime',
        originalWindowStartTime
      )
      config.set('reapplyAccreditation.baseUrl', originalBaseUrl)
    })

    /** @param {object} overrides */
    const mockRegistration = (overrides) =>
      asRegistrationWithAccreditation({
        organisationData: {},
        registration: {
          id: 'reg-001-plastic-approved',
          wasteProcessingType: 'reprocessor',
          material: 'plastic',
          status: 'approved',
          site: { address: { line1: 'Test Site' } }
        },
        accreditation: undefined,
        ...overrides
      })

    const expectedHref = `https://ws2.example/operator-accreditation/6507f1f77bcf86cd79943901/reg-001-plastic-approved/plastic/${nextYear}`

    it.for([
      {
        name: 'an approved accreditation with a validFrom',
        status: 'approved'
      },
      {
        name: 'a suspended accreditation with a validFrom',
        status: 'suspended'
      },
      {
        name: 'a cancelled accreditation with a validFrom',
        status: 'cancelled'
      }
    ])(
      'shows the "apply for {year}" link (year = validFrom + 1) in place of the placeholder for $name',
      async ({ status }, { server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          mockRegistration({
            rawAccreditation: { status, validFrom: `${currentYear}-01-01` }
          })
        )

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const link = getByRole(body, 'link', {
          name: `apply for ${nextYear} accreditation`
        })
        expect(link.getAttribute('href')).toBe(expectedHref)

        // The link replaces the placeholder, which is no longer rendered.
        expect(queryByText(body, placeholder)).toBeNull()
      }
    )

    it.for([
      { name: 'there is no accreditation (registered-only)', overrides: {} },
      {
        name: 'the accreditation was created but never approved',
        overrides: { rawAccreditation: { status: 'created' } }
      },
      {
        name: 'the accreditation was rejected',
        overrides: { rawAccreditation: { status: 'rejected' } }
      },
      {
        name: 'the accreditation is cancelled with no validFrom',
        overrides: { rawAccreditation: { status: 'cancelled' } }
      },
      {
        name: 'the registration is not approved',
        overrides: {
          registration: {
            id: 'reg-001-plastic-approved',
            wasteProcessingType: 'reprocessor',
            material: 'plastic',
            status: 'created',
            site: { address: { line1: 'Test Site' } }
          },
          rawAccreditation: {
            status: 'approved',
            validFrom: `${currentYear}-01-01`
          }
        }
      }
    ])(
      'hides the link but keeps the placeholder when $name',
      async ({ overrides }, { server }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          mockRegistration(overrides)
        )

        const { result } = await server.inject({
          method: 'GET',
          url,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(
          queryByRole(body, 'link', {
            name: `apply for ${nextYear} accreditation`
          })
        ).toBeNull()
        expect(queryByText(body, placeholder)).not.toBeNull()
      }
    )

    it('hides the link but keeps the placeholder when today is outside the window', async ({
      server
    }) => {
      // A single-month window on a month other than the current one guarantees
      // today falls outside it, independent of the real date the test runs on.
      const thisMonth = new Date().getMonth() + 1
      const otherMonth = thisMonth === 1 ? 12 : 1
      config.set('reapplyAccreditation.windowStartMonth', otherMonth)
      config.set('reapplyAccreditation.windowEndMonth', otherMonth)

      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        mockRegistration({
          rawAccreditation: {
            status: 'approved',
            validFrom: `${currentYear}-01-01`
          }
        })
      )

      const { result } = await server.inject({
        method: 'GET',
        url,
        auth: mockAuth
      })

      const dom = new JSDOM(result)
      const { body } = dom.window.document

      expect(
        queryByRole(body, 'link', {
          name: `apply for ${nextYear} accreditation`
        })
      ).toBeNull()
      expect(queryByText(body, placeholder)).not.toBeNull()
    })
  })

  describe('packaging-recycling-notes', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        glassApproved
      )
    })

    describe('request handling', () => {
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
          vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
            mockData
          )

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

/**
 * @import { ServerFixtures } from '#vite/fixtures/server.js'
 */

describe('a session that may not change the operator data', () => {
  const readOnlyAuth = buildMockAuth({
    backendToken: 'test-id-token',
    scope: []
  })
  const configuredWindow = config.get('reapplyAccreditation')
  const thisYear = new Date().getFullYear()
  const validFrom = `${thisYear}-01-01`

  // The reapply link is offered only inside a window, and only for an
  // accreditation of the current year, so both are arranged here. Without them
  // the link never renders and asserting its absence would prove nothing.
  const renewable = asRegistrationWithAccreditation({
    ...glassApproved,
    accreditation: { ...glassApproved.accreditation, validFrom },
    rawAccreditation: { ...glassApproved.rawAccreditation, validFrom }
  })

  /**
   * @param {ServerFixtures['server']} server
   * @param {ReturnType<typeof buildMockAuth>} auth
   */
  const openRegistration = async (server, auth) => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(renewable)

    const { result } = await server.inject({
      method: 'GET',
      url: '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved',
      auth
    })

    return new JSDOM(asHtml(result)).window.document.body
  }

  const reapplyLink = { name: /apply for \d{4} accreditation/ }

  beforeEach(() => {
    config.set('reapplyAccreditation.windowStartMonth', 1)
    config.set('reapplyAccreditation.windowEndMonth', 12)
    // See the equivalent comment in the 'reapply for accreditation link'
    // describe block above: avoids flaking overnight on New Year's Day.
    config.set('reapplyAccreditation.windowStartTime', '00:00')
    config.set('reapplyAccreditation.baseUrl', 'https://reapply.example')
  })

  afterEach(() => {
    config.set(
      'reapplyAccreditation.windowStartMonth',
      configuredWindow.windowStartMonth
    )
    config.set(
      'reapplyAccreditation.windowEndMonth',
      configuredWindow.windowEndMonth
    )
    config.set(
      'reapplyAccreditation.windowStartTime',
      configuredWindow.windowStartTime
    )
    config.set('reapplyAccreditation.baseUrl', configuredWindow.baseUrl)
  })

  it('offers an operator all three, so the absences below say something', async ({
    server
  }) => {
    const body = await openRegistration(server, mockAuth)

    expect(
      queryByRole(body, 'link', { name: 'Upload your summary log' })
    ).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).not.toBeNull()
    expect(queryByRole(body, 'link', reapplyLink)).not.toBeNull()
  })

  it('offers none of them to a session holding no write scope', async ({
    server
  }) => {
    const body = await openRegistration(server, readOnlyAuth)

    expect(
      queryByRole(body, 'link', { name: 'Upload your summary log' })
    ).toBeNull()
    expect(queryByRole(body, 'link', { name: 'Create new PRN' })).toBeNull()
    expect(queryByRole(body, 'link', reapplyLink)).toBeNull()
  })

  it('heads the summary log card for an operator, who can upload one', async ({
    server
  }) => {
    const body = await openRegistration(server, mockAuth)

    expect(queryByRole(body, 'heading', { name: 'Summary log' })).not.toBeNull()
  })

  it('drops the summary log card, which offers only the upload', async ({
    server
  }) => {
    const body = await openRegistration(server, readOnlyAuth)

    expect(queryByRole(body, 'heading', { name: 'Summary log' })).toBeNull()
    expect(
      queryByText(
        body,
        'Upload your summary log to record new packaging waste or adjust previously submitted data.'
      )
    ).toBeNull()
  })

  it('still lets it read the notes the operator has issued', async ({
    server
  }) => {
    const body = await openRegistration(server, readOnlyAuth)

    expect(queryByRole(body, 'link', { name: 'View PRNs' })).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'View reports' })).not.toBeNull()
  })

  it('tells an operator it can create and manage, as it always did', async ({
    server
  }) => {
    const body = await openRegistration(server, mockAuth)

    expect(queryByText(body, 'Create and manage PRNs.')).not.toBeNull()
    expect(queryByText(body, 'Create and manage your reports.')).not.toBeNull()
    expect(
      queryByText(body, 'View and manage your applications.')
    ).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'Manage PRNs' })).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'Manage reports' })).not.toBeNull()
  })

  it('offers a read-only session no card that says it can manage', async ({
    server
  }) => {
    const body = await openRegistration(server, readOnlyAuth)

    expect(
      queryByText(body, 'View the PRNs issued for this registration.')
    ).not.toBeNull()
    expect(
      queryByText(body, 'View the reports submitted for this registration.')
    ).not.toBeNull()
    expect(queryByText(body, 'View applications.')).not.toBeNull()
    expect(queryByRole(body, 'link', { name: 'Manage PRNs' })).toBeNull()
    expect(queryByRole(body, 'link', { name: 'Manage reports' })).toBeNull()
  })
})

describe('the waste balance ledger link', () => {
  const regulatorAuth = buildMockAuth({
    provider: OIDC_ENTRA_ID,
    ...sessionIdentity(IDENTITIES.regulator),
    profile: { id: 'entra-user-1', email: 'regulator@example.com' },
    backendToken: 'test-id-token'
  })

  const registeredOnly = findRegistrationAndAccreditation(
    fixtureData,
    'reg-006-plastic-export-created'
  )

  /**
   * @param {HapiServer} server
   * @param {ReturnType<typeof buildMockAuth>} auth
   * @param {RegistrationWithAccreditation} registration
   */
  const openRegistration = async (server, auth, registration) => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(registration)

    const { result } = await server.inject({
      method: 'GET',
      url: `/organisations/6507f1f77bcf86cd79943901/registrations/${registration.registration.id}`,
      auth
    })

    return new JSDOM(asHtml(result)).window.document.body
  }

  const ledgerLink = { name: 'View waste balance ledger' }

  it('sends a regulator to the ledger of the accreditation in force', async ({
    server
  }) => {
    const body = await openRegistration(server, regulatorAuth, glassApproved)

    expect(queryByRole(body, 'link', ledgerLink)?.getAttribute('href')).toBe(
      '/organisations/6507f1f77bcf86cd79943901/registrations/reg-001-glass-approved/accreditations/acc-001-glass-approved/waste-balance-ledger'
    )
  })

  it('sends a regulator to the registered-only ledger where no accreditation is in force', async ({
    server
  }) => {
    const body = await openRegistration(server, regulatorAuth, registeredOnly)

    expect(queryByRole(body, 'link', ledgerLink)?.getAttribute('href')).toBe(
      '/organisations/6507f1f77bcf86cd79943901/registrations/reg-006-plastic-export-created/waste-balance-ledger'
    )
  })

  it('offers an operator no link at all', async ({ server }) => {
    const body = await openRegistration(server, mockAuth, glassApproved)

    expect(queryByRole(body, 'link', ledgerLink)).toBeNull()
  })

  it('offers no link to a session the backend granted no ledger scope, whatever role it carries', async ({
    server
  }) => {
    const withoutLedgerScope = buildMockAuth({
      provider: OIDC_ENTRA_ID,
      role: IDENTITIES.regulator.role,
      scope: [SCOPES.organisationSearch],
      profile: { id: 'entra-user-2', email: 'no.ledger@example.com' },
      backendToken: 'test-id-token'
    })
    const body = await openRegistration(
      server,
      withoutLedgerScope,
      glassApproved
    )

    expect(queryByRole(body, 'link', ledgerLink)).toBeNull()
  })
})

/**
 * @import { HapiServer } from '#server/common/hapi-types.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */
