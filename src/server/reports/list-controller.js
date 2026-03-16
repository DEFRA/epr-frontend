import Boom from '@hapi/boom'

import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { getDisplayMaterial } from '#server/common/helpers/materials/get-display-material.js'
import { CADENCE_MONTHLY, CADENCE_QUARTERLY } from './constants.js'
import { fetchReportingPeriods } from './helpers/fetch-reporting-periods.js'
import { formatPeriodLabel } from './helpers/format-period-label.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const listController = {
  async handler(request, h) {
    const { organisationId, registrationId } = request.params
    const session = request.auth.credentials
    const { t: localise } = request

    const [{ registration }, { cadence, periods }] = await Promise.all([
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

    const formattedPeriods = periods.map((period) => ({
      label: formatPeriodLabel(period, cadence, localise)
    }))

    const viewData = {
      pageTitle: localise('reports:pageTitle', { material }),
      heading: localise('reports:heading'),
      material,
      backUrl: request.localiseUrl(
        `/organisations/${organisationId}/registrations/${registrationId}`
      ),
      hasMonthlyPeriods: isMonthly && periods.length > 0,
      hasQuarterlyPeriods: isQuarterly && periods.length > 0,
      monthlyPeriods: isMonthly ? formattedPeriods : [],
      quarterlyPeriods: isQuarterly ? formattedPeriods : [],
      hasPeriods: periods.length > 0,
      emptyStateMessage: localise('reports:emptyState')
    }

    return h.view('reports/list', viewData)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
