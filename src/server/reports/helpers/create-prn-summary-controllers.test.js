import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { it } from '#vite/fixtures/server.js'
import { getByRole, getByText } from '@testing-library/dom'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./update-report.js'))

const { updateReport } = await import('./update-report.js')

const subtrees = [
  {
    name: 'exporter',
    registrationType: 'exporter',
    operatorCategory: 'EXPORTER_ACCREDITED',
    notePlural: 'PERNs',
    redirectSlug: 'free-perns',
    accreditedDescription: 'accredited operator',
    registeredOnlyDescription: 'registered-only operator'
  },
  {
    name: 'reprocessor',
    registrationType: 'reprocessor',
    operatorCategory: 'REPROCESSOR_ACCREDITED',
    notePlural: 'PRNs',
    redirectSlug: 'free-prns',
    accreditedDescription: 'accredited operator',
    registeredOnlyDescription: 'registered-only operator'
  }
]

const mockCredentials = {
  profile: { id: 'user-123', email: 'test@example.com' },
  idToken: 'mock-id-token'
}

const mockAuth = { strategy: 'session', credentials: mockCredentials }

const organisationId = 'org-123'
const registrationId = 'reg-001'

describe.each(subtrees)('$name prn summary page', (subtree) => {
  const accreditedOperator = {
    organisationData: { id: organisationId },
    registration: {
      id: registrationId,
      material: 'plastic',
      wasteProcessingType: subtree.registrationType,
      registrationNumber: 'REG001234'
    },
    accreditation: {
      id: 'acc-001',
      accreditationNumber: 'ER992415095748M'
    }
  }

  const registeredOnlyOperator = {
    ...accreditedOperator,
    accreditation: undefined
  }

  const reportDetail = {
    operatorCategory: subtree.operatorCategory,
    cadence: 'monthly',
    year: 2026,
    period: 1,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    source: {
      summaryLogId: 'sl-1',
      lastUploadedAt: '2026-02-15T15:09:00.000Z'
    },
    details: { material: 'plastic' },
    id: 'report-001',
    version: 1,
    status: { currentStatus: 'in_progress' },
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
      freeTonnage: null,
      averagePricePerTonne: null
    }
  }

  const reportDetailWithRevenue = {
    ...reportDetail,
    prn: { ...reportDetail.prn, totalRevenue: 1576.12 }
  }

  const baseUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/submissions/1/prn-summary`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedOperator
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
    })

    it(`should return 200 for ${subtree.accreditedDescription}`, async ({
      server
    }) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.ok)
    })

    it('should display the heading', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document

      expect(
        getByRole(body, 'heading', {
          level: 1,
          name: new RegExp(
            `${subtree.notePlural} issued for plastic packaging waste in January$`
          )
        })
      ).toBeDefined()
    })

    it('should display tonnage issued', async ({ server }) => {
      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      const { body } = new JSDOM(result).window.document
      const inset = body.querySelector('.govuk-inset-text')

      expect(inset).not.toBeNull()
      expect(
        getByText(
          inset,
          new RegExp(`Total tonnage of ${subtree.notePlural} issued`)
        )
      ).toBeDefined()
      expect(getByText(inset, '91')).toBeDefined()
    })

    it('should pre-fill revenue if previously saved', async ({ server }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue(reportDetailWithRevenue)

      const { result } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(result).toContain('1576.12')
    })

    it.for([
      { revenue: 1576.12, expected: '1576.12' },
      { revenue: 1576.1, expected: '1576.10' },
      { revenue: 1576, expected: '1576' }
    ])(
      'should pre-fill revenue $revenue as $expected',
      async ({ revenue, expected }, { server }) => {
        vi.mocked(fetchReportDetail).mockResolvedValue({
          ...reportDetail,
          prn: { ...reportDetail.prn, totalRevenue: revenue }
        })

        const { result } = await server.inject({
          method: 'GET',
          url: baseUrl,
          auth: mockAuth
        })

        const { body } = new JSDOM(result).window.document
        const input = getByRole(body, 'textbox', {
          name: new RegExp(
            `Enter the total revenue that you have received or expect to receive for these ${subtree.notePlural}, excluding VAT`
          )
        })

        expect(input.value).toBe(expected)
      }
    )

    it(`should return 404 for ${subtree.registeredOnlyDescription}`, async ({
      server
    }) => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        registeredOnlyOperator
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 404 for quarterly cadence', async ({ server }) => {
      const quarterlyUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/quarterly/1/submissions/1/prn-summary`

      const { statusCode } = await server.inject({
        method: 'GET',
        url: quarterlyUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    it('should return 500 when prn data is missing', async ({ server }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue({
        ...reportDetail,
        prn: undefined
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })

    it('should return 404 when report is not in progress', async ({
      server
    }) => {
      vi.mocked(fetchReportDetail).mockResolvedValue({
        ...reportDetail,
        status: { currentStatus: 'ready_to_submit' }
      })

      const { statusCode } = await server.inject({
        method: 'GET',
        url: baseUrl,
        auth: mockAuth
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })
  })

  describe('POST', () => {
    const isReprocessor = subtree.name === 'reprocessor'

    beforeEach(() => {
      vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
        accreditedOperator
      )
      vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
      vi.mocked(updateReport).mockResolvedValue(undefined)
    })

    describe('csrf protection', () => {
      it('should reject POST without CSRF token', async ({ server }) => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          payload: {}
        })

        expect(statusCode).toBe(statusCodes.forbidden)
      })
    })

    describe('when continue is clicked with valid revenue', () => {
      it(`should redirect to ${subtree.redirectSlug}`, async ({ server }) => {
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
          `/organisations/${organisationId}/registrations/${registrationId}/reports/2026/monthly/1/submissions/1/${subtree.redirectSlug}`
        )

        expect(server.loggerMocks.info).toHaveBeenCalledWith({
          message: 'prn-summary dispatch POST',
          event: {
            action: 'prn_summary_dispatch_post',
            reason: `reprocessor=${isReprocessor}`
          }
        })
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
          {
            organisationId,
            registrationId,
            year: 2026,
            cadence: 'monthly',
            period: 1,
            submissionNumber: 1
          },
          { prnRevenue: 1576.12 },
          'mock-id-token'
        )
      })
    })

    describe('when save is clicked', () => {
      it('should redirect to reports list', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: 1576.12, action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('should redirect to reports list when revenue is empty', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: '', action: 'save' }
        })

        expect(statusCode).toBe(statusCodes.found)
        expect(headers.location).toBe(
          `/organisations/${organisationId}/registrations/${registrationId}/reports`
        )
      })

      it('should not call updateReport when revenue is empty', async ({
        server
      }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: '', action: 'save' }
        })

        expect(updateReport).not.toHaveBeenCalled()
      })

      it('should show error when revenue is non-numeric', async ({
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
          payload: { crumb, prnRevenue: 'abc', action: 'save' }
        })

        const { body } = new JSDOM(result).window.document
        const alert = getByRole(body, 'alert')

        expect(
          getByText(
            alert,
            /Enter the total revenue in digits, using a decimal point if needed/
          )
        ).toBeDefined()
      })
    })

    describe('validation errors', () => {
      it('should show error when revenue is non-numeric', async ({
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
          payload: { crumb, prnRevenue: 'abc', action: 'continue' }
        })

        const { body } = new JSDOM(result).window.document
        const alert = getByRole(body, 'alert')

        expect(
          getByText(
            alert,
            /Enter the total revenue in digits, using a decimal point if needed/
          )
        ).toBeDefined()

        expect(server.loggerMocks.error).toHaveBeenCalledWith({
          message: 'prn-summary dispatch validation failed',
          event: {
            action: 'prn_summary_dispatch_validation_failed',
            reason: expect.any(String)
          }
        })
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
          getByText(
            alert,
            /Total revenue should only have 2 digits after the decimal point/
          )
        ).toBeDefined()
      })

      it('should show error when revenue is empty', async ({ server }) => {
        const { cookie, crumb } = await getCsrfToken(server, baseUrl, {
          auth: mockAuth
        })

        const { result } = await server.inject({
          method: 'POST',
          url: baseUrl,
          auth: mockAuth,
          headers: { cookie },
          payload: { crumb, prnRevenue: '', action: 'continue' }
        })

        const { body } = new JSDOM(result).window.document
        const alert = getByRole(body, 'alert')

        expect(
          getByText(
            alert,
            new RegExp(
              `Enter the total revenue of ${subtree.notePlural} issued`
            )
          )
        ).toBeDefined()
      })
    })
  })
})
