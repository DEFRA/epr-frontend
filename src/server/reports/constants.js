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

export const MIN_YEAR = 2024
export const MAX_YEAR = 2100
export const MAX_PERIOD = 12
