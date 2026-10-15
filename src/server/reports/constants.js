/**
 * @typedef {typeof CADENCE[keyof typeof CADENCE]} CadenceValue
 */
export const CADENCE = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly'
})

/**
 * A period's status on the calendar. `not_started` is only ever a report
 * preview's status, so the calendar never shows it.
 * @typedef {Exclude<typeof SUBMISSION_STATUS[keyof typeof SUBMISSION_STATUS], typeof SUBMISSION_STATUS.NOT_STARTED>} SubmissionStatusValue
 */
export const SUBMISSION_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  DUE: 'due',
  OVERDUE: 'overdue',
  IN_PROGRESS: 'in_progress',
  READY_TO_SUBMIT: 'ready_to_submit',
  SUBMITTED: 'submitted',
  REQUIRES_RESUBMISSION: 'requires_resubmission'
})
