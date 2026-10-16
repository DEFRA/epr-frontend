import { errorCodes } from '#server/common/enums/error-codes.js'
import { notFound } from '#server/common/helpers/logging/cdp-boom.js'

import { buildViewModel } from './build-view-model.js'
import { fetchOverseasSites } from './helpers/fetch-overseas-sites.js'
import { registrationParamsSchema } from '../helpers/year-params-schema.js'

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
    validate: {
      params: registrationParamsSchema,
      // An organisation number that is not digits is an address that does not exist.
      failAction: () => {
        throw notFound(
          'Overseas sites not found',
          errorCodes.registrationNotFound,
          {
            event: {
              action: 'fetch_overseas_sites',
              reason: 'the address holds no such organisation number'
            }
          }
        )
      }
    }
  },
  /**
   * @param {HapiRequest & { params: OverseasSitesParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber } = request.params
    const { backendToken } = request.auth.credentials

    const details = await fetchOverseasSites({
      organisationNumber,
      registrationNumber,
      backendToken
    })

    return h.view(
      'registrations/details/overseas-sites/index',
      buildViewModel({
        ...details,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
