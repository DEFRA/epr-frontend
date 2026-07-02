/**
 * @typedef {typeof CADENCE[keyof typeof CADENCE]} CadenceValue
 */
export const CADENCE = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
})

/**
 * @typedef {typeof SUBMISSION_STATUS[keyof typeof SUBMISSION_STATUS]} SubmissionStatusValue
 */
export const SUBMISSION_STATUS = Object.freeze({
  DUE: 'due',
  OVERDUE: 'overdue',
  IN_PROGRESS: 'in_progress',
  READY_TO_SUBMIT: 'ready_to_submit',
  SUBMITTED: 'submitted',
  REQUIRES_RESUBMISSION: 'requires_resubmission'
})

/**
 * Whether each submission status belongs to the closed-period-adjustments
 * feature and so is hidden on the reports list until the flag is released.
 * Exhaustive by SubmissionStatusValue: adding a new status is a compile error
 * until it is classified here, keeping the reports-list filter in sync.
 * @type {Record<SubmissionStatusValue, boolean>}
 */
export const IS_CLOSED_PERIOD_ADJUSTMENT_STATUS = Object.freeze({
  [SUBMISSION_STATUS.DUE]: false,
  [SUBMISSION_STATUS.OVERDUE]: false,
  [SUBMISSION_STATUS.IN_PROGRESS]: false,
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: false,
  [SUBMISSION_STATUS.SUBMITTED]: false,
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]: true
})
