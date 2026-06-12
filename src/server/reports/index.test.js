import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { SummaryLogChangedError } from '#server/reports/helpers/summary-log-changed.js'
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

  it('redirects to summary-log-changed-error when SummaryLogChangedError is thrown', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new SummaryLogChangedError('summary_log_changed')
    )

    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.found)
    expect(headers.location).toBe(`${periodBase}/summary-log-changed-error`)
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

  it('does not redirect when the reason is not in INVALIDATION_ERROR_ROUTES', async ({
    server
  }) => {
    vi.mocked(fetchReportDetail).mockRejectedValue(
      new SummaryLogChangedError('unknown_reason')
    )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: detailUrl,
      auth: mockAuth
    })

    expect(statusCode).not.toBe(statusCodes.found)
  })
})
