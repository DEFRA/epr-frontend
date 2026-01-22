import { beforeEach, describe, expect, test, vi } from 'vitest'

import { fetchWasteBalances } from './fetch-waste-balances.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe(fetchWasteBalances, () => {
  const organisationId = 'org-123'
  const accreditationId1 = 'acc-456'
  const accreditationId2 = 'acc-789'
  const idToken = 'test-id-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns empty object when no accreditation IDs provided', async () => {
    const result = await fetchWasteBalances(organisationId, [], idToken)

    expect(result).toStrictEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('returns waste balance data when backend responds successfully', async () => {
    const mockBalanceData = {
      [accreditationId1]: {
        amount: 1000,
        availableAmount: 750
      }
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockBalanceData)
    })

    const result = await fetchWasteBalances(
      organisationId,
      [accreditationId1],
      idToken
    )

    expect(result).toStrictEqual(mockBalanceData)
  })

  test('calls backend with correct path including organisation ID and accreditation IDs', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(
      organisationId,
      [accreditationId1, accreditationId2],
      idToken
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/v1\/organisations\/org-123\/waste-balances\?accreditationIds=acc-456,acc-789$/
      ),
      expect.any(Object)
    )
  })

  test('includes Authorization header with Bearer token', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    await fetchWasteBalances(organisationId, [accreditationId1], idToken)

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

  test('encodes accreditation IDs in URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    })

    const accreditationWithSpecialChars = 'acc/with+special'

    await fetchWasteBalances(
      organisationId,
      [accreditationWithSpecialChars],
      idToken
    )

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('acc%2Fwith%2Bspecial'),
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
      fetchWasteBalances(organisationId, [accreditationId1], idToken)
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 }
    })
  })
})
