import { describe, expect, it, vi } from 'vitest'

import { toAccreditationNumber } from '#server/common/helpers/accreditation-number.js'
import { toBackendToken } from '#server/common/helpers/backend-token.js'
import { toOrganisationNumber } from '#server/common/helpers/organisation-number.js'
import { toRegistrationNumber } from '#server/common/helpers/registration-number.js'
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
        organisationNumber: toOrganisationNumber('500123'),
        registrationNumber: toRegistrationNumber('R26EN0000000001PL'),
        year: '2026'
      },
      accreditationNumber: toAccreditationNumber('A26EN0000000001PL'),
      backendToken: toBackendToken('token'),
      logger
    })

    expect(result).toBe(balance)
    expect(fetchAccreditationBalance).toHaveBeenCalledWith({
      organisationNumber: toOrganisationNumber('500123'),
      year: 2026,
      accreditationNumber: toAccreditationNumber('A26EN0000000001PL'),
      backendToken: 'token',
      logger
    })
  })
})
