import { statusCodes } from '#server/common/constants/status-codes.js'
import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { createReport } from './helpers/create-report.js'
import { getInProgressActionPath } from './helpers/get-in-progress-action-path.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import { validateCadenceForRegistration } from './helpers/validate-cadence.js'

/** @satisfies {Partial<HapiServerRoute<HapiRequest & { params: PeriodParams }>>} */
export const createController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const {
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      submissionNumber
    } = request.params
    const session = request.auth.credentials

    const { registration, accreditation } =
      await fetchRegistrationAndAccreditation(
        organisationId,
        registrationId,
        session.idToken
      )

    validateCadenceForRegistration(cadence, accreditation)

    try {
      await createReport(
        organisationId,
        registrationId,
        year,
        cadence,
        period,
        submissionNumber,
        session.idToken
      )
    } catch (error) {
      const boomError = /** @type {Boom} */ (error)
      const isConflict =
        boomError.isBoom && boomError.output.statusCode === statusCodes.conflict

      if (!isConflict) {
        throw error
      }
    }

    const basePath = `/organisations/${organisationId}/registrations/${registrationId}/reports/${year}/${cadence}/${period}/submissions/${submissionNumber}`

    const nextPage = `${basePath}${getInProgressActionPath(registration, accreditation, cadence)}`

    return h.redirect(request.localiseUrl(nextPage))
  }
}

/**
 * @import { Boom } from '@hapi/boom'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 */
