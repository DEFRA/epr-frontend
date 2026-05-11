import { fetchRegistrationAndAccreditation } from '#server/common/helpers/organisations/fetch-registration-and-accreditation.js'
import { isReprocessorRegistration } from '#server/common/helpers/prns/registration-helpers.js'
import {
  exporterPrnSummaryGetController,
  exporterPrnSummaryPostController
} from './exporter/prn-summary-controller.js'
import { periodParamsSchema } from './helpers/period-params-schema.js'
import {
  reprocessorPrnSummaryGetController,
  reprocessorPrnSummaryPostController
} from './reprocessor/prn-summary-controller.js'

/**
 * @param {HapiRequest & { params: PeriodParams }} request
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

/** @satisfies {Partial<HapiServerRoute<HapiRequest>>} */
export const prnSummaryDispatchGetController = {
  options: {
    validate: {
      params: periodParamsSchema
    }
  },
  /**
   * @param {HapiRequest & { params: PeriodParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const reprocessor = await isReprocessor(request)
    const controller = reprocessor
      ? reprocessorPrnSummaryGetController
      : exporterPrnSummaryGetController

    return controller.handler(request, h)
  }
}

/**
 * Dispatches POST to the correct controller including payload validation.
 * Each controller defines its own schema with appropriate error messages,
 * so we validate manually rather than using Hapi's route-level validation.
 * @satisfies {Partial<HapiServerRoute<DataPagePostRequest>>}
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
      : exporterPrnSummaryPostController

    request.logger.info({
      message: 'prn-summary dispatch POST',
      event: {
        action: 'prn_summary_dispatch_post',
        reason: `reprocessor=${reprocessor}`
      }
    })

    const { error, value } = controller.options.validate.payload.validate(
      request.payload,
      { abortEarly: false }
    )

    if (error) {
      request.logger.error({
        message: 'prn-summary dispatch validation failed',
        event: {
          action: 'prn_summary_dispatch_validation_failed',
          reason: error.message
        }
      })
      return controller.options.validate.failAction(request, h, error)
    }

    request.payload = value
    return controller.handler(request, h)
  }
}

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PeriodParams } from './helpers/period-params-schema.js'
 * @import { DataPagePostRequest } from './helpers/create-data-page-controllers.js'
 */
