import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'
import { isSessionMatch } from './helpers/is-session-match.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const submittedController = {
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

    const sessionData = request.yar.get('reportSubmitted')
    const duration = { year, cadence, period }

    if (!isSessionMatch(sessionData, duration)) {
      return h.redirect(request.localiseUrl(reportsUrl))
    }

    request.yar.clear('reportSubmitted')

    const { registration } = await fetchRegistrationAndAccreditation(
      organisationId,
      registrationId,
      session.idToken
    )

    const material = getDisplayMaterial(registration)
    const periodLabel = formatPeriodLabel({ year, period }, cadence, localise)

    return h.view('reports/submitted', {
      pageTitle: localise('reports:submittedPageTitle', {
        material,
        periodLabel
      }),
      heading: localise('reports:submittedHeading', { periodLabel }),
      detailsHeading: localise('reports:submittedDetailsHeading'),
      registrationLabel: localise('reports:submittedRegistrationLabel'),
      registrationNumber: registration.registrationNumber,
      materialLabel: localise('reports:submittedMaterialLabel'),
      material,
      futureChangesGuidance: localise('reports:submittedFutureChangesGuidance'),
      returnToReportsLink: {
        text: localise('reports:submittedReturnToReports'),
        href: request.localiseUrl(reportsUrl)
      },
      viewReportLink: {
        text: localise('reports:submittedViewReport'),
        href: request.localiseUrl(
          `${reportsUrl}/${year}/${cadence}/${period}/view`
        )
      }
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
