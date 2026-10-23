import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { hasWriteScope } from '#server/auth/scopes.js'
import { cssClasses } from '#server/common/constants/css-classes.js'
import { errorCodes } from '#server/common/enums/error-codes.js'
import { formatDateShort } from '#server/common/helpers/format-date.js'
import { getMaterialDisplayName } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationWithAccreditation } from '#server/common/helpers/organisations/fetch-registration-with-accreditation.js'
import { materialsHomepage } from '#server/common/helpers/organisations/registration-in-view.js'
import { year as toYear } from '#server/common/helpers/year.js'
import {
  paramsOrNotFound,
  yearParamsSchema
} from '#server/registrations/details/helpers/params-validation.js'
import { CADENCE, SUBMISSION_STATUS } from './constants.js'
import { buildActionLinkHtml } from './helpers/build-action-link-html.js'
import { buildReportBreadcrumbs } from './helpers/build-report-breadcrumbs.js'
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
import { registrationPath, reportPath } from './helpers/report-paths.js'

/**
 * @typedef {{ text: string, classes?: string } | { html: string, classes?: string }} TableCell
 * @typedef {TableCell[]} TableRow
 * @typedef {RegistrationKeys & { year: number }} ListParams
 */

/**
 * The row's action link, or an empty cell where the session may not take the
 * action. The link is assembled here rather than in the template, so the
 * template scan that hides write controls cannot see it and the decision has to
 * be made at this call site.
 * @param {{
 *   accreditation: Accreditation | undefined,
 *   canWrite: boolean,
 *   label: string,
 *   localise: TFunction,
 *   localiseUrl: (url: string) => string,
 *   period: ReportingPeriod,
 *   periodPath: string,
 *   registration: Pick<RegistrationView, 'wasteProcessingType'>
 * }} options
 * @returns {TableCell}
 */
const buildActionCell = ({
  accreditation,
  canWrite,
  label,
  localise,
  localiseUrl,
  period,
  periodPath,
  registration
}) => {
  const action = getRowAction(period)
  // The report pages decide their steps by the year's accreditation, so a
  // period of the other kind can only be read for now.
  const isCurrentKind =
    period.cadence === (accreditation ? CADENCE.MONTHLY : CADENCE.QUARTERLY)

  if (!(canWrite && isCurrentKind) && !actionReads(action)) {
    return { text: '', classes: cssClasses.textAlign.right }
  }

  const actionPath = getActionPath(
    action,
    registration,
    accreditation,
    period.cadence
  )
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
 *   canWrite: boolean,
 *   localise: TFunction,
 *   localiseUrl: (url: string) => string,
 *   keys: RegistrationKeys,
 *   registration: RegistrationView,
 *   reportingPeriods: ReportingPeriod[]
 * }} options
 * @returns {{ activeRows: TableRow[], submittedRows: TableRow[] }}
 */
function buildRows({
  accreditation,
  canWrite,
  localise,
  localiseUrl,
  keys,
  registration,
  reportingPeriods
}) {
  /** @type {TableRow[]} */
  const activeRows = []
  /** @type {TableRow[]} */
  const submittedRows = []

  for (const period of reportingPeriods) {
    const periodPath = reportPath({
      ...keys,
      year: period.year,
      cadence: period.cadence,
      period: period.period,
      submissionNumber: period.submissionNumber
    })

    const label = formatPeriodLabelWithComma(period, period.cadence, localise)

    const status = period.periodStatus

    const actionCell = buildActionCell({
      canWrite,
      period,
      registration,
      accreditation,
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

/**
 * The page's heading and title. A regulator keeps the plain "Reports"; an
 * operator sees the year, worded for whether they may act on the reports.
 * @param {{ session: UserSession, localise: TFunction, material: string, year: number }} options
 * @returns {{ heading: string, pageTitle: string }}
 */
const buildTitles = ({ session, localise, material, year }) => {
  if (readsAsARegulator(session)) {
    return {
      heading: localise('reports:heading'),
      pageTitle: localise('reports:pageTitle', { material })
    }
  }

  const heading = hasWriteScope(session)
    ? localise('reports:manageReportsHeading', { year })
    : localise('reports:manageReportsHeadingReadOnly', { year })

  return {
    heading,
    pageTitle: localise('reports:yearPageTitle', { heading, material })
  }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: ListParams }>>} */
export const listController = {
  options: {
    validate: paramsOrNotFound(yearParamsSchema, {
      message: 'Reports not found',
      code: errorCodes.registrationNotFound,
      action: 'fetch_reports',
      reason: 'the address holds no such year'
    })
  },
  async handler(request, h) {
    const { organisationNumber, registrationNumber, year } = request.params
    const keys = { organisationNumber, registrationNumber }
    const session = request.auth.credentials
    const { t: localise } = request

    const [{ organisation, registration, accreditation }, reportingPeriods] =
      await Promise.all([
        fetchRegistrationWithAccreditation(
          { ...keys, year },
          session.backendToken
        ),
        fetchReportingPeriods({ ...keys, year }, session.backendToken)
      ])

    const material = getMaterialDisplayName(registration.material)

    const { activeHeader, submittedHeader } = buildHeaders(localise)

    const { activeRows, submittedRows } = buildRows({
      accreditation,
      canWrite: hasWriteScope(session),
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      keys,
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
        materialsHomepage(keys, registration, toYear(year))?.path ??
          registrationPath(keys)
      ),
      breadcrumbs: readsAsARegulator(session)
        ? buildReportBreadcrumbs({
            organisation,
            registration,
            keys,
            pageName: localise('reports:heading'),
            localise,
            localiseUrl: (url) => request.localiseUrl(url)
          })
        : [],
      ...buildTitles({ session, localise, material, year }),
      material,
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
 * @import { UserSession } from '#server/auth/types/session.js'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Accreditation, RegistrationView } from '#server/common/helpers/organisations/organisation-view.js'
 * @import { ReportingPeriod } from './helpers/fetch-reporting-periods.js'
 * @import { RegistrationKeys } from './helpers/report-paths.js'
 */
