import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, queryByRole } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-reporting-periods.js'))

const mockCredentials = {
  profile: {
    id: 'user-123',
    email: 'test@example.com'
  },
  idToken: 'mock-id-token'
}

const mockAuth = {
  strategy: 'session',
  credentials: mockCredentials
}

const accreditedRegistration = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'glass',
    glassRecyclingProcess: ['glass_re_melt'],
    wasteProcessingType: 'reprocessor',
    accreditationId: 'acc-001',
    registrationNumber: 'REG001234',
    site: {
      address: {
        line1: 'Manchester Glass Facility',
        town: 'Manchester',
        postcode: 'M1 1AA'
      }
    }
  },
  accreditation: {
    id: 'acc-001',
    status: 'approved'
  }
}

const registeredOnlyRegistration = {
  organisationData: { id: 'org-456' },
  registration: {
    id: 'reg-002',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG002345',
    site: {
      address: {
        line1: 'Liverpool Export Centre',
        town: 'Liverpool',
        postcode: 'L1 1AA'
      }
    }
  },
  accreditation: undefined
}

const monthlyResponse = {
  cadence: 'monthly',
  periods: [
    { year: 2026, period: 1, startDate: '2026-01-01', endDate: '2026-01-31' },
    { year: 2026, period: 2, startDate: '2026-02-01', endDate: '2026-02-28' }
  ]
}

const quarterlyResponse = {
  cadence: 'quarterly',
  periods: [
    { year: 2026, period: 1, startDate: '2026-01-01', endDate: '2026-03-31' }
  ]
}

const emptyResponse = {
  cadence: 'monthly',
  periods: []
}

const accreditedUrl = '/organisations/org-123/registrations/reg-001/reports'
const registeredOnlyUrl = '/organisations/org-456/registrations/reg-002/reports'

describe('#listReportsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when feature flag is enabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', true)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    describe('for accredited operator (monthly periods)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedRegistration
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(monthlyResponse)
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display page heading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: /Reports/,
          level: 1
        })

        expect(heading).toBeDefined()
      })

      it('should display back link to dashboard', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const backLink = body.querySelector('.govuk-back-link')

        expect(backLink).not.toBeNull()
        expect(backLink?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001'
        )
      })

      it('should display Monthly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: 'Monthly',
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display month period entries', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('January 2026')
        expect(body.textContent).toContain('February 2026')
      })

      it('should not display Quarterly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(
          queryByRole(body, 'heading', {
            name: 'Quarterly',
            level: 2
          })
        ).toBeNull()
      })
    })

    describe('for registered-only operator (quarterly)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyRegistration
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(quarterlyResponse)
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: registeredOnlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display Quarterly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: registeredOnlyUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', {
          name: 'Quarterly',
          level: 2
        })

        expect(heading).toBeDefined()
      })

      it('should display quarter period entries', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: registeredOnlyUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain('January to March 2026')
      })

      it('should not display Monthly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: registeredOnlyUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(
          queryByRole(body, 'heading', {
            name: 'Monthly',
            level: 2
          })
        ).toBeNull()
      })
    })

    describe('when no periods have data', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedRegistration
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(emptyResponse)
      })

      it('should display empty state message', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        expect(body.textContent).toContain(
          'There are no reporting periods with data'
        )
      })
    })

    describe('error handling', () => {
      it('should return 404 when registration not found', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
          organisationData: { id: 'org-123' },
          registration: undefined,
          accreditation: undefined
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })
  })

  describe('when feature flag is disabled', () => {
    beforeAll(() => {
      config.set('featureFlags.reports', false)
    })

    afterAll(() => {
      config.reset('featureFlags.reports')
    })

    it('should return 404', async ({ server }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: accreditedUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })
})
