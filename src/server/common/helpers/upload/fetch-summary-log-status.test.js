import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

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

describe(fetchSummaryLogStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'
  const mockRequest = createMockRequest({ token: 'test-token' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns summary log status when backend responds successfully', async () => {
    const mockResponse = {
      status: 'validated',
      validation: null
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await fetchSummaryLogStatus(
      mockRequest,
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789$/),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        })
      })
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('includes uploadId as query parameter when provided', async () => {
    const mockResponse = {
      status: 'preprocessing',
      validation: null
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    await fetchSummaryLogStatus(
      mockRequest,
      organisationId,
      registrationId,
      summaryLogId,
      {
        uploadId: 'cdp-upload-123'
      }
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/summary-logs\/log-789\?uploadId=cdp-upload-123$/
      ),
      expect.objectContaining({
        method: 'GET'
      })
    )
  })

  test('does not include uploadId query parameter when not provided', async () => {
    const mockResponse = {
      status: 'validated',
      validation: null
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    await fetchSummaryLogStatus(
      mockRequest,
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789$/),
      expect.any(Object)
    )
  })

  test('throws Boom notFound error when backend returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchSummaryLogStatus(
        mockRequest,
        organisationId,
        registrationId,
        summaryLogId
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error when backend returns other error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchSummaryLogStatus(
        mockRequest,
        organisationId,
        registrationId,
        summaryLogId
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
