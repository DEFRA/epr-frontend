import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchWasteBalances } from './fetch-waste-balances.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchWasteBalances, () => {
  const organisationId = 'org-123'
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

    const result = await fetchWasteBalances(
      organisationId,
      accreditationIds,
      idToken
    )

    expect(result).toStrictEqual(mockWasteBalanceData)
  })

  test('calls backend with correct path including organisation ID and accreditation IDs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, accreditationIds, idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/organisations\/org-123\/waste-balances\?accreditationIds=acc-001&accreditationIds=acc-002$/
      ),
      expect.any(Object)
    )
  })

  test('includes Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, accreditationIds, idToken)

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

  test('returns empty object when accreditationIds array is empty', async () => {
    const result = await fetchWasteBalances(organisationId, [], idToken)

    expect(result).toStrictEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('encodes URL accreditation IDs with special characters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, ['acc/001', 'acc&002'], idToken)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('accreditationIds=acc%2F001'),
      expect.any(Object)
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('accreditationIds=acc%26002'),
      expect.any(Object)
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
      fetchWasteBalances(organisationId, accreditationIds, idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
