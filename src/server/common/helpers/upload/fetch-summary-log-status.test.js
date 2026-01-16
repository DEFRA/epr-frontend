import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchSummaryLogStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

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
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789$/),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-id-token'
        }
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

    await fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
      uploadId: 'cdp-upload-123',
      idToken: 'test-id-token'
    })

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

    await fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
      idToken: 'test-id-token'
    })

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
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
        idToken: 'test-id-token'
      })
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
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
        idToken: 'test-id-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
