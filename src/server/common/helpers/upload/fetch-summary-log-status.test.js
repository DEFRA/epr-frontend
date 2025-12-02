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
      failureReason: null
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789$/),
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom notFound error when backend returns 404', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map()
    })

    await expect(
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId)
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
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
