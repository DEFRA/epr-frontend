import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { CADENCE_MONTHLY, CADENCE_QUARTERLY } from './constants.js'
import { fetchReportingPeriods } from './helpers/fetch-reporting-periods.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { hasDetailView } from './helpers/has-detail-view.js'

/**
 * Build table rows for the govukTable macro.
 * Each row is an array of cell objects ({ text } or { html }).
 * @param {object} options
 * @param {Array<{year: number, period: number}>} options.periods
 * @param {string} options.cadence
 * @param {boolean} options.showViewLink
 * @param {string} options.organisationId
 * @param {string} options.registrationId
 * @param {(url: string) => string} options.localiseUrl
 * @param {(key: string, params?: Record<string, unknown>) => string} options.localise
 * @returns {Array<Array<{text: string} | {html: string}>>}
 */
function buildTableRows({
  periods,
  cadence,
  showViewLink,
  organisationId,
  registrationId,
  localiseUrl,
  localise
}) {
  return periods.map((period) => {
    const label = formatPeriodLabel(period, cadence, localise)

    const row = [{ text: label }]

    if (showViewLink) {
      const url = localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}/reports/${period.year}/${period.period}`
      )

      row.push({
        html: `<a href="${url}" class="govuk-link">View<span class="govuk-visually-hidden">${label}</span></a>`
      })
    }

    return row
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

    const [{ registration, accreditation }, { cadence, periods }] =
      await Promise.all([
        fetchRegistrationAndAccreditation(
          organisationId,
          registrationId,
          session.idToken
        ),
        fetchReportingPeriods(organisationId, registrationId, session.idToken)
      ])

    if (!registration) {
      throw Boom.notFound('Registration not found')
    }

    const material = getDisplayMaterial(registration)

    const isMonthly = cadence === CADENCE_MONTHLY
    const isQuarterly = cadence === CADENCE_QUARTERLY
    const showViewLink = hasDetailView(registration, accreditation)

    const tableHead = [{ text: localise('reports:periodColumn') }]
    if (showViewLink) {
      tableHead.push({ text: localise('reports:actionColumn') })
    }

    const tableRows = buildTableRows({
      periods,
      cadence,
      showViewLink,
      organisationId,
      registrationId,
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
      hasMonthlyPeriods: isMonthly && periods.length > 0,
      hasQuarterlyPeriods: isQuarterly && periods.length > 0,
      monthlyTableHead: isMonthly ? tableHead : [],
      monthlyTableRows: isMonthly ? tableRows : [],
      quarterlyTableHead: isQuarterly ? tableHead : [],
      quarterlyTableRows: isQuarterly ? tableRows : [],
      hasPeriods: periods.length > 0,
      emptyStateMessage: localise('reports:emptyState')
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
