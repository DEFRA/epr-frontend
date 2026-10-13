import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { getCsrfToken } from '#server/common/test-helpers/csrf-helper.js'
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
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { ReportDetailResponse } from '#server/reports/helpers/fetch-report-detail.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const mockAuth = buildMockAuth()

const registrationPath = '/organisations/500001/registrations/R25SR500030912PA'
const periodBase = `${registrationPath}/reports/2026/quarterly/1/submissions/1`
const accreditedPeriodBase = `${registrationPath}/accreditations/2026/reports/monthly/1/submissions/1`
const detailUrl = periodBase

/** @type {RegistrationWithAccreditation} */
const mockRegistration = {
  organisationData: /** @type {Organisation} */ ({ id: 'org-123' }),
  registration: /** @type {RegistrationApproved} */ ({
    id: 'reg-001',
    material: 'plastic',
    wasteProcessingType: 'reprocessor',
    registrationNumber: 'R25SR500030912PA'
  }),
  accreditation: undefined
}

/** @type {RegistrationWithAccreditation} */
const mockAccreditedRegistration = {
  ...mockRegistration,
  accreditation: /** @type {Accreditation} */ ({ id: 'acc-001' })
}

describe('reports plugin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is 404 for a quarterly report under the accredited base', async ({
    server
  }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: `${registrationPath}/accreditations/2026/reports/quarterly/1/submissions/1/view`,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(fetchReportDetail).not.toHaveBeenCalled()
  })

  it('keeps a page payload validation on the accredited base', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      mockAccreditedRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      /** @type {ReportDetailResponse} */ ({ status: 'in_progress' })
    )

    const url = `${accreditedPeriodBase}/supporting-information`
    const { cookie, crumb } = await getCsrfToken(server, url, {
      auth: mockAuth
    })

    const { statusCode, result } = await server.inject({
      method: 'POST',
      url,
      auth: mockAuth,
      headers: { cookie },
      payload: {
        supportingInformation: 'x'.repeat(1001),
        action: 'save',
        crumb
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('govuk-error-summary')
  })
})

describe('a monthly report URL on the registered-only base', () => {
  const oldBase = `${registrationPath}/reports/2026/monthly/1/submissions/1`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.for([
    '',
    '/view',
    '/check-your-answers',
    '/delete',
    '/tonnes-recycled',
    '/report-stale-error'
  ])('sends "%s" on to the accredited base', async (suffix, { server }) => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `${oldBase}${suffix}`,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${accreditedPeriodBase}${suffix}`)
    expect(fetchReportDetail).not.toHaveBeenCalled()
  })

  it('keeps Welsh and the query string', async ({ server }) => {
    const { headers } = await server.inject({
      method: 'GET',
      url: `/cy${oldBase}/view?tab=x`,
      auth: mockAuth
    })

    expect(headers.location).toBe(`/cy${accreditedPeriodBase}/view?tab=x`)
  })

  it('sends a POST on with a 307', async ({ server }) => {
    const { cookie, crumb } = await getCsrfToken(server, `${oldBase}/view`, {
      auth: mockAuth
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: `${oldBase}/supporting-information`,
      auth: mockAuth,
      headers: { cookie },
      payload: { action: 'save', crumb }
    })

    expect(statusCode).toBe(statusCodes.temporaryRedirect)
    expect(headers.location).toBe(
      `${accreditedPeriodBase}/supporting-information`
    )
  })

  it('is 400 for a year that is not a number', async ({ server }) => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: `${registrationPath}/reports/twenty/monthly/1/submissions/1/view`,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.badRequest)
  })
})

describe('reports plugin onPreResponse lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      mockRegistration
    )
  })

  it('redirects a stale monthly report to report-stale-error on the accredited base', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      mockAccreditedRegistration
    )
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new ReportStaleError([STALE_REASON.SUMMARY_LOG_CHANGED])
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: accreditedPeriodBase,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${accreditedPeriodBase}/report-stale-error`)
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
