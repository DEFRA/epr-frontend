import { cssClasses } from '#server/common/constants/css-classes.js'
import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { CADENCE, SUBMISSION_STATUS } from './constants.js'
import { deriveSubmissionStatus } from './helpers/derive-submission-status.js'
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
  return `${formatDate(isoString)}, ${formatTime(isoString)}`
}

/** @type {Partial<Record<SubmissionStatusValue, string>>} */
const fixedActionPaths = {
  [SUBMISSION_STATUS.READY_TO_SUBMIT]: '/submit',
  [SUBMISSION_STATUS.SUBMITTED]: '/view'
}

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
 * @param {{
 *   accreditation: Accreditation | undefined,
 *   cadence: CadenceValue,
 *   label: string,
 *   localise: TFunction,
 *   localiseUrl: (url: string) => string,
 *   periodPath: string,
 *   registration: Pick<Registration, 'wasteProcessingType'>,
 *   status: SubmissionStatusValue | null
 * }} options
 * @returns {TableCell}
 */
const buildActionCell = ({
  accreditation,
  cadence,
  label,
  localise,
  localiseUrl,
  periodPath,
  registration,
  status
}) => {
  const { actionPath, actionLabel } =
    status === null
      ? { actionPath: '', actionLabel: localise('reports:actionCreateDraft') }
      : {
          actionPath: getActionPath(
            status,
            registration,
            accreditation,
            cadence
          ),
          actionLabel: getActionLabel(status, localise)
        }

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

    const status = deriveSubmissionStatus(
      period.endDate,
      period.dueDate,
      period.report
    )

    const actionCell = buildActionCell({
      status,
      registration,
      accreditation,
      cadence,
      localise,
      localiseUrl,
      periodPath,
      label
    })

    const statusTagHtml =
      status === null ? '' : buildStatusTagHtml(status, localise)

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      submittedRows.push([
        { text: label },
        { html: statusTagHtml },
        { text: formatSubmittedDateTime(period.report?.submittedAt) },
        { text: period.report?.submittedBy?.name ?? '' },
        actionCell
      ])
    } else {
      activeRows.push([
        { text: label },
        { html: statusTagHtml },
        { text: formatDate(period.dueDate) },
        actionCell
      ])
    }
  }

  return { activeRows, submittedRows }
}

/**
 * @param {TFunction} localise
 * @param {string} textKey
 * @returns {TableCell}
 */
const headerCol = (localise, textKey) => ({
  text: localise(textKey),
  classes: cssClasses.width.oneQuarter
})

/** @type {TableCell} */
const actionHeaderCol = { text: '', classes: cssClasses.textAlign.right }

/**
 * @param {TFunction} localise
 * @returns {{ activeHeader: TableRow, submittedHeader: TableRow }}
 */
const buildHeaders = (localise) => ({
  activeHeader: [
    headerCol(localise, 'reports:periodColumn'),
    headerCol(localise, 'reports:statusColumn'),
    headerCol(localise, 'reports:dateDueColumn'),
    actionHeaderCol
  ],
  submittedHeader: [
    headerCol(localise, 'reports:periodColumn'),
    headerCol(localise, 'reports:statusColumn'),
    headerCol(localise, 'reports:dateAndTimeColumn'),
    { text: localise('reports:submittedByColumn') },
    actionHeaderCol
  ]
})

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

    const cadenceHeading = localise(
      cadence === CADENCE.MONTHLY
        ? 'reports:monthlyHeading'
        : 'reports:quarterlyHeading'
    )

    const { activeHeader, submittedHeader } = buildHeaders(localise)

    const { activeRows, submittedRows } = buildRows({
      accreditation,
      cadence,
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      organisationId,
      registration,
      reportingPeriods
    })

    const viewData = {
      active: {
        head: activeHeader,
        rows: activeRows,
        emptyMessage: localise('reports:actionRequiredEmpty')
      },
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      cadenceHeading,
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
