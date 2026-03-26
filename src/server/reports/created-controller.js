import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { formatDate } from '#server/common/helpers/format-date.js'
import { fetchReportDetail } from './helpers/fetch-report-detail.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'

/**
 * @param {Record<string, unknown> | undefined} sessionData
 * @param {{ year: number, cadence: string, period: number }} duration
 * @returns {boolean}
 */
function isSessionMatch(sessionData, duration) {
  return (
    !!sessionData &&
    sessionData.year === duration.year &&
    sessionData.cadence === duration.cadence &&
    sessionData.period === duration.period
  )
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createdController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const reportsUrl = `/organisations/${organisationId}/registrations/${registrationId}/reports`

    const sessionData = request.yar.get('reportCreated')
    const duration = { year, cadence, period }

    if (!isSessionMatch(sessionData, duration)) {
      return h.redirect(request.localiseUrl(reportsUrl))
    }

    request.yar.clear('reportCreated')

    const [{ registration }, reportDetail] = await Promise.all([
      fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      ),
      fetchReportDetail(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        session.idToken
      )
    ])

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)
    const formattedDueDate = formatDate(reportDetail.dueDate)

    const homeUrl = `/organisations/${organisationId}`

    return h.view('reports/created', {
      pageTitle: localise('reports:createdPageTitle', {
        material,
        periodLabel
      }),
      heading: localise('reports:createdHeading', { periodLabel }),
      statusLabel: localise('reports:createdStatusLabel'),
      statusValue: localise('reports:createdStatusValue'),
      detailsHeading: localise('reports:detailsHeading'),
      registrationLabel: localise('reports:createdRegistrationLabel'),
      registrationNumber: registration.registrationNumber,
      materialLabel: localise('reports:createdMaterialLabel'),
      material,
      nextStepsHeading: localise('reports:createdNextStepsHeading'),
      nextStepsGuidance: localise('reports:createdNextStepsGuidance', {
        dueDate: formattedDueDate
      }),
      selfSubmitGuidance: localise('reports:createdSelfSubmitGuidance'),
      goToReportsButton: {
        text: localise('reports:createdGoToReports'),
        href: request.localiseUrl(reportsUrl)
      },
      returnHomeLink: {
        text: localise('reports:createdReturnHome'),
        href: request.localiseUrl(homeUrl)
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
