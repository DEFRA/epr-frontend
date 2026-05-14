import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { formatTime } from '#server/common/helpers/format-time.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import {
  isExporterRegistration,
  isReprocessorRegistration
} from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE, SUBMISSION_STATUS } from './constants.js'
import { deriveSubmissionStatus } from './helpers/derive-submission-status.js'
import { fetchReportingPeriods } from './helpers/fetch-reporting-periods.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import {
  getActionLabel,
  getStatusLabel,
  getStatusTagClass
} from './helpers/format-submission-status.js'

/**
 * @typedef {{ text: string } | { html: string }} TableCell
 * @typedef {TableCell[]} TableRow
 */

/**
 * @param {string | null} status
 * @param {string} url
 * @param {string} label
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const buildActionLinkHtml = (status, url, label, localise) => {
  const actionLabel = getActionLabel(status, localise)
  return `<a href="${url}" class="govuk-link">${escapeHtml(actionLabel)} <span class="govuk-visually-hidden">${escapeHtml(label)}</span></a>`
}

/**
 * @param {string | null} status
 * @param {(key: string) => string} localise
 * @returns {string}
 */
const buildStatusTagHtml = (status, localise) => {
  const statusLabel = getStatusLabel(status, localise)
  if (!statusLabel) {
    return ''
  }
  const statusTagClass = getStatusTagClass(status)
  const tagClass = statusTagClass ? `govuk-tag ${statusTagClass}` : 'govuk-tag'
  return `<strong class="${tagClass}">${escapeHtml(statusLabel)}</strong>`
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

/**
 * Resolves the path the action link on a report row should target.
 * For in-progress reports the destination varies by registration type
 * and cadence; other statuses map to a fixed page in the report flow.
 * @param {string | null} status
 * @param {{ wasteProcessingType: string }} registration
 * @param {object | null | undefined} accreditation
 * @param {CadenceValue} cadence
 * @returns {string}
 */
const getActionPath = (status, registration, accreditation, cadence) => {
  if (status === SUBMISSION_STATUS.READY_TO_SUBMIT) {
    return '/submit'
  }
  if (status === SUBMISSION_STATUS.SUBMITTED) {
    return '/view'
  }
  if (status !== SUBMISSION_STATUS.IN_PROGRESS) {
    return ''
  }

  const isExporter = isExporterRegistration(registration)
  const isReprocessor = isReprocessorRegistration(registration)
  const hasAccreditation = !!accreditation

  if (hasAccreditation && isExporter && cadence === CADENCE.MONTHLY) {
    return '/prn-summary'
  }
  if (isReprocessor) {
    return '/tonnes-recycled'
  }
  if (!hasAccreditation && isExporter) {
    return '/tonnes-not-exported'
  }
  return '/supporting-information'
}

/**
 * Build table rows for the govukTable macro, partitioned by submission status.
 * @param {{
 *   accreditation: object | null | undefined,
 *   cadence: CadenceValue,
 *   localise: (key: string, params?: Record<string, unknown>) => string,
 *   localiseUrl: (url: string) => string,
 *   organisationId: string,
 *   registration: { wasteProcessingType: string },
 *   registrationId: string,
 *   reportingPeriods: ReportingPeriod[]
 * }} options
 * @returns {{ activeRows: TableRow[], submittedRows: TableRow[] }}
 */
function buildTableRows({
  accreditation,
  cadence,
  localise,
  localiseUrl,
  organisationId,
  registration,
  registrationId,
  reportingPeriods
}) {
  /** @type {TableRow[]} */
  const activeRows = []
  /** @type {TableRow[]} */
  const submittedRows = []

  for (const period of reportingPeriods) {
    const periodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${period.year}/${cadence}/${period.period}`

    const label = formatPeriodLabel(period, cadence, localise)

    const status = deriveSubmissionStatus(period.endDate, period.report)

    const actionPath = getActionPath(
      status,
      registration,
      accreditation,
      cadence
    )
    const url = localiseUrl(`${periodPath}${actionPath}`)

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      submittedRows.push([
        { text: label },
        { html: buildStatusTagHtml(status, localise) },
        { text: formatSubmittedDateTime(period.report?.submittedAt) },
        { text: period.report?.submittedBy?.name ?? '' },
        { html: buildActionLinkHtml(status, url, label, localise) }
      ])
    } else {
      activeRows.push([
        { text: label },
        { html: buildStatusTagHtml(status, localise) },
        { text: formatDate(period.dueDate) },
        { html: buildActionLinkHtml(status, url, label, localise) }
      ])
    }
  }

  return { activeRows, submittedRows }
}

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const listController = {
  /**
   * @param {HapiRequest & {
   *   params: { organisationId: string, registrationId: string }
   * }} request
   * @param {ResponseToolkit} h
   */
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

    const activeHeader = [
      { text: localise('reports:periodColumn') },
      { text: localise('reports:statusColumn') },
      { text: localise('reports:dateDueColumn') },
      { text: localise('reports:actionColumn') }
    ]

    const submittedHeader = [
      { text: localise('reports:periodColumn') },
      { text: localise('reports:statusColumn') },
      { text: localise('reports:dateAndTimeColumn') },
      { text: localise('reports:submittedByColumn') },
      { text: localise('reports:actionColumn') }
    ]

    const { activeRows, submittedRows } = buildTableRows({
      accreditation,
      cadence,
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      organisationId,
      registration,
      registrationId,
      reportingPeriods
    })

    const viewData = {
      active: { head: activeHeader, rows: activeRows },
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      cadenceHeading,
      emptyStateMessage: localise('reports:emptyState'),
      hasPeriods: reportingPeriods.length > 0,
      heading: localise('reports:heading'),
      material,
      pageTitle: localise('reports:pageTitle', { material }),
      submitted: { head: submittedHeader, rows: submittedRows }
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from './constants.js'
 * @import { ReportingPeriod } from './helpers/fetch-reporting-periods.js'
 */
