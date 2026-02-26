import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { submitSummaryLog } from './submit-summary-log.js'

const backendUrl = config.get('eprBackendUrl')

describe(submitSummaryLog, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  test('submits summary log and returns response data', async ({ msw }) => {
    const mockResponse = {
      status: 'submitted',
      accreditationNumber: '493021'
    }

    let capturedRequest
    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789/submit`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json(mockResponse)
        }
      )
    )

    const result = await submitSummaryLog(
      organisationId,
      registrationId,
      summaryLogId,
      'test-id-token'
    )

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async ({
    msw
  }) => {
    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789/submit`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      submitSummaryLog(
        organisationId,
        registrationId,
        summaryLogId,
        'test-id-token'
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
