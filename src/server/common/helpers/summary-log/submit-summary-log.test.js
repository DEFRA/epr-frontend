import fetch from 'node-fetch'
import { StatusCodes } from 'http-status-codes'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { submitSummaryLog } from './submit-summary-log.js'

vi.mock(import('node-fetch'), () => ({
  default: vi.fn()
}))

describe(submitSummaryLog, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should successfully submit summary log and return response data', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await submitSummaryLog(
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789\/submit$/),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('should throw error when backend returns non-ok response', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      statusText: 'Internal Server Error'
    })

    await expect(
      submitSummaryLog(organisationId, registrationId, summaryLogId)
    ).rejects.toThrow('Backend returned 500: Internal Server Error')

    let error
    try {
      await submitSummaryLog(organisationId, registrationId, summaryLogId)
    } catch (err) {
      error = err
    }

    expect(error.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
  })
})
