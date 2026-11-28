import { followingYear } from '#server/common/helpers/year.js'
import { asksDecemberWaste } from './december-waste-control.js'

/**
 * The registration years a note's recipient may hold. December waste can also
 * go to a producer registered for the following year.
 * @param {Year} accreditationYear
 * @param {DecemberPrnEligibility} eligibility
 * @returns {Year[]}
 */
export const recipientRegistrationYears = (accreditationYear, eligibility) =>
  asksDecemberWaste(eligibility)
    ? [accreditationYear, followingYear(accreditationYear)]
    : [accreditationYear]

/**
 * @import { Year } from '#server/common/helpers/year.js'
 * @import { DecemberPrnEligibility } from './fetch-december-prn-eligibility.js'
 */
