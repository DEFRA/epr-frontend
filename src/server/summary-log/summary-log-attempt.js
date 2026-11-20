/**
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 */

/**
 * Identifies the summary log upload a journey is acting on, so uploads for
 * different years in one session count and clear independently.
 * @param {{ registrationNumber: RegistrationNumber, year: Year }} keys
 */
export const summaryLogAttempt = ({ registrationNumber, year }) =>
  `${registrationNumber}/${year}`
