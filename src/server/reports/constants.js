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
  DUE: 'due'
})
