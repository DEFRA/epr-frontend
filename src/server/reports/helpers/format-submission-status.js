import { SUBMISSION_STATUS } from '../constants.js'

/**
 * Get the localised display label for a submission status.
 * @param {string | null} status
 * @param {(key: string) => string} localise
 * @returns {string | null}
 */
export function getStatusLabel(status, localise) {
  const labels = {
    [SUBMISSION_STATUS.DUE]: localise('reports:statusDue'),
    [SUBMISSION_STATUS.IN_PROGRESS]: localise('reports:statusInProgress'),
    [SUBMISSION_STATUS.READY_TO_SUBMIT]: localise('reports:statusReadyToSubmit')
  }

  return labels[status] ?? null
}

/**
 * Get the localised action link text for a submission status.
 * @param {string | null} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export function getActionLabel(status, localise) {
  if (status === SUBMISSION_STATUS.READY_TO_SUBMIT) {
    return localise('reports:actionReviewAndSubmit')
  }

  if (status === SUBMISSION_STATUS.IN_PROGRESS) {
    return localise('reports:actionContinue')
  }

  return localise('reports:actionSelect')
}
