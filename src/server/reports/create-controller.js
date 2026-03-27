import { statusCodes } from '#server/common/constants/status-codes.js'
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

    const supportingInformationUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/supporting-information`
    )

    return h.redirect(supportingInformationUrl)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
