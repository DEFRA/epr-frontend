import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { isReprocessorRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import {
  prnSummaryGetController,
  prnSummaryPostController
} from './exporter/prn-summary-controller.js'
import {
  reprocessorPrnSummaryGetController,
  reprocessorPrnSummaryPostController
} from './reprocessor/prn-summary-controller.js'

/**
 * @param {Request} request
 * @returns {Promise<boolean>}
 */
async function isReprocessor(request) {
  const { organisationId, registrationId } = request.params
  const session = request.auth.credentials

  const { registration } = await fetchRegistrationAndAccreditation(
    organisationId,
    registrationId,
    session.idToken
  )

  return isReprocessorRegistration(registration)
}

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const prnSummaryDispatchGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const reprocessor = await isReprocessor(request)
    const controller = reprocessor
      ? reprocessorPrnSummaryGetController
      : prnSummaryGetController

    return controller.handler(request, h)
  }
}

/**
 * Dispatches POST to the correct controller including payload validation.
 * Each controller defines its own schema with appropriate error messages,
 * so we validate manually rather than using Hapi's route-level validation.
 * @satisfies {Partial<ServerRoute>}
 */
export const prnSummaryDispatchPostController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  async handler(request, h) {
    const reprocessor = await isReprocessor(request)
    const controller = reprocessor
      ? reprocessorPrnSummaryPostController
      : prnSummaryPostController

    request.logger.info(
      { payload: request.payload, reprocessor },
      'prn-summary dispatch POST'
    )

    const { error } = controller.options.validate.payload.validate(
      request.payload,
      { abortEarly: false }
    )

    if (error) {
      request.logger.error(
        { validationError: error.message, payload: request.payload },
        'prn-summary dispatch validation failed'
      )
      return controller.options.validate.failAction(request, h, error)
    }

    return controller.handler(request, h)
  }
}

/**
 * @import { Request, ServerRoute } from '@hapi/hapi'
 */
