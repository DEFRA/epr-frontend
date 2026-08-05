import { SUBMISSION_STATUS } from '../constants.js'
import { getInProgressActionPath } from './get-in-progress-action-path.js'

/**
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { CadenceValue, SubmissionStatusValue } from '../constants.js'
 * @import { ReportingPeriod } from './fetch-reporting-periods.js'
 */

/**
 * What the operator does next on a reports-list row. Distinct from a submission
 * status (the tag): the status says what state a period is in, the action says
 * what it offers. They coincide for most rows and diverge for a requires
 * resubmission period, whose tag is fixed but whose action follows its draft.
 * @typedef {typeof REPORT_ACTION[keyof typeof REPORT_ACTION]} ReportActionValue
 */
export const REPORT_ACTION = Object.freeze({
  CREATE_DRAFT: 'create_draft',
  CONTINUE: 'continue',
  REVIEW_AND_SUBMIT: 'review_and_submit',
  VIEW: 'view',
  REVIEW_AND_CREATE_DRAFT: 'review_and_create_draft'
})

/**
 * The action a submission status warrants. Exhaustive by SubmissionStatusValue,
 * so adding a new status is a compile error until its action is chosen. Applied
 * to a period's own status, or to its draft's status for a resubmission.
 * @type {Record<SubmissionStatusValue, ReportActionValue>}
 */
const ACTION_BY_STATUS = {
  [SUBMISSION_STATUS.DUE]: REPORT_ACTION.CREATE_DRAFT,
  [SUBMISSION_STATUS.OVERDUE]: REPORT_ACTION.CREATE_DRAFT,
  [SUBMISSION_STATUS.IN_PROGRESS]: REPORT_ACTION.CONTINUE,
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: REPORT_ACTION.REVIEW_AND_SUBMIT,
  [SUBMISSION_STATUS.SUBMITTED]: REPORT_ACTION.VIEW,
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]:
    REPORT_ACTION.REVIEW_AND_CREATE_DRAFT
}

/** @type {Record<ReportActionValue, string>} */
const actionLabelKeys = {
  [REPORT_ACTION.CREATE_DRAFT]: 'reports:actionCreateDraft',
  [REPORT_ACTION.CONTINUE]: 'reports:actionContinue',
  [REPORT_ACTION.REVIEW_AND_SUBMIT]: 'reports:actionReviewAndSubmit',
  [REPORT_ACTION.VIEW]: 'reports:actionView',
  [REPORT_ACTION.REVIEW_AND_CREATE_DRAFT]: 'reports:actionReviewAndCreateDraft'
}

/**
 * Fixed action paths appended to a period path. CONTINUE is absent: its
 * destination varies by registration type, so it is resolved separately.
 * CREATE_DRAFT is absent too and falls back to no path.
 * @type {Partial<Record<ReportActionValue, string>>}
 */
const actionPaths = {
  [REPORT_ACTION.REVIEW_AND_SUBMIT]: '/submit',
  [REPORT_ACTION.VIEW]: '/view',
  [REPORT_ACTION.REVIEW_AND_CREATE_DRAFT]: '/resubmission-explainer'
}

/**
 * The action a reports-list row offers next. For a requires resubmission period
 * the live work is its draft, so the draft's status chooses the action; with no
 * draft the period's own status (requires_resubmission) maps to Review and
 * create draft. Every other period is driven by its own status.
 * @param {ReportingPeriod} period
 * @returns {ReportActionValue}
 */
export const getRowAction = (period) => {
  const draft =
    period.periodStatus === SUBMISSION_STATUS.REQUIRES_RESUBMISSION
      ? period.report
      : null
  return ACTION_BY_STATUS[draft?.status ?? period.periodStatus]
}

/**
 * Get the localised action link text for a row action.
 * @param {ReportActionValue} action
 * @param {(key: string) => string} localise
 * @returns {string}
 */
export const getActionLabel = (action, localise) =>
  localise(actionLabelKeys[action])

/**
 * Resolve the path a row action's link should target, appended to the period
 * path. Continue varies by registration type, accreditation and cadence; the
 * others are fixed, and create-draft has no destination yet.
 * @param {ReportActionValue} action
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @param {Accreditation | undefined} accreditation
 * @param {CadenceValue} cadence
 * @returns {string}
 */
export const getActionPath = (action, registration, accreditation, cadence) =>
  action === REPORT_ACTION.CONTINUE
    ? getInProgressActionPath(registration, accreditation, cadence)
    : (actionPaths[action] ?? '')
