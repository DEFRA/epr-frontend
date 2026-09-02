import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { SUBMISSION_STATUS } from '../constants.js'
import {
  getStatusLabel,
  getStatusTagClass
} from './format-submission-status.js'
import { isResubmission } from './resubmission.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

/**
 * A submitted period that is a resubmission (a later submission for the period,
 * flag-gated) reads "Resubmitted" rather than "Submitted". The backend emits no
 * distinct status for this, so the label is derived from the submission number
 * at this call site; the tag colour stays green, as submitted.
 * @param {SubmissionStatusValue} status
 * @param {(key: string) => string} localise
 * @param {number} submissionNumber
 * @returns {string}
 */
export const buildStatusTagHtml = (status, localise, submissionNumber) => {
  const statusLabel =
    status === SUBMISSION_STATUS.SUBMITTED && isResubmission(submissionNumber)
      ? localise('reports:statusResubmitted')
      : getStatusLabel(status, localise)
  const statusTagClass = getStatusTagClass(status)

  return `<strong class="govuk-tag ${statusTagClass}">${escapeHtml(statusLabel)}</strong>`
}
