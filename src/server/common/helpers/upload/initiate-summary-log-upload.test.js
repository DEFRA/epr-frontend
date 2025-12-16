import { describe, expect, test, vi, beforeEach } from 'vitest'

import { initiateSummaryLogUpload } from './initiate-summary-log-upload.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/**
 * Creates a mock Hapi request object
 * @param {object} [options]
 * @param {string} [options.token] - Auth token to include in credentials
 * @returns {object} Mock request object
 */
const createMockRequest = (options = {}) => ({
  auth: {
    credentials: options.token ? { token: options.token } : undefined
  }
})

describe(initiateSummaryLogUpload, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls backend summary-logs endpoint with redirectUrl', async () => {
    const mockRequest = createMockRequest({ token: 'test-token' })

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        summaryLogId: 'sl-123',
        uploadId: 'up-456',
        uploadUrl: 'http://cdp/upload',
        statusUrl: 'http://cdp/status'
      })
    })

    await initiateSummaryLogUpload(mockRequest, {
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
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({ redirectUrl: '/redirect/path' })
      })
    )
  })

  test('returns summaryLogId, uploadId, uploadUrl, and statusUrl from response', async () => {
    const mockRequest = createMockRequest({ token: 'test-token' })
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

    const result = await initiateSummaryLogUpload(mockRequest, {
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async () => {
    const mockRequest = createMockRequest({ token: 'test-token' })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      initiateSummaryLogUpload(mockRequest, {
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
