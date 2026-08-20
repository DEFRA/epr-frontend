import { SCOPES } from '#server/auth/scopes.js'

import { controller } from './controller.js'

const registrationPath =
  '/organisations/{organisationId}/registrations/{registrationId}'

/**
 * Sets up the waste balance ledger page a regulator opens from a
 * registration.
 *
 * There is one path per ledger shape, because a ledger is partitioned by
 * accreditation and the registered-only phase keeps a partition of its own.
 * Both ids sit in the address, so an address names one ledger for good.
 *
 * Both routes carry the scope the backend guards its own ledger routes on, so
 * the page refuses a session the ledger itself would refuse, and it refuses it
 * in the route table rather than in the handler.
 */
export const wasteBalanceLedger = {
  plugin: {
    name: 'wasteBalanceLedger',
    register(server) {
      const ledgerRoute = (/** @type {string} */ path) => ({
        ...controller,
        method: /** @type {const} */ ('GET'),
        options: { auth: { scope: [SCOPES.wasteBalanceLedgerRead] } },
        path
      })

      server.route([
        ledgerRoute(`${registrationPath}/waste-balance-ledger`),
        ledgerRoute(
          `${registrationPath}/accreditations/{accreditationId}/waste-balance-ledger`
        )
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
