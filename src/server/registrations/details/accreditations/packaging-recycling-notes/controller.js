import { toAccreditationKeys } from '#server/prns/helpers/fetch-prn-context.js'

import { buildViewModel } from './build-view-model.js'
import { fetchPrnListDetails } from './helpers/fetch-prn-list-details.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 * @import { PrnListParams } from '#server/prns/helpers/session-types.js'
 */

/**
 * The notes an accreditation has issued, read-only. Routed from the fork in
 * `src/server/prns/index.js`, not from here.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: PrnListParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const keys = toAccreditationKeys(request.params)

    const details = await fetchPrnListDetails({
      keys,
      credentials: request.auth.credentials
    })

    return h.view(
      'registrations/details/accreditations/packaging-recycling-notes/index',
      buildViewModel({ ...details, keys, request })
    )
  }
}
