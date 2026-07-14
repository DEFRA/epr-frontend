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
  getStatusLabel,
  getStatusTagClass
} from './helpers/format-submission-status.js'
import { isResubmission } from './helpers/resubmission.js'
import {
  getActionLabel,
  getActionPath,
  getRowAction,
  REPORT_ACTION
} from './helpers/report-action.js'

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
 * A submitted period that is a resubmission (a later submission for the period,
 * flag-gated) reads "Resubmitted" rather than "Submitted". The backend emits no
 * distinct status for this, so the label is derived from the submission number
 * at this call site; the tag colour stays green, as submitted.
 * @param {SubmissionStatusValue} status
 * @param {TFunction} localise
 * @param {number} submissionNumber
 * @returns {string}
 */
const buildStatusTagHtml = (status, localise, submissionNumber) => {
  const statusLabel =
    status === SUBMISSION_STATUS.SUBMITTED && isResubmission(submissionNumber)
      ? localise('reports:statusResubmitted')
      : getStatusLabel(status, localise)
  const statusTagClass = getStatusTagClass(status)

  return `<strong class="govuk-tag ${statusTagClass}">${escapeHtml(statusLabel)}</strong>`
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
  const action = getRowAction(period)
  const actionPath = getActionPath(action, registration, accreditation, cadence)
  const actionLabel = getActionLabel(action, localise)

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

    const statusTagHtml = buildStatusTagHtml(
      status,
      localise,
      period.submissionNumber
    )

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      submittedRows.push([
        { text: label },
        { html: statusTagHtml },
        { text: formatSubmittedDateTime(period.report?.submittedAt) },
        { text: period.report?.submittedBy?.name ?? '' },
        actionCell
      ])
    } else {
      const dueDateText = formatDateShort(period.dueDate)

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
    (p) => getRowAction(p) === REPORT_ACTION.REVIEW_AND_SUBMIT
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
