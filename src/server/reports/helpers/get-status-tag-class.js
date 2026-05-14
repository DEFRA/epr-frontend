import { SUBMISSION_STATUS } from '../constants.js'

/** @type {Record<string, string>} */
const tagClasses = {
  [SUBMISSION_STATUS.DUE]: 'govuk-tag--orange',
  [SUBMISSION_STATUS.IN_PROGRESS]: 'govuk-tag--yellow',
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: '',
  [SUBMISSION_STATUS.SUBMITTED]: 'govuk-tag--green'
}

/**
 * Get the GOV.UK tag modifier class for a submission status.
 * Returns an empty string for null, unrecognised, or ready-to-submit
 * (which uses the default blue tag).
 * @param {string | null} status
 * @returns {string}
 */
export const getStatusTagClass = (status) => {
  if (status === null) {
    return ''
  }
  return tagClasses[status] ?? ''
}
