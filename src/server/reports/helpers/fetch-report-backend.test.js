import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SummaryLogChangedError } from './summary-log-changed.js'

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

  it('throws SummaryLogChangedError when backend returns 409 with summary_log_changed code', async () => {
    const boom = {
      output: { statusCode: 409, payload: { code: 'summary_log_changed' } }
    }
    mockFetchJson.mockRejectedValue(boom)

    await expect(
      fetchReportBackend('/v1/reports/1', { method: 'GET' })
    ).rejects.toBeInstanceOf(SummaryLogChangedError)
  })

  it('sets the reason on the thrown SummaryLogChangedError', async () => {
    const boom = {
      output: { statusCode: 409, payload: { code: 'summary_log_changed' } }
    }
    mockFetchJson.mockRejectedValue(boom)

    const err = await fetchReportBackend('/v1/reports/1', {
      method: 'GET'
    }).catch((e) => e)

    expect(err.reason).toBe('summary_log_changed')
  })

  it('rethrows a 409 without the expected code unchanged', async () => {
    const boom = {
      output: { statusCode: 409, payload: { code: 'version_conflict' } }
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
