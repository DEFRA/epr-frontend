import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { asRegistrationWithAccreditation } from '#server/common/test-helpers/organisation-fixtures.js'
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
  id: 'report-001',
  status: { currentStatus: 'in_progress' }
}

const mockRequest = {
  params: {
    organisationId: 'org-123',
    registrationId: 'reg-001',
    year: 2026,
    cadence: 'monthly',
    period: 1,
    submissionNumber: 1
  },
  auth: { credentials: { idToken: 'mock-id-token' } }
}

describe('reprocessor shim wires isReprocessorRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
  })

  it('accepts reprocessor registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegistrationWithAccreditation({
        registration: reprocessorRegistration,
        accreditation: undefined
      })
    )

    const result = await fetchGuardedReprocessorData(mockRequest)

    expect(result.registration).toStrictEqual(reprocessorRegistration)
  })

  it('rejects exporter registration with 404', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
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
