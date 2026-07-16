import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportStaleError, STALE_REASON } from './stale.js'

vi.mock(import('#server/common/helpers/fetch-json-from-backend.js'), () => ({
  fetchJsonFromBackend: vi.fn()
}))

const { fetchJsonFromBackend } =
  await import('#server/common/helpers/fetch-json-from-backend.js')
const { fetchReportBackend } = await import('./fetch-report-backend.js')

const mockFetchJson = vi.mocked(fetchJsonFromBackend)

describe('fetchReportBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to fetchJsonFromBackend with the same arguments', async () => {
    mockFetchJson.mockResolvedValue({ id: 'report-1' })

    await fetchReportBackend('/v1/reports/1', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' }
    })

    expect(mockFetchJson).toHaveBeenCalledWith('/v1/reports/1', {
      method: 'GET',
      headers: { Authorization: 'Bearer token' }
    })
  })

  it('returns the response from fetchJsonFromBackend', async () => {
    const mockResponse = { id: 'report-1' }
    mockFetchJson.mockResolvedValue(mockResponse)

    const result = await fetchReportBackend('/v1/reports/1', { method: 'GET' })

    expect(result).toStrictEqual(mockResponse)
  })

  it('throws ReportStaleError when backend returns 409 with a summary-log-changed code', async () => {
    const boom = {
      output: {
        statusCode: 409,
        payload: { code: [STALE_REASON.SUMMARY_LOG_CHANGED] }
      }
    }
    mockFetchJson.mockRejectedValue(boom)

    await expect(
      fetchReportBackend('/v1/reports/1', { method: 'GET' })
    ).rejects.toBeInstanceOf(ReportStaleError)
  })

  it('sets the reasons on the thrown ReportStaleError', async () => {
    const boom = {
      output: {
        statusCode: 409,
        payload: {
          code: [STALE_REASON.SUMMARY_LOG_CHANGED, STALE_REASON.PRN_CANCELLED]
        }
      }
    }
    mockFetchJson.mockRejectedValue(boom)

    const err = await fetchReportBackend('/v1/reports/1', {
      method: 'GET'
    }).catch((e) => e)

    expect(err.reasons).toStrictEqual([
      STALE_REASON.SUMMARY_LOG_CHANGED,
      STALE_REASON.PRN_CANCELLED
    ])
  })

  it('converts a 409 with a bare-string code into a ReportStaleError, for backward compatibility with a pre-PAE-1698 backend', async () => {
    const boom = {
      output: {
        statusCode: 409,
        payload: { code: STALE_REASON.SUMMARY_LOG_CHANGED }
      }
    }
    mockFetchJson.mockRejectedValue(boom)

    const err = await fetchReportBackend('/v1/reports/1', {
      method: 'PATCH'
    }).catch((e) => e)

    expect(err).toBeInstanceOf(ReportStaleError)
    expect(err.reasons).toStrictEqual([STALE_REASON.SUMMARY_LOG_CHANGED])
  })

  it('rethrows a 409 with no code unchanged', async () => {
    const boom = {
      output: { statusCode: 409, payload: {} }
    }
    mockFetchJson.mockRejectedValue(boom)

    await expect(
      fetchReportBackend('/v1/reports/1', { method: 'PATCH' })
    ).rejects.toBe(boom)
  })

  it('rethrows a 409 whose code is not a recognised stale reason unchanged', async () => {
    const boom = {
      output: { statusCode: 409, payload: { code: ['version_conflict'] } }
    }
    mockFetchJson.mockRejectedValue(boom)

    await expect(
      fetchReportBackend('/v1/reports/1', { method: 'PATCH' })
    ).rejects.toBe(boom)
  })

  it('rethrows non-409 errors unchanged', async () => {
    const networkError = new Error('Network error')
    mockFetchJson.mockRejectedValue(networkError)

    await expect(
      fetchReportBackend('/v1/reports/1', { method: 'GET' })
    ).rejects.toThrow('Network error')
  })
})
