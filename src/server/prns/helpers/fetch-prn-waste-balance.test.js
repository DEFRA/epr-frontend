import { describe, expect, it, vi } from 'vitest'

import { fetchAccreditationBalance } from '#server/common/helpers/waste-balance/fetch-accreditation-balance.js'
import { createMockLogger } from '#server/common/test-helpers/logger-helper.js'
import { fetchPrnWasteBalance } from './fetch-prn-waste-balance.js'

vi.mock(
  import('#server/common/helpers/waste-balance/fetch-accreditation-balance.js')
)

describe(fetchPrnWasteBalance, () => {
  it("reads the accreditation's balance for the year named by the keys", async () => {
    const balance = { amount: 120, availableAmount: 100 }
    vi.mocked(fetchAccreditationBalance).mockResolvedValue(balance)
    const logger = createMockLogger()

    const result = await fetchPrnWasteBalance({
      keys: {
        organisationNumber: '500123',
        registrationNumber: 'R26EN0000000001PL',
        year: '2026'
      },
      accreditationNumber: 'A26EN0000000001PL',
      backendToken: 'token',
      logger
    })

    expect(result).toBe(balance)
    expect(fetchAccreditationBalance).toHaveBeenCalledWith({
      organisationNumber: 500123,
      year: 2026,
      accreditationNumber: 'A26EN0000000001PL',
      backendToken: 'token',
      logger
    })
  })
})
