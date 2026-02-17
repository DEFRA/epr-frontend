import { controller } from './controller.js'
import { errorController } from './error-controller.js'

/**
 * Sets up the routes used in the organisations page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const organisations = {
  plugin: {
    name: 'organisations',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/organisations/{organisationId}'
        },
        {
          ...controller,
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
