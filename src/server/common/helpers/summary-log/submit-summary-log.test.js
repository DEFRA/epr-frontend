import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { submitSummaryLog } from './submit-summary-log.js'

const backendUrl = config.get('eprBackendUrl')

describe(submitSummaryLog, () => {
  const keys = {
    organisationNumber: '500118',
    registrationNumber: 'R26ER5001180041PL'
  }
  const summaryLogId = 'log-789'

  test('submits summary log and returns response data', async ({ msw }) => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    /** @type {Request | undefined} */
    let capturedRequest
    msw.use(
      http.post(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789/submit`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json(mockResponse)
        }
      )
    )

    const result = await submitSummaryLog(keys, summaryLogId, 'test-id-token')

    const request = /** @type {Request} */ (capturedRequest)

    expect(request.headers.get('content-type')).toBe('application/json')
    expect(request.headers.get('authorization')).toBe('Bearer test-id-token')
    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async ({
    msw
  }) => {
    msw.use(
      http.post(
        `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/log-789/submit`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      submitSummaryLog(keys, summaryLogId, 'test-id-token')
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
