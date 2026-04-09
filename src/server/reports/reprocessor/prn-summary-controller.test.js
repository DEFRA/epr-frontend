import { config } from '#config/config.js'
import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { afterAll, beforeAll, beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('../helpers/update-report.js'))

const { updateReport } = await import('../helpers/update-report.js')

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

const accreditedReprocessor = {
  organisationData: { id: 'org-123' },
  registration: {
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'REG001234'
  },
  accreditation: {
    id: 'acc-001',
    accreditationNumber: 'ER992415095748M'
  }
}

const registeredOnlyReprocessor = {
  ...accreditedReprocessor,
  accreditation: undefined
}

const reportDetail = {
  operatorCategory: 'REPROCESSOR_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
  id: 'report-001',
  version: 1,
  status: 'in_progress',
  supportingInformation: null,
  recyclingActivity: {
    totalTonnageReceived: 200,
    suppliers: [],
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  prn: {
    issuedTonnage: 91,
    totalRevenue: null,
    freeTonnage: null
  }
}

const reportDetailWithRevenue = {
  ...reportDetail,
  prn: {
    ...reportDetail.prn,
    totalRevenue: 1576.12
  }
}

const organisationId = 'org-123'
const registrationId = 'reg-001'
const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/prn-summary`

describe('#reprocessorPrnSummaryController', () => {
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

    describe('GET (dispatched to reprocessor)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedReprocessor
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      })

      it('should return 200 for accredited reprocessor', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.ok)
      })

      it('should display PRN tonnage issued', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const inset = body.querySelector('.govuk-inset-text')

        expect(inset).not.toBeNull()
        expect(getByText(inset, /Total tonnage of PRNs issued/)).toBeDefined()
        expect(getByText(inset, '91')).toBeDefined()
      })

      it('should display PRN heading with material', async ({ server }) => {
        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const dom = new JSDOM(result)
        const { body } = dom.window.document

        const heading = getByRole(body, 'heading', { level: 1 })
        expect(heading.textContent).toContain('PRNs issued')
      })

      it('should pre-fill revenue if previously saved', async ({ server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetailWithRevenue)

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(result).toContain('value="1576.12"')
      })

      it('should return 404 for registered-only reprocessor', async ({
        server
      }) => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          registeredOnlyReprocessor
        )

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 for quarterly cadence', async ({ server }) => {
        const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/prn-summary`

        const { statusCode } = await server.inject({
          method: 'GET',
          url: quarterlyUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })

      it('should return 404 when report is not in progress', async ({
        server
      }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...reportDetail,
          status: 'ready_to_submit'
        })

        const { statusCode } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        expect(statusCode).toBe(statusCodes.notFound)
      })
    })

    describe('POST (dispatched to reprocessor)', () => {
      beforeEach(() => {
        vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
          accreditedReprocessor
        )
        vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
        vi.mocked(updateReport).mockResolvedValue(undefined)
      })

      it('should redirect to free-prns on continue', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: 1576.12, action: 'continue' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/free-prns`
        )
      })

      it('should call updateReport with prnRevenue', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: 1576.12, action: 'continue' }
        })

        expect(updateReport).toHaveBeenCalledWith(
          organisationId,
          registrationId,
          2026,
          'monthly',
          1,
          { prnRevenue: 1576.12 },
          'mock-id-token'
        )
      })

      it('should redirect to reports list on save', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: 0, action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('should show error when revenue has more than 2 decimal places', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: 1576.123, action: 'continue' }
        })

        const { body } = new JSDOM(result).window.document
        const alert = getByRole(body, 'alert')

        expect(
          getByText(alert, /Enter an amount in pounds and pence/)
        ).toBeDefined()
      })

      it('should show error when revenue is empty', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode, result } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: '', action: 'continue' }
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain('Enter the total revenue of PRNs issued')
      })
    })
  })
})
