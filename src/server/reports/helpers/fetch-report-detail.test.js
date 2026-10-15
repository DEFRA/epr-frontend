import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchReportDetail } from './fetch-report-detail.js'
import { ReportStaleError, STALE_REASON } from './stale.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend: fetchJsonFromBackendRaw } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const fetchJsonFromBackend = vi.mocked(fetchJsonFromBackendRaw)

describe(fetchReportDetail, () => {
  const keys = {
    organisationNumber: '500001',
    registrationNumber: 'R25SR500030912PA',
    year: 2026,
    cadence: /** @type {const} */ ('quarterly'),
    period: 1,
    submissionNumber: 1
  }
  const backendToken = 'test-token'

  const mockResponse = {
    cadence: 'quarterly',
    year: 2026,
    period: 1,
    submissionNumber: 1,
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'not_started',
    canRequestResubmission: false,
    source: {
      summaryLogId: 'sl-1',
      lastUploadedAt: '2026-02-15T15:09:00.000Z'
    },
    recyclingActivity: {
      suppliers: [],
      totalTonnageReceived: 80.25
    },
    wasteSent: {
      tonnageSentToReprocessor: 1.0,
      tonnageSentToExporter: 0.0,
      tonnageSentToAnotherSite: 0.0,
      finalDestinations: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads a quarterly report from the registered-only natural-key route', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportDetail(keys, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/reports/2026/quarterly/1/submissions/1',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token'
        }
      }
    )
  })

  it('reads a monthly report from the accredited natural-key route', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    await fetchReportDetail({ ...keys, cadence: 'monthly' }, backendToken)

    expect(fetchJsonFromBackend).toHaveBeenCalledWith(
      '/organisations/500001/registrations/R25SR500030912PA/accreditations/2026/reports/monthly/1/submissions/1',
      expect.any(Object)
    )
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    fetchJsonFromBackend.mockResolvedValue(mockResponse)

    const result = await fetchReportDetail(keys, backendToken)

    expect(result).toStrictEqual(mockResponse)
  })

  it('propagates errors from fetchJsonFromBackend', async () => {
    const error = new Error('Network error')
    fetchJsonFromBackend.mockRejectedValue(error)

    await expect(fetchReportDetail(keys, backendToken)).rejects.toThrow(
      'Network error'
    )
  })

  it('throws ReportStaleError when the report is stale', async () => {
    fetchJsonFromBackend.mockResolvedValue({
      ...mockResponse,
      stale: {
        summaryLogChanged: { uploadedAt: '2026-06-01T00:00:00.000Z' }
      }
    })

    await expect(fetchReportDetail(keys, backendToken)).rejects.toBeInstanceOf(
      ReportStaleError
    )
  })

  it('sets reasons on the thrown ReportStaleError for a summary-log-changed report', async () => {
    fetchJsonFromBackend.mockResolvedValue({
      ...mockResponse,
      stale: {
        summaryLogChanged: { uploadedAt: '2026-06-01T00:00:00.000Z' }
      }
    })

    const err = await fetchReportDetail(keys, backendToken).catch((e) => e)

    expect(err.reasons).toStrictEqual([STALE_REASON.SUMMARY_LOG_CHANGED])
  })

  it('sets reasons on the thrown ReportStaleError for a PRN-cancelled report', async () => {
    fetchJsonFromBackend.mockResolvedValue({
      ...mockResponse,
      stale: {
        prnCancelled: { occurredAt: '2026-06-01T00:00:00.000Z' }
      }
    })

    const err = await fetchReportDetail(keys, backendToken).catch((e) => e)

    expect(err.reasons).toStrictEqual([STALE_REASON.PRN_CANCELLED])
  })

  it('sets both reasons on the thrown ReportStaleError when both apply', async () => {
    fetchJsonFromBackend.mockResolvedValue({
      ...mockResponse,
      stale: {
        summaryLogChanged: { uploadedAt: '2026-06-01T00:00:00.000Z' },
        prnCancelled: { occurredAt: '2026-06-01T00:00:00.000Z' }
      }
    })

    const err = await fetchReportDetail(keys, backendToken).catch((e) => e)

    expect(err.reasons).toStrictEqual([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
  })

  it('returns the report normally when stale is present but carries no recognised reason', async () => {
    const staleResponse = {
      ...mockResponse,
      stale: { uploadedAt: '2026-06-01T00:00:00.000Z' }
    }
    fetchJsonFromBackend.mockResolvedValue(staleResponse)

    const result = await fetchReportDetail(keys, backendToken)

    expect(result).toStrictEqual(staleResponse)
  })
})
