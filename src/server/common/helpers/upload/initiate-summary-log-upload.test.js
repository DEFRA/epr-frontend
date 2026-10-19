import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { initiateSummaryLogUpload } from './initiate-summary-log-upload.js'

const backendUrl = config.get('eprBackendUrl')

const keys = {
  organisationNumber: '500118',
  registrationNumber: 'R26ER5001180041PL'
}
const registered = `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/summary-logs/2026`
const accredited = `${backendUrl}/organisations/500118/registrations/R26ER5001180041PL/accreditations/2026/summary-log`

describe(initiateSummaryLogUpload, () => {
  test.for([
    { kind: 'registered-only', isAccredited: false, url: registered },
    { kind: 'accredited', isAccredited: true, url: accredited }
  ])(
    'starts a $kind upload for 2026 with the redirectUrl',
    async ({ isAccredited, url }, { msw }) => {
      /** @type {Request | undefined} */
      let capturedRequest
      msw.use(
        http.post(url, ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({
            summaryLogId: 'sl-123',
            uploadId: 'up-456',
            uploadUrl: 'http://cdp/upload',
            statusUrl: 'http://cdp/status'
          })
        })
      )

      await initiateSummaryLogUpload({
        keys,
        accredited: isAccredited,
        redirectUrl: '/redirect/path',
        backendToken: 'test-id-token'
      })

      const request = /** @type {Request} */ (capturedRequest)

      expect(request.headers.get('content-type')).toBe('application/json')
      expect(request.headers.get('authorization')).toBe('Bearer test-id-token')
      await expect(request.json()).resolves.toStrictEqual({
        redirectUrl: '/redirect/path'
      })
    }
  )

  test('returns summaryLogId, uploadId, uploadUrl, and statusUrl from response', async ({
    msw
  }) => {
    const mockResponse = {
      summaryLogId: 'sl-789',
      uploadId: 'up-101',
      uploadUrl: 'http://cdp/upload/up-101',
      statusUrl: 'http://cdp/status/up-101'
    }

    msw.use(http.post(registered, () => HttpResponse.json(mockResponse)))

    const result = await initiateSummaryLogUpload({
      keys,
      accredited: false,
      redirectUrl: '/redirect/path',
      backendToken: 'test-id-token'
    })

    expect(result).toStrictEqual(mockResponse)
  })

  test('throws Boom error when backend returns non-ok response', async ({
    msw
  }) => {
    msw.use(
      http.post(
        registered,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      initiateSummaryLogUpload({
        keys,
        accredited: false,
        redirectUrl: '/redirect/path',
        backendToken: 'test-id-token'
      })
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
