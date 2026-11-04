import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import {
  buildRegistrationView,
  buildRegistrationWithAccreditation
} from '#server/common/test-helpers/organisation-view-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-with-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const { fetchGuardedExporterData } = await import('./exporter-page-guards.js')

const exporterRegistration = buildRegistrationView()

const reprocessorRegistration = buildRegistrationView({
  wasteProcessingType: 'reprocessor'
})

const reportDetail = {
  status: 'in_progress'
}

const mockRequest = {
  params: {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: 'monthly',
    period: 1,
    submissionNumber: 1
  },
  auth: { credentials: { backendToken: 'mock-backend-token' } }
}

describe('exporter shim wires isExporterRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )
  })

  it('accepts exporter registration', async () => {
    vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
      buildRegistrationWithAccreditation({ registration: exporterRegistration })
    )

    const result = await fetchGuardedExporterData(mockRequest)

    expect(result.registration).toStrictEqual(exporterRegistration)
  })

  it('rejects reprocessor registration with 404', async () => {
    vi.mocked(fetchRegistrationWithAccreditation).mockResolvedValue(
      buildRegistrationWithAccreditation({
        registration: reprocessorRegistration
      })
    )

    await expect(fetchGuardedExporterData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })
})
