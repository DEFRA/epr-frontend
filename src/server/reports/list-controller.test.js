import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportingPeriods } from '#server/reports/helpers/fetch-reporting-periods.js'
import { it } from '#vite/fixtures/server.js'
import Boom from '@hapi/boom'
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

const registeredOnlyExporter = {
  organisationData: { id: 'org-456' },
  registration: {
    id: 'reg-002',
    material: 'plastic',
    wasteProcessingType: 'exporter',
    registrationNumber: 'REG002345'
  },
  accreditation: undefined
}

const registeredOnlyReprocessor = {
  organisationData: { id: 'org-789' },
  registration: {
    id: 'reg-003',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'REG003456',
    site: {
      address: {
        line1: 'North Road',
        town: 'Manchester',
        postcode: 'M1 1AA'
      }
    }
  },
  accreditation: undefined
}

const monthlyResponse = {
  cadence: 'monthly',
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      report: null
    },
    {
      year: 2026,
      period: 2,
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dueDate: '2026-03-20',
      report: null
    },
    {
      year: 2026,
      period: 3,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      dueDate: '2026-04-20',
      report: null
    }
  ]
}

const quarterlyResponse = {
  cadence: 'quarterly',
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      dueDate: '2026-04-20',
      report: null
    }
  ]
}

const monthlyWithReportResponse = {
  cadence: 'monthly',
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      report: { id: 'report-001', status: 'in_progress' }
    }
  ]
}

const monthlyWithReadyToSubmitResponse = {
  cadence: 'monthly',
  reportingPeriods: [
    {
      year: 2026,
      period: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dueDate: '2026-02-20',
      report: { id: 'report-002', status: 'ready_to_submit' }
    }
  ]
}

const emptyResponse = {
  cadence: 'monthly',
  reportingPeriods: []
}

const accreditedUrl = '/organisations/org-123/registrations/reg-001/reports'
const exporterUrl = '/organisations/org-456/registrations/reg-002/reports'
const reprocessorUrl = '/organisations/org-789/registrations/reg-003/reports'

describe('#listReportsController', () => {
  beforeAll(() => {
    vi.useFakeTimers({
      now: new Date('2026-03-20T12:00:00Z'),
      toFake: ['Date']
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    vi.useRealTimers()
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

      it('should render monthly periods in a table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const table = body.querySelector('.govuk-table')

        expect(table).not.toBeNull()
        expect(table?.textContent).toContain('January 2026')
        expect(table?.textContent).toContain('February 2026')
        expect(table?.textContent).toContain('March 2026')
      })

      it('should display Select links for accredited reprocessor periods', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const selectLinks = body.querySelectorAll('.govuk-table a.govuk-link')

        expect(selectLinks).toHaveLength(3)
        expect(selectLinks[0]?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1'
        )
        expect(selectLinks[0]?.textContent).toContain('Select')
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

      it('should display Status column in table header', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const headers = body.querySelectorAll('.govuk-table thead th')

        expect(headers).toHaveLength(3)
        expect(headers[0]?.textContent).toContain('Period')
        expect(headers[1]?.textContent).toContain('Status')
        expect(headers[2]?.textContent).toContain('Action')
      })

      it('should display Due tag for ended periods', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tags = body.querySelectorAll('.govuk-table .govuk-tag')

        expect(tags).toHaveLength(2)
        expect(tags[0]?.textContent?.trim()).toBe('Due')
        expect(tags[1]?.textContent?.trim()).toBe('Due')
      })

      it('should not display Due tag for current period', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const rows = body.querySelectorAll('.govuk-table tbody tr')
        const marchRow = rows[2]
        const tag = marchRow?.querySelector('.govuk-tag')

        expect(tag).toBeNull()
      })
    })

    describe('for ended period with in_progress report', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedRegistration
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(
          monthlyWithReportResponse
        )
      })

      it('should display In progress tag', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tags = body.querySelectorAll('.govuk-table .govuk-tag')

        expect(tags).toHaveLength(1)
        expect(tags[0]?.textContent?.trim()).toBe('In progress')
      })

      it('should display Continue link instead of Select', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const link = body.querySelector('.govuk-table a.govuk-link')

        expect(link).not.toBeNull()
        expect(link?.textContent).toContain('Continue')
        expect(link?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/supporting-information'
        )
      })

      it('should not display Due tag', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tags = body.querySelectorAll('.govuk-table .govuk-tag')
        const dueTag = Array.from(tags).find(
          (tag) => tag.textContent?.trim() === 'Due'
        )

        expect(dueTag).toBeUndefined()
      })
    })

    describe('for ended period with ready_to_submit report', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedRegistration
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(
          monthlyWithReadyToSubmitResponse
        )
      })

      it('should display Ready to submit tag', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tags = body.querySelectorAll('.govuk-table .govuk-tag')

        expect(tags).toHaveLength(1)
        expect(tags[0]?.textContent?.trim()).toBe('Ready to submit')
      })

      it('should display Review and submit link to submit page', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: accreditedUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const link = body.querySelector('.govuk-table a.govuk-link')

        expect(link).not.toBeNull()
        expect(link?.textContent).toContain('Review and submit')
        expect(link?.getAttribute('href')).toBe(
          '/organisations/org-123/registrations/reg-001/reports/2026/monthly/1/submit'
        )
      })
    })

    describe('for registered-only exporter (quarterly)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyExporter
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(quarterlyResponse)
      })

      it('should return 200', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display Quarterly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
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

      it('should render quarterly periods in a table', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const table = body.querySelector('.govuk-table')

        expect(table).not.toBeNull()
        expect(table?.textContent).toContain('Quarter 1, 2026')
      })

      it('should display Select links for exporter', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const selectLinks = body.querySelectorAll('.govuk-table a.govuk-link')

        expect(selectLinks).toHaveLength(1)
        expect(selectLinks[0]?.getAttribute('href')).toBe(
          '/organisations/org-456/registrations/reg-002/reports/2026/quarterly/1'
        )
        expect(selectLinks[0]?.textContent).toContain('Select')
      })

      it('should not display Monthly subheading', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
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

      it('should not display Due tag for current quarter', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: exporterUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const tags = body.querySelectorAll('.govuk-table .govuk-tag')

        expect(tags).toHaveLength(0)
      })
    })

    describe('for registered-only reprocessor (quarterly)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyReprocessor
        )
        vi.mocked(fetchReportingPeriods).mockResolvedValue(quarterlyResponse)
      })

      it('should display Select links for reprocessor periods', async ({
        server
      }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: reprocessorUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const link = body.querySelector('.govuk-table a.govuk-link')

        expect(link).not.toBeNull()
        expect(link?.getAttribute('href')).toBe(
          '/organisations/org-789/registrations/reg-003/reports/2026/quarterly/1'
        )
        expect(link?.textContent).toContain('Select')

        const hidden = link?.querySelector('.govuk-visually-hidden')
        expect(hidden?.textContent).toBe('Quarter 1, 2026')
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
        vi.mocked(fetchRegistrationAndAccreditation).mockRejectedValue(
          Boom.notFound('Registration not found')
        )

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
