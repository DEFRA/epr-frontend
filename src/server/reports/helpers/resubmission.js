import { isClosedPeriodAdjustmentsEnabled } from '#config/config.js'

/**
 * The first submission for a reporting period. Any later submission
 * (submissionNumber greater than this) is a resubmission.
 */
export const FIRST_SUBMISSION = 1

/**
 * Whether a submission is a resubmission: a later submission for a period
 * while closed-period adjustments are enabled. The feature flag is bundled in
 * deliberately, so every resubmission-variant screen shares one check and flag
 * removal collapses this to the submissionNumber comparison in one place.
 * @param {number} submissionNumber
 * @returns {boolean}
 */
export const isResubmission = (submissionNumber) =>
  submissionNumber > FIRST_SUBMISSION && isClosedPeriodAdjustmentsEnabled()
