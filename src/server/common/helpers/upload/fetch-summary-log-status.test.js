import fetch from 'node-fetch'
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

describe(fetchSummaryLogStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should successfully fetch summary log status', async () => {
    const mockResponse = {
      status: 'validated',
      failureReason: null
    }

    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789$/),
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('should throw error when backend returns non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: StatusCodes.NOT_FOUND,
      statusText: 'Not Found'
    })

    await expect(
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId)
    ).rejects.toThrow('Backend returned 404: Not Found')

    let error
    try {
      await fetchSummaryLogStatus(organisationId, registrationId, summaryLogId)
    } catch (err) {
      error = err
    }

    expect(error.status).toBe(StatusCodes.NOT_FOUND)
  })
})
