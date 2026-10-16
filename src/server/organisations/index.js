import { chooseYearController } from './choose-year-controller.js'
import { errorController } from './error-controller.js'
import { homeController } from './home-controller.js'
import { yearController } from './year-controller.js'

/**
 * @typedef {{ organisationNumber: string, year?: string }} OrganisationParams
 */

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
          ...homeController,
          method: 'GET',
          path: '/organisations/{organisationNumber}'
        },
        {
          ...homeController,
          method: 'GET',
          path: '/organisations/{organisationNumber}/exporting'
        },
        {
          ...yearController,
          method: 'GET',
          path: '/organisations/{organisationNumber}/{year}'
        },
        {
          ...yearController,
          method: 'GET',
          path: '/organisations/{organisationNumber}/{year}/exporting'
        },
        {
          ...chooseYearController,
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
