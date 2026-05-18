import { cssClasses } from '#server/common/constants/css-classes.js'
import { SUBMISSION_STATUS } from '../constants.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

/** @type {Record<SubmissionStatusValue, string>} */
const tagClasses = {
  [SUBMISSION_STATUS.DUE]: cssClasses.tag.orange,
  [SUBMISSION_STATUS.IN_PROGRESS]: cssClasses.tag.yellow,
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: cssClasses.tag.blue,
  [SUBMISSION_STATUS.SUBMITTED]: cssClasses.tag.green
}

/**
 * Get the GOV.UK tag modifier class for a submission status.
 * @param {SubmissionStatusValue} status
 * @returns {string}
 */
export const getStatusTagClass = (status) => tagClasses[status]

/**
 * Get the localised display label for a submission status.
 * @param {SubmissionStatusValue} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export function getStatusLabel(status, localise) {
  /** @type {Record<SubmissionStatusValue, string>} */
  const labels = {
    [SUBMISSION_STATUS.DUE]: localise('reports:statusDue'),
    [SUBMISSION_STATUS.IN_PROGRESS]: localise('reports:statusInProgress'),
    [SUBMISSION_STATUS.READY_TO_SUBMIT]: localise(
      'reports:statusReadyToSubmit'
    ),
    [SUBMISSION_STATUS.SUBMITTED]: localise('reports:statusSubmitted')
  }

  return labels[status]
}

/**
 * Get the localised action link text for a submission status.
 * @param {SubmissionStatusValue} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export function getActionLabel(status, localise) {
  if (status === SUBMISSION_STATUS.SUBMITTED) {
    return localise('reports:actionView')
  }

  if (status === SUBMISSION_STATUS.READY_TO_SUBMIT) {
    return localise('reports:actionReviewAndSubmit')
  }

  if (status === SUBMISSION_STATUS.IN_PROGRESS) {
    return localise('reports:actionContinue')
  }

  return localise('reports:actionSelect')
}
