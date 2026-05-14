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
 * Each row is an array of cell objects ({ text } or { html }).
 * @param {object} options
 * @param {import('./helpers/fetch-reporting-periods.js').ReportingPeriod[]} options.reportingPeriods
 * @param {CadenceValue} options.cadence
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {{ wasteProcessingType: string }} options.registration
 * @param {object | null | undefined} options.accreditation
 * @param {(url: string) => string} options.localiseUrl
 * @param {(key: string, params?: Record<string, unknown>) => string} options.localise
 * @returns {{ activeRows: Array<Array<{text: string} | {html: string}>>, submittedRows: Array<Array<{text: string} | {html: string}>> }}
 */
function buildTableRows({
  reportingPeriods,
  cadence,
  organisationId,
  registrationId,
  registration,
  accreditation,
  localiseUrl,
  localise
}) {
  /** @type {Array<Array<{text: string} | {html: string}>>} */
  const activeRows = []
  /** @type {Array<Array<{text: string} | {html: string}>>} */
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

    const activeTableHead = [
      { text: localise('reports:periodColumn') },
      { text: localise('reports:statusColumn') },
      { text: localise('reports:dateDueColumn') },
      { text: localise('reports:actionColumn') }
    ]

    const submittedTableHead = [
      { text: localise('reports:periodColumn') },
      { text: localise('reports:statusColumn') },
      { text: localise('reports:dateAndTimeColumn') },
      { text: localise('reports:submittedByColumn') },
      { text: localise('reports:actionColumn') }
    ]

    const { activeRows, submittedRows } = buildTableRows({
      reportingPeriods,
      cadence,
      organisationId,
      registrationId,
      registration,
      accreditation,
      localiseUrl: (url) => request.localiseUrl(url),
      localise
    })

    const viewData = {
      activeRows,
      activeTableHead,
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      cadenceHeading,
      emptyStateMessage: localise('reports:emptyState'),
      hasPeriods: reportingPeriods.length > 0,
      heading: localise('reports:heading'),
      material,
      pageTitle: localise('reports:pageTitle', {
        material
      }),
      submittedRows,
      submittedTableHead
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { CadenceValue } from './constants.js'
 */
