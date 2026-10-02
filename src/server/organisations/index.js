import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import { controller } from './controller.js'
import { controller as detailsController } from './details/controller.js'
import { errorController } from './error-controller.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationId: string }} OrganisationParams
 */

/**
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const organisationController = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return readsAsARegulator(request.auth.credentials)
      ? detailsController.handler(request, h)
      : controller.handler(request, h)
  }
}

/**
 * Sets up the routes used in the organisations page.
 * These routes are registered in src/server/router.js.
 */

export const organisations = {
  plugin: {
    name: 'organisations',
    register(server) {
      server.route([
        {
          ...organisationController,
          method: 'GET',
          path: '/organisations/{organisationId}'
        },
        {
          ...organisationController,
          method: 'GET',
          path: '/organisations/{organisationId}/exporting'
        },
        {
          ...errorController,
          method: 'GET',
          path: '/organisations/{organisationId}/error'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
