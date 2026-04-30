import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const { createPageGuards } = await import('./create-page-guards.js')

const guards = createPageGuards({ isMatchingRegistration: () => true })
const rejectingGuards = createPageGuards({
  isMatchingRegistration: () => false
})

const registration = {
  id: 'reg-001',
  material: 'plastic',
  wasteProcessingType: 'exporter',
  registrationNumber: 'REG001234'
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

describe('#fetchGuardedData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns registration, accreditation, and report data when predicate matches', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await guards.fetchGuardedData(mockRequest)

    expect(result.registration).toStrictEqual(registration)
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(result.reportDetail).toStrictEqual(reportDetail)
  })

  it('returns data when accreditation is absent (registered-only)', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation: undefined
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await guards.fetchGuardedData(mockRequest)

    expect(result.registration).toStrictEqual(registration)
    expect(result.accreditation).toBeUndefined()
  })

  it('throws 404 when predicate rejects the registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    await expect(rejectingGuards.fetchGuardedData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report does not exist', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue({ id: null })

    await expect(guards.fetchGuardedData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report is not in_progress', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue({
      ...reportDetail,
      status: { currentStatus: 'ready_to_submit' }
    })

    await expect(guards.fetchGuardedData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })
})

describe('#buildViewData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation
    })
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)
  })

  it('merges common fields with callback result', async () => {
    const result = await guards.buildViewData(
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
    const result = await guards.buildViewData(
      mockRequest,
      () => ({ defaultValue: 42 }),
      { value: 99 }
    )

    expect(result.value).toBe(99)
  })

  it('passes errors and errorSummary through from options', async () => {
    const errors = { field: { text: 'Error' } }
    const errorSummary = { titleText: 'Error', errorList: [] }

    const result = await guards.buildViewData(mockRequest, () => ({}), {
      errors,
      errorSummary
    })

    expect(result.errors).toStrictEqual(errors)
    expect(result.errorSummary).toStrictEqual(errorSummary)
  })

  it('uses accredited guard when accreditedOnly option is true', async () => {
    const result = await guards.buildViewData(
      mockRequest,
      () => ({ pageTitle: 'Accredited page' }),
      { accreditedOnly: true }
    )

    expect(result.pageTitle).toBe('Accredited page')
  })

  it('throws 404 with accreditedOnly when accreditation is absent', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation: undefined
    })

    await expect(
      guards.buildViewData(mockRequest, () => ({}), { accreditedOnly: true })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 with accreditedOnly for quarterly cadence', async () => {
    const quarterlyRequest = {
      ...mockRequest,
      params: { ...mockRequest.params, cadence: 'quarterly' }
    }

    await expect(
      guards.buildViewData(quarterlyRequest, () => ({}), {
        accreditedOnly: true
      })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 500 with accreditedOnly when PRN data is missing', async () => {
    vi.mocked(fetchReportDetail).mockResolvedValue({
      ...reportDetail,
      prn: undefined
    })

    await expect(
      guards.buildViewData(mockRequest, () => ({}), { accreditedOnly: true })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 500 })
      })
    )
  })

  it('passes period in callback context', async () => {
    let receivedCtx
    await guards.buildViewData(mockRequest, (ctx) => {
      receivedCtx = ctx
      return {}
    })

    expect(receivedCtx.period).toBe(1)
  })

  it('throws 404 when registeredOnly is true and accreditation is present', async () => {
    await expect(
      guards.buildViewData(mockRequest, () => ({}), { registeredOnly: true })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('succeeds when registeredOnly is true and no accreditation', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue({
      registration,
      accreditation: undefined
    })

    const result = await guards.buildViewData(
      mockRequest,
      () => ({ pageTitle: 'Registered-only page' }),
      { registeredOnly: true }
    )

    expect(result.pageTitle).toBe('Registered-only page')
  })
})
