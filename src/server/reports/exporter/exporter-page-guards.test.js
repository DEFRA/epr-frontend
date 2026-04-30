import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const { fetchGuardedExporterData } = await import('./exporter-page-guards.js')

const exporterRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'exporter'
}

const reprocessorRegistration = {
  id: 'reg-001',
  wasteProcessingType: 'reprocessor'
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
    period: 1
  },
  auth: { credentials: { idToken: 'mock-id-token' } }
}

describe('exporter shim wires isExporterRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
  })

  it('accepts exporter registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: exporterRegistration,
      accreditation: undefined
    })

    const result = await fetchGuardedExporterData(mockRequest)

    expect(result.registration).toStrictEqual(exporterRegistration)
  })

  it('rejects reprocessor registration with 404', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation: undefined
    })

    await expect(fetchGuardedExporterData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })
})
