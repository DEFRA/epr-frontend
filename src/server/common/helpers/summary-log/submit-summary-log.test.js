import { beforeEach, describe, expect, test, vi } from 'vitest'

import { submitSummaryLog } from './submit-summary-log.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('submitSummaryLog', () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('submits summary log and returns response data', async () => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse)
    })

    const result = await submitSummaryLog(
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789\/submit$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    )
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
      submitSummaryLog(organisationId, registrationId, summaryLogId)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
