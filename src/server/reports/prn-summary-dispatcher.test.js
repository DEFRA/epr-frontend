import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import {
  buildRegistrationView,
  buildRegistrationWithAccreditation
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'
import { buildMockAuth } from '#server/common/test-helpers/auth-helper.js'
import { it } from '#vite/fixtures/server.js'
import { beforeEach, describe, expect, vi } from 'vitest'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))
vi.mock(import('./helpers/update-report.js'))

const mockAuth = buildMockAuth()

const exporterRegistration = buildRegistrationWithAccreditation()

const reprocessorRegistration = buildRegistrationWithAccreditation({
  registration: buildRegistrationView({ wasteProcessingType: 'reprocessor' })
})

const reportDetail = {
  version: 1,
  status: 'in_progress',
  prn: {
    issuedTonnage: 91,
    totalRevenue: null,
    freeTonnage: null
  }
}

const organisationNumber = '500001'
const registrationNumber = 'R25SR500030912PA'
const baseUrl = `/organisations/${organisationNumber}/registrations/${registrationNumber}/accreditations/2026/reports/monthly/1/submissions/1/prn-summary`

describe('#prnSummaryDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should dispatch to exporter controller for exporter registration', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
      exporterRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('PERNs issued')
  })

  it('should dispatch to reprocessor controller for reprocessor registration', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
      reprocessorRegistration
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('PRNs issued')
  })
})
