/**
 * The first submission for a reporting period. Any later submission
 * (submissionNumber greater than this) is a resubmission.
 */
export const FIRST_SUBMISSION = 1

/**
 * Whether a submission is a resubmission: a later submission for a period.
 * @param {number} submissionNumber
 * @returns {boolean}
 */
export const isResubmission = (submissionNumber) =>
  submissionNumber > FIRST_SUBMISSION
