import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditationByNumber } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
import { asReportDetailResponse } from '#server/common/test-helpers/report-fixtures.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const { fetchGuardedReprocessorData } =
  await import('./reprocessor-page-guards.js')

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor'
}

const exporterRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'exporter'
}

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

describe('reprocessor shim wires isReprocessorRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetailResponse(reportDetail)
    )
  })

  it('accepts reprocessor registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      asRegistrationWithAccreditation({
        registration: reprocessorRegistration,
        accreditation: undefined
      })
    )

    const result = await fetchGuardedReprocessorData(mockRequest)

    expect(result.registration).toStrictEqual(reprocessorRegistration)
  })

  it('rejects exporter registration with 404', async () => {
    vi.mocked(fetchRegistrationAndAccreditationByNumber).mockResolvedValue(
      asRegistrationWithAccreditation({
        registration: exporterRegistration,
        accreditation: undefined
      })
    )

    await expect(fetchGuardedReprocessorData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })
})
