import { cssClasses } from '#server/common/constants/css-classes.js'
import { SUBMISSION_STATUS } from '../constants.js'

/**
 * @import { SubmissionStatusValue } from '../constants.js'
 */

/** @type {Record<SubmissionStatusValue, string>} */
const tagClasses = {
  [SUBMISSION_STATUS.DUE]: cssClasses.tag.orange,
  [SUBMISSION_STATUS.OVERDUE]: cssClasses.tag.red,
  [SUBMISSION_STATUS.IN_PROGRESS]: cssClasses.tag.yellow,
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: cssClasses.tag.blue,
  [SUBMISSION_STATUS.SUBMITTED]: cssClasses.tag.green,
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]: cssClasses.tag.purple
}

/** @type {Record<SubmissionStatusValue, string>} */
const statusLabelKeys = {
  [SUBMISSION_STATUS.DUE]: 'reports:statusDue',
  [SUBMISSION_STATUS.OVERDUE]: 'reports:statusOverdue',
  [SUBMISSION_STATUS.IN_PROGRESS]: 'reports:statusInProgress',
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: 'reports:statusReadyToSubmit',
  [SUBMISSION_STATUS.SUBMITTED]: 'reports:statusSubmitted',
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]:
    'reports:statusRequiresResubmission'
}

/** @type {Record<SubmissionStatusValue, string>} */
const actionLabelKeys = {
  [SUBMISSION_STATUS.DUE]: 'reports:actionCreateDraft',
  [SUBMISSION_STATUS.OVERDUE]: 'reports:actionCreateDraft',
  [SUBMISSION_STATUS.IN_PROGRESS]: 'reports:actionContinue',
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: 'reports:actionReviewAndSubmit',
  [SUBMISSION_STATUS.SUBMITTED]: 'reports:actionView',
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]:
    'reports:actionReviewAndCreateDraft'
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
export const getStatusLabel = (status, localise) =>
  localise(statusLabelKeys[status])

/**
 * Get the localised action link text for a submission status.
 * @param {SubmissionStatusValue} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export const getActionLabel = (status, localise) =>
  localise(actionLabelKeys[status])
