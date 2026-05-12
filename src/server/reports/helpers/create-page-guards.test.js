import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { fetchReportDetail } from '#server/reports/helpers/fetch-report-detail.js'

/**
 * @import {Accreditation} from '#domain/organisations/accreditation.js'
 * @import {Registration} from '#domain/organisations/registration.js'
 * @import {RegistrationWithAccreditation} from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
 * @import {HapiRequest} from '#server/common/hapi-types.js'
 * @import {PeriodParams} from '#server/reports/helpers/period-params-schema.js'
 * @import {ReportDetailResponse} from '#server/reports/helpers/fetch-report-detail.js'
 */

vi.mock(
  import('#server/common/helpers/organisations/fetch-registration-and-accreditation.js')
)
vi.mock(import('#server/reports/helpers/fetch-report-detail.js'))

const { createPageGuards } = await import('./create-page-guards.js')

const asRegistration = (/** @type {object} */ value) =>
  /** @type {Registration} */ (/** @type {unknown} */ (value))
const asAccreditation = (/** @type {object} */ value) =>
  /** @type {Accreditation} */ (/** @type {unknown} */ (value))
const asReportDetail = (/** @type {object} */ value) =>
  /** @type {ReportDetailResponse} */ (/** @type {unknown} */ (value))
const asRegWithAcc = (/** @type {object} */ value) =>
  /** @type {RegistrationWithAccreditation} */ (/** @type {unknown} */ (value))
const asGuardedRequest = (/** @type {object} */ value) =>
  /** @type {HapiRequest & { params: PeriodParams }} */ (
    /** @type {unknown} */ (value)
  )

const guards = createPageGuards({
  isMatchingRegistration: () => true,
  reportType: 'exporter'
})
const rejectingGuards = createPageGuards({
  isMatchingRegistration: () => false,
  reportType: 'exporter'
})

const registration = asRegistration({
  id: 'reg-001',
  material: 'plastic',
  wasteProcessingType: 'exporter',
  registrationNumber: 'REG001234'
})

const accreditation = asAccreditation({
  id: 'acc-001',
  accreditationNumber: 'ER992415095748M'
})

const reportDetail = asReportDetail({
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
})

const mockRequest = asGuardedRequest({
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
  t: (/** @type {string} */ key) => key,
  localiseUrl: (/** @type {string} */ url) => url
})

describe('#fetchGuardedData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns registration, accreditation, and report data when predicate matches', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation })
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await guards.fetchGuardedData(mockRequest)

    expect(result.registration).toStrictEqual(registration)
    expect(result.accreditation).toStrictEqual(accreditation)
    expect(result.reportDetail).toStrictEqual(reportDetail)
  })

  it('returns data when accreditation is absent (registered-only)', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation: undefined })
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    const result = await guards.fetchGuardedData(mockRequest)

    expect(result.registration).toStrictEqual(registration)
    expect(result.accreditation).toBeUndefined()
  })

  it('throws 404 when predicate rejects the registration', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation })
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(reportDetail)

    await expect(rejectingGuards.fetchGuardedData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report does not exist', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation })
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(asReportDetail({ id: null }))

    await expect(guards.fetchGuardedData(mockRequest)).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 when report is not in_progress', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation })
    )
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetail({
        ...reportDetail,
        status: { currentStatus: 'ready_to_submit' }
      })
    )

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
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation })
    )
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

  it('uses accredited guard when accreditedOnly option is true', async () => {
    const result = await guards.buildViewData(
      mockRequest,
      () => ({ pageTitle: 'Accredited page' }),
      { accreditedOnly: true }
    )

    expect(result.pageTitle).toBe('Accredited page')
  })

  it('throws 404 with accreditedOnly when accreditation is absent', async () => {
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation: undefined })
    )

    await expect(
      guards.buildViewData(mockRequest, () => ({}), { accreditedOnly: true })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 404 })
      })
    )
  })

  it('throws 404 with accreditedOnly for quarterly cadence', async () => {
    const quarterlyRequest = asGuardedRequest({
      ...mockRequest,
      params: { ...mockRequest.params, cadence: 'quarterly' }
    })

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
    vi.mocked(fetchReportDetail).mockResolvedValue(
      asReportDetail({ ...reportDetail, prn: undefined })
    )

    await expect(
      guards.buildViewData(mockRequest, () => ({}), { accreditedOnly: true })
    ).rejects.toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 500 })
      })
    )
  })

  it('passes period in callback context', async () => {
    /** @type {{ period: number } | undefined} */
    let receivedCtx
    await guards.buildViewData(mockRequest, (ctx) => {
      receivedCtx = ctx
      return {}
    })

    expect(receivedCtx?.period).toBe(1)
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
    vi.mocked(fetchRegistrationAndAccreditation).mockResolvedValue(
      asRegWithAcc({ registration, accreditation: undefined })
    )

    const result = await guards.buildViewData(
      mockRequest,
      () => ({ pageTitle: 'Registered-only page' }),
      { registeredOnly: true }
    )

    expect(result.pageTitle).toBe('Registered-only page')
  })
})
