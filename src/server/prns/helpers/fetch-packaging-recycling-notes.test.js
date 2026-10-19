import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { buildPrnResource } from '#server/common/test-helpers/prn-fixtures.js'
import { test } from '#vite/fixtures/server.js'

import { fetchPackagingRecyclingNotes } from './fetch-packaging-recycling-notes.js'

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

describe(fetchPackagingRecyclingNotes, () => {
  const keys = {
    organisationNumber: '500123',
    registrationNumber: 'R26EN0000000001PL',
    year: '2026'
  }
  const backendToken = 'test-id-token'
  const notesUrl = `${backendUrl}/organisations/500123/registrations/R26EN0000000001PL/accreditations/2026/packaging-recycling-notes`

  test('returns the accreditation notes in the page shape', async ({ msw }) => {
    msw.use(
      http.get(notesUrl, () =>
        HttpResponse.json({
          items: [
            buildPrnResource({
              id: 'prn-001',
              status: 'awaiting_authorisation'
            })
          ]
        })
      )
    )

    const result = await fetchPackagingRecyclingNotes(keys, backendToken)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'prn-001',
      status: 'awaiting_authorisation',
      material: 'plastic',
      wasteProcessingType: 'reprocessor'
    })
  })

  test('includes Authorization and tracing headers', async ({ msw }) => {
    /** @type {Request | undefined} */
    let capturedRequest
    msw.use(
      http.get(notesUrl, ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({ items: [] })
      })
    )

    await fetchPackagingRecyclingNotes(keys, backendToken)

    const request = /** @type {Request} */ (capturedRequest)

    expect(request.headers.get('content-type')).toBe('application/json')
    expect(request.headers.get('authorization')).toBe('Bearer test-id-token')
    expect(request.headers.get('x-cdp-request-id')).toBe(MOCK_TRACE_ID)
  })

  test('throws Boom error when backend returns 500', async ({ msw }) => {
    msw.use(
      http.get(
        notesUrl,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      fetchPackagingRecyclingNotes(keys, backendToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })

  test('throws Boom error when backend returns 404', async ({ msw }) => {
    msw.use(
      http.get(
        notesUrl,
        () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
      )
    )

    await expect(
      fetchPackagingRecyclingNotes(keys, backendToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
