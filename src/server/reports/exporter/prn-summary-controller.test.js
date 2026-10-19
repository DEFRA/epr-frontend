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

const mockCredentials = buildMockAuth().credentials

const mockAuth = { strategy: 'session', credentials: mockCredentials }

const accreditedReprocessor = buildRegistrationWithAccreditation({
  registration: buildRegistrationView({ wasteProcessingType: 'reprocessor' })
})

const reportDetail = {
  operatorCategory: 'REPROCESSOR_ACCREDITED',
  cadence: 'monthly',
  year: 2026,
  period: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  source: { summaryLogId: 'sl-1', lastUploadedAt: '2026-02-15T15:09:00.000Z' },
  details: { material: 'plastic' },
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
    freeTonnage: null,
    averagePricePerTonne: null
  }
}

const baseUrl =
  '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1/prn-summary'

describe('#prnSummaryDispatcher cross-registration routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should dispatch to reprocessor controller for accredited reprocessor', async ({
    server
  }) => {
    vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
      accreditedReprocessor
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: baseUrl,
      auth: mockAuth
    })

    expect(statusCode).toBe(statusCodes.ok)
  })
})
