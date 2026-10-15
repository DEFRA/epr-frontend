/**
 * @import { PeriodParams } from './period-params-schema.js'
 */

/**
 * Identifies the report submission a journey is acting on, so concurrent
 * attempts in one session count and clear independently.
 * @param {PeriodParams} params
 */
export const reportAttempt = ({
  registrationNumber,
  year,
  cadence,
  period,
  submissionNumber
}) => `${registrationNumber}/${year}/${cadence}/${period}/${submissionNumber}`
