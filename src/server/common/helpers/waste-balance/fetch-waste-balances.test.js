import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect, vi } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchWasteBalances } from './fetch-waste-balances.js'

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

describe(fetchWasteBalances, () => {
  const organisationId = 'org-123'
  const accreditationIds = ['acc-001', 'acc-002']
  const idToken = 'test-id-token'

  test('returns waste balance data when backend responds successfully', async ({
    msw
  }) => {
    const mockWasteBalanceData = {
      'acc-001': { amount: 1000, availableAmount: 750 },
      'acc-002': { amount: 500, availableAmount: 500 }
    }

    msw.use(
      http.get(`${backendUrl}/v1/organisations/org-123/waste-balances`, () =>
        HttpResponse.json(mockWasteBalanceData)
      )
    )

    const result = await fetchWasteBalances(
      organisationId,
      accreditationIds,
      idToken
    )

    expect(result).toStrictEqual(mockWasteBalanceData)
  })

  test('calls backend with correct path including organisation ID and accreditation IDs', async ({
    msw
  }) => {
    let capturedUrl
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/waste-balances`,
        ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        }
      )
    )

    await fetchWasteBalances(organisationId, accreditationIds, idToken)

    expect(capturedUrl).toContain('accreditationIds=acc-001,acc-002')
  })

  test('includes Authorization and tracing headers', async ({ msw }) => {
    let capturedRequest
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/waste-balances`,
        ({ request }) => {
          capturedRequest = request
          return HttpResponse.json({})
        }
      )
    )

    await fetchWasteBalances(organisationId, accreditationIds, idToken)

    expect(capturedRequest.headers.get('content-type')).toBe('application/json')
    expect(capturedRequest.headers.get('authorization')).toBe(
      'Bearer test-id-token'
    )
    expect(capturedRequest.headers.get('x-cdp-request-id')).toBe(MOCK_TRACE_ID)
  })

  test('returns empty object when accreditationIds array is empty', async () => {
    const result = await fetchWasteBalances(organisationId, [], idToken)

    expect(result).toStrictEqual({})
  })

  test('encodes URL accreditation IDs with special characters', async ({
    msw
  }) => {
    let capturedUrl
    msw.use(
      http.get(/.*waste-balances.*/, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({})
      })
    )

    await fetchWasteBalances(organisationId, ['acc/001', 'acc&002'], idToken)

    expect(capturedUrl).toContain('accreditationIds=acc%2F001,acc%26002')
  })

  test('throws Boom error when backend returns 500', async ({ msw }) => {
    msw.use(
      http.get(
        `${backendUrl}/v1/organisations/org-123/waste-balances`,
        () =>
          new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          })
      )
    )

    await expect(
      fetchWasteBalances(organisationId, accreditationIds, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
