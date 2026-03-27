import { config } from '#config/config.js'
import { it } from '#vite/fixtures/server.js'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect } from 'vitest'
import { fetchSummaryLogStatus } from './fetch-summary-log-status.js'

describe(fetchSummaryLogStatus, () => {
  const backendUrl = 'http://fake-epr-backend'
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const summaryLogId = 'log-789'

  beforeAll(() => {
    config.set('eprBackendUrl', backendUrl)
  })

  afterAll(() => {
    config.reset('eprBackendUrl')
  })

  it('should return the summary log status when the backend responds successfully', async ({
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

  it('should return loadsByWasteRecordType when present in the response', async ({
    msw
  }) => {
    const loadCategory = { count: 1, rowIds: ['row-1'] }
    const loadValidity = {
      valid: loadCategory
    }
    const loadsByWasteRecordType = [
      {
        wasteRecordType: 'received',
        sheetName: 'Sheet1',
        added: loadValidity,
        unchanged: loadValidity,
        adjusted: loadValidity
      }
    ]

    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () => HttpResponse.json({ status: 'validated', loadsByWasteRecordType })
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )

    expect(result.loadsByWasteRecordType).toStrictEqual(loadsByWasteRecordType)
  })

  it('should strip unknown fields from the response', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/summary-logs/log-789`,
        () =>
          HttpResponse.json({
            status: 'validated',
            unknownField: 'should be stripped'
          })
      )
    )

    const result = await fetchSummaryLogStatus(
      organisationId,
      registrationId,
      summaryLogId,
      { idToken: 'test-id-token' }
    )

    expect(result).not.toHaveProperty('unknownField')
  })

  it('should throw a Boom notFound error when the backend returns 404', async ({
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

  it('should throw a Boom error when the backend returns a non-404 error status', async ({
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
