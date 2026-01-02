import { controller } from './controller.js'

/**
 * Sets up the routes used in the accreditation dashboard page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const accreditationDashboard = {
  plugin: {
    name: 'accreditation-dashboard',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/organisations/{organisationId}/accreditations/{accreditationId}'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
