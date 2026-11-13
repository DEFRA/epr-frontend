import { SCOPES } from '#server/auth/scopes.js'
import { yearAddressed } from '#server/common/helpers/route-params.js'

import { controller } from './controller.js'

const registrationPath =
  '/organisations/{organisationNumber}/registrations/{registrationNumber}'

/**
 * Sets up the waste balance ledger page a regulator opens from an
 * accreditation.
 *
 * The route carries the scope the backend guards its own ledger routes on, so
 * the page refuses a session the ledger itself would refuse, and it refuses it
 * in the route table rather than in the handler.
 */
export const wasteBalanceLedger = {
  plugin: {
    name: 'wasteBalanceLedger',
    register(server) {
      server.route(
        yearAddressed({
          ...controller,
          method: /** @type {const} */ ('GET'),
          options: { auth: { scope: [SCOPES.wasteBalanceLedgerRead] } },
          path: `${registrationPath}/accreditations/{year}/waste-balance-ledger`
        })
      )
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
