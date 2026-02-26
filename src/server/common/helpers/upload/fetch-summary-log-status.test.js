import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchSummaryLogStatus, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  test('returns summary log status when backend responds successfully', async ({
    msw
  }) => {
    const mockResponse = {
      status: 'validated',
      validation: null
    }

    let capturedRequest
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json(mockResponse)
        }
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom notFound error when backend returns 404', async ({
    msw
  }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchSummaryLogStatus(organisationId, registrationId, summaryLogId, {
        idToken: 'test-id-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  test('throws Boom error when backend returns other error status', async ({
    msw
  }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

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
