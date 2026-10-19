import { readsAsARegulator } from '#server/auth/reads-as-a-regulator.js'
import Boom from '@hapi/boom'
import { chooseYearController } from './choose-year-controller.js'
import { controller as detailsController } from './details/controller.js'
import { errorController } from './error-controller.js'
import { homeController } from './home-controller.js'
import { yearController } from './year-controller.js'

/**
 * @import { ResponseToolkit } from '@hapi/hapi'
 * @import { HapiRequest, HapiServerRoute } from '#server/common/hapi-types.js'
 */

/**
 * @typedef {{ organisationNumber: string, year?: string }} OrganisationParams
 */

/**
 * One address, two audiences: a regulator gets the details page, anyone else
 * their own home page.
 * @satisfies {Partial<HapiServerRoute<HapiRequest>>}
 */
const homeRoute = {
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    return readsAsARegulator(request.auth.credentials)
      ? detailsController.handler(request, h)
      : homeController.handler(request, h)
  }
}

/**
 * A regulator has no page at this address, so it answers them nothing.
 * @param {{ handler: (request: HapiRequest & { params: OrganisationParams }, h: ResponseToolkit) => unknown }} controller
 * @returns {Partial<HapiServerRoute<HapiRequest>>}
 */
const operatorOnly = (controller) => ({
  /**
   * @param {HapiRequest & { params: OrganisationParams }} request
   * @param {ResponseToolkit} h
   */
  handler(request, h) {
    if (readsAsARegulator(request.auth.credentials)) {
      throw Boom.notFound()
    }

    return controller.handler(request, h)
  }
})

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
          ...homeRoute,
          method: 'GET',
          path: '/organisations/{organisationNumber}'
        },
        {
          ...homeRoute,
          method: 'GET',
          path: '/organisations/{organisationNumber}/exporting'
        },
        {
          ...operatorOnly(yearController),
          method: 'GET',
          path: '/organisations/{organisationNumber}/{year}'
        },
        {
          ...operatorOnly(yearController),
          method: 'GET',
          path: '/organisations/{organisationNumber}/{year}/exporting'
        },
        {
          ...operatorOnly(chooseYearController),
          method: 'GET',
          path: '/organisations/{organisationNumber}/{year}/choose-year'
        },
        {
          ...errorController,
          method: 'GET',
          path: '/organisations/{organisationNumber}/error'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
