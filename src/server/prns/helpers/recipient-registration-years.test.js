import { toYear } from '#server/common/helpers/year.js'
import { describe, expect, it } from 'vitest'

import { recipientRegistrationYears } from './recipient-registration-years.js'

describe(recipientRegistrationYears, () => {
  it.each([
    { mode: 'pool', windowOpen: true },
    { mode: 'manual', windowOpen: true }
  ])(
    'includes the following year when the page asks about December waste ($mode)',
    (eligibility) => {
      expect(
        recipientRegistrationYears(
          toYear(2026),
          /** @type {DecemberPrnEligibility} */ (eligibility)
        )
      ).toStrictEqual([2026, 2027])
    }
  )

  it.each([
    { mode: 'pool', windowOpen: false },
    { mode: 'manual', windowOpen: false },
    { mode: 'none', windowOpen: true },
    { mode: 'none', windowOpen: false }
  ])(
    'gives only the accreditation year when the page does not ask about December waste ($mode, window open $windowOpen)',
    (eligibility) => {
      expect(
        recipientRegistrationYears(
          toYear(2026),
          /** @type {DecemberPrnEligibility} */ (eligibility)
        )
      ).toStrictEqual([2026])
    }
  )
})

/**
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 */
