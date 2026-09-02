import { hasWriteScope } from '#server/auth/scopes.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { SUBMISSION_STATUS } from './constants.js'
import { buildActionLinkHtml } from './helpers/build-action-link-html.js'
import { buildPeriodPath } from './helpers/build-period-path.js'
import { buildStatusTagHtml } from './helpers/build-status-tag-html.js'
import { fetchReportingPeriods } from './helpers/fetch-reporting-periods.js'
import { formatPeriodLabelWithComma } from './helpers/format-period-label.js'
import { formatSubmittedDateTime } from './helpers/format-submitted-date-time.js'
import {
  actionReads,
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
 * The row's action link, or an empty cell where the session may not take the
 * action. The link is assembled here rather than in the template, so the
 * template scan that hides write controls cannot see it and the decision has to
 * be made at this call site.
 * @param {{
 *   accreditation: Accreditation | undefined,
 *   cadence: CadenceValue,
 *   canWrite: boolean,
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
  canWrite,
  label,
  localise,
  localiseUrl,
  period,
  periodPath,
  registration
}) => {
  const action = getRowAction(period)

  if (!canWrite && !actionReads(action)) {
    return { text: '', classes: cssClasses.textAlign.right }
  }

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
 *   canWrite: boolean,
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
  canWrite,
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
    const periodPath = buildPeriodPath({
      organisationId,
      registrationId: registration.id,
      period,
      cadence
    })

    const label = formatPeriodLabelWithComma(period, cadence, localise)

    const status = period.periodStatus

    const actionCell = buildActionCell({
      canWrite,
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
          session.backendToken
        ),
        fetchReportingPeriods(
          organisationId,
          registrationId,
          session.backendToken
        )
      ])

    const material = getDisplayMaterial(registration)

    const { activeHeader, submittedHeader } = buildHeaders(localise)

    const { activeRows, submittedRows } = buildRows({
      accreditation,
      cadence,
      canWrite: hasWriteScope(session),
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      organisationId,
      registration,
      reportingPeriods
    })

    const approvedPersonBanner = buildApprovedPersonBanner(
      reportingPeriods,
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
 * @import { CadenceValue } from './constants.js'
 * @import { ReportingPeriod } from './helpers/fetch-reporting-periods.js'
 */
