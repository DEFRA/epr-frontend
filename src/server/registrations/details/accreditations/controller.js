import { hasLedgerReadScope } from '#server/auth/scopes.js'

import { buildViewModel } from './build-view-model.js'
import { fetchAccreditationDetails } from './helpers/fetch-accreditation-details.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{
 *   organisationNumber: string,
 *   registrationNumber: string,
 *   year: string
 * }} AccreditationParams
 */

/**
 * The ledger section is offered on the same scope the ledger itself is gated
 * on, so a session the backend would refuse the ledger is shown no section
 * rather than an error.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
export const controller = {
  /**
   * @param {HapiRequest & { params: AccreditationParams }} request
   * @param {ResponseToolkit} h
   */
  async handler(request, h) {
    const { organisationNumber, registrationNumber, year } = request.params
    const keys = { organisationNumber, registrationNumber, year }

    const details = await fetchAccreditationDetails({
      ...keys,
      credentials: request.auth.credentials,
      canReadLedger: hasLedgerReadScope(request.auth.credentials),
      logger: request.logger
    })

    return h.view(
      'registrations/details/accreditations/index',
      buildViewModel({
        ...details,
        keys,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
