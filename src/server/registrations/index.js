import { controller } from './controller.js'

/**
 * Sets up the routes used in the accreditation dashboard page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const registrations = {
  plugin: {
    name: 'registrations',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/organisations/{organisationId}/registrations/{registrationId}'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
