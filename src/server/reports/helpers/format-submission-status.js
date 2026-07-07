import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { SUBMISSION_STATUS } from '../constants.js'
import { FIRST_SUBMISSION, isResubmission } from './resubmission.js'

/**
 * @import { TFunction } from 'i18next'
 * @import { SubmissionStatusValue } from '../constants.js'
 */

/**
 * Tag modifier classes per status. 'Requires resubmission' also carries
 * no-max-width: it is wider than the 160px govuk-tag cap and would otherwise
 * wrap to two lines, so the width lift travels with the status rather than
 * being special-cased at the call site.
 * @type {Record<SubmissionStatusValue, string>}
 */
const tagClasses = {
  [SUBMISSION_STATUS.DUE]: cssClasses.tag.orange,
  [SUBMISSION_STATUS.OVERDUE]: cssClasses.tag.red,
  [SUBMISSION_STATUS.IN_PROGRESS]: cssClasses.tag.yellow,
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: cssClasses.tag.blue,
  [SUBMISSION_STATUS.SUBMITTED]: cssClasses.tag.green,
  [SUBMISSION_STATUS.REQUIRES_RESUBMISSION]: `${cssClasses.tag.purple} ${cssClasses.tag.noMaxWidth}`
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

/**
 * Get the GOV.UK tag modifier class for a submission status.
 * @param {SubmissionStatusValue} status
 * @returns {string}
 */
export const getStatusTagClass = (status) => tagClasses[status]

/**
 * Get the localised display label for a submission status. A submitted period
 * whose submissionNumber marks it as a resubmission shows "Resubmitted" rather
 * than "Submitted": the backend never emits a distinct status, so the label is
 * derived here from the submission number, flag-gated by isResubmission.
 * @param {SubmissionStatusValue} status
 * @param {(key: string) => string} localise
 * @param {number} [submissionNumber]
 * @returns {string}
 */
export const getStatusLabel = (
  status,
  localise,
  submissionNumber = FIRST_SUBMISSION
) =>
  status === SUBMISSION_STATUS.SUBMITTED && isResubmission(submissionNumber)
    ? localise('reports:statusResubmitted')
    : localise(statusLabelKeys[status])

/**
 * Whether a due date has passed. Mirrors the backend's derive-period-status
 * comparison verbatim: both sides are date-only (YYYY-MM-DD) ISO strings, which
 * sort chronologically, so a period is overdue from the day after its due date,
 * i.e. from the 21st when due on the 20th. The backend returns dueDate as a
 * date-only string, so it is compared as-is (no slicing) to stay identical to
 * derive-period-status.js and never drift from it.
 * @param {string} dueDate a date-only YYYY-MM-DD ISO string
 * @returns {boolean}
 */
const isPastDueDate = (dueDate) =>
  new Date().toISOString().split('T')[0].localeCompare(dueDate) > 0

/**
 * The text shown in the due-date column for an active row. A requires
 * resubmission period keeps that status rather than flipping to overdue, so it
 * shows the overdue label here once its due date has passed; every other status
 * shows the formatted due date.
 * @param {SubmissionStatusValue} status
 * @param {string} dueDate a date-only YYYY-MM-DD ISO string
 * @param {TFunction} localise
 * @returns {string}
 */
export const buildDueDateText = (status, dueDate, localise) =>
  status === SUBMISSION_STATUS.REQUIRES_RESUBMISSION && isPastDueDate(dueDate)
    ? getStatusLabel(SUBMISSION_STATUS.OVERDUE, localise)
    : formatDateShort(dueDate)
