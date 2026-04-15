import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const {
  fetchGuardedReprocessorData,
  fetchGuardedAccreditedReprocessorData,
  buildReprocessorViewData
} = await import('./reprocessor-page-guards.js')

const reprocessorRegistration = {
  id: 'reg-001',
  material: 'plastic',
  wasteProcessingType: 'reprocessor',
  registrationNumber: 'REG001234'
}

const exporterRegistration = {
  ...reprocessorRegistration,
  wasteProcessingType: 'exporter'
}

const accreditation = {
  id: 'acc-001',
  accreditationNumber: 'ER992415095748M'
}

const reportDetail = {
  id: 'report-001',
  version: 1,
  status: { currentStatus: 'in_progress' },
  cadence: 'monthly',
  year: 2026,
  period: 1,
  recyclingActivity: {
    tonnageRecycled: null,
    tonnageNotRecycled: null
  },
  prn: {
    issuedTonnage: 91,
    totalRevenue: null,
    freeTonnage: null
  }
}

const mockRequest = {
  params: {
    organisationId: 'org-123',
    registrationId: 'reg-001',
    year: 2026,
    cadence: 'monthly',
    period: 1
  },
  auth: {
    credentials: {
      idToken: 'mock-id-token'
    }
  },
  t: (key) => key,
  localiseUrl: (url) => url
}

describe('#fetchGuardedReprocessorData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns registration, accreditation, and report data for valid reprocessor', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await fetchGuardedReprocessorData(mockRequest)

    expect(result.registration).toStrictEqual(reprocessorRegistration)
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(result.reportDetail).toStrictEqual(reportDetail)
  })

  it('returns data for registered-only reprocessor (no accreditation)', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation: undefined
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await fetchGuardedReprocessorData(mockRequest)

    expect(result.registration).toStrictEqual(reprocessorRegistration)
    expect(result.accreditation).toBeUndefined()
  })

  it('throws 404 for exporter registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: exporterRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    await expect(fetchGuardedReprocessorData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report does not exist', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue({ id: null })

    await expect(fetchGuardedReprocessorData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report is not in_progress', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue({
      ...reportDetail,
      status: { currentStatus: 'ready_to_submit' }
    })

    await expect(fetchGuardedReprocessorData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })
})

describe('#fetchGuardedAccreditedReprocessorData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data for accredited monthly reprocessor', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await fetchGuardedAccreditedReprocessorData(mockRequest)

    expect(result.registration).toStrictEqual(reprocessorRegistration)
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(result.reportDetail).toStrictEqual(reportDetail)
  })

  it('throws 404 for registered-only reprocessor (no accreditation)', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation: undefined
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    await expect(
      fetchGuardedAccreditedReprocessorData(mockRequest)
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 for quarterly cadence', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const quarterlyRequest = {
      ...mockRequest,
      params: { ...mockRequest.params, cadence: 'quarterly' }
    }

    await expect(
      fetchGuardedAccreditedReprocessorData(quarterlyRequest)
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 500 when PRN data is missing', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue({
      ...reportDetail,
      prn: undefined
    })

    await expect(
      fetchGuardedAccreditedReprocessorData(mockRequest)
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 500 })
      })
    )
  })
})

describe('#buildReprocessorViewData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration: reprocessorRegistration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
  })

  it('merges common fields with callback result', async () => {
    const result = await buildReprocessorViewData(
      mockRequest,
      ({ periodPath }) => ({
        pageTitle: 'Test page',
        backUrl: `${periodPath}/previous`,
        defaultValue: 42
      })
    )

    expect(result.pageTitle).toBe('Test page')
    expect(result.deleteUrl).toContain('/delete')
    expect(result.value).toBe(42)
    expect(result.errors).toBeNull()
    expect(result.errorSummary).toBeNull()
  })

  it('uses options.value over defaultValue when provided', async () => {
    const result = await buildReprocessorViewData(
      mockRequest,
      () => ({ defaultValue: 42 }),
      { value: 99 }
    )

    expect(result.value).toBe(99)
  })

  it('passes errors and errorSummary through from options', async () => {
    const errors = { field: { text: 'Error' } }
    const errorSummary = { titleText: 'Error', errorList: [] }

    const result = await buildReprocessorViewData(mockRequest, () => ({}), {
      errors,
      errorSummary
    })

    expect(result.errors).toStrictEqual(errors)
    expect(result.errorSummary).toStrictEqual(errorSummary)
  })

  it('uses accredited guard when accreditedOnly option is true', async () => {
    const result = await buildReprocessorViewData(
      mockRequest,
      () => ({ pageTitle: 'Accredited page' }),
      { accreditedOnly: true }
    )

    expect(result.pageTitle).toBe('Accredited page')
  })
})
