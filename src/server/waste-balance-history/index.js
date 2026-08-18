import { controller } from './controller.js'

const registrationPath =
  '/organisations/{organisationId}/registrations/{registrationId}'

/**
 * Sets up the waste balance history page a regulator opens from a
 * registration.
 *
 * There is one path per ledger shape, because a ledger is partitioned by
 * accreditation and the registered-only phase keeps a partition of its own.
 * Both ids sit in the address, so an address names one ledger for good.
 */
export const wasteBalanceHistory = {
  plugin: {
    name: 'wasteBalanceHistory',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: `${registrationPath}/waste-balance-history`
        },
        {
          ...controller,
          method: 'GET',
          path: `${registrationPath}/accreditations/{accreditationId}/waste-balance-history`
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
