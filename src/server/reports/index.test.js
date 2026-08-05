import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import {
  ReportStaleError,
  STALE_REASON
} from '#server/reports/helpers/stale.js'
import { it } from '#vite/fixtures/server.js'
import { beforeEach, describe, expect, vi } from 'vitest'

/**
 * @import { RegistrationApproved } from '#domain/organisations/registration.js'
 * @import { Organisation } from '#domain/organisations/model.js'
 * @import { RegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const mockAuth = buildMockAuth()

const organisationId = 'org-123'
const registrationId = 'reg-001'
const year = 2026
const cadence = 'quarterly'
const period = 1
const submissionNumber = 1
const periodBase = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`
const detailUrl = periodBase

/** @type {RegistrationWithAccreditation} */
const mockRegistration = {
  organisationData: /** @type {Organisation} */ ({ id: organisationId }),
  registration: /** @type {RegistrationApproved} */ ({
    id: registrationId,
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'REG001234'
  }),
  accreditation: undefined
}

describe('reports plugin onPreResponse lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      mockRegistration
    )
  })

  it('redirects to report-stale-error when ReportStaleError is thrown with a summary-log reason', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${periodBase}/report-stale-error`)
  })

  it('redirects to report-stale-error when ReportStaleError is thrown with a PRN-cancelled reason', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new ReportStaleError([STALE_REASON.PRN_CANCELLED])
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${periodBase}/report-stale-error`)
  })

  it('redirects to report-stale-error when ReportStaleError is thrown with both reasons', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new ReportStaleError([
        STALE_REASON.SUMMARY_LOG_CHANGED,
        STALE_REASON.PRN_CANCELLED
      ])
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${periodBase}/report-stale-error`)
  })

  it('does not redirect for unrelated errors', async ({ server }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      Object.assign(new Error('Server error'), {
        isBoom: true,
        output: { statusCode: 500 }
      })
    )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
  })

  it('does not redirect when ReportStaleError carries no reasons', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(new ReportStaleError([]))

    const { statusCode } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).not.toBe(statusCodes.found)
  })
})
