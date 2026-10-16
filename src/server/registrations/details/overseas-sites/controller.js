import { errorCodes } from '#server/common/enums/error-codes.js'
import { fetchRegistration } from '#server/common/helpers/organisations/fetch-registration.js'

import { buildViewModel } from './build-view-model.js'
import {
  paramsOrNotFound,
  registrationParamsSchema
} from '../helpers/params-validation.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationNumber: string, registrationNumber: string }} OverseasSitesParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  options: {
    validate: paramsOrNotFound(registrationParamsSchema, {
      message: 'Overseas sites not found',
      code: errorCodes.registrationNotFound,
      action: 'fetch_overseas_sites',
      reason: 'the address holds no such organisation number'
    })
  },
  /**
   * @param {HapiRequest & { params: OverseasSitesParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber } = request.params
    const { organisation, registration } = await fetchRegistration({
      organisationNumber,
      registrationNumber,
      backendToken: request.auth.credentials.backendToken
    })

    return h.view(
      'registrations/details/overseas-sites/index',
      buildViewModel({
        organisation,
        registrationNumber,
        registration,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
