import { describe, expect, test, vi, beforeEach } from 'vitest'

import { initiateSummaryLogUpload } from './initiate-summary-log-upload.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(initiateSummaryLogUpload, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls backend summary-logs endpoint with redirectUrl', async () => {
    mockFetch.mockResolvedValue({
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

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/v1/organisations/org-123/registrations/reg-456/summary-logs'
      ),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: '/redirect/path' })
      })
    )
  })

  test('returns summaryLogId, uploadId, uploadUrl, and statusUrl from response', async () => {
    const mockResponse = {
      summaryLogId: 'sl-789',
      uploadId: 'up-101',
      uploadUrl: 'http://cdp/upload/up-101',
      statusUrl: 'http://cdp/status/up-101'
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await initiateSummaryLogUpload({
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      initiateSummaryLogUpload({
        organisationId: 'org-123',
        registrationId: 'reg-456',
        redirectUrl: '/redirect/path'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
