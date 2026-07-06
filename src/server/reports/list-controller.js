import { isClosedPeriodAdjustmentsEnabled } from '#config/config.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  IS_CLOSED_PERIOD_ADJUSTMENT_STATUS,
  SUBMISSION_STATUS
} from './constants.js'
import { fetchReportingPeriods } from './helpers/fetch-reporting-periods.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import {
  getActionLabel,
  getStatusLabel,
  getStatusTagClass
} from './helpers/format-submission-status.js'
import { getInProgressActionPath } from './helpers/get-in-progress-action-path.js'

/**
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {{ organisationId: string, registrationId: string }} ReportListParams
 */

/**
 * @param {string} actionLabel
 * @param {string} url
 * @param {string} label
 * @returns {string}
 */
const buildActionLinkHtml = (actionLabel, url, label) =>
  `<a href="${url}" class="govuk-link">${escapeHtml(actionLabel)} <span class="govuk-visually-hidden">${escapeHtml(label)}</span></a>`

/**
 * @param {SubmissionStatusValue} status
 * @param {TFunction} localise
 * @returns {string}
 */
const buildStatusTagHtml = (status, localise) => {
  const statusLabel = getStatusLabel(status, localise)
  const statusTagClass = getStatusTagClass(status)

  // 'Requires resubmission' is wider than the 160px govuk-tag cap and would
  // otherwise wrap to two lines, so lift the cap to keep it on one line.
  const noWrapClass =
    status === SUBMISSION_STATUS.REQUIRES_RESUBMISSION
      ? ` ${cssClasses.tag.noMaxWidth}`
      : ''

  return `<strong class="govuk-tag ${statusTagClass}${noWrapClass}">${escapeHtml(statusLabel)}</strong>`
}

/**
 * @param {string | null | undefined} isoString
 * @returns {string}
 */
const formatSubmittedDateTime = (isoString) => {
  if (!isoString) {
    return ''
  }
  return `${formatDateShort(isoString)}, ${formatTime(isoString)}`
}

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
 * The text shown in the due-date column for an active row: the overdue label
 * when a resubmission's due date has passed, otherwise the formatted due date.
 * @param {SubmissionStatusValue} status
 * @param {string} dueDate a date-only YYYY-MM-DD ISO string
 * @param {TFunction} localise
 * @returns {string}
 */
const buildDueDateText = (status, dueDate, localise) =>
  status === SUBMISSION_STATUS.REQUIRES_RESUBMISSION && isPastDueDate(dueDate)
    ? localise('reports:statusOverdue')
    : formatDateShort(dueDate)

/** @type {Partial<Record<SubmissionStatusValue, string>>} */
const fixedActionPaths = {
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: '/submit',
  [SUBMISSION_STATUS.SUBMITTED]: '/view'
}

const RESUBMISSION_EXPLAINER_PATH = '/resubmission-explainer'

/**
 * Resolves the path the action link on a report row should target.
 * For in-progress reports the destination varies by registration type
 * and cadence; other statuses map to a fixed page in the report flow.
 * @param {SubmissionStatusValue} status
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @param {Accreditation | undefined} accreditation
 * @param {CadenceValue} cadence
 * @returns {string}
 */
const getActionPath = (status, registration, accreditation, cadence) => {
  if (status !== SUBMISSION_STATUS.IN_PROGRESS) {
    return fixedActionPaths[status] ?? ''
  }
  return getInProgressActionPath(registration, accreditation, cadence)
}

/**
 * The submission status that drives a period's action link (its label and
 * path). A requires_resubmission period defers to the draft it carries: with
 * no draft it stays requires_resubmission ("Review and create draft"); with an
 * in-progress or ready-to-submit draft it behaves like that draft ("Continue"
 * or "Review and submit"). The purple Requires resubmission tag, taken from
 * periodStatus, is unaffected.
 * @param {ReportingPeriod} period
 * @returns {SubmissionStatusValue}
 */
