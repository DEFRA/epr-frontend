import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNote } from './fetch-packaging-recycling-note.js'

const MOCK_TRACE_ID = 'mock-trace-id-1'

vi.mock(import('@defra/hapi-tracing'), () => ({
  withTraceId: vi.fn((headerName, headers = {}) => {
    headers[headerName] = MOCK_TRACE_ID
    return headers
  }),
  tracing: {
    plugin: {}
  }
}))

const backendUrl = config.get('eprBackendUrl')

describe(fetchPackagingRecyclingNote, () => {
  const organisationId = 'org-123'
  const registrationId = 'reg-456'
  const accreditationId = 'acc-abc'
  const prnId = 'prn-789'
  const idToken = 'test-id-token'

  test('returns packaging recycling note when backend responds successfully', async ({
    msw
  }) => {
    const mockPrnData = {
      id: 'prn-789',
      issuedToOrganisation: 'Acme Ltd',
      tonnage: 100,
      material: 'plastic',
      status: 'awaiting_authorisation',
      createdAt: '2026-01-15T10:00:00.000Z'
    }

    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/accreditations/acc-abc/packaging-recycling-notes/prn-789`,
        () => HttpResponse.json(mockPrnData)
      )
    )

    const result = await fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      idToken
    )

    expect(result).toStrictEqual(mockPrnData)
  })

  test('calls backend with correct path including PRN ID', async ({ msw }) => {
    let capturedUrl
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/accreditations/acc-abc/packaging-recycling-notes/prn-789`,
        ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }
      )
    )

    await fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      idToken
    )

    expect(capturedUrl).toMatch(
      /\/v1\/organisations\/org-123\/registrations\/reg-456\/accreditations\/acc-abc\/packaging-recycling-notes\/prn-789$/
    )
  })

  test('includes Authorization and tracing headers', async ({ msw }) => {
    let capturedRequest
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/accreditations/acc-abc/packaging-recycling-notes/prn-789`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({})
        }
      )
    )

    await fetchPackagingRecyclingNote(
      organisationId,
      registrationId,
      accreditationId,
      prnId,
      idToken
    )

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
    expect(capturedRequest.headers.get('x-cdp-request-id')).toBe(MOCK_TRACE_ID)
  })

  test('encodes URL path parameters with special characters', async ({
    msw
  }) => {
    let capturedUrl
    msw.use(
      http.get(/.*packaging-recycling-notes.*/, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({})
      })
    )

    await fetchPackagingRecyclingNote(
      'org/123',
      'reg&456',
      'acc@abc',
      'prn#789',
      idToken
    )

    expect(capturedUrl).toContain(
      'organisations/org%2F123/registrations/reg%26456/accreditations/acc%40abc/packaging-recycling-notes/prn%23789'
    )
  })

  test('throws Boom error when backend returns 500', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/accreditations/acc-abc/packaging-recycling-notes/prn-789`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        idToken
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  test('throws Boom error when backend returns 404', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/registrations/reg-456/accreditations/acc-abc/packaging-recycling-notes/prn-789`,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchPackagingRecyclingNote(
        organisationId,
        registrationId,
        accreditationId,
        prnId,
        idToken
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
