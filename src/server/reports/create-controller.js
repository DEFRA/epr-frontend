import Joi from 'joi'

import { CADENCE, MAX_PERIOD, MAX_YEAR, MIN_YEAR } from './constants.js'
import { createReport } from './helpers/create-report.js'

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const createController = {
  options: {
    validate: {
      params: Joi.object({
        organisationId: Joi.string().required(),
        registrationId: Joi.string().required(),
        year: Joi.number().integer().min(MIN_YEAR).max(MAX_YEAR).required(),
        cadence: Joi.string()
          .valid(CADENCE.MONTHLY, CADENCE.QUARTERLY)
          .required(),
        period: Joi.number().integer().min(1).max(MAX_PERIOD).required()
      })
    }
  },
  async handler(request, h) {
    const { organisationId, registrationId, year, cadence, period } =
      request.params
    const session = request.auth.credentials

    await createReport(
      organisationId,
      registrationId,
      year,
      cadence,
      period,
      session.idToken
    )

    const listUrl = request.localiseUrl(
      `/organisations/${organisationId}/registrations/${registrationId}/reports`
    )

    return h.redirect(listUrl)
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