const getActionStatus = (period) => {
  if (period.periodStatus !== SUBMISSION_STATUS.REQUIRES_RESUBMISSION) {
    return period.periodStatus
  }
  return period.report?.status ?? SUBMISSION_STATUS.REQUIRES_RESUBMISSION
}

/**
 * Resolves the action link path for a period, sending a resubmission that has
 * no draft yet to the resubmission explainer.
 * @param {ReportingPeriod} period
 * @param {Pick<Registration, 'wasteProcessingType'>} registration
 * @param {Accreditation | undefined} accreditation
 * @param {CadenceValue} cadence
 * @returns {string}
 */
const getPeriodActionPath = (period, registration, accreditation, cadence) => {
  if (
    period.periodStatus === SUBMISSION_STATUS.REQUIRES_RESUBMISSION &&
    !period.report
  ) {
    // Explainer, then the data-preview page (detailController). That page
    // re-fetches the report and redirects back to the list if a draft already
    // exists, so a stale "no draft" reading here degrades to a redirect rather
    // than a dead end. period.report and the fetched report share one backend
    // source, so they align in practice.
    return RESUBMISSION_EXPLAINER_PATH
  }
  return getActionPath(
    getActionStatus(period),
    registration,
    accreditation,
    cadence
  )
}

/**
 * @param {{
 *   accreditation: Accreditation | undefined,
 *   cadence: CadenceValue,
 *   label: string,
 *   localise: TFunction,
 *   localiseUrl: (url: string) => string,
 *   period: ReportingPeriod,
 *   periodPath: string,
 *   registration: Pick<Registration, 'wasteProcessingType'>
 * }} options
 * @returns {TableCell}
 */
const buildActionCell = ({
  accreditation,
  cadence,
  label,
  localise,
  localiseUrl,
  period,
  periodPath,
  registration
}) => {
  const actionPath = getPeriodActionPath(
    period,
    registration,
    accreditation,
    cadence
  )
  const actionLabel = getActionLabel(getActionStatus(period), localise)

  const url = localiseUrl(`${periodPath}${actionPath}`)

  return {
    html: buildActionLinkHtml(actionLabel, url, label),
    classes: cssClasses.textAlign.right
  }
}

/**
 * Build table rows for the govukTable macro, partitioned by submission status.
 * @param {{
 *   accreditation: Accreditation | undefined,
 *   cadence: CadenceValue,
 *   localise: TFunction,
 *   localiseUrl: (url: string) => string,
 *   organisationId: string,
 *   registration: Registration,
 *   reportingPeriods: ReportingPeriod[]
 * }} options
 * @returns {{ activeRows: TableRow[], submittedRows: TableRow[] }}
 */
function buildRows({
  accreditation,
  cadence,
  localise,
  localiseUrl,
  organisationId,
  registration,
  reportingPeriods
}) {
  /** @type {TableRow[]} */
  const activeRows = []
  /** @type {TableRow[]} */
  const submittedRows = []

  for (const period of reportingPeriods) {
    const periodPath = `/organisations/${organisationId}/registrations/${registration.id}/reports/${period.year}/${cadence}/${period.period}/submissions/${period.submissionNumber}`

    const label = formatPeriodLabel(period, cadence, localise)

    const status = period.periodStatus

    const actionCell = buildActionCell({
      period,
      registration,
      accreditation,
      cadence,
      localise,
      localiseUrl,
      periodPath,
      label
    })

    const statusTagHtml = buildStatusTagHtml(status, localise)

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      submittedRows.push([
        { text: label },
        { html: statusTagHtml },
        { text: formatSubmittedDateTime(period.report?.submittedAt) },
        { text: period.report?.submittedBy?.name ?? '' },
        actionCell
      ])
    } else {
      const dueDateText = buildDueDateText(status, period.dueDate, localise)

      activeRows.push([
        { text: label },
        { html: statusTagHtml },
        { text: dueDateText },
        actionCell
      ])
    }
  }

  return { activeRows, submittedRows }
}

