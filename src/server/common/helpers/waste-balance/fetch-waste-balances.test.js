import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchWasteBalances } from './fetch-waste-balances.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchWasteBalances, () => {
  const organisationId = 'org-123'
  const idToken = 'test-id-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns waste balance data when backend responds successfully', async () => {
    const mockWasteBalanceData = {
      'acc-001': { amount: 1000, availableAmount: 750 },
      'acc-002': { amount: 500, availableAmount: 500 }
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockWasteBalanceData)
    })

    const result = await fetchWasteBalances(organisationId, idToken)

    expect(result).toStrictEqual(mockWasteBalanceData)
  })

  test('calls backend with correct path including organisation ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/v1\/organisations\/org-123\/waste-balances$/),
      expect.any(Object)
    )
  })

  test('includes Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-id-token'
        }
      })
    )
  })

  test('throws Boom error when backend returns 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchWasteBalances(organisationId, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
