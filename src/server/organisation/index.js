import { controller } from './controller.js'

/**
 * Sets up the routes used in the organisation page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const organisation = {
  plugin: {
    name: 'organisation',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/organisation/{id}'
        },
        {
          ...controller,
          method: 'GET',
          path: '/organisation/{id}/exporting'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
