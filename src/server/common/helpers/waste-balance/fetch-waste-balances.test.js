import { config } from '#config/config.js'
import { http, HttpResponse } from 'msw'
import { describe, expect } from 'vitest'

import { test } from '#vite/fixtures/server.js'

import { fetchWasteBalances } from './fetch-waste-balances.js'

const backendUrl = config.get('eprBackendUrl')

describe(fetchWasteBalances, () => {
  const organisationId = 'org-123'
  const accreditationIds = ['acc-001', 'acc-002']
  const backendToken = 'test-id-token'

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
      backendToken
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

    await fetchWasteBalances(organisationId, accreditationIds, backendToken)

    expect(capturedUrl).toContain('accreditationIds=acc-001,acc-002')
  })

  test('returns empty object when accreditationIds array is empty', async () => {
    const result = await fetchWasteBalances(organisationId, [], backendToken)

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

    await fetchWasteBalances(
      organisationId,
      ['acc/001', 'acc&002'],
      backendToken
    )

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
      fetchWasteBalances(organisationId, accreditationIds, backendToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
