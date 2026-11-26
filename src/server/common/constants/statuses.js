export const prnStatuses = Object.freeze({
  draft: 'draft',
  awaitingAuthorisation: 'awaiting_authorisation',
  awaitingAcceptance: 'awaiting_acceptance',
  accepted: 'accepted',
  cancelled: 'cancelled',
  awaitingCancellation: 'awaiting_cancellation',
  discarded: 'discarded'
})

/** @typedef {typeof prnStatuses[keyof typeof prnStatuses]} PrnStatus */

export const summaryLogStatuses = {
  preprocessing: 'preprocessing',
  rejected: 'rejected',
  validating: 'validating',
  invalid: 'invalid',
  validated: 'validated',
  submitting: 'submitting',
  submitted: 'submitted',
  superseded: 'superseded',
  validationFailed: 'validation_failed',
  submissionFailed: 'submission_failed'
}
