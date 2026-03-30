import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { isExporterRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { CADENCE } from './constants.js'
import { createReport } from './helpers/create-report.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials

    try {
      await createReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        session.idToken
      )
    } catch (error) {
      const isConflict =
        error.isBoom && error.output.statusCode === statusCodes.conflict

      if (!isConflict) {
        throw error
      }
    }

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}`

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    const isAccreditedExporter =
      accreditation &&
      isExporterRegistration(registration) &&
      cadence === CADENCE.MONTHLY

    const nextPage = isAccreditedExporter
      ? `${basePath}/prn-summary`
      : `${basePath}/supporting-information`

    return h.redirect(request.localiseUrl(nextPage))
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
