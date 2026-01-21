import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchWasteBalances } from './fetch-waste-balances.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchWasteBalances, () => {
  const accreditationIds = ['acc-001', 'acc-002']
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

    const result = await fetchWasteBalances(accreditationIds, idToken)

    expect(result).toStrictEqual(mockWasteBalanceData)
  })

  test('calls backend with correct path including comma-separated accreditation IDs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(accreditationIds, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/waste-balance\?accreditationIds=acc-001,acc-002$/
      ),
      expect.any(Object)
    )
  })

  test('includes Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(accreditationIds, idToken)

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

  test('returns empty object when accreditationIds is empty array', async () => {
    const result = await fetchWasteBalances([], idToken)

    expect(result).toStrictEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('returns empty object when accreditationIds is null', async () => {
    const result = await fetchWasteBalances(null, idToken)

    expect(result).toStrictEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('returns empty object when accreditationIds is undefined', async () => {
    const result = await fetchWasteBalances(undefined, idToken)

    expect(result).toStrictEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('throws Boom error when backend returns 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map()
    })

    await expect(
      fetchWasteBalances(accreditationIds, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
