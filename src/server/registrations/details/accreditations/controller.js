import { hasLedgerReadScope } from '#server/auth/scopes.js'

import { buildViewModel } from './build-view-model.js'
import { fetchAccreditationDetails } from './helpers/fetch-accreditation-details.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{
 *   organisationId: string,
 *   registrationId: string,
 *   accreditationId: string
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
    const { organisationId, registrationId, accreditationId } = request.params
    const { backendToken } = request.auth.credentials

    const {
      organisation,
      registration,
      accreditation,
      wasteBalance,
      reportingPeriods,
      cadence,
      ledgerEvents
    } = await fetchAccreditationDetails({
      organisationId,
      registrationId,
      accreditationId,
      backendToken,
      canReadLedger: hasLedgerReadScope(request.auth.credentials),
      logger: request.logger
    })

    return h.view(
      'registrations/details/accreditations/index',
      buildViewModel({
        organisation,
        registration,
        accreditation,
        wasteBalance,
        reportingPeriods,
        cadence,
        ledgerEvents,
        localise: request.t,
        localiseUrl: request.localiseUrl
      })
    )
  }
}
