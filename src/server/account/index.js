import { controller } from './controller.js'

/**
 * Sets up the routes used in the page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const account = {
  plugin: {
    name: 'account',
    register(server) {
      server.route([
        {
          ...controller,
          method: 'GET',
          path: '/account'
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
