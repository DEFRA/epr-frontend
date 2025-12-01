import fetch from 'node-fetch'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { initiateSummaryLogUpload } from './initiate-summary-log-upload.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

vi.mock(import('#config/config.js'), () => ({
  config: {
    get: vi.fn().mockReturnValue('http://backend.test')
  }
}))

describe('initiateSummaryLogUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls backend summary-logs endpoint with redirectUrl', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        summaryLogId: 'sl-123',
        uploadId: 'up-456',
        uploadUrl: 'http://cdp/upload',
        statusUrl: 'http://cdp/status'
      })
    })

    await initiateSummaryLogUpload({
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path'
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://backend.test/v1/organisations/org-123/registrations/reg-456/summary-logs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: '/redirect/path' })
      }
    )
  })

  test('returns summaryLogId, uploadId, uploadUrl, and statusUrl from response', async () => {
    const mockResponse = {
      summaryLogId: 'sl-789',
      uploadId: 'up-101',
      uploadUrl: 'http://cdp/upload/up-101',
      statusUrl: 'http://cdp/status/up-101'
    }

    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await initiateSummaryLogUpload({
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path'
    })

    expect(result).toEqual(mockResponse)
  })

  test('throws error when backend returns non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      initiateSummaryLogUpload({
        organisationId: 'org-123',
        registrationId: 'reg-456',
        redirectUrl: '/redirect/path'
      })
    ).rejects.toThrow('Backend returned 500: Internal Server Error')
  })
})
