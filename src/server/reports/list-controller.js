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
 * @param {TFunction} localise
 * @returns {string}
 */
const buildActionLinkHtml = (status, url, label, localise) => {
  const actionLabel = getActionLabel(status, localise)
  return `<a href="${url}" class="govuk-link">${escapeHtml(actionLabel)} <span class="govuk-visually-hidden">${escapeHtml(label)}</span></a>`
}

/**
 * @param {string | null} status
 * @param {TFunction} localise
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
 * @param {Registration} registration
 * @param {Accreditation | undefined} accreditation
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
function buildTableRows({
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
    const periodPath = `/organisations/${organisationId}/registrations/${registration.id}/reports/${period.year}/${cadence}/${period.period}`

    const label = formatPeriodLabel(period, cadence, localise)

    const status = deriveSubmissionStatus(period.endDate, period.report)

    const actionPath = getActionPath(
      status,
      registration,
      accreditation,
      cadence
    )
    const url = localiseUrl(`${periodPath}${actionPath}`)

    const actionCell = {
      html: buildActionLinkHtml(status, url, label, localise),
      classes: 'govuk-!-text-align-right'
    }

    if (status === SUBMISSION_STATUS.SUBMITTED) {
      submittedRows.push([
        { text: label },
        { html: buildStatusTagHtml(status, localise) },
        { text: formatSubmittedDateTime(period.report?.submittedAt) },
        { text: period.report?.submittedBy?.name ?? '' },
        actionCell
      ])
    } else {
      activeRows.push([
        { text: label },
        { html: buildStatusTagHtml(status, localise) },
        { text: formatDate(period.dueDate) },
        actionCell
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
      {
        text: localise('reports:periodColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      {
        text: localise('reports:statusColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      {
        text: localise('reports:dateDueColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      {
        text: localise('reports:actionColumn'),
        classes: 'govuk-!-text-align-right'
      }
    ]

    const submittedHeader = [
      {
        text: localise('reports:periodColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      {
        text: localise('reports:statusColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      {
        text: localise('reports:dateAndTimeColumn'),
        classes: 'govuk-!-width-one-quarter'
      },
      { text: localise('reports:submittedByColumn') },
      {
        text: localise('reports:actionColumn'),
        classes: 'govuk-!-text-align-right'
      }
    ]

    const { activeRows, submittedRows } = buildTableRows({
      accreditation,
      cadence,
      localise,
      localiseUrl: (url) => request.localiseUrl(url),
      organisationId,
      registration,
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
 * @import { TFunction } from 'i18next'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { Accreditation } from '#domain/organisations/accreditation.js'
 * @import { Registration } from '#domain/organisations/registration.js'
 * @import { CadenceValue } from './constants.js'
 * @import { ReportingPeriod } from './helpers/fetch-reporting-periods.js'
 */
