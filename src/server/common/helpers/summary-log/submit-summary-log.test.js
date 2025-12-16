import { beforeEach, describe, expect, test, vi } from 'vitest'

import { submitSummaryLog } from './submit-summary-log.js'

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

describe(submitSummaryLog, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'
  const mockRequest = createMockRequest({ token: 'test-token' })

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
      mockRequest,
      organisationId,
      registrationId,
      summaryLogId
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/summary-logs\/log-789\/submit$/),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        })
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
      submitSummaryLog(
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
