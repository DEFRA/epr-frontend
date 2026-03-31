import { escapeHtml } from '#server/common/helpers/escape-html.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
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
  getStatusLabel
} from './helpers/format-submission-status.js'

/**
 * Build table rows for the govukTable macro.
 * Each row is an array of cell objects ({ text } or { html }).
 * @param {object} options
 * @param {import('./helpers/fetch-reporting-periods.js').ReportingPeriod[]} options.reportingPeriods
 * @param {string} options.cadence
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {boolean} options.isAccreditedExporter
 * @param {boolean} options.isReprocessor
 * @param {(url: string) => string} options.localiseUrl
 * @param {(key: string, params?: Record<string, unknown>) => string} options.localise
 * @returns {Array<Array<{text: string} | {html: string}>>}
 */
function buildTableRows({
  reportingPeriods,
  cadence,
  organisationId,
  registrationId,
  isAccreditedExporter,
  isReprocessor,
  localiseUrl,
  localise
}) {
  return reportingPeriods.map((period) => {
    const periodPath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${period.year}/${cadence}/${period.period}`

    const label = formatPeriodLabel(period, cadence, localise)

    const status = deriveSubmissionStatus(period.endDate, period.report)
    const statusLabel = getStatusLabel(status, localise)

    let inProgressSuffix = '/supporting-information'
    if (isAccreditedExporter && cadence === CADENCE.MONTHLY) {
      inProgressSuffix = '/prn-summary'
    } else if (isReprocessor) {
      inProgressSuffix = '/tonnes-recycled'
    }

    const suffixByStatus = {
      [SUBMISSION_STATUS.READY_TO_SUBMIT]: '/submit',
      [SUBMISSION_STATUS.IN_PROGRESS]: inProgressSuffix
    }
    const url = localiseUrl(`${periodPath}${suffixByStatus[status] ?? ''}`)
    const statusHtml = statusLabel
      ? `<strong class="govuk-tag">${escapeHtml(statusLabel)}</strong>`
      : ''

    const actionLabel = getActionLabel(status, localise)
    const labelHtml = `<a href="${url}" class="govuk-link">${escapeHtml(actionLabel)} <span class="govuk-visually-hidden">${escapeHtml(label)}</span></a>`

    return [{ text: label }, { html: statusHtml }, { html: labelHtml }]
  })
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
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
    const isAccreditedExporter =
      !!accreditation && isExporterRegistration(registration)
    const isReprocessor = isReprocessorRegistration(registration)

    const isMonthly = cadence === CADENCE.MONTHLY
    const isQuarterly = cadence === CADENCE.QUARTERLY
    const tableHead = [
      { text: localise('reports:periodColumn') },
      { text: localise('reports:statusColumn') },
      { text: localise('reports:actionColumn') }
    ]

    const tableRows = buildTableRows({
      reportingPeriods,
      cadence,
      organisationId,
      registrationId,
      isAccreditedExporter,
      isReprocessor,
      localiseUrl: (url) => request.localiseUrl(url),
      localise
    })

    const viewData = {
      pageTitle: localise('reports:pageTitle', { material }),
      heading: localise('reports:heading'),
      material,
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      hasMonthlyPeriods: isMonthly && reportingPeriods.length > 0,
      hasQuarterlyPeriods: isQuarterly && reportingPeriods.length > 0,
      monthlyTableHead: isMonthly ? tableHead : [],
      monthlyTableRows: isMonthly ? tableRows : [],
      quarterlyTableHead: isQuarterly ? tableHead : [],
      quarterlyTableRows: isQuarterly ? tableRows : [],
      hasPeriods: reportingPeriods.length > 0,
      emptyStateMessage: localise('reports:emptyState')
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
