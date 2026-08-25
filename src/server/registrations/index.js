import { controller } from './controller.js'
import { controller as detailsController } from './details/controller.js'
import { readsAsARegulator } from './reads-as-a-regulator.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string, registrationId: string }} RegistrationParams
 */

/**
 * The address names the registration, and who is looking at it decides what
 * they see. The operator gets the dashboard they manage the registration
 * from. The regulator gets the record of what it covers.
 *
 * The reader is chosen once, here, so the two pages share the address and
 * nothing else, and a change to either cannot reach the other.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const registrationController = {
  /**
   * @param {HapiRequest & { params: RegistrationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return readsAsARegulator(request.auth.credentials)
      ? detailsController.handler(request, h)
      : controller.handler(request, h)
  }
}

/**
 * Sets up the routes used in the accreditation dashboard page.
 * These routes are registered in src/server/router.js.
 */
export const registrations = {
  plugin: {
    name: 'registrations',
    register(server) {
      server.route([
        {
          ...registrationController,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}'
        }
      ])
    }
  }
}
