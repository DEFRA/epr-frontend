import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { initiateSummaryLogUpload } from './initiate-summary-log-upload.js'

const backendUrl = config.get('eprBackendUrl')

describe(initiateSummaryLogUpload, () => {
  test('calls backend summary-logs endpoint with redirectUrl', async ({
    msw
  }) => {
    let capturedRequest
    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs`,
        async ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            summaryLogId: 'sl-123',
            uploadId: 'up-456',
            uploadUrl: 'http://cdp/upload',
            statusUrl: 'http://cdp/status'
          })
        }
      )
    )

    await initiateSummaryLogUpload({
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path',
      idToken: 'test-id-token'
    })

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
    await expect(capturedRequest.json()).resolves.toStrictEqual({
      redirectUrl: '/redirect/path'
    })
  })

  test('returns summaryLogId, uploadId, uploadUrl, and statusUrl from response', async ({
    msw
  }) => {
    const mockResponse = {
      summaryLogId: 'sl-789',
      uploadId: 'up-101',
      uploadUrl: 'http://cdp/upload/up-101',
      statusUrl: 'http://cdp/status/up-101'
    }

    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs`,
        () => HttpResponse.json(mockResponse)
      )
    )

    const result = await initiateSummaryLogUpload({
      organisationId: 'org-123',
      registrationId: 'reg-456',
      redirectUrl: '/redirect/path',
      idToken: 'test-id-token'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async ({
    msw
  }) => {
    msw.use(
      http.post(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      initiateSummaryLogUpload({
        organisationId: 'org-123',
        registrationId: 'reg-456',
        redirectUrl: '/redirect/path',
        idToken: 'test-id-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
