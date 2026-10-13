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
/** Status the report resource gives a period with no stored report. */
export const PREVIEW_STATUS = 'not_started'

export const SUBMISSION_STATUS = Object.freeze({
  DUE: 'due',
  OVERDUE: 'overdue',
  IN_PROGRESS: 'in_progress',
  READY_TO_SUBMIT: 'ready_to_submit',
  SUBMITTED: 'submitted',
  REQUIRES_RESUBMISSION: 'requires_resubmission'
})