/**
 * Submitted-table columns keep fixed quarter-widths, in contrast to the
 * action-required columns which hug their content.
 * @param {TFunction} localise
 * @param {string} textKey
 * @returns {TableCell}
 */
const submittedHeaderCol = (localise, textKey) => ({
  text: localise(textKey),
  classes: cssClasses.width.oneQuarter
})

/**
 * Action-required columns hug their content so the trailing right-aligned
 * action link sits hard right, matching the design. The submitted table keeps
 * its fixed column widths.
 * @param {TFunction} localise
 * @param {string} textKey
 * @returns {TableCell}
 */
const activeHeaderCol = (localise, textKey) => ({
  text: localise(textKey)
})

/** @type {TableCell} */
const actionHeaderCol = { text: '', classes: cssClasses.textAlign.right }

/**
 * @param {TFunction} localise
 * @returns {{ activeHeader: TableRow, submittedHeader: TableRow }}
 */
const buildHeaders = (localise) => ({
  activeHeader: [
    activeHeaderCol(localise, 'reports:periodColumn'),
    activeHeaderCol(localise, 'reports:statusColumn'),
    activeHeaderCol(localise, 'reports:dateDueColumn'),
    actionHeaderCol
  ],
  submittedHeader: [
    submittedHeaderCol(localise, 'reports:periodColumn'),
    submittedHeaderCol(localise, 'reports:statusColumn'),
    submittedHeaderCol(localise, 'reports:dateAndTimeColumn'),
    { text: localise('reports:submittedByColumn') },
    actionHeaderCol
  ]
})

/**
 * @param {ReportingPeriod[]} reportingPeriods
 * @param {TFunction} localise
 * @returns {string | null}
 */
const buildApprovedPersonBanner = (reportingPeriods, localise) => {
  const count = reportingPeriods.filter(
    (p) => getActionStatus(p) === SUBMISSION_STATUS.READY_TO_SUBMIT
  ).length

  return count > 0 ? localise('reports:approvedPersonBanner', { count }) : null
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: ReportListParams }>>} */
export const listController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const [{ registration, accreditation }, { cadence, reportingPeriods }] =
      await Promise.all([
        fetchRegistrationAndAccreditation(
          organisationId,
          registrationId,
          session.idToken
        ),
        fetchReportingPeriods(organisationId, registrationId, session.idToken)
      ])

    const material = getDisplayMaterial(registration)

    // Closed-period-adjustments statuses are hidden until the flag is released.
    const visiblePeriods = isClosedPeriodAdjustmentsEnabled()
      ? reportingPeriods
      : reportingPeriods.filter(
          (period) => !IS_CLOSED_PERIOD_ADJUSTMENT_STATUS[period.periodStatus]
        )

    const { activeHeader, submittedHeader } = buildHeaders(localise)

    const { activeRows, submittedRows } = buildRows({
      accreditation,
      cadence,
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      organisationId,
      registration,
      reportingPeriods: visiblePeriods
    })

    const approvedPersonBanner = buildApprovedPersonBanner(
      visiblePeriods,
      localise
    )

    const viewData = {
      active: {
        head: activeHeader,
        rows: activeRows,
        emptyMessage: localise('reports:actionRequiredEmpty')
      },
      approvedPersonBanner,
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      heading: localise('reports:heading'),
      material,
      pageTitle: localise('reports:pageTitle', { material }),
      submitted: {
        head: submittedHeader,
        rows: submittedRows,
        emptyMessage: localise('reports:submittedSectionEmpty')
      }
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { TFunction } from 'i18next'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { CadenceValue, SubmissionStatusValue } from './constants.js'
 * @import { ReportingPeriod } from './helpers/fetch-reporting-periods.js'
 */
