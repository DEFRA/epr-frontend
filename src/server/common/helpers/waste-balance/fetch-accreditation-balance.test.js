import { beforeEach, describe, expect, it, vi } from 'vitest'

import { organisationNumber } from '#server/common/helpers/organisation-number.js'
import { year } from '#server/common/helpers/year.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'

import { fetchAccreditationBalance } from './fetch-accreditation-balance.js'
import { fetchOrganisationWasteBalances } from './fetch-organisation-waste-balances.js'

vi.mock(import('./fetch-organisation-waste-balances.js'))

const logger = createMockLogger()

const balance = { amount: 20.5, availableAmount: 10.3 }

const params = {
  organisationNumber: organisationNumber(500001),
  year: year(2026),
  accreditationNumber: 'A26ER5001180114PL',
  backendToken: 'mock-token',
  logger
}

describe(fetchAccreditationBalance, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the accreditation's balance for the year", async () => {
    vi.mocked(fetchOrganisationWasteBalances).mockResolvedValue({
      A26ER5001180114PL: balance
    })

    await expect(fetchAccreditationBalance(params)).resolves.toStrictEqual(
      balance
    )
    expect(fetchOrganisationWasteBalances).toHaveBeenCalledWith(
      500001,
      2026,
      'mock-token'
    )
  })

  it('returns null when the year holds no balance for the accreditation', async () => {
    vi.mocked(fetchOrganisationWasteBalances).mockResolvedValue({
      A26OTHER: balance
    })

    await expect(fetchAccreditationBalance(params)).resolves.toBeNull()
  })

  it('returns null and logs when the read fails', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchOrganisationWasteBalances).mockRejectedValue(error)

    await expect(fetchAccreditationBalance(params)).resolves.toBeNull()
    expect(logger.error).toHaveBeenCalledWith({
      message: 'Failed to fetch waste balance',
      err: error
    })
  })
})
