import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWasteBalance } from './get-waste-balance.js'
import { fetchWasteBalances } from './fetch-waste-balances.js'

vi.mock(import('./fetch-waste-balances.js'))

const mockLogger = {
  error: vi.fn()
}

const organisationId = 'org-123'
const accreditationId = 'acc-456'
const idToken = 'mock-token'

const stubWasteBalance = {
  amount: 20.5,
  availableAmount: 10.3
}

describe(getWasteBalance, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return waste balance for accreditation', async () => {
    vi.mocked(fetchWasteBalances).mockResolvedValue({
      [accreditationId]: stubWasteBalance
    })

    const result = await getWasteBalance(
      organisationId,
      accreditationId,
      idToken,
      mockLogger
    )

    expect(result).toStrictEqual(stubWasteBalance)
    expect(fetchWasteBalances).toHaveBeenCalledWith(
      organisationId,
      [accreditationId],
      idToken
    )
  })

  it('should return null when accreditation not found in response', async () => {
    vi.mocked(fetchWasteBalances).mockResolvedValue({
      'other-acc': stubWasteBalance
    })

    const result = await getWasteBalance(
      organisationId,
      accreditationId,
      idToken,
      mockLogger
    )

    expect(result).toBeNull()
  })

  it('should return null and log error when fetch fails', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchWasteBalances).mockRejectedValue(error)

    const result = await getWasteBalance(
      organisationId,
      accreditationId,
      idToken,
      mockLogger
    )

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error },
      'Failed to fetch waste balance'
    )
  })
})
