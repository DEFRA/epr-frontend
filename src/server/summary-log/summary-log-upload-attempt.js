/**
 * @import { RegistrationNumber } from '#server/common/helpers/registration-number.js'
 * @import { Year } from '#server/common/helpers/year.js'
 */

/**
 * Identifies the upload a journey is acting on for a registration's year, so
 * uploads for different years in one session count and clear independently.
 * @param {{ registrationNumber: RegistrationNumber, year: Year }} keys
 */
export const summaryLogUploadAttempt = ({ registrationNumber, year }) =>
  `${registrationNumber}/${year}`
